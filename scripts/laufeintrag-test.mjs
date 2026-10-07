#!/usr/bin/env node
/*
 * Vertragstest fuer selbst eingetragene Laeufe und die Rueckmeldung
 * (src/utils/laufEintrag.js): "Anders gelaufen", "+ Lauf eintragen",
 * Bearbeiten, Loeschen und der Zyklustag in der Rueckmeldung.
 *
 * Laeuft in Node ohne Browser und IndexedDB. Zusammen mit runmatch-test.mjs
 * belegt er auch, dass die Uhr einen ersetzten Lauf nicht doppelt bringt.
 *
 * Aufruf (Windows PowerShell):  node .\scripts\laufeintrag-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import {
  normalizeFeedback,
  gleicheRueckmeldung,
  hatRueckmeldung,
  pruefeEingabe,
  baueSpontanLauf,
  ersetzeGeplantenLauf,
  bearbeiteSpontanLauf,
  darfLoeschen,
  vorbelegung,
  SPONTAN_ARTEN,
  BEHANDLUNG_AUSGELASSEN,
  BEHANDLUNG_OFFEN
} from '../src/utils/laufEintrag.js'
import { ordneZu } from '../src/utils/runMatch.js'

const JETZT = '2030-01-20T09:00:00.000Z'
const HEUTE = '2030-01-20'

let passed = 0
const failures = []

function check(name, condition, detail = '') {
  if (condition) passed++
  else failures.push(`${name}${detail ? ' -> ' + detail : ''}`)
}

function equal(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  check(name, a === e, `erwartet ${e}, bekommen ${a}`)
}

function eingabe(overrides = {}) {
  return {
    date: '2030-01-20',
    type: 'long',
    title: '',
    km: '15',
    minutes: '95',
    avgHr: '',
    rpe: 3,
    note: 'mit Freunden spontan',
    cycleDay: null,
    ...overrides
  }
}

function geplant(overrides = {}) {
  return {
    id: 'g1',
    planId: 'plan-a',
    userId: 'user1',
    date: '2030-01-20',
    type: 'tempo',
    title: 'Tempo 8 km',
    description: '',
    planned: { km: 8, minutes: null, loops: null },
    targets: null,
    status: 'planned',
    actual: null,
    feedback: null,
    source: 'plan',
    externalId: null,
    originalDate: null,
    unplanned: false,
    ...overrides
  }
}

const optionen = { id: 'neu1', jetzt: JETZT }

// --- R: Rueckmeldung --------------------------------------------------------

// R1: Zyklustag allein ist eine Rueckmeldung.
{
  const f = normalizeFeedback({ rpe: null, note: '', cycleDay: 18 })
  equal('R1 nur Zyklustag', { rpe: f?.rpe, note: f?.note, cycleDay: f?.cycleDay }, { rpe: null, note: '', cycleDay: 18 })
  check('R1 hat Zeitstempel', typeof f?.at === 'string' && f.at.length > 0)
}

// R2: Ohne Zyklustag fehlt das Feld ganz (aeltere Rueckmeldungen bleiben gleich).
{
  const f = normalizeFeedback({ rpe: 4, note: ' schwer ' })
  check('R2 kein cycleDay-Feld', f && !('cycleDay' in f), JSON.stringify(f))
  equal('R2 Notiz getrimmt', f?.note, 'schwer')
}

// R3: Alles leer -> keine Rueckmeldung.
equal('R3 leer', normalizeFeedback({ rpe: null, note: '  ', cycleDay: null }), null)
equal('R3 nichts', normalizeFeedback(null), null)

// R4: Ungueltiger Zyklustag zaehlt nicht (das Formular meldet ihn vorher).
equal('R4 Zyklustag 0 faellt weg', normalizeFeedback({ rpe: null, note: '', cycleDay: 0 }), null)

// R5: Zeitstempel bleibt, solange sich nichts aendert — auch mit Zyklustag.
{
  const vorher = { rpe: 2, note: 'ok', cycleDay: 5, at: '2030-01-01T10:00:00.000Z' }
  equal('R5 unveraendert behaelt at', normalizeFeedback({ rpe: 2, note: 'ok', cycleDay: 5 }, vorher)?.at, vorher.at)
  check('R5 neuer Zyklustag ist eine Aenderung', normalizeFeedback({ rpe: 2, note: 'ok', cycleDay: 6 }, vorher)?.at !== vorher.at)
  check('R5 gleich ohne at', gleicheRueckmeldung({ rpe: 2, note: 'ok' }, { rpe: 2, note: 'ok', cycleDay: null }))
  check('R5 ungleich mit Zyklustag', !gleicheRueckmeldung({ rpe: 2, note: 'ok' }, { rpe: 2, note: 'ok', cycleDay: 3 }))
  check('R5 hatRueckmeldung nur Zyklustag', hatRueckmeldung({ rpe: null, note: '', cycleDay: 3 }))
  check('R5 hatRueckmeldung leer', !hatRueckmeldung({ rpe: null, note: '' }))
}

// --- E: Eingabe pruefen -----------------------------------------------------

{
  const ok = pruefeEingabe(eingabe({ km: '8,5' }))
  equal('E1 Komma wird zu Punkt', ok.felder?.actual?.km, 8.5)
  equal('E1 Titel fehlt -> Art', ok.felder?.title, 'Langer Lauf')

  const ohneArt = pruefeEingabe(eingabe({ type: '' }))
  check('E2 ohne Art abgelehnt', ohneArt.ok === false && ohneArt.fehler.length === 1)
  check('E2 Kraft ist kein Lauf', pruefeEingabe(eingabe({ type: 'strength' })).ok === false)
  check('E2 Kraft fehlt in der Auswahl', !SPONTAN_ARTEN.some(t => t.id === 'strength'))
  check('E3 ohne Datum abgelehnt', pruefeEingabe(eingabe({ date: '' })).ok === false)
  check('E4 Text als km abgelehnt', pruefeEingabe(eingabe({ km: 'viel' })).ok === false)
  check('E4 negative Minuten abgelehnt', pruefeEingabe(eingabe({ minutes: '-5' })).ok === false)
  check('E5 Zyklustag 46 abgelehnt', pruefeEingabe(eingabe({ cycleDay: 46 })).ok === false)

  const ohneWerte = pruefeEingabe(eingabe({ km: '', minutes: '', avgHr: '' }))
  equal('E6 ohne Werte kein actual', ohneWerte.felder?.actual, null)
  equal('E7 langer Titel gekuerzt', pruefeEingabe(eingabe({ title: 'x'.repeat(80) })).felder?.title.length, 60)
}

// --- N: neuer Lauf (+ Lauf eintragen) ---------------------------------------

{
  const r = baueSpontanLauf(eingabe({ cycleDay: 18, avgHr: '142' }), { ...optionen, userId: 'user1', planId: 'plan-a' })
  check('N1 ok', r.ok, r.fehler.join(' | '))
  const l = r.lauf
  equal('N1 ungeplant und erledigt', [l.unplanned, l.status, l.source], [true, 'done', 'manual'])
  equal('N1 Werte', l.actual, { km: 15, minutes: 95, avgHr: 142, note: '' })
  equal('N1 kein Planwert', l.planned, { km: null, minutes: null, loops: null })
  equal('N1 Rueckmeldung mit Zyklustag', [l.feedback?.rpe, l.feedback?.note, l.feedback?.cycleDay], [3, 'mit Freunden spontan', 18])
  equal('N1 Zuordnung', [l.id, l.userId, l.planId, l.date], ['neu1', 'user1', 'plan-a', '2030-01-20'])
  check('N1 kein undefined (Firestore)', !JSON.stringify(l, (k, v) => (v === undefined ? '__U__' : v)).includes('__U__'))

  const ohnePlan = baueSpontanLauf(eingabe(), { ...optionen, userId: 'user3' })
  equal('N2 ohne Plan', ohnePlan.lauf?.planId, null)
  check('N3 Fehler kommen durch', baueSpontanLauf(eingabe({ type: '' }), { ...optionen, userId: 'user1' }).ok === false)
}

// --- A: Anders gelaufen -----------------------------------------------------

// A1: Noch geplanter Lauf, Standard "ausgelassen".
{
  const r = ersetzeGeplantenLauf(geplant(), eingabe(), BEHANDLUNG_AUSGELASSEN, optionen)
  check('A1 ok', r.ok, r.fehler.join(' | '))
  equal('A1 neuer Lauf erbt Person und Plan', [r.neu.userId, r.neu.planId, r.neu.unplanned], ['user1', 'plan-a', true])
  equal('A1 geplanter ausgelassen', r.geplantUpdates.status, 'skipped')
  equal('A1 Hinweis am geplanten', r.geplantUpdates.actual?.note, 'Stattdessen: Langer Lauf')
  check('A1 Rueckmeldung des geplanten unangetastet', !('feedback' in r.geplantUpdates))
}

// A2: "offen lassen" -> der geplante bleibt geplant und kann verschoben werden.
{
  const r = ersetzeGeplantenLauf(geplant(), eingabe(), BEHANDLUNG_OFFEN, optionen)
  equal('A2 bleibt geplant', [r.geplantUpdates.status, r.geplantUpdates.actual, r.geplantUpdates.source], ['planned', null, 'plan'])
}

// A3: Die Uhr hatte den spontanen Lauf dem geplanten zugeordnet -> Werte,
// Uhr-Kennung, Notiz und Rueckmeldung wandern auf den neuen Lauf.
{
  const vonDerUhr = geplant({
    status: 'done',
    source: 'intervals',
    externalId: 'i1:77',
    actual: { km: 15.2, minutes: 96, avgHr: 141, note: 'Gesamtzeit 1:45 h' },
    feedback: { rpe: 3, note: 'schoen', at: '2030-01-20T18:00:00.000Z' }
  })
  const vorbelegt = vorbelegung(vonDerUhr, { heute: HEUTE, modus: 'anders' })
  equal('A3 Formular mit Uhr-Werten vorbelegt', [vorbelegt.km, vorbelegt.minutes, vorbelegt.avgHr, vorbelegt.rpe, vorbelegt.note], [15.2, 96, 141, 3, 'schoen'])
  equal('A3 Art wird neu gewaehlt', vorbelegt.type, '')

  const r = ersetzeGeplantenLauf(vonDerUhr, { ...vorbelegt, type: 'long' }, BEHANDLUNG_AUSGELASSEN, optionen)
  equal('A3 Uhr-Kennung wandert', [r.neu.externalId, r.neu.source], ['i1:77', 'intervals'])
  equal('A3 Ist-Werte wandern samt Notiz', r.neu.actual, { km: 15.2, minutes: 96, avgHr: 141, note: 'Gesamtzeit 1:45 h' })
  equal('A3 Rueckmeldung wandert', [r.neu.feedback?.rpe, r.neu.feedback?.note], [3, 'schoen'])
  equal('A3 geplanter verliert Kennung und Rueckmeldung', [r.geplantUpdates.externalId, r.geplantUpdates.feedback], [null, null])

  // Danach bringt die Uhr denselben Lauf nicht noch einmal.
  const nachher = [{ ...vonDerUhr, ...r.geplantUpdates }, r.neu]
  const abgleich = ordneZu(
    [{ externalId: 'i1:77', date: '2030-01-20', km: 15.2, minutenBewegung: 96, minutenGesamt: 105, avgHr: 141, istGehen: false, name: 'Lauf' }],
    nachher,
    { userId: 'user1', planId: 'plan-a', jetzt: JETZT }
  )
  equal('A3 Uhr bringt ihn nicht doppelt', [abgleich.patches.length, abgleich.neue.length, abgleich.summary.schonDa], [0, 0, 1])
}

// A4: Von Hand abgehakt (ohne Uhr) -> kein externalId, Quelle bleibt manual.
{
  const vonHand = geplant({ status: 'done', source: 'manual', actual: { km: 10, minutes: 60, avgHr: null, note: '' } })
  const r = ersetzeGeplantenLauf(vonHand, eingabe(), BEHANDLUNG_OFFEN, optionen)
  equal('A4 Quelle manual', [r.neu.source, r.neu.externalId], ['manual', null])
}

// A5: Schon ausgelassen mit Grund -> der Grund bleibt, der Hinweis kommt dazu.
{
  const ausgelassen = geplant({ status: 'skipped', source: 'manual', actual: { km: null, minutes: null, avgHr: null, note: 'Knie' } })
  const r = ersetzeGeplantenLauf(ausgelassen, eingabe({ title: 'Spaziergang' , type: 'walk' }), BEHANDLUNG_AUSGELASSEN, optionen)
  equal('A5 Grund bleibt', r.geplantUpdates.actual.note, 'Knie - Stattdessen: Spaziergang')
}

// A6: Fehlerfaelle.
check('A6 ungeplanter Lauf laesst sich nicht ersetzen', ersetzeGeplantenLauf(geplant({ unplanned: true }), eingabe(), BEHANDLUNG_OFFEN, optionen).ok === false)
check('A6 ohne Wahl abgelehnt', ersetzeGeplantenLauf(geplant(), eingabe(), 'irgendwas', optionen).ok === false)
check('A6 Eingabefehler abgelehnt', ersetzeGeplantenLauf(geplant(), eingabe({ type: '' }), BEHANDLUNG_OFFEN, optionen).ok === false)

// A7: Geplanter Lauf in der Zukunft -> Datum im Formular ist heute.
equal('A7 Zukunft -> heute', vorbelegung(geplant({ date: '2030-01-24' }), { heute: HEUTE, modus: 'anders' }).date, HEUTE)
equal('A7 Vergangenheit bleibt', vorbelegung(geplant({ date: '2030-01-18' }), { heute: HEUTE, modus: 'anders' }).date, '2030-01-18')

// --- B: Bearbeiten und Loeschen ---------------------------------------------

{
  const eigener = baueSpontanLauf(eingabe(), { ...optionen, userId: 'user1', planId: 'plan-a' }).lauf
  const vorbelegt = vorbelegung(eigener, { heute: HEUTE, modus: 'bearbeiten' })
  equal('B1 Vorbelegung beim Bearbeiten', [vorbelegt.type, vorbelegt.km, vorbelegt.rpe], ['long', 15, 3])

  const r = bearbeiteSpontanLauf(eigener, { ...vorbelegt, type: 'hills', title: 'Huegel im Wald', km: '12' })
  equal('B2 Aenderung', [r.updates.type, r.updates.title, r.updates.actual.km], ['hills', 'Huegel im Wald', 12])
  equal('B2 Rueckmeldung behaelt Zeitstempel', r.updates.feedback.at, eigener.feedback.at)

  const vonDerUhr = { ...eigener, source: 'intervals', externalId: 'i1:9', actual: { km: 5, minutes: 30, avgHr: 130, note: 'Gesamtzeit 0:40 h' } }
  const u = bearbeiteSpontanLauf(vonDerUhr, { ...vorbelegung(vonDerUhr, { heute: HEUTE, modus: 'bearbeiten' }), type: 'easy' })
  equal('B3 Uhr-Notiz bleibt', u.updates.actual.note, 'Gesamtzeit 0:40 h')
  check('B3 Kennung wird nicht angefasst', !('externalId' in u.updates) && !('source' in u.updates))

  check('B4 geplanter nicht bearbeitbar', bearbeiteSpontanLauf(geplant(), eingabe()).ok === false)

  check('B5 eigener darf geloescht werden', darfLoeschen(eigener))
  check('B5 Uhr-Lauf nicht', !darfLoeschen(vonDerUhr))
  check('B5 geplanter nicht', !darfLoeschen(geplant()))
  check('B5 nichts', !darfLoeschen(null))
}

if (failures.length > 0) {
  console.error(`\n[laufeintrag-test] ${failures.length} von ${failures.length + passed} Faellen rot:\n`)
  for (const f of failures) console.error('  FEHLER ' + f)
  console.error('')
  process.exit(1)
}

console.log(`[laufeintrag-test] OK - ${passed} Faelle gruen (Anders gelaufen, Eintragen, Bearbeiten, Rueckmeldung).`)
