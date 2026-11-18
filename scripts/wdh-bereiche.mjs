#!/usr/bin/env node
/*
 * Wdh-Bereich je Uebung und Person aus der eigenen Historie vorschlagen und
 * die bestaetigten Startwerte in die Cloud schreiben (Steigern-Erinnerung,
 * docs/plan-steigern-erinnerung.md, Schritte 1 und 4).
 *
 * Aufruf (Windows PowerShell, aus dem Hauptbaum):
 *   node .\scripts\wdh-bereiche.mjs            (Analyse + Schreib-Vorschau, schreibt NICHTS in die Cloud)
 *   node .\scripts\wdh-bereiche.mjs --neu      (wie oben, legt die Vorschlags-JSON neu an,
 *                                               auch wenn sie schon existiert)
 *   node .\scripts\wdh-bereiche.mjs --jetzt    (liest die Vorschlags-JSON, Sicherung, dann schreiben)
 * Optional: --datei <pfad>  andere Vorschlags-JSON (Standard: privat\wdh-bereiche-vorschlag.json)
 * Aus einem Worktree (dort fehlt privat\):
 *   ... --konto "C:\Projekte\Fitness Tracker\privat\firebase-konto.json"
 *
 * WOZU: Die App erinnert ans Steigern, wenn eine Person beim letzten Mal in
 * allen Saetzen am oberen Ende ihres Wdh-Bereichs war. Ohne gespeicherten
 * Bereich gilt 8-12. Wer eine Uebung bewusst anders trainiert (etwa 5-8 oder
 * 15-20), bekaeme sonst zu frueh oder nie eine Erinnerung. Das Skript liest
 * darum die Saetze der letzten 6 Monate und schlaegt je Uebung und Person
 * einen Bereich vor; Gabriel bestaetigt oder korrigiert die Tabelle, erst
 * dann schreibt --jetzt die Startwerte.
 *
 * REGEL (Analyse):
 *   - Zeitraum: die letzten 6 Monate in Kalendertagen, lokales Datum (das
 *     Feld `date` am Satz; fehlt es, der lokale Tag von `createdAt`).
 *   - Gezaehlt werden Saetze mit Wdh >= 1. Saetze ohne Wdh (null/leer/0),
 *     Aufwaermsaetze und geloeschte Saetze (Merker in `deletions`, wie die
 *     App) zaehlen nicht; Saetze geloeschter Uebungen ebenso wenig.
 *   - Unter 6 Saetzen: kein Vorschlag, es gilt 8-12.
 *   - Liegen mindestens 90 % der Wdh in 8-12: 8-12.
 *   - Sonst 10.- und 90.-Perzentil (lineare Interpolation), auf ganze Wdh
 *     gerundet. Ergibt das nur eine Zahl (etwa 15-15), gibt es keinen
 *     Schreibwert, sondern einen Hinweis: den Bereich legt Gabriel fest.
 *   - "Unterscheiden sich": ja, wenn mindestens zwei Personen einen
 *     Vorschlag haben und diese nicht gleich sind; "-", wenn weniger als zwei
 *     Personen genug Saetze haben (Entscheidung 4: je Person nur bei
 *     Unterschieden, sonst ein Wert fuer alle).
 *
 * AUSGABE (neben der Zugangsdatei, also privat\, nie im Repo):
 *   - Konsole: kompakte Tabelle.
 *   - wdh-bereiche-vorschlag.md: dieselbe Tabelle lesbar, mit Zahlen.
 *   - wdh-bereiche-vorschlag.json: die Datei, die --jetzt liest. Je Uebung
 *     steht unter `schreiben` der Bereich je Person; null = nichts schreiben,
 *     die App nimmt 8-12. Der Vorschlag fuellt `schreiben` nur dort, wo er
 *     von 8-12 abweicht. Gabriel darf jeden Wert aendern, auch null setzen.
 *     Eine vorhandene JSON wird NIE still ueberschrieben (sie kann
 *     korrigiert sein) — neu anlegen nur mit --neu.
 *
 * SCHREIBEN (--jetzt):
 *   - Je Paar ein meta-Dokument in genau der Form, in der die App meta
 *     ablegt (stores/auth.js, syncService pushRecord):
 *       meta/wdhBereich_<userId>_<exerciseId> =
 *         { key: 'wdhBereich_<userId>_<exerciseId>', value: { min, max }, updatedAt: ISO }
 *     Der bestehende Sync uebernimmt es (updatedAt ist neuer als alles Lokale).
 *   - Bremse, dann wird NICHTS geschrieben: unbekannte Person, Uebung fehlt
 *     oder ist geloescht, min/max keine ganze Zahl, nicht 1 <= min < max <= 50,
 *     oder in der Cloud steht fuer das Paar schon ein ANDERER Bereich (nie
 *     still ueberschreiben — in der JSON auf null setzen oder in der App
 *     aendern). Steht dort schon derselbe Bereich, wird das Paar
 *     uebersprungen (ein zweiter Lauf aendert nichts).
 *   - Vorher liegt der komplette meta-Bestand (samt meta-Merkern aus
 *     `deletions`) als Sicherung in privat\.
 *   - Geschrieben wird in EINEM atomaren Schritt, nur neue Dokumente
 *     (`exists: false`); danach liest das Skript die Cloud neu und prueft.
 *
 * Ohne --jetzt liest das Skript nur (Anmeldung, dann ausschliesslich GET).
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Abbruch, abbruch, arg, hatFlagge, anmelden, holeCollection, schreibeAtomar, nachFirestore, docPfad
} from './lib/cloud-rest.mjs'
import { USERS } from '../src/utils/constants.js'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const KONTO = path.resolve(arg('konto', path.join(WURZEL, 'privat', 'firebase-konto.json')))
const PRIVAT = path.dirname(KONTO)
const JSON_DATEI = path.resolve(arg('datei', path.join(PRIVAT, 'wdh-bereiche-vorschlag.json')))
const MD_DATEI = path.join(PRIVAT, 'wdh-bereiche-vorschlag.md')

const NUTZER = USERS.map(u => u.id)
const STANDARD = { min: 8, max: 12 }
const MONATE = 6
const MINDEST_SAETZE = 6
const MINDEST_ANTEIL = 0.9
const PERZENTILE = [0.1, 0.9]
const GRENZEN = { min: 1, max: 50 }

const pad = (n) => String(n).padStart(2, '0')
const datumText = (d) => [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-')
const meta = (userId, exerciseId) => `wdhBereich_${userId}_${exerciseId}`
const bereichText = (b) => (b ? `${b.min}-${b.max}` : '-')
const gleich = (a, b) => Boolean(a && b && a.min === b.min && a.max === b.max)

// Kalendermonate zurueck, am Monatsende geklemmt (31.08. -> 28./29.02.)
function minusMonate(d, monate) {
  const ziel = new Date(d.getFullYear(), d.getMonth() - monate, 1)
  const letzter = new Date(ziel.getFullYear(), ziel.getMonth() + 1, 0).getDate()
  ziel.setDate(Math.min(d.getDate(), letzter))
  return ziel
}

// Wie src/utils/verlauf.js: Zahl, Komma-Text oder nichts
function alsZahl(wert) {
  if (typeof wert === 'number') return Number.isFinite(wert) ? wert : null
  if (typeof wert === 'string' && wert.trim() !== '') {
    const n = Number(wert.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return null
}

// Lokaler Kalendertag des Satzes: `date` (so schreibt die App), sonst createdAt
function satzTag(satz) {
  if (typeof satz.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(satz.date)) return satz.date
  const t = satz.createdAt ? new Date(satz.createdAt) : null
  return t && !Number.isNaN(t.getTime()) ? datumText(t) : null
}

// Wie die App: ein Datensatz mit Merker, der nicht neuer ist als die
// Loeschung, gilt als geloescht
function lebende(liste, collection, merker, schluessel = (r) => r.id) {
  return liste.filter(r => {
    const t = merker.get(`${collection}:${schluessel(r)}`)
    if (!t) return true
    const rt = r.updatedAt || r.createdAt || null
    return Boolean(rt && rt > t.deletedAt)
  })
}

// Perzentil mit linearer Interpolation (p zwischen 0 und 1), Liste sortiert
function perzentil(sortiert, p) {
  const pos = (sortiert.length - 1) * p
  const u = Math.floor(pos)
  const o = Math.ceil(pos)
  return sortiert[u] + (sortiert[o] - sortiert[u]) * (pos - u)
}

// --- Analyse ------------------------------------------------------------------

function analysePerson(wdh) {
  if (!wdh.length) return { saetze: 0, vorschlag: null, grund: 'keine-saetze' }
  if (wdh.length < MINDEST_SAETZE) return { saetze: wdh.length, vorschlag: null, grund: 'zu-wenig-daten' }
  const sortiert = [...wdh].sort((a, b) => a - b)
  const imStandard = wdh.filter(r => r >= STANDARD.min && r <= STANDARD.max).length
  const anteil = imStandard / wdh.length
  const p10 = perzentil(sortiert, PERZENTILE[0])
  const p90 = perzentil(sortiert, PERZENTILE[1])
  const basis = {
    saetze: wdh.length,
    anteil8bis12: Math.round(anteil * 100) / 100,
    p10: Math.round(p10 * 10) / 10,
    p90: Math.round(p90 * 10) / 10,
    kleinste: sortiert[0],
    groesste: sortiert[sortiert.length - 1]
  }
  if (anteil >= MINDEST_ANTEIL) return { ...basis, vorschlag: { ...STANDARD }, grund: '90-prozent-in-8-12' }
  const vorschlag = { min: Math.round(p10), max: Math.round(p90) }
  if (vorschlag.min >= vorschlag.max) return { ...basis, vorschlag, grund: 'nur-eine-zahl' }
  return { ...basis, vorschlag, grund: 'perzentile' }
}

function analysiere(stand, von, bis) {
  const zaehler = { gelesen: stand.saetzeRoh.length, geloescht: 0, ohneDatum: 0, ausserhalb: 0, aufwaermen: 0, ohneWdh: 0, ohneUebung: 0, fremdePerson: 0, ausgewertet: 0 }
  zaehler.geloescht = stand.saetzeRoh.length - stand.saetze.length
  const uebungen = new Map(stand.uebungen.map(u => [u.id, u]))
  const wdhJe = new Map() // exerciseId -> { userId -> [wdh] }
  for (const satz of stand.saetze) {
    const tag = satzTag(satz)
    if (!tag) { zaehler.ohneDatum++; continue }
    if (tag < von || tag > bis) { zaehler.ausserhalb++; continue }
    if (satz.isWarmup) { zaehler.aufwaermen++; continue }
    const wdh = alsZahl(satz.reps)
    if (wdh === null || wdh < 1) { zaehler.ohneWdh++; continue }
    if (!uebungen.has(satz.exerciseId)) { zaehler.ohneUebung++; continue }
    if (!NUTZER.includes(satz.userId)) { zaehler.fremdePerson++; continue }
    if (!wdhJe.has(satz.exerciseId)) wdhJe.set(satz.exerciseId, Object.fromEntries(NUTZER.map(n => [n, []])))
    wdhJe.get(satz.exerciseId)[satz.userId].push(wdh)
    zaehler.ausgewertet++
  }

  const liste = []
  for (const [exerciseId, jeNutzer] of wdhJe) {
    const analyse = Object.fromEntries(NUTZER.map(n => [n, analysePerson(jeNutzer[n])]))
    const mitVorschlag = NUTZER.filter(n => analyse[n].vorschlag)
    const unterscheiden = mitVorschlag.length < 2 ? '-'
      : mitVorschlag.every(n => gleich(analyse[n].vorschlag, analyse[mitVorschlag[0]].vorschlag)) ? 'nein' : 'ja'
    const schreiben = Object.fromEntries(NUTZER.map(n => {
      const a = analyse[n]
      return [n, a.grund === 'perzentile' && !gleich(a.vorschlag, STANDARD) ? { ...a.vorschlag } : null]
    }))
    const hinweise = NUTZER.filter(n => analyse[n].grund === 'nur-eine-zahl')
      .map(n => `${n}: fast alle Saetze mit ${analyse[n].vorschlag.min} Wdh, kein Bereich ableitbar - bitte selbst festlegen`)
    liste.push({ exerciseId, name: uebungen.get(exerciseId).name || exerciseId, unterscheiden, analyse, schreiben, hinweise })
  }
  liste.sort((a, b) => String(a.name).localeCompare(String(b.name), 'de'))
  return { liste, zaehler }
}

// --- Cloud lesen --------------------------------------------------------------

async function holeStand(sitzung, mitSaetzen) {
  const namen = ['exercises', 'deletions', 'meta', ...(mitSaetzen ? ['setLogs'] : [])]
  const [uebungen, deletions, metaRoh, saetzeRoh = []] = await Promise.all(namen.map(n => holeCollection(sitzung, n)))
  const merker = new Map(deletions.map(t => [`${t.collection}:${t.recordId}`, t]))
  return {
    uebungen: lebende(uebungen, 'exercises', merker),
    saetzeRoh,
    saetze: lebende(saetzeRoh, 'setLogs', merker),
    metaRoh,
    metaMerker: deletions.filter(t => t.collection === 'meta'),
    meta: lebende(metaRoh, 'meta', merker, (r) => r.key ?? r._docId)
  }
}

// --- Ausgabe der Analyse ------------------------------------------------------

function zelle(a) {
  if (!a.saetze) return '-'
  if (!a.vorschlag) return `(8-12) n${a.saetze}`
  return `${bereichText(a.vorschlag)}${a.grund === 'nur-eine-zahl' ? '!' : ''} n${a.saetze}`
}

function konsolenTabelle(liste) {
  const breite = Math.min(34, Math.max(6, ...liste.map(u => String(u.name).length)))
  const kopf = 'Uebung'.padEnd(breite) + '  ' + NUTZER.map(n => n.padEnd(14)).join('') + 'unterscheiden'
  console.log(kopf)
  console.log('-'.repeat(kopf.length))
  for (const u of liste) {
    const name = String(u.name).length > breite ? String(u.name).slice(0, breite - 1) + '~' : String(u.name)
    console.log(name.padEnd(breite) + '  ' + NUTZER.map(n => zelle(u.analyse[n]).padEnd(14)).join('') + u.unterscheiden)
  }
  console.log('\n  nN = ausgewertete Saetze; (8-12) = unter 6 Saetzen, kein Vorschlag; ! = nur eine Zahl, bitte festlegen')
}

function mdZelle(a) {
  if (!a.saetze) return '–'
  if (!a.vorschlag) return `(8-12) · ${a.saetze} Sätze, zu wenig`
  const teile = [`**${bereichText(a.vorschlag)}**`, `${a.saetze} Sätze`, `${Math.round(a.anteil8bis12 * 100)} % in 8-12`]
  if (a.grund !== '90-prozent-in-8-12') teile.push(`P10 ${a.p10} / P90 ${a.p90}`)
  if (a.grund === 'nur-eine-zahl') teile.push('⚠ nur eine Zahl')
  return teile.join(' · ')
}

function schreibeMarkdown({ liste, zaehler }, von, bis, jsonStatus, vorschau) {
  const z = []
  z.push('# Wdh-Bereiche: Vorschlag aus den letzten 6 Monaten', '')
  z.push(`Erstellt ${new Date().toISOString()} von \`scripts/wdh-bereiche.mjs\` (nur gelesen).`)
  z.push(`Zeitraum ${von} bis ${bis} (lokale Kalendertage).`, '')
  z.push('**Regel:** Liegen mindestens 90 % der Wdh in 8-12, bleibt 8-12. Sonst 10.- und 90.-Perzentil, '
    + 'auf ganze Wdh gerundet. Unter 6 Sätzen kein Vorschlag, dann gilt 8-12. '
    + 'Gezählt werden Sätze mit Wdh ab 1; ohne Wdh, Aufwärmsätze und Gelöschtes zählen nicht.', '')
  z.push(`**Sätze:** ${zaehler.ausgewertet} ausgewertet von ${zaehler.gelesen} in der Cloud `
    + `(gelöscht ${zaehler.geloescht}, ohne Datum ${zaehler.ohneDatum}, außerhalb des Zeitraums ${zaehler.ausserhalb}, ohne Wdh ${zaehler.ohneWdh}, `
    + `Aufwärmen ${zaehler.aufwaermen}, Übung gelöscht/unbekannt ${zaehler.ohneUebung}, andere Person ${zaehler.fremdePerson}).`, '')
  z.push(`| Übung | ${NUTZER.join(' | ')} | unterscheiden sich |`)
  z.push(`|---|${NUTZER.map(() => '---').join('|')}|---|`)
  for (const u of liste) {
    z.push(`| ${String(u.name).replace(/\|/g, '/')} | ${NUTZER.map(n => mdZelle(u.analyse[n])).join(' | ')} | ${u.unterscheiden} |`)
  }
  const hinweise = liste.flatMap(u => u.hinweise.map(h => `- ${u.name}: ${h}`))
  if (hinweise.length) z.push('', '## Bitte entscheiden', '', ...hinweise)
  z.push('', '## Was `--jetzt` schreiben würde', '')
  z.push(`Quelle: \`${path.basename(JSON_DATEI)}\` (${jsonStatus}). Nur Abweichungen von 8-12 werden geschrieben; `
    + 'fehlt ein Eintrag, nimmt die App 8-12.', '')
  if (!vorschau.neu.length && !vorschau.erledigt.length) z.push('Nichts — alle Bereiche bleiben 8-12.')
  for (const p of vorschau.neu) z.push(`- NEU \`${p.key}\` = ${bereichText(p.bereich)} (${p.name}, ${p.userId})`)
  for (const p of vorschau.erledigt) z.push(`- schon in der Cloud \`${p.key}\` = ${bereichText(p.bereich)} (${p.name}, ${p.userId})`)
  if (vorschau.gruende.length) z.push('', '**Bremse — `--jetzt` würde nichts schreiben:**', '', ...vorschau.gruende.map(g => `- ${g}`))
  z.push('', '## Korrigieren', '')
  z.push(`In \`${path.basename(JSON_DATEI)}\` je Übung unter \`schreiben\` den Bereich je Person ändern `
    + '(`{ "min": 8, "max": 12 }` oder `null` = nichts schreiben). Danach ohne `--jetzt` erneut laufen lassen '
    + 'und die Vorschau prüfen; die JSON bleibt dabei erhalten (neu anlegen nur mit `--neu`).')
  fs.writeFileSync(MD_DATEI, z.join('\n') + '\n', 'utf8')
}

// --- Schreiben ----------------------------------------------------------------

function leseVorschlag() {
  if (!fs.existsSync(JSON_DATEI)) abbruch(`Vorschlags-Datei fehlt: ${JSON_DATEI}`, 'Erst ohne --jetzt laufen lassen.')
  try {
    return JSON.parse(fs.readFileSync(JSON_DATEI, 'utf8'))
  } catch (err) {
    abbruch(`Vorschlags-Datei ist kein gueltiges JSON: ${err.message}`)
  }
}

// Plan aus der JSON: je Paar "neu" oder "schon erledigt"; alles andere ist ein
// Grund zum Abbruch
function plane(vorschlag, stand) {
  const neu = []
  const erledigt = []
  const gruende = []
  const uebungen = new Map(stand.uebungen.map(u => [u.id, u]))
  const imMeta = new Map(stand.meta.map(m => [m.key ?? m._docId, m]))
  if (!Array.isArray(vorschlag?.uebungen)) {
    gruende.push('In der Vorschlags-Datei fehlt die Liste "uebungen"')
    return { neu, erledigt, gruende }
  }
  const gesehen = new Set()
  for (const eintrag of vorschlag.uebungen) {
    const exerciseId = eintrag?.exerciseId
    const name = eintrag?.name || exerciseId
    for (const [userId, bereich] of Object.entries(eintrag?.schreiben || {})) {
      if (bereich === null || bereich === undefined) continue
      const key = meta(userId, exerciseId)
      if (gesehen.has(key)) { gruende.push(`${key} steht doppelt in der Datei`); continue }
      gesehen.add(key)
      if (!NUTZER.includes(userId)) { gruende.push(`${name}: Person "${userId}" gibt es nicht (${NUTZER.join(', ')})`); continue }
      if (!exerciseId || !uebungen.has(exerciseId)) { gruende.push(`${name}: Uebung ${exerciseId} fehlt in der Cloud oder ist geloescht`); continue }
      const { min, max } = bereich || {}
      if (!Number.isInteger(min) || !Number.isInteger(max) || min < GRENZEN.min || max > GRENZEN.max || min >= max) {
        gruende.push(`${name}, ${userId}: Bereich ${JSON.stringify(bereich)} ungueltig (ganze Zahlen, ${GRENZEN.min} <= min < max <= ${GRENZEN.max})`)
        continue
      }
      const paar = { key, exerciseId, userId, name, bereich: { min, max } }
      const vorhanden = imMeta.get(key)
      if (!vorhanden) neu.push(paar)
      else if (gleich(vorhanden.value, paar.bereich)) erledigt.push(paar)
      else gruende.push(`${name}, ${userId}: in der Cloud steht schon ${bereichText(vorhanden.value)} (${key}) - nie still ueberschreiben`)
    }
  }
  return { neu, erledigt, gruende }
}

// Dieselbe Form wie die App (stores/auth.js -> pushRecord('meta', key, record)):
// { key, value, updatedAt } unter meta/<key>; nur neue Dokumente
function baueWrites(projectId, neu, jetzt) {
  return neu.map(p => ({
    update: {
      name: docPfad(projectId, 'meta', p.key),
      fields: nachFirestore({ key: p.key, value: { min: p.bereich.min, max: p.bereich.max }, updatedAt: jetzt }).mapValue.fields
    },
    currentDocument: { exists: false }
  }))
}

function zeigeVorschau(plan) {
  for (const p of plan.neu) console.log(`  NEU      ${p.key}  ${bereichText(p.bereich)}  (${p.name}, ${p.userId})`)
  for (const p of plan.erledigt) console.log(`  ERLEDIGT ${p.key}  ${bereichText(p.bereich)}  (${p.name}, ${p.userId})`)
  if (!plan.neu.length && !plan.erledigt.length) console.log('  Nichts zu schreiben - alle Bereiche bleiben 8-12.')
}

// --- Ablauf -------------------------------------------------------------------

async function trockenlauf(sitzung) {
  const jetzt = new Date()
  const von = datumText(minusMonate(jetzt, MONATE))
  const bis = datumText(jetzt)
  const stand = await holeStand(sitzung, true)
  console.log(`  Gelesen: ${stand.uebungen.length} Uebungen, ${stand.saetze.length} Saetze, ${stand.meta.length} meta-Eintraege`)
  console.log(`  Zeitraum ${von} bis ${bis}\n`)

  const ergebnis = analysiere(stand, von, bis)
  konsolenTabelle(ergebnis.liste)
  const z = ergebnis.zaehler
  console.log(`\n  Ausgewertet: ${z.ausgewertet} Saetze (gelesen ${z.gelesen}; geloescht ${z.geloescht}, ohne Datum ${z.ohneDatum}, ausserhalb ${z.ausserhalb},` +
    ` ohne Wdh ${z.ohneWdh}, Aufwaermen ${z.aufwaermen}, Uebung unbekannt ${z.ohneUebung}, andere Person ${z.fremdePerson})`)
  for (const u of ergebnis.liste) for (const h of u.hinweise) console.log(`  HINWEIS ${u.name}: ${h}`)

  // Die JSON kann von Gabriel korrigiert sein: nur neu anlegen, wenn sie fehlt
  // oder --neu gesetzt ist
  let jsonStatus
  if (!fs.existsSync(JSON_DATEI) || hatFlagge('neu')) {
    const datei = {
      hinweis: 'Diese Datei liest "node scripts/wdh-bereiche.mjs --jetzt". Je Uebung unter "schreiben" der Bereich je Person, '
        + 'der in die Cloud geht; null = nichts schreiben (die App nimmt 8-12). "analyse" ist nur zur Information.',
      erstellt: jetzt.toISOString(),
      zeitraum: { von, bis },
      regel: { standard: STANDARD, mindestAnteil: MINDEST_ANTEIL, perzentile: [10, 90], mindestSaetze: MINDEST_SAETZE },
      saetze: ergebnis.zaehler,
      uebungen: ergebnis.liste
    }
    fs.writeFileSync(JSON_DATEI, JSON.stringify(datei, null, 2) + '\n', 'utf8')
    jsonStatus = 'neu angelegt aus dieser Analyse'
  } else {
    jsonStatus = 'vorhanden, NICHT ueberschrieben - neu anlegen mit --neu'
  }
  console.log(`\n  Vorschlags-JSON: ${JSON_DATEI} (${jsonStatus})`)

  const plan = plane(leseVorschlag(), stand)
  console.log('\n  Was --jetzt schreiben wuerde:')
  zeigeVorschau(plan)
  if (plan.gruende.length) {
    console.log('\n  BREMSE - --jetzt wuerde NICHTS schreiben:')
    for (const g of plan.gruende) console.log(`    - ${g}`)
  }
  schreibeMarkdown(ergebnis, von, bis, jsonStatus, plan)
  console.log(`  Lesbare Fassung: ${MD_DATEI}`)
  console.log('\n  TROCKENLAUF - in die Cloud wurde nichts geschrieben.')
  console.log('  Nach Gabriels Freigabe der Tabelle: denselben Befehl mit --jetzt.\n')
}

async function schreiben(sitzung) {
  const vorschlag = leseVorschlag()
  console.log(`  Vorschlags-JSON: ${JSON_DATEI} (erstellt ${vorschlag?.erstellt || '?'})`)
  const stand = await holeStand(sitzung, false)
  const plan = plane(vorschlag, stand)
  console.log('')
  zeigeVorschau(plan)
  if (plan.gruende.length) {
    console.error('\n  BREMSE - es wird NICHTS geschrieben:')
    for (const g of plan.gruende) console.error(`    - ${g}`)
    abbruch('Erst die Gruende oben klaeren, dann erneut laufen lassen.')
  }
  if (!plan.neu.length) {
    console.log('\n  Alles schon erledigt. Nichts zu tun.\n')
    return
  }

  const jetzt = new Date().toISOString()
  const sicherung = path.join(PRIVAT, `cloud-sicherung-meta-${jetzt.replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(sicherung, JSON.stringify({ geholt: jetzt, meta: stand.metaRoh, metaMerker: stand.metaMerker }, null, 2) + '\n', 'utf8')
  console.log(`\n  Sicherung des meta-Bestands: ${sicherung}`)

  const writes = baueWrites(sitzung.projectId, plan.neu, jetzt)
  console.log(`  Schreibe ${writes.length} Vorgaenge in einem Schritt ...`)
  await schreibeAtomar(sitzung, writes)

  // Nachkontrolle: frisch aus der Cloud lesen, jedes Paar muss jetzt erledigt sein
  const kontrolle = plane(vorschlag, await holeStand(sitzung, false))
  if (kontrolle.neu.length || kontrolle.gruende.length) {
    console.error('\n  NACHKONTROLLE MELDET ABWEICHUNGEN:')
    for (const p of kontrolle.neu) console.error(`    - ${p.key} fehlt noch`)
    for (const g of kontrolle.gruende) console.error(`    - ${g}`)
    abbruch('Bitte melden. Die Sicherung liegt oben.')
  }
  console.log(`\n  Nachkontrolle bestanden: ${kontrolle.erledigt.length} Bereiche stehen in der Cloud.`)
  console.log('  Die Handys uebernehmen sie sofort, wenn die App offen ist, sonst beim naechsten Start.\n')
}

async function main() {
  const jetzt = hatFlagge('jetzt')
  if (jetzt && hatFlagge('neu')) abbruch('--neu und --jetzt nicht zusammen: erst die neue Tabelle ansehen, dann schreiben.')
  const sitzung = await anmelden(WURZEL, KONTO)
  console.log(`\n[wdh-bereiche] Angemeldet · Projekt ${sitzung.projectId} · ${jetzt ? 'SCHREIBEN (--jetzt)' : 'Trockenlauf, nur lesen'}`)
  if (jetzt) await schreiben(sitzung)
  else await trockenlauf(sitzung)
}

main().catch((err) => {
  if (err instanceof Abbruch) {
    console.error(`\n[wdh-bereiche] ${err.message}`)
    if (err.hinweis) console.error(`  ${err.hinweis}`)
  } else {
    console.error('\n[wdh-bereiche] Unerwarteter Fehler:', err)
  }
  process.exitCode = 1
})
