// Vertragstest fuer die Auswertung mehrerer Uebungen (src/utils/auswertung.js,
// History -> Auswertung, v2.15.0). Der Test ist der Vertrag: wer Regeln fuer
// Zeitraum, Workout-Gruppen, Auswahl, Veraenderung oder Rangliste aendert,
// erweitert ZUERST diesen Test.
//
// Aufruf:  node ./scripts/auswertung-test.mjs

import {
  AUSWERTUNG_ZEITRAEUME,
  zeitraumGrenzen,
  kurzTitel,
  workoutGruppen,
  gruppenUebungen,
  punkteJeUebung,
  sortiereUebungen,
  auswahlIds,
  veraenderung,
  rangliste,
  balkenSkala,
  balken,
  prozentText,
  diffText,
  einstellungenAus
} from '../src/utils/auswertung.js'

let fehler = 0

function pruefe(beschreibung, bedingung, detail) {
  if (bedingung) {
    console.log(`  OK   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`, detail === undefined ? '' : JSON.stringify(detail))
  }
}

const HEUTE = '2026-11-12'

console.log('[auswertung-test] Zeitraum:')
pruefe('Knoepfe: die vier des Einzelverlaufs plus "Frei"',
  AUSWERTUNG_ZEITRAEUME.map(z => z.key).join(',') === '3m,6m,12m,alle,frei')
const g3 = zeitraumGrenzen('3m', HEUTE)
pruefe('3 Monate: 12.08. bis heute', g3.von === '2026-08-12' && g3.bis === HEUTE && !g3.fehler, g3)
const gAlle = zeitraumGrenzen('alle', HEUTE)
pruefe('Alle: ohne Start, bis heute', gAlle.von === null && gAlle.bis === HEUTE, gAlle)
const gFrei = zeitraumGrenzen('frei', HEUTE, '2026-05-01', '2026-09-30')
pruefe('Frei: genau die gewaehlten Tage', gFrei.von === '2026-05-01' && gFrei.bis === '2026-09-30' && !gFrei.fehler, gFrei)
const gFalsch = zeitraumGrenzen('frei', HEUTE, '2026-10-01', '2026-09-01')
pruefe('Frei, Von nach Bis: Fehlertext, kein still vertauschter Zeitraum', !!gFalsch.fehler && gFalsch.von === null, gFalsch)
const gLeer = zeitraumGrenzen('frei', HEUTE, '', '2026-09-01')
pruefe('Frei ohne Von: Fehlertext', !!gLeer.fehler, gLeer)
const gKaputt = zeitraumGrenzen('frei', HEUTE, '2026-02-30', '2026-09-01')
pruefe('Frei mit unmoeglichem Datum (30.02.): Fehlertext', !!gKaputt.fehler, gKaputt)
pruefe('Frei, ein einzelner Tag ist erlaubt', !zeitraumGrenzen('frei', HEUTE, '2026-09-01', '2026-09-01').fehler)

console.log('[auswertung-test] Workout-Gruppen aus dem Plan:')
pruefe('"Push (WE)" -> "Push"', kurzTitel('Push (WE)') === 'Push')
pruefe('"Legs (Donnerstag)" -> "Legs"', kurzTitel('Legs (Donnerstag)') === 'Legs')
pruefe('ohne Klammer bleibt der Titel', kurzTitel('Oberkoerper') === 'Oberkoerper')
pruefe('nur Klammer -> der Titel selbst', kurzTitel('(A)') === '(A)')
pruefe('leer -> "Workout"', kurzTitel('') === 'Workout' && kurzTitel(undefined) === 'Workout')
const tage = [
  { id: 'd1', title: 'Push (WE)', exercises: [{ exerciseId: 'bank', alternativen: ['kh-bank'] }, { exerciseId: 'butterfly' }] },
  { id: 'd2', title: 'Pull (Dienstag)', exercises: [{ exerciseId: 'latzug' }] },
  { id: 'd3', title: 'push (B)', exercises: [{ exerciseId: 'dips' }, { exerciseId: 'bank' }] },
  { id: 'd4', title: 'Legs (Donnerstag)', exercises: [{ basisExerciseId: 'hack', exerciseId: 'presse', alternativen: [] }] }
]
const gruppen = workoutGruppen(tage)
pruefe('gleicher Kurztitel (auch klein geschrieben) wird eine Gruppe, Reihenfolge wie im Plan',
  gruppen.map(g => g.label).join(',') === 'Push,Pull,Legs', gruppen.map(g => g.label))
