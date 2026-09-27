// Gemeinsame Helfer fuer PC-Skripte, die mit dem App-Konto direkt an die
// Cloud gehen (Firestore ueber REST). Stand 27.09.2026 nutzt sie nur
// scripts/uebungen-dubletten.mjs; lauf-cloud.mjs und uebungen-cloud.mjs haben
// noch eigene Kopien derselben Funktionen (bewusst nicht umgebaut).
//
// ZUGANG: privat\firebase-konto.json { "email": "...", "password": "..." }
// Das Passwort wird nie ausgegeben und nie geloggt.
import fs from 'node:fs'
import path from 'node:path'

// Abbruch per throw, nie per process.exit(): nach einem fetch bringt ein
// hartes exit Node unter Windows zum Absturz ("Assertion failed ... async.c")
export class Abbruch extends Error {
  constructor(satz, hinweis = '') {
    super(satz)
    this.hinweis = hinweis
  }
}

export function abbruch(satz, hinweis = '') {
  throw new Abbruch(satz, hinweis)
}

export function arg(name, standard = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : standard
}

export const hatFlagge = (name) => process.argv.includes(`--${name}`)

// apiKey und projectId stehen im Quelltext der App (kein Geheimnis, der
// Schutz liegt in den Firestore-Regeln) — eine Stelle statt zwei
function firebaseConfig(wurzel) {
  const quelle = fs.readFileSync(path.join(wurzel, 'src', 'db', 'firebase.js'), 'utf8')
  const feld = (name) => quelle.match(new RegExp(`${name}:\\s*'([^']+)'`))?.[1] || null
  const apiKey = feld('apiKey')
  const projectId = feld('projectId')
  if (!apiKey || !projectId) abbruch('apiKey oder projectId nicht in src/db/firebase.js gefunden.')
  return { apiKey, projectId }
}

export async function anmelden(wurzel, kontoPfad) {
  const { apiKey, projectId } = firebaseConfig(wurzel)
  if (!fs.existsSync(kontoPfad)) {
    abbruch(`Zugangsdatei fehlt: ${kontoPfad}`,
      'Aus einem Worktree: --konto "C:\\Projekte\\Fitness Tracker\\privat\\firebase-konto.json" angeben.')
  }
  let konto
  try {
    konto = JSON.parse(fs.readFileSync(kontoPfad, 'utf8'))
  } catch (err) {
    abbruch(`Zugangsdatei ist kein gueltiges JSON: ${err.message}`)
  }
  if (!konto?.email || !konto?.password) abbruch('In der Zugangsdatei fehlt "email" oder "password".')
  const antwort = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: konto.email, password: konto.password, returnSecureToken: true })
  })
  const daten = await antwort.json()
  if (!antwort.ok) {
    abbruch(`Anmeldung fehlgeschlagen (${daten?.error?.message || antwort.status}).`, 'Siehe docs/laufplan-cloud.md, Abschnitt 4.')
  }
  return { token: daten.idToken, projectId }
}

// Firestore speichert jeden Wert mit Typ. Ganze Zahlen als integerValue —
// so schreibt es auch das SDK auf den Handys.
export function nachFirestore(wert) {
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

export function ausFirestore(wert) {
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

export const docPfad = (projectId, collection, id) =>
  `projects/${projectId}/databases/(default)/documents/${collection}/${id}`

// Liest eine ganze Collection; der Schluessel des Dokuments steht in `_docId`
// (bei meta heisst das Feld `key`, sonst `id`)
export async function holeCollection(sitzung, name) {
  const out = []
  let pageToken = null
  do {
    const url = new URL(`${basisUrl(sitzung.projectId)}/${name}`)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const antwort = await fetch(url, { headers: { Authorization: `Bearer ${sitzung.token}` } })
    if (!antwort.ok) abbruch(`Lesen von "${name}" fehlgeschlagen (${antwort.status}): ${(await antwort.text()).slice(0, 300)}`)
    const daten = await antwort.json()
    for (const doc of daten.documents || []) {
      const satz = {}
      for (const [k, v] of Object.entries(doc.fields || {})) satz[k] = ausFirestore(v)
      Object.defineProperty(satz, '_docId', { value: doc.name.split('/').pop(), enumerable: false })
      out.push(satz)
    }
    pageToken = daten.nextPageToken || null
  } while (pageToken)
  return out
}

// Ein commit ist bei Firestore atomar: alles oder nichts. Bis 500 Vorgaenge
// gehen in einen commit — mehr lehnen wir ab, statt still zu stueckeln.
export async function schreibeAtomar(sitzung, writes) {
  if (writes.length > 500) abbruch(`${writes.length} Schreibvorgaenge sind mehr, als in einem Schritt geht (500).`)
  const antwort = await fetch(`${basisUrl(sitzung.projectId)}:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${sitzung.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes })
  })
  if (!antwort.ok) {
    abbruch(`Schreiben fehlgeschlagen (${antwort.status}): ${(await antwort.text()).slice(0, 300)}`,
      'Der Schritt ist atomar: es wurde nichts geschrieben.')
  }
}
