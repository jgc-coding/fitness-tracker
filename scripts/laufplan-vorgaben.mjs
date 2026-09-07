#!/usr/bin/env node
/*
 * Traegt Puls- und Tempovorgaben (`targets`) in eine Laufplan-Datei ein.
 *
 * Aufruf (Windows PowerShell):
 *   node .\scripts\laufplan-vorgaben.mjs --plan .\privat\laufplan-user2-v1.json --profil .\privat\pace-profil.json
 *   node .\scripts\laufplan-vorgaben.mjs --plan .\privat\laufplan-user2-v1.json --profil .\privat\pace-profil.json --ziel .\privat\laufplan-user2-v2.json
 *
 * WOZU: "Locker laufen" hilft am Berg nicht weiter. Das Skript rechnet je Lauf
 * aus, welches Tempo bei welchem Puls herauskommt (scripts/lib/pace-modell-kern.mjs),
 * und schreibt Puls- und Tempospanne in den Plan.
 *
 * WO DAS TRAININGSWISSEN STEHT: im Profil unter privat\, nicht hier. Dieses
 * Skript kennt nur die Mechanik. Pulsbereiche sind Gesundheitsdaten und haben in
 * einem oeffentlichen Repo nichts verloren; der Aufbau des Profils steht in
 * docs/laufplan-vorgaben.md.
 *
 * WAS ES NICHT ANFASST: erledigte und ausgelassene Laeufe. Deren Vorgabe waere
 * eine nachtraegliche Behauptung ueber etwas, das schon gelaufen ist — und der
 * Import wuerde sie ohnehin verwerfen (Merge-Regel 4).
 *
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import fs from 'node:fs'
import path from 'node:path'
import { ladeLaeufe, schaetzeModell, mmss, rundeAuf } from './lib/pace-modell-kern.mjs'
import { validateRunPlanFile, parsePace } from '../src/utils/runPlanSchema.js'

function arg(name, standard = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : standard
}

function abbruch(satz, hinweis = '') {
  console.error(`\n[laufplan-vorgaben] ${satz}`)
  if (hinweis) console.error(`                   ${hinweis}`)
  console.error('')
  process.exit(1)
}

const planDatei = arg('plan')
const profilDatei = arg('profil')
if (!planDatei) abbruch('Bitte --plan <laufplan.json> angeben.')
if (!profilDatei) abbruch('Bitte --profil <pace-profil.json> angeben.')
for (const p of [planDatei, profilDatei]) if (!fs.existsSync(p)) abbruch(`Datei nicht gefunden: ${path.resolve(p)}`)

const plan = JSON.parse(fs.readFileSync(planDatei, 'utf8'))
const profile = JSON.parse(fs.readFileSync(profilDatei, 'utf8'))
if (!Array.isArray(plan.plans)) abbruch('Die Plandatei hat kein plans-Feld — ist das wirklich eine Laufplan-Datei?')

// --- Modell je Person, einmal ------------------------------------------------

const modelle = new Map()
function modellFuer(userId) {
  if (modelle.has(userId)) return modelle.get(userId)
  const profil = profile[userId]
  if (!profil) abbruch(`Im Profil fehlt ein Eintrag fuer ${userId}.`)
  if (!profil.csv) abbruch(`Im Profil von ${userId} fehlt "csv" (Pfad zur Garmin-Historie).`)
  const csv = path.isAbsolute(profil.csv) ? profil.csv : path.resolve(profil.csv)
  if (!fs.existsSync(csv)) abbruch(`Garmin-Historie nicht gefunden: ${csv}`)
  let modell
  try {
    const { laeufe } = ladeLaeufe(csv)
    modell = schaetzeModell(laeufe, { monate: profil.monate, halbwertszeitTage: profil.halbwertszeitTage })
  } catch (err) {
    abbruch(`Modell fuer ${userId} nicht berechenbar: ${err.message}`)
  }
  const eintrag = { profil, modell }
  modelle.set(userId, eintrag)
  return eintrag
}

// --- Regeln ------------------------------------------------------------------

/** Erste passende Regel gewinnt. Ohne Treffer bekommt der Lauf keine Vorgabe. */
function findeRegel(profil, session) {
  const text = `${session.title || ''} ${session.description || ''}`
  for (const regel of profil.regeln || []) {
    const typen = regel.wenn?.typ
    if (Array.isArray(typen) && !typen.includes(session.type)) continue
    const muster = regel.wenn?.text
    if (muster && !new RegExp(muster, 'i').test(text)) continue
    return regel
  }
  return null
}

/** Zuschlag in Sekunden je km fuer dieses Datum (Wiedereinstieg nach einer Pause). */
function zuschlagFuer(profil, datum) {
  for (const stufe of profil.wiedereinstieg || []) {
    if (datum <= stufe.bis) return stufe.zuschlagSek || 0
  }
  return 0
}

function gelaendeWert(profil, name) {
  if (name === undefined || name === null) return profil.gelaendeStandard
  if (typeof name === 'number') return name
  const wert = profil.gelaende?.[name]
  if (wert === undefined) abbruch(`Unbekanntes Gelaende "${name}" im Profil (bekannt: ${Object.keys(profil.gelaende || {}).join(', ')}).`)
  return wert
}

/**
 * Baut die Vorgaben eines Laufs.
 *
 * Ein Pulsbereich wird ueber das Modell in einen Tempobereich uebersetzt: der
 * HOEHERE Puls ergibt das SCHNELLERE Tempo. Ein fest eingetragenes Tempo (etwa
 * das Rundentempo beim Backyard, das eine Renntaktik ist und keine Pulsfrage)
 * wird unveraendert uebernommen.
 */
