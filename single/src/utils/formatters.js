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
