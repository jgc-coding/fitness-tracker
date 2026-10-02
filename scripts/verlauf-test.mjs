// Vertragstest fuer den Uebungs-Verlauf (src/utils/verlauf.js, genutzt von
// src/components/tracking/UebungsVerlauf.vue in der Detailansicht).
//
// Der Test ist der Vertrag: je Trainingstag EIN Punkt (der schwerste Satz,
// bei Gleichstand der mit mehr Wdh), Aufwaermsaetze zaehlen nicht, der
// Zeitraum rechnet in Kalendermonaten ohne Sommerzeit-Versatz, Zahlen stehen
// mit deutschem Komma. Das geschaetzte 1RM (Epley) ist je Tag das beste aller
// Saetze; ohne Wdh gibt es keins, statt still das Gewicht zu nehmen.
//
// Aufruf:  node ./scripts/verlauf-test.mjs

import {
  ZEITRAEUME, zeitraumStart, verlaufPunkte, messgroesse, achse, formatZahl, naechsterIndex, monatsMarken,
  einRM, mitEinRM
} from '../src/utils/verlauf.js'

let fehler = 0
function pruefe(beschreibung, bedingung, ist) {
  if (bedingung) {
    console.log(`  ok   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}${ist !== undefined ? '  (ist: ' + JSON.stringify(ist) + ')' : ''}`)
  }
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)

console.log('[verlauf-test] Zeitraeume:')
pruefe('vier Zeitraeume, 3 Monate zuerst (Standard)', gleich(ZEITRAEUME.map(z => z.key), ['3m', '6m', '12m', 'alle']))
pruefe('3 Monate vor dem 30.09.2026 = 30.06.2026', zeitraumStart('2026-09-30', 3) === '2026-06-30', zeitraumStart('2026-09-30', 3))
pruefe('12 Monate vor dem 01.10.2026 = 01.10.2025', zeitraumStart('2026-10-01', 12) === '2025-10-01')
pruefe('3 Monate vor dem 31.05. = 28.02. (kuerzerer Monat, kein Ueberlauf)', zeitraumStart('2026-05-31', 3) === '2026-02-28', zeitraumStart('2026-05-31', 3))
pruefe('Schaltjahr: 3 Monate vor dem 31.05.2028 = 29.02.2028', zeitraumStart('2028-05-31', 3) === '2028-02-29')
pruefe('6 Monate vor dem 15.03. = 15.09. des Vorjahres', zeitraumStart('2026-03-15', 6) === '2025-09-15')
pruefe('Sommerzeit-Wechsel (29.03.) verschiebt keinen Tag', zeitraumStart('2026-04-29', 1) === '2026-03-29')
pruefe('"Alle" hat keinen Start', zeitraumStart('2026-09-30', null) === null)

const s = (date, weight, reps, extra = {}) => ({ date, weight, reps, setNumber: 1, ...extra })

console.log('[verlauf-test] Punkte je Trainingstag:')
const mehrereSaetze = verlaufPunkte([
  s('2026-09-25', 45, 8, { setNumber: 1 }),
  s('2026-09-25', 47.5, 6, { setNumber: 2 }),
  s('2026-09-25', 47.5, 7, { setNumber: 3 }),
  s('2026-09-10', 45, 12)
])
pruefe('zwei Tage -> zwei Punkte, aelteste zuerst', gleich(mehrereSaetze.map(p => p.date), ['2026-09-10', '2026-09-25']))
pruefe('schwerster Satz des Tages, bei Gleichstand mehr Wdh (47,5 x 7)',
  mehrereSaetze[1].weight === 47.5 && mehrereSaetze[1].reps === 7, mehrereSaetze[1])
pruefe('alle Saetze des Tages bleiben dabei, nach Satznummer',
  gleich(mehrereSaetze[1].saetze.map(x => x.setNumber), [1, 2, 3]))

const mitAufwaermen = verlaufPunkte([s('2026-09-30', 60, 10, { isWarmup: true }), s('2026-09-30', 90, 15)])
pruefe('Aufwaermsatz zaehlt nicht (auch nicht als schwerster)', mitAufwaermen.length === 1 && mitAufwaermen[0].weight === 90 && mitAufwaermen[0].saetze.length === 1)
pruefe('nur Aufwaermsaetze an einem Tag -> kein Punkt', verlaufPunkte([s('2026-09-30', 60, 10, { isWarmup: true })]).length === 0)
pruefe('Satz ohne gueltiges Gewicht wird ignoriert, nicht als 0 gezaehlt',
  verlaufPunkte([s('2026-09-30', null, 10), s('2026-09-30', 'abc', 10), s('2026-09-29', 20, 10)]).length === 1)
