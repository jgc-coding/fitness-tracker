#!/usr/bin/env node
/*
 * Laufplaene direkt aus der Cloud lesen und in die Cloud schreiben.
 *
 * Aufruf (Windows PowerShell):
 *   node .\scripts\lauf-cloud.mjs holen
 *   node .\scripts\lauf-cloud.mjs holen --user user2 --ziel .\privat\stand-gab.json
 *   node .\scripts\lauf-cloud.mjs schreiben .\privat\laufplan-user2-v2.json
 *   node .\scripts\lauf-cloud.mjs schreiben .\privat\laufplan-user2-v2.json --jetzt
 *
 * WOZU: Die Handys und die Cloud sind laengst synchron (runPlans, runSessions
 * stehen in der Sync-Liste des syncService). Nur der PC haengt bisher nicht mit
 * dran — Aenderungen mussten als Datei hin und her getragen werden. Dieses
 * Skript meldet sich mit DEMSELBEN gemeinsamen Konto an wie die App und redet
 * mit derselben Datenbank. Es entsteht kein zweiter Weg hinein: es gelten die
 * Firestore-Regeln unveraendert (nur diese eine E-Mail darf ueberhaupt etwas).
 *
 * SICHERHEIT:
 *   - "schreiben" ist ohne --jetzt IMMER ein Trockenlauf. Es zeigt nur, was
 *     passieren wuerde.
 *   - Vor jedem echten Schreiben wird der komplette bisherige Stand als
 *     Sicherung nach privat\ gelegt.
 *   - Zusammengefuehrt wird mit demselben Modul wie in der App
 *     (src/utils/runPlanMerge.js). Ein abgehakter Lauf gewinnt also auch hier
 *     immer gegen die Datei — das Skript kann keine Trainingsdaten ueberschreiben.
 *   - Beim Loeschen schreibt es denselben Merker ("Tombstone") wie die App,
 *     sonst laedt ein Handy, das gerade offline war, das Geloeschte wieder hoch.
 *
 * ZUGANG: privat\firebase-konto.json (nicht im Repo, siehe docs/laufplan-cloud.md)
 *   { "email": "...", "password": "..." }
 * Das Passwort wird nie ausgegeben und nie geloggt.
 *
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateRunPlanFile, FORMAT_NAME, FORMAT_VERSION } from '../src/utils/runPlanSchema.js'
import { computeImportDiff, describeDiff } from '../src/utils/runPlanMerge.js'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KONTO_DATEI = path.join(WURZEL, 'privat', 'firebase-konto.json')
const FIREBASE_JS = path.join(WURZEL, 'src', 'db', 'firebase.js')
const COLLECTIONS = { plaene: 'runPlans', laeufe: 'runSessions', merker: 'deletions' }
const BATCH_MAX = 200

/**
 * Bricht ab, indem es wirft — NICHT ueber process.exit().
 *
 * Grund: Nach einem fetch haelt Node offene Verbindungen bereit. Ein hartes
 * process.exit() mittendrin bringt unter Windows die Laufzeit selbst zum
 * Meckern ("Assertion failed ... async.c"), und der Rueckgabewert wird 127
 * statt 1 — eine Fehlermeldung, die eine andere Fehlermeldung verdeckt.
 * Wir werfen stattdessen und setzen den Rueckgabewert ganz am Ende.
 */
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

const hatFlagge = (name) => process.argv.includes(`--${name}`)

/** Heutiger Kalendertag lokal — NIE ueber toISOString(), das verschiebt um die UTC-Differenz. */
function heute() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

// --- Zugang ------------------------------------------------------------------

/**
 * apiKey und projectId stehen im Quelltext der App. Sie sind kein Geheimnis:
 * bei Firebase liegt der Schutz in den Regeln und der gesperrten Registrierung
 * (docs/firebase-absicherung.md). Wir lesen sie hier aus, damit es keine zweite
 * Stelle gibt, die bei einem Projektwechsel mitgepflegt werden muesste.
 */
