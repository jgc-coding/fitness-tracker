// Saetze je Uebung und Nutzer (reine Funktionen, ohne Vue und Dexie).
//
// Jede Person hat eine Satzzahl (Einstellungen -> "Saetze je Uebung",
// db.meta `saetze_<userId>`, gesynct): 1 = EIN Referenzwert je Uebung, wie die
// App bis v2.3 arbeitete; ab 2 bekommt jeder Satz ein eigenes setLog mit
// setNumber 1..n (Entscheidung Gabriel 26.09.2026, fuer Lisa: 3).
// Ein Satz ist immer EIN Datensatz: Gewicht und Wdh stammen nie aus zwei
// verschiedenen setLogs (Vorwert-Regel, siehe CLAUDE.md).
//
// Vertrag: scripts/saetze-test.mjs — wer Regeln hier aendert, erweitert
// ZUERST den Test.

export const SATZZAHL_MAX = 5

// Gespeicherten Wert der Einstellung pruefen: ganze Zahl 1..5, sonst null.
// null heisst "ungueltig oder nie gesetzt" — der Aufrufer nimmt dann 1 und
// warnt, wenn wirklich ein kaputter Wert gespeichert war.
export function satzZahlGueltig(wert) {
  if (wert === null || wert === undefined || wert === '') return null
  const n = Number(wert)
  return Number.isInteger(n) && n >= 1 && n <= SATZZAHL_MAX ? n : null
}

// Wie viele Saetze Rad und Karte zeigen: die eingestellte Zahl, mindestens
// aber die hoechste heute gespeicherte Satznummer — wird die Einstellung
// spaeter gesenkt, verschwindet kein gespeicherter Satz aus der Anzeige.
export function satzSlots(satzZahl, saetzeHeute = []) {
  let hoechste = 0
  for (const s of saetzeHeute) {
    if (s.setNumber > hoechste) hoechste = s.setNumber
  }
  return Math.max(satzZahl, hoechste)
}

// Erster offener Satz 1..slots (Luecken zuerst) — alle gespeichert: null.
export function offenerSatz(slots, saetzeHeute = []) {
  const belegt = new Set(saetzeHeute.map(s => s.setNumber))
  for (let n = 1; n <= slots; n++) {
    if (!belegt.has(n)) return n
  }
  return null
}

// Wie viele verschiedene Saetze gespeichert sind (Punkte auf der Karte)
export function gespeicherteSaetze(slots, saetzeHeute = []) {
  const belegt = new Set(saetzeHeute.map(s => s.setNumber).filter(n => n >= 1 && n <= slots))
  return belegt.size
}

function spaeterEingetragen(a, b) {
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
}

function neuester(liste) {
  return [...liste].sort(spaeterEingetragen)[0]
}

// Der zuletzt eingetragene Satz einer Einheit: hoechste Satznummer, bei
// gleicher Nummer das spaetere createdAt. So entstand der Vorschlag bis v2.3
// (getLatestWeight) — fuer Referenzwert-Nutzer bleibt er damit gleich.
export function letzterSatz(saetze = []) {
  if (saetze.length === 0) return null
  return [...saetze].sort((a, b) => (b.setNumber - a.setNumber) || spaeterEingetragen(a, b))[0]
}

// Satz n aus einer Einheit: genau dieser Satz; fehlt er (letztes Mal weniger
// Saetze), der hoechste Satz davor; gibt es auch den nicht, der niedrigste
// Satz danach. null ohne Daten.
export function satzAusEinheit(saetze = [], n) {
  if (saetze.length === 0) return null
  const gleich = saetze.filter(s => s.setNumber === n)
  if (gleich.length > 0) return neuester(gleich)
  const davor = saetze.filter(s => s.setNumber < n)
  if (davor.length > 0) return letzterSatz(davor)
  const niedrigste = Math.min(...saetze.map(s => s.setNumber))
  return neuester(saetze.filter(s => s.setNumber === niedrigste))
}

