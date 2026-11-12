// Saetze je Uebung und Nutzer (reine Funktionen, ohne Vue und Dexie).
//
// Jede Person hat eine Satzzahl (Einstellungen -> "Saetze je Uebung",
// db.meta `saetze_<userId>`, gesynct): 1 = EIN Referenzwert je Uebung, wie die
// App bis v2.3 arbeitete; ab 2 bekommt jeder Satz ein eigenes setLog mit
// setNumber 1..n (Entscheidung Gabriel 26.09.2026, fuer user1: 3).
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

// Erster offener Satz 1..slots (Luecken zuerst) — alle gespeichert oder
// ausgelassen: null. `ausgelassen` sind Satznummern (siehe unten).
export function offenerSatz(slots, saetzeHeute = [], ausgelassen = []) {
  const belegt = new Set(saetzeHeute.map(s => s.setNumber))
  const weg = new Set(ausgelassen)
  for (let n = 1; n <= slots; n++) {
    if (!belegt.has(n) && !weg.has(n)) return n
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
// Ausgelassene Saetze kommen nicht in die Folge.
export function quickLogFolge(slots, saetzeHeute = [], vorschlagFuer, ausgelassen = []) {
  const simuliert = [...saetzeHeute]
  const folge = []
  for (let n = 1; n <= slots; n++) {
    if (saetzeHeute.some(s => s.setNumber === n)) continue
    if (ausgelassen.includes(n)) continue
    const v = vorbelegung(simuliert, n, vorschlagFuer(n))
    const eintrag = { setNumber: n, weight: v?.weight ?? 20, reps: v?.reps ?? 10 }
    folge.push(eintrag)
    simuliert.push({ ...eintrag, createdAt: '' })
  }
  return folge
}

// Rueckgaengig nach dem Speichern (v2.14.0, Gabriel 17.10.2026: Gewicht im
// falschen Namens-Reiter eingetragen). `vorher` ist der Stand DIESES Satzes
// direkt vor dem Speichern: null = es gab ihn noch nicht -> er verschwindet
// wieder (mit Tombstone); sonst kommen genau Gewicht und Wdh von vorher zurueck.
export function rueckgaengigSchritt(vorher) {
  if (!vorher) return { art: 'loeschen' }
  return { art: 'zuruecksetzen', weight: vorher.weight, reps: vorher.reps }
}

// --- Ausgelassene Saetze (v2.15.0, Wunsch Gabriel 12.11.2026) ---------------
// Wer mehrere Saetze erfasst, macht manchmal weniger (2 statt 3), je Uebung
// verschieden. Ein ausgelassener Satz ist KEIN setLog, sondern eine
// Satznummer am workoutLog:
//   ausgelasseneSaetze: [{ exerciseId, userId, saetze: [3] }]
// So muss kein Vorschlag, Verlauf und Maximum einen leeren Satz ueberspringen,
// und aeltere App-Versionen ignorieren das Feld einfach.
// Ein gespeicherter Satz gewinnt immer (`wirksamAusgelassen`): die Liste wird
// beim Speichern nicht angefasst, darum stellt "Rueckgaengig" nach einem doch
// gespeicherten Satz von selbst den ausgelassenen Zustand wieder her.

// Satznummern bereinigen: ganze Zahlen ab 1, einmalig, aufsteigend
function satzNummern(liste) {
  if (!Array.isArray(liste)) return []
  const gut = liste.filter(n => Number.isInteger(n) && n >= 1)
  return [...new Set(gut)].sort((a, b) => a - b)
}

function eintraegeAus(log) {
  const liste = log?.ausgelasseneSaetze
  return Array.isArray(liste) ? liste.filter(e => e && typeof e === 'object') : []
}

// Ausgelassene Satznummern einer Person bei einer Uebung in einem Training
export function ausgelasseneAusLog(log, exerciseId, userId) {
  const saetze = []
  for (const e of eintraegeAus(log)) {
    if (e.exerciseId === exerciseId && e.userId === userId) saetze.push(...(Array.isArray(e.saetze) ? e.saetze : []))
  }
  return satzNummern(saetze)
}

// Neue Liste fuer den workoutLog: der Eintrag dieser Uebung und Person wird
// ersetzt (leere Liste = Eintrag weg). Immer frische Objekte und Arrays —
// reaktive Vue-Proxys sprengen sonst das Dexie-update (DataCloneError).
export function mitAusgelassenen(eintraege, exerciseId, userId, saetze) {
  const rest = eintraegeAus({ ausgelasseneSaetze: eintraege })
    .filter(e => !(e.exerciseId === exerciseId && e.userId === userId))
    .map(e => ({ exerciseId: e.exerciseId, userId: e.userId, saetze: satzNummern(e.saetze) }))
  const neu = satzNummern(saetze)
  return neu.length > 0 ? [...rest, { exerciseId, userId, saetze: neu }] : rest
}

// Was wirklich als ausgelassen gilt: ohne die heute doch gespeicherten Saetze
export function wirksamAusgelassen(ausgelassen = [], saetzeHeute = []) {
  const belegt = new Set(saetzeHeute.map(s => s.setNumber))
  return satzNummern(ausgelassen).filter(n => !belegt.has(n))
}

// Welche Saetze ein Tipp auf "Auslassen" bei Satz n markiert: n und alle
// spaeteren, die weder gespeichert noch schon ausgelassen sind — wer einen
// Satz auslaesst, hoert mit der Uebung auf (sonst traegt man den naechsten
// gemachten Satz einfach unter dieser Nummer ein).
export function auslassenAb(n, slots, saetzeHeute = [], ausgelassen = []) {
  const belegt = new Set(saetzeHeute.map(s => s.setNumber))
  if (belegt.has(n) || n < 1 || n > slots) return []
  const schon = new Set(ausgelassen)
  const neu = []
  for (let m = n; m <= slots; m++) {
    if (!belegt.has(m) && !schon.has(m)) neu.push(m)
  }
  return neu
}

// "Wieder oeffnen": Satz n aus der Liste nehmen
export function ohneSatz(ausgelassen = [], n) {
  return satzNummern(ausgelassen).filter(m => m !== n)
}

// Stand fuer Karte (Punkte) und Sperrbildschirm: je Position gespeichert,
// ausgelassen oder offen. null bei einem Satz je Uebung (keine Punkte).
export function satzStand(slots, saetzeHeute = [], ausgelassen = []) {
  if (slots <= 1) return null
  const belegt = new Set(saetzeHeute.map(s => s.setNumber))
  const weg = new Set(wirksamAusgelassen(ausgelassen, saetzeHeute))
  const zustaende = []
  for (let n = 1; n <= slots; n++) {
    zustaende.push(belegt.has(n) ? 'gespeichert' : weg.has(n) ? 'ausgelassen' : 'offen')
  }
  const fertig = zustaende.filter(z => z === 'gespeichert').length
  const aus = zustaende.filter(z => z === 'ausgelassen').length
  return { slots, fertig, ausgelassen: aus, erledigt: fertig + aus, zustaende }
}

// Knopf-Text, kurz: "Satz 3", "Satz 2–3", "Satz 2+4"
export function satzKurz(nummern = []) {
  const n = satzNummern(nummern)
  if (n.length === 0) return ''
  if (n.length === 1) return `Satz ${n[0]}`
  const amStueck = n.every((x, i) => i === 0 || x === n[i - 1] + 1)
  return amStueck ? `Satz ${n[0]}–${n[n.length - 1]}` : `Satz ${n.join('+')}`
}

// Meldungs-Text, ausgeschrieben: "Satz 3", "Satz 2 und 3", "Satz 1, 2 und 3"
export function satzListeText(nummern = []) {
  const n = satzNummern(nummern)
  if (n.length === 0) return ''
  if (n.length === 1) return `Satz ${n[0]}`
  return `Satz ${n.slice(0, -1).join(', ')} und ${n[n.length - 1]}`
}

// Fuer die History: alle wirksam ausgelassenen Saetze, je Training, Uebung
// und Person ein Eintrag { logId, date, exerciseId, userId, saetze }.
// `saetze` (setLogs) entscheidet, was doch gespeichert wurde.
export function ausgelasseneEintraege(logs = [], saetze = []) {
  const gespeichert = new Set()
  for (const s of Array.isArray(saetze) ? saetze : []) {
    gespeichert.add(`${s.workoutLogId}|${s.exerciseId}|${s.userId}|${s.setNumber}`)
  }
  const ergebnis = []
  for (const log of Array.isArray(logs) ? logs : []) {
    const gesehen = new Set()
    for (const e of eintraegeAus(log)) {
      const k = `${e.exerciseId}|${e.userId}`
      if (gesehen.has(k)) continue
      gesehen.add(k)
      const nummern = ausgelasseneAusLog(log, e.exerciseId, e.userId)
        .filter(n => !gespeichert.has(`${log.id}|${e.exerciseId}|${e.userId}|${n}`))
      if (nummern.length > 0) {
        ergebnis.push({ logId: log.id, date: log.date, exerciseId: e.exerciseId, userId: e.userId, saetze: nummern })
      }
    }
  }
  return ergebnis
}