function firebaseConfig() {
  const quelle = fs.readFileSync(FIREBASE_JS, 'utf8')
  const feld = (name) => quelle.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1] || null
  const apiKey = feld('apiKey')
  const projectId = feld('projectId')
  if (!apiKey || !projectId) abbruch('apiKey oder projectId nicht in src/db/firebase.js gefunden.')
  return { apiKey, projectId }
}

/**
 * Wohin Sicherungen und geholte Staende gehoeren.
 *
 * Normalerweise privat\ neben dem Repo. Wurde --konto angegeben, gilt DESSEN
 * Ordner: das Skript laeuft dann aus einem Worktree, und ein Worktree wird
 * irgendwann geloescht — eine Sicherung, die mit ihm verschwindet, ist keine.
 */
function privatOrdner() {
  const explizit = arg('konto', null)
  return explizit ? path.dirname(path.resolve(explizit)) : path.join(WURZEL, 'privat')
}

function konto() {
  // --konto ist fuer Sonderfaelle da, in denen privat\ woanders liegt (etwa
  // wenn das Skript aus einem Worktree heraus laeuft, der den Ordner nicht hat).
  const pfad = arg('konto', KONTO_DATEI)
  if (!fs.existsSync(pfad)) {
    abbruch(
      `Zugangsdatei fehlt: ${pfad}`,
      'Anlegen mit { "email": "...", "password": "..." } — siehe docs/laufplan-cloud.md Schritt 1.'
    )
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
    const grund = daten?.error?.message || antwort.status
    // Firebase nennt bewusst nicht, WELCHES von beiden falsch ist: sonst
    // koennte man von aussen durchprobieren, welche Adressen ein Konto haben.
    abbruch(
      `Anmeldung fehlgeschlagen (${grund}).`,
      grund === 'INVALID_LOGIN_CREDENTIALS'
        ? 'E-Mail ODER Passwort stimmt nicht; welches von beiden, sagt Firebase absichtlich nicht. Die richtige Adresse steht in der App unter Settings -> Cloud (bei angemeldetem Konto) und in der Firebase Console unter Authentication.'
        : 'Siehe docs/laufplan-cloud.md, Abschnitt 4.'
    )
  }
  return { token: daten.idToken, projectId, email: daten.email }
}

// --- Firestore ueber die REST-Schnittstelle ----------------------------------
//
// Firestore speichert jeden Wert mit seinem Typ ("stringValue", "integerValue",
// ...). Die beiden Funktionen uebersetzen zwischen dieser Form und normalem
// JavaScript. Wichtig: ganze Zahlen muessen als integerValue geschrieben werden,
// weil das SDK auf den Handys es genauso macht — sonst waere derselbe Wert nach
// einem Schreibvorgang vom PC formal ein anderer.

function nachFirestore(wert) {
  if (wert === null || wert === undefined) return { nullValue: null }
  if (typeof wert === 'boolean') return { booleanValue: wert }
  if (typeof wert === 'number') {
    if (!Number.isFinite(wert)) abbruch(`Unzulaessige Zahl im Datensatz: ${wert}`)
    return Number.isSafeInteger(wert) ? { integerValue: String(wert) } : { doubleValue: wert }
  }
  if (typeof wert === 'string') return { stringValue: wert }
  if (Array.isArray(wert)) return { arrayValue: { values: wert.map(nachFirestore) } }
  if (typeof wert === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(wert)) {
      if (v === undefined) continue
      fields[k] = nachFirestore(v)
    }
    return { mapValue: { fields } }
  }
  abbruch(`Unbekannter Werttyp im Datensatz: ${typeof wert}`)
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