// Vorschlag fuer die Karte (Satz 1 bzw. der eine Referenzwert) aus den
// Saetzen der letzten Einheit: mit einem Satz je Uebung der zuletzt
// eingetragene, mit mehreren Saetzen deren Satz 1.
export function vorschlagsSatz(letzteEinheit = [], satzZahl) {
  return satzZahl > 1 ? satzAusEinheit(letzteEinheit, 1) : letzterSatz(letzteEinheit)
}

// Vorbelegung des Rads fuer Satz n — Gewicht UND Wdh aus einem Datensatz:
//  1. heute schon gespeichert: dieser Satz (Korrektur)
//  2. heute ein Satz davor gespeichert: der hoechste davon (man bleibt beim
//     Gewicht und schaut, wie viele Wdh noch gehen)
//  3. `vorschlag` aus der letzten Einheit (vom Aufrufer, inkl. Steigerung)
//  4. null — der Aufrufer nimmt seinen Standard (20 kg x 10)
// Liefert { weight, reps, quelle: 'heute' | 'davor' | 'vorschlag' } oder null.
export function vorbelegung(saetzeHeute = [], n, vorschlag) {
  const gespeichert = saetzeHeute.filter(s => s.setNumber === n)
  if (gespeichert.length > 0) {
    const s = neuester(gespeichert)
    return { weight: s.weight, reps: s.reps, quelle: 'heute' }
  }
  const davor = saetzeHeute.filter(s => s.setNumber < n)
  if (davor.length > 0) {
    const s = letzterSatz(davor)
    return { weight: s.weight, reps: s.reps, quelle: 'davor' }
  }
  if (vorschlag) return { weight: vorschlag.weight, reps: vorschlag.reps, quelle: 'vorschlag' }
  return null
}

// Wohin das Rad nach dem Speichern springt: reihum der naechste ANDERE
// aktive Nutzer (ab dem aktuellen) mit einem offenen Satz — beim Training zu
// zweit wechselt man sich ab —, sonst der naechste offene Satz des aktuellen
// Nutzers, sonst null (Rad schliesst). offenerSatzVon(userId) liefert die
// Satznummer oder null.
export function naechsterSchritt(nutzerIds, aktuell, offenerSatzVon) {
  const start = nutzerIds.indexOf(aktuell)
  const reihe = start < 0
    ? nutzerIds
    : [...nutzerIds.slice(start + 1), ...nutzerIds.slice(0, start)]
  for (const userId of reihe) {
    const satz = offenerSatzVon(userId)
    if (satz != null) return { userId, satz }
  }
  if (start < 0) return null
  const eigener = offenerSatzVon(aktuell)
  return eigener != null ? { userId: aktuell, satz: eigener } : null
}

// Quick-Log-Folge einer Person fuer EINE Uebung (Knopf auf dem
// Sperrbildschirm): alle offenen Saetze 1..slots der Reihe nach, jeder
// vorbelegt wie im Rad. Ein offener Satz davor zaehlt dabei, als waere er
// schon eingetragen — der Knopf traegt ihn ja vorher ein.
// vorschlagFuer(n) liefert { weight, reps } oder null; ohne jede Vorbelegung
// gilt der Standard 20 kg x 10 wie bisher.
export function quickLogFolge(slots, saetzeHeute = [], vorschlagFuer) {
  const simuliert = [...saetzeHeute]
  const folge = []
  for (let n = 1; n <= slots; n++) {
    if (saetzeHeute.some(s => s.setNumber === n)) continue
    const v = vorbelegung(simuliert, n, vorschlagFuer(n))
    const eintrag = { setNumber: n, weight: v?.weight ?? 20, reps: v?.reps ?? 10 }
    folge.push(eintrag)
    simuliert.push({ ...eintrag, createdAt: '' })
  }
  return folge
}
