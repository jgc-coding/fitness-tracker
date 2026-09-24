// Schneidet die KI-generierten Uebungsbilder aus den Sammelbildern in
// scripts/uebungsbilder-quellen/ und legt je Manifest-Eintrag mit
// `quelle: "ki"` die Phasen-Bilder (frame-<n>.webp) und ein Vorschaubild
// (vorschau.webp) unter public/uebungsbilder/<key>/ ab.
//
// Welche Phasen ein Eintrag zeigt, bestimmt allein das Manifest
// (src/data/uebungskatalog.json, `bilder`: frame-<n>.webp = Phase n des
// Sammelbilds, 1 START, 2 MITTE, 3 ENDE). Wo die Phasen im Sammelbild liegen,
// steht in der Schnitt-Tabelle scripts/uebungsbilder-zuschnitt.mjs.
//
// Ablauf je Sammelbild:
//  1. Hintergrund weiss. Bild 1 hat echte Transparenz. Die anderen haben das
//     "Transparenz"-Karomuster fest eingemalt: ein Detektor misst je Pixel, wie
//     stark die Umgebung genau dieses Schachbrett zeigt (Energie bei seiner
//     Diagonal-Frequenz, nur ueber hell-neutrale Pixel gerechnet). Sicher
//     erkannte Flaechen werden weiss, dazu ein schmaler Saum bis an die Umrisse.
//     Haut zeigt kein Schachbrett und behaelt ihre Schattierung — ein
//     einfaches "hell = Hintergrund" hat sie im Test ausgebleicht.
//  2. Schilder (START/MITTE/ENDE, Titel) finden und weiss uebermalen: dunkle
//     Rechtecke mit weisser Schrift darin. Die erwartete Anzahl steht in der
//     Tabelle; weicht sie ab, bricht das Skript ab.
// Je Uebung:
//  3. Phasen ausschneiden, Zusatz-Masken weiss malen, lose Kruemel entfernen,
//     auf den Inhalt zuschneiden.
//  4. Die zweite Phase an der ersten ausrichten (Standard: Verschiebung mit der
//     besten Deckung der dunklen Flaechen, also am stillstehenden Geraet; je
//     Uebung in der Tabelle umstellbar), damit die Ueberblendung in der
//     Detailansicht nicht springt; beide auf dieselbe Leinwand.
//  5. WebP schreiben, dazu das Vorschaubild (128 x 128) aus der Vorschau-Phase.
//
// Aufruf:  node ./scripts/uebungsbilder-schneiden.mjs              (alle KI-Eintraege)
//          node ./scripts/uebungsbilder-schneiden.mjs hack-squat   (nur diese Keys)
//          ... --bogen <datei.png>   zusaetzlich ein Uebersichtsbogen zum Pruefen
//                                    (je Uebung: Phasen, Ueberblendung, Vorschau)
//          node ./scripts/uebungsbilder-schneiden.mjs --vermessen <ordner>
//              schneidet nichts, sondern schreibt jedes Sammelbild gesaeubert
//              mit Koordinatengitter und rot umrandeten Schildern — zum
//              Vermessen der Rahmen fuer ein neues oder getauschtes Bild
// Neue Sammelbilder muessen im Massstab der bisherigen vorliegen (Karofeld
// 5-6 px, Schilder hoechstens 64 px hoch). Bleibt beim Vermessen Karo stehen
// und fehlen Schilder, das Bild vorher verkleinern (so bei 7-dips.webp).
// Deterministisch: gleiche Quellen und Tabelle ergeben dieselben Dateien. Die
// Ausgaben werden immer neu geschrieben. Jede Abweichung (Quellbild fehlt oder
// hat andere Masse, Schilderzahl stimmt nicht, Phase ohne Rahmen) bricht mit
// klarer Meldung und Exit ungleich 0 ab.
//
// LIZENZ: KI-generiert, nicht aus der Workout-Guide-Sammlung — Nachweis in
// public/uebungsbilder/LIZENZ.md und in der App (Einstellungen -> Info).

import { readFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import sharp from 'sharp'
import { QUELLEN, UEBUNGEN } from './uebungsbilder-zuschnitt.mjs'

const projektWurzel = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const manifestPfad = path.join(projektWurzel, 'src', 'data', 'uebungskatalog.json')
const quellOrdner = path.join(projektWurzel, 'scripts', 'uebungsbilder-quellen')
const publicWurzel = path.join(projektWurzel, 'public')

// Karomuster-Detektor: Fensterradius, Periode eines Feldpaars in px (die
// KI-Schachbretter haben 5-6 px grosse Felder), Schwellen fuer "sicher Karo"
const KARO_RADIUS = 11
const KARO_PERIODEN = [11, 12]
const KARO_MITTEL = 228 // mittlere Helligkeit des Schachbretts (weiss ~252, grau ~205)
const KARO_ANTEIL = 0.62 // Anteil der lokalen Schwankung, der auf das Schachbrett entfaellt
const KARO_AMPLITUDE = 8
const KARO_ABDECKUNG = 0.35 // Mindestanteil hell-neutraler Pixel im Fenster
const KARO_SAUM = 12 // so weit darf das Weiss ueber sicheres Karo hinaus bis an Umrisse wachsen
const HELL_MIN = 172 // ab dieser Helligkeit (und farblos) kann ein Pixel Hintergrund sein
const KRUEMEL_MAX = 40 // kleine helle Reste (Pixel) nach dem Saeubern; je Quelle ueberschreibbar
const KRUEMEL_HELL = 130 // nur Inseln, die im Mittel mindestens so hell sind
// Schilder: sehr dunkle Rechtecke mit Schrift-Loechern
const SCHILD_DUNKEL = 80
const SCHILD_SCHWUND = 2
const SCHILD_RAND = 6 // die unscharfen Bilder haben einen grauen Schein um die Schilder
// Ausschnitt und Ausgabe
const TINTE_HELL = 238 // heller als das und farblos = Hintergrund
const INSEL_MIN = 40 // lose Inseln unter dieser Pixelzahl sind Kruemel, keine Figurteile
const LEINWAND_RAND = 6
const AUSRICHT_SUCHE = 40 // max. Verschiebung (px) beim Ausrichten der zweiten Phase
const WEBP_QUALITAET = 82
const VORSCHAU_KANTE = 128
const VORSCHAU_RAND = 6

// ---------- Hilfen fuer Rohbilder (RGB, 3 Kanaele) ----------

function helligkeit(d, i) {
  return (d[i * 3] + d[i * 3 + 1] + d[i * 3 + 2]) / 3
}

function farbigkeit(d, i) {
  const r = d[i * 3], g = d[i * 3 + 1], b = d[i * 3 + 2]
  return Math.max(r, g, b) - Math.min(r, g, b)
}

function weissMalen(bild, [links, oben, rechts, unten]) {
  const { daten, breite, hoehe } = bild
  const l = Math.max(0, links), r = Math.min(breite, rechts)
  if (l >= r) return
  for (let y = Math.max(0, oben); y < Math.min(hoehe, unten); y++) {
    daten.fill(255, (y * breite + l) * 3, (y * breite + r) * 3)
  }
}

async function ladeQuelle(datei) {
  const spec = QUELLEN[datei]
  if (!spec) throw new Error(`Quellbild ${datei} steht nicht in QUELLEN der Schnitt-Tabelle`)
  const pfad = path.join(quellOrdner, datei)
  let meta
  try {
    meta = await sharp(pfad).metadata()
  } catch (fehler) {
    throw new Error(`Quellbild ${pfad} nicht lesbar: ${fehler.message}`)
  }
  if (meta.width !== spec.breite || meta.height !== spec.hoehe) {
    throw new Error(`Quellbild ${datei} ist ${meta.width}x${meta.height}, die Tabelle erwartet ` +
      `${spec.breite}x${spec.hoehe} — neues Bild? Dann Rahmen neu vermessen.`)
  }
  let pipeline = sharp(pfad)
  if (spec.hintergrund === 'transparent') {
    // Fast durchsichtige Reste (Alpha < 20) ganz weg, fast deckende Figuren
    // (die Quelle deckt nur bis 254) ganz deckend — sonst graue Schleier.
    const { data, info } = await sharp(pfad).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 20) data[i] = 0
      else if (data[i] > 235) data[i] = 255
    }
    pipeline = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  } else if (spec.hintergrund !== 'karo') {
    throw new Error(`Unbekannter Hintergrund "${spec.hintergrund}" fuer ${datei}`)
  }
  const { data, info } = await pipeline.flatten({ background: '#ffffff' }).removeAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  return { daten: data, breite: info.width, hoehe: info.height }
}

// ---------- 1. Karomuster entfernen ----------

function faltungZeilen(quelle, kern, breite, hoehe) {
  const r = (kern.length - 1) / 2
  const aus = new Float32Array(breite * hoehe)
  for (let y = 0; y < hoehe; y++) {
    const o = y * breite
    for (let x = 0; x < breite; x++) {
      let summe = 0
      for (let u = -r; u <= r; u++) {
        const xx = x + u
        if (xx >= 0 && xx < breite) summe += quelle[o + xx] * kern[u + r]
      }
      aus[o + x] = summe
    }
  }
  return aus
}

function faltungSpalten(quelle, kern, breite, hoehe) {
  const r = (kern.length - 1) / 2
  const aus = new Float32Array(breite * hoehe)
  for (let x = 0; x < breite; x++) {
    for (let y = 0; y < hoehe; y++) {
      let summe = 0
      for (let u = -r; u <= r; u++) {
        const yy = y + u
        if (yy >= 0 && yy < hoehe) summe += quelle[yy * breite + x] * kern[u + r]
      }
      aus[y * breite + x] = summe
    }
  }
  return aus
}