function basisUrl(projectId) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`
}

async function holeCollection(sitzung, name) {
  const out = []
  let pageToken = null
  do {
    const url = new URL(`${basisUrl(sitzung.projectId)}/${name}`)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const antwort = await fetch(url, { headers: { Authorization: `Bearer ${sitzung.token}` } })
    if (!antwort.ok) {
      const text = await antwort.text()
      abbruch(`Lesen von "${name}" fehlgeschlagen (${antwort.status}): ${text.slice(0, 300)}`)
    }
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

async function schreibeStapel(sitzung, writes) {
  for (let i = 0; i < writes.length; i += BATCH_MAX) {
    const teil = writes.slice(i, i + BATCH_MAX)
    const antwort = await fetch(`${basisUrl(sitzung.projectId)}:commit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sitzung.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ writes: teil })
    })
    if (!antwort.ok) {
      const text = await antwort.text()
      abbruch(`Schreiben fehlgeschlagen (${antwort.status}): ${text.slice(0, 300)}`, 'Es kann sein, dass ein Teil schon geschrieben wurde. Bitte "holen" pruefen.')
    }
    console.log(`  ... ${Math.min(i + teil.length, writes.length)} von ${writes.length} Schreibvorgaengen erledigt`)
  }
}

const docPfad = (projectId, collection, id) => `projects/${projectId}/databases/(default)/documents/${collection}/${id}`

// --- Stand als Datei im Austauschformat --------------------------------------

function bauePlanDatei(plaene, laeufe, nurUser = null) {
  const gewollt = nurUser ? plaene.filter(p => p.userId === nurUser) : plaene
  const sortiert = [...gewollt].sort((a, b) => Number(a.isActive === true) - Number(b.isActive === true))

  return {
    format: FORMAT_NAME,
    formatVersion: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    plans: sortiert.map((plan) => {
      const eigene = laeufe.filter(s => s.planId === plan.id)
      // Laeufe ohne Plan (von der Uhr) haengen am aktiven Plan der Person,
      // sonst wuerde die Datei sie verlieren — genau wie exportStatus() in der App.
      const heimatlose = plan.isActive === true
        ? laeufe.filter(s => !s.planId && s.userId === plan.userId)
        : []
      return {
        id: plan.id,
        userId: plan.userId,
        name: plan.name,
        isActive: plan.isActive === true,
        planVersion: plan.planVersion || 1,
        goal: plan.goal,
        phases: plan.phases || [],
        weeks: plan.weeks || [],
        sessions: [...eigene, ...heimatlose]
          .sort((a, b) => (a.date === b.date ? String(a.id).localeCompare(String(b.id)) : String(a.date).localeCompare(String(b.date))))
          .map(s => ({
            id: s.id,
            date: s.date,
            type: s.type,
            title: s.title,
            description: s.description || '',
            planned: {
              km: s.planned?.km ?? null,
              minutes: s.planned?.minutes ?? null,
              loops: s.planned?.loops ?? null
            },
            targets: s.targets?.length ? s.targets : null,
            status: s.status,
            actual: s.actual || null,
            feedback: s.feedback || null,
            source: s.source || 'plan',
            originalDate: s.originalDate || null,
            externalId: s.externalId || null,
            unplanned: s.unplanned === true
          }))
      }
    })
  }
}

function zusammenfassung(datei) {
  for (const plan of datei.plans) {
    const zaehle = (status) => plan.sessions.filter(s => s.status === status).length
    const mitVorgabe = plan.sessions.filter(s => s.targets?.length).length
    const mitRueckmeldung = plan.sessions.filter(s => s.feedback).length
    console.log(`  Plan "${plan.name}" (${plan.id}) fuer ${plan.userId}${plan.isActive ? ' [aktiv]' : ''}`)
    console.log(`    Laeufe: ${plan.sessions.length} — geplant ${zaehle('planned')}, erledigt ${zaehle('done')}, ausgelassen ${zaehle('skipped')}`)
    console.log(`    Mit Tempovorgabe: ${mitVorgabe} · mit Rueckmeldung: ${mitRueckmeldung}`)
  }
}

