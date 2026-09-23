// Vertragstest fuers Namens-Matching und das Bild-Manifest der Uebungszeichnungen
// (src/utils/uebungsBilder.js, src/data/uebungskatalog.json).
//
// Der Test ist der Vertrag: alle 32 Katalognamen (31 aus der Plan-Tabelle in
// docs/plan-fittrack-v2.md plus "Chin Up", Nachtrag 22.09.2026) muessen ihren
// Key treffen, Fantasienamen duerfen nichts treffen, und jede im Manifest
// genannte Datei muss unter public/ liegen. Die Keys stammen aus der
// Workout-Guide-Sammlung (Zeichnungen, CC BY-SA 4.0); seit v2.1.0 zeigen die
// meisten davon KI-generierte Bilder (quelle "ki", zugeschnitten von
// scripts/uebungsbilder-schneiden.mjs). Wer Matching-Regeln, das Manifest
// oder die Schnitt-Tabelle aendert, erweitert ZUERST diesen Test.
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
import { QUELLEN, UEBUNGEN } from './uebungsbilder-zuschnitt.mjs'

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
// Seit v2.1.0 hat jede Uebung ihr eigenes Bild; die beiden Brustpressen-
// Maschinen und die beiden Ruder-Uebungen teilen sich keins mehr.
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
  ['machine: chest press', 'chest-press-machine'],
  ['machine: incline chest press', 'incline-chest-press-machine'],
  ['Cable Crossover', 'cable-fly'],
  ['BB Bench press', 'bench-press'],
  ['BB incline Bench press', 'incline-bench-press'],
  ['weighted pull up', 'weighted-pull-up'],
  ['Chin Up', 'chin-up'],
  ['Latzug', 'lat-pulldown'],
  ['chest supported row', 'chest-supported-row'],
  ['low row', 'low-row-machine'],
  ['cable row (without chest support)', 'seated-cable-row'],
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