// `einstellung` (aus QUELLEN) darf je Bild kruemel, hellMin und saum
// ueberschreiben — fuer verschmierte Quellen wie Bild 2
function karoEntfernen(bild, einstellung = {}) {
  const kruemelMax = einstellung.kruemel ?? KRUEMEL_MAX
  const hellMin = einstellung.hellMin ?? HELL_MIN
  const saum = einstellung.saum ?? KARO_SAUM
  const { daten, breite, hoehe } = bild
  const n = breite * hoehe
  const lum = new Float32Array(n)
  const hellNeutral = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    lum[i] = helligkeit(daten, i)
    hellNeutral[i] = farbigkeit(daten, i) <= 24 && lum[i] >= hellMin ? 1 : 0
  }

  // Hann-Fenster und Schwingungs-Kerne (separierbar: Zeilen, dann Spalten)
  const fenster = []
  for (let u = -KARO_RADIUS; u <= KARO_RADIUS; u++) fenster.push(0.5 + 0.5 * Math.cos(Math.PI * u / (KARO_RADIUS + 1)))
  const fensterSumme = fenster.reduce((a, b) => a + b, 0)

  // Lokale Statistik nur ueber hell-neutrale Pixel (Umrisse und Geraete
  // zaehlen nicht mit, so wird auch Karo zwischen Stangen erkannt)
  const maske = new Float32Array(n), lumM = new Float32Array(n), lum2M = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    maske[i] = hellNeutral[i]
    lumM[i] = lum[i] * hellNeutral[i]
    lum2M[i] = lum[i] * lum[i] * hellNeutral[i]
  }
  const glatt = q => faltungSpalten(faltungZeilen(q, fenster, breite, hoehe), fenster, breite, hoehe)
  const sM = glatt(maske), sL = glatt(lumM), sL2 = glatt(lum2M)

  // Energie bei den beiden Diagonal-Frequenzen des Schachbretts; das
  // Maximum ueber zwei Perioden deckt die schwankende Feldgroesse ab
  const signal = new Float32Array(n)
  for (let i = 0; i < n; i++) signal[i] = (lum[i] - KARO_MITTEL) * hellNeutral[i]
  const energie = new Float32Array(n)
  for (const periode of KARO_PERIODEN) {
    const cos = fenster.map((w, k) => w * Math.cos(2 * Math.PI * (k - KARO_RADIUS) / periode))
    const sin = fenster.map((w, k) => w * Math.sin(2 * Math.PI * (k - KARO_RADIUS) / periode))
    const zc = faltungZeilen(signal, cos, breite, hoehe), zs = faltungZeilen(signal, sin, breite, hoehe)
    const cc = faltungSpalten(zc, cos, breite, hoehe), cs = faltungSpalten(zc, sin, breite, hoehe)
    const sc = faltungSpalten(zs, cos, breite, hoehe), ss = faltungSpalten(zs, sin, breite, hoehe)
    for (let i = 0; i < n; i++) {
      const re1 = cc[i] - ss[i], im1 = sc[i] + cs[i]
      const re2 = cc[i] + ss[i], im2 = sc[i] - cs[i]
      const e = Math.hypot(re1, im1) + Math.hypot(re2, im2)
      if (e > energie[i]) energie[i] = e
    }
  }

  const sicher = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    if (!hellNeutral[i] || sM[i] < 1e-3) continue
    const mittel = sL[i] / sM[i]
    const streuung = Math.sqrt(Math.max(0, sL2[i] / sM[i] - mittel * mittel))
    const amplitude = energie[i] / sM[i]
    const abdeckung = sM[i] / (fensterSumme * fensterSumme)
    if (streuung > 1 && amplitude / streuung >= KARO_ANTEIL && amplitude >= KARO_AMPLITUDE &&
        abdeckung >= KARO_ABDECKUNG) sicher[i] = 1
  }

  // Von sicherem Karo aus durch hell-neutrale Pixel fluten, hoechstens
  // `saum` Schritte ueber sicheres Karo hinaus (bis an die Umrisse)
  const abstand = new Int16Array(n).fill(-1)
  const schlange = new Int32Array(n)
  let kopf = 0, ende = 0
  for (let i = 0; i < n; i++) if (sicher[i]) { abstand[i] = 0; schlange[ende++] = i }
  while (kopf < ende) {
    const i = schlange[kopf++]
    const x = i % breite
    const nachbarn = [x > 0 ? i - 1 : -1, x < breite - 1 ? i + 1 : -1, i - breite, i + breite]
    for (const j of nachbarn) {
      if (j < 0 || j >= n || abstand[j] >= 0 || !hellNeutral[j]) continue
      const d = sicher[j] ? 0 : abstand[i] + 1
      if (d > saum) continue
      abstand[j] = d
      schlange[ende++] = j
    }
  }
  const hintergrund = new Uint8Array(n)
  for (let i = 0; i < n; i++) hintergrund[i] = abstand[i] >= 0 ? 1 : 0

  // Kruemel: kleine, helle Inseln (8er-Nachbarschaft), die kein Teil einer
  // Figur sind. Jede Insel wird ganz abgeschritten, bevor ueber sie
  // entschieden wird — sonst zerfiele eine grosse Figur in scheinbar kleine Reste.
  const gesehen = new Uint8Array(n)
  const insel = []
  for (let start = 0; start < n; start++) {
    if (hintergrund[start] || gesehen[start]) continue
    insel.length = 0
    let summe = 0
    const stapel = [start]
    gesehen[start] = 1
    while (stapel.length) {
      const i = stapel.pop()
      insel.push(i)
      summe += lum[i]
      const x = i % breite
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          if ((dx < 0 && x === 0) || (dx > 0 && x === breite - 1)) continue
          const j = i + dy * breite + dx
          if (j < 0 || j >= n || hintergrund[j] || gesehen[j]) continue
          gesehen[j] = 1
          stapel.push(j)
        }
      }
    }
    if (insel.length <= kruemelMax && summe / insel.length >= KRUEMEL_HELL) {
      for (const i of insel) hintergrund[i] = 1
    }
  }

  let weiss = 0
  for (let i = 0; i < n; i++) {
    if (!hintergrund[i]) continue
    daten[i * 3] = daten[i * 3 + 1] = daten[i * 3 + 2] = 255
    weiss++
  }
  return weiss
}

