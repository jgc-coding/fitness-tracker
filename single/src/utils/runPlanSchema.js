/**
 * Pruefmodul fuer Laufplan-Dateien — der Vertrag zwischen Claude und der App.
 *
 * Reines JavaScript ohne Abhaengigkeiten, damit es an drei Stellen dieselbe
 * Antwort gibt: beim Import in der App, im Skript `scripts/laufplan-pruefen.mjs`
 * und im Merge-Test. Beschreibung des Formats fuer Menschen: docs/laufplan-format.md
 *
 * Grundregel: Eine Datei wird VOLLSTAENDIG geprueft, bevor irgendetwas
 * geschrieben wird. Bei einem einzigen Fehler wird nichts importiert — lieber
 * eine klare Fehlermeldung mit Pfad als ein halb eingespielter Plan.
 */
import { USERS } from './constants.js'

export const FORMAT_NAME = 'fittrack-laufplan'
export const FORMAT_VERSION = 1

/**
 * Lauf-Arten. `symbol` ist das Zeichen im Wochen-Chip, `needsPlanned` sagt, ob
 * mindestens ein Planwert (km, Minuten oder Runden) Pflicht ist.
 */
export const RUN_SESSION_TYPES = [
  { id: 'easy', label: 'Locker', symbol: '🏃', needsPlanned: true },
  { id: 'long', label: 'Langer Lauf', symbol: '🛣️', needsPlanned: true },
  { id: 'backtoback', label: 'Back-to-back', symbol: '👣', needsPlanned: true },
  { id: 'loops', label: 'Runden', symbol: '🔄', needsPlanned: true },
  { id: 'tempo', label: 'Tempo', symbol: '⚡', needsPlanned: true },
  { id: 'hills', label: 'Huegel', symbol: '⛰️', needsPlanned: true },
  { id: 'walk', label: 'Gehen', symbol: '🚶', needsPlanned: true },
  { id: 'strength', label: 'Kraft', symbol: '🏋️', needsPlanned: false },
  { id: 'race', label: 'Wettkampf', symbol: '🏁', needsPlanned: false },
  { id: 'other', label: 'Sonstiges', symbol: '⚪', needsPlanned: false }
]

export const RUN_GOAL_TYPES = [
  { id: 'backyard', label: 'Backyard Ultra' },
  { id: 'marathon', label: 'Marathon' },
  { id: 'halfmarathon', label: 'Halbmarathon' },
  { id: 'ultra', label: 'Ultra' },
  { id: 'fitness', label: 'Fitness' },
  { id: 'other', label: 'Sonstiges' }
]

export const RUN_STATUS = ['planned', 'done', 'skipped']
export const RUN_SOURCES = ['plan', 'manual', 'intervals']

const TYPE_IDS = RUN_SESSION_TYPES.map(t => t.id)
const GOAL_IDS = RUN_GOAL_TYPES.map(g => g.id)

export function getRunType(typeId) {
  return RUN_SESSION_TYPES.find(t => t.id === typeId) || RUN_SESSION_TYPES[RUN_SESSION_TYPES.length - 1]
}

export function getGoalLabel(goalType) {
  return RUN_GOAL_TYPES.find(g => g.id === goalType)?.label || 'Ziel'
}

// ---------------------------------------------------------------------------
// Datums-Hilfen. Kalendertage sind Strings 'YYYY-MM-DD' und werden NIE ueber
// toISOString() erzeugt (das verschiebt um die UTC-Differenz, siehe getToday()
// in dateHelpers.js). Fuer Wochentag und Abstand rechnen wir ueber
// UTC-Mitternacht, damit die Sommerzeitumstellung keinen Tag verschiebt.
// ---------------------------------------------------------------------------

export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export function isMonday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() === 1
}

// ---------------------------------------------------------------------------
// Pruefung
// ---------------------------------------------------------------------------

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim() !== ''
}

/**
 * Zahl oder "nicht gesetzt". Gibt `undefined` zurueck, wenn der Wert ungueltig
 * ist — der Aufrufer meldet dann den Fehler mit Pfad.
 */
function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return value
}

/**
 * Prueft eine geparste Laufplan-Datei.
 * @returns {{ ok: boolean, errors: string[], value: object|null }}
 *   `value` ist die normalisierte Datei (alle optionalen Felder gefuellt) und
 *   nur bei `ok: true` gesetzt.
 */