// --- Befehl: holen -----------------------------------------------------------

async function holen(sitzung) {
  const [plaene, laeufe] = await Promise.all([
    holeCollection(sitzung, COLLECTIONS.plaene),
    holeCollection(sitzung, COLLECTIONS.laeufe)
  ])
  console.log(`  Aus der Cloud gelesen: ${plaene.length} Plaene, ${laeufe.length} Laeufe`)

  const nurUser = arg('user')
  if (nurUser && !['user1', 'user2'].includes(nurUser)) abbruch(`--user muss user1 oder user2 sein, nicht "${nurUser}".`)

  const datei = bauePlanDatei(plaene, laeufe, nurUser)
  if (datei.plans.length === 0) abbruch(nurUser ? `Kein Plan fuer ${nurUser} in der Cloud.` : 'Kein Plan in der Cloud.')

  // Der eigene Export muss durch die eigene Pruefung kommen. Tut er das nicht,
  // stimmt etwas mit den Daten in der Cloud nicht — das will man wissen.
  const geprueft = validateRunPlanFile(datei)
  if (!geprueft.ok) {
    console.error('\n[lauf-cloud] ACHTUNG: Der Stand aus der Cloud besteht die eigene Pruefung nicht:')
    for (const fehler of geprueft.errors.slice(0, 20)) console.error('  - ' + fehler)
    if (geprueft.errors.length > 20) console.error(`  ... und ${geprueft.errors.length - 20} weitere`)
    console.error('  Die Datei wird trotzdem geschrieben, damit man sie ansehen kann.\n')
  }

  const ziel = arg('ziel', path.join(privatOrdner(), `cloud-stand-${nurUser || 'alle'}-${heute()}.json`))
  fs.mkdirSync(path.dirname(ziel), { recursive: true })
  fs.writeFileSync(ziel, JSON.stringify(datei, null, 2) + '\n', 'utf8')

  console.log('')
  zusammenfassung(datei)
  console.log(`\n  Geschrieben nach: ${path.resolve(ziel)}\n`)
}

// --- Befehl: schreiben -------------------------------------------------------

