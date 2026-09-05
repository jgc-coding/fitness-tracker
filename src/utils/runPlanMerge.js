/**
 * Zusammenfuehren einer Laufplan-Datei mit dem lokalen Stand ("Merge").
 *
 * Reine Funktion ohne Datenbank: rein gehen lokale Datensaetze und die bereits
 * GEPRUEFTE Datei (siehe runPlanSchema.js), raus geht die Liste der noetigen
 * Schreibvorgaenge. So laesst sich der Vertrag in Node testen
 * (scripts/laufplan-merge-test.mjs), ohne Browser und ohne IndexedDB.
 *
 * Die Regeln stammen aus docs/laufplaner-plan.md, Abschnitt 5.4:
 *  1. Bekannter Plan -> Inhalt aus der Datei, planVersion +1 (nur bei Aenderung)
 *  2. Neuer Plan fuer einen Nutzer -> wird aktiv, alter Plan wird inaktiv und
 *     verliert seine ZUKUENFTIGEN geplanten Laeufe (Geschichte bleibt)
 *  3. Bekannter Lauf, lokal noch "planned" -> Datei gewinnt
 *  4. Bekannter Lauf, lokal "done"/"skipped" -> lokal gewinnt komplett
 *  5. Neuer Lauf -> einfuegen
 *  6. Lauf des Plans fehlt in der Datei -> nur loeschen, wenn geplant UND Zukunft
 *  7. Ungeplante Laeufe (von der Uhr) werden nie durch einen Import geloescht
 */
import { getToday } from './dateHelpers.js'
import { FORMAT_NAME } from './runPlanSchema.js'

// Inhaltsfelder eines Plans. Aendert sich keines davon, wird der Plan gar nicht
// geschrieben — nur so ist ein zweiter Import derselben Datei wirklich ein
// Nichts-Tun (sonst wuerde planVersion bei jedem Durchlauf hochzaehlen).
const PLAN_CONTENT_FIELDS = ['userId', 'name', 'goal', 'phases', 'weeks']

// Alle Felder eines Laufs ausser updatedAt/createdAt: Vergleichsgrundlage
// dafuer, ob ein Schreibvorgang ueberhaupt noetig ist.
const SESSION_FIELDS = [
  'id', 'planId', 'userId', 'date', 'type', 'title', 'description',
  'planned', 'status', 'actual', 'source', 'externalId', 'originalDate', 'unplanned'
]

/** Vergleich ohne Ruecksicht auf die Reihenfolge der Objekt-Schluessel. */
function deepEqual(a, b) {
  if (a === b) return true
  if (a === null || b === null || a === undefined || b === undefined) {
    return (a ?? null) === (b ?? null)
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a).filter(k => a[k] !== undefined)
    const keysB = Object.keys(b).filter(k => b[k] !== undefined)
    if (keysA.length !== keysB.length) return false
    return keysA.every(k => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k]))
  }
  return false
}

function pick(obj, fields) {
  const out = {}
  for (const f of fields) out[f] = obj?.[f] ?? null
  return out
}

/**
 * @param {object[]} localPlans     alle lokalen Plaene (db.runPlans)
 * @param {object[]} localSessions  alle lokalen Laeufe (db.runSessions)
 * @param {object}   file           GEPRUEFTE Datei (value aus validateRunPlanFile)
 * @param {string}   today          Kalendertag 'YYYY-MM-DD' (lokal, getToday())
 * @param {string}   now            Zeitstempel fuer createdAt/updatedAt
 */
