// Vertragstest fuers Namens-Matching und das Bild-Manifest der Uebungszeichnungen
// (src/utils/uebungsBilder.js, src/data/uebungskatalog.json).
//
// Der Test ist der Vertrag: alle 32 Katalognamen (31 aus der Plan-Tabelle in
// docs/plan-fittrack-v2.md plus "Chin Up", Nachtrag 22.09.2026) muessen ihren
// Key treffen, Fantasienamen duerfen nichts treffen, und jede im Manifest
// genannte Datei muss unter public/ liegen. Seit 22.09.2026 sind die Keys die
// Slugs der Workout-Guide-Sammlung (Zeichnungen, CC BY-SA 4.0). Wer
// Matching-Regeln oder das Manifest aendert, erweitert ZUERST diesen Test.
//
// Aufruf:  node ./scripts/uebungsbilder-matching-test.mjs

import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalisiereName,
  findeKatalogEintrag,
  findeImageKey,
  eintragFuerKey,
  bildUrl,
  vorschauUrl
} from '../src/utils/uebungsBilder.js'

const projektWurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const katalog = JSON.parse(
  readFileSync(path.join(projektWurzel, 'src', 'data', 'uebungskatalog.json'), 'utf-8')
)

let fehler = 0

function pruefe(beschreibung, bedingung) {
  if (bedingung) {
    console.log(`  OK   ${beschreibung}`)
  } else {
    fehler++
    console.error(`  FEHL ${beschreibung}`)
  }
}

// Die 32 Katalognamen -> erwarteter Key. Namen stehen hier EXAKT wie im
// Uebungskatalog der App (SettingsView DEFAULT_EXERCISES), inklusive
// Anfuehrungszeichen, Doppelpunkten und Gross-/Kleinschreibung.
// Bewusst geteilte Zeichnungen: die beiden Brustpressen-Maschinen und die
// beiden Ruder-Uebungen (die Sammlung hat je nur ein passendes Motiv).
const ERWARTET = [
  ['Hack Squat', 'hack-squat'],
  ['Leg Press', 'leg-press'],
  ['Leg curl', 'lying-leg-curl'],
  ['hip thrusts', 'hip-thrust'],
  ['"bad girl"', 'hip-abduction-machine'],
  ['"good girl"', 'hip-adduction-machine'],
  ['seated leg curl', 'seated-leg-curl'],
  ['seated leg extension', 'leg-extension'],
  ['calve raises', 'standing-calf-raise'],
  ['lunges', 'reverse-lunge'],
  ['DB Bench press', 'dumbbell-bench-press'],
  ['DB incline Bench press', 'incline-dumbbell-press'],
  ['machine: chest press', 'machine-chest-press'],
  ['machine: incline chest press', 'machine-chest-press'],
  ['Cable Crossover', 'cable-fly'],
  ['BB Bench press', 'bench-press'],
  ['BB incline Bench press', 'incline-bench-press'],
  ['weighted pull up', 'weighted-pull-up'],
  ['Chin Up', 'chin-up'],
  ['Latzug', 'lat-pulldown'],
  ['chest supported row', 'chest-supported-row'],
  ['low row', 'seated-row'],
  ['cable row (without chest support)', 'seated-row'],
  ['lower back', 'back-extension'],
  ['shoulder press', 'machine-shoulder-press'],
  ['BB overhead press', 'overhead-press'],
  ['DB Side lateral', 'lateral-raise'],
  ['Standing Concentration Curl', 'concentration-curl'],
  ['Cable Bicep Curl', 'cable-curl'],
  ['Cable Rope Triceps Pushdown', 'rope-tricep-pushdown'],
  ['Cable Overhead Triceps Extension', 'overhead-tricep-extension'],
  ['core', 'plank']
]

console.log('[matching-test] 32 Katalognamen muessen ihren Key treffen:')
pruefe(`Vertrag umfasst 32 Namen (ist: ${ERWARTET.length})`, ERWARTET.length === 32)
for (const [name, key] of ERWARTET) {
  const treffer = findeImageKey(katalog, name)
  pruefe(`"${name}" -> ${key}`, treffer === key)
}

console.log('[matching-test] Fantasienamen duerfen nichts treffen:')
for (const fantasie of ['Kniebeuge auf dem Mond', 'Flying Unicorn Press', 'quantum: crunch deluxe']) {
  pruefe(`"${fantasie}" -> null`, findeImageKey(katalog, fantasie) === null)
}

console.log('[matching-test] Randfaelle der Normalisierung:')
pruefe('Mehrfach-Leerzeichen geglaettet ("DB   Bench    press")',
  findeImageKey(katalog, 'DB   Bench    press') === 'dumbbell-bench-press')
pruefe('typografische Anfuehrungszeichen entfernt ("„bad girl“")',
  findeImageKey(katalog, '„bad girl“') === 'hip-abduction-machine')
pruefe('normalisiereName entfernt Doppelpunkte und trimmt',
  normalisiereName('  Machine:  Chest Press ') === 'machine chest press')
