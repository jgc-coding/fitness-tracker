// Hantel-Bildchen (Gabriel 27.11.2026, v2.19.0): vor den Kuerzeln DB
// (Dumbbell, Kurzhantel) und BB (Barbell, Langhantel) steht ein kleines
// Bild, damit man sie nicht verwechselt und nebenbei lernt. Das Kuerzel
// bleibt stehen. Je Person ein- und ausschaltbar (db.meta, gesynct);
// sichtbar, sobald eine der ausgewaehlten Personen es an hat.
// Vertrag: scripts/hantelbild-test.mjs. Anzeige: components/shared/UebungsName.vue.

/** Welches Bild zu welchem Kuerzel gehoert: kurz = zwei Kurzhanteln, lang = Langhantel. */
const HANTEL_ART = { DB: 'kurz', BB: 'lang' }

export const hantelBildSchluessel = (userId) => `hantelBild_${userId}`

/**
 * Einstellung einer Person lesen. Ein gespeichertes true/false gilt, sonst
 * der Standard der Person (USERS[].hantelBilder). Ein kaputter Wert faellt
 * auf den Standard zurueck; das Warnen uebernimmt der Store.
 */
export function hantelBildAn(gespeichert, standard) {
  return typeof gespeichert === 'boolean' ? gespeichert : standard === true
}

/** Sichtbar, sobald mindestens eine ausgewaehlte Person es an hat. */
export function hantelBilderSichtbar(aktiveIds, istAn) {
  return Array.isArray(aktiveIds) && aktiveIds.some(id => istAn(id) === true)
}

function istWortzeichen(zeichen) {
  return zeichen !== undefined && /[\p{L}\p{N}]/u.test(zeichen)
}

/**
 * Zerlegt einen angezeigten Uebungsnamen in Textstuecke und Kuerzel:
 * "Incline DB Press" -> [{ text: 'Incline ' }, { kuerzel: 'DB', art: 'kurz' }, { text: ' Press' }].
 * Nur grossgeschriebene, ganze Woerter zaehlen (angezeigt wird immer nach
 * toTitleCase, das macht aus db/bb schon DB/BB). Ohne Namen: leere Liste.
 */
export function hantelTeile(name) {
  if (typeof name !== 'string' || name === '') return []
  const teile = []
  let start = 0
  for (const treffer of name.matchAll(/DB|BB/g)) {
    const i = treffer.index
    if (istWortzeichen(name[i - 1]) || istWortzeichen(name[i + 2])) continue
    if (i > start) teile.push({ text: name.slice(start, i) })
    teile.push({ kuerzel: treffer[0], art: HANTEL_ART[treffer[0]] })
    start = i + 2
  }
  if (start < name.length) teile.push({ text: name.slice(start) })
  return teile
}
