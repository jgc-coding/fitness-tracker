// Schnellwechsel-Ring mit Standard-Uebung je Nutzer (reine Funktionen).
//
// Ein Workout-Eintrag traegt: `exerciseId` (gemeinsame Karten-/Fallback-
// Uebung — gesetzt von der Basis oder einem freien Tausch), `basisExerciseId`
// (die geplante Uebung), `alternativen` (Array aus dem Plan) und optional
// `userExerciseIds` ({ userId: exerciseId } — die abweichende aktive Uebung
// je Nutzer). Der PLAN-Eintrag traegt zusaetzlich `bevorzugt`
// ({ userId: exerciseId } — die gemerkte Standard-Uebung je Nutzer, gesynct).
// Alle Felder sind additiv: Eintraege ohne sie bleiben ueberall gueltig.
//
// Vertrag: scripts/uebungsring-test.mjs — wer Regeln hier aendert,
// erweitert ZUERST den Test.

// Der Wechsel-Ring: [Basis, ...Alternativen]. Laenge 1 heisst: kein Wechsel.
export function ringFuer(eintrag) {
  if (!eintrag) return []
  return [eintrag.basisExerciseId || eintrag.exerciseId, ...(eintrag.alternativen || [])]
}

// Aktive Uebung EINES Nutzers: seine Abweichung, sonst die Karten-Uebung.
export function aktiveUebungId(eintrag, userId) {
  if (!eintrag) return null
  return (eintrag.userExerciseIds && eintrag.userExerciseIds[userId]) || eintrag.exerciseId
}

// Position der aktiven Uebung des Nutzers im Ring; -1 nach freiem Tausch
// auf eine Uebung ausserhalb.
export function ringPosition(eintrag, userId) {
  return ringFuer(eintrag).indexOf(aktiveUebungId(eintrag, userId))
}

// Naechste Uebung im Ring fuer diesen Nutzer — oder null, wenn es nichts zu
// wechseln gibt. Ausserhalb des Rings (freier Tausch) fuehrt der naechste
// Schritt zur Basis.
export function naechsteImRing(eintrag, userId, richtung = 1) {
  const ring = ringFuer(eintrag)
  if (ring.length <= 1) return null
  const aktuell = aktiveUebungId(eintrag, userId)
  const pos = ring.indexOf(aktuell)
  const naechste = pos < 0 ? ring[0] : ring[(pos + richtung + ring.length) % ring.length]
  return naechste === aktuell ? null : naechste
}

// Neuer Eintrag mit gesetzter Nutzer-Uebung. Entspricht sie der
// Karten-Uebung, wird die Abweichung entfernt (der Fallback reicht).
// Immer frische Kopien — nie das Original veraendern (Vue-Proxy/Dexie).
export function mitNutzerUebung(eintrag, userId, exerciseId) {
  const map = { ...(eintrag.userExerciseIds || {}) }
  if (exerciseId === eintrag.exerciseId) {
    delete map[userId]
  } else {
    map[userId] = exerciseId
  }
  return { ...eintrag, userExerciseIds: map }
}

// Beim Workout-Start: gemerkte Standards (`bevorzugt` aus dem Plan) in
// Abweichungen ueberfuehren. Nur Ziele, die im Ring liegen und nicht schon
// die Karten-Uebung sind — verwaiste Eintraege (Alternative spaeter
// entfernt) wirken so nie.
export function vorbelegungAusBevorzugt(eintrag) {
  const ring = ringFuer(eintrag)
  const map = {}
  const bevorzugt = (eintrag && eintrag.bevorzugt) || {}
  for (const userId of Object.keys(bevorzugt)) {
    const ziel = bevorzugt[userId]
    if (ziel && ziel !== eintrag.exerciseId && ring.includes(ziel)) {
      map[userId] = ziel
    }
  }
  return map
}

// Standard-Uebung eines Nutzers setzen bzw. per erneutem Setzen derselben
// Uebung entfernen (Toggle). Liefert ein frisches Objekt.
export function toggleBevorzugt(bevorzugt, userId, exerciseId) {
  const map = { ...(bevorzugt || {}) }
  if (map[userId] === exerciseId) {
    delete map[userId]
  } else {
    map[userId] = exerciseId
  }
  return map
}
