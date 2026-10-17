// Vertragstest fuer das Gewicht pro Seite (src/utils/gewichtProSeite.js,
// genutzt vom Rad im Tracking und von scripts/gewicht-pro-seite-umrechnen.mjs).
//
// Der Test ist der Vertrag (Gabriel 17.10.2026): Bei Langhantel und bei
// Scheiben-Maschinen mit zwei Seiten zeigt das Rad links "Pro Seite", in der
// Mitte "Gesamt". Gesamt ist die Summe der Scheiben OHNE Stange, pro Seite
// also genau die Haelfte. Gespeichert wird nur das Gesamt. Die einmalige
// Umrechnung verdoppelt alte Eintraege einer Person, die pro Seite notiert
// hat — nie zweimal, nie nach dem Stichtag, nie ausgenommene Saetze.
//
// Aufruf:  node ./scripts/gewicht-pro-seite-test.mjs

import {
  hatZweiSeiten,
  proSeite,
  gesamtAusSeite,
  seitenRaster,
  umrechnungPlan
} from '../src/utils/gewichtProSeite.js'

let fehler = 0
function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    console.log(`  ok   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`)
  }
}

console.log('[gewicht-pro-seite-test] Welche Uebungen haben zwei Seiten:')
pruefe('Langhantel immer', hatZweiSeiten({ equipment: 'barbell' }))
pruefe('Maschine mit proSeite: true', hatZweiSeiten({ equipment: 'machine_weight', proSeite: true }))
pruefe('Maschine ohne Merker nicht', !hatZweiSeiten({ equipment: 'machine_weight' }))
pruefe('Kurzhantel nicht', !hatZweiSeiten({ equipment: 'dumbbell' }))
pruefe('Merker als Text "true" zaehlt nicht (nur echtes true)', !hatZweiSeiten({ equipment: 'machine_weight', proSeite: 'true' }))
pruefe('ohne Uebung nicht', !hatZweiSeiten(null) && !hatZweiSeiten(undefined))

console.log('[gewicht-pro-seite-test] Gesamt und pro Seite:')
pruefe('10 kg gesamt = 5 pro Seite', proSeite(10) === 5)
pruefe('58,75 gesamt = 29,375 pro Seite (ungerades Gesamt bleibt exakt)', proSeite(58.75) === 29.375)
pruefe('3,75 pro Seite = 7,5 gesamt', gesamtAusSeite(3.75) === 7.5)
pruefe('0 bleibt 0', proSeite(0) === 0 && gesamtAusSeite(0) === 0)
let hinUndZurueck = true
for (let w = 1.25; w <= 300; w += 1.25) {
  const g = Math.round(w * 100) / 100
  if (gesamtAusSeite(proSeite(g)) !== g) hinUndZurueck = false
}
pruefe('jedes Gesamt im 1,25-Raster bis 300 uebersteht hin und zurueck', hinUndZurueck)
pruefe('leere Werte -> null', proSeite(null) === null && proSeite(Number.NaN) === null && gesamtAusSeite(undefined) === null)

console.log('[gewicht-pro-seite-test] Raster des Pro-Seite-Rads:')
const r125 = seitenRaster(1.25, 300)
pruefe('1,25er Schritt: von 1,25 bis 150', r125[0] === 1.25 && r125.at(-1) === 150)
pruefe('1,25er Schritt: echte Scheibenschritte ohne Rundungsreste', r125.includes(23.75) && r125.every(w => Math.round(w * 100) / 100 === w))
const r1 = seitenRaster(1, 300)
pruefe('1-kg-Schritt: 1 bis 150', r1[0] === 1 && r1.at(-1) === 150 && r1.length === 150)

console.log('[gewicht-pro-seite-test] Umrechnung alter Eintraege:')
const uebungen = [
  { id: 'bank', equipment: 'barbell' },
  { id: 'brust', equipment: 'machine_weight', proSeite: true },
  { id: 'kurz', equipment: 'dumbbell' },
  { id: 'bein', equipment: 'machine_weight' }
]
const s = (id, userId, exerciseId, date, weight, extra = {}) => ({ id, userId, exerciseId, date, weight, reps: 8, ...extra })
const saetze = [
  s('a', 'user1', 'bank', '2026-09-05', 5),
  s('b', 'user1', 'brust', '2026-09-13', 10),
  s('c', 'user1', 'kurz', '2026-09-13', 12),
  s('d', 'user1', 'bein', '2026-09-13', 40),
  s('e', 'user2', 'bank', '2026-09-05', 55),
  s('f', 'user1', 'bank', '2026-04-08', 40),
  s('g', 'user1', 'bank', '2026-10-03', 6.25, { gewichtVorUmrechnung: 3.125 }),
  s('h', 'user1', 'bank', '2026-10-18', 5),
  s('i', 'user1', 'bank', '2026-10-10', 3.75)
]
const plan = umrechnungPlan(saetze, uebungen, 'user1', { bis: '2026-10-16', ohne: ['f'] })
const ids = (liste) => liste.map(x => x.id).sort().join(',')
pruefe('verdoppelt nur Saetze dieser Person an Uebungen mit zwei Seiten', ids(plan.aendern) === 'a,b,i')
pruefe('5 -> 10 und der alte Wert steht im Merker', plan.aendern.find(x => x.id === 'a').nachher === 10 && plan.aendern.find(x => x.id === 'a').vorher === 5)
pruefe('Maschine mit Merker: 10 -> 20', plan.aendern.find(x => x.id === 'b').nachher === 20)
pruefe('3,75 -> 7,5', plan.aendern.find(x => x.id === 'i').nachher === 7.5)
pruefe('schon umgerechnet (Merker gesetzt) -> erledigt, nie doppelt', ids(plan.erledigt) === 'g')
pruefe('ausgenommener Satz bleibt unangetastet', ids(plan.ausgenommen) === 'f')
pruefe('nach dem Stichtag bleibt unangetastet', ids(plan.nachStichtag) === 'h')
pruefe('andere Personen, Kurzhantel und Maschinen ohne Merker kommen nicht vor',
  ![...plan.aendern, ...plan.erledigt, ...plan.ausgenommen, ...plan.nachStichtag].some(x => ['c', 'd', 'e'].includes(x.id)))
pruefe('sauberer Plan meldet keine Gruende', plan.gruende.length === 0)

const kaputt = umrechnungPlan([s('k', 'user1', 'bank', '2026-09-05', 'fuenf'), s('m', 'user1', 'bank', '', 5)], uebungen, 'user1', { bis: '2026-10-16' })
pruefe('Gewicht ohne Zahl -> Grund statt still raten', kaputt.gruende.some(g => g.startsWith('Satz k ')))
pruefe('Satz ohne Datum -> Grund statt still raten', kaputt.gruende.some(g => g.startsWith('Satz m ')))
pruefe('... und beide werden nicht geaendert', kaputt.aendern.length === 0)

let ohneStichtag = false
try { umrechnungPlan(saetze, uebungen, 'user1', {}) } catch { ohneStichtag = true }
pruefe('ohne Stichtag verweigert die Regel (sonst verdoppelte ein zweiter Lauf neue Gesamtwerte)', ohneStichtag)

if (fehler > 0) {
  console.error(`[gewicht-pro-seite-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[gewicht-pro-seite-test] alles gruen')
}
