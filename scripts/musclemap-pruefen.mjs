#!/usr/bin/env node
/*
 * Prueft die Muskelgrafik (MuscleMap) gegen ihren Vertrag:
 * 1. src/data/muskelgrafik.js nennt genau die 18 Muskel-Ids.
 * 2. Die Grobgruppen-Tabelle nennt alle sieben Gruppen und nur bekannte Ids.
 * 3. public/muskelgrafik/ (gebaut von scripts/muskelgrafik-bauen.mjs): die
 *    graue Grundfigur in den Massen aus muskelgrafik.js, dazu je Muskel-Id
 *    eine Maske mit Alphakanal, passend gross, weder leer noch uebervoll.
 * 4. MuscleMap.vue holt Ids, Grobgruppen und Dateien aus muskelgrafik.js und
 *    enthaelt keine eigene Muskel-Liste mehr.
 *
 * Aufruf (Windows PowerShell):  node .\scripts\musclemap-pruefen.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Punkt ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'
import {
  MUSKEL_IDS, GROBGRUPPEN, GRUNDFIGUR, GRUNDFIGUR_BREITE, GRUNDFIGUR_HOEHE,
  MASKE_BREITE, MASKE_HOEHE, maskenPfad
} from '../src/data/muskelgrafik.js'

const hier = path.dirname(fileURLToPath(import.meta.url))
const wurzel = path.join(hier, '..')
const vuePfad = path.join(wurzel, 'src', 'components', 'shared', 'MuscleMap.vue')

// Der Vertrag: diese 18 Ids und keine anderen (so stehen sie im Manifest)
const ERWARTET = [
  'neck', 'traps', 'shoulders', 'chest', 'biceps', 'triceps', 'forearms',
  'abdominals', 'obliques', 'lats', 'middle_back', 'lower_back', 'glutes',
  'abductors', 'adductors', 'quadriceps', 'hamstrings', 'calves'
]
const GRUPPEN = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'full_body']
// Anteil deckender Pixel je Maske: der Nacken ist die kleinste Flaeche
const DECKUNG_MIN = 0.001
const DECKUNG_MAX = 0.2

const fehler = []

// 1. Muskel-Ids
const fehlend = ERWARTET.filter(id => !MUSKEL_IDS.includes(id))
const fremd = MUSKEL_IDS.filter(id => !ERWARTET.includes(id))
if (fehlend.length) fehler.push('Muskel-Id fehlt in muskelgrafik.js: ' + fehlend.join(', '))
if (fremd.length) fehler.push('unbekannte Muskel-Id in muskelgrafik.js: ' + fremd.join(', '))
if (new Set(MUSKEL_IDS).size !== MUSKEL_IDS.length) fehler.push('Muskel-Ids doppelt in muskelgrafik.js')
console.log('Muskel-Ids: ' + MUSKEL_IDS.length + ' von ' + ERWARTET.length)

// 2. Grobgruppen
for (const gruppe of GRUPPEN) {
  if (!Array.isArray(GROBGRUPPEN[gruppe]) || GROBGRUPPEN[gruppe].length === 0) {
    fehler.push('Grobgruppe fehlt oder ist leer: ' + gruppe)
  }
}
for (const [gruppe, ids] of Object.entries(GROBGRUPPEN)) {
  if (!GRUPPEN.includes(gruppe)) fehler.push('unbekannte Grobgruppe: ' + gruppe)
  for (const id of ids || []) {
    if (!ERWARTET.includes(id)) fehler.push('Grobgruppe ' + gruppe + ' nennt unbekannte Id: ' + id)
  }
}
console.log('Grobgruppen: ' + Object.keys(GROBGRUPPEN).length + ' von ' + GRUPPEN.length)

// 3. Dateien unter public/
async function pruefeBild(relativ, breite, hoehe, maske) {
  const datei = path.join(wurzel, 'public', relativ)
  if (!existsSync(datei)) {
    fehler.push('Datei fehlt: public/' + relativ + ' (scripts/muskelgrafik-bauen.mjs laufen lassen)')
    return
  }
  const meta = await sharp(datei).metadata()
  if (meta.width !== breite || meta.height !== hoehe) {
    fehler.push('public/' + relativ + ' ist ' + meta.width + 'x' + meta.height + ', erwartet ' + breite + 'x' + hoehe)
  }
  if (!maske) return
  if (!meta.hasAlpha) {
    fehler.push('Maske ohne Alphakanal: public/' + relativ)
    return
  }
  const { data, info } = await sharp(datei).ensureAlpha().extractChannel(3).raw().toBuffer({ resolveWithObject: true })
  let deckend = 0
  for (let i = 0; i < data.length; i++) if (data[i] > 127) deckend++
  const anteil = deckend / (info.width * info.height)
  if (anteil < DECKUNG_MIN || anteil > DECKUNG_MAX) {
    fehler.push('Maske ' + relativ + ' deckt ' + (100 * anteil).toFixed(2) + ' % (erlaubt ' +
      (100 * DECKUNG_MIN).toFixed(1) + '-' + (100 * DECKUNG_MAX).toFixed(0) + ' %)')
  }
}
await pruefeBild(GRUNDFIGUR, GRUNDFIGUR_BREITE, GRUNDFIGUR_HOEHE, false)
for (const id of ERWARTET) await pruefeBild(maskenPfad(id), MASKE_BREITE, MASKE_HOEHE, true)
console.log('Dateien: Grundfigur und ' + ERWARTET.length + ' Masken geprueft')

// 4. Komponente nutzt die gemeinsame Quelle
let quelle = ''
try {
  quelle = readFileSync(vuePfad, 'utf8')
} catch {
  fehler.push('MuscleMap.vue nicht lesbar: ' + vuePfad)
}
if (quelle) {
  if (!/from '\.\.\/\.\.\/data\/muskelgrafik\.js'/.test(quelle)) {
    fehler.push('MuscleMap.vue importiert src/data/muskelgrafik.js nicht')
  }
  if (/const (ALLE_MUSKELN|GROBGRUPPEN)\s*=/.test(quelle)) {
    fehler.push('MuscleMap.vue fuehrt eine eigene Muskel-Liste (gehoert nach muskelgrafik.js)')
  }
}

if (fehler.length === 0) {
  console.log('MuscleMap-Pruefung: alles gruen')
} else {
  console.error('MuscleMap-Pruefung: ' + fehler.length + ' Fehler')
  for (const f of fehler) console.error('  - ' + f)
  process.exitCode = 1
}
