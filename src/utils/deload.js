/**
 * Deload-Wochen je Person (v2.18.0, Gabriel 22.11.2026).
 *
 * Eine Deload-Woche ist eine Kalenderwoche (Montag bis Sonntag), die eine
 * Person als Deload eingetragen hat. Nach jeder Deload-Woche kommen
 * DELOAD_ABSTAND (8) normale Wochen, die neunte schlaegt die App als naechste
 * Deload-Woche vor. Eine im Voraus eingetragene Woche ersetzt den Vorschlag.
 *
 * Speicher (gesynct ueber db.meta, ein Eintrag je Person und Woche, damit
 * zwei Handys sich nie gegenseitig ueberschreiben):
 *   deload_<userId>_<Montag YYYY-MM-DD>   value true = Deload, false = entfernt
 * Entfernen schreibt false statt zu loeschen (sonst braeuchte es Tombstones).
 *
 * Wirkung ausserhalb dieser Datei: In der Deload-Woche gibt es keinen
 * Steigern-Ring, und ihre Saetze zaehlen nicht fuer die Steigern-Regel
 * (utils/steigerung.js, Parameter deloadWochen). Nach der Deload-Woche kommt
 * der Vorschlag auf der Karte aus der Woche davor (letzteEinheit).
 *
 * Reine Funktionen ohne Vue und Dexie, Vertrag: scripts/deload-test.mjs.
 */
import { addDaysToDate, daysBetweenDates, getToday, isoWeekOfDate, mondayOf, formatDayShort } from './dateHelpers.js'

/** Normale Wochen zwischen zwei Deload-Wochen. */
export const DELOAD_ABSTAND = 8

const PRAEFIX = 'deload_'
const SCHLUESSEL = /^deload_(.+)_(\d{4}-\d{2}-\d{2})$/
const DATUM = /^\d{4}-\d{2}-\d{2}$/

export const deloadSchluessel = (userId, montag) => `${PRAEFIX}${userId}_${montag}`
export const DELOAD_PRAEFIX = PRAEFIX

/** Ist das ein echter Kalendertag, der ein Montag ist? */
export function istMontag(datum) {
  if (typeof datum !== 'string' || !DATUM.test(datum)) return false
  // Kalender-Rundlauf faengt Tage wie 2026-02-30 ab
  if (addDaysToDate(datum, 0) !== datum) return false
  return mondayOf(datum) === datum
}

/** 'deload_user2_2026-11-30' -> { userId, montag }, sonst null. */
export function leseDeloadSchluessel(key) {
  const m = typeof key === 'string' ? key.match(SCHLUESSEL) : null
  if (!m || !istMontag(m[2])) return null
  return { userId: m[1], montag: m[2] }
}

/**
 * db.meta-Eintraege -> { [userId]: [Montage aufsteigend] }. Nur value === true
 * zaehlt; false (entfernt) und Fremdes fallen weg. Kaputte deload_-Schluessel
 * landen in `ungueltig`, damit der Aufrufer sie loggen kann (nie still).
 */
export function deloadWochenAusMeta(records) {
  const wochen = {}
  const ungueltig = []
  for (const r of records || []) {
    if (!r || typeof r.key !== 'string' || !r.key.startsWith(PRAEFIX)) continue
    const teile = leseDeloadSchluessel(r.key)
    if (!teile || typeof r.value !== 'boolean') { ungueltig.push(r.key); continue }
    if (!r.value) continue
    if (!wochen[teile.userId]) wochen[teile.userId] = []
    wochen[teile.userId].push(teile.montag)
  }
  for (const id of Object.keys(wochen)) wochen[id] = [...new Set(wochen[id])].sort()
  return { wochen, ungueltig }
}

/** Ganze Wochen von Montag a bis Montag b (negativ, wenn b vor a liegt). */
export function wochenAbstand(a, b) {
  return Math.round(daysBetweenDates(a, b) / 7)
}

/** Liegt der Tag in einer der Deload-Wochen (Liste oder Set von Montagen)? */
export function istDeloadTag(wochen, datum) {
  if (!datum) return false
  const montag = mondayOf(datum)
  return wochen instanceof Set ? wochen.has(montag) : (wochen || []).includes(montag)
}

/**
 * Stand der Deload-Wochen einer Person zu `heute`:
 *   art        'leer' | 'normal' | 'geplant' | 'faellig' | 'ueberfaellig' | 'laeuft'
 *   diese      Montag der laufenden Woche
 *   letzte     juengste Deload-Woche VOR dieser Woche (oder null)
 *   naechste   eingetragene kuenftige Woche, sonst der Vorschlag
 *   vorschlag  letzte (bzw. diese, wenn sie laeuft) + 9 Wochen
 *   wochenSeit Wochen seit `letzte`, wochenBis Wochen bis `naechste`
 *   ueberfaellig  Wochen seit dem verpassten Vorschlag (sonst 0)
 * Eine eingetragene kuenftige Woche geht dem Vorschlag vor — dann ist nie
 * etwas faellig, auch wenn sie spaeter liegt als der Vorschlag.
 */