// ---------- 2. Schilder finden und uebermalen ----------

function findeSchilder(bild) {
  const { daten, breite, hoehe } = bild
  const n = breite * hoehe
  const roh = new Uint8Array(n)
  for (let i = 0; i < n; i++) roh[i] = helligkeit(daten, i) < SCHILD_DUNKEL && farbigkeit(daten, i) < 40 ? 1 : 0
  // Um SCHILD_SCHWUND px schrumpfen: trennt Schilder von Geraeten, die sie
  // nur mit einem duennen Rest beruehren (der Rahmen waechst danach wieder)
  let dunkel = roh
  for (let runde = 0; runde < SCHILD_SCHWUND; runde++) {
    const neu = new Uint8Array(n)
    for (let y = 1; y < hoehe - 1; y++) {
      for (let x = 1; x < breite - 1; x++) {
        const i = y * breite + x
        neu[i] = dunkel[i] && dunkel[i - 1] && dunkel[i + 1] && dunkel[i - breite] && dunkel[i + breite] ? 1 : 0
      }
    }
    dunkel = neu
  }
  const markiert = new Int32Array(n).fill(-1)
  const schilder = []
  let nummer = 0
  for (let start = 0; start < n; start++) {
    if (!dunkel[start] || markiert[start] >= 0) continue
    // Zusammenhaengende dunkle Flaeche (8er-Nachbarschaft) mit Rahmen
    let links = breite, rechts = 0, oben = hoehe, unten = 0
    const stapel = [start]
    markiert[start] = nummer
    while (stapel.length) {
      const i = stapel.pop()
      const x = i % breite, y = (i - x) / breite
      if (x < links) links = x
      if (x > rechts) rechts = x
      if (y < oben) oben = y
      if (y > unten) unten = y
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy
          if (xx < 0 || yy < 0 || xx >= breite || yy >= hoehe) continue
          const j = yy * breite + xx
          if (dunkel[j] && markiert[j] < 0) { markiert[j] = nummer; stapel.push(j) }
        }
      }
    }
    // Rahmen um den Schwund wieder vergroessern; die Form wird am
    // UNgeschrumpften Bild geprueft (geschrumpft zerfallen lange Titel mit
    // grosser Schrift in Stuecke)
    const l = Math.max(0, links - SCHILD_SCHWUND), o = Math.max(0, oben - SCHILD_SCHWUND)
    const r = Math.min(breite - 1, rechts + SCHILD_SCHWUND), u = Math.min(hoehe - 1, unten + SCHILD_SCHWUND)
    const b = r - l + 1, h = u - o + 1
    if (h >= 14 && h <= 64 && b >= 40 && b / h >= 1.6) {
      // Loecher = helle Pixel im Rahmen, die vom Rahmenrand aus nicht
      // erreichbar sind (die Buchstaben); ein Schild ist mit ihnen fast
      // ein volles Rechteck
      const hell = (x, y) => !roh[(o + y) * breite + l + x]
      const erreicht = new Uint8Array(b * h)
      const stapelRand = []
      for (let x = 0; x < b; x++) stapelRand.push([x, 0], [x, h - 1])
      for (let y = 0; y < h; y++) stapelRand.push([0, y], [b - 1, y])
      for (const [x, y] of stapelRand) {
        if (!hell(x, y) || erreicht[y * b + x]) continue
        erreicht[y * b + x] = 1
        const st = [[x, y]]
        while (st.length) {
          const [cx, cy] = st.pop()
          for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
            if (nx < 0 || ny < 0 || nx >= b || ny >= h || erreicht[ny * b + nx] || !hell(nx, ny)) continue
            erreicht[ny * b + nx] = 1
            st.push([nx, ny])
          }
        }
      }
      let dunkelAnteil = 0, loecher = 0
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < b; x++) {
          if (!hell(x, y)) dunkelAnteil++
          else if (!erreicht[y * b + x]) loecher++
        }
      }
      if ((dunkelAnteil + loecher) / (b * h) >= 0.8 && loecher / (b * h) >= 0.04) {
        schilder.push([l - SCHILD_RAND, o - SCHILD_RAND, r + 1 + SCHILD_RAND, u + 1 + SCHILD_RAND])
      }
    }
    nummer++
  }
  // Stuecke eines zerfallenen Titels liegen im Rahmen des ganzen Titels:
  // ueberlappende Rahmen zu einem verschmelzen, damit jedes Schild einmal zaehlt
  let verschmolzen = true
  while (verschmolzen) {
    verschmolzen = false
    for (let a = 0; a < schilder.length && !verschmolzen; a++) {
      for (let c = a + 1; c < schilder.length; c++) {
        const p = schilder[a], q = schilder[c]
        if (p[0] < q[2] && q[0] < p[2] && p[1] < q[3] && q[1] < p[3]) {
          schilder[a] = [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[2], q[2]), Math.max(p[3], q[3])]
          schilder.splice(c, 1)
          verschmolzen = true
          break
        }
      }
    }
  }
  return schilder
}

