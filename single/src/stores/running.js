import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db/dexie.js'
import { getToday, mondayOf, addDaysToDate } from '../utils/dateHelpers.js'
import {
  FORMAT_NAME,
  FORMAT_VERSION,
  validateRunPlanFile
} from '../utils/runPlanSchema.js'
import { computeImportDiff } from '../utils/runPlanMerge.js'
import { pushRecord, pushDelete, pushBulkDelete } from '../services/syncService.js'

/**
 * Laufplaner: Plaene und einzelne Laeufe.
 *
 * Die App plant nicht selbst — sie zeigt an, haelt fest und gibt den Stand
 * zurueck. Erstellt und angepasst werden die Plaene von Claude als JSON-Datei
 * (docs/laufplan-format.md).
 */
export const useRunningStore = defineStore('running', () => {
  const plans = ref([])
  const sessions = ref([])
  const loaded = ref(false)

  // Vue-Proxys sprengen Dexies put/update mit DataCloneError. Der JSON-Umweg
  // loest auch verschachtelte Objekte (planned, actual, phases, weeks) auf.
  function toPlain(value) {
    return JSON.parse(JSON.stringify(value))
  }

  async function loadAll() {
    plans.value = await db.runPlans.toArray()
    sessions.value = await db.runSessions.toArray()
    loaded.value = true
  }

  // Nachladen, wenn der Cloud-Sync Aenderungen vom anderen Handy bringt.
  if (typeof window !== 'undefined') {
    window.addEventListener('fitness-sync-changed', (e) => {
      const col = e.detail?.collection
      if (col === 'runPlans' || col === 'runSessions') loadAll()
    })
  }

  // --- Lesen -----------------------------------------------------------------

  function plansByUser(userId) {
    return plans.value.filter(p => p.userId === userId)
  }

  function activePlan(userId) {
    return plans.value.find(p => p.userId === userId && p.isActive === true) || null
  }

  function getSession(id) {
    return sessions.value.find(s => s.id === id) || null
  }

  /** Alle Laeufe der Woche (Montag bis Sonntag), aus ALLEN Plaenen — auch aus
   *  abgeloesten, damit die Geschichte in der Wochenansicht sichtbar bleibt. */
  function sessionsForWeek(monday) {
    const end = addDaysToDate(monday, 6)
    return sessions.value.filter(s => s.date >= monday && s.date <= end)
  }

  function sessionsForDay(userId, date) {
    return sessions.value
      .filter(s => s.userId === userId && s.date === date)
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  function sessionsForPlan(planId) {
    return sessions.value.filter(s => s.planId === planId)
  }

  /** Erledigter Anteil eines Laufs. Ein Haken ohne Ist-Werte zaehlt mit dem
   *  Planwert — sonst waere ein abgehaktes Training "0 km wert". */
  function achievedOf(session, field) {
    if (session.status !== 'done') return 0
    const actual = session.actual?.[field]
    if (typeof actual === 'number' && actual > 0) return actual
    return session.planned?.[field] || 0
  }

  /**
   * Wochenziel und Fortschritt eines Nutzers.
   * `mode` sagt der Oberflaeche, ob die Woche in Kilometern oder in Minuten
   * gedacht ist (Backyard-Plaene rechnen in Stunden).
   */
  function weekTarget(userId, monday) {
    const plan = activePlan(userId)
    const week = plan?.weeks?.find(w => w.start === monday) || null
    const mine = sessionsForWeek(monday).filter(s => s.userId === userId)

    const plannedKm = mine.reduce((sum, s) => sum + (s.planned?.km || 0), 0)
    const plannedMinutes = mine.reduce((sum, s) => sum + (s.planned?.minutes || 0), 0)
    const doneKm = mine.reduce((sum, s) => sum + achievedOf(s, 'km'), 0)
    const doneMinutes = mine.reduce((sum, s) => sum + achievedOf(s, 'minutes'), 0)

    const goalKm = week?.targetKm || plannedKm
    const goalMinutes = week?.targetMinutes || plannedMinutes

    return {
      week,
      note: week?.note || '',
      mode: goalKm > 0 ? 'km' : 'minutes',
      goalKm,
      goalMinutes,
      doneKm: Math.round(doneKm * 10) / 10,
      doneMinutes: Math.round(doneMinutes),
      plannedKm,
      plannedMinutes,
      sessionCount: mine.length,
      doneCount: mine.filter(s => s.status === 'done').length
    }
  }

  /** Phase des aktiven Plans an einem Tag, inklusive "Woche 3 von 14". */
  function phaseFor(userId, date) {
    const plan = activePlan(userId)
    if (!plan) return null
    const phase = (plan.phases || []).find(p => date >= p.from && date <= p.to)
    if (!phase) return null

    const monday = mondayOf(date)
    const weeksOfPhase = (plan.weeks || [])
      .filter(w => w.phaseId === phase.id)
      .map(w => w.start)
      .sort()
    const index = weeksOfPhase.indexOf(monday)

    return {
      ...phase,
      weekNumber: index >= 0 ? index + 1 : null,
      weekCount: weeksOfPhase.length
    }
  }

  // --- Schreiben -------------------------------------------------------------

  async function patchSession(id, updates) {
    const current = await db.runSessions.get(id)
    if (!current) {
      console.warn('[FitTrack] [WARN] Lauf nicht gefunden:', id)
      return null
    }
    const next = toPlain({ ...current, ...updates, updatedAt: new Date().toISOString() })
    await db.runSessions.put(next)
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) sessions.value[idx] = next
    else sessions.value.push(next)
    pushRecord('runSessions', id, next)
    return next
  }

  /**
   * Lauf auf einen anderen Tag legen. Der urspruenglich geplante Tag wird
   * gemerkt (`originalDate`), damit Claude beim naechsten Export sieht, was
   * verschoben wurde. Zurueck auf den Plan-Tag loescht den Merker wieder.
   */
  async function moveSession(id, newDate) {
    const session = getSession(id)
    if (!session || newDate === session.date) return null
    const planDate = session.originalDate || session.date
    return patchSession(id, {
      date: newDate,
      originalDate: newDate === planDate ? null : planDate
    })
  }

  /** Zwei Laeufe tauschen die Tage. */
  async function swapSessions(idA, idB) {
    const a = getSession(idA)
    const b = getSession(idB)
    if (!a || !b || a.id === b.id) return
    const planA = a.originalDate || a.date
    const planB = b.originalDate || b.date
    await patchSession(a.id, { date: b.date, originalDate: b.date === planA ? null : planA })
    await patchSession(b.id, { date: a.date, originalDate: a.date === planB ? null : planB })
  }

  /**
   * Haken setzen. `actual` darf leer sein — dann ist der Lauf einfach erledigt
   * und zaehlt in der Wochenbilanz mit seinem Planwert.
   */
  async function markDone(id, actual = null) {
    let value = null
    if (actual) {
      const km = numberOrNull(actual.km)
      const minutes = numberOrNull(actual.minutes)
      const avgHr = numberOrNull(actual.avgHr)
      const note = typeof actual.note === 'string' ? actual.note.trim() : ''
      if (km !== null || minutes !== null || avgHr !== null || note !== '') {
        value = { km, minutes, avgHr, note }
      }
    }
    return patchSession(id, { status: 'done', actual: value, source: 'manual' })
  }

  async function markSkipped(id, note = '') {
    const text = typeof note === 'string' ? note.trim() : ''
    return patchSession(id, {
      status: 'skipped',
      actual: text ? { km: null, minutes: null, avgHr: null, note: text } : null,
      source: 'manual'
    })
  }

  /**
   * Zurueck auf "geplant". `externalId` bleibt absichtlich stehen: die Kennung
   * der Garmin-Aktivitaet verhindert, dass derselbe Lauf beim naechsten
   * Abgleich ein zweites Mal hereinkommt.
   */
  async function resetToPlanned(id) {
    return patchSession(id, { status: 'planned', actual: null, source: 'plan' })
  }

  // --- Import ----------------------------------------------------------------

  /**
   * Schritt 1: Datei pruefen und ausrechnen, was passieren wuerde.
   * Schreibt noch nichts.
   * @returns {{ ok: boolean, errors: string[], diff: object|null }}
   */
  function prepareImport(jsonText) {
    let data
    try {
      data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText
    } catch (e) {
      return { ok: false, errors: [`datei: Kein gueltiges JSON (${e.message})`], diff: null }
    }

    const checked = validateRunPlanFile(data)
    if (!checked.ok) return { ok: false, errors: checked.errors, diff: null }

    const diff = computeImportDiff(plans.value, sessions.value, checked.value, getToday())
    return { ok: true, errors: [], diff }
  }

  /**
   * Schritt 2: den geprueften Unterschied anwenden. Erst alles lokal in EINER
   * Transaktion (entweder ganz oder gar nicht), danach in die Cloud schieben —
   * fehlgeschlagene Pushes landen in der bestehenden Retry-Queue.
   */
  async function applyImport(diff) {
    const { plansToPut, sessionsToPut, sessionIdsToDelete } = diff
    const cleanPlans = plansToPut.map(toPlain)
    const cleanSessions = sessionsToPut.map(toPlain)

    await db.transaction('rw', db.runPlans, db.runSessions, async () => {
      if (cleanPlans.length) await db.runPlans.bulkPut(cleanPlans)
      if (cleanSessions.length) await db.runSessions.bulkPut(cleanSessions)
      if (sessionIdsToDelete.length) await db.runSessions.bulkDelete(sessionIdsToDelete)
    })

    await loadAll()

    // Tombstones und Cloud-Push laufen NACH der Transaktion: pushDelete
    // schreibt in db.deletions, die nicht Teil dieser Transaktion ist.
    for (const plan of cleanPlans) pushRecord('runPlans', plan.id, plan)
    for (const session of cleanSessions) pushRecord('runSessions', session.id, session)
    await pushBulkDelete('runSessions', sessionIdsToDelete)

    return diff.summary
  }

  /** Pruefen und anwenden in einem Schritt (Skripte, Tests). */
  async function importPlanFile(jsonText) {
    const prepared = prepareImport(jsonText)
    if (!prepared.ok) return prepared
    const summary = await applyImport(prepared.diff)
    return { ok: true, errors: [], diff: prepared.diff, summary }
  }

  // --- Export ----------------------------------------------------------------

  /**
   * Stand als Datei im selben Format (docs/laufplan-format.md): Plan, Phasen,
   * Wochen und alle Laeufe mit Haken, Ist-Werten und Verschiebungen.
   */
  function exportStatus(userIds) {
    const wanted = Array.isArray(userIds) ? userIds : [userIds]
    const exportPlans = plans.value
      .filter(p => wanted.includes(p.userId))
      // Aktiver Plan zuletzt: er entscheidet beim Re-Import ueber isActive.
      .sort((a, b) => Number(a.isActive === true) - Number(b.isActive === true))
      .map((plan) => {
        const own = sessionsForPlan(plan.id)
        // Laeufe ohne Plan (z.B. von der Uhr) haengen wir an den aktiven Plan
        // des Nutzers, sonst wuerde der Export sie verlieren.
        const orphans = plan.isActive === true
          ? sessions.value.filter(s => !s.planId && s.userId === plan.userId)
          : []
        return {
          id: plan.id,
          userId: plan.userId,
          name: plan.name,
          isActive: plan.isActive === true,
          planVersion: plan.planVersion || 1,
          goal: plan.goal,
          phases: plan.phases || [],
          weeks: plan.weeks || [],
          sessions: [...own, ...orphans]
            .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))
            .map(toFileSession)
        }
      })

    return JSON.stringify(
      {
        format: FORMAT_NAME,
        formatVersion: FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        plans: exportPlans
      },
      null,
      2
    )
  }

  function toFileSession(s) {
    return {
      id: s.id,
      date: s.date,
      type: s.type,
      title: s.title,
      description: s.description || '',
      planned: {
        km: s.planned?.km ?? null,
        minutes: s.planned?.minutes ?? null,
        loops: s.planned?.loops ?? null
      },
      status: s.status,
      actual: s.actual || null,
      source: s.source || 'plan',
      originalDate: s.originalDate || null,
      externalId: s.externalId || null,
      unplanned: s.unplanned === true
    }
  }

  // --- Loeschen --------------------------------------------------------------

  /** Plan samt seiner Laeufe entfernen (mit Tombstones fuer den Cloud-Sync). */
  async function deletePlan(planId) {
    const sessionIds = sessionsForPlan(planId).map(s => s.id)
    await db.transaction('rw', db.runPlans, db.runSessions, async () => {
      await db.runPlans.delete(planId)
      if (sessionIds.length) await db.runSessions.bulkDelete(sessionIds)
    })
    plans.value = plans.value.filter(p => p.id !== planId)
    sessions.value = sessions.value.filter(s => s.planId !== planId)
    await pushDelete('runPlans', planId)
    await pushBulkDelete('runSessions', sessionIds)
  }

  function numberOrNull(value) {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) && num >= 0 ? num : null
  }

  return {
    plans,
    sessions,
    loaded,
    loadAll,
    plansByUser,
    activePlan,
    getSession,
    sessionsForWeek,
    sessionsForDay,
    sessionsForPlan,
    weekTarget,
    phaseFor,
    moveSession,
    swapSessions,
    markDone,
    markSkipped,
    resetToPlanned,
    prepareImport,
    applyImport,
    importPlanFile,
    exportStatus,
    deletePlan
  }
})
