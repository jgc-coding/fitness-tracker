// Vertragstest fuer die Werte des Auswahl-Rads (src/utils/radWerte.js,
// genutzt von src/components/shared/WheelPicker.vue).
//
// Der Test ist der Vertrag: Ein Vorwert, der nicht im Raster liegt (22 kg im
// 1,25-kg-Raster, nachdem eine Uebung ein anderes Geraet bekommen hat), wird
// als eigene Position einsortiert — das Rad springt nie still auf den ersten
// Wert (V15, v2.6.0). Werte im Raster und leere Werte aendern nichts.
//
// Aufruf:  node ./scripts/radwerte-test.mjs

import { werteMitVorwert } from '../src/utils/radWerte.js'

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

if (fehler > 0) {
  console.error(`[radwerte-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[radwerte-test] alles gruen')
}
