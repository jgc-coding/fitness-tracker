// Schnellwechsel-Ring mit gemeinsamer Standard-Uebung (reine Funktionen).
//
// Ein Workout-Eintrag traegt: `exerciseId` (die Uebung der Karte — sie gilt
// fuer ALLE Nutzer), `basisExerciseId` (die geplante Uebung) und
// `alternativen` (Array aus dem Plan). Der PLAN-Eintrag traegt zusaetzlich
// `bevorzugt` ({ userId: exerciseId }, gesynct) — seit v2.10.0 der Standard
// der ganzen Karte, fuer jeden Nutzer mit demselben Wert gespeichert.
// `userExerciseIds` ({ userId: exerciseId }) ist Altbestand: bis v2.9 konnte
// jeder Nutzer einzeln wechseln. Gelesen wird es weiter (laufende Trainings),
// jeder Wechsel leert es.
// Alle Felder sind additiv: Eintraege ohne sie bleiben ueberall gueltig.
//
// Warum gemeinsam (Gabriel 04.10.2026): Zu zweit wechselte ein Wisch nur einen
// Nutzer. Der andere blieb auf der alten Uebung, und niemand sah, zu welcher
// Uebung sein Gewicht gehoerte.
//
// Vertrag: scripts/uebungsring-test.mjs — wer Regeln hier aendert,
// erweitert ZUERST den Test.

// Der Wechsel-Ring: [Basis, ...Alternativen]. Laenge 1 heisst: kein Wechsel.
export function ringFuer(eintrag) {
  if (!eintrag) return []
  return [eintrag.basisExerciseId || eintrag.exerciseId, ...(eintrag.alternativen || [])]
}

// Aktive Uebung EINES Nutzers: seine Abweichung (Altbestand), sonst die Karte.
export function aktiveUebungId(eintrag, userId) {
  if (!eintrag) return null
  return (eintrag.userExerciseIds && eintrag.userExerciseIds[userId]) || eintrag.exerciseId
}

// Position der aktiven Uebung des Nutzers im Ring; -1 nach freiem Tausch
// auf eine Uebung ausserhalb.
export function ringPosition(eintrag, userId) {
  return ringFuer(eintrag).indexOf(aktiveUebungId(eintrag, userId))
}

// Naechste Uebung im Ring, gemessen an diesem Nutzer — oder null, wenn es
// nichts zu wechseln gibt. Ausserhalb des Rings (freier Tausch) fuehrt der
// naechste Schritt zur Basis.
export function naechsteImRing(eintrag, userId, richtung = 1) {
  const ring = ringFuer(eintrag)
  if (ring.length <= 1) return null
  const aktuell = aktiveUebungId(eintrag, userId)
  const pos = ring.indexOf(aktuell)
  const naechste = pos < 0 ? ring[0] : ring[(pos + richtung + ring.length) % ring.length]
  return naechste === aktuell ? null : naechste
}

// Die ganze Karte auf eine Uebung setzen: gilt fuer jeden Nutzer, auch fuer
// einen, der spaeter dazukommt. Immer frische Kopien — nie das Original
// veraendern (Vue-Proxy/Dexie).
export function fuerAlle(eintrag, exerciseId) {
  return { ...eintrag, exerciseId, userExerciseIds: {} }
}

// Wisch oder Wechsel-Knopf: alle Nutzer zusammen eine Uebung weiter. Das Ziel
// misst sich an der Uebung im Kartentitel (`kopfUserId`), damit Altbestand mit
// Abweichungen beim ersten Wechsel einheitlich wird. null = nichts zu wechseln.
export function gemeinsamWeiter(eintrag, kopfUserId, richtung = 1) {
  const ziel = naechsteImRing(eintrag, kopfUserId, richtung)
  return ziel ? fuerAlle(eintrag, ziel) : null
}

// Standard der Karte aus `bevorzugt`: der erste Eintrag in `reihenfolge`
// (Nutzer-Kennungen, der bevorzugte Nutzer zuerst), der im Ring liegt.
// Verwaiste Ziele (Alternative spaeter entfernt) und unbekannte Kennungen
// wirken nie.
export function kartenStandard(eintrag, reihenfolge) {
  const ring = ringFuer(eintrag)
  const bevorzugt = (eintrag && eintrag.bevorzugt) || {}
  for (const userId of reihenfolge) {
    const ziel = bevorzugt[userId]
    if (ziel && ring.includes(ziel)) return ziel
  }
  return null
}

// Beim Workout-Start (erster Aufbau aus der Plan-Liste): die Karte beginnt mit
// ihrem Standard, fuer alle Nutzer. Die Basis bleibt die geplante Uebung.
export function startMitStandard(eintrag, reihenfolge) {
  const basis = { ...eintrag, basisExerciseId: eintrag.basisExerciseId || eintrag.exerciseId }
  return fuerAlle(basis, kartenStandard(basis, reihenfolge) || basis.exerciseId)
}

// Stern: ist `exerciseId` schon der Standard der Karte, entfernt ein Tipp ihn
// (fuer alle), sonst wird sie der Standard — fuer jeden Nutzer in `userIds`
// derselbe Wert, damit auch aeltere App-Versionen ihn je Nutzer lesen.
// Liefert ein frisches Objekt fuer `bevorzugt`.
export function toggleStandard(eintrag, userIds, exerciseId, reihenfolge) {
  if (kartenStandard(eintrag, reihenfolge) === exerciseId) return {}
  return Object.fromEntries(userIds.map(userId => [userId, exerciseId]))
}

// Was die Wechsel-Zeile zeigt (Gabriel 26.09.2026): `ziel` ist die Uebung, zu
// der ein Tipp wechselt — der Knopf nennt das Ziel, nicht die aktuelle
// Uebung, denn die steht schon im Kartentitel (Uebung des Titel-Nutzers
// `kopfUserId`). `eigene` ist die aktive Uebung des Nutzers, aber nur, wenn
// sie vom Titel abweicht (Altbestand) — sonst null.
export function wechselAnzeige(eintrag, userId, kopfUserId) {
  const aktiv = aktiveUebungId(eintrag, userId)
  const kopf = aktiveUebungId(eintrag, kopfUserId)
  return {
    ziel: naechsteImRing(eintrag, userId, 1),
    eigene: aktiv !== kopf ? aktiv : null
  }
}
