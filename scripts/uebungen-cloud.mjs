#!/usr/bin/env node
/*
 * Alle Uebungen der App aus der Cloud lesen und mit dem Code abgleichen.
 *
 * Aufruf (Windows PowerShell, aus dem Hauptbaum):
 *   node .\scripts\uebungen-cloud.mjs
 *   node .\scripts\uebungen-cloud.mjs --ziel .\privat\uebungen-stand.json
 * Aus einem Worktree (dort fehlt privat\):
 *   node .\scripts\uebungen-cloud.mjs --konto "C:\Projekte\Fitness Tracker\privat\firebase-konto.json"
 *
 * WOZU: In der App lassen sich Uebungen nachtragen (Katalog -> "+ Neu"). Die
 * stehen nur in der Datenbank, nicht im Code — Claude sah sie bisher nicht und
 * konnte ihnen weder Bild noch Muskeln geben. Das Skript liest den echten
 * Bestand und zeigt je Uebung: steht sie in der Standardliste
 * (src/data/standardUebungen.js), findet das Bild-Manifest sie am Namen,
 * zeigt ihr gespeicherter Bild-Schluessel auf ein Bild, steht sie im Plan,
 * wie oft wurde sie trainiert.
 *
 * NUR LESEN: das Skript schreibt nichts in die Cloud. Die Rohdaten landen als
 * JSON neben der Zugangsdatei (privat\, nie im Repo), die Konsole zeigt nur
 * Namen und Zaehler.
 *
 * ZUGANG wie scripts/lauf-cloud.mjs: privat\firebase-konto.json
 *   { "email": "...", "password": "..." } — das Passwort wird nie ausgegeben.
 *
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STANDARD_UEBUNGEN } from '../src/data/standardUebungen.js'
import { findeImageKey, eintragFuerKey, normalisiereName } from '../src/utils/uebungsBilder.js'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FIREBASE_JS = path.join(WURZEL, 'src', 'db', 'firebase.js')
const MANIFEST = path.join(WURZEL, 'src', 'data', 'uebungskatalog.json')

// Abbruch per throw, nie per process.exit() (siehe Kommentar in lauf-cloud.mjs:
// nach einem fetch bringt ein hartes exit Node unter Windows zum Absturz)
class Abbruch extends Error {
  constructor(satz, hinweis = '') {
    super(satz)
    this.hinweis = hinweis
  }
}

function abbruch(satz, hinweis = '') {
  throw new Abbruch(satz, hinweis)
}

function arg(name, standard = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : standard
}

function heute() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

// --- Zugang (gleiches Verfahren wie lauf-cloud.mjs) ---------------------------

function firebaseConfig() {
  const quelle = fs.readFileSync(FIREBASE_JS, 'utf8')
  const feld = (name) => quelle.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1] || null
  const apiKey = feld('apiKey')
  const projectId = feld('projectId')
  if (!apiKey || !projectId) abbruch('apiKey oder projectId nicht in src/db/firebase.js gefunden.')
  return { apiKey, projectId }
}

const kontoPfad = () => path.resolve(arg('konto', path.join(WURZEL, 'privat', 'firebase-konto.json')))

function konto() {
  const pfad = kontoPfad()
  if (!fs.existsSync(pfad)) {
    abbruch(`Zugangsdatei fehlt: ${pfad}`,
      'Aus einem Worktree: --konto "C:\\Projekte\\Fitness Tracker\\privat\\firebase-konto.json" angeben.')
  }
  let daten
  try {
    daten = JSON.parse(fs.readFileSync(pfad, 'utf8'))
  } catch (err) {
    abbruch(`Zugangsdatei ist kein gueltiges JSON: ${err.message}`)
  }
  if (!daten?.email || !daten?.password) abbruch('In der Zugangsdatei fehlt "email" oder "password".')
  return daten
}

async function anmelden() {
  const { apiKey, projectId } = firebaseConfig()
  const { email, password } = konto()
  const antwort = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  })
  const daten = await antwort.json()
  if (!antwort.ok) {
    abbruch(`Anmeldung fehlgeschlagen (${daten?.error?.message || antwort.status}).`, 'Siehe docs/laufplan-cloud.md, Abschnitt 4.')
  }
  return { token: daten.idToken, projectId }
}

function ausFirestore(wert) {
  if (!wert || typeof wert !== 'object') return null
  if ('nullValue' in wert) return null
  if ('booleanValue' in wert) return wert.booleanValue
  if ('integerValue' in wert) return Number(wert.integerValue)
  if ('doubleValue' in wert) return Number(wert.doubleValue)
  if ('stringValue' in wert) return wert.stringValue
  if ('timestampValue' in wert) return wert.timestampValue
  if ('arrayValue' in wert) return (wert.arrayValue.values || []).map(ausFirestore)
  if ('mapValue' in wert) {
    const out = {}
    for (const [k, v] of Object.entries(wert.mapValue.fields || {})) out[k] = ausFirestore(v)
    return out
  }
  return null
}

async function holeCollection(sitzung, name) {
  const out = []
  let pageToken = null
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${sitzung.projectId}/databases/(default)/documents/${name}`)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const antwort = await fetch(url, { headers: { Authorization: `Bearer ${sitzung.token}` } })
    if (!antwort.ok) abbruch(`Lesen von "${name}" fehlgeschlagen (${antwort.status}): ${(await antwort.text()).slice(0, 300)}`)
    const daten = await antwort.json()
    for (const doc of daten.documents || []) {
      const satz = {}
      for (const [k, v] of Object.entries(doc.fields || {})) satz[k] = ausFirestore(v)
      out.push(satz)
    }
    pageToken = daten.nextPageToken || null
  } while (pageToken)
  return out
}

// --- Abgleich -----------------------------------------------------------------

function abgleich({ uebungen, merker, plaene, tage, saetze }) {
  const katalog = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))
  const geloescht = new Set(merker.filter(m => m.collection === 'exercises').map(m => String(m.recordId)))
  const standard = new Set(STANDARD_UEBUNGEN.map(u => normalisiereName(u.name)))

  // Plan-Nutzung: aktive Plaene, deren Tage die Uebung als Basis oder Alternative tragen
  const aktivePlaene = new Set(plaene.filter(p => p.isActive).map(p => p.id))
  const imPlan = new Map()
  for (const tag of tage) {
    if (!aktivePlaene.has(tag.planId)) continue
    for (const eintrag of tag.exercises || []) {
      for (const id of [eintrag.exerciseId, ...(eintrag.alternativen || [])]) {
        if (!id) continue
        if (!imPlan.has(id)) imPlan.set(id, new Set())
        imPlan.get(id).add(tag.title || tag.id)
      }
    }
  }

  const nutzung = new Map()
  for (const satz of saetze) {
    const n = nutzung.get(satz.exerciseId) || { saetze: 0, zuletzt: '' }
    n.saetze++
    const tag = String(satz.completedAt || satz.createdAt || satz.date || '').slice(0, 10)
    if (tag > n.zuletzt) n.zuletzt = tag
    nutzung.set(satz.exerciseId, n)
  }

  return uebungen
    .filter(u => !geloescht.has(String(u.id)))
    .map(u => {
      const bildKey = findeImageKey(katalog, u.name)
      const gespeichert = u.imageKey || null
      return {
        id: u.id,
        name: u.name,
        muskelgruppe: u.muscleGroup || null,
        geraet: u.equipment || null,
        standard: standard.has(normalisiereName(u.name)),
        bildUeberName: bildKey,
        gespeicherterKey: gespeichert,
        gespeicherterKeyGueltig: Boolean(gespeichert && eintragFuerKey(katalog, gespeichert)),
        imPlan: [...(imPlan.get(u.id) || [])],
        saetze: nutzung.get(u.id)?.saetze || 0,
        zuletzt: nutzung.get(u.id)?.zuletzt || null
      }
    })
    .sort((a, b) => Number(a.standard) - Number(b.standard) || a.name.localeCompare(b.name, 'de'))
}

function zeile(u) {
  const bild = u.gespeicherterKeyGueltig ? `Bild ${u.gespeicherterKey}`
    : u.bildUeberName ? `Bild ueber Namen: ${u.bildUeberName} (noch nicht zugeordnet)`
      : u.gespeicherterKey ? `Bild von Hand: ${u.gespeicherterKey} (verwaist)` : 'KEIN Bild'
  const plan = u.imPlan.length ? `Plan: ${u.imPlan.join(', ')}` : 'nicht im Plan'
  return `  ${u.name}  [${u.muskelgruppe || '?'}, ${u.geraet || '?'}]  ${bild}  ${plan}  ${u.saetze} Saetze${u.zuletzt ? ', zuletzt ' + u.zuletzt : ''}`
}

async function main() {
  const sitzung = await anmelden()
  const [uebungen, merker, plaene, tage, saetze] = await Promise.all(
    ['exercises', 'deletions', 'plans', 'trainingDays', 'setLogs'].map(n => holeCollection(sitzung, n))
  )
  const liste = abgleich({ uebungen, merker, plaene, tage, saetze })
  const nurApp = liste.filter(u => !u.standard)
  const standardFehlt = STANDARD_UEBUNGEN.filter(s => !liste.some(u => normalisiereName(u.name) === normalisiereName(s.name)))

  console.log(`[uebungen-cloud] ${liste.length} Uebungen in der Cloud, davon ${nurApp.length} nur in der App nachgetragen`)
  console.log('\nNur in der App (nicht in der Standardliste):')
  for (const u of nurApp) console.log(zeile(u))
  if (!nurApp.length) console.log('  (keine — jede Uebung der App steht in der Standardliste)')
  console.log('\nStandardliste:')
  for (const u of liste.filter(x => x.standard)) console.log(zeile(u))
  if (standardFehlt.length) {
    console.log('\nIn der Standardliste, aber nicht in der Cloud: ' + standardFehlt.map(s => s.name).join(', '))
  }

  const ziel = path.resolve(arg('ziel', path.join(path.dirname(kontoPfad()), `uebungen-cloud-${heute()}.json`)))
  fs.writeFileSync(ziel, JSON.stringify({ geholt: new Date().toISOString(), uebungen: liste }, null, 2) + '\n', 'utf8')
  console.log(`\nGespeichert: ${ziel}`)
}

main().catch((err) => {
  if (err instanceof Abbruch) {
    console.error(`[uebungen-cloud] FEHLER: ${err.message}`)
    if (err.hinweis) console.error(`  ${err.hinweis}`)
  } else {
    console.error('[uebungen-cloud] FEHLER:', err)
  }
  process.exitCode = 1
})