export function computeImportDiff(localPlans, localSessions, file, today = getToday(), now = new Date().toISOString()) {
  if (!file || file.format !== FORMAT_NAME || !Array.isArray(file.plans)) {
    throw new Error('computeImportDiff: Die Datei wurde nicht geprueft (validateRunPlanFile zuerst aufrufen).')
  }

  const plansToPut = []
  const sessionsToPut = []
  const sessionIdsToDelete = []
  const summary = {
    plansNew: 0,
    plansUpdated: 0,
    plansDeactivated: 0,
    sessionsNew: 0,
    sessionsUpdated: 0,
    sessionsDeleted: 0,
    sessionsProtected: 0
  }

  const localPlanById = new Map(localPlans.map(p => [p.id, p]))
  const localSessionById = new Map(localSessions.map(s => [s.id, s]))
  const filePlanIds = new Set(file.plans.map(p => p.id))
  const fileSessionIds = new Set()
  for (const p of file.plans) for (const s of p.sessions) fileSessionIds.add(s.id)

  // Welcher Plan ist je Nutzer danach aktiv? Ein ausdrueckliches isActive in
  // der Datei gewinnt, sonst der zuletzt genannte Plan des Nutzers.
  const activePlanByUser = new Map()
  for (const userId of new Set(file.plans.map(p => p.userId))) {
    const ofUser = file.plans.filter(p => p.userId === userId)
    const flagged = ofUser.filter(p => p.isActive === true)
    activePlanByUser.set(userId, (flagged.length === 1 ? flagged[0] : ofUser[ofUser.length - 1]).id)
  }

  // --- Plaene aus der Datei (Regel 1 und 2) ---
  for (const filePlan of file.plans) {
    const local = localPlanById.get(filePlan.id)
    const shouldBeActive = activePlanByUser.get(filePlan.userId) === filePlan.id
    const content = pick(filePlan, PLAN_CONTENT_FIELDS)

    if (!local) {
      plansToPut.push({
        id: filePlan.id,
        ...content,
        isActive: shouldBeActive,
        planVersion: filePlan.planVersion,
        source: 'claude',
        createdAt: now,
        updatedAt: now
      })
      summary.plansNew++
      continue
    }

    const contentChanged = !deepEqual(pick(local, PLAN_CONTENT_FIELDS), content)
    const activeChanged = (local.isActive === true) !== shouldBeActive
    if (!contentChanged && !activeChanged) continue

    plansToPut.push({
      ...local,
      ...content,
      isActive: shouldBeActive,
      // Die Version zaehlt nur hoch, wenn sich der Inhalt wirklich geaendert hat.
      planVersion: (Number(local.planVersion) || 1) + (contentChanged ? 1 : 0),
      source: 'claude',
      createdAt: local.createdAt || now,
      updatedAt: now
    })
    summary.plansUpdated++
  }

  // --- Laeufe aus der Datei (Regeln 3, 4, 5) ---
  for (const filePlan of file.plans) {
    for (const fileSession of filePlan.sessions) {
      const local = localSessionById.get(fileSession.id)

      if (!local) {
        sessionsToPut.push({ ...fileSession, createdAt: now, updatedAt: now })
        summary.sessionsNew++
        continue
      }

      // Regel 4: abgehakt oder ausgelassen — der lokale Stand gewinnt komplett.
      if (local.status === 'done' || local.status === 'skipped') {
        summary.sessionsProtected++
        continue
      }

      // Regel 3: lokal noch geplant — die Datei gibt den Takt vor.
      const next = {
        ...local,
        planId: filePlan.id,
        userId: filePlan.userId,
        date: fileSession.date,
        type: fileSession.type,
        title: fileSession.title,
        description: fileSession.description,
        planned: fileSession.planned,
        status: fileSession.status,
        actual: fileSession.actual,
        source: fileSession.source,
        // Kennung von intervals.icu nie verlieren, wenn die Datei keine mitbringt.
        externalId: fileSession.externalId || local.externalId || null,
        // Neues Datum aus der Datei = Claude hat bewusst neu terminiert; eine
        // fruehere Verschiebung in der App ist damit erledigt.
        originalDate: fileSession.date !== local.date ? null : (local.originalDate || null),
        // Ein von der Uhr gekommener Lauf bleibt "ungeplant".
        unplanned: local.unplanned === true || fileSession.unplanned === true,
        createdAt: local.createdAt || now,
        updatedAt: now
      }

      if (deepEqual(pick(local, SESSION_FIELDS), pick(next, SESSION_FIELDS))) continue
      sessionsToPut.push(next)
      summary.sessionsUpdated++
    }
  }

  // --- Regel 6/7: lokale Laeufe eines Plans, die in der Datei fehlen ---
  for (const local of localSessions) {
    if (!filePlanIds.has(local.planId)) continue
    if (fileSessionIds.has(local.id)) continue
    if (local.unplanned === true) continue
    if (local.status !== 'planned') continue
    if (local.date < today) continue
    sessionIdsToDelete.push(local.id)
    summary.sessionsDeleted++
  }

  // --- Regel 2: alter aktiver Plan eines Nutzers, den die Datei nicht kennt ---
  for (const local of localPlans) {
    if (filePlanIds.has(local.id)) continue
    if (!activePlanByUser.has(local.userId)) continue
    if (local.isActive !== true) continue

    plansToPut.push({ ...local, isActive: false, updatedAt: now })
    summary.plansDeactivated++

    for (const session of localSessions) {
      if (session.planId !== local.id) continue
      if (session.unplanned === true) continue
      if (session.status !== 'planned') continue
      if (session.date < today) continue
      if (sessionIdsToDelete.includes(session.id)) continue
      sessionIdsToDelete.push(session.id)
      summary.sessionsDeleted++
    }
  }

  summary.unchanged =
    plansToPut.length === 0 && sessionsToPut.length === 0 && sessionIdsToDelete.length === 0

  return { plansToPut, sessionsToPut, sessionIdsToDelete, summary }
}

/** Ein Satz fuer die Vorschau, z.B. "3 neu · 41 aktualisiert · 12 erledigte bleiben". */
export function describeDiff(summary) {
  if (!summary || summary.unchanged) return 'Keine Aenderung — die Datei entspricht dem aktuellen Stand.'
  const parts = []
  if (summary.plansNew) parts.push(`${summary.plansNew} ${plural(summary.plansNew, 'Plan', 'Plaene')} neu`)
  if (summary.plansUpdated) parts.push(`${summary.plansUpdated} ${plural(summary.plansUpdated, 'Plan', 'Plaene')} aktualisiert`)
  if (summary.sessionsNew) parts.push(`${summary.sessionsNew} ${plural(summary.sessionsNew, 'Lauf', 'Laeufe')} neu`)
  if (summary.sessionsUpdated) parts.push(`${summary.sessionsUpdated} aktualisiert`)
  if (summary.sessionsDeleted) parts.push(`${summary.sessionsDeleted} entfernt`)
  if (summary.sessionsProtected) parts.push(`${summary.sessionsProtected} erledigte bleiben`)
  return parts.join(' · ')
}

function plural(count, one, many) {
  return count === 1 ? one : many
}
