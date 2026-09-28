// Baut die Muskelgrafik der App aus EINER farbigen KI-Figur:
// scripts/uebungsbilder-quellen/muskelfigur-farbig.webp (ChatGPT, 28.09.2026,
// vorn links, hinten rechts, jede Muskelgruppe in eigener Farbe, benachbarte
// Gruppen verschieden). Ergebnis unter public/muskelgrafik/:
//   grundfigur.webp  die Figur in Grau, schattiert wie die Uebungsbilder
//   <muskel-id>.png  je Muskel eine Maske (schwarz, Deckung im Alphakanal)
// MuscleMap.vue legt ueber die Grundfigur je markiertem Muskel eine rote
// Flaeche mit dieser Maske (multiply), so bleibt die Schattierung sichtbar.
//
// Ablauf:
//  1. Jedes kraeftig bunte Pixel bekommt eine von acht Farbklassen (Farbton).
//  2. Zusammenhaengende Flaechen je Klasse finden, winzige Reste verwerfen.
//  3. Flaeche -> Muskel-Id ueber Ansicht (vorn/hinten), Farbe und Hoehe
//     (Regeln in MUSKEL_REGELN — passen zu GENAU diesem Quellbild; ein neues
//     Bild braucht einen Blick auf den Pruefbogen und evtl. neue Grenzen).
//  4. Linien innerhalb eines Muskels schliessen (Wachstum nur in Koerper-
//     pixel, deren Nachbarn alle zum selben Muskel gehoeren).
//  5. Grau: Helligkeit je Muskel auf den Hautton der ungefaerbten Stellen
//     normiert (Gelb waere sonst heller als Blau), Hintergrund reinweiss.
//  6. Auf den Inhalt zuschneiden, auf das Seitenverhaeltnis aus
//     src/data/muskelgrafik.js auffuellen und in dessen Masse bringen.
//
// Aufruf:  node ./scripts/muskelgrafik-bauen.mjs
//          node ./scripts/muskelgrafik-bauen.mjs --bogen <datei.png>
//              zusaetzlich ein Pruefbogen: jeder Muskel einzeln eingefaerbt
// Deterministisch; jede Abweichung (Quelle fehlt, Flaeche ohne Regel, Muskel
// ohne Flaeche) bricht mit klarer Meldung und Exit ungleich 0 ab.
// Vertrag: scripts/musclemap-pruefen.mjs.

import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import {
  MUSKEL_IDS, GRUNDFIGUR, GRUNDFIGUR_BREITE, GRUNDFIGUR_HOEHE,
  MASKE_BREITE, MASKE_HOEHE, maskenPfad
} from '../src/data/muskelgrafik.js'

const projektWurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const QUELLE = path.join(projektWurzel, 'scripts', 'uebungsbilder-quellen', 'muskelfigur-farbig.webp')
const publicWurzel = path.join(projektWurzel, 'public')

const SATT_MIN = 0.3 // ab dieser Saettigung (und Helligkeit) ist ein Pixel "gefaerbt"
const HELL_MIN = 0.2
const FLAECHE_MIN = 150 // kleinere Farbinseln sind Randreste
const WACHSTUM_RUNDEN = 4
const HINTERGRUND = 245 // heller und farblos = Hintergrund
const RAND = 12

// Farbklassen nach Farbton (Grad)
function farbklasse(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const s = max === 0 ? 0 : d / max, v = max / 255
  if (s < SATT_MIN || v < HELL_MIN) return null
  let h
  if (max === r) h = 60 * (((g - b) / d) % 6)
  else if (max === g) h = 60 * ((b - r) / d + 2)
  else h = 60 * ((r - g) / d + 4)
  if (h < 0) h += 360
  if (h < 15 || h >= 345) return 'rot'
  if (h < 42) return 'orange'
  if (h < 70) return 'gelb'
  if (h < 165) return 'gruen'
  if (h < 200) return 'cyan'
  if (h < 250) return 'blau'
  if (h < 290) return 'lila'
  return 'magenta'
}

