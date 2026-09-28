// Misst ein neues ChatGPT-Reihenbild aus und gibt die Zeilen fuer die
// Schnitt-Tabelle (scripts/uebungsbilder-zuschnitt.mjs) aus. Schreibt nichts.
//
// Reihenbild = je Reihe eine Uebung, Reihen durch duenne hellgraue Linien
// getrennt, START links (Phase 1), ENDE rechts (Phase 3), weisser Grund
// (Ablauf und Prompt-Vorlage: docs/uebungsbilder-chatgpt.md).
//
// Aufruf:  node ./scripts/uebungsbilder-reihen-messen.mjs <datei.webp> <key> <key> <key>
//          Keys in der Reihenfolge der Reihen; "<key>:1" fuer eine Halteuebung
//          mit nur einem Bild ueber die ganze Breite (z.B. plank:1).
// Die Datei muss schon in scripts/uebungsbilder-quellen/ liegen; ausgegeben
// werden der QUELLEN-Eintrag und je Uebung der UEBUNGEN-Eintrag. Danach
// Manifest pruefen, schneiden (--bogen) und den Bogen ansehen.

import path from 'node:path'
import sharp from 'sharp'

const RAND = 10 // Luft um den Inhalt
const LINIE_ANTEIL = 0.93 // so viel der Breite muss eine Trennlinie hellgrau sein
const LINIE_DICKE = 5 // dickere graue Baender sind Figuren (Plank), keine Linie
const TINTE = 236 // dunkler = Inhalt

function helligkeit(d, i) {
  return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
}

async function laden(datei) {
  const { data, info } = await sharp(datei).flatten({ background: '#ffffff' }).raw().toBuffer({ resolveWithObject: true })
  return { d: data, w: info.width, h: info.height, c: info.channels }
}

const tinte = (b, x, y) => helligkeit(b.d, (y * b.w + x) * b.c) < TINTE

function trennLinien(b) {
  const zeilen = []
  for (let y = 0; y < b.h; y++) {
    let grau = 0
    for (let x = 0; x < b.w; x++) {
      const L = helligkeit(b.d, (y * b.w + x) * b.c)
      if (L > 150 && L < 243) grau++
    }
    if (grau / b.w > LINIE_ANTEIL) zeilen.push(y)
  }
  const linien = []
  for (const y of zeilen) {
    const l = linien[linien.length - 1]
    if (l && y - l.bis <= 2) l.bis = y
    else linien.push({ von: y, bis: y })
  }
  return linien.filter(l => l.bis - l.von <= LINIE_DICKE)
}

function inhalt(b, x0, y0, x1, y1) {
  let minX = x1, minY = y1, maxX = x0 - 1, maxY = y0 - 1
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!tinte(b, x, y)) continue
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  return maxX < minX ? null : { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 }
}

// Breiteste leere Spalten-Luecke im mittleren Bereich = Grenze START/ENDE
function luecke(b, y0, y1) {
  const a = Math.floor(b.w / 4), e = Math.floor(b.w * 3 / 4)
  let beste = null, start = -1
  for (let x = a; x <= e; x++) {
    let leer = true
    for (let y = y0; y < y1 && leer; y++) if (tinte(b, x, y)) leer = false
    if (leer && start < 0) start = x
    if ((!leer || x === e) && start >= 0) {
      if (!beste || x - start > beste.laenge) beste = { laenge: x - start, mitte: Math.floor((start + x) / 2) }
      start = -1
    }
  }
  return beste
}

async function messen() {
  const [datei, ...keys] = process.argv.slice(2)
  if (!datei || keys.length === 0) throw new Error('Aufruf: <datei.webp> <key> [<key>...] (Halteuebung als key:1)')
  const b = await laden(datei)
  const linien = trennLinien(b)
  const grenzen = [0, ...linien.flatMap(l => [l.von, l.bis + 1]), b.h]
  const reihen = []
  for (let i = 0; i < grenzen.length; i += 2) {
    if (grenzen[i + 1] - grenzen[i] > 60) reihen.push({ y0: grenzen[i], y1: grenzen[i + 1] })
  }
  if (reihen.length !== keys.length) {
    throw new Error(`${reihen.length} Reihen gefunden (Linien bei ${linien.map(l => l.von).join(', ') || 'keiner'}), ${keys.length} Keys angegeben`)
  }
  const name = path.basename(datei)
  console.log(`  '${name}': { breite: ${b.w}, hoehe: ${b.h}, hintergrund: 'weiss', schilder: 0 },`)
  console.log('')
  console.log(`  // ${name}: ${keys.map(k => k.split(':')[0]).join(', ')}`)
  reihen.forEach(({ y0, y1 }, i) => {
    const [key, anzahl] = keys[i].split(':')
    const oben = y0 + 8, unten = y1 - 8
    let teile
    if (anzahl === '1') {
      teile = [[1, 0, b.w]]
    } else {
      const l = luecke(b, oben, unten)
      if (!l || l.laenge < 4) throw new Error(`${key}: keine Luecke zwischen START und ENDE`)
      teile = [[1, 0, l.mitte], [3, l.mitte, b.w]]
    }
    const phasen = teile.map(([phase, x0, x1]) => {
      const r = inhalt(b, x0, oben, x1, unten)
      if (!r) throw new Error(`${key}: Phase ${phase} ist leer`)
      return `${phase}: [${[Math.max(x0, r.x0 - RAND), Math.max(y0 + 4, r.y0 - RAND), Math.min(x1, r.x1 + RAND), Math.min(y1 - 4, r.y1 + RAND)].join(', ')}]`
    })
    console.log(`  '${key}': { quelle: '${name}', phasen: { ${phasen.join(', ')} } },`)
  })
}

messen().catch(fehler => {
  console.error(`[uebungsbilder] FEHLER: ${fehler.message}`)
  process.exitCode = 1
})
