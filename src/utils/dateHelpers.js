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
  return new Date().toISOString().split('T')[0]
}

export function isDeloadWeek(deloadStartDate, deloadIntervalWeeks) {
  if (!deloadStartDate || !deloadIntervalWeeks) return false
  const start = new Date(deloadStartDate)
  const now = new Date()
  const diffMs = now - start
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
  return diffWeeks >= 0 && diffWeeks % deloadIntervalWeeks === deloadIntervalWeeks - 1
}