// Uebungen ausserhalb des Standard-Katalogs, fuer die es seit v2.1.0 ein
// eigenes Bild gibt (Gabriel hat sie mit den KI-Bildern mitgeliefert)
console.log('[matching-test] Zusatz-Uebungen mit eigenem Bild:')
for (const [name, key] of [
  ['Butterfly', 'butterfly-machine'],
  ['Butterfly (Maschine)', 'butterfly-machine'],
  ['Shrugs', 'dumbbell-shrug'],
  ['DB Shrugs', 'dumbbell-shrug']
]) {
  pruefe(`"${name}" -> ${key}`, findeImageKey(katalog, name) === key)
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
const kabelCurl = eintragFuerKey(katalog, 'cable-curl')
const plank = eintragFuerKey(katalog, 'plank')
pruefe('eintragFuerKey findet hack-squat', eintragFuerKey(katalog, 'hack-squat')?.name === 'Hack Squat')
pruefe('eintragFuerKey mit unbekanntem Key -> null', eintragFuerKey(katalog, 'Gibt_Es_Nicht') === null)
pruefe('alte Foto-Keys (vor 22.09.2026) sind verwaist -> null',
  eintragFuerKey(katalog, 'Hack_Squat') === null && eintragFuerKey(katalog, 'Wide-Grip_Lat_Pulldown') === null)
// "Bilder automatisch zuordnen" ersetzt nur verwaiste Keys — darum sind die
// frueher geteilten Keys ganz weg, statt einer Haelfte weiter zu gehoeren
pruefe('geteilte Keys vor v2.1.0 sind verwaist -> null',
  eintragFuerKey(katalog, 'machine-chest-press') === null && eintragFuerKey(katalog, 'seated-row') === null)
pruefe('bildUrl haengt Bild 0 an die Base an',
  bildUrl(kabelCurl, 0, '/fitness-tracker/') === '/fitness-tracker/uebungsbilder/cable-curl/frame-1.svg')
pruefe('bildUrl ergaenzt fehlenden Slash der Base (Bild 1)',
  bildUrl(kabelCurl, 1, '/fitness-tracker') === '/fitness-tracker/uebungsbilder/cable-curl/frame-3.svg')
pruefe('bildUrl ausserhalb der Bildliste -> null', bildUrl(kabelCurl, 5, '/') === null)
pruefe('bildUrl ohne Eintrag -> null', bildUrl(null, 0, '/') === null)
pruefe('vorschauUrl zeigt auf das Vorschaubild',
  vorschauUrl(plank, '/fitness-tracker/') === '/fitness-tracker/uebungsbilder/plank/vorschau.webp')
pruefe('vorschauUrl ohne Eintrag -> null', vorschauUrl(null, '/') === null)

console.log('[matching-test] Manifest-Vertrag (Schluessel, Pfade, Dateien, Muskeln):')
const keys = katalog.map(e => e.key)
pruefe(`34 Eintraege (ist: ${katalog.length})`, katalog.length === 34)
pruefe('Keys sind eindeutig', new Set(keys).size === keys.length)
// Die Quelle bestimmt Dateiformat und zustaendiges Skript: workout-guide ->
// SVG von uebungsbilder-holen.mjs, ki -> WebP von uebungsbilder-schneiden.mjs
const ENDUNG = { 'workout-guide': 'svg', ki: 'webp' }
const quelleFalsch = katalog.filter(e => !ENDUNG[e.quelle]).map(e => e.key)
pruefe(`jede Quelle ist workout-guide oder ki${quelleFalsch.length ? ' (falsch: ' + quelleFalsch.join(', ') + ')' : ''}`,
  quelleFalsch.length === 0)
pruefe('28 KI-Bilder, 6 Zeichnungen',
  katalog.filter(e => e.quelle === 'ki').length === 28 && katalog.filter(e => e.quelle === 'workout-guide').length === 6)

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
  const pfadMuster = new RegExp(`^uebungsbilder/${e.key}/frame-[1-3]\\.${ENDUNG[e.quelle] || 'FEHLT'}$`)
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

// Schnitt-Tabelle (uebungsbilder-zuschnitt.mjs) und Manifest muessen
// zusammenpassen: das Manifest bestimmt, WELCHE Phasen ein KI-Eintrag zeigt
// (frame-<n> = Phase n: 1 START, 2 MITTE, 3 ENDE), die Tabelle, WO sie im
// Quellbild liegen. Ein Rahmen ist [links, oben, rechts, unten] in Pixeln des
// Quellbilds (rechts/unten exklusiv).
console.log('[matching-test] Schnitt-Tabelle passt zum Manifest:')
const kiKeys = katalog.filter(e => e.quelle === 'ki').map(e => e.key)
const tabellenKeys = Object.keys(UEBUNGEN)
const ohneTabelle = kiKeys.filter(k => !UEBUNGEN[k])
const ohneManifest = tabellenKeys.filter(k => !kiKeys.includes(k))
pruefe(`jeder KI-Eintrag steht in der Tabelle${ohneTabelle.length ? ' (fehlt: ' + ohneTabelle.join(', ') + ')' : ''}`,
  ohneTabelle.length === 0)
pruefe(`die Tabelle kennt nur KI-Eintraege des Manifests${ohneManifest.length ? ' (zu viel: ' + ohneManifest.join(', ') + ')' : ''}`,
  ohneManifest.length === 0)

function rahmenOk(rahmen, quelle) {
  return Array.isArray(rahmen) && rahmen.length === 4 && rahmen.every(Number.isInteger) &&
    rahmen[0] >= 0 && rahmen[1] >= 0 && rahmen[0] < rahmen[2] && rahmen[1] < rahmen[3] &&
    rahmen[2] <= quelle.breite && rahmen[3] <= quelle.hoehe
}

for (const key of kiKeys.filter(k => UEBUNGEN[k])) {
  const t = UEBUNGEN[key]
  const quelle = QUELLEN[t.quelle]
  const phasen = katalog.find(e => e.key === key).bilder.map(p => Number(/frame-(\d)\./.exec(p)?.[1]))
  const genutzt = [...phasen, t.vorschau ?? phasen[0]]
  const fehlendePhasen = genutzt.filter(n => !quelle || !rahmenOk(t.phasen?.[n], quelle))
  const maskenOk = (t.masken || []).every(m => quelle && rahmenOk(m, quelle))
  const a = t.ausrichtung
  const ausrichtungOk = a === undefined || a === 'mitte' ||
    (Array.isArray(a) && a.length === 2 && a.every(Number.isInteger))
  pruefe(`${key}: Quelle bekannt, Rahmen fuer Phase ${[...new Set(genutzt)].join('+')} gueltig` +
    (fehlendePhasen.length ? ` (ungueltig: ${fehlendePhasen.join(', ')})` : '') + (maskenOk ? '' : ' (Maske ungueltig)') +
    (ausrichtungOk ? '' : ' (Ausrichtung ungueltig)'),
    Boolean(quelle) && fehlendePhasen.length === 0 && maskenOk && ausrichtungOk)
}

if (fehler > 0) {
  console.error(`[matching-test] ROT: ${fehler} Pruefung(en) fehlgeschlagen`)
  process.exitCode = 1
} else {
  console.log('[matching-test] alles gruen')
}
