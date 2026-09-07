#!/usr/bin/env node
/*
 * Bericht zum Puls-zu-Tempo-Modell aus der eigenen Laufhistorie.
 *
 * Aufruf (Windows PowerShell):
 *   node .\scripts\pace-modell.mjs --datei .\privat\garmin-historie-gab.csv
 *   node .\scripts\pace-modell.mjs --datei .\privat\garmin-historie-lisa.csv --monate 14
 *
 * WOZU: Ein Trainingsplan sagt "locker" oder "zuegig". Das hilft am Berg nicht
 * weiter. Dieses Skript zeigt, welches Tempo bei welchem Puls tatsaechlich
 * herauskommt — die Grundlage fuer die Vorgaben im Plan.
 *
 * Gerechnet wird in scripts/lib/pace-modell-kern.mjs; dasselbe Modul traegt die
 * Zahlen ueber scripts/laufplan-vorgaben.mjs in den Plan ein. Hier steht nur die
 * Darstellung. Ausgabe bewusst ohne Umlaute und Sonderzeichen (Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { ladeLaeufe, schaetzeModell, mmss, tagAbstand } from './lib/pace-modell-kern.mjs'

function arg(name, standard = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : standard
}

function abbruch(satz) {
  console.error(`\n[pace-modell] ${satz}\n`)
  process.exit(1)
}

const datei = arg('datei')
if (!datei) abbruch('Bitte --datei <pfad zur Garmin-CSV> angeben.')
if (!fs.existsSync(datei)) abbruch(`Datei nicht gefunden: ${path.resolve(datei)}`)

const monate = Number(arg('monate', '18'))
const halbwertszeitTage = Number(arg('halbwertszeit', '180'))
if (!Number.isFinite(monate) || monate <= 0) abbruch('--monate muss eine Zahl groesser 0 sein.')
if (!Number.isFinite(halbwertszeitTage) || halbwertszeitTage <= 0) abbruch('--halbwertszeit muss eine Zahl groesser 0 sein.')

let laeufe
let verworfen
let modell
try {
  ;({ laeufe, verworfen } = ladeLaeufe(datei))
  modell = schaetzeModell(laeufe, { monate, halbwertszeitTage })
} catch (err) {
  abbruch(err.message)
}

const k = modell.kennzahlen
const { a0, bHf, bHm, bStd } = modell.koeffizienten
const refHm = Math.round(k.hmMedian * 10) / 10
const tageSeitLetztem = tagAbstand(k.letzterTag, new Date().toISOString().slice(0, 10))
const vz = (x) => (x >= 0 ? '+' : '-')

console.log(`\n[pace-modell] ${path.basename(datei)}`)
console.log(`  Laeufe gesamt:   ${k.gesamt} (${k.erstesDatum} bis ${k.letzterTag}), ${verworfen} unbrauchbar aussortiert`)
console.log(`  Im Modell:       ${k.imModell} Laeufe ab ${k.grenze} (letzte ${k.monate} Monate)`)
console.log(`  Halbwertszeit:   ${k.halbwertszeitTage} Tage — ein Lauf von damals zaehlt halb so viel wie einer von heute`)
console.log(`  Gelaende Median: ${refHm} Hoehenmeter je km`)
console.log(`  Puls belegt von: ${k.hfBelegtVon} bis ${k.hfBelegtBis} (5- und 95-Prozent-Punkt)`)
console.log(`  Hoechstpuls:     ${k.maxHfBeobachtet ?? '?'} gemessen, ${k.maxHfRobust ?? '?'} robust (5 Prozent der hoechsten weggelassen)`)

console.log(`\n  Modell: Tempo = ${mmss(a0)} ${vz(bHf)} ${Math.abs(bHf).toFixed(2)} s je Pulsschlag ` +
  `${vz(bHm)} ${Math.abs(bHm).toFixed(2)} s je Hoehenmeter/km ${vz(bStd)} ${Math.abs(bStd).toFixed(1)} s je Stunde Dauer`)
console.log(`  Guete: erklaert ${(k.r2 * 100).toFixed(0)} Prozent der Tempo-Unterschiede, typische Abweichung ${Math.round(k.streuung)} s je km`)

if (modell.ausreisser.length) {
  console.log(`\n  ${modell.ausreisser.length} Lauf/Laeufe als Ausreisser aussortiert:`)
  for (const l of modell.ausreisser) {
    console.log(`    ${l.datum}  ${l.km.toFixed(1)} km  ${mmss(l.pace)}/km  Puls ${l.hf}  ${l.hmProKm.toFixed(1)} Hm/km`)
  }
  console.log('    Bitte kurz ansehen: meist GPS-Sprung, verrutschter Pulsgurt oder eine falsch eingeordnete Aktivitaet.')
}

console.log(`\n  Formkorrektur: die letzten ${k.formLaeufe} Laeufe (ab ${k.formAb}) liegen im Mittel ` +
  `${vz(k.formOffset)}${Math.abs(Math.round(k.formOffset))} s je km ${k.formOffset >= 0 ? 'LANGSAMER' : 'SCHNELLER'} als das Modell.`)
console.log(`  Letzter Lauf war vor ${tageSeitLetztem} Tagen.` +
  (tageSeitLetztem > 21 ? ' ACHTUNG: lange Pause — die Tabelle beschreibt eine Form, die gerade nicht da ist.' : ''))

console.log(`\n  Vorhergesagtes Tempo bei ${refHm} Hm/km:`)
console.log('  Puls | 1 h Lauf | 2 h Lauf | 3 h Lauf | Beleg')
for (let hf = 110; hf <= 175; hf += 5) {
  const belegt = hf >= k.hfBelegtVon && hf <= k.hfBelegtBis
  const anzahl = modell.behalten.filter(l => Math.abs(l.hf - hf) <= 2).length
  console.log(
    `  ${String(hf).padStart(4)} | ${mmss(modell.vorhersage(hf, refHm, 1)).padStart(8)} | ${mmss(modell.vorhersage(hf, refHm, 2)).padStart(8)} | ` +
    `${mmss(modell.vorhersage(hf, refHm, 3)).padStart(8)} | ${belegt ? `${anzahl} Laeufe` : 'HOCHGERECHNET, nicht belegt'}`
  )
}

console.log(`\n  Gelaende-Zuschlag: je 5 Hoehenmeter mehr je km rund ${Math.round(bHm * 5)} s je km langsamer.`)

console.log('\n  Gegenprobe an den Rohdaten (ohne Modell, Mittel je Pulsband):')
console.log('  Pulsband | Laeufe | Tempo Mittel | schnellster | langsamster | Hm/km')
for (const [von, bis] of [[100, 120], [120, 130], [130, 140], [140, 150], [150, 160], [160, 210]]) {
  const arr = modell.behalten.filter(l => l.hf >= von && l.hf < bis)
  if (!arr.length) { console.log(`  ${String(von + '-' + bis).padStart(8)} |      0 |            - |           - |           - |     -`); continue }
  const paces = arr.map(l => l.pace).sort((x, y) => x - y)
  const schnitt = arr.reduce((s, l) => s + l.sek, 0) / arr.reduce((s, l) => s + l.km, 0)
  const hm = arr.reduce((s, l) => s + l.hmProKm, 0) / arr.length
  console.log(
    `  ${String(von + '-' + bis).padStart(8)} | ${String(arr.length).padStart(6)} | ${mmss(schnitt).padStart(12)} | ` +
    `${mmss(paces[0]).padStart(11)} | ${mmss(paces[paces.length - 1]).padStart(11)} | ${hm.toFixed(1)}`
  )
}

console.log('\n  Letzte acht Laeufe:')
for (const l of modell.behalten.slice(-8)) {
  const soll = modell.vorhersage(l.hf, l.hmProKm, l.stunden)
  const rest = l.pace - soll
  console.log(
    `  ${l.datum}  ${l.km.toFixed(1).padStart(5)} km  ${mmss(l.pace)}/km  Puls ${l.hf}  ` +
    `${l.hmProKm.toFixed(1).padStart(5)} Hm/km  Modell ${mmss(soll)} (${vz(rest)}${Math.abs(Math.round(rest))} s)`
  )
}
console.log('')
