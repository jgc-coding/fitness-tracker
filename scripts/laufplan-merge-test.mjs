#!/usr/bin/env node
/*
 * Vertragstest fuer Laufplan-Pruefung und -Merge.
 *
 * Laeuft in Node, ohne Browser und ohne IndexedDB, weil beide Module reine
 * Funktionen sind (src/utils/runPlanSchema.js, src/utils/runPlanMerge.js).
 * Jede Regel aus docs/laufplaner-plan.md Abschnitt 5.4 hat mindestens einen
 * Fall; dazu die drei Sonderfaelle (leere Datei, fremder Nutzer, zweimal
 * derselbe Import), die Rueckmeldung nach dem Lauf (Faelle F1-F7) und die
 * Puls- und Tempovorgabe je Lauf (Faelle T1-T13).
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

// --- Rueckmeldung (Anstrengung 1-5 und Notiz) --------------------------------
// Das Feedback gehoert dem Laeufer, nicht dem Plan. Ein Import darf es nie
// stillschweigend loeschen, und ein Export-Reimport darf keine Scheinaenderung
// erzeugen (sonst zaehlt planVersion bei jedem Durchlauf hoch).
{
  // F1: Die Datei bringt eine Rueckmeldung mit -> sie wird uebernommen.
  const file = validFile([filePlan({ sessions: [
    fileSession({ id: 's-neu', date: '2030-01-28', feedback: { rpe: 4, note: '  Beine schwer  ', at: '2030-01-28T18:00:00.000Z' } })
  ] })])
  const { sessionsToPut } = diff([localPlan()], [], file)
  equal('F1 Anstrengung uebernommen', sessionsToPut[0].feedback.rpe, 4)
  equal('F1 Notiz getrimmt', sessionsToPut[0].feedback.note, 'Beine schwer')
  equal('F1 Zeitpunkt bleibt', sessionsToPut[0].feedback.at, '2030-01-28T18:00:00.000Z')
}

{
  // F2: Datei ohne Rueckmeldung darf eine lokale nicht loeschen — auch nicht
  // bei einem Lauf, der wieder auf "geplant" steht.
  const file = validFile([filePlan({ sessions: [fileSession({ id: 's1', title: 'Locker neu' })] })])
  const local = localSession({ id: 's1', feedback: { rpe: 5, note: 'war zu viel', at: '2030-01-19T20:00:00.000Z' } })
  const { sessionsToPut } = diff([localPlan()], [local], file)
  equal('F2 Titel kommt aus der Datei', sessionsToPut[0].title, 'Locker neu')
  equal('F2 Rueckmeldung bleibt erhalten', sessionsToPut[0].feedback.rpe, 5)
  equal('F2 Notiz bleibt erhalten', sessionsToPut[0].feedback.note, 'war zu viel')
}

{
  // F3: Bringt die Datei eine eigene Rueckmeldung mit, gewinnt sie beim noch
  // geplanten Lauf — sonst koennte Claude eine Korrektur nie zurueckspielen.
  const file = validFile([filePlan({ sessions: [
    fileSession({ id: 's1', feedback: { rpe: 2, note: 'aus der Datei', at: null } })
  ] })])
  const local = localSession({ id: 's1', feedback: { rpe: 5, note: 'lokal', at: null } })
  const { sessionsToPut } = diff([localPlan()], [local], file)
  equal('F3 Datei gewinnt beim geplanten Lauf', sessionsToPut[0]?.feedback?.note, 'aus der Datei')
}

{
  // F4: Erledigter Lauf mit Rueckmeldung — der Import fasst ihn gar nicht an.
  const file = validFile([filePlan({ sessions: [
    fileSession({ id: 's-done', feedback: { rpe: 1, note: 'Claude irrt', at: null } })
  ] })])
  const local = localSession({
    id: 's-done',
    status: 'done',
    actual: { km: 8, minutes: 52, avgHr: 138, note: '' },
    feedback: { rpe: 4, note: 'hart, aber ok', at: '2030-01-22T19:00:00.000Z' }
  })
  const { sessionsToPut, summary } = diff([localPlan()], [local], file)
  equal('F4 erledigter Lauf wird nicht geschrieben', sessionsToPut.length, 0)
  equal('F4 als geschuetzt gezaehlt', summary.sessionsProtected, 1)
}

{
  // F5: Rueckreise. Der Stand geht als Datei zu Claude und kommt unveraendert
  // zurueck -> "keine Aenderung".
  const local = localSession({
    id: 's1',
    status: 'done',
    feedback: { rpe: 3, note: 'solide', at: '2030-01-19T18:30:00.000Z' }
  })
  const exported = validFile([filePlan({ sessions: [
    fileSession({
      id: 's1',
      status: 'done',
      actual: null,
      feedback: { rpe: 3, note: 'solide', at: '2030-01-19T18:30:00.000Z' }
    })
  ] })])
  const zweite = diff([localPlan()], [local], exported)
  check('F5 Rueckreise meldet keine Aenderung', zweite.summary.unchanged === true,
    JSON.stringify(zweite.sessionsToPut))
}

{
  // F6: Leere Rueckmeldung ist keine Rueckmeldung.
  const leer = validateRunPlanFile({
    format: 'fittrack-laufplan',
    formatVersion: 1,
    plans: [filePlan({ sessions: [fileSession({ feedback: { rpe: null, note: '   ', at: null } })] })]
  })
  check('F6 leeres Feedback ist gueltig', leer.ok === true, (leer.errors || []).join(' | '))
  equal('F6 leeres Feedback wird zu null', leer.value.plans[0].sessions[0].feedback, null)

  const ohne = validateRunPlanFile({
    format: 'fittrack-laufplan',
    formatVersion: 1,
    plans: [filePlan({ sessions: [fileSession()] })]
  })
  equal('F6 fehlendes Feld ist null', ohne.value.plans[0].sessions[0].feedback, null)
}

{
  // F7: Nur ganze Zahlen von 1 bis 5.
  const kaputt = [
    ['Null als Stufe', 0],
    ['Sechs als Stufe', 6],
    ['Kommazahl', 3.5],
    ['Text statt Zahl', '4']
  ]
  for (const [name, wert] of kaputt) {
    const result = validateRunPlanFile({
      format: 'fittrack-laufplan',
      formatVersion: 1,
      plans: [filePlan({ sessions: [fileSession({ feedback: { rpe: wert } })] })]
    })
    check(`F7 ${name} wird abgelehnt`, result.ok === false)
    check(
      `F7 ${name} nennt den Pfad`,
      (result.errors || []).some(e => e.startsWith('plans[0].sessions[0].feedback.rpe:')),
      (result.errors || []).join(' | ')
    )
  }

  const falscherTyp = validateRunPlanFile({
    format: 'fittrack-laufplan',
    formatVersion: 1,
    plans: [filePlan({ sessions: [fileSession({ feedback: 'hart' })] })]
  })
  check('F7 Text statt Objekt wird abgelehnt', falscherTyp.ok === false)
}

// --- Puls- und Tempovorgabe (Faelle T1-T13) ---------------------------------
{
  const locker = { label: 'locker', hrFrom: 128, hrTo: 138, paceFrom: '7:15', paceTo: '7:45' }
  const schnell = { label: 'Steigerungen', hrFrom: null, hrTo: null, paceFrom: '4:30', paceTo: '5:00' }

  // T1: Vorgabe aus der Datei landet am geplanten Lauf.
  {
    const file = validFile([filePlan({ sessions: [fileSession({ targets: [locker] })] })])
    const d = diff([localPlan()], [localSession()], file)
    equal('T1 Vorgabe wird uebernommen', d.sessionsToPut[0]?.targets, [locker])
  }

  // T2: Kein Feld in Datei und Datensatz -> kein Schreibvorgang. Der Wert muss
  // null sein, nicht [], sonst gilt jeder alte Lauf als geaendert.
  {
    const file = validFile([filePlan({ sessions: [fileSession()] })])
    equal('T2 ohne Vorgabe wird nichts geschrieben', diff([localPlan()], [localSession()], file).sessionsToPut.length, 0)
    equal('T2 leer ist null, nicht []', file.plans[0].sessions[0].targets, null)
    const leereListe = validFile([filePlan({ sessions: [fileSession({ targets: [] })] })])
    equal('T2 leere Liste wird zu null', leereListe.plans[0].sessions[0].targets, null)
  }

  // T3: Die Vorgabe gehoert dem Plan. Nimmt die Datei sie zurueck, ist sie weg.
  {
    const file = validFile([filePlan({ sessions: [fileSession()] })])
    const d = diff([localPlan()], [localSession({ targets: [locker] })], file)
    equal('T3 entfernte Vorgabe verschwindet', d.sessionsToPut[0]?.targets, null)
  }

  // T4: Erledigter Lauf bleibt unangetastet (Regel 4 gilt auch hier).
  {
    const file = validFile([filePlan({ sessions: [fileSession({ targets: [locker] })] })])
    const lokal = localSession({ status: 'done', targets: null, actual: { km: 8.2, minutes: 52, avgHr: 133, note: '' } })
    const d = diff([localPlan()], [lokal], file)
    equal('T4 erledigter Lauf bekommt keine Vorgabe', d.sessionsToPut.length, 0)
    equal('T4 als geschuetzt gezaehlt', d.summary.sessionsProtected, 1)
  }

  // T5: Dieselbe Datei zweimal -> beim zweiten Mal keine Aenderung.
  {
    const file = validFile([filePlan({ sessions: [fileSession({ targets: [locker, schnell] })] })])
    const erst = diff([], [], file)
    const zweit = diff(erst.plansToPut, erst.sessionsToPut, file)
    check('T5 Zweitimport mit Vorgabe ist unveraendert', zweit.summary.unchanged === true)
  }

  // T6: Mehrere Abschnitte behalten ihre Reihenfolge.
  {
    const file = validFile([filePlan({ sessions: [fileSession({ type: 'tempo', targets: [locker, schnell] })] })])
    const ziele = file.plans[0].sessions[0].targets
    equal('T6 Reihenfolge bleibt', ziele.map(t => t.label), ['locker', 'Steigerungen'])
    equal('T6 zweiter Abschnitt ohne Puls', [ziele[1].hrFrom, ziele[1].hrTo], [null, null])
  }

  // T7-T13: Was die Pruefung ablehnen muss.
  const abgelehnt = [
    ['T7 Tempobereich rueckwaerts', [{ paceFrom: '5:00', paceTo: '4:30' }], 'plans[0].sessions[0].targets[0]'],
    ['T8 halber Pulsbereich', [{ hrFrom: 130, paceFrom: '7:00', paceTo: '7:30' }], 'plans[0].sessions[0].targets[0]'],
    ['T9 Tempo im falschen Format', [{ paceFrom: '7,15', paceTo: '7:45' }], 'plans[0].sessions[0].targets[0].paceFrom'],
    ['T10 leere Vorgabe', [{ label: 'nur ein Name' }], 'plans[0].sessions[0].targets[0]'],
    ['T11 mehr als vier Vorgaben', [locker, locker, locker, locker, locker], 'plans[0].sessions[0].targets'],
    ['T12 Puls ausserhalb der Grenzen', [{ hrFrom: 40, hrTo: 300 }], 'plans[0].sessions[0].targets[0].hrFrom'],
    ['T13 Vorgabe ist kein Objekt', ['locker 7:15'], 'plans[0].sessions[0].targets[0]']
  ]
  for (const [name, targets, pfad] of abgelehnt) {
    const result = validateRunPlanFile({
      format: 'fittrack-laufplan',
      formatVersion: 1,
      plans: [filePlan({ sessions: [fileSession({ targets })] })]
    })
    check(`${name} wird abgelehnt`, result.ok === false)
    check(`${name} nennt ${pfad}`, result.errors.some(e => e.startsWith(pfad + ':')), result.errors.join(' | '))
  }

  // Schreibweise wird vereinheitlicht: "07:05" und "7:05" sind dasselbe Tempo.
  {
    const file = validFile([filePlan({ sessions: [fileSession({ targets: [{ paceFrom: '07:05', paceTo: '07:35' }] })] })])
    equal('Tempo wird normalisiert', file.plans[0].sessions[0].targets[0].paceFrom, '7:05')
    const gleich = validFile([filePlan({ sessions: [fileSession({ targets: [{ paceFrom: '6:00', paceTo: '6:00' }] })] })])
    check('gleiche Grenzen sind erlaubt', gleich.plans[0].sessions[0].targets[0].paceTo === '6:00')
  }
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

console.log(`[laufplan-merge-test] OK — ${passed} Faelle gruen (Pruefung + Merge-Regeln 1-7 + Rueckmeldung + Vorgabe).`)