function baueZiele(eintrag, session, regel) {
  const { profil, modell } = eintrag
  const zuschlag = zuschlagFuer(profil, session.date)
  const stunden = (session.planned?.minutes || 60) / 60
  const ziele = []

  for (const z of regel.ziele || []) {
    const ziel = { label: z.label || '', hrFrom: null, hrTo: null, paceFrom: null, paceTo: null }

    if (Array.isArray(z.hr)) {
      const [von, bis] = z.hr
      if (!Number.isInteger(von) || !Number.isInteger(bis) || von > bis) {
        abbruch(`Regel "${regel.name}": hr muss [von, bis] mit von <= bis sein, gefunden ${JSON.stringify(z.hr)}.`)
      }
      ziel.hrFrom = von
      ziel.hrTo = bis
    }

    if (Array.isArray(z.pace)) {
      // Festes Tempo aus dem Profil: keine Umrechnung, kein Zuschlag.
      for (const wert of z.pace) {
        if (parsePace(wert) === undefined) abbruch(`Regel "${regel.name}": "${wert}" ist kein Tempo im Format m:ss.`)
      }
      ziel.paceFrom = z.pace[0]
      ziel.paceTo = z.pace[1]
    } else if (z.hr && z.temposchaetzung !== false) {
      const hm = gelaendeWert(profil, z.gelaende)
      // Die Dauer geht ins Modell ein (laenger = langsamer). Fuer einen kurzen
      // schnellen Abschnitt zaehlt seine eigene Dauer, nicht die der ganzen
      // Einheit — sonst waere ein 8-min-Intervall im 2-Stunden-Lauf zu langsam.
      const dauer = typeof z.dauerStunden === 'number' ? z.dauerStunden : stunden
      const schnell = modell.vorhersage(ziel.hrTo, hm, dauer) + zuschlag
      const langsam = modell.vorhersage(ziel.hrFrom, hm, dauer) + zuschlag
      ziel.paceFrom = mmss(rundeAuf(schnell, 5))
      ziel.paceTo = mmss(rundeAuf(langsam, 5))
    }

    if (ziel.hrFrom === null && ziel.paceFrom === null) {
      abbruch(`Regel "${regel.name}": ein Ziel ohne Puls und ohne Tempo ist keine Vorgabe.`)
    }
    ziele.push(ziel)
  }
  return ziele.length ? ziele : null
}

// --- Durchlauf ---------------------------------------------------------------

const bericht = []
let gesetzt = 0
let uebersprungen = 0
let ohneRegel = []

for (const p of plan.plans) {
  const eintrag = modellFuer(p.userId)
  for (const session of p.sessions || []) {
    if (session.status && session.status !== 'planned') { uebersprungen++; continue }
    const regel = findeRegel(eintrag.profil, session)
    if (!regel) {
      ohneRegel.push(`${session.date} ${session.type} ${session.title}`)
      continue
    }
    if (regel.keineVorgabe === true) { session.targets = null; continue }
    session.targets = baueZiele(eintrag, session, regel)
    gesetzt++
    bericht.push({ datum: session.date, typ: session.type, titel: session.title, regel: regel.name, ziele: session.targets })
  }
}

// --- Pruefung und Ausgabe ----------------------------------------------------

const geprueft = validateRunPlanFile(plan)
if (!geprueft.ok) {
  console.error(`\n[laufplan-vorgaben] Die erzeugte Datei besteht die Pruefung NICHT — es wird nichts geschrieben:\n`)
  for (const fehler of geprueft.errors.slice(0, 30)) console.error('  - ' + fehler)
  console.error('')
  process.exit(1)
}

const ziel = arg('ziel', planDatei)
fs.writeFileSync(ziel, JSON.stringify(plan, null, 2) + '\n', 'utf8')

console.log(`\n[laufplan-vorgaben] ${gesetzt} Laeufe mit Vorgabe versehen, ${uebersprungen} bereits erledigt/ausgelassen (unangetastet)`)
for (const [userId, { profil, modell }] of modelle) {
  const k = modell.kennzahlen
  console.log(`  ${userId}: Modell aus ${k.imModell} Laeufen ab ${k.grenze}, Guete ${(k.r2 * 100).toFixed(0)} Prozent, ` +
    `Streuung ${Math.round(k.streuung)} s/km, Formkorrektur ${k.formOffset >= 0 ? '+' : '-'}${Math.abs(Math.round(k.formOffset))} s/km`)
  if (profil.wiedereinstieg?.length) {
    console.log(`    Wiedereinstieg: ${profil.wiedereinstieg.map(s => `bis ${s.bis} +${s.zuschlagSek} s/km`).join(', ')}`)
  }
}

if (ohneRegel.length) {
  console.log(`\n  ${ohneRegel.length} Laeufe ohne passende Regel (bleiben ohne Vorgabe):`)
  for (const z of ohneRegel.slice(0, 15)) console.log('    ' + z)
  if (ohneRegel.length > 15) console.log(`    ... und ${ohneRegel.length - 15} weitere`)
}

console.log('\n  Erste zwoelf Laeufe zur Kontrolle:')
for (const b of bericht.slice(0, 12)) {
  const teile = b.ziele.map(z => {
    const hr = z.hrFrom ? `Puls ${z.hrFrom}-${z.hrTo}` : ''
    const pace = z.paceFrom ? `${z.paceFrom}-${z.paceTo}/km` : ''
    return `${z.label}: ${[hr, pace].filter(Boolean).join(' ')}`
  })
  console.log(`    ${b.datum} ${b.titel} [${b.regel}]`)
  for (const t of teile) console.log(`        ${t}`)
}
console.log(`\n  Geschrieben nach: ${path.resolve(ziel)}\n`)
