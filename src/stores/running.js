import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, generateId } from '../db/dexie.js'
import {
  getToday,
  mondayOf,
  addDaysToDate,
  formatDate,
  formatDayShort,
  weekdayShort
} from '../utils/dateHelpers.js'
import { formatRunValueFull } from '../utils/formatters.js'
import { USERS } from '../utils/constants.js'
import {
  FORMAT_NAME,
  FORMAT_VERSION,
  getEffortLabel,
  getRunType,
  validateRunPlanFile
} from '../utils/runPlanSchema.js'
import { computeImportDiff } from '../utils/runPlanMerge.js'
import { pushRecord, pushDelete, pushBulkDelete } from '../services/syncService.js'
import { holeLaeufe, testeVerbindung } from '../utils/intervalsApi.js'
import { ordneZu } from '../utils/runMatch.js'

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
   * und zaehlt in der Wochenbilanz mit seinem Planwert. `feedback` ist die
   * freiwillige Rueckmeldung; wird nichts uebergeben, bleibt eine vorhandene
   * unangetastet.
   */
  async function markDone(id, actual = null, feedback = undefined) {
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
    const updates = { status: 'done', actual: value, source: 'manual' }
    if (feedback !== undefined) {
      updates.feedback = normalizeFeedback(feedback, getSession(id)?.feedback || null)
    }
    return patchSession(id, updates)
  }

  /**
   * Rueckmeldung nachtragen oder aendern — der Normalfall, seit die Uhr den
   * Haken selbst setzt. Aendert sich nichts, wird auch nichts geschrieben.
   */
  async function saveFeedback(id, feedback) {
    const current = getSession(id)
    if (!current) {
      console.warn('[FitTrack] [WARN] Lauf nicht gefunden:', id)
      return null
    }
    const before = current.feedback || null
    const next = normalizeFeedback(feedback, before)
    const gleich = (before?.rpe ?? null) === (next?.rpe ?? null) && (before?.note || '') === (next?.note || '')
    if (gleich) return current
    return patchSession(id, { feedback: next })
  }

  /**
   * Rueckmeldung in die Form bringen, die auch das Dateiformat kennt
   * (docs/laufplan-format.md): Anstrengung 1-5 oder null, Notiz als Text.
   * Ist beides leer, gibt es keine Rueckmeldung — ein leeres Objekt waere beim
   * naechsten Import eine Scheinaenderung. Der Zeitstempel bleibt stehen,
   * solange sich inhaltlich nichts aendert.
   */
  function normalizeFeedback(input, previous = null) {
    if (!input) return null
    const zahl = Number(input.rpe)
    const rpe = Number.isInteger(zahl) && zahl >= 1 && zahl <= 5 ? zahl : null
    const note = typeof input.note === 'string' ? input.note.trim() : ''
    if (rpe === null && note === '') return null
    const unveraendert = previous && (previous.rpe ?? null) === rpe && (previous.note || '') === note
    return { rpe, note, at: unveraendert && previous.at ? previous.at : new Date().toISOString() }
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
      // Leer bleibt null, nie ein leeres Array — sonst waere die Rueckreise
      // der Datei gegen einen Lauf ohne Vorgabe eine Scheinaenderung.
      targets: s.targets?.length ? s.targets.map(t => ({ ...t })) : null,
      status: s.status,
      actual: s.actual || null,
      feedback: s.feedback || null,
      source: s.source || 'plan',
      originalDate: s.originalDate || null,
      externalId: s.externalId || null,
      unplanned: s.unplanned === true
    }
  }

  /**
   * Kurzfassung der Rueckmeldungen als Text — zum Einfuegen in den Chat.
   * Der grosse JSON-Export enthaelt dasselbe, aber mitsamt Jahresplan; fuer die
   * Frage "wie liefen die letzten Wochen" reichen diese paar Zeilen.
   *
   * @param {string[]} userIds  wessen Laeufe
   * @param {{tage?: number, heute?: string, nameOf?: function}} optionen
   */
  function exportFeedbackText(userIds, optionen = {}) {
    const tage = Number(optionen.tage) > 0 ? Number(optionen.tage) : 56
    const heute = optionen.heute || getToday()
    const von = addDaysToDate(heute, -tage)
    const nameOf = typeof optionen.nameOf === 'function' ? optionen.nameOf : (id => id)
    const wanted = Array.isArray(userIds) ? userIds : [userIds]

    const zeilen = [
      'FitTrack Lauf-Rueckmeldungen',
      `Stand ${formatDate(heute)} · Zeitraum ${formatDate(von)} bis ${formatDate(heute)}`
    ]
    let gesamt = 0

    for (const userId of wanted) {
      const meine = sessions.value
        .filter(s => s.userId === userId && s.date >= von && s.date <= heute)
        .sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date)))
      if (meine.length === 0) continue

      const mitFeedback = meine.filter(s => s.feedback && (s.feedback.rpe || s.feedback.note))
      const ohneFeedback = meine.filter(s => s.status === 'done' && !(s.feedback && (s.feedback.rpe || s.feedback.note)))
      const plan = activePlan(userId)

      zeilen.push('')
      zeilen.push(`${nameOf(userId)}${plan ? ` — ${plan.name}` : ''}`)
      if (mitFeedback.length === 0) {
        zeilen.push('  Keine Rueckmeldung in diesem Zeitraum.')
      }

      for (const s of mitFeedback) {
        gesamt += 1
        // Die Lauf-Art nur dazuschreiben, wenn sie nicht ohnehin im Titel steht
        // ("Langer Lauf (Langer Lauf)" liest sich albern).
        const typ = getRunType(s.type).label
        const kopf = typ.toLowerCase() === (s.title || '').trim().toLowerCase() ? s.title : `${s.title} (${typ})`
        zeilen.push(`  ${weekdayShort(s.date)} ${formatDayShort(s.date)} · ${kopf}${s.status === 'skipped' ? ' · ausgelassen' : ''}`)

        const werte = []
        const geplant = formatRunValueFull(s.planned)
        const gelaufen = formatRunValueFull(s.actual)
        if (geplant) werte.push(`Plan ${geplant}`)
        if (gelaufen) werte.push(`Ist ${gelaufen}`)
        if (s.actual?.avgHr) werte.push(`Puls ${s.actual.avgHr}`)
        if (werte.length > 0) zeilen.push(`    ${werte.join(' · ')}`)

        if (s.feedback.rpe) {
          const label = getEffortLabel(s.feedback.rpe)
          zeilen.push(`    Anstrengung ${s.feedback.rpe}/5${label ? ` (${label})` : ''}`)
        }
        if (s.feedback.note) zeilen.push(`    Notiz: ${s.feedback.note}`)
      }

      if (ohneFeedback.length > 0) {
        zeilen.push(`  Erledigt ohne Rueckmeldung: ${ohneFeedback.length}`)
      }
    }

    if (gesamt === 0) {
      zeilen.push('')
      zeilen.push('Es gibt in diesem Zeitraum noch keine Rueckmeldungen.')
    }
    return { text: zeilen.join('\n'), count: gesamt }
  }

  // --- Verbindung zu intervals.icu (Garmin) ----------------------------------

  // Athleten-Id und Schluessel liegen NUR auf diesem Geraet (localStorage),
  // genau wie der Standard-Nutzer in stores/auth.js. Bewusst NICHT in db.meta:
  // diese Tabelle wird mit der Cloud abgeglichen, und der Schluessel des einen
  // gehoert nicht auf das Handy des anderen. Auch nicht im Backup-Export.
  const zugangKey = (userId) => `${db.name}:intervals:${userId}`
  const abgleichKey = (userId) => `${db.name}:intervals:lastSync:${userId}`
  const ABGLEICH_PAUSE_MS = 15 * 60 * 1000
  const MAX_TAGE_ZURUECK = 30

  /** userId -> true, sobald ein Zugang hinterlegt ist (fuer die Oberflaeche). */
  const intervalsBereit = ref({})
  /** userId -> Zeitpunkt des letzten Abgleichs als ISO-Text oder ''. */
  const intervalsAbgleich = ref({})

  function ladeZugang(userId) {
    try {
      const roh = localStorage.getItem(zugangKey(userId))
      if (!roh) return null
      const wert = JSON.parse(roh)
      if (!wert?.athleteId || !wert?.apiKey) return null
      return { athleteId: String(wert.athleteId), apiKey: String(wert.apiKey) }
    } catch (e) {
      // Privater Modus, gesperrter Speicher oder kaputter Eintrag: kein Zugang.
      console.warn('[FitTrack] [WARN] intervals: Zugang nicht lesbar:', e?.message || e)
      return null
    }
  }

  function speichereZugang(userId, athleteId, apiKey) {
    const wert = { athleteId: String(athleteId || '').trim(), apiKey: String(apiKey || '').trim() }
    if (!wert.athleteId || !wert.apiKey) return false
    try {
      localStorage.setItem(zugangKey(userId), JSON.stringify(wert))
      intervalsBereit.value = { ...intervalsBereit.value, [userId]: true }
      return true
    } catch (e) {
      console.warn('[FitTrack] [WARN] intervals: Zugang nicht speicherbar:', e?.message || e)
      return false
    }
  }

  function entferneZugang(userId) {
    try {
      localStorage.removeItem(zugangKey(userId))
      localStorage.removeItem(abgleichKey(userId))
    } catch (e) {
      console.warn('[FitTrack] [WARN] intervals: Zugang nicht loeschbar:', e?.message || e)
    }
    intervalsBereit.value = { ...intervalsBereit.value, [userId]: false }
    intervalsAbgleich.value = { ...intervalsAbgleich.value, [userId]: '' }
  }

  /** Beim Start einmal nachsehen, wer auf diesem Geraet verbunden ist. */
  function ladeIntervalsStatus() {
    const bereit = {}
    const stand = {}
    for (const user of USERS) {
      bereit[user.id] = ladeZugang(user.id) !== null
      try {
        stand[user.id] = localStorage.getItem(abgleichKey(user.id)) || ''
      } catch {
        stand[user.id] = ''
      }
    }
    intervalsBereit.value = bereit
    intervalsAbgleich.value = stand
  }

  function merkeAbgleich(userId) {
    const jetzt = new Date().toISOString()
    try {
      localStorage.setItem(abgleichKey(userId), jetzt)
    } catch {
      // Nicht schlimm: dann wird beim naechsten Oeffnen einmal mehr abgefragt.
    }
    intervalsAbgleich.value = { ...intervalsAbgleich.value, [userId]: jetzt }
  }

  /**
   * Zeitfenster fuer den Abruf: ab dem letzten Abgleich minus drei Tage
   * (Garmin schiebt Aktivitaeten manchmal verspaetet weiter), hoechstens aber
   * 30 Tage zurueck.
   */
  function abrufFenster(userId, heute) {
    const grenze = addDaysToDate(heute, -MAX_TAGE_ZURUECK)
    const letzter = intervalsAbgleich.value[userId] || ''
    if (!letzter || letzter.length < 10) return { von: grenze, bis: heute }
    const von = addDaysToDate(letzter.slice(0, 10), -3)
    return { von: von < grenze ? grenze : von, bis: heute }
  }

  /** Verbindung pruefen, ohne etwas zu speichern oder zu schreiben. */
  async function testeIntervals(athleteId, apiKey) {
    return testeVerbindung({ athleteId, apiKey }, getToday())
  }

  /**
   * Laeufe von der Uhr holen und eintragen.
   * Loescht nie etwas und entfernt nie einen Haken (siehe runMatch.js).
   * @returns {Promise<{ok: boolean, grund?: string, text?: string, summary?: object}>}
   */
  async function syncFromIntervals(userId, optionen = {}) {
    const zugang = ladeZugang(userId)
    if (!zugang) return { ok: false, grund: 'kein-zugang' }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { ok: false, grund: 'offline' }
    }

    if (!optionen.force) {
      const letzter = intervalsAbgleich.value[userId] || ''
      if (letzter && Date.now() - new Date(letzter).getTime() < ABGLEICH_PAUSE_MS) {
        return { ok: false, grund: 'zu-frueh' }
      }
    }

    const heute = getToday()
    const { von, bis } = abrufFenster(userId, heute)
    const { laeufe } = await holeLaeufe(zugang, von, bis)

    const { patches, neue, summary, text } = ordneZu(laeufe, sessions.value, {
      userId,
      planId: activePlan(userId)?.id || null,
      neueId: generateId
    })

    for (const patch of patches) {
      await patchSession(patch.id, patch.updates)
    }

    if (neue.length > 0) {
      const sauber = neue.map(s => toPlain(s))
      await db.runSessions.bulkPut(sauber)
      sessions.value = [...sessions.value, ...sauber]
      for (const s of sauber) pushRecord('runSessions', s.id, s)
    }

    merkeAbgleich(userId)
    return { ok: true, text, summary }
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
    saveFeedback,
    resetToPlanned,
    prepareImport,
    applyImport,
    importPlanFile,
    exportStatus,
    exportFeedbackText,
    deletePlan,
    intervalsBereit,
    intervalsAbgleich,
    ladeIntervalsStatus,
    speichereZugang,
    entferneZugang,
    testeIntervals,
    syncFromIntervals
  }
})
