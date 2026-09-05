#!/usr/bin/env node
/*
 * Prueft eine Laufplan-Datei gegen das Format (docs/laufplan-format.md), BEVOR
 * sie in der App importiert wird. Nutzt dasselbe Modul wie die App
 * (src/utils/runPlanSchema.js) — was hier gruen ist, laesst sich importieren.
 *
 * Aufruf (Windows PowerShell):
 *   node .\scripts\laufplan-pruefen.mjs .\docs\laufplan-beispiel.json
 *
 * Exit 0 = in Ordnung, Exit 1 = Fehler (Liste mit Pfadangabe auf stderr).
 * Ausgabe bewusst ohne Umlaute und Sonderzeichen (Windows-Konsole).
 */
import { readFileSync } from 'node:fs'
import { validateRunPlanFile } from '../src/utils/runPlanSchema.js'

const target = process.argv[2]
if (!target) {
  console.error('Aufruf: node .\\scripts\\laufplan-pruefen.mjs <datei.json>')
  process.exit(1)
}

let text
try {
  text = readFileSync(target, 'utf-8')
} catch (e) {
  console.error(`[laufplan-pruefen] Datei nicht lesbar: ${target}`)
  console.error(`  Technische Ursache: ${e.message}`)
  process.exit(1)
}

let data
try {
  data = JSON.parse(text)
} catch (e) {
  console.error(`[laufplan-pruefen] Kein gueltiges JSON: ${target}`)
  console.error(`  Technische Ursache: ${e.message}`)
  process.exit(1)
}

const result = validateRunPlanFile(data)

if (!result.ok) {
  console.error(`\n[laufplan-pruefen] ${result.errors.length} Fehler in ${target}:\n`)
  for (const err of result.errors) console.error('  - ' + err)
  console.error('\nEs wird nichts importiert, solange ein Fehler offen ist.\n')
  process.exit(1)
}

// --- Uebersicht + weiche Hinweise (kein Fehler, nur Plausibilitaet) ---
const hints = []
console.log(`\n[laufplan-pruefen] OK — ${target}`)

for (const plan of result.value.plans) {
  const dates = plan.sessions.map(s => s.date).sort()
  const byStatus = { planned: 0, done: 0, skipped: 0 }
  for (const s of plan.sessions) byStatus[s.status]++

  console.log(`\n  Plan "${plan.name}" (${plan.id}) fuer ${plan.userId}`)
  console.log(`    Ziel:    ${plan.goal.label || '-'} ${plan.goal.date ? 'am ' + plan.goal.date : ''} ${plan.goal.target ? '(' + plan.goal.target + ')' : ''}`)
  console.log(`    Phasen:  ${plan.phases.length}   Wochen: ${plan.weeks.length}`)
  console.log(`    Laeufe:  ${plan.sessions.length} (geplant ${byStatus.planned}, erledigt ${byStatus.done}, ausgelassen ${byStatus.skipped})`)
  if (dates.length > 0) console.log(`    Zeitraum: ${dates[0]} bis ${dates[dates.length - 1]}`)

  // Hinweis 1: Lauf ausserhalb jeder Phase
  for (const s of plan.sessions) {
    const inPhase = plan.phases.some(p => s.date >= p.from && s.date <= p.to)
    if (plan.phases.length > 0 && !inPhase) {
      hints.push(`${plan.id}: Lauf ${s.id} (${s.date}) liegt in keiner Phase`)
    }
  }

  // Hinweis 2: Wochenziel und Summe der geplanten Kilometer passen nicht zusammen
  for (const week of plan.weeks) {
    if (!week.targetKm) continue
    const end = addDays(week.start, 6)
    const sum = plan.sessions
      .filter(s => s.date >= week.start && s.date <= end)
      .reduce((acc, s) => acc + (s.planned.km || 0), 0)
    if (sum === 0) {
      hints.push(`${plan.id}: Woche ${week.start} hat Ziel ${week.targetKm} km, aber keinen Lauf mit km-Angabe`)
    } else if (Math.abs(sum - week.targetKm) / week.targetKm > 0.2) {
      hints.push(`${plan.id}: Woche ${week.start} — Ziel ${week.targetKm} km, Summe der Laeufe ${round1(sum)} km`)
    }
  }

  // Hinweis 3: Lauf in einer Woche ohne Wocheneintrag
  const weekStarts = new Set(plan.weeks.map(w => w.start))
  for (const s of plan.sessions) {
    if (plan.weeks.length > 0 && !weekStarts.has(mondayOf(s.date))) {
      hints.push(`${plan.id}: Lauf ${s.id} (${s.date}) liegt in einer Woche ohne Eintrag in "weeks"`)
    }
  }
}

if (hints.length > 0) {
  console.log(`\n  Hinweise (kein Fehler, nur zum Nachschauen):`)
  for (const h of hints.slice(0, 20)) console.log('    - ' + h)
  if (hints.length > 20) console.log(`    ... und ${hints.length - 20} weitere`)
}

console.log('\n  Die Datei kann in der App unter Laufen -> Plan importiert werden.\n')

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

function mondayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  const shift = (dt.getUTCDay() + 6) % 7
  return addDays(dateStr, -shift)
}

function round1(n) {
  return Math.round(n * 10) / 10
}
