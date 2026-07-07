#!/usr/bin/env node
/*
 * Drift-Waechter fuer die FitTrack-Single-Kopie.
 *
 * single/src/ ist eine bewusste Kopie von src/ (siehe CLAUDE.md). Damit
 * Bugfixes nicht nur in einer der beiden Apps landen, muss jede geteilte
 * Datei byte-identisch sein. Dieses Skript laeuft vor jedem Build
 * (npm run build:all, damit auch im Deploy) und bricht mit Exit 1 ab,
 * wenn die Kopien auseinandergelaufen sind.
 *
 * Bewusst UNTERSCHIEDLICHE Dateien stehen in EXCEPTIONS (mit Grund).
 * Dateien, die es nur in der Haupt-App gibt, stehen in ONLY_MAIN.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const MAIN = join(ROOT, 'src')
const SINGLE = join(ROOT, 'single', 'src')

// Pfade relativ zu src/, mit '/' als Trenner.
const EXCEPTIONS = new Map([
  ['App.vue', 'Single startet keinen Cloud-Sync (kein initSync)'],
  ['db/dexie.js', 'eigener IndexedDB-Name (FitnessTrackerSingle)'],
  ['services/syncService.js', 'Single: No-op-Stub statt Firebase-Sync'],
  ['utils/constants.js', 'USERS enthaelt nur user1'],
  ['utils/notifications.js', 'Icon-Pfade zeigen auf /single/'],
  ['views/TrackingView.vue', 'Ein-Nutzer-UI, kein Sync-Banner'],
  ['views/HistoryView.vue', 'kein User-Umschalter'],
  ['views/SettingsView.vue', 'kein Login/Cloud-Sync, kein History-Seed']
])

const ONLY_MAIN = new Set([
  'db/firebase.js' // Firebase existiert nur in der Haupt-App
])

function listFiles(dir, base = dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...listFiles(full, base))
    else out.push(relative(base, full).split(sep).join('/'))
  }
  return out
}

const mainFiles = new Set(listFiles(MAIN))
const singleFiles = new Set(listFiles(SINGLE))
const problems = []

for (const file of mainFiles) {
  if (ONLY_MAIN.has(file)) {
    if (singleFiles.has(file)) {
      problems.push(`${file}: existiert in single/src, ist aber als nur-Haupt-App markiert (ONLY_MAIN).`)
    }
    continue
  }
  if (!singleFiles.has(file)) {
    problems.push(`${file}: fehlt in single/src — neue Datei nach single/src spiegeln oder in check-drift.mjs eintragen.`)
    continue
  }
  if (EXCEPTIONS.has(file)) continue
  const a = readFileSync(join(MAIN, file))
  const b = readFileSync(join(SINGLE, file))
  if (!a.equals(b)) {
    problems.push(`${file}: weicht zwischen src/ und single/src/ ab — Aenderung in BEIDE Kopien uebernehmen (cp src/${file} single/src/${file}).`)
  }
}

for (const file of singleFiles) {
  if (!mainFiles.has(file) && !ONLY_MAIN.has(file)) {
    problems.push(`${file}: existiert nur in single/src — entweder loeschen oder in check-drift.mjs dokumentieren.`)
  }
}

// Ausnahmen muessen weiterhin existieren, sonst ist die Liste veraltet.
for (const file of EXCEPTIONS.keys()) {
  if (!mainFiles.has(file)) problems.push(`EXCEPTIONS-Eintrag '${file}' zeigt auf eine Datei, die es in src/ nicht mehr gibt.`)
}

if (problems.length > 0) {
  console.error('\n[check-drift] Die FitTrack-Single-Kopie ist auseinandergelaufen:\n')
  for (const p of problems) console.error('  - ' + p)
  console.error(`\n${problems.length} Problem(e). Geteilte Dateien muessen byte-identisch sein (siehe CLAUDE.md).\n`)
  process.exit(1)
}

console.log(`[check-drift] OK — ${mainFiles.size} Dateien geprueft, ${EXCEPTIONS.size} dokumentierte Ausnahmen.`)