export function validateRunPlanFile(input) {
  const errors = []
  const err = (path, message) => errors.push(`${path}: ${message}`)

  if (!isPlainObject(input)) {
    return { ok: false, errors: ['datei: Die Datei enthaelt kein JSON-Objekt.'], value: null }
  }
  if (input.format !== FORMAT_NAME) {
    err('format', `erwartet "${FORMAT_NAME}", gefunden ${JSON.stringify(input.format)}`)
  }
  if (input.formatVersion !== FORMAT_VERSION) {
    err('formatVersion', `erwartet ${FORMAT_VERSION}, gefunden ${JSON.stringify(input.formatVersion)}`)
  }
  if (!Array.isArray(input.plans) || input.plans.length === 0) {
    err('plans', 'muss eine Liste mit mindestens einem Plan sein')
  }
  // Kopf kaputt -> Rest nicht pruefen, sonst folgen nur Folgefehler.
  if (errors.length > 0) return { ok: false, errors, value: null }

  const knownUserIds = USERS.map(u => u.id)
  const planIds = new Set()
  const sessionIds = new Set()
  const plans = []

  input.plans.forEach((rawPlan, pi) => {
    const P = `plans[${pi}]`
    if (!isPlainObject(rawPlan)) {
      err(P, 'muss ein Objekt sein')
      return
    }

    if (!isNonEmptyString(rawPlan.id)) err(`${P}.id`, 'fehlt oder ist leer')
    else if (planIds.has(rawPlan.id)) err(`${P}.id`, `Kennung "${rawPlan.id}" kommt mehrfach vor`)
    else planIds.add(rawPlan.id)

    if (!knownUserIds.includes(rawPlan.userId)) {
      err(`${P}.userId`, `unbekannter Nutzer ${JSON.stringify(rawPlan.userId)} (erlaubt: ${knownUserIds.join(', ')})`)
    }
    if (!isNonEmptyString(rawPlan.name)) err(`${P}.name`, 'fehlt oder ist leer')

    // --- Ziel ---
    const goal = { type: 'other', label: '', date: null, target: '' }
    if (!isPlainObject(rawPlan.goal)) {
      err(`${P}.goal`, 'fehlt (erwartet { type, label, date, target })')
    } else {
      if (!GOAL_IDS.includes(rawPlan.goal.type)) {
        err(`${P}.goal.type`, `unbekannt ${JSON.stringify(rawPlan.goal.type)} (erlaubt: ${GOAL_IDS.join(', ')})`)
      } else goal.type = rawPlan.goal.type
      goal.label = isNonEmptyString(rawPlan.goal.label) ? rawPlan.goal.label.trim() : ''
      if (rawPlan.goal.date === null || rawPlan.goal.date === undefined || rawPlan.goal.date === '') {
        goal.date = null
      } else if (!isValidDateString(rawPlan.goal.date)) {
        err(`${P}.goal.date`, 'kein gueltiges Datum (YYYY-MM-DD)')
      } else goal.date = rawPlan.goal.date
      goal.target = typeof rawPlan.goal.target === 'string' ? rawPlan.goal.target : ''
    }

    // --- Phasen ---
    const phaseIds = new Set()
    const phases = []
    if (rawPlan.phases !== undefined && !Array.isArray(rawPlan.phases)) {
      err(`${P}.phases`, 'muss eine Liste sein')
    } else {
      const rawPhases = rawPlan.phases || []
      rawPhases.forEach((rawPhase, fi) => {
        const F = `${P}.phases[${fi}]`
        if (!isPlainObject(rawPhase)) {
          err(F, 'muss ein Objekt sein')
          return
        }
        if (!isNonEmptyString(rawPhase.id)) err(`${F}.id`, 'fehlt oder ist leer')
        else if (phaseIds.has(rawPhase.id)) err(`${F}.id`, `Kennung "${rawPhase.id}" kommt im Plan mehrfach vor`)
        else phaseIds.add(rawPhase.id)
        if (!isNonEmptyString(rawPhase.name)) err(`${F}.name`, 'fehlt oder ist leer')
        const fromOk = isValidDateString(rawPhase.from)
        const toOk = isValidDateString(rawPhase.to)
        if (!fromOk) err(`${F}.from`, 'kein gueltiges Datum (YYYY-MM-DD)')
        if (!toOk) err(`${F}.to`, 'kein gueltiges Datum (YYYY-MM-DD)')
        if (fromOk && toOk && rawPhase.from > rawPhase.to) {
          err(F, `Beginn ${rawPhase.from} liegt nach dem Ende ${rawPhase.to}`)
        }
        phases.push({
          id: rawPhase.id,
          name: rawPhase.name,
          from: rawPhase.from,
          to: rawPhase.to,
          focus: typeof rawPhase.focus === 'string' ? rawPhase.focus : ''
        })
      })
    }

    // --- Wochen ---
    const weekStarts = new Set()
    const weeks = []
    if (rawPlan.weeks !== undefined && !Array.isArray(rawPlan.weeks)) {
      err(`${P}.weeks`, 'muss eine Liste sein')
    } else {
      const rawWeeks = rawPlan.weeks || []
      rawWeeks.forEach((rawWeek, wi) => {
        const W = `${P}.weeks[${wi}]`
        if (!isPlainObject(rawWeek)) {
          err(W, 'muss ein Objekt sein')
          return
        }
        if (!isValidDateString(rawWeek.start)) {
          err(`${W}.start`, 'kein gueltiges Datum (YYYY-MM-DD)')
        } else if (!isMonday(rawWeek.start)) {
          err(`${W}.start`, `${rawWeek.start} ist kein Montag (Wochen beginnen montags)`)
        } else if (weekStarts.has(rawWeek.start)) {
          err(`${W}.start`, `Woche ${rawWeek.start} kommt mehrfach vor`)
        } else weekStarts.add(rawWeek.start)

        if (rawWeek.phaseId !== null && rawWeek.phaseId !== undefined && !phaseIds.has(rawWeek.phaseId)) {
          err(`${W}.phaseId`, `verweist auf die unbekannte Phase ${JSON.stringify(rawWeek.phaseId)}`)
        }
        const km = optionalNumber(rawWeek.targetKm)
        const minutes = optionalNumber(rawWeek.targetMinutes)
        if (km === undefined) err(`${W}.targetKm`, 'muss eine Zahl >= 0 oder null sein')
        if (minutes === undefined) err(`${W}.targetMinutes`, 'muss eine Zahl >= 0 oder null sein')

        weeks.push({
          start: rawWeek.start,
          phaseId: rawWeek.phaseId === undefined ? null : rawWeek.phaseId,
          targetKm: km === undefined ? null : km,
          targetMinutes: minutes === undefined ? null : minutes,
          note: typeof rawWeek.note === 'string' ? rawWeek.note : ''
        })
      })
    }

    // --- Laeufe ---
    const sessions = []
    if (rawPlan.sessions !== undefined && !Array.isArray(rawPlan.sessions)) {
      err(`${P}.sessions`, 'muss eine Liste sein')
    } else {
      const rawSessions = rawPlan.sessions || []
      rawSessions.forEach((rawSession, si) => {
        const normalized = validateSession(rawSession, `${P}.sessions[${si}]`, err, sessionIds, rawPlan)
        if (normalized) sessions.push(normalized)
      })
    }

    plans.push({
      id: rawPlan.id,
      userId: rawPlan.userId,
      name: isNonEmptyString(rawPlan.name) ? rawPlan.name.trim() : '',
      goal,
      phases,
      weeks,
      sessions,
      // null = die Datei sagt nichts dazu; der Merge entscheidet dann selbst.
      isActive: rawPlan.isActive === undefined ? null : rawPlan.isActive === true,
      planVersion: Number.isInteger(rawPlan.planVersion) && rawPlan.planVersion > 0 ? rawPlan.planVersion : 1
    })
  })

  if (errors.length > 0) return { ok: false, errors, value: null }

  return {
    ok: true,
    errors: [],
    value: {
      format: FORMAT_NAME,
      formatVersion: FORMAT_VERSION,
      exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : null,
      plans
    }
  }
}