// Flaeche -> Muskel-Id. `y` = Mitte der Flaeche in Pixeln des Quellbilds
// (1536 x 1024): Hals ~120-200, Schultern ~180-280, Arme bis ~470,
// Oberschenkel ~430-660, Waden ~680-880.
const MUSKEL_REGELN = {
  vorn: {
    gelb: y => (y < 250 ? 'neck' : 'adductors'),
    lila: y => (y < 250 ? 'traps' : 'forearms'),
    orange: () => 'shoulders',
    blau: () => 'chest',
    gruen: y => (y < 400 ? 'biceps' : 'quadriceps'),
    rot: () => 'abdominals',
    cyan: () => 'obliques',
    magenta: () => 'abductors'
  },
  hinten: {
    gelb: y => (y < 200 ? 'neck' : 'abductors'),
    // Obere Lila-Flaeche = Trapez, darunter auf dem Schulterblatt die
    // Rotatorenmanschette (zaehlt zum mittleren Ruecken), unten die Unterarme
    lila: y => (y < 210 ? 'traps' : y < 300 ? 'middle_back' : 'forearms'),
    orange: y => (y < 400 ? 'shoulders' : 'calves'),
    gruen: y => (y < 400 ? 'triceps' : 'hamstrings'),
    blau: () => 'lats',
    rot: () => 'middle_back',
    cyan: () => 'lower_back',
    magenta: () => 'glutes'
  }
}

async function ladeQuelle() {
  try {
    const { data, info } = await sharp(QUELLE).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    return { d: data, w: info.width, h: info.height }
  } catch (fehler) {
    throw new Error(`Quellbild ${QUELLE} nicht lesbar: ${fehler.message}`)
  }
}

function flaechenFinden(bild) {
  const { d, w, h } = bild
  const n = w * h
  const klasse = new Array(n)
  for (let i = 0; i < n; i++) klasse[i] = farbklasse(d[i * 3], d[i * 3 + 1], d[i * 3 + 2])
  const flaeche = new Int32Array(n).fill(-1)
  const stapel = new Int32Array(n)
  const liste = []
  for (let start = 0; start < n; start++) {
    if (!klasse[start] || flaeche[start] >= 0) continue
    const nr = liste.length
    let sp = 0, anzahl = 0, sx = 0, sy = 0
    stapel[sp++] = start
    flaeche[start] = nr
    while (sp > 0) {
      const p = stapel[--sp]
      const x = p % w, y = (p - x) / w
      anzahl++; sx += x; sy += y
      const nachbarn = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
      for (const q of nachbarn) {
        if (q >= 0 && flaeche[q] < 0 && klasse[q] === klasse[start]) { flaeche[q] = nr; stapel[sp++] = q }
      }
    }
    liste.push({ nr, klasse: klasse[start], anzahl, cx: sx / anzahl, cy: sy / anzahl })
  }
  return { flaeche, liste }
}

function muskelKarte(bild, flaeche, liste) {
  const { w, h } = bild
  const nrZuMuskel = new Map()
  const jeMuskel = new Map(MUSKEL_IDS.map(id => [id, 0]))
  for (const f of liste) {
    if (f.anzahl < FLAECHE_MIN) continue
    const ansicht = f.cx < w / 2 ? 'vorn' : 'hinten'
    const regel = MUSKEL_REGELN[ansicht][f.klasse]
    const id = regel ? regel(f.cy) : null
    if (!id || !MUSKEL_IDS.includes(id)) {
      throw new Error(`Flaeche ${f.klasse} (${ansicht}, Mitte ${Math.round(f.cx)},${Math.round(f.cy)}) hat keine Regel`)
    }
    nrZuMuskel.set(f.nr, MUSKEL_IDS.indexOf(id))
    jeMuskel.set(id, jeMuskel.get(id) + f.anzahl)
  }
  const ohne = MUSKEL_IDS.filter(id => jeMuskel.get(id) === 0)
  if (ohne.length) throw new Error(`Kein Farbfeld fuer: ${ohne.join(', ')}`)
  let karte = new Int8Array(w * h).fill(-1)
  for (let i = 0; i < w * h; i++) {
    const m = nrZuMuskel.get(flaeche[i])
    if (m !== undefined) karte[i] = m
  }
  // Linien im Muskel schliessen: nur Koerperpixel, deren Muskel-Nachbarn
  // (mindestens zwei) alle zum selben Muskel gehoeren
  for (let runde = 0; runde < WACHSTUM_RUNDEN; runde++) {
    const neu = karte.slice()
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x
        if (karte[i] >= 0 || helligkeit(bild, i) > HINTERGRUND) continue
        const nb = [karte[i - 1], karte[i + 1], karte[i - w], karte[i + w]].filter(v => v >= 0)
        if (nb.length >= 2 && nb.every(v => v === nb[0])) neu[i] = nb[0]
      }
    }
    karte = neu
  }
  return { karte, jeMuskel }
}

