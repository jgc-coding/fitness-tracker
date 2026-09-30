#!/usr/bin/env node
/*
 * Uebungen in der Cloud umbenennen — oder zwei Uebungen Name und Bild tauschen.
 *
 * Aufruf (Windows PowerShell, aus dem Hauptbaum):
 *   node .\scripts\uebungen-korrigieren.mjs                 (Trockenlauf, schreibt nichts)
 *   node .\scripts\uebungen-korrigieren.mjs --jetzt         (Sicherung, dann schreiben)
 *   node .\scripts\uebungen-korrigieren.mjs --zurueck       (Rueckweg als Trockenlauf;
 *                                                            mit --jetzt schreiben)
 * Aus einem Worktree (dort fehlt privat\):
 *   ... --konto "C:\Projekte\Fitness Tracker\privat\firebase-konto.json"
 *
 * WOZU: Am 30.09.2026 fiel Gabriel an den neuen Bildern auf, dass "seated leg
 * curl" und "seated leg extension" von Anfang an vertauscht eingetragen waren:
 * alle Saetze, Notizen und Einstellungen unter dem einen Namen gehoeren zur
 * anderen Uebung. Statt Saetze umzuhaengen, tauschen die beiden Datensaetze
 * Name und Bild — alles, was an der Id haengt (Saetze aller Nutzer, Notizen,
 * Plan-Platz, Geraete-Notiz), bleibt so beisammen. Dazu bekommen "bad girl"
 * und "good girl" ihren richtigen Namen, der Spitzname steht in Klammern.
 * Die Aenderungen stehen unten als Tabelle (KORREKTUREN).
 *
 * SICHERHEIT:
 *   - Ohne --jetzt IMMER ein Trockenlauf.
 *   - Jede Zeile nennt Id, Vorher- und Nachher-Stand. Traegt ein Datensatz
 *     schon den Nachher-Stand, wird er uebersprungen (ein zweiter Lauf aendert
 *     nichts). Traegt er keins von beiden, wird NICHTS geschrieben.
 *   - Bremse: Laeuft heute ein unfertiges Training, wird nichts geschrieben —
 *     ein Handy ohne Netz koennte sonst beim naechsten Satz den alten Namen
 *     zurueckschreiben. Danach darf kein Name doppelt vorkommen, und Name und
 *     Bild muessen nach dem Bild-Manifest zusammenpassen.
 *   - Vor dem Schreiben liegt die komplette Uebungsliste als Sicherung in
 *     privat\ (neben der Zugangsdatei).
 *   - Geschrieben wird in EINEM atomaren Schritt und nur in den Feldern name,
 *     imageKey und updatedAt; danach liest das Skript die Cloud neu und prueft.
 *
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Abbruch, abbruch, arg, hatFlagge, anmelden, holeCollection, schreibeAtomar, nachFirestore, docPfad
} from './lib/cloud-rest.mjs'
import { findeImageKey, eintragFuerKey, normalisiereName } from '../src/utils/uebungsBilder.js'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KONTO = path.resolve(arg('konto', path.join(WURZEL, 'privat', 'firebase-konto.json')))
const MANIFEST = path.join(WURZEL, 'src', 'data', 'uebungskatalog.json')

// Die Ids stehen in der Cloud (gelesen mit scripts/uebungen-cloud.mjs am
// 30.09.2026). Nur name und imageKey werden angefasst.
const KORREKTUREN = [
  // Curl und Extension tauschen Name und Bild (Gabriel 30.09.2026, gilt fuer
  // alle Nutzer und alle Eintraege seit dem ersten Tag)
  {
    id: 'mnugrxj59z8fsjp',
    vorher: { name: 'seated leg curl', imageKey: 'seated-leg-curl' },
    nachher: { name: 'seated leg extension', imageKey: 'leg-extension' }
  },
  {
    id: 'mnugrxjcn2uidy1',
    vorher: { name: 'seated leg extension', imageKey: 'leg-extension' },
    nachher: { name: 'seated leg curl', imageKey: 'seated-leg-curl' }
  },
  // Richtiger Name, Spitzname in Klammern (Bild bleibt)
  {
    id: 'mnugrxizbfppul9',
    vorher: { name: '"bad girl"', imageKey: 'hip-abduction-machine' },
    nachher: { name: 'Hip Abduction (Bad Girl)', imageKey: 'hip-abduction-machine' }
  },
  {
    id: 'mnugrxj22pbuu0v',
    vorher: { name: '"good girl"', imageKey: 'hip-adduction-machine' },
    nachher: { name: 'Hip Adduction (Good Girl)', imageKey: 'hip-adduction-machine' }
  }
]

function heute() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

const traegt = (u, stand) => Object.entries(stand).every(([k, v]) => (u?.[k] ?? null) === v)

// Wie die App: ein Datensatz mit Merker, der nicht neuer ist als die
// Loeschung, gilt als geloescht
function lebende(liste, collection, merker) {
  return liste.filter(r => {
    const t = merker.get(`${collection}:${r.id ?? r.key}`)
    if (!t) return true
    const rt = r.updatedAt || r.createdAt || null
    return rt && rt > t.deletedAt
  })
}

async function holeStand(sitzung) {
  const [uebungen, logs, saetze, deletions] = await Promise.all(
    ['exercises', 'workoutLogs', 'setLogs', 'deletions'].map(n => holeCollection(sitzung, n))
  )
  const merker = new Map(deletions.map(t => [`${t.collection}:${t.recordId}`, t]))
  return {
    roh: uebungen,
    uebungen: lebende(uebungen, 'exercises', merker),
    logs: lebende(logs, 'workoutLogs', merker),
    saetze: lebende(saetze, 'setLogs', merker)
  }
}

// Plan: je Korrektur "aendern" oder "schon erledigt"; alles andere ist ein Grund
// zum Abbruch
function plane(stand, korrekturen) {
  const aendern = []
  const erledigt = []
  const gruende = []
  for (const k of korrekturen) {
    const u = stand.uebungen.find(x => x.id === k.id)
    if (!u) gruende.push(`Uebung ${k.id} (${k.vorher.name}) fehlt in der Cloud oder ist geloescht`)
    else if (traegt(u, k.nachher)) erledigt.push(k)
    else if (traegt(u, k.vorher)) aendern.push(k)
    else gruende.push(`Uebung ${k.id} traegt weder den Vorher- noch den Nachher-Stand (ist: "${u.name}", Bild ${u.imageKey})`)
  }
  return { aendern, erledigt, gruende }
}

function bremse(stand, korrekturen, katalog) {
  const gruende = []
  const offen = stand.logs.filter(l => l.date === heute() && !l.completedAt)
  if (offen.length) {
    gruende.push(`Heute laeuft ein unfertiges Training (${offen.map(l => l.id).join(', ')}) — erst beenden`)
  }
  // Stand danach: jeder Name nur einmal, Name und Bild passen zusammen
  const danach = stand.uebungen.map(u => {
    const k = korrekturen.find(x => x.id === u.id)
    return k ? { ...u, ...k.nachher } : u
  })
  const gesehen = new Map()
  for (const u of danach) {
    const n = normalisiereName(u.name)
    if (gesehen.has(n)) gruende.push(`Name danach doppelt: "${u.name}" (${gesehen.get(n)} und ${u.id})`)
    gesehen.set(n, u.id)
  }
  for (const k of korrekturen) {
    if (!eintragFuerKey(katalog, k.nachher.imageKey)) gruende.push(`Bild ${k.nachher.imageKey} steht nicht im Manifest`)
    const ueberName = findeImageKey(katalog, k.nachher.name)
    if (ueberName !== k.nachher.imageKey) {
      gruende.push(`"${k.nachher.name}" findet ueber den Namen ${ueberName || 'kein Bild'}, soll aber ${k.nachher.imageKey} tragen`)
    }
  }
  return gruende
}

function zeige(stand, k, status) {
  const jeNutzer = {}
  for (const s of stand.saetze.filter(x => x.exerciseId === k.id)) jeNutzer[s.userId] = (jeNutzer[s.userId] || 0) + 1
  const saetze = Object.entries(jeNutzer).sort().map(([n, z]) => `${n} ${z}`).join(', ') || 'keine Saetze'
  console.log(`  ${status}  ${k.id}  "${k.vorher.name}" -> "${k.nachher.name}"` +
    (k.vorher.imageKey !== k.nachher.imageKey ? `  Bild ${k.vorher.imageKey} -> ${k.nachher.imageKey}` : '') +
    `  (${saetze} bleiben dabei)`)
}

function baueWrites(projectId, aendern, jetzt) {
  return aendern.map(k => {
    const felder = { ...k.nachher, updatedAt: jetzt }
    return {
      update: { name: docPfad(projectId, 'exercises', k.id), fields: nachFirestore(felder).mapValue.fields },
      updateMask: { fieldPaths: Object.keys(felder) },
      currentDocument: { exists: true }
    }
  })
}

async function main() {
  const zurueck = hatFlagge('zurueck')
  const korrekturen = zurueck
    ? KORREKTUREN.map(k => ({ id: k.id, vorher: k.nachher, nachher: k.vorher }))
    : KORREKTUREN
  const katalog = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

  const sitzung = await anmelden(WURZEL, KONTO)
  console.log(`\n[uebungen-korrigieren] Angemeldet · Projekt ${sitzung.projectId}${zurueck ? ' · RUECKWEG' : ''}`)
  const stand = await holeStand(sitzung)
  console.log(`  Gelesen: ${stand.uebungen.length} Uebungen, ${stand.logs.length} Trainings, ${stand.saetze.length} Saetze`)

  const plan = plane(stand, korrekturen)
  console.log('')
  for (const k of plan.aendern) zeige(stand, k, 'AENDERN ')
  for (const k of plan.erledigt) zeige(stand, k, 'ERLEDIGT')
  const gruende = [...plan.gruende, ...bremse(stand, korrekturen, katalog)]
  if (gruende.length) {
    console.error('\n  BREMSE — es wird NICHTS geschrieben:')
    for (const g of gruende) console.error(`    - ${g}`)
    abbruch('Erst die Gruende oben klaeren, dann erneut laufen lassen.')
  }
  if (!plan.aendern.length) {
    console.log('\n  Alles schon erledigt. Nichts zu tun.\n')
    return
  }
  console.log('\n  Bremse: bestanden. Kein unfertiges Training heute, danach kein Name doppelt,')
  console.log('  Name und Bild passen zusammen.')

  const jetzt = new Date().toISOString()
  const writes = baueWrites(sitzung.projectId, plan.aendern, jetzt)
  if (!hatFlagge('jetzt')) {
    console.log(`\n  TROCKENLAUF — es wurde nichts geschrieben (${writes.length} Vorgaenge vorbereitet).`)
    console.log('  Zum wirklichen Schreiben denselben Befehl mit --jetzt wiederholen.\n')
    return
  }

  const sicherung = path.join(path.dirname(KONTO), `cloud-sicherung-uebungen-${jetzt.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(sicherung, JSON.stringify({ geholt: jetzt, exercises: stand.roh }, null, 2) + '\n', 'utf8')
  console.log(`\n  Sicherung der Uebungsliste: ${sicherung}`)

  console.log(`  Schreibe ${writes.length} Vorgaenge in einem Schritt ...`)
  await schreibeAtomar(sitzung, writes)

  // Nachkontrolle: frisch aus der Cloud lesen, jede Zeile muss jetzt erledigt sein
  const neu = await holeStand(sitzung)
  const kontrolle = plane(neu, korrekturen)
  if (kontrolle.aendern.length || kontrolle.gruende.length) {
    console.error('\n  NACHKONTROLLE MELDET ABWEICHUNGEN:')
    for (const k of kontrolle.aendern) console.error(`    - ${k.id} traegt noch "${k.vorher.name}"`)
    for (const g of kontrolle.gruende) console.error(`    - ${g}`)
    abbruch('Bitte melden. Die Sicherung liegt oben.')
  }
  console.log(`\n  Nachkontrolle bestanden: alle ${korrekturen.length} Uebungen tragen den neuen Stand.`)
  console.log('  Die Handys uebernehmen es sofort, wenn die App offen ist, sonst beim naechsten Start.\n')
}

main().catch((err) => {
  if (err instanceof Abbruch) {
    console.error(`\n[uebungen-korrigieren] ${err.message}`)
    if (err.hinweis) console.error(`  ${err.hinweis}`)
  } else {
    console.error('\n[uebungen-korrigieren] Unerwarteter Fehler:', err)
  }
  process.exitCode = 1
})