// ---------- 3.-5. Uebungen schneiden ----------

// Inhalts-Rahmen (Tinte = nicht fast-weiss) innerhalb eines Ausschnitts
function istTinte(daten, i) {
  return helligkeit(daten, i) < TINTE_HELL || farbigkeit(daten, i) > 25
}

// Lose Kruemel (Karo-Reste, Schein um Schilder) weiss malen: zusammen-
// haengende Tinte (8er-Nachbarschaft) mit weniger als INSEL_MIN Pixeln
function inselnEntfernen(bild) {
  const { daten, breite, hoehe } = bild
  const n = breite * hoehe
  const gesehen = new Uint8Array(n)
  const insel = []
  for (let start = 0; start < n; start++) {
    if (gesehen[start] || !istTinte(daten, start)) continue
    insel.length = 0
    const stapel = [start]
    gesehen[start] = 1
    while (stapel.length) {
      const i = stapel.pop()
      insel.push(i)
      const x = i % breite, y = (i - x) / breite
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy
          if (xx < 0 || yy < 0 || xx >= breite || yy >= hoehe) continue
          const j = yy * breite + xx
          if (!gesehen[j] && istTinte(daten, j)) { gesehen[j] = 1; stapel.push(j) }
        }
      }
    }
    if (insel.length < INSEL_MIN) for (const i of insel) daten.fill(255, i * 3, i * 3 + 3)
  }
}

function inhaltsRahmen(bild) {
  const { daten, breite, hoehe } = bild
  let links = breite, rechts = -1, oben = hoehe, unten = -1
  for (let y = 0; y < hoehe; y++) {
    for (let x = 0; x < breite; x++) {
      const i = y * breite + x
      if (istTinte(daten, i)) {
        if (x < links) links = x
        if (x > rechts) rechts = x
        if (y < oben) oben = y
        if (y > unten) unten = y
      }
    }
  }
  if (rechts < 0) return null
  return [links, oben, rechts + 1, unten + 1]
}

function ausschnitt(bild, [links, oben, rechts, unten]) {
  const b = rechts - links, h = unten - oben
  const daten = Buffer.alloc(b * h * 3)
  for (let y = 0; y < h; y++) {
    bild.daten.copy(daten, y * b * 3, ((oben + y) * bild.breite + links) * 3, ((oben + y) * bild.breite + rechts) * 3)
  }
  return { daten, breite: b, hoehe: h }
}

// Phase aus dem (gesaeuberten) Sammelbild: Rahmen ausschneiden, Masken
// weiss, Kruemel weg, auf den Inhalt zuschneiden
function phaseSchneiden(sammel, rahmen, masken, key, phase) {
  const roh = ausschnitt(sammel, rahmen)
  for (const m of masken) {
    weissMalen(roh, [m[0] - rahmen[0], m[1] - rahmen[1], m[2] - rahmen[0], m[3] - rahmen[1]])
  }
  inselnEntfernen(roh)
  const innen = inhaltsRahmen(roh)
  if (!innen) throw new Error(`${key}: Phase ${phase} ist nach dem Saeubern leer — Rahmen pruefen`)
  const warnungen = []
  if (innen[0] === 0 || innen[1] === 0 || innen[2] === roh.breite || innen[3] === roh.hoehe) {
    warnungen.push(`${key}: Phase ${phase} reicht bis an den Rahmen — evtl. abgeschnitten oder Nachbar im Bild`)
  }
  return { bild: ausschnitt(roh, innen), warnungen }
}

// Dunkelheit auf halber Aufloesung (fuer die Suche beim Ausrichten)
function dunkelKarte(bild, faktor) {
  const b = Math.floor(bild.breite / faktor), h = Math.floor(bild.hoehe / faktor)
  const karte = new Float32Array(b * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < b; x++) {
      let s = 0
      for (let v = 0; v < faktor; v++) for (let u = 0; u < faktor; u++) {
        s += 255 - helligkeit(bild.daten, (y * faktor + v) * bild.breite + x * faktor + u)
      }
      karte[y * b + x] = s / (faktor * faktor)
    }
  }
  return { karte, breite: b, hoehe: h }
}

