// Holt die Uebungsfotos aus yuhonas/free-exercise-db (GitHub, Unlicense) und
// legt sie verkleinert als webp unter public/uebungsbilder/<key>/ ab.
//
// Quelle je Bild (siehe docs/plan-fittrack-v2.md, Abschnitt "Bild-Zuordnung"):
//   https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<KEY>/0.jpg (und 1.jpg)
//
// Aufruf:  node ./scripts/uebungsbilder-holen.mjs
// Idempotent: vorhandene Zieldateien werden uebersprungen. Ein Netz- oder
// HTTP-Fehler bricht den Lauf mit klarer Meldung und Exit ungleich 0 ab —
// nie still weiterlaufen (Korrektheits-Regel: nie lautlos defaulten).

import { readFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projektWurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPfad = path.join(projektWurzel, 'src', 'data', 'uebungskatalog.json')
const zielWurzel = path.join(projektWurzel, 'public', 'uebungsbilder')

const QUELLE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'
const BREITE = 400
const QUALITAET = 75

async function holen () {
  const eintraege = JSON.parse(readFileSync(manifestPfad, 'utf-8'))
  if (!Array.isArray(eintraege) || eintraege.length === 0) {
    throw new Error(`Manifest ${manifestPfad} ist leer oder kein Array`)
  }

  let geladen = 0
  let uebersprungen = 0

  for (const eintrag of eintraege) {
    const zielOrdner = path.join(zielWurzel, eintrag.key)
    mkdirSync(zielOrdner, { recursive: true })

    for (const position of [0, 1]) {
      const zielDatei = path.join(zielOrdner, `${position}.webp`)
      if (existsSync(zielDatei)) {
        uebersprungen++
        continue
      }

      const url = `${QUELLE}/${eintrag.key}/${position}.jpg`
      let antwort
      try {
        antwort = await fetch(url)
      } catch (fehler) {
        throw new Error(`Netzfehler beim Laden von ${url}: ${fehler.message}`)
      }
      if (!antwort.ok) {
        throw new Error(`Download fehlgeschlagen (HTTP ${antwort.status}) fuer ${url}`)
      }

      const jpg = Buffer.from(await antwort.arrayBuffer())
      await sharp(jpg)
        .resize({ width: BREITE, withoutEnlargement: true })
        .webp({ quality: QUALITAET })
        .toFile(zielDatei)

      geladen++
      console.log(`[uebungsbilder] geladen: ${eintrag.key}/${position}.webp`)
    }
  }

  console.log(`[uebungsbilder] fertig: ${geladen} geladen, ${uebersprungen} uebersprungen (${eintraege.length} Eintraege x 2 Bilder)`)
}

// Kein process.exit() nach fetch (globale Regel) — Fehler werfen und nur den
// Exit-Code setzen, damit Node sauber auslaufen kann.
holen().catch((fehler) => {
  console.error(`[uebungsbilder] FEHLER: ${fehler.message}`)
  process.exitCode = 1
})
