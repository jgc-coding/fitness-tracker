// Convert a string to Title Case (first letter of every word capitalized).
// Handles German umlauts and multi-word exercise names.
// Keeps common gym abbreviations (DB, BB) fully uppercase.
const ALL_CAPS_WORDS = new Set(['db', 'bb'])

export function toTitleCase(str) {
  if (!str) return ''
  const lower = String(str).toLowerCase()
  const titled = lower.replace(
    /(^|\s|-|\/|\(|\))([a-zäöüß])/g,
    (_, sep, ch) => sep + ch.toUpperCase()
  )
  // Post-process: uppercase known abbreviations as whole words
  return titled.replace(/\b([A-Za-zäöüß]+)\b/g, (word) => {
    return ALL_CAPS_WORDS.has(word.toLowerCase()) ? word.toUpperCase() : word
  })
}

// --- Laufplaner --------------------------------------------------------------

/** Minuten als '45 min' oder '2:30 h'. */
export function formatMinutes(minutes) {
  if (!minutes && minutes !== 0) return ''
  const total = Math.round(minutes)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${h}:${String(m).padStart(2, '0')} h`
}

/** Kilometer ohne unnoetige Nachkommastelle: 8 km, 8,2 km. */
export function formatKm(km) {
  if (!km && km !== 0) return ''
  const rounded = Math.round(km * 10) / 10
  return `${String(rounded).replace('.', ',')} km`
}

/**
 * Kurzform eines Plan- oder Ist-Werts fuer den Wochen-Chip. Runden gehen vor
 * (bei einer Runden-Simulation zaehlt der Stundenrhythmus, nicht die Strecke),
 * danach Kilometer, danach Zeit.
 */
export function formatRunValue(value) {
  if (!value) return ''
  if (value.loops) return `${value.loops} Runden`
  if (value.km) return formatKm(value.km)
  if (value.minutes) return formatMinutes(value.minutes)
  return ''
}

/** Alle gesetzten Werte, fuer die Detailansicht: '20 km · 3:05 h · 3 Runden'. */
export function formatRunValueFull(value) {
  if (!value) return ''
  const parts = []
  if (value.km) parts.push(formatKm(value.km))
  if (value.minutes) parts.push(formatMinutes(value.minutes))
  if (value.loops) parts.push(`${value.loops} Runden`)
  return parts.join(' · ')
}
