// Vertragstest fuers Namens-Matching der Uebungsbilder (src/utils/uebungsBilder.js).
//
// Der Test ist der Vertrag: alle 32 Katalognamen (31 aus der Plan-Tabelle in
// docs/plan-fittrack-v2.md, Abschnitt "Bild-Zuordnung", plus "Chin Up" als
// Nachtrag vom 22.09.2026) muessen ihren Key treffen, Fantasienamen duerfen
// nichts treffen. Wer Matching-Regeln aendert, erweitert ZUERST diesen Test.
//
// Aufruf:  node ./scripts/uebungsbilder-matching-test.mjs

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normalisiereName,
  findeKatalogEintrag,
  findeImageKey,
  eintragFuerKey,
  bildPfad
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

// Die 32 Katalognamen -> erwarteter Key. Namen stehen hier
// EXAKT wie im Uebungskatalog der App (SettingsView DEFAULT_EXERCISES),
// inklusive Anfuehrungszeichen, Doppelpunkten und Gross-/Kleinschreibung.
const ERWARTET = [
  ['Hack Squat', 'Hack_Squat'],
  ['Leg Press', 'Leg_Press'],
  ['Leg curl', 'Lying_Leg_Curls'],
  ['hip thrusts', 'Barbell_Hip_Thrust'],
  ['"bad girl"', 'Thigh_Abductor'],
  ['"good girl"', 'Thigh_Adductor'],
  ['seated leg curl', 'Seated_Leg_Curl'],
  ['seated leg extension', 'Leg_Extensions'],
  ['calve raises', 'Standing_Calf_Raises'],
  ['lunges', 'Dumbbell_Lunges'],
  ['DB Bench press', 'Dumbbell_Bench_Press'],
  ['DB incline Bench press', 'Incline_Dumbbell_Press'],
  ['machine: chest press', 'Machine_Bench_Press'],
  ['machine: incline chest press', 'Leverage_Incline_Chest_Press'],
  ['Cable Crossover', 'Cable_Crossover'],
  ['BB Bench press', 'Barbell_Bench_Press_-_Medium_Grip'],
  ['BB incline Bench press', 'Barbell_Incline_Bench_Press_-_Medium_Grip'],
  ['weighted pull up', 'Weighted_Pull_Ups'],
  ['Chin Up', 'Chin-Up'],
  ['Latzug', 'Wide-Grip_Lat_Pulldown'],
  ['chest supported row', 'Dumbbell_Incline_Row'],
  ['low row', 'Seated_Cable_Rows'],
  ['cable row (without chest support)', 'Seated_Cable_Rows'],
  ['lower back', 'Hyperextensions_Back_Extensions'],
  ['shoulder press', 'Leverage_Shoulder_Press'],
  ['BB overhead press', 'Standing_Military_Press'],
  ['DB Side lateral', 'Side_Lateral_Raise'],
  ['Standing Concentration Curl', 'Standing_Concentration_Curl'],
  ['Cable Bicep Curl', 'Standing_Biceps_Cable_Curl'],
  ['Cable Rope Triceps Pushdown', 'Triceps_Pushdown_-_Rope_Attachment'],
  ['Cable Overhead Triceps Extension', 'Cable_Rope_Overhead_Triceps_Extension'],
  ['core', 'Plank']
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
  findeImageKey(katalog, 'DB   Bench    press') === 'Dumbbell_Bench_Press')
pruefe('typografische Anfuehrungszeichen entfernt ("„bad girl“")',
  findeImageKey(katalog, '„bad girl“') === 'Thigh_Abductor')
pruefe('normalisiereName entfernt Doppelpunkte und trimmt',
  normalisiereName('  Machine:  Chest Press ') === 'machine chest press')
pruefe('leerer Name trifft nichts', findeKatalogEintrag(katalog, '') === null)
pruefe('null trifft nichts', findeKatalogEintrag(katalog, null) === null)
pruefe('deutscher Alias mit Umlaut ("Unterer Rücken") trifft die Hyperextension',
  findeImageKey(katalog, 'Unterer Rücken') === 'Hyperextensions_Back_Extensions')
pruefe('deutscher Alias in ae/oe/ue-Schreibweise ("Unterer Ruecken") trifft ebenfalls',
  findeImageKey(katalog, 'Unterer Ruecken') === 'Hyperextensions_Back_Extensions')
pruefe('Bindestrich-Schreibweise ("chin-up") trifft den neuen Eintrag',
  findeImageKey(katalog, 'Chin-up') === 'Chin-Up')

console.log('[matching-test] Manifest-Zugriff und Pfad-Aufloesung:')
pruefe('eintragFuerKey findet Hack_Squat', eintragFuerKey(katalog, 'Hack_Squat')?.name === 'Hack Squat')
pruefe('eintragFuerKey mit unbekanntem Key -> null', eintragFuerKey(katalog, 'Gibt_Es_Nicht') === null)
pruefe('bildPfad haengt an die Base an',
  bildPfad('Hack_Squat', 0, '/fitness-tracker/') === '/fitness-tracker/uebungsbilder/Hack_Squat/0.webp')
pruefe('bildPfad ergaenzt fehlenden Slash der Base',
  bildPfad('Plank', 1, '/fitness-tracker') === '/fitness-tracker/uebungsbilder/Plank/1.webp')

if (fehler > 0) {
  console.error(`[matching-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[matching-test] alles gruen')
}