function deckung(a, b, ox, oy) {
  // Summe dunkel(a) * dunkel(b) bei b um (ox, oy) gegen a verschoben
  let s = 0
  const x0 = Math.max(0, ox), x1 = Math.min(a.breite, ox + b.breite)
  const y0 = Math.max(0, oy), y1 = Math.min(a.hoehe, oy + b.hoehe)
  for (let y = y0; y < y1; y++) {
    const oa = y * a.breite, ob = (y - oy) * b.breite - ox
    for (let x = x0; x < x1; x++) s += a.karte[oa + x] * b.karte[ob + x]
  }
  return s
}

// Verschiebung (ox, oy) der Phase b gegenueber a (obere linke Ecken).
// Ausgangslage: horizontal mittig, unten buendig (Boden). `modus` aus der
// Tabelle: fehlt er, sucht das Skript die Lage mit der besten Deckung der
// dunklen Flaechen (grob auf halber, fein auf voller Aufloesung) — richtig,
// wenn das Geraet stillsteht und die Person sich bewegt. "mitte" nimmt die
// Ausgangslage (wenn die KI das Geraet je Phase anders gezeichnet hat),
// [dx, dy] verschiebt die Ausgangslage von Hand.
function ausrichten(a, b, modus) {
  const startX = Math.round((a.breite - b.breite) / 2), startY = a.hoehe - b.hoehe
  if (modus === 'mitte') return { ox: startX, oy: startY }
  if (Array.isArray(modus)) return { ox: startX + modus[0], oy: startY + modus[1] }
  if (modus !== undefined) throw new Error(`Unbekannte Ausrichtung ${JSON.stringify(modus)}`)
  const ah = dunkelKarte(a, 2), bh = dunkelKarte(b, 2)
  let best = { ox: startX, oy: startY, wert: -1 }
  const r = Math.round(AUSRICHT_SUCHE / 2)
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const ox = Math.round(startX / 2) + dx, oy = Math.round(startY / 2) + dy
      const wert = deckung(ah, bh, ox, oy)
      if (wert > best.wert) best = { ox: ox * 2, oy: oy * 2, wert }
    }
  }
  const av = dunkelKarte(a, 1), bv = dunkelKarte(b, 1)
  let fein = { ox: best.ox, oy: best.oy, wert: -1 }
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const wert = deckung(av, bv, best.ox + dx, best.oy + dy)
      if (wert > fein.wert) fein = { ox: best.ox + dx, oy: best.oy + dy, wert }
    }
  }
  return fein
}

function aufLeinwand(bild, breite, hoehe, x, y) {
  const daten = Buffer.alloc(breite * hoehe * 3, 255)
  for (let yy = 0; yy < bild.hoehe; yy++) {
    bild.daten.copy(daten, ((y + yy) * breite + x) * 3, yy * bild.breite * 3, (yy + 1) * bild.breite * 3)
  }
  return { daten, breite, hoehe }
}

function alsSharp(bild) {
  return sharp(bild.daten, { raw: { width: bild.breite, height: bild.hoehe, channels: 3 } })
}

async function vorschauPuffer(bild) {
  const innen = VORSCHAU_KANTE - 2 * VORSCHAU_RAND
  const weiss = { r: 255, g: 255, b: 255 }
  return alsSharp(bild)
    .resize({ width: innen, height: innen, fit: 'contain', background: weiss })
    .extend({ top: VORSCHAU_RAND, bottom: VORSCHAU_RAND, left: VORSCHAU_RAND, right: VORSCHAU_RAND, background: weiss })
    .webp({ quality: 80 })
    .toBuffer()
}

function phaseAusPfad(key, relativ) {
  const treffer = new RegExp(`^uebungsbilder/${key}/frame-([1-3])\\.webp$`).exec(relativ)
  if (!treffer) throw new Error(`${key}: Bildpfad passt nicht zum KI-Schema frame-<1-3>.webp: ${relativ}`)
  return Number(treffer[1])
}