pruefe('leerer Name trifft nichts', findeKatalogEintrag(katalog, '') === null)
pruefe('null trifft nichts', findeKatalogEintrag(katalog, null) === null)
pruefe('deutscher Alias mit Umlaut ("Unterer Rücken") trifft die Rueckenstrecker-Zeichnung',
  findeImageKey(katalog, 'Unterer Rücken') === 'back-extension')
pruefe('deutscher Alias in ae/oe/ue-Schreibweise ("Unterer Ruecken") trifft ebenfalls',
  findeImageKey(katalog, 'Unterer Ruecken') === 'back-extension')
pruefe('Bindestrich-Schreibweise ("chin-up") trifft den Chin-Up-Eintrag',
  findeImageKey(katalog, 'Chin-up') === 'chin-up')

console.log('[matching-test] Manifest-Zugriff und Pfad-Aufloesung:')
const latzug = eintragFuerKey(katalog, 'lat-pulldown')
const plank = eintragFuerKey(katalog, 'plank')
pruefe('eintragFuerKey findet hack-squat', eintragFuerKey(katalog, 'hack-squat')?.name === 'Hack Squat')
pruefe('eintragFuerKey mit unbekanntem Key -> null', eintragFuerKey(katalog, 'Gibt_Es_Nicht') === null)
pruefe('alte Foto-Keys (vor 22.09.2026) sind verwaist -> null',
  eintragFuerKey(katalog, 'Hack_Squat') === null && eintragFuerKey(katalog, 'Wide-Grip_Lat_Pulldown') === null)
pruefe('bildUrl haengt Bild 0 an die Base an',
  bildUrl(latzug, 0, '/fitness-tracker/') === '/fitness-tracker/uebungsbilder/lat-pulldown/frame-1.svg')
pruefe('bildUrl ergaenzt fehlenden Slash der Base (Bild 1)',
  bildUrl(latzug, 1, '/fitness-tracker') === '/fitness-tracker/uebungsbilder/lat-pulldown/frame-3.svg')
pruefe('bildUrl ausserhalb der Bildliste -> null', bildUrl(latzug, 5, '/') === null)
pruefe('bildUrl ohne Eintrag -> null', bildUrl(null, 0, '/') === null)
pruefe('vorschauUrl zeigt auf das Vorschaubild',
  vorschauUrl(plank, '/fitness-tracker/') === '/fitness-tracker/uebungsbilder/plank/vorschau.webp')
pruefe('vorschauUrl ohne Eintrag -> null', vorschauUrl(null, '/') === null)

console.log('[matching-test] Manifest-Vertrag (Schluessel, Pfade, Dateien, Muskeln):')
const keys = katalog.map(e => e.key)
pruefe(`30 Eintraege (ist: ${katalog.length})`, katalog.length === 30)
pruefe('Keys sind eindeutig', new Set(keys).size === keys.length)

const aliasBesitzer = new Map()
let aliasDoppelt = []
for (const e of katalog) {
  for (const a of e.aliasse || []) {
    const n = normalisiereName(a)
    if (aliasBesitzer.has(n) && aliasBesitzer.get(n) !== e.key) aliasDoppelt.push(n)
    aliasBesitzer.set(n, e.key)
  }
}
pruefe(`kein Alias zeigt auf zwei Eintraege${aliasDoppelt.length ? ' (doppelt: ' + aliasDoppelt.join(', ') + ')' : ''}`,
  aliasDoppelt.length === 0)

// Die 18 Muskel-Ids der MuscleMap stehen als data-muscle in der Komponente
const mapQuelle = readFileSync(path.join(projektWurzel, 'src', 'components', 'shared', 'MuscleMap.vue'), 'utf-8')
const muskelIds = new Set([...mapQuelle.matchAll(/data-muscle="([a-z_]+)"/g)].map(m => m[1]))

for (const e of katalog) {
  const bilder = Array.isArray(e.bilder) ? e.bilder : []
  const pfadMuster = new RegExp(`^uebungsbilder/${e.key}/frame-[1-3]\\.svg$`)
  const pfadeOk = bilder.length >= 1 && bilder.length <= 2 && bilder.every(p => pfadMuster.test(p))
  const vorschauOk = e.vorschau === `uebungsbilder/${e.key}/vorschau.webp`
  const fehlend = [...bilder, e.vorschau].filter(p => !p || !existsSync(path.join(projektWurzel, 'public', p)))
  const muskeln = [...(e.primaer || []), ...(e.sekundaer || [])]
  const unbekannt = muskeln.filter(m => !muskelIds.has(m))
  pruefe(`${e.key}: 1-2 Bilder mit korrektem Pfad, Vorschau-Pfad, Dateien vorhanden, Muskeln bekannt` +
    (fehlend.length ? ` (fehlt: ${fehlend.join(', ')})` : '') +
    (unbekannt.length ? ` (unbekannte Muskeln: ${unbekannt.join(', ')})` : ''),
    pfadeOk && vorschauOk && fehlend.length === 0 && (e.primaer || []).length > 0 && unbekannt.length === 0)
}

if (fehler > 0) {
  console.error(`[matching-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[matching-test] alles gruen')
}