function helligkeit(bild, i) {
  const d = bild.d
  return 0.299 * d[i * 3] + 0.587 * d[i * 3 + 1] + 0.114 * d[i * 3 + 2]
}

function median(werte) {
  if (werte.length === 0) return 1
  const s = Float32Array.from(werte).sort()
  return s[Math.floor(s.length / 2)] || 1
}

// Graustufen: je Muskel auf den Hautton normiert, Hintergrund reinweiss
function grauBild(bild, karte) {
  const n = bild.w * bild.h
  const haut = []
  const jeMuskel = MUSKEL_IDS.map(() => [])
  for (let i = 0; i < n; i++) {
    const L = helligkeit(bild, i)
    if (karte[i] >= 0) jeMuskel[karte[i]].push(L)
    else if (L > 120 && L < 240) haut.push(L)
  }
  const hautton = median(haut)
  const faktor = jeMuskel.map(werte => hautton / median(werte))
  const grau = Buffer.alloc(n)
  for (let i = 0; i < n; i++) {
    const d = bild.d
    const unbunt = Math.max(d[i * 3], d[i * 3 + 1], d[i * 3 + 2]) - Math.min(d[i * 3], d[i * 3 + 1], d[i * 3 + 2]) < 12
    const L = helligkeit(bild, i)
    let g = karte[i] >= 0 ? L * faktor[karte[i]] : L
    if (karte[i] < 0 && unbunt && L > HINTERGRUND) g = 255
    grau[i] = Math.max(0, Math.min(255, Math.round(g)))
  }
  return grau
}

// Ausschnitt um die Figur, aufgefuellt auf das Ziel-Seitenverhaeltnis
function zuschnitt(grau, w, h) {
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grau[y * w + x] < 250) {
        if (x < x0) x0 = x; if (x > x1) x1 = x
        if (y < y0) y0 = y; if (y > y1) y1 = y
      }
    }
  }
  const breite = x1 - x0 + 1 + 2 * RAND, hoehe = y1 - y0 + 1 + 2 * RAND
  const ziel = GRUNDFIGUR_HOEHE / GRUNDFIGUR_BREITE
  const leinwandB = Math.max(breite, Math.ceil(hoehe / ziel))
  const leinwandH = Math.round(leinwandB * ziel)
  return {
    links: x0 - RAND, oben: y0 - RAND, breite, hoehe,
    leinwandB, leinwandH,
    dx: Math.floor((leinwandB - breite) / 2), dy: Math.floor((leinwandH - hoehe) / 2)
  }
}

// Einkanaliges Bild (Quellmasse) auf die Leinwand setzen und skalieren
async function aufZiel(kanal, w, h, z, fuell, zielB, zielH) {
  const leinwand = Buffer.alloc(z.leinwandB * z.leinwandH, fuell)
  for (let y = 0; y < z.hoehe; y++) {
    const qy = z.oben + y
    if (qy < 0 || qy >= h) continue
    for (let x = 0; x < z.breite; x++) {
      const qx = z.links + x
      if (qx < 0 || qx >= w) continue
      leinwand[(z.dy + y) * z.leinwandB + z.dx + x] = kanal[qy * w + qx]
    }
  }
  // sharp gibt nach resize drei Kanaele aus — einen davon nehmen, sonst
  // stimmt die Zeilenbreite nicht (Bild verschert)
  const { data, info } = await sharp(leinwand, { raw: { width: z.leinwandB, height: z.leinwandH, channels: 1 } })
    .resize(zielB, zielH, { kernel: 'lanczos3' })
    .extractChannel(0)
    .raw().toBuffer({ resolveWithObject: true })
  if (info.channels !== 1 || data.length !== zielB * zielH) {
    throw new Error(`Skalierung lieferte ${info.width}x${info.height}x${info.channels}, erwartet ${zielB}x${zielH}x1`)
  }
  return data
}

