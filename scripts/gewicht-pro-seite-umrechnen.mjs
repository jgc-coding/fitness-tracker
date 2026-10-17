#!/usr/bin/env node
/*
 * Alte Eintraege einer Person, die pro Seite notiert hat, auf Gesamtgewicht
 * umrechnen (einmalig, v2.14.0) und die Scheiben-Maschinen mit zwei Seiten in
 * der Cloud markieren.
 *
 * Aufruf (Windows PowerShell, aus dem Hauptbaum):
 *   node .\scripts\gewicht-pro-seite-umrechnen.mjs --nutzer user1 --bis 2026-10-16
 *        (Trockenlauf, schreibt nichts)
 *   ... --ohne <satzId>[,<satzId>]   einzelne Saetze unangetastet lassen
 *   ... --jetzt                      Sicherung, dann schreiben
 *   ... --zurueck --jetzt            Rueckweg: alte Werte aus dem Merker zurueck
 * Aus einem Worktree (dort fehlt privat\):
 *   ... --konto "C:\Projekte\Fitness Tracker\privat\firebase-konto.json"
 *
 * WOZU: Seit v2.14.0 zeigt das Rad bei Langhantel und Scheiben-Maschinen
 * "Pro Seite" und "Gesamt"; gespeichert wird das Gesamt (Summe der Scheiben
 * ohne Stange). Zwei Personen hatten schon immer das Gesamt notiert, eine
 * pro Seite (Gabriel 17.10.2026) — deren alte Werte werden verdoppelt, damit
 * Verlauf, Vorschlag und Rad stimmen. Welche Uebungen zwei Seiten haben,
 * bestimmt allein utils/gewichtProSeite.js (Langhantel, sonst Merker
 * `proSeite` aus der Standardliste).
 *
 * SICHERHEIT:
 *   - Ohne --jetzt IMMER ein Trockenlauf; jede Zeile nennt Satz, Datum,
 *     Vorher und Nachher.
 *   - Jeder umgerechnete Satz traegt danach `gewichtVorUmrechnung` (den alten
 *     Wert): ein zweiter Lauf rechnet ihn nie ein zweites Mal um, und der
 *     Rueckweg weiss, wohin.
 *   - --bis ist Pflicht: nach der Umstellung traegt jeder Gesamtwerte ein, die
 *     ein spaeterer Lauf sonst verdoppeln wuerde.
 *   - Bremse: Laeuft heute ein unfertiges Training mit dieser Person, wird
 *     nichts geschrieben (ein Handy koennte den alten Wert zurueckschreiben).
 *     Saetze ohne gueltiges Gewicht oder Datum halten alles an.
 *   - Vor dem Schreiben liegen Uebungen und Saetze als Sicherung in privat\.
 *     Geschrieben wird in EINEM atomaren Schritt, nur in den Feldern weight,
 *     gewichtVorUmrechnung, proSeite und updatedAt; danach liest das Skript
 *     die Cloud neu und prueft.
 *
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Abbruch, abbruch, arg, hatFlagge, anmelden, holeCollection, schreibeAtomar, nachFirestore, docPfad
} from './lib/cloud-rest.mjs'
import { STANDARD_UEBUNGEN } from '../src/data/standardUebungen.js'
import { normalisiereName } from '../src/utils/uebungsBilder.js'
import { umrechnungPlan } from '../src/utils/gewichtProSeite.js'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KONTO = path.resolve(arg('konto', path.join(WURZEL, 'privat', 'firebase-konto.json')))

function heute() {
  const d = new Date()
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}

// Nur, was nicht geloescht ist (Tombstone neuer als der Datensatz)
function lebende(liste, collection, merker) {
  return liste.filter(r => {
    const t = merker.get(`${collection}:${r.id ?? r._docId}`)
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
  for (const s of saetze) if (s.id == null) s.id = s._docId
  return {
    rohUebungen: uebungen,
    rohSaetze: saetze,
    uebungen: lebende(uebungen, 'exercises', merker),
    logs: lebende(logs, 'workoutLogs', merker),
    saetze: lebende(saetze, 'setLogs', merker)
  }
}

// Maschinen mit zwei Seiten laut Standardliste, die in der Cloud den Merker
// noch nicht tragen
function maschinenPlan(stand) {
  const aendern = []
  const gruende = []
  for (const std of STANDARD_UEBUNGEN.filter(u => u.proSeite)) {
    const treffer = stand.uebungen.filter(u => normalisiereName(u.name) === normalisiereName(std.name))
    if (treffer.length !== 1) {
      gruende.push(`"${std.name}" steht ${treffer.length}-mal in der Cloud (erwartet genau 1)`)
      continue
    }
    if (treffer[0].proSeite !== true) aendern.push(treffer[0])
  }
  return { aendern, gruende }
}

function rueckwegPlan(stand, userId) {
  return stand.saetze
    .filter(s => s.userId === userId && s.gewichtVorUmrechnung != null)
    .map(s => ({ id: s.id, exerciseId: s.exerciseId, date: s.date, reps: s.reps, vorher: s.weight, nachher: s.gewichtVorUmrechnung }))
}

function update(projectId, collection, id, felder, maske = Object.keys(felder)) {
  return {
    update: { name: docPfad(projectId, collection, id), fields: nachFirestore(felder).mapValue.fields },
    updateMask: { fieldPaths: maske },
    currentDocument: { exists: true }
  }
}

function zeile(stand, e, status) {
  const name = stand.uebungen.find(u => u.id === e.exerciseId)?.name || e.exerciseId
  console.log(`  ${status}  ${e.date}  ${name.padEnd(30)} ${String(e.vorher).padStart(7)} -> ${String(e.nachher).padEnd(7)} x ${e.reps}   (${e.id})`)
}

async function main() {
  const userId = arg('nutzer')
  const zurueck = hatFlagge('zurueck')
  const bis = arg('bis')
  const ohne = String(arg('ohne', '') || '').split(',').map(x => x.trim()).filter(Boolean)
  if (!/^user\d+$/.test(String(userId || ''))) abbruch('--nutzer fehlt (z.B. --nutzer user1).')
  if (!zurueck && !/^\d{4}-\d{2}-\d{2}$/.test(String(bis || ''))) abbruch('--bis fehlt (letzter Tag mit alten Pro-Seite-Werten, JJJJ-MM-TT).')

  const sitzung = await anmelden(WURZEL, KONTO)
  console.log(`\n[gewicht-pro-seite] Angemeldet · Projekt ${sitzung.projectId} · ${userId}` +
    (zurueck ? ' · RUECKWEG' : ` · bis ${bis}${ohne.length ? ' · ohne ' + ohne.join(', ') : ''}`))
  const stand = await holeStand(sitzung)
  console.log(`  Gelesen: ${stand.uebungen.length} Uebungen, ${stand.logs.length} Trainings, ${stand.saetze.length} Saetze`)

  const gruende = []
  const offen = stand.logs.filter(l => l.date === heute() && !l.completedAt && (l.userIds || []).includes(userId))
  if (offen.length) gruende.push(`Heute laeuft ein unfertiges Training mit ${userId} (${offen.map(l => l.id).join(', ')}) — erst beenden`)

  let maschinen = { aendern: [], gruende: [] }
  let saetzeAendern
  if (zurueck) {
    saetzeAendern = rueckwegPlan(stand, userId)
    console.log('')
    for (const e of saetzeAendern) zeile(stand, e, 'ZURUECK ')
  } else {
    maschinen = maschinenPlan(stand)
    gruende.push(...maschinen.gruende)
    // Der Plan rechnet mit dem Stand NACH dem Markieren der Maschinen
    const merkerNeu = new Set(maschinen.aendern.map(u => u.id))
    const uebungenDanach = stand.uebungen.map(u => merkerNeu.has(u.id) ? { ...u, proSeite: true } : u)
    const plan = umrechnungPlan(stand.saetze, uebungenDanach, userId, { bis, ohne })
    gruende.push(...plan.gruende)
    for (const id of ohne) {
      if (!plan.ausgenommen.some(e => String(e.id) === id)) gruende.push(`--ohne ${id}: kein Satz dieser Person an einer Uebung mit zwei Seiten`)
    }
    saetzeAendern = plan.aendern
    console.log('\n  Uebungen mit zwei Seiten:')
    for (const u of uebungenDanach.filter(u => u.equipment === 'barbell' || u.proSeite === true)) {
      console.log(`    ${u.name} [${u.equipment}]${merkerNeu.has(u.id) ? '  <- Merker proSeite wird gesetzt' : ''}`)
    }
    console.log('')
    for (const e of plan.aendern) zeile(stand, e, 'AENDERN ')
    for (const e of plan.erledigt) zeile(stand, e, 'ERLEDIGT')
    for (const e of plan.ausgenommen) zeile(stand, e, 'OHNE    ')
    for (const e of plan.nachStichtag) zeile(stand, e, 'NACH BIS')
  }

  if (gruende.length) {
    console.error('\n  BREMSE — es wird NICHTS geschrieben:')
    for (const g of gruende) console.error(`    - ${g}`)
    abbruch('Erst die Gruende oben klaeren, dann erneut laufen lassen.')
  }
  if (!saetzeAendern.length && !maschinen.aendern.length) {
    console.log('\n  Alles schon erledigt. Nichts zu tun.\n')
    return
  }

  const jetzt = new Date().toISOString()
  const writes = [
    ...maschinen.aendern.map(u => update(sitzung.projectId, 'exercises', u.id, { proSeite: true, updatedAt: jetzt })),
    ...saetzeAendern.map(e => zurueck
      // Merker in der Maske, aber nicht in den Feldern: Firestore loescht ihn
      ? update(sitzung.projectId, 'setLogs', e.id, { weight: e.nachher, updatedAt: jetzt }, ['weight', 'updatedAt', 'gewichtVorUmrechnung'])
      : update(sitzung.projectId, 'setLogs', e.id, { weight: e.nachher, gewichtVorUmrechnung: e.vorher, updatedAt: jetzt }))
  ]
  console.log(`\n  ${saetzeAendern.length} Saetze, ${maschinen.aendern.length} Uebungen.`)
  if (!hatFlagge('jetzt')) {
    console.log(`  TROCKENLAUF — es wurde nichts geschrieben (${writes.length} Vorgaenge vorbereitet).`)
    console.log('  Zum wirklichen Schreiben denselben Befehl mit --jetzt wiederholen.\n')
    return
  }

  const sicherung = path.join(path.dirname(KONTO), `cloud-sicherung-pro-seite-${jetzt.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(sicherung, JSON.stringify({ geholt: jetzt, exercises: stand.rohUebungen, setLogs: stand.rohSaetze }, null, 2) + '\n', 'utf8')
  console.log(`  Sicherung von Uebungen und Saetzen: ${sicherung}`)
  console.log(`  Schreibe ${writes.length} Vorgaenge in einem Schritt ...`)
  await schreibeAtomar(sitzung, writes)

  // Nachkontrolle: frisch lesen, jeder geplante Satz traegt den neuen Wert
  const neu = await holeStand(sitzung)
  const abweichungen = []
  for (const e of saetzeAendern) {
    const s = neu.saetze.find(x => x.id === e.id)
    if (!s || s.weight !== e.nachher) abweichungen.push(`${e.id}: erwartet ${e.nachher}, ist ${s?.weight}`)
    else if (zurueck ? s.gewichtVorUmrechnung != null : s.gewichtVorUmrechnung !== e.vorher) abweichungen.push(`${e.id}: Merker stimmt nicht`)
  }
  for (const u of maschinen.aendern) {
    if (neu.uebungen.find(x => x.id === u.id)?.proSeite !== true) abweichungen.push(`${u.name}: Merker proSeite fehlt`)
  }
  if (abweichungen.length) {
    console.error('\n  NACHKONTROLLE MELDET ABWEICHUNGEN:')
    for (const a of abweichungen) console.error(`    - ${a}`)
    abbruch('Bitte melden. Die Sicherung liegt oben.')
  }
  console.log(`\n  Nachkontrolle bestanden: ${saetzeAendern.length} Saetze und ${maschinen.aendern.length} Uebungen tragen den neuen Stand.`)
  console.log('  Die Handys uebernehmen es sofort, wenn die App offen ist, sonst beim naechsten Start.\n')
}

main().catch((err) => {
  if (err instanceof Abbruch) {
    console.error(`\n[gewicht-pro-seite] ${err.message}`)
    if (err.hinweis) console.error(`  ${err.hinweis}`)
  } else {
    console.error('\n[gewicht-pro-seite] Unerwarteter Fehler:', err)
  }
  process.exitCode = 1
})