const push = gruppen[0]
pruefe('Push umfasst beide Tage', push.dayIds.join(',') === 'd1,d3')
pruefe('Plan-Uebungen samt Alternativen, einmalig, in Plan-Reihenfolge',
  push.planUebungen.join(',') === 'bank,kh-bank,butterfly,dips', push.planUebungen)
pruefe('Basis-Uebung des Platzes zaehlt (nicht nur die gerade getauschte)',
  gruppen[2].planUebungen.join(',') === 'hack', gruppen[2].planUebungen)
pruefe('Schluessel sind eindeutig und stabil', new Set(gruppen.map(g => g.key)).size === 3 && push.key === 'w:push')
pruefe('ohne Tage: keine Gruppen', workoutGruppen([]).length === 0 && workoutGruppen(undefined).length === 0)

console.log('[auswertung-test] Was in einer Workout-Gruppe trainiert wurde:')
const logs = [
  { id: 'L1', trainingDayId: 'd1', date: '2026-10-01' },
  { id: 'L2', trainingDayId: 'd2', date: '2026-10-02' },
  { id: 'L3', trainingDayId: 'd1', date: '2026-10-08' }
]
const s = (workoutLogId, exerciseId, userId, date, weight, reps, setNumber = 1) =>
  ({ workoutLogId, exerciseId, userId, date, weight, reps, setNumber })
const saetze = [
  s('L1', 'bank', 'user1', '2026-10-01', 40, 10),
  s('L1', 'schraeg', 'user1', '2026-10-01', 30, 10), // im Push-Training getauscht
  s('L2', 'latzug', 'user1', '2026-10-02', 45, 10),
  s('L3', 'bank', 'user1', '2026-10-08', 42.5, 8),
  s('L3', 'schraeg', 'user2', '2026-10-08', 35, 10)
]
const pushIds = gruppenUebungen(push, logs, saetze, 'user1')
pruefe('Plan-Uebungen zuerst, dann im Push-Training zusaetzlich trainierte',
  pushIds.join(',') === 'bank,kh-bank,butterfly,dips,schraeg', pushIds)
pruefe('nur Saetze dieser Person zaehlen (user2 hat nichts Zusaetzliches)',
  gruppenUebungen(gruppen[1], logs, saetze, 'user2').join(',') === 'latzug')

console.log('[auswertung-test] Punkte je Uebung:')
const pm = punkteJeUebung(saetze, 'user1', '2026-10-01', '2026-10-31')
pruefe('Bankdruecken: zwei Tage', pm.get('bank').length === 2)
pruefe('andere Person zaehlt nicht', pm.get('schraeg').length === 1)
const pmOkt = punkteJeUebung(saetze, 'user1', '2026-10-05', '2026-10-31')
pruefe('Zeitraum schneidet: ab 05.10. nur noch ein Tag Bankdruecken', pmOkt.get('bank').length === 1)
pruefe('keine Saetze: leere Map', punkteJeUebung([], 'user1', null, null).size === 0)

console.log('[auswertung-test] Reihenfolge "Alle":')
const uebungen = [
  { id: 'b', name: 'butterfly', muscleGroup: 'chest' },
  { id: 'l', name: 'Latzug', muscleGroup: 'back' },
  { id: 'a', name: 'Bankdruecken', muscleGroup: 'chest' },
  { id: 'x', name: 'Unbekannt', muscleGroup: 'irgendwas' }
]
pruefe('nach Muskelgruppe (Reihenfolge der Liste), darin nach Name ohne Gross/klein, Unbekanntes zuletzt',
  sortiereUebungen(uebungen, ['chest', 'back']).join(',') === 'a,b,l,x',
  sortiereUebungen(uebungen, ['chest', 'back']))

