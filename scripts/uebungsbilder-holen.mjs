// Holt die Uebungszeichnungen aus der Sammlung "Workout Guide" von Bryl Lim
// (github.com/bryllim/workout-guide, Zeichnungen CC BY-SA 4.0, teils nach
// Everkinetic), faerbt sie fuer den hellen App-Hintergrund ein und legt sie
// unter public/uebungsbilder/<key>/ ab. Zusaetzlich entsteht je Eintrag ein
// Vorschaubild (vorschau.webp) mit kraeftigerer Linie, randlos zugeschnitten
// — die feinen Originallinien verschwinden sonst bei 40 px.
//
// Welche Zeichnungen geholt werden, bestimmt allein das Manifest
// (src/data/uebungskatalog.json): `bilder` nennt die Frames in
// Animationsreihenfolge (uebungsbilder/<key>/frame-<n>.svg, n = Frame der
// Quelle), das Vorschaubild entsteht aus dem ersten davon.
//
// Aufruf:  node ./scripts/uebungsbilder-holen.mjs          (fehlende Dateien)
//          node ./scripts/uebungsbilder-holen.mjs --neu    (alles neu erzeugen,
//          z.B. nach einer Aenderung von LINIENFARBE)
// Idempotent: vorhandene Zieldateien werden ohne --neu uebersprungen. Ordner,
// die nicht (mehr) im Manifest stehen, loescht das Skript nie — das ist
// Handarbeit (git rm). Ein Netz-, HTTP- oder Formatfehler bricht mit klarer
// Meldung und Exit ungleich 0 ab (nie lautlos weiterlaufen).
//
// LIZENZ: Die eingefaerbten Dateien sind Bearbeitungen und stehen wie die
// Quelle unter CC BY-SA 4.0 — Nachweis in public/uebungsbilder/LIZENZ.md und
// in der App (Einstellungen -> Info). Beides nie entfernen.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projektWurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPfad = path.join(projektWurzel, 'src', 'data', 'uebungskatalog.json')
const publicWurzel = path.join(projektWurzel, 'public')

// Fester Stand der Quelle (Commit vom 26.08.2026) — ein erneuter Lauf holt
// garantiert dieselben Zeichnungen, auch wenn sich die Sammlung weiterentwickelt.
const QUELL_COMMIT = 'aac599224bb9780305239607ef98540b7e0ce389'
const QUELLE = `https://raw.githubusercontent.com/bryllim/workout-guide/${QUELL_COMMIT}/packages/workout-guide/assets`

// Die Quelle zeichnet weiss auf transparent (fuer dunkle Flaechen). Die App ist
// hell: Linien in der Textfarbe aus src/styles/variables.css.
const QUELL_FARBE = 'fill="#fff"'
const LINIENFARBE = '#1e1f23'

// Vorschaubild: Zusatzstrich in Einheiten des 512er-Quellrasters, Kantenlaenge
// in px (40 CSS-px x 3 Geraete-Pixel), Rand nach dem Zuschnitt
const VORSCHAU_STRICH = 6
const VORSCHAU_KANTE = 128
const VORSCHAU_RAND = 6

const neuErzeugen = process.argv.includes('--neu')

async function ladeSvg(key, frame) {
  const url = `${QUELLE}/${key}/frame-${frame}.svg`
  let antwort
  try {
    antwort = await fetch(url)
  } catch (fehler) {
    throw new Error(`Netzfehler beim Laden von ${url}: ${fehler.message}`)
  }
  if (!antwort.ok) {
    throw new Error(`Download fehlgeschlagen (HTTP ${antwort.status}) fuer ${url}`)
  }
  const svg = await antwort.text()
  // Formatpruefung: genau eine Farbe (weiss) — sonst bliebe nach dem
  // Einfaerben ein Teil unsichtbar weiss auf hellem Grund.
  const farben = [...svg.matchAll(/(fill|stroke)="[^"]*"/g)].map(m => m[0])
  if (farben.length === 0 || farben.some(f => f !== QUELL_FARBE)) {
    throw new Error(`Unerwartetes Farbformat in ${url}: ${[...new Set(farben)].join(', ') || 'keine Farbe'}`)
  }
  return svg.replaceAll(QUELL_FARBE, `fill="${LINIENFARBE}"`)
}

function frameAusPfad(relativ) {
  const treffer = /\/frame-(\d)\.svg$/.exec(relativ)
  if (!treffer) throw new Error(`Bildpfad ohne Frame-Nummer im Manifest: ${relativ}`)
  return Number(treffer[1])
}

async function erzeugeVorschau(svg, zielDatei) {
  const kraeftig = svg.replace(
    /<path /g,
    `<path stroke="${LINIENFARBE}" stroke-width="${VORSCHAU_STRICH}" stroke-linejoin="round" `
  )
  const innen = VORSCHAU_KANTE - 2 * VORSCHAU_RAND
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
  const zugeschnitten = await sharp(Buffer.from(kraeftig)).trim().png().toBuffer()
  await sharp(zugeschnitten)
    .resize({ width: innen, height: innen, fit: 'contain', background: transparent })
    .extend({
      top: VORSCHAU_RAND, bottom: VORSCHAU_RAND, left: VORSCHAU_RAND, right: VORSCHAU_RAND,
      background: transparent
    })
    .webp({ quality: 80, alphaQuality: 90 })
    .toFile(zielDatei)
}

async function holen() {
  const eintraege = JSON.parse(readFileSync(manifestPfad, 'utf-8'))
  if (!Array.isArray(eintraege) || eintraege.length === 0) {
    throw new Error(`Manifest ${manifestPfad} ist leer oder kein Array`)
  }

  let geschrieben = 0
  let uebersprungen = 0

  for (const eintrag of eintraege) {
    const bilder = eintrag.bilder || []
    if (bilder.length === 0) throw new Error(`Eintrag ${eintrag.key} hat keine Bilder`)
    if (!eintrag.vorschau) throw new Error(`Eintrag ${eintrag.key} hat keinen Vorschau-Pfad`)

    const svgs = []
    for (const relativ of bilder) {
      const zielDatei = path.join(publicWurzel, relativ)
      if (existsSync(zielDatei) && !neuErzeugen) {
        svgs.push(readFileSync(zielDatei, 'utf-8'))
        uebersprungen++
        continue
      }
      const svg = await ladeSvg(eintrag.key, frameAusPfad(relativ))
      mkdirSync(path.dirname(zielDatei), { recursive: true })
      writeFileSync(zielDatei, svg, 'utf-8')
      svgs.push(svg)
      geschrieben++
      console.log(`[uebungsbilder] geschrieben: ${relativ}`)
    }

    const vorschauDatei = path.join(publicWurzel, eintrag.vorschau)
    if (existsSync(vorschauDatei) && !neuErzeugen) {
      uebersprungen++
    } else {
      await erzeugeVorschau(svgs[0], vorschauDatei)
      geschrieben++
      console.log(`[uebungsbilder] geschrieben: ${eintrag.vorschau}`)
    }
  }

  console.log(`[uebungsbilder] fertig: ${geschrieben} geschrieben, ${uebersprungen} uebersprungen (${eintraege.length} Eintraege)`)
}

// Kein process.exit() nach fetch (globale Regel) — Fehler werfen und nur den
// Exit-Code setzen, damit Node sauber auslaufen kann.
holen().catch((fehler) => {
  console.error(`[uebungsbilder] FEHLER: ${fehler.message}`)
  process.exitCode = 1
})
