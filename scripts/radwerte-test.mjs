// Vertragstest fuer die Werte des Auswahl-Rads (src/utils/radWerte.js,
// genutzt von src/components/shared/WheelPicker.vue).
//
// Der Test ist der Vertrag: Ein Vorwert, der nicht im Raster liegt (22 kg im
// 1,25-kg-Raster, nachdem eine Uebung ein anderes Geraet bekommen hat), wird
// als eigene Position einsortiert — das Rad springt nie still auf den ersten
// Wert (V15, v2.6.0). Werte im Raster und leere Werte aendern nichts.
//
// Aufruf:  node ./scripts/radwerte-test.mjs

import { werteMitVorwert, radText, wertAnStelle, stelleFuerWert } from '../src/utils/radWerte.js'
import { seitenRaster } from '../src/utils/gewichtProSeite.js'

let fehler = 0
function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    console.log(`  ok   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`)
  }
}
const gleich = (a, b) => JSON.stringify(a) === JSON.stringify(b)

const raster125 = []
for (let w = 1.25; w <= 30; w += 1.25) raster125.push(Math.round(w * 100) / 100)
const raster1 = Array.from({ length: 30 }, (_, i) => i + 1)

console.log('[radwerte-test] Vorwert im Raster:')
pruefe('22,5 im 1,25-Raster aendert nichts (gleiches Array)', werteMitVorwert(raster125, 22.5) === raster125)
pruefe('20 im 1-kg-Raster aendert nichts', werteMitVorwert(raster1, 20) === raster1)

console.log('[radwerte-test] Vorwert ausserhalb des Rasters wird einsortiert:')
const mit22 = werteMitVorwert(raster125, 22)
pruefe('22 steht zwischen 21,25 und 22,5', mit22[mit22.indexOf(22) - 1] === 21.25 && mit22[mit22.indexOf(22) + 1] === 22.5)
pruefe('genau ein Wert mehr, Original unveraendert', mit22.length === raster125.length + 1 && !raster125.includes(22))
pruefe('Ergebnis bleibt aufsteigend', mit22.every((w, i) => i === 0 || mit22[i - 1] < w))
pruefe('23,25 (22 + Steigerung 1,25) wird ebenfalls einsortiert', werteMitVorwert(raster125, 23.25).includes(23.25))
pruefe('Wert unter dem Raster (0 kg, Koerpergewicht) kommt an den Anfang', werteMitVorwert(raster125, 0)[0] === 0)
pruefe('Wert ueber dem Raster (35 Wdh) kommt ans Ende', werteMitVorwert(raster1, 35).at(-1) === 35)

console.log('[radwerte-test] leere und unsinnige Vorwerte aendern nichts:')
for (const leer of [null, undefined, Number.NaN, Infinity, '22']) {
  pruefe(`${String(leer)} -> Raster unveraendert`, gleich(werteMitVorwert(raster1, leer), raster1))
}

console.log('[radwerte-test] Text im Rad:')
pruefe('ganze Zahl ohne Komma', radText(20, true) === '20')
pruefe('zwei Stellen wie bisher', radText(47.5, true) === '47.50' && radText(23.75, true) === '23.75')
pruefe('drei Stellen nur bei echter dritter Stelle (29,375 pro Seite)', radText(29.375, true) === '29.375')
pruefe('ohne Kommastellen-Rad: Text wie er ist', radText(12, false) === '12' && radText(2.5, false) === '2.5')

console.log('[radwerte-test] Live-Kopplung (Stelle <-> Wert, Kommastellen erlaubt):')
const kurz = [1.25, 2.5, 3.75]
pruefe('ganze Stelle = Wert der Position', wertAnStelle(kurz, 1) === 2.5)
pruefe('halbe Stelle = Mitte zwischen zwei Werten', wertAnStelle(kurz, 0.5) === 1.875)
pruefe('vor dem Anfang und hinter dem Ende geklemmt', wertAnStelle(kurz, -2) === 1.25 && wertAnStelle(kurz, 7) === 3.75)
pruefe('Wert -> Stelle, auch zwischen zwei Positionen', stelleFuerWert(kurz, 2.5) === 1 && stelleFuerWert(kurz, 1.875) === 0.5)
pruefe('Wert ausserhalb -> Rand', stelleFuerWert(kurz, 0) === 0 && stelleFuerWert(kurz, 99) === 2)
const mitZusatz = werteMitVorwert(raster125, 22)
pruefe('mit Zusatzwert: Stelle des Zusatzwerts trifft ihn genau', wertAnStelle(mitZusatz, stelleFuerWert(mitZusatz, 22)) === 22)
pruefe('leere Liste -> null bzw. 0', wertAnStelle([], 1) === null && stelleFuerWert([], 5) === 0)
const seite = seitenRaster(1.25, 300)
const gesamt = []
for (let w = 1.25; w <= 300; w += 1.25) gesamt.push(Math.round(w * 100) / 100)
const gesamtStelle = (s) => stelleFuerWert(gesamt, wertAnStelle(seite, s) * 2)
pruefe('Pro Seite eine Position weiter -> Gesamt zwei Positionen (doppelt so schnell)',
  Math.abs((gesamtStelle(11) - gesamtStelle(10)) - 2) < 1e-9)
pruefe('... auch mitten im Ziehen (Stelle 10,3 -> 10,8)', Math.abs((gesamtStelle(10.8) - gesamtStelle(10.3)) - 1) < 1e-9)
const seitenStelle = (g) => stelleFuerWert(seite, wertAnStelle(gesamt, g) / 2)
pruefe('Gesamt eine Position weiter -> Pro Seite eine halbe (halb so schnell)',
  Math.abs((seitenStelle(47) - seitenStelle(46)) - 0.5) < 1e-9)

if (fehler > 0) {
  console.error(`[radwerte-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[radwerte-test] alles gruen')
}