console.log('[auswertung-test] Auswahl:')
const punkteMap = new Map([
  ['bank', [{}, {}]], ['butterfly', [{}]], ['latzug', [{}, {}, {}]], ['schraeg', [{}, {}]]
])
const alle = ['bank', 'butterfly', 'latzug', 'schraeg', 'dips']
pruefe('Alle: nur Uebungen mit mindestens zwei Eintraegen im Zeitraum',
  auswahlIds('alle', { alle, punkte: punkteMap }).join(',') === 'bank,latzug,schraeg')
pruefe('Workout-Gruppe: ihre Uebungen mit mindestens zwei Eintraegen',
  auswahlIds('w:push', { alle, punkte: punkteMap, gruppenIds: { 'w:push': ['bank', 'kh-bank', 'butterfly', 'schraeg'] } }).join(',') === 'bank,schraeg')
pruefe('Eigene Auswahl: genau die gewaehlten, auch mit wenigen Eintraegen, einmalig',
  auswahlIds('eigene', { alle, punkte: punkteMap, eigene: ['butterfly', 'bank', 'butterfly'] }).join(',') === 'butterfly,bank')
pruefe('unbekannte Gruppe (Plan geaendert): leer statt still "Alle"',
  auswahlIds('w:weg', { alle, punkte: punkteMap, gruppenIds: {} }).length === 0)

console.log('[auswertung-test] Veraenderung im Zeitraum:')
const p = (date, weight, reps, e1rm) => ({ date, weight, reps, e1rm })
const v1 = veraenderung([p('2026-09-01', 40, 10, 53.3), p('2026-10-01', 42.5, 8, 53.8), p('2026-11-01', 45, 8, 57)])
pruefe('Gewicht: erster gegen letzten Tag', v1.start === 40 && v1.ende === 45 && v1.diff === 5 && v1.einheit === 'kg', v1)
pruefe('Prozent: +12,5', Math.abs(v1.prozent - 12.5) < 1e-9, v1.prozent)
pruefe('Anzahl Tage', v1.tage === 3)
const v2 = veraenderung([p('2026-09-01', 40, 10, 53.3), p('2026-11-01', 45, 8, 57)], 'e1rm')
pruefe('1RM: erster gegen letzten Wert', v2.start === 53.3 && v2.ende === 57, v2)
const v3 = veraenderung([p('2026-09-01', 0, 8, 0), p('2026-11-01', 0, 11, 0)], 'e1rm')
pruefe('Koerpergewicht (0 kg): Wdh statt kg, auch bei 1RM', v3.einheit === 'Wdh' && v3.start === 8 && v3.ende === 11, v3)
pruefe('nur ein Tag: keine Veraenderung (null)', veraenderung([p('2026-09-01', 40, 10, 53)]) === null)
pruefe('keine Tage: null', veraenderung([]) === null)
const v4 = veraenderung([p('2026-09-01', 40, null, null), p('2026-10-01', 42.5, 8, 53.8), p('2026-11-01', 45, 8, 57)], 'e1rm')
pruefe('1RM: Tage ohne Wdh werden uebersprungen', v4.start === 53.8 && v4.tage === 2, v4)
const v5 = veraenderung([p('2026-09-01', 50, 8, 63), p('2026-11-01', 45, 8, 57)])
pruefe('Rueckgang ist negativ', v5.diff === -5 && v5.prozent === -10, v5)
// Deload-Wochen (v2.18.0): leichte Tage dort zaehlen nicht als Rueckgang.
// 2026-11-09 ist ein Montag; 2026-11-11 liegt in dieser Woche.
const mitDeload = [p('2026-10-26', 40, 10, 53.3), p('2026-11-02', 40, 10, 53.3), p('2026-11-11', 25, 10, 33.3)]
const v6 = veraenderung(mitDeload, 'weight', ['2026-11-09'])
pruefe('Deload-Woche: letzter Tag davor zaehlt (40 -> 40, nicht 25)', v6.ende === 40 && v6.diff === 0 && v6.tage === 2, v6)
pruefe('ohne Deload-Wissen: der leichte Tag zaehlt', veraenderung(mitDeload).ende === 25)
pruefe('nur ein Tag ausserhalb der Deload-Woche: null', veraenderung(mitDeload.slice(1), 'weight', ['2026-11-09']) === null)

