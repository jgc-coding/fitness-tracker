#!/usr/bin/env node
/*
 * Vertragstest fuer Laufplan-Pruefung und -Merge.
 *
 * Laeuft in Node, ohne Browser und ohne IndexedDB, weil beide Module reine
 * Funktionen sind (src/utils/runPlanSchema.js, src/utils/runPlanMerge.js).
 * Jede Regel aus docs/laufplaner-plan.md Abschnitt 5.4 hat mindestens einen
 * Fall; dazu die drei Sonderfaelle (leere Datei, fremder Nutzer, zweimal
 * derselbe Import).
 *
 * Aufruf (Windows PowerShell):  node .\scripts\laufplan-merge-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import { validateRunPlanFile } from '../src/utils/runPlanSchema.js'
import { computeImportDiff } from '../src/utils/runPlanMerge.js'

const TODAY = '2030-01-20'
const NOW = '2030-01-20T09:00:00.000Z'

let passed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) {
    passed++
  } else {
    failures.push(`${name}${detail ? ' -> ' + detail : ''}`)
  }
}

function equal(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  check(name, a === e, `erwartet ${e}, bekommen ${a}`)
}

// --- Bausteine ---------------------------------------------------------------

function filePlan(overrides = {}) {
  return {
    id: 'plan-a',
    userId: 'user2',
    name: 'Testplan',
    goal: { type: 'ultra', label: 'Testrennen', date: '2030-06-01', target: '100 km' },
    phases: [{ id: 'p1', name: 'Grundlage', from: '2030-01-07', to: '2030-03-01', focus: '' }],
    weeks: [{ start: '2030-01-14', phaseId: 'p1', targetKm: 30, targetMinutes: 200, note: '' }],
    sessions: [],
    ...overrides
  }
}

function fileSession(overrides = {}) {
  return {
    id: 's1',
    date: '2030-01-22',
    type: 'easy',
    title: 'Locker',
    description: '',
    planned: { km: 8, minutes: 50, loops: null },
    ...overrides
  }
}

/** Baut eine Datei und laesst sie durch die Pruefung laufen (wie die App). */
function validFile(plans) {
  const raw = { format: 'fittrack-laufplan', formatVersion: 1, plans }
  const result = validateRunPlanFile(raw)
  if (!result.ok) throw new Error('Testdatei ist ungueltig: ' + result.errors.join(' | '))
  return result.value
}

function localPlan(overrides = {}) {
  return {
    id: 'plan-a',
    userId: 'user2',
    name: 'Testplan',
    goal: { type: 'ultra', label: 'Testrennen', date: '2030-06-01', target: '100 km' },
    phases: [{ id: 'p1', name: 'Grundlage', from: '2030-01-07', to: '2030-03-01', focus: '' }],
    weeks: [{ start: '2030-01-14', phaseId: 'p1', targetKm: 30, targetMinutes: 200, note: '' }],
    isActive: true,
    planVersion: 1,
    source: 'claude',
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    ...overrides
  }
}

function localSession(overrides = {}) {
  return {
    id: 's1',
    planId: 'plan-a',
    userId: 'user2',
    date: '2030-01-22',
    type: 'easy',
    title: 'Locker',
    description: '',
    planned: { km: 8, minutes: 50, loops: null },
    status: 'planned',
    actual: null,
    source: 'plan',
    externalId: null,
    originalDate: null,
    unplanned: false,
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    ...overrides
  }
}

function diff(plans, sessions, file) {
  return computeImportDiff(plans, sessions, file, TODAY, NOW)
}

// --- Regel 1: bekannter Plan wird aktualisiert, Version zaehlt hoch ----------
{
  const file = validFile([filePlan({ name: 'Testplan neu', weeks: [{ start: '2030-01-14', phaseId: 'p1', targetKm: 40, targetMinutes: 260, note: 'mehr' }] })])
  const { plansToPut, summary } = diff([localPlan()], [], file)
  equal('R1 ein Plan wird geschrieben', plansToPut.length, 1)
  equal('R1 Name aus der Datei', plansToPut[0].name, 'Testplan neu')
  equal('R1 Wochenziel aus der Datei', plansToPut[0].weeks[0].targetKm, 40)
  equal('R1 planVersion +1', plansToPut[0].planVersion, 2)
  equal('R1 createdAt bleibt', plansToPut[0].createdAt, '2030-01-01T00:00:00.000Z')
  equal('R1 zaehlt als Aktualisierung', summary.plansUpdated, 1)
}