function validateSession(raw, S, err, sessionIds, rawPlan) {
  if (!isPlainObject(raw)) {
    err(S, 'muss ein Objekt sein')
    return null
  }

  if (!isNonEmptyString(raw.id)) err(`${S}.id`, 'fehlt oder ist leer')
  else if (sessionIds.has(raw.id)) err(`${S}.id`, `Kennung "${raw.id}" kommt in der Datei mehrfach vor`)
  else sessionIds.add(raw.id)

  if (!isValidDateString(raw.date)) err(`${S}.date`, 'kein gueltiges Datum (YYYY-MM-DD)')

  if (!TYPE_IDS.includes(raw.type)) {
    err(`${S}.type`, `unbekannte Lauf-Art ${JSON.stringify(raw.type)} (erlaubt: ${TYPE_IDS.join(', ')})`)
  }
  if (!isNonEmptyString(raw.title)) err(`${S}.title`, 'fehlt oder ist leer')

  // planned: km / minutes / loops
  const planned = { km: null, minutes: null, loops: null }
  if (raw.planned !== undefined && raw.planned !== null && !isPlainObject(raw.planned)) {
    err(`${S}.planned`, 'muss ein Objekt { km, minutes, loops } sein')
  } else {
    const src = raw.planned || {}
    for (const key of ['km', 'minutes', 'loops']) {
      const num = optionalNumber(src[key])
      if (num === undefined) err(`${S}.planned.${key}`, 'muss eine Zahl >= 0 oder null sein')
      else planned[key] = num
    }
  }
  const needsPlanned = TYPE_IDS.includes(raw.type) ? getRunType(raw.type).needsPlanned : false
  if (needsPlanned && planned.km === null && planned.minutes === null && planned.loops === null) {
    err(`${S}.planned`, `Lauf-Art "${raw.type}" braucht mindestens km, minutes oder loops`)
  }

  // Status und Ist-Werte sind im Import optional (Claude darf sie mitschicken).
  let status = 'planned'
  if (raw.status !== undefined && raw.status !== null) {
    if (!RUN_STATUS.includes(raw.status)) {
      err(`${S}.status`, `unbekannt ${JSON.stringify(raw.status)} (erlaubt: ${RUN_STATUS.join(', ')})`)
    } else status = raw.status
  }

  let actual = null
  if (raw.actual !== undefined && raw.actual !== null) {
    if (!isPlainObject(raw.actual)) {
      err(`${S}.actual`, 'muss ein Objekt { km, minutes, avgHr, note } oder null sein')
    } else {
      actual = { km: null, minutes: null, avgHr: null, note: '' }
      for (const key of ['km', 'minutes', 'avgHr']) {
        const num = optionalNumber(raw.actual[key])
        if (num === undefined) err(`${S}.actual.${key}`, 'muss eine Zahl >= 0 oder null sein')
        else actual[key] = num
      }
      actual.note = typeof raw.actual.note === 'string' ? raw.actual.note : ''
    }
  }

  let source = status === 'planned' ? 'plan' : 'manual'
  if (raw.source !== undefined && raw.source !== null) {
    if (!RUN_SOURCES.includes(raw.source)) {
      err(`${S}.source`, `unbekannt ${JSON.stringify(raw.source)} (erlaubt: ${RUN_SOURCES.join(', ')})`)
    } else source = raw.source
  }

  let originalDate = null
  if (raw.originalDate !== undefined && raw.originalDate !== null && raw.originalDate !== '') {
    if (!isValidDateString(raw.originalDate)) err(`${S}.originalDate`, 'kein gueltiges Datum (YYYY-MM-DD)')
    else originalDate = raw.originalDate
  }

  if (raw.externalId !== undefined && raw.externalId !== null && typeof raw.externalId !== 'string') {
    err(`${S}.externalId`, 'muss ein Text oder null sein')
  }
  if (raw.planId !== undefined && raw.planId !== null && raw.planId !== rawPlan.id) {
    err(`${S}.planId`, `zeigt auf "${raw.planId}", der Lauf steht aber im Plan "${rawPlan.id}"`)
  }

  return {
    id: raw.id,
    planId: rawPlan.id,
    userId: rawPlan.userId,
    date: raw.date,
    type: raw.type,
    title: isNonEmptyString(raw.title) ? raw.title.trim() : '',
    description: typeof raw.description === 'string' ? raw.description : '',
    planned,
    status,
    actual,
    source,
    externalId: typeof raw.externalId === 'string' && raw.externalId !== '' ? raw.externalId : null,
    originalDate,
    unplanned: raw.unplanned === true
  }
}