pruefe('Wdh fehlt -> reps null, Punkt bleibt', verlaufPunkte([s('2026-09-30', 50, null)])[0].reps === null)

const zeitraum = verlaufPunkte([s('2026-06-29', 40, 8), s('2026-06-30', 41, 8), s('2026-09-30', 50, 8), s('2026-10-02', 60, 8)], '2026-06-30', '2026-09-30')
pruefe('Zeitraum schliesst Start- und Endtag ein, sonst nichts', gleich(zeitraum.map(p => p.date), ['2026-06-30', '2026-09-30']), zeitraum.map(p => p.date))
pruefe('leere Eingabe -> leere Liste', gleich(verlaufPunkte([]), []) && gleich(verlaufPunkte(null), []))

console.log('[verlauf-test] Messgroesse:')
pruefe('Gewicht, sobald ein Punkt Gewicht traegt', messgroesse([{ weight: 0, reps: 8 }, { weight: 5, reps: 8 }]) === 'weight')
pruefe('nur 0 kg (Koerpergewicht) -> Wdh', messgroesse([{ weight: 0, reps: 8 }, { weight: 0, reps: 10 }]) === 'reps')
pruefe('nur 0 kg ohne Wdh -> Gewicht (nichts zu zeigen ausser 0)', messgroesse([{ weight: 0, reps: null }]) === 'weight')

console.log('[verlauf-test] Geschaetztes 1RM (Epley):')
const nahe = (a, b) => typeof a === 'number' && Math.abs(a - b) < 0.01
pruefe('47,5 kg x 9 -> 61,75 (Gewicht x (1 + Wdh/30))', nahe(einRM(47.5, 9), 61.75), einRM(47.5, 9))
pruefe('100 kg x 10 -> 133,33', nahe(einRM(100, 10), 133.33), einRM(100, 10))
pruefe('1 Wdh -> das Gewicht selbst', einRM(100, 1) === 100, einRM(100, 1))
pruefe('Wdh als Text "8" zaehlt wie 8', nahe(einRM(60, '8'), 76), einRM(60, '8'))
pruefe('ohne Wdh -> kein 1RM (null), nicht das Gewicht', einRM(100, null) === null && einRM(100, undefined) === null, einRM(100, null))
pruefe('0 Wdh -> kein 1RM', einRM(100, 0) === null, einRM(100, 0))
pruefe('ohne Gewicht -> kein 1RM', einRM(null, 8) === null && einRM('abc', 8) === null)
pruefe('0 kg -> 0 (Koerpergewicht, kein Fehler)', einRM(0, 10) === 0, einRM(0, 10))

const besterSatz = verlaufPunkte([
  s('2026-09-25', 50, 5, { setNumber: 1 }),
  s('2026-09-25', 45, 10, { setNumber: 2 })
])[0]
pruefe('1RM des Tages = bester Satz (45 x 10 = 60), auch wenn 50 x 5 der schwerste ist',
  besterSatz.weight === 50 && nahe(besterSatz.e1rm, 60), besterSatz)
const e1rmAufwaermen = verlaufPunkte([s('2026-09-30', 60, 10, { isWarmup: true }), s('2026-09-30', 50, 5)])[0]
pruefe('Aufwaermsatz zaehlt auch beim 1RM nicht', nahe(e1rmAufwaermen.e1rm, 58.33), e1rmAufwaermen.e1rm)
pruefe('Tag ohne Wdh -> e1rm null', verlaufPunkte([s('2026-09-30', 50, null)])[0].e1rm === null)
pruefe('ein Satz ohne Wdh, einer mit -> 1RM aus dem mit Wdh',
  nahe(verlaufPunkte([s('2026-09-30', 70, null), s('2026-09-30', 60, 6, { setNumber: 2 })])[0].e1rm, 72))