// --- Regel 2: neuer Plan uebernimmt, alter wird inaktiv ----------------------
{
  const file = validFile([filePlan({ id: 'plan-b', name: 'Neuer Plan' })])
  const sessions = [
    localSession({ id: 'alt-zukunft', date: '2030-01-25', status: 'planned' }),
    localSession({ id: 'alt-vergangen', date: '2030-01-10', status: 'planned' }),
    localSession({ id: 'alt-erledigt', date: '2030-01-25', status: 'done', actual: { km: 8, minutes: 50, avgHr: null, note: '' } }),
    localSession({ id: 'alt-ungeplant', date: '2030-01-25', status: 'planned', unplanned: true })
  ]
  const { plansToPut, sessionIdsToDelete, summary } = diff([localPlan()], sessions, file)
  const neu = plansToPut.find(p => p.id === 'plan-b')
  const alt = plansToPut.find(p => p.id === 'plan-a')
  check('R2 neuer Plan ist aktiv', neu && neu.isActive === true)
  check('R2 alter Plan wird inaktiv', alt && alt.isActive === false)
  equal('R2 nur der zukuenftige geplante Lauf faellt weg', sessionIdsToDelete, ['alt-zukunft'])
  equal('R2 Zaehler Loeschungen', summary.sessionsDeleted, 1)
  equal('R2 neuer Plan zaehlt als neu', summary.plansNew, 1)
}

// --- Regel 3: lokal geplant -> Datei gewinnt --------------------------------
{
  const file = validFile([filePlan({ sessions: [fileSession({ date: '2030-01-24', title: 'Locker laenger', planned: { km: 12, minutes: 80, loops: null } })] })])
  const local = localSession({ date: '2030-01-22', originalDate: '2030-01-21' })
  const { sessionsToPut, summary } = diff([localPlan()], [local], file)
  equal('R3 ein Lauf wird geschrieben', sessionsToPut.length, 1)
  equal('R3 Datum aus der Datei', sessionsToPut[0].date, '2030-01-24')
  equal('R3 Titel aus der Datei', sessionsToPut[0].title, 'Locker laenger')
  equal('R3 Planwert aus der Datei', sessionsToPut[0].planned.km, 12)
  equal('R3 originalDate faellt weg (Claude terminiert neu)', sessionsToPut[0].originalDate, null)
  equal('R3 zaehlt als Aktualisierung', summary.sessionsUpdated, 1)
}

// --- Regel 3b: gleiches Datum -> Verschiebung aus der App bleibt erhalten ----
{
  const file = validFile([filePlan({ sessions: [fileSession({ date: '2030-01-22', title: 'Locker anders' })] })])
  const local = localSession({ date: '2030-01-22', originalDate: '2030-01-21' })
  const { sessionsToPut } = diff([localPlan()], [local], file)
  equal('R3b originalDate bleibt', sessionsToPut[0].originalDate, '2030-01-21')
}

// --- Regel 3c: Status und Ist-Werte aus der Datei werden uebernommen ---------
{
  const file = validFile([filePlan({ sessions: [fileSession({ status: 'done', actual: { km: 8.4, minutes: 51, avgHr: 140, note: 'aus Garmin' }, source: 'intervals', externalId: 'i1:2' })] })])
  const { sessionsToPut } = diff([localPlan()], [localSession()], file)
  equal('R3c Status aus der Datei', sessionsToPut[0].status, 'done')
  equal('R3c Ist-km aus der Datei', sessionsToPut[0].actual.km, 8.4)
  equal('R3c Quelle aus der Datei', sessionsToPut[0].source, 'intervals')
  equal('R3c externalId aus der Datei', sessionsToPut[0].externalId, 'i1:2')
}

// --- Regel 3d: vorhandene externalId geht nicht verloren ---------------------
{
  const file = validFile([filePlan({ sessions: [fileSession({ title: 'Locker neu' })] })])
  const local = localSession({ externalId: 'i1:99' })
  const { sessionsToPut } = diff([localPlan()], [local], file)
  equal('R3d externalId bleibt erhalten', sessionsToPut[0].externalId, 'i1:99')
}

