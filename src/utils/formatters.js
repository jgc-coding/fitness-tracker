// Convert a string to Title Case (first letter of every word capitalized).
// Handles German umlauts and multi-word exercise names.
export function toTitleCase(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/(^|\s|-|\/|\(|\))([a-zäöüß])/g, (_, sep, ch) => sep + ch.toUpperCase())
}