pruefe('1RM-Linie bei Gewichts-Uebungen', mitEinRM([{ weight: 40, reps: 10, e1rm: 53.3 }]) === true)
pruefe('keine 1RM-Linie bei Koerpergewicht (Diagramm zeigt Wdh)',
  mitEinRM([{ weight: 0, reps: 8, e1rm: 0 }, { weight: 0, reps: 10, e1rm: 0 }]) === false)
pruefe('keine 1RM-Linie, wenn nirgends Wdh stehen', mitEinRM([{ weight: 40, reps: null, e1rm: null }]) === false)
pruefe('keine Punkte -> keine 1RM-Linie', mitEinRM([]) === false)

console.log('[verlauf-test] Achse:')
const a1 = achse([85, 97.5])
pruefe('85-97,5 -> runde Teilstriche, die beide Werte einschliessen',
  a1.min <= 85 && a1.max >= 97.5 && a1.ticks.length >= 3 && a1.ticks.length <= 6, a1)
pruefe('Teilstriche sind runde Schritte (1, 2, 2,5 oder 5 mal Zehnerpotenz)',
  [1, 2, 2.5, 5].some(f => [0.1, 1, 10, 100].some(z => Math.abs(a1.schritt - f * z) < 1e-9)), a1.schritt)
const a2 = achse([50, 50])
pruefe('ein einziger Wert -> Achse mit Spielraum darum', a2.min < 50 && a2.max > 50, a2)
const a3 = achse([0, 0])
pruefe('nur 0 -> Achse beginnt bei 0, nie negativ', a3.min === 0 && a3.max > 0, a3)
const a4 = achse([2.5, 180])
pruefe('grosse Spanne (2,5-180) bleibt bei hoechstens 6 Teilstrichen', a4.ticks.length <= 6 && a4.min <= 2.5 && a4.max >= 180, a4)
pruefe('keine Werte -> Standardachse ohne Absturz', achse([]).ticks.length >= 2)

console.log('[verlauf-test] Zahlen mit deutschem Komma:')
pruefe('97.5 -> "97,5"', formatZahl(97.5) === '97,5', formatZahl(97.5))
pruefe('52.25 -> "52,25"', formatZahl(52.25) === '52,25')
pruefe('90 -> "90" (keine Nachkommastelle)', formatZahl(90) === '90')
pruefe('1250 -> "1250" (ohne Tausenderpunkt, wie im Rad)', formatZahl(1250) === '1250', formatZahl(1250))

console.log('[verlauf-test] Naechster Punkt beim Tippen:')
pruefe('genau auf einem Punkt', naechsterIndex([10, 50, 90], 50) === 1)
pruefe('dazwischen gewinnt der naehere', naechsterIndex([10, 50, 90], 75) === 2 && naechsterIndex([10, 50, 90], 25) === 0)
pruefe('links und rechts ausserhalb -> Rand', naechsterIndex([10, 50, 90], -40) === 0 && naechsterIndex([10, 50, 90], 400) === 2)
pruefe('ohne Punkte -> -1', naechsterIndex([], 10) === -1)

console.log('[verlauf-test] Monatsmarken der Zeitachse:')
const m3 = monatsMarken('2026-06-30', '2026-09-30')
pruefe('3 Monate: Jul, Aug, Sep am Monatsersten', gleich(m3, [
  { date: '2026-07-01', label: 'Jul' }, { date: '2026-08-01', label: 'Aug' }, { date: '2026-09-01', label: 'Sep' }
]), m3)
pruefe('Start am Monatsersten zaehlt mit', monatsMarken('2026-07-01', '2026-08-15')[0]?.date === '2026-07-01')
const m12 = monatsMarken('2025-10-01', '2026-10-01')
pruefe('12 Monate: hoechstens 6 Marken', m12.length <= 6 && m12.length >= 4, m12.map(m => m.label))
const mLang = monatsMarken('2024-03-15', '2026-10-01')
pruefe('ueber ein Jahr: hoechstens 6 Marken, mit Jahreszahl', mLang.length <= 6 && mLang.every(m => /\d\d$/.test(m.label)), mLang.map(m => m.label))
pruefe('Zeitraum ohne Monatswechsel -> keine Marke', monatsMarken('2026-09-02', '2026-09-30').length === 0)

console.log(fehler ? `\n[verlauf-test] ${fehler} FEHLER` : '\n[verlauf-test] alles gruen')
process.exitCode = fehler ? 1 : 0
