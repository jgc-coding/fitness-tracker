#!/usr/bin/env node
/*
 * Laeufe von intervals.icu holen - fuer Anpass-Sitzungen am PC.
 *
 * Aufruf (Windows PowerShell):
 *   node .\scripts\intervals-abruf.mjs --user user2
 *   node .\scripts\intervals-abruf.mjs --user user2 --von 2026-09-01 --bis 2026-09-30
 *
 * Ohne --von/--bis werden die letzten 30 Tage geholt.
 *
 * Zugaenge stehen in privat\intervals.json (nicht im Repo, siehe
 * docs/garmin-anbindung.md Schritt 5):
 *   { "user1": { "athleteId": "i123456", "apiKey": "..." }, "user2": { ... } }
 *
 * Der Schluessel wird nie ausgegeben und nie geloggt. Das Ergebnis landet als
 * privat\laeufe-<user>-<von>-<bis>.json und als Tabelle in der Konsole.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { holeLaeufe } from '../src/utils/intervalsApi.js'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ZUGAENGE = path.join(WURZEL, 'privat', 'intervals.json')

function arg(name, standard = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : standard
}

function tag(datum) {
  return [
    datum.getFullYear(),
    String(datum.getMonth() + 1).padStart(2, '0'),
    String(datum.getDate()).padStart(2, '0')
  ].join('-')
}

function abbruch(satz) {
  console.error(`\n[intervals-abruf] ${satz}\n`)
  process.exit(1)
}

const user = arg('user', 'user2')
const heute = new Date()
const vorbei = new Date(heute.getTime() - 30 * 24 * 60 * 60 * 1000)
const von = arg('von', tag(vorbei))
const bis = arg('bis', tag(heute))

if (!/^\d{4}-\d{2}-\d{2}$/.test(von) || !/^\d{4}-\d{2}-\d{2}$/.test(bis)) {
  abbruch('--von und --bis muessen Tage im Format YYYY-MM-DD sein.')
}

if (!fs.existsSync(ZUGAENGE)) {
  abbruch(`${ZUGAENGE} fehlt. Anlegen nach docs/garmin-anbindung.md Schritt 5.`)
}

let zugaenge
try {
  zugaenge = JSON.parse(fs.readFileSync(ZUGAENGE, 'utf8'))
} catch (e) {
  abbruch(`${ZUGAENGE} ist kein gueltiges JSON: ${e.message}`)
}

const zugang = zugaenge?.[user]
if (!zugang?.athleteId || !zugang?.apiKey) {
  abbruch(`Fuer "${user}" stehen in privat\\intervals.json keine vollstaendigen Zugangsdaten.`)
}

let laeufe
try {
  const ergebnis = await holeLaeufe(zugang, von, bis)
  laeufe = ergebnis.laeufe
  if (ergebnis.uebersprungen > 0) {
    console.log(`Hinweis: ${ergebnis.uebersprungen} Aktivitaet(en) ohne Datum oder Kennung uebersprungen.`)
  }
} catch (e) {
  // e.satz ist der Satz fuer Menschen, e.technisch die Ursache.
  abbruch(`${e.satz || e.message}${e.technisch ? ` (${e.technisch})` : ''}`)
}

const ziel = path.join(WURZEL, 'privat', `laeufe-${user}-${von}-${bis}.json`)
fs.writeFileSync(ziel, `${JSON.stringify(laeufe, null, 2)}\n`, 'utf8')

console.log(`\n[intervals-abruf] ${user}: ${laeufe.length} Lauf/Laeufe von ${von} bis ${bis}\n`)

if (laeufe.length > 0) {
  const kopf = ['Datum', 'Typ', 'km', 'Minuten', 'Gesamt', 'Puls', 'Name'].join(' | ')
  console.log('  ' + kopf)
  console.log('  ' + '-'.repeat(kopf.length + 12))
  for (const l of laeufe) {
    console.log('  ' + [
      l.date,
      (l.typ || '').padEnd(9),
      String(l.km ?? '-').padStart(6),
      String(l.minutenBewegung ?? '-').padStart(7),
      String(l.minutenGesamt ?? '-').padStart(6),
      String(l.avgHr ?? '-').padStart(4),
      (l.name || '').slice(0, 40)
    ].join(' | '))
  }
  const summeKm = laeufe.reduce((s, l) => s + (l.km || 0), 0)
  const summeMin = laeufe.reduce((s, l) => s + (l.minutenBewegung || 0), 0)
  console.log(`\n  Summe: ${Math.round(summeKm * 10) / 10} km, ${Math.round(summeMin)} Minuten in Bewegung`)
}

console.log(`\n  Datei: ${ziel}\n`)