// Vermessungs-Hilfe: gesaeubertes Sammelbild mit Gitter (alle 25 px, Zahlen
// alle 100 px) und den gefundenen Schildern als rote Rahmen
async function vermessen(ordner) {
  mkdirSync(ordner, { recursive: true })
  for (const [datei, spec] of Object.entries(QUELLEN)) {
    const bild = await ladeQuelle(datei)
    if (spec.hintergrund === 'karo') karoEntfernen(bild, spec)
    const schilder = findeSchilder(bild)
    let svg = ''
    for (let x = 0; x < bild.breite; x += 25) {
      const gross = x % 100 === 0
      svg += `<line x1="${x}" y1="0" x2="${x}" y2="${bild.hoehe}" stroke="#0066ff" stroke-width="${gross ? 1 : 0.5}" opacity="${gross ? 0.7 : 0.35}"/>`
      if (gross) svg += `<text x="${x + 2}" y="11" font-family="Arial" font-size="11" fill="#0033cc">${x}</text>`
    }
    for (let y = 0; y < bild.hoehe; y += 25) {
      const gross = y % 100 === 0
      svg += `<line x1="0" y1="${y}" x2="${bild.breite}" y2="${y}" stroke="#ff0066" stroke-width="${gross ? 1 : 0.5}" opacity="${gross ? 0.7 : 0.35}"/>`
      if (gross) svg += `<text x="2" y="${y - 2}" font-family="Arial" font-size="11" fill="#cc0033">${y}</text>`
    }
    for (const [l, o, r, u] of schilder) {
      svg += `<rect x="${l}" y="${o}" width="${r - l}" height="${u - o}" fill="none" stroke="#ff0000" stroke-width="2"/>`
    }
    const ueberlagerung = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${bild.breite}" height="${bild.hoehe}">${svg}</svg>`)
    const ziel = path.join(ordner, datei.replace(/\.webp$/, '-vermessen.png'))
    await alsSharp(bild).composite([{ input: ueberlagerung, left: 0, top: 0 }]).png().toFile(ziel)
    console.log(`[uebungsbilder] ${datei}: ${schilder.length} Schilder (Tabelle: ${spec.schilder}) -> ${ziel}`)
    for (const s of schilder) console.log(`    Schild ${s.join(', ')}`)
  }
}

async function schneiden() {
  const argumente = process.argv.slice(2)
  const unbekannt = argumente.filter(a => a.startsWith('--') && a !== '--bogen' && a !== '--vermessen')
  if (unbekannt.length) throw new Error(`Unbekannte Option ${unbekannt.join(', ')} (erlaubt: --bogen <datei>, --vermessen <ordner>)`)
  const vermessenIndex = argumente.indexOf('--vermessen')
  if (vermessenIndex >= 0) {
    const ordner = argumente[vermessenIndex + 1]
    if (!ordner) throw new Error('--vermessen braucht einen Zielordner')
    return vermessen(ordner)
  }
  const bogenIndex = argumente.indexOf('--bogen')
  const bogenDatei = bogenIndex >= 0 ? argumente[bogenIndex + 1] : null
  if (bogenIndex >= 0 && !bogenDatei) throw new Error('--bogen braucht einen Dateinamen')
  const nurKeys = argumente.filter((a, i) => !a.startsWith('--') && (bogenIndex < 0 || i !== bogenIndex + 1))

  const manifest = JSON.parse(readFileSync(manifestPfad, 'utf-8'))
  let eintraege = manifest.filter(e => e.quelle === 'ki')
  if (nurKeys.length) {
    const unbekannt = nurKeys.filter(k => !eintraege.some(e => e.key === k))
    if (unbekannt.length) throw new Error(`Kein KI-Eintrag im Manifest: ${unbekannt.join(', ')}`)
    eintraege = eintraege.filter(e => nurKeys.includes(e.key))
  }
  if (eintraege.length === 0) throw new Error('Keine KI-Eintraege im Manifest gefunden')

  // Jedes benoetigte Sammelbild einmal laden, saeubern und entschildern
  const sammelbilder = new Map()
  for (const datei of new Set(eintraege.map(e => UEBUNGEN[e.key]?.quelle))) {
    if (!datei) continue
    const bild = await ladeQuelle(datei)
    const spec = QUELLEN[datei]
    if (spec.hintergrund === 'karo') {
      const weiss = karoEntfernen(bild, spec)
      console.log(`[uebungsbilder] ${datei}: Karomuster entfernt (${(100 * weiss / (bild.breite * bild.hoehe)).toFixed(1)} % weiss)`)
    }
    const schilder = findeSchilder(bild)
    if (schilder.length !== spec.schilder) {
      throw new Error(`${datei}: ${schilder.length} Schilder gefunden, erwartet ${spec.schilder} — ` +
        'Schild beruehrt eine dunkle Flaeche? Dann eine Maske in die Tabelle.')
    }
    for (const s of schilder) weissMalen(bild, s)
    sammelbilder.set(datei, bild)
  }

  const bogen = []
  const warnungen = []
  for (const eintrag of eintraege) {
    const tabelle = UEBUNGEN[eintrag.key]
    if (!tabelle) throw new Error(`${eintrag.key}: fehlt in der Schnitt-Tabelle`)
    const sammel = sammelbilder.get(tabelle.quelle)
    const phasen = (eintrag.bilder || []).map(p => phaseAusPfad(eintrag.key, p))
    if (phasen.length < 1 || phasen.length > 2) throw new Error(`${eintrag.key}: 1-2 Phasen erwartet, hat ${phasen.length}`)
    const vorschauPhase = tabelle.vorschau ?? phasen[0]

    const geschnitten = new Map()
    for (const phase of new Set([...phasen, vorschauPhase])) {
      const rahmen = tabelle.phasen?.[phase]
      if (!rahmen) throw new Error(`${eintrag.key}: kein Rahmen fuer Phase ${phase} in der Tabelle`)
      const { bild, warnungen: w } = phaseSchneiden(sammel, rahmen, tabelle.masken || [], eintrag.key, phase)
      warnungen.push(...w)
      geschnitten.set(phase, bild)
    }

    // Gemeinsame Leinwand: erste Phase fest, zweite ausgerichtet
    const a = geschnitten.get(phasen[0])
    const b = phasen.length > 1 ? geschnitten.get(phasen[1]) : null
    const lage = b ? ausrichten(a, b, tabelle.ausrichtung) : { ox: 0, oy: 0 }
    const minX = Math.min(0, b ? lage.ox : 0), minY = Math.min(0, b ? lage.oy : 0)
    const maxX = Math.max(a.breite, b ? lage.ox + b.breite : 0)
    const maxY = Math.max(a.hoehe, b ? lage.oy + b.hoehe : 0)
    const breite = maxX - minX + 2 * LEINWAND_RAND, hoehe = maxY - minY + 2 * LEINWAND_RAND
    const leinwaende = [aufLeinwand(a, breite, hoehe, LEINWAND_RAND - minX, LEINWAND_RAND - minY)]
    if (b) leinwaende.push(aufLeinwand(b, breite, hoehe, LEINWAND_RAND - minX + lage.ox, LEINWAND_RAND - minY + lage.oy))

    const ordner = path.join(publicWurzel, 'uebungsbilder', eintrag.key)
    mkdirSync(ordner, { recursive: true })
    for (let k = 0; k < leinwaende.length; k++) {
      await alsSharp(leinwaende[k]).webp({ quality: WEBP_QUALITAET }).toFile(path.join(publicWurzel, eintrag.bilder[k]))
    }
    if (eintrag.vorschau !== `uebungsbilder/${eintrag.key}/vorschau.webp`) {
      throw new Error(`${eintrag.key}: Vorschau-Pfad weicht vom Schema ab: ${eintrag.vorschau}`)
    }
    const vorschau = await vorschauPuffer(geschnitten.get(vorschauPhase))
    await sharp(vorschau).toFile(path.join(publicWurzel, eintrag.vorschau))
    console.log(`[uebungsbilder] ${eintrag.key}: Phase ${phasen.join('+')} ${breite}x${hoehe}` +
      (b ? `, Ausrichtung ${lage.ox},${lage.oy}` : '') + `, Vorschau Phase ${vorschauPhase}`)
    if (bogenDatei) bogen.push({ key: eintrag.key, leinwaende, vorschau })
  }

  for (const w of warnungen) console.warn(`[uebungsbilder] WARNUNG: ${w}`)
  if (bogenDatei) await schreibeBogen(bogen, bogenDatei)
  console.log(`[uebungsbilder] fertig: ${eintraege.length} Uebungen geschnitten`)
}