console.log('[auswertung-test] Rangliste:')
const zeilen = [
  { id: 'a', v: { prozent: 5, diff: 2 } },
  { id: 'b', v: null },
  { id: 'c', v: { prozent: 20, diff: 4 } },
  { id: 'd', v: { prozent: -3, diff: -1 } },
  { id: 'e', v: { prozent: null, diff: 3 } }
]
pruefe('groesste Steigerung zuerst, ohne Prozent dahinter, ohne Veraenderung zuletzt',
  rangliste(zeilen).map(z => z.id).join(',') === 'c,a,d,e,b', rangliste(zeilen).map(z => z.id))
pruefe('Original bleibt unveraendert', zeilen.map(z => z.id).join(',') === 'a,b,c,d,e')

console.log('[auswertung-test] Balken:')
const sk = balkenSkala([20, 5, -10, null])
pruefe('Skala schliesst 0 ein', sk.min === -10 && sk.max === 20, sk)
const bPlus = balken(20, sk)
pruefe('+20 von -10..20: beginnt an der Null-Linie (ein Drittel) und reicht bis 100 %',
  Math.abs(bPlus.links - 100 / 3) < 1e-9 && Math.abs(bPlus.breite - 200 / 3) < 1e-9, bPlus)
const bMinus = balken(-10, sk)
pruefe('-10: von 0 % bis zur Null-Linie', bMinus.links === 0 && Math.abs(bMinus.breite - 100 / 3) < 1e-9, bMinus)
const nurPlus = balkenSkala([10, 5])
pruefe('nur Steigerungen: Null-Linie ganz links', balken(5, nurPlus).links === 0 && balken(10, nurPlus).breite === 100)
pruefe('kein Prozent: kein Balken', balken(null, sk).breite === 0)
pruefe('alles 0: kein Balken, kein Absturz', balken(0, balkenSkala([0, 0])).breite === 0)

console.log('[auswertung-test] Texte:')
pruefe('+12,5 % -> "+13 %"', prozentText(12.5) === '+13 %', prozentText(12.5))
pruefe('-10 % -> "−10 %" (echtes Minus)', prozentText(-10) === '−10 %', prozentText(-10))
pruefe('0 -> "±0 %"', prozentText(0) === '±0 %' && prozentText(0.2) === '±0 %', prozentText(0.2))
pruefe('null -> "–"', prozentText(null) === '–')
pruefe('Differenz kg mit Komma', diffText(2.5, 'kg') === '+2,5 kg' && diffText(-5, 'kg') === '−5 kg', [diffText(2.5, 'kg'), diffText(-5, 'kg')])
pruefe('Differenz Wdh', diffText(3, 'Wdh') === '+3 Wdh')

console.log('[auswertung-test] Gemerkte Einstellungen (pro Geraet):')
const e1 = einstellungenAus(JSON.stringify({ zeitraum: '6m', auswahl: 'w:push', eigene: ['a', 'b'], modus: 'e1rm', freiVon: '2026-05-01', freiBis: '2026-06-01' }))
pruefe('gueltige Werte bleiben', e1.zeitraum === '6m' && e1.auswahl === 'w:push' && e1.eigene.join(',') === 'a,b' && e1.modus === 'e1rm' && e1.freiVon === '2026-05-01')
const e2 = einstellungenAus('kein json')
pruefe('kaputter Text: Standard (3 Monate, Alle, Gewicht)', e2.zeitraum === '3m' && e2.auswahl === 'alle' && e2.modus === 'weight' && e2.eigene.length === 0)
const e3 = einstellungenAus(JSON.stringify({ zeitraum: '7j', modus: 'x', eigene: 'a', auswahl: 5 }))
pruefe('ungueltige Felder einzeln auf Standard', e3.zeitraum === '3m' && e3.modus === 'weight' && e3.eigene.length === 0 && e3.auswahl === 'alle')
pruefe('nichts gespeichert: Standard', einstellungenAus(null).zeitraum === '3m')

if (fehler > 0) {
  console.error(`[auswertung-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[auswertung-test] alles gruen')
}
