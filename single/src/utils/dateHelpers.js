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
