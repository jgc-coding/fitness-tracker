#!/usr/bin/env node
/*
 * Prueft die MuscleMap-Komponente gegen den Plan (P6):
 * 1. Alle 18 data-muscle-Ids kommen in der .vue-Datei vor,
 *    und es gibt keine unbekannten data-muscle-Ids.
 * 2. Die Grobgruppen-Tabelle (const GROBGRUPPEN) nennt nur bekannte Ids
 *    und enthaelt alle sieben Gruppen-Schluessel.
 *
 * Aufruf (Windows PowerShell):  node .\scripts\musclemap-pruefen.mjs
 * Exit 0 = alles gruen, Exit 1 = mindestens ein Punkt ist rot.
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const hier = path.dirname(fileURLToPath(import.meta.url))
const vuePfad = path.join(hier, '..', 'src', 'components', 'shared', 'MuscleMap.vue')

const MUSKEL_IDS = [
  'neck', 'traps', 'shoulders', 'chest', 'biceps', 'triceps', 'forearms',
  'abdominals', 'obliques', 'lats', 'middle_back', 'lower_back', 'glutes',
  'abductors', 'adductors', 'quadriceps', 'hamstrings', 'calves'
]
const GRUPPEN = ['chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'full_body']

const fehler = []
let quelle = ''
try {
  quelle = readFileSync(vuePfad, 'utf8')
} catch {
  fehler.push('MuscleMap.vue nicht lesbar: ' + vuePfad)
}

if (quelle) {
  // 1. data-muscle-Ids
  const gefunden = new Set()
  for (const m of quelle.matchAll(/data-muscle="([^"]*)"/g)) gefunden.add(m[1])
  for (const id of MUSKEL_IDS) {
    if (!gefunden.has(id)) fehler.push('data-muscle fehlt: ' + id)
  }
  for (const id of gefunden) {
    if (!MUSKEL_IDS.includes(id)) fehler.push('unbekannte data-muscle-Id: ' + id)
  }
  console.log('data-muscle-Ids gefunden: ' + gefunden.size + ' von ' + MUSKEL_IDS.length)

  // 2. Grobgruppen-Tabelle
  const start = quelle.indexOf('const GROBGRUPPEN')
  if (start === -1) {
    fehler.push('const GROBGRUPPEN nicht gefunden')
  } else {
    const auf = quelle.indexOf('{', start)
    let tiefe = 0
    let zu = -1
    for (let i = auf; i < quelle.length; i++) {
      if (quelle[i] === '{') tiefe++
      else if (quelle[i] === '}') {
        tiefe--
        if (tiefe === 0) { zu = i; break }
      }
    }
    if (auf === -1 || zu === -1) {
      fehler.push('GROBGRUPPEN-Block nicht abgeschlossen')
    } else {
      const block = quelle.slice(auf, zu + 1)
      for (const gruppe of GRUPPEN) {
        const re = new RegExp('(^|[\\s{,])' + gruppe + '\\s*:')
        if (!re.test(block)) fehler.push('Grobgruppe fehlt: ' + gruppe)
      }
      let genannte = 0
      for (const m of block.matchAll(/'([^']*)'/g)) {
        genannte++
        if (!MUSKEL_IDS.includes(m[1])) {
          fehler.push('Grobgruppen-Tabelle nennt unbekannte Id: ' + m[1])
        }
      }
      console.log('Grobgruppen-Tabelle: ' + GRUPPEN.length + ' Gruppen erwartet, ' + genannte + ' Muskel-Ids genannt')
    }
  }
}

if (fehler.length === 0) {
  console.log('MuscleMap-Pruefung: alles gruen')
} else {
  console.error('MuscleMap-Pruefung: ' + fehler.length + ' Fehler')
  for (const f of fehler) console.error('  - ' + f)
  process.exitCode = 1
}