async function schreiben(sitzung, quelle) {
  if (!quelle) abbruch('Bitte die Plandatei angeben: node .\\scripts\\lauf-cloud.mjs schreiben .\\privat\\plan.json')
  if (!fs.existsSync(quelle)) abbruch(`Datei nicht gefunden: ${path.resolve(quelle)}`)

  let roh
  try {
    roh = JSON.parse(fs.readFileSync(quelle, 'utf8'))
  } catch (err) {
    abbruch(`Die Datei ist kein gueltiges JSON: ${err.message}`)
  }

  const geprueft = validateRunPlanFile(roh)
  if (!geprueft.ok) {
    console.error(`\n[lauf-cloud] ${geprueft.errors.length} Fehler in ${path.basename(quelle)} — es wird NICHTS geschrieben:`)
    for (const fehler of geprueft.errors) console.error('  - ' + fehler)
    abbruch('Bitte die Datei berichtigen und den Befehl wiederholen.')
  }

  const [plaene, laeufe] = await Promise.all([
    holeCollection(sitzung, COLLECTIONS.plaene),
    holeCollection(sitzung, COLLECTIONS.laeufe)
  ])
  console.log(`  Stand in der Cloud: ${plaene.length} Plaene, ${laeufe.length} Laeufe`)

  const jetzt = new Date().toISOString()
  const diff = computeImportDiff(plaene, laeufe, geprueft.value, heute(), jetzt)

  console.log(`\n  Vorschau: ${describeDiff(diff.summary)}`)
  const zeigeListe = (titel, eintraege) => {
    if (!eintraege.length) return
    console.log(`\n  ${titel}:`)
    for (const e of eintraege.slice(0, 12)) console.log('    ' + e)
    if (eintraege.length > 12) console.log(`    ... und ${eintraege.length - 12} weitere`)
  }
  zeigeListe('Laeufe, die geschrieben werden', diff.sessionsToPut.map(s => `${s.date} ${s.title} (${s.id})`))
  zeigeListe('Laeufe, die entfernt werden', diff.sessionIdsToDelete)
  zeigeListe('Plaene, die geschrieben werden', diff.plansToPut.map(p => `${p.name} (${p.id}), Version ${p.planVersion}`))

  if (diff.summary.unchanged) {
    console.log('\n  Nichts zu tun.\n')
    return
  }

  if (!hatFlagge('jetzt')) {
    console.log('\n  TROCKENLAUF — es wurde nichts geschrieben.')
    console.log('  Zum wirklichen Schreiben denselben Befehl mit --jetzt wiederholen.\n')
    return
  }

  // Sicherung des bisherigen Standes, bevor irgendetwas angefasst wird.
  const sicherung = path.join(privatOrdner(), `cloud-sicherung-${jetzt.replace(/[:.]/g, '-')}.json`)
  fs.mkdirSync(path.dirname(sicherung), { recursive: true })
  fs.writeFileSync(sicherung, JSON.stringify(bauePlanDatei(plaene, laeufe), null, 2) + '\n', 'utf8')
  console.log(`\n  Sicherung des bisherigen Standes: ${path.resolve(sicherung)}`)

  const writes = []
  for (const plan of diff.plansToPut) {
    writes.push({ update: { name: docPfad(sitzung.projectId, COLLECTIONS.plaene, plan.id), fields: nachFirestore(plan).mapValue.fields } })
  }
  for (const lauf of diff.sessionsToPut) {
    writes.push({ update: { name: docPfad(sitzung.projectId, COLLECTIONS.laeufe, lauf.id), fields: nachFirestore(lauf).mapValue.fields } })
  }
  // Loeschen heisst: erst den Merker setzen, dann den Datensatz entfernen.
  // Ohne Merker laedt ein Handy, das gerade offline war, den Lauf wieder hoch.
  for (const id of diff.sessionIdsToDelete) {
    const merker = { id: `${COLLECTIONS.laeufe}:${id}`, collection: COLLECTIONS.laeufe, recordId: String(id), deletedAt: jetzt }
    writes.push({ update: { name: docPfad(sitzung.projectId, COLLECTIONS.merker, merker.id), fields: nachFirestore(merker).mapValue.fields } })
    writes.push({ delete: docPfad(sitzung.projectId, COLLECTIONS.laeufe, id) })
  }

  console.log(`  Schreibe ${writes.length} Vorgaenge in die Cloud ...`)
  await schreibeStapel(sitzung, writes)
  console.log('\n  Fertig. Die Handys uebernehmen es beim naechsten Start der App (oder sofort, wenn sie offen ist).\n')
}

// --- Ablauf ------------------------------------------------------------------

try {
  const befehl = process.argv[2]
  if (!['holen', 'schreiben'].includes(befehl)) {
    abbruch(
      `Unbekannter Befehl ${JSON.stringify(befehl ?? '')}.`,
      'Erlaubt: "holen" oder "schreiben <datei>". Beispiele stehen im Kopf dieser Datei.'
    )
  }

  const sitzung = await anmelden()
  console.log(`\n[lauf-cloud] Angemeldet als ${sitzung.email} · Projekt ${sitzung.projectId}`)

  if (befehl === 'holen') await holen(sitzung)
  else await schreiben(sitzung, process.argv[3])
} catch (err) {
  if (err instanceof Abbruch) {
    console.error(`\n[lauf-cloud] ${err.message}`)
    if (err.hinweis) console.error(`             ${err.hinweis}`)
  } else {
    console.error(`\n[lauf-cloud] Unerwarteter Fehler: ${err?.message || err}`)
    if (err?.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'))
  }
  console.error('')
  process.exitCode = 1
}
