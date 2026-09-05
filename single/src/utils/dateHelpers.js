export function getISOWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export function getCurrentWeekVariant() {
  const weekNum = getISOWeekNumber(new Date())
  return weekNum % 2 === 0 ? 'A' : 'B'
}

export function getWeekdayName(date) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(date)
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date))
}

export function formatDateShort(date) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit'
  }).format(new Date(date))
}

export function getToday() {
  // Use LOCAL date, not UTC. Otherwise workouts started between midnight and
  // ~02:00 local time are logged under the previous day.
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---------------------------------------------------------------------------
// Rechnen mit Kalendertagen ('YYYY-MM-DD'), wie sie der Laufplaner benutzt.
// Alle Funktionen rechnen ueber UTC-Mitternacht: dadurch verschiebt die
// Sommerzeit-Umstellung keinen Tag (eine Woche hat dann 167 oder 169 Stunden,
// aber immer sieben Kalendertage).
// ---------------------------------------------------------------------------

function toUtcDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

function fromUtcDate(dt) {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}

export function addDaysToDate(dateStr, days) {
  const dt = toUtcDate(dateStr)
  dt.setUTCDate(dt.getUTCDate() + days)
  return fromUtcDate(dt)
}

/** Montag der Woche, in der dieser Tag liegt. */
export function mondayOf(dateStr) {
  const shift = (toUtcDate(dateStr).getUTCDay() + 6) % 7
  return addDaysToDate(dateStr, -shift)
}

/** Abstand in Kalendertagen (b - a), negativ wenn b vor a liegt. */
export function daysBetweenDates(a, b) {
  return Math.round((toUtcDate(b) - toUtcDate(a)) / 86400000)
}

/** '2030-01-07' -> 'Mo' */
export function weekdayShort(dateStr) {
  return ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][toUtcDate(dateStr).getUTCDay()]
}

/** '2030-01-07' -> '07.01.' */
export function formatDayShort(dateStr) {
  const [, m, d] = String(dateStr).split('-')
  return `${d}.${m}.`
}

/** Kalenderwoche eines Tages-Strings (ohne Zeitzonen-Umweg). */
export function isoWeekOfDate(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number)
  return getISOWeekNumber(new Date(y, (m || 1) - 1, d || 1))
}

export function isDeloadWeek(deloadStartDate, deloadIntervalWeeks) {
  if (!deloadStartDate || !deloadIntervalWeeks) return false
  // Compute the diff in calendar days via UTC midnights to avoid DST drift.
  const [sy, sm, sd] = String(deloadStartDate).split('-').map(Number)
  const now = new Date()
  const startUtc = Date.UTC(sy, (sm || 1) - 1, sd || 1)
  const nowUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor((nowUtc - startUtc) / 86400000)
  if (diffDays < 0) return false
  const diffWeeks = Math.floor(diffDays / 7)
  return diffWeeks % deloadIntervalWeeks === deloadIntervalWeeks - 1
}
