#!/usr/bin/env node
/*
 * Doppelte Uebungen in der Cloud zusammenfuehren.
 *
 * Aufruf (Windows PowerShell, aus dem Hauptbaum):
 *   node .\scripts\uebungen-dubletten.mjs            (Trockenlauf, schreibt nichts)
 *   node .\scripts\uebungen-dubletten.mjs --jetzt    (Sicherung, dann schreiben)
 * Aus einem Worktree (dort fehlt privat\):
 *   node .\scripts\uebungen-dubletten.mjs --konto "C:\Projekte\Fitness Tracker\privat\firebase-konto.json"
 *
 * WOZU: Am 27.09.2026 legte "Standard-Uebungen laden" auf einem Handy, das die
 * Cloud noch nicht kannte, alle Standard-Uebungen ein zweites Mal an. Das
 * Skript biegt jeden Verweis auf eine Kopie (Plan, Alternativen, Standards,
 * Trainings, Saetze, Notizen) auf das Original um und loescht danach die
 * Kopien mit Merker. Die Regeln stehen in src/utils/uebungsDubletten.js,
 * Vertrag: scripts/uebungsdubletten-test.mjs.
 *
 * SICHERHEIT:
 *   - Ohne --jetzt IMMER ein Trockenlauf.
 *   - Bremse: Jeder geaenderte Trainingstag, jedes Training und jeder Satz
 *     muss nach Uebungsnamen genau so aussehen wie vorher. Dazu: kein
 *     Konflikt, danach keine Dublette und kein Verweis mehr auf eine Kopie —
 *     in KEINER Collection. Sonst wird nichts geschrieben.
 *   - Vor dem Schreiben liegt der komplette Cloud-Stand als Sicherung in
 *     privat\ (neben der Zugangsdatei).
 *   - Geschrieben wird in EINEM atomaren Schritt; danach liest das Skript
 *     die Cloud neu und prueft das Ergebnis.
 *
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Abbruch, abbruch, arg, hatFlagge, anmelden, holeCollection, schreibeAtomar, nachFirestore, docPfad
} from './lib/cloud-rest.mjs'
import {
  planeZusammenfuehrung, findeDubletten, findeIds, dublettenSchluessel, vergleicheNamensbilder
} from '../src/utils/uebungsDubletten.js'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KONTO = path.resolve(arg('konto', path.join(WURZEL, 'privat', 'firebase-konto.json')))
const ALLE = ['exercises', 'plans', 'trainingDays', 'workoutLogs', 'setLogs', 'exerciseNotes', 'meta', 'runPlans', 'runSessions', 'deletions']

async function holeAlles(sitzung) {
  const roh = {}
  for (const name of ALLE) roh[name] = await holeCollection(sitzung, name)
  // Wie die App: ein Datensatz mit Merker, der nicht neuer ist als die
  // Loeschung, gilt als geloescht
  const merker = new Map(roh.deletions.map(t => [`${t.collection}:${t.recordId}`, t]))
  const lebend = {}
  for (const name of ALLE) {
    if (name === 'deletions') continue
    lebend[name] = roh[name].filter(r => {
      const t = merker.get(`${name}:${r.id ?? r.key}`)
      if (!t) return true
      const rt = r.updatedAt || r.createdAt || null
      return rt && rt > t.deletedAt
    })
  }
  return { roh, lebend }
}

function stellenText(liste, ids, nameVon) {
  return liste.flatMap(r => findeIds(r, ids).map(p => `${r.title || r.date || r.id}${p} (${nameVon(r, p)})`))
}

function zeigePlan(plan, lebend) {
  const alleUebungen = lebend.exercises
  const name = (id) => alleUebungen.find(u => u.id === id)?.name || id
  const kopien = new Set(plan.ersetzt.keys())
  const zaehle = (id) => {
    const ids = new Set([id])
    const basis = { tage: 0, trainings: 0, saetze: 0, notizen: 0 }
    for (const t of lebend.trainingDays) basis.tage += findeIds(t, ids).length
    for (const w of lebend.workoutLogs) basis.trainings += findeIds(w, ids).length
    basis.saetze = lebend.setLogs.filter(s => s.exerciseId === id).length
    basis.notizen = lebend.exerciseNotes.filter(n => n.exerciseId === id && n.text).length
    return `Plan ${basis.tage}, Trainings ${basis.trainings}, Saetze ${basis.saetze}, Notizen ${basis.notizen}`
  }

  console.log(`\n  ${plan.gruppen.length} Uebungen sind doppelt:`)
  for (const g of plan.gruppen) {
    console.log(`    "${g.original.name}"`)
    console.log(`       bleibt:  ${g.original.id} von ${String(g.original.createdAt).slice(0, 10)}  [${zaehle(g.original.id)}]`)
    for (const k of g.kopien) console.log(`       Kopie:   ${k.id} von ${String(k.createdAt).slice(0, 10)}  [${zaehle(k.id)}]`)
  }

  console.log('\n  Was umgebogen wird (Kopie -> Original, gleicher Name):')
  const stelleName = (r, p) => {
    const wert = p.split(/[.[\]]/).filter(Boolean).reduce((o, k) => o?.[k], r)
    return name(wert)
  }
  const zeilen = [
    ...stellenText(lebend.trainingDays, kopien, stelleName).map(z => `Plan-Tag ${z}`),
    ...stellenText(lebend.workoutLogs, kopien, stelleName).map(z => `Training ${z}`),
    ...lebend.setLogs.filter(s => kopien.has(s.exerciseId)).map(s => `Satz ${s.id} (${name(s.exerciseId)})`),
    ...lebend.exerciseNotes.filter(n => kopien.has(n.exerciseId)).map(n => `Notiz ${n.id} (${name(n.exerciseId)})`)
  ]
  for (const z of zeilen) console.log(`    ${z}`)
  if (!zeilen.length) console.log('    (nichts — keine Kopie wird irgendwo benutzt)')

  if (plan.uebungenPut.length) {
    console.log('\n  Originale, die etwas von ihrer Kopie uebernehmen:')
    for (const u of plan.uebungenPut) {
      const alt = alleUebungen.find(x => x.id === u.id)
      const felder = Object.keys(u).filter(k => k !== 'updatedAt' && JSON.stringify(u[k]) !== JSON.stringify(alt[k]))
      console.log(`    "${u.name}": ${felder.map(f => `${f} ${JSON.stringify(alt[f] ?? null)} -> ${JSON.stringify(u[f])}`).join(', ')}`)
    }
  }
  for (const h of plan.hinweise) console.log(`  Hinweis: ${h}`)

  console.log(`\n  Zu schreiben: ${plan.tagePut.length} Plan-Tage, ${plan.workoutsPut.length} Trainings, ` +
    `${plan.saetzePut.length} Saetze, ${plan.notizenPut.length} Notizen, ${plan.uebungenPut.length} Originale; ` +
    `zu loeschen (mit Merker): ${plan.uebungenLoeschen.length} Kopien, ${plan.notizenLoeschen.length} Notizen`)
}

// Stand nach dem Schreiben, rein im Speicher gerechnet
function standDanach(lebend, plan) {
  const ersetze = (liste, puts) => liste.map(r => puts.find(p => p.id === r.id) || r)
  return {
    ...lebend,
    exercises: ersetze(lebend.exercises.filter(u => !plan.uebungenLoeschen.includes(u.id)), plan.uebungenPut),
    trainingDays: ersetze(lebend.trainingDays, plan.tagePut),
    workoutLogs: ersetze(lebend.workoutLogs, plan.workoutsPut),
    setLogs: ersetze(lebend.setLogs, plan.saetzePut),
    exerciseNotes: [
      ...ersetze(lebend.exerciseNotes.filter(n => !plan.notizenLoeschen.includes(n.id)), plan.notizenPut),
      ...plan.notizenPut.filter(p => !lebend.exerciseNotes.some(n => n.id === p.id))
    ]
  }
}

// Die Bremse: gibt alle Gruende zurueck, NICHT zu schreiben
function bremse(vorher, nachher, kopien, schluesselVon) {
  const gruende = []
  gruende.push(...vergleicheNamensbilder(vorher.trainingDays, nachher.trainingDays, schluesselVon).map(a => `Plan-Tag ${a}`))
  gruende.push(...vergleicheNamensbilder(vorher.workoutLogs, nachher.workoutLogs, schluesselVon).map(a => `Training ${a}`))
  gruende.push(...vergleicheNamensbilder(vorher.setLogs, nachher.setLogs, schluesselVon).map(a => `Satz ${a}`))
  for (const name of ['trainingDays', 'workoutLogs', 'setLogs', 'plans']) {
    if (vorher[name].length !== nachher[name].length) gruende.push(`${name}: Anzahl aendert sich (${vorher[name].length} -> ${nachher[name].length})`)
  }
  const rest = findeIds(nachher, kopien)
  if (rest.length) gruende.push(`Danach zeigen noch ${rest.length} Stellen auf eine Kopie: ${rest.slice(0, 5).join(', ')}`)
  const noch = findeDubletten(nachher.exercises).gruppen
  if (noch.length) gruende.push(`Danach waeren noch ${noch.length} Uebungen doppelt`)
  return gruende
}

function baueWrites(projectId, plan, jetzt) {
  const writes = []
  const put = (collection, r) => writes.push({ update: { name: docPfad(projectId, collection, r.id), fields: nachFirestore(r).mapValue.fields } })
  // Erst alle Verweise umbiegen, dann loeschen — in einem atomaren Schritt
  for (const u of plan.uebungenPut) put('exercises', u)
  for (const t of plan.tagePut) put('trainingDays', t)
  for (const w of plan.workoutsPut) put('workoutLogs', w)
  for (const s of plan.saetzePut) put('setLogs', s)
  for (const n of plan.notizenPut) put('exerciseNotes', n)
  const loesche = (collection, id) => {
    const merker = { id: `${collection}:${id}`, collection, recordId: String(id), deletedAt: jetzt }
    writes.push({ update: { name: docPfad(projectId, 'deletions', merker.id), fields: nachFirestore(merker).mapValue.fields } })
    writes.push({ delete: docPfad(projectId, collection, id) })
  }
  for (const id of plan.uebungenLoeschen) loesche('exercises', id)
  for (const id of plan.notizenLoeschen) loesche('exerciseNotes', id)
  return writes
}

async function main() {
  const sitzung = await anmelden(WURZEL, KONTO)
  console.log(`\n[uebungen-dubletten] Angemeldet · Projekt ${sitzung.projectId}`)
  const { roh, lebend } = await holeAlles(sitzung)
  console.log(`  Gelesen: ${ALLE.map(n => `${n} ${roh[n].length}`).join(', ')}`)

  const jetzt = new Date().toISOString()
  const plan = planeZusammenfuehrung(lebend, jetzt)
  if (plan.ersetzt.size === 0) {
    console.log('\n  Keine doppelten Uebungen. Nichts zu tun.\n')
    return
  }
  zeigePlan(plan, lebend)

  const kopien = new Set(plan.ersetzt.keys())
  const schluesselVon = new Map(lebend.exercises.map(u => [u.id, dublettenSchluessel(u)]))
  const nachher = standDanach(lebend, plan)
  const gruende = [...plan.konflikte.map(k => `Konflikt: ${k}`), ...bremse(lebend, nachher, kopien, schluesselVon)]
  if (gruende.length) {
    console.error('\n  BREMSE — es wird NICHTS geschrieben:')
    for (const g of gruende) console.error(`    - ${g}`)
    abbruch('Erst die Gruende oben klaeren, dann erneut laufen lassen.')
  }
  console.log('\n  Bremse: bestanden. Jeder geaenderte Plan-Tag, jedes Training und jeder Satz')
  console.log('  sieht nach Uebungsnamen genau so aus wie vorher; danach keine Dublette und')
  console.log('  kein Verweis mehr auf eine Kopie.')

  const writes = baueWrites(sitzung.projectId, plan, jetzt)
  if (!hatFlagge('jetzt')) {
    console.log(`\n  TROCKENLAUF — es wurde nichts geschrieben (${writes.length} Vorgaenge vorbereitet).`)
    console.log('  Zum wirklichen Schreiben denselben Befehl mit --jetzt wiederholen.\n')
    return
  }

  const sicherung = path.join(path.dirname(KONTO), `cloud-sicherung-uebungen-${jetzt.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(sicherung, JSON.stringify({ geholt: jetzt, ...roh }, null, 2) + '\n', 'utf8')
  console.log(`\n  Sicherung des kompletten Cloud-Stands: ${sicherung}`)

  console.log(`  Schreibe ${writes.length} Vorgaenge in einem Schritt ...`)
  await schreibeAtomar(sitzung, writes)

  // Nachkontrolle: frisch aus der Cloud lesen
  const { lebend: neu } = await holeAlles(sitzung)
  const probleme = bremse(lebend, neu, kopien, schluesselVon)
  if (probleme.length) {
    console.error('\n  NACHKONTROLLE MELDET ABWEICHUNGEN:')
    for (const p of probleme) console.error(`    - ${p}`)
    abbruch('Bitte melden. Die Sicherung liegt oben.')
  }
  console.log(`\n  Nachkontrolle bestanden: ${neu.exercises.length} Uebungen, keine doppelt, kein Verweis auf eine Kopie,`)
  console.log('  alle Plan-Tage, Trainings und Saetze nach Namen unveraendert.')
  console.log('  Die Handys uebernehmen es sofort, wenn die App offen ist, sonst beim naechsten Start.\n')
}

main().catch((err) => {
  if (err instanceof Abbruch) {
    console.error(`\n[uebungen-dubletten] ${err.message}`)
    if (err.hinweis) console.error(`  ${err.hinweis}`)
  } else {
    console.error('\n[uebungen-dubletten] Unerwarteter Fehler:', err)
  }
  process.exitCode = 1
})
