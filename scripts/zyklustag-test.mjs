#!/usr/bin/env node
/*
 * Vertragstest fuer den errechneten Zyklustag (src/utils/zyklusTag.js).
 *
 * Laeuft in Node ohne Browser und IndexedDB. Regel: zeitlich naechster
 * Eintrag plus Kalendertage dazwischen, nur 1-45, hoechstens 45 Tage weit.
 *
 * Aufruf (Windows PowerShell):  node .\scripts\zyklustag-test.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Fall ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import {
  errechneZyklustag,
  sammleZyklusEintraege,
  leseZyklusEingabe,
  istZyklustag,
  zyklusTageFuerDaten,
  brauchtZyklusStempel,
  zyklusStempel
} from '../src/utils/zyklusTag.js'

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

const eintrag = (date, day, quelle = 'training', at = '') => ({ date, day, quelle, at })
const tagVon = (ergebnis) => (ergebnis ? ergebnis.tag : null)

// Z1: Grundfall vorwaerts — Tag 12 am 01.10., sechs Tage spaeter Tag 18.
{
  const r = errechneZyklustag([eintrag('2030-10-01', 12)], '2030-10-07')
  equal('Z1 Tag 12 plus sechs Tage', tagVon(r), 18)
  equal('Z1 Grundlage wird genannt', r?.basis, { date: '2030-10-01', day: 12, quelle: 'training' })
}

// Z2: Eintrag am selben Tag ist der Wert selbst.
equal('Z2 gleicher Tag', tagVon(errechneZyklustag([eintrag('2030-10-07', 5)], '2030-10-07')), 5)

// Z3: Ohne Eintraege gibt es nichts zu rechnen.
equal('Z3 keine Eintraege', errechneZyklustag([], '2030-10-07'), null)
equal('Z3 kaputtes Datum', errechneZyklustag([eintrag('2030-10-01', 3)], '07.10.2030'), null)

// Z4: Ein Eintrag weiter als 45 Tage weg ist keine Grundlage mehr.
equal('Z4 46 Tage alt', errechneZyklustag([eintrag('2030-01-01', 1)], '2030-02-16'), null)
equal('Z4 ein Jahr alt', errechneZyklustag([eintrag('2029-10-01', 1)], '2030-10-01'), null)

// Z5: Ergebnis ueber 45 gibt es nicht (das Rad im Training endet bei 45).
equal('Z5 Tag 40 plus zehn', errechneZyklustag([eintrag('2030-10-01', 40)], '2030-10-11'), null)
equal('Z5 Tag 40 plus fuenf', tagVon(errechneZyklustag([eintrag('2030-10-01', 40)], '2030-10-06')), 45)

// Z6: Der naechste Eintrag gewinnt (ein neuer Zyklus hat begonnen).
equal(
  'Z6 neuer Zyklus zaehlt',
  tagVon(errechneZyklustag([eintrag('2030-10-01', 25), eintrag('2030-10-20', 3)], '2030-10-22')),
  5
)

// Z7: Rueckwaerts rechnen, wenn der naechste Eintrag spaeter liegt.
equal('Z7 rueckwaerts', tagVon(errechneZyklustag([eintrag('2030-10-10', 8)], '2030-10-07')), 5)

// Z8: Rueckwaerts unter 1 geht nicht; dann der naechstbeste Eintrag.
equal('Z8 rueckwaerts unter 1', errechneZyklustag([eintrag('2030-10-10', 2)], '2030-10-07'), null)
equal(
  'Z8 dann der fruehere Eintrag',
  tagVon(errechneZyklustag([eintrag('2030-10-10', 2), eintrag('2030-09-19', 20)], '2030-10-07')),
  38
)

// Z9: Gleicher Abstand vor und nach dem Tag -> der fruehere Eintrag.
equal(
  'Z9 Gleichstand vorher gewinnt',
  tagVon(errechneZyklustag([eintrag('2030-10-10', 9), eintrag('2030-10-04', 2)], '2030-10-07')),
  5
)

// Z10: Zwei Eintraege am selben Tag -> der zuletzt geaenderte gilt.
equal(
  'Z10 juengste Aenderung gewinnt',
  tagVon(errechneZyklustag([
    eintrag('2030-10-05', 10, 'training', '2030-10-05T08:00:00.000Z'),
    eintrag('2030-10-05', 11, 'lauf', '2030-10-05T19:00:00.000Z')
  ], '2030-10-06')),
  12
)

// Z11: Sommerzeit — Ende Maerz verschiebt keinen Tag (Umstellung 31.03.2030).
equal('Z11 ueber die Zeitumstellung', tagVon(errechneZyklustag([eintrag('2030-03-30', 1)], '2030-04-01')), 3)
equal('Z11 ueber die Winterzeit', tagVon(errechneZyklustag([eintrag('2030-10-26', 1)], '2030-10-28')), 3)

// Z12: Sammeln aus Trainings und Laeufen, nur die eigene Person, nur gueltige Werte.
{
  const logs = [
    { date: '2030-10-01', cycleDays: { user1: 12 }, updatedAt: '2030-10-01T10:00:00.000Z' },
    { date: '2030-10-02', cycleDays: { user2: 7 } },
    { date: '2030-10-03', cycleDays: { user1: 0 } },
    { date: '2030-10-03', cycleDays: { user1: 46 } },
    { date: '2030-10-03', cycleDays: { user1: '14' } },
    { date: '2030-10-03' },
    { date: 'kaputt', cycleDays: { user1: 3 } }
  ]
  const laeufe = [
    { userId: 'user1', date: '2030-10-04', feedback: { rpe: 3, note: '', cycleDay: 15, at: '2030-10-04T18:00:00.000Z' } },
    { userId: 'user1', date: '2030-10-05', feedback: { rpe: 2, note: '' } },
    { userId: 'user1', date: '2030-10-05', feedback: null },
    { userId: 'user2', date: '2030-10-05', feedback: { cycleDay: 9 } }
  ]
  const liste = sammleZyklusEintraege('user1', logs, laeufe)
  equal('Z12 nur gueltige eigene Eintraege', liste.map(e => `${e.quelle}:${e.date}:${e.day}`), [
    'training:2030-10-01:12',
    'lauf:2030-10-04:15'
  ])
  equal('Z12 Lauf-Eintrag ist Grundlage', tagVon(errechneZyklustag(liste, '2030-10-07')), 18)
  equal('Z12 ohne Daten leer', sammleZyklusEintraege('user1', undefined, undefined), [])
}

// Z13: Formular-Eingabe — leer ist erlaubt, Unsinn wird gemeldet statt verworfen.
equal('Z13 leer', leseZyklusEingabe(''), { ok: true, wert: null })
equal('Z13 null', leseZyklusEingabe(null), { ok: true, wert: null })
equal('Z13 Zahl als Text', leseZyklusEingabe(' 18 '), { ok: true, wert: 18 })
equal('Z13 Zahl', leseZyklusEingabe(7), { ok: true, wert: 7 })
equal('Z13 null als Tag', leseZyklusEingabe('0'), { ok: false, wert: null })
equal('Z13 zu gross', leseZyklusEingabe('46'), { ok: false, wert: null })
equal('Z13 Kommazahl', leseZyklusEingabe('3,5'), { ok: false, wert: null })
equal('Z13 Text', leseZyklusEingabe('abc'), { ok: false, wert: null })
check('Z13 istZyklustag 45', istZyklustag(45))
check('Z13 istZyklustag nicht 1.5', !istZyklustag(1.5))

// Z14: Anzeige je Datum (v2.16.0) — gespeichert gewinnt, sonst errechnet,
// ohne beides fehlt das Datum. Echter Verlauf: Tag 9 am 02.11., danach
// Trainings ohne Eintrag.
{
  const liste = [
    eintrag('2030-11-02', 9, 'training', '2030-11-02T10:00:00.000Z'),
    eintrag('2030-10-25', 1, 'training', '2030-10-25T10:00:00.000Z')
  ]
  const karte = zyklusTageFuerDaten(liste, ['2030-10-24', '2030-11-02', '2030-11-06', '2030-11-14', '2031-03-01'])
  equal('Z14 gespeichert', karte.get('2030-11-02'), { tag: 9, errechnet: false })
  equal('Z14 errechnet vorwaerts', karte.get('2030-11-06'), { tag: 13, errechnet: true })
  equal('Z14 errechnet zwoelf Tage spaeter', karte.get('2030-11-14'), { tag: 21, errechnet: true })
  // Tag vor dem Zyklusbeginn: rueckwaerts waere 0, der alte Zyklus fehlt -> nichts
  equal('Z14 vor Tag 1 ohne Grundlage', karte.has('2030-10-24'), false)
  equal('Z14 zu weit weg', karte.has('2031-03-01'), false)
  // Zwei Eintraege am selben Datum: der zuletzt geaenderte
  const doppelt = zyklusTageFuerDaten([
    eintrag('2030-11-02', 9, 'training', '2030-11-02T08:00:00.000Z'),
    eintrag('2030-11-02', 10, 'lauf', '2030-11-02T19:00:00.000Z')
  ], ['2030-11-02'])
  equal('Z14 juengster am selben Tag', doppelt.get('2030-11-02'), { tag: 10, errechnet: false })
  equal('Z14 ohne Daten leer', zyklusTageFuerDaten(liste, undefined).size, 0)
}

// Z15: Wann wird gestempelt? Nur wenn die Person neu ins Training kommt.
check('Z15 neues Training mit ihr', brauchtZyklusStempel({ neu: true, nachherIds: ['user1', 'user2'], userId: 'user1' }))
check('Z15 neues Training ohne sie', !brauchtZyklusStempel({ neu: true, nachherIds: ['user2'], userId: 'user1' }))
check('Z15 steigt dazu', brauchtZyklusStempel({ vorherIds: ['user2'], nachherIds: ['user2', 'user1'], userId: 'user1' }))
check('Z15 war schon drin', !brauchtZyklusStempel({ vorherIds: ['user1'], nachherIds: ['user1'], userId: 'user1' }))
check('Z15 alter Log ohne userIds', brauchtZyklusStempel({ vorherIds: undefined, nachherIds: ['user1'], userId: 'user1' }))
check('Z15 ohne Zyklus-Person', !brauchtZyklusStempel({ neu: true, nachherIds: ['user1'], userId: null }))

// Z16: Der Stempel — Korrektur gewinnt, andere Personen bleiben, flache Kopie.
{
  const vorher = { user3: 4 }
  const neu = zyklusStempel(vorher, 'user1', { tag: 21 })
  equal('Z16 errechneter Tag kommt hinein', neu, { user3: 4, user1: 21 })
  check('Z16 Original unangetastet', vorher.user1 === undefined && neu !== vorher)
  equal('Z16 gespeicherter Tag bleibt', zyklusStempel({ user1: 3 }, 'user1', { tag: 21 }), null)
  equal('Z16 ohne errechneten Tag', zyklusStempel({}, 'user1', null), null)
  equal('Z16 kaputter alter Wert wird ersetzt', zyklusStempel({ user1: 0 }, 'user1', { tag: 5 }), { user1: 5 })
  equal('Z16 ohne cycleDays', zyklusStempel(undefined, 'user1', { tag: 7 }), { user1: 7 })
  equal('Z16 ohne Person', zyklusStempel({}, null, { tag: 7 }), null)
}

if (failures.length > 0) {
  console.error(`\n[zyklustag-test] ${failures.length} von ${failures.length + passed} Faellen rot:\n`)
  for (const f of failures) console.error('  FEHLER ' + f)
  console.error('')
  process.exit(1)
}

console.log(`[zyklustag-test] OK - ${passed} Faelle gruen (Zyklustag errechnen).`)