// --- Regel 4: erledigt/ausgelassen -> lokal gewinnt komplett -----------------
{
  const file = validFile([filePlan({ sessions: [
    fileSession({ id: 's-done', date: '2030-01-30', title: 'Andere Vorgabe', planned: { km: 30, minutes: null, loops: null } }),
    fileSession({ id: 's-skip', date: '2030-01-31', title: 'Andere Vorgabe', planned: { km: 30, minutes: null, loops: null } })
  ] })])
  const sessions = [
    localSession({ id: 's-done', date: '2030-01-18', status: 'done', actual: { km: 9, minutes: 60, avgHr: 142, note: 'lief' } }),
    localSession({ id: 's-skip', date: '2030-01-19', status: 'skipped' })
  ]
  const { sessionsToPut, sessionIdsToDelete, summary } = diff([localPlan()], sessions, file)
  equal('R4 kein Schreibvorgang', sessionsToPut.length, 0)
  equal('R4 keine Loeschung', sessionIdsToDelete.length, 0)
  equal('R4 als geschuetzt gezaehlt', summary.sessionsProtected, 2)
}

// --- Regel 5: neue Kennung wird eingefuegt ----------------------------------
{
  const file = validFile([filePlan({ sessions: [fileSession({ id: 's-neu', date: '2030-01-28' })] })])
  const { sessionsToPut, summary } = diff([localPlan()], [], file)
  equal('R5 ein Lauf wird eingefuegt', sessionsToPut.length, 1)
  equal('R5 Status ist geplant', sessionsToPut[0].status, 'planned')
  equal('R5 planId gesetzt', sessionsToPut[0].planId, 'plan-a')
  equal('R5 userId gesetzt', sessionsToPut[0].userId, 'user2')
  equal('R5 createdAt gesetzt', sessionsToPut[0].createdAt, NOW)
  equal('R5 zaehlt als neu', summary.sessionsNew, 1)
}

// --- Regel 6: fehlende Laeufe -> nur geplante Zukunft faellt weg -------------
{
  const file = validFile([filePlan({ sessions: [fileSession({ id: 's-bleibt', date: '2030-01-22' })] })])
  const sessions = [
    localSession({ id: 's-bleibt', date: '2030-01-22' }),
    localSession({ id: 's-weg', date: '2030-01-27', status: 'planned' }),
    localSession({ id: 's-heute', date: TODAY, status: 'planned' }),
    localSession({ id: 's-vergangen', date: '2030-01-15', status: 'planned' }),
    localSession({ id: 's-erledigt', date: '2030-01-27', status: 'done' }),
    localSession({ id: 's-ausgelassen', date: '2030-01-27', status: 'skipped' })
  ]
  const { sessionIdsToDelete } = diff([localPlan()], sessions, file)
  equal('R6 nur zukuenftige geplante Laeufe', sessionIdsToDelete.sort(), ['s-heute', 's-weg'])
}

// --- Regel 7: ungeplante Laeufe ueberleben jeden Import ---------------------
{
  const file = validFile([filePlan({ sessions: [] })])
  const sessions = [localSession({ id: 's-uhr', date: '2030-01-27', status: 'planned', unplanned: true })]
  const { sessionIdsToDelete } = diff([localPlan()], sessions, file)
  equal('R7 ungeplanter Lauf bleibt', sessionIdsToDelete, [])
}

// --- Sonderfall: leere Datei wird abgelehnt, nichts wird geloescht ----------
{
  const result = validateRunPlanFile({ format: 'fittrack-laufplan', formatVersion: 1, plans: [] })
  check('Leere Datei wird abgelehnt', result.ok === false)
  check('Leere Datei nennt das Feld', result.errors.some(e => e.startsWith('plans:')), result.errors.join(' | '))
  const leer = validateRunPlanFile({})
  check('Datei ohne Inhalt wird abgelehnt', leer.ok === false)
}

// --- Sonderfall: fremder Nutzer ---------------------------------------------
{
  const result = validateRunPlanFile({
    format: 'fittrack-laufplan',
    formatVersion: 1,
    plans: [filePlan({ userId: 'user9' })]
  })
  check('Fremder Nutzer wird abgelehnt', result.ok === false)
  check('Fehler nennt den Pfad', result.errors.some(e => e.startsWith('plans[0].userId:')), result.errors.join(' | '))
}