async function bauen() {
  const argumente = process.argv.slice(2)
  const bogenIndex = argumente.indexOf('--bogen')
  const bogenDatei = bogenIndex >= 0 ? argumente[bogenIndex + 1] : null
  if (bogenIndex >= 0 && !bogenDatei) throw new Error('--bogen braucht einen Dateinamen')
  const unbekannt = argumente.filter((a, i) => a !== '--bogen' && i !== bogenIndex + 1)
  if (unbekannt.length) throw new Error(`Unbekannte Angabe ${unbekannt.join(', ')} (erlaubt: --bogen <datei>)`)

  const bild = await ladeQuelle()
  const { flaeche, liste } = flaechenFinden(bild)
  const { karte, jeMuskel } = muskelKarte(bild, flaeche, liste)
  const grau = grauBild(bild, karte)
  const z = zuschnitt(grau, bild.w, bild.h)

  mkdirSync(path.join(publicWurzel, 'muskelgrafik'), { recursive: true })
  const grundRoh = await aufZiel(grau, bild.w, bild.h, z, 255, GRUNDFIGUR_BREITE, GRUNDFIGUR_HOEHE)
  await sharp(grundRoh, { raw: { width: GRUNDFIGUR_BREITE, height: GRUNDFIGUR_HOEHE, channels: 1 } })
    .webp({ quality: 86 }).toFile(path.join(publicWurzel, GRUNDFIGUR))

  const masken = new Map()
  for (let m = 0; m < MUSKEL_IDS.length; m++) {
    const id = MUSKEL_IDS[m]
    const alpha = Buffer.alloc(bild.w * bild.h)
    for (let i = 0; i < alpha.length; i++) if (karte[i] === m) alpha[i] = 255
    const klein = await aufZiel(alpha, bild.w, bild.h, z, 0, MASKE_BREITE, MASKE_HOEHE)
    const rgba = Buffer.alloc(MASKE_BREITE * MASKE_HOEHE * 4)
    for (let i = 0; i < klein.length; i++) rgba[i * 4 + 3] = klein[i]
    await sharp(rgba, { raw: { width: MASKE_BREITE, height: MASKE_HOEHE, channels: 4 } })
      .png({ compressionLevel: 9 }).toFile(path.join(publicWurzel, maskenPfad(id)))
    masken.set(id, klein)
    console.log(`[muskelgrafik] ${id.padEnd(12)} ${String(jeMuskel.get(id)).padStart(6)} px im Quellbild`)
  }
  console.log(`[muskelgrafik] Grundfigur ${GRUNDFIGUR_BREITE}x${GRUNDFIGUR_HOEHE}, Masken ${MASKE_BREITE}x${MASKE_HOEHE}`)
  if (bogenDatei) await schreibeBogen(grundRoh, masken, bogenDatei)
  console.log('[muskelgrafik] fertig')
}

// Pruefbogen: jeder Muskel einzeln rot auf der Grundfigur (kleines Raster)
async function schreibeBogen(grundRoh, masken, datei) {
  const kleinB = MASKE_BREITE, kleinH = MASKE_HOEHE
  const grundKlein = await sharp(grundRoh, { raw: { width: GRUNDFIGUR_BREITE, height: GRUNDFIGUR_HOEHE, channels: 1 } })
    .resize(kleinB, kleinH).extractChannel(0).raw().toBuffer()
  const spalten = 3, zeileH = kleinH + 28
  const teile = []
  let nr = 0
  for (const id of MUSKEL_IDS) {
    const maske = masken.get(id)
    const rgb = Buffer.alloc(kleinB * kleinH * 3)
    for (let i = 0; i < kleinB * kleinH; i++) {
      const g = grundKlein[i], a = maske[i] / 255
      rgb[i * 3] = Math.round(g * (1 - a) + g * 240 / 255 * a)
      rgb[i * 3 + 1] = Math.round(g * (1 - a) + g * 92 / 255 * a)
      rgb[i * 3 + 2] = Math.round(g * (1 - a) + g * 60 / 255 * a)
    }
    const x = (nr % spalten) * kleinB, y = Math.floor(nr / spalten) * zeileH
    teile.push({ input: await sharp(rgb, { raw: { width: kleinB, height: kleinH, channels: 3 } }).png().toBuffer(), left: x, top: y + 28 })
    teile.push({
      input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${kleinB}" height="26"><text x="6" y="19" font-size="18" font-family="Arial" font-weight="bold">${id}</text></svg>`),
      left: x, top: y
    })
    nr++
  }
  const zeilen = Math.ceil(MUSKEL_IDS.length / spalten)
  await sharp({ create: { width: spalten * kleinB, height: zeilen * zeileH, channels: 3, background: '#ffffff' } })
    .composite(teile).png().toFile(datei)
  console.log(`[muskelgrafik] Pruefbogen: ${datei}`)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  bauen().catch(fehler => {
    console.error(`[muskelgrafik] FEHLER: ${fehler.message}`)
    process.exitCode = 1
  })
}