// Uebersichtsbogen: je Uebung eine Zeile mit Phase A, Phase B, beiden
// halbtransparent uebereinander (so sieht die Mitte der Ueberblendung aus)
// und dem Vorschaubild — zum Pruefen mit dem Auge
async function schreibeBogen(zeilen, datei) {
  const H = 170, abstand = 12, textBreite = 190
  const teile = []
  let y = abstand, breiteMax = 0
  for (const z of zeilen) {
    const bilder = []
    for (const l of z.leinwaende) bilder.push(await alsSharp(l).resize({ height: H }).png().toBuffer())
    if (z.leinwaende.length === 2) {
      const halb = await alsSharp(z.leinwaende[1]).ensureAlpha(0.5).png().toBuffer()
      const misch = await alsSharp(z.leinwaende[0]).composite([{ input: halb }]).png().toBuffer()
      bilder.push(await sharp(misch).resize({ height: H }).png().toBuffer())
    }
    bilder.push(await sharp(z.vorschau).png().toBuffer())
    const text = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${textBreite}" height="${H}">` +
      `<text x="4" y="${H / 2}" font-family="Arial" font-size="15" fill="#1e1f23">${z.key}</text></svg>`)
    teile.push({ input: text, left: abstand, top: y })
    let x = abstand + textBreite
    for (const puffer of bilder) {
      const m = await sharp(puffer).metadata()
      teile.push({ input: puffer, left: x, top: y + Math.max(0, Math.round((H - m.height) / 2)) })
      x += m.width + abstand
    }
    breiteMax = Math.max(breiteMax, x)
    y += H + abstand
  }
  await sharp({ create: { width: breiteMax, height: y, channels: 3, background: '#e9edef' } })
    .composite(teile).png().toFile(datei)
  console.log(`[uebungsbilder] Uebersichtsbogen: ${datei}`)
}

// Die Bausteine sind exportiert, damit man einzelne Schritte beim Vermessen
// neuer Bilder gezielt ausprobieren kann; geschnitten wird nur beim direkten Aufruf.
export { ladeQuelle, karoEntfernen, findeSchilder, weissMalen, phaseSchneiden, ausrichten, aufLeinwand }

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  schneiden().catch((fehler) => {
    console.error(`[uebungsbilder] FEHLER: ${fehler.message}`)
    process.exitCode = 1
  })
}