export function deloadStatus(wochen, heute = getToday()) {
  const liste = [...new Set((wochen || []).filter(istMontag))].sort()
  const diese = mondayOf(heute)
  const laeuft = liste.includes(diese)
  const vergangen = liste.filter(w => w < diese)
  const letzte = vergangen.length ? vergangen[vergangen.length - 1] : null
  const geplant = liste.find(w => w > diese) || null
  const basis = laeuft ? diese : letzte
  const vorschlag = basis ? addDaysToDate(basis, 7 * (DELOAD_ABSTAND + 1)) : null

  let art
  let naechste = null
  if (laeuft) { art = 'laeuft'; naechste = geplant || vorschlag }
  else if (geplant) { art = 'geplant'; naechste = geplant }
  else if (!letzte) { art = 'leer' }
  else if (vorschlag > diese) { art = 'normal'; naechste = vorschlag }
  else if (vorschlag === diese) { art = 'faellig'; naechste = vorschlag }
  else { art = 'ueberfaellig'; naechste = vorschlag }

  return {
    art,
    diese,
    letzte,
    naechste,
    vorschlag,
    wochenSeit: letzte ? wochenAbstand(letzte, diese) : null,
    wochenBis: naechste ? wochenAbstand(diese, naechste) : null,
    ueberfaellig: art === 'ueberfaellig' ? wochenAbstand(vorschlag, diese) : 0
  }
}

/** Faerbt die Zeile auf dem Startbildschirm (dezente Erinnerung)? */
export function istErinnerung(status) {
  return status?.art === 'faellig' || status?.art === 'ueberfaellig'
}

const wochenWort = (n) => (n === 1 ? '1 Woche' : `${n} Wochen`)
export const kwText = (montag) => `KW ${isoWeekOfDate(montag)}`

/** Texte fuer die Zeile auf dem Startbildschirm: { titel, info }. */
export function deloadZeile(status) {
  const s = status || {}
  const letzteText = s.letzte ? `letzte vor ${wochenWort(s.wochenSeit)} (${kwText(s.letzte)})` : ''
  switch (s.art) {
    case 'laeuft':
      return {
        titel: 'Deload-Woche läuft',
        info: `${kwText(s.diese)} · nächste ${kwText(s.naechste)} (ab ${formatDayShort(s.naechste)})`
      }
    case 'geplant':
      return {
        titel: `Deload in ${wochenWort(s.wochenBis)}`,
        info: [`${kwText(s.naechste)} geplant`, letzteText].filter(Boolean).join(' · ')
      }
    case 'normal':
      return { titel: `Deload in ${wochenWort(s.wochenBis)}`, info: `${kwText(s.naechste)} · ${letzteText}` }
    case 'faellig':
      return { titel: 'Deload-Woche fällig', info: `diese Woche (${kwText(s.diese)}) · antippen zum Eintragen` }
    case 'ueberfaellig':
      return { titel: `Deload seit ${wochenWort(s.ueberfaellig)} fällig`, info: `war für ${kwText(s.vorschlag)} vorgesehen` }
    default:
      return { titel: 'Noch keine Deload-Woche eingetragen', info: 'antippen und die erste Woche wählen' }
  }
}

/**
 * Wochen fuer das Fenster: `zurueck` Wochen vor bis `vor` Wochen nach der
 * laufenden, dazu jede Woche aus `extra` (letzte Deload-Woche, Vorschlag),
 * auch wenn sie ausserhalb liegt. Montage aufsteigend, ohne Doppelte.
 */
export function wochenFenster(heute = getToday(), extra = [], zurueck = 4, vor = 10) {
  const diese = mondayOf(heute)
  const liste = new Set()
  for (let i = -zurueck; i <= vor; i++) liste.add(addDaysToDate(diese, 7 * i))
  for (const w of extra || []) if (istMontag(w)) liste.add(w)
  return [...liste].sort()
}

/** 'Montag' -> '30.11.–06.12.' */
export function wochenSpanne(montag) {
  return `${formatDayShort(montag)}–${formatDayShort(addDaysToDate(montag, 6))}`
}

/**
 * Ein Tipp im Fenster gilt fuer alle ausgewaehlten Personen gemeinsam:
 * haben alle die Woche schon, wird sie bei allen entfernt (false), sonst bei
 * allen gesetzt (true). `hat(userId)` sagt, ob die Person sie hat.
 */
export function zielWert(userIds, hat) {
  const ids = userIds || []
  return !(ids.length > 0 && ids.every(id => hat(id)))
}

/**
 * Saetze der letzten Einheit (juengster Tag) aus den Saetzen EINER Person in
 * EINER Uebung, nach Satznummer sortiert. Nach einer Deload-Woche zaehlen
 * deren Saetze nicht: liegt `heute` NICHT in einer Deload-Woche, werden Saetze
 * aus Deload-Wochen uebersprungen — gibt es nur solche, gelten sie doch. In
 * der Deload-Woche selbst zaehlt alles (zweites Training zeigt das erste).
 * `ohneWorkoutLogId` nimmt das laufende Training aus.
 * Einzige Regel fuer Vorschlag (useHistory.getLastSets) und Steigern-Merker
 * (stores/workout.js toggleIncreaseNextTime) — beide muessen dieselbe Einheit
 * meinen, sonst schreibt der Tipp den Merker woanders hin, als er gelesen wird.
 */
export function letzteEinheit(sets, { ohneWorkoutLogId = null, deloadWochen = [], heute = getToday() } = {}) {
  let liste = (sets || []).filter(s => s && s.date && (!ohneWorkoutLogId || s.workoutLogId !== ohneWorkoutLogId))
  if (liste.length === 0) return []
  const deload = new Set(deloadWochen || [])
  if (deload.size && !deload.has(mondayOf(heute))) {
    const ohne = liste.filter(s => !deload.has(mondayOf(s.date)))
    if (ohne.length) liste = ohne
  }
  liste = [...liste].sort((a, b) => b.date.localeCompare(a.date) || (a.setNumber || 0) - (b.setNumber || 0))
  const tag = liste[0].date
  return liste.filter(s => s.date === tag)
}