// --- Sonderfall: zweimal dieselbe Datei importieren --------------------------
{
  const file = validFile([filePlan({ sessions: [
    fileSession({ id: 's1', date: '2030-01-22' }),
    fileSession({ id: 's2', date: '2030-01-24', type: 'long', title: 'Lang', planned: { km: 18, minutes: 130, loops: null } })
  ] })])

  // Erster Durchlauf auf leerem Stand
  const first = diff([], [], file)
  equal('Zweitimport: erster Lauf legt Plan an', first.plansToPut.length, 1)
  equal('Zweitimport: erster Lauf legt Laeufe an', first.sessionsToPut.length, 2)

  // Zustand nachbilden, als waere alles geschrieben worden
  const second = diff(first.plansToPut, first.sessionsToPut, file)
  equal('Zweitimport: keine Plan-Aenderung', second.plansToPut.length, 0)
  equal('Zweitimport: keine Lauf-Aenderung', second.sessionsToPut.length, 0)
  equal('Zweitimport: keine Loeschung', second.sessionIdsToDelete.length, 0)
  check('Zweitimport: als unveraendert gemeldet', second.summary.unchanged === true)
}

// --- Pruefung: typische Fehler mit Pfadangabe -------------------------------
{
  const cases = [
    ['falsches Datum', filePlan({ sessions: [fileSession({ date: '2030-02-30' })] }), 'plans[0].sessions[0].date'],
    ['unbekannte Lauf-Art', filePlan({ sessions: [fileSession({ type: 'schwimmen' })] }), 'plans[0].sessions[0].type'],
    ['doppelte Kennung', filePlan({ sessions: [fileSession({ id: 'dup' }), fileSession({ id: 'dup', date: '2030-01-23' })] }), 'plans[0].sessions[1].id'],
    ['Woche startet nicht montags', filePlan({ weeks: [{ start: '2030-01-15', phaseId: 'p1', targetKm: 30 }] }), 'plans[0].weeks[0].start'],
    ['Phase falsch herum', filePlan({ phases: [{ id: 'p1', name: 'X', from: '2030-03-01', to: '2030-01-07' }] }), 'plans[0].phases[0]'],
    ['Planwert fehlt', filePlan({ sessions: [fileSession({ planned: { km: null, minutes: null, loops: null } })] }), 'plans[0].sessions[0].planned'],
    ['Titel fehlt', filePlan({ sessions: [fileSession({ title: '' })] }), 'plans[0].sessions[0].title'],
    ['unbekannte Phase in der Woche', filePlan({ weeks: [{ start: '2030-01-14', phaseId: 'p9', targetKm: 30 }] }), 'plans[0].weeks[0].phaseId']
  ]
  for (const [name, plan, expectedPath] of cases) {
    const result = validateRunPlanFile({ format: 'fittrack-laufplan', formatVersion: 1, plans: [plan] })
    check(`Pruefung: ${name} wird abgelehnt`, result.ok === false)
    check(
      `Pruefung: ${name} nennt ${expectedPath}`,
      result.errors.some(e => e.startsWith(expectedPath + ':')),
      result.errors.join(' | ')
    )
  }

  const wrongFormat = validateRunPlanFile({ format: 'irgendwas', formatVersion: 1, plans: [filePlan()] })
  check('Pruefung: fremdes Format wird abgelehnt', wrongFormat.ok === false)
  const wrongVersion = validateRunPlanFile({ format: 'fittrack-laufplan', formatVersion: 2, plans: [filePlan()] })
  check('Pruefung: unbekannte Formatversion wird abgelehnt', wrongVersion.ok === false)
}

// --- Merge ohne Pruefung ist ein Programmierfehler ---------------------------
{
  let threw = false
  try {
    computeImportDiff([], [], { plans: [] }, TODAY, NOW)
  } catch {
    threw = true
  }
  check('Ungepruefte Datei wird abgewiesen', threw)
}

// --- Ergebnis ----------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\n[laufplan-merge-test] ${failures.length} von ${failures.length + passed} Faellen rot:\n`)
  for (const f of failures) console.error('  FEHLER ' + f)
  console.error('')
  process.exit(1)
}

console.log(`[laufplan-merge-test] OK — ${passed} Faelle gruen (Pruefung + Merge-Regeln 1-7).`)
