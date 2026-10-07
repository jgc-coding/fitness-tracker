/**
 * Zyklustag errechnen (seit v2.12.0).
 *
 * Bis v2.11 gab es nur von Hand eingetragene Zyklustage: am Training
 * (`workoutLog.cycleDays[userId]`), ab v2.12 auch am Lauf
 * (`runSession.feedback.cycleDay`). Die App rechnet daraus fuer einen Tag den
 * Wert weiter: zeitlich naechster Eintrag plus die Kalendertage dazwischen.
 * Das Ergebnis ist nur ein VORSCHLAG — gespeichert wird erst, was die Person
 * im Formular sieht und bestaetigt.
 *
 * Reine Funktionen ohne Vue und Dexie, Vertrag: scripts/zyklustag-test.mjs.
 */
import { daysBetweenDates } from './dateHelpers.js'
import { isValidDateString } from './runPlanSchema.js'

/** Groesster Zyklustag, wie das Rad im Training (1-45). */
export const ZYKLUS_MAX = 45

/** Weiter als so viele Tage weg ist kein Eintrag eine brauchbare Grundlage. */
export const ZYKLUS_MAX_ABSTAND = 45

/** Ganze Zahl von 1 bis ZYKLUS_MAX — sonst ist es kein Zyklustag. */
export function istZyklustag(wert) {
  return Number.isInteger(wert) && wert >= 1 && wert <= ZYKLUS_MAX
}

/**
 * Eingabe aus dem Formular pruefen. Leer heisst "kein Zyklustag" und ist
 * erlaubt; alles andere muss ein gueltiger Tag sein. `ok: false` heisst: das
 * Formular darf so nicht speichern (nie still verwerfen).
 * @returns {{ ok: boolean, wert: number|null }}
 */
export function leseZyklusEingabe(roh) {
  if (roh === null || roh === undefined) return { ok: true, wert: null }
  const text = String(roh).trim()
  if (text === '') return { ok: true, wert: null }
  if (!/^\d{1,2}$/.test(text)) return { ok: false, wert: null }
  const zahl = Number(text)
  return istZyklustag(zahl) ? { ok: true, wert: zahl } : { ok: false, wert: null }
}

/**
 * Alle bekannten Zyklustage einer Person aus Trainings und Laeufen.
 * Ungueltige Werte (0, 46, Text) und fremde Personen fallen heraus.
 * @returns {{ date: string, day: number, quelle: 'training'|'lauf', at: string }[]}
 */
export function sammleZyklusEintraege(userId, workoutLogs = [], runSessions = []) {
  const eintraege = []
  for (const log of workoutLogs || []) {
    const day = log?.cycleDays?.[userId]
    if (!istZyklustag(day) || !isValidDateString(log.date)) continue
    eintraege.push({ date: log.date, day, quelle: 'training', at: log.updatedAt || '' })
  }
  for (const lauf of runSessions || []) {
    if (lauf?.userId !== userId) continue
    const day = lauf.feedback?.cycleDay
    if (!istZyklustag(day) || !isValidDateString(lauf.date)) continue
    eintraege.push({ date: lauf.date, day, quelle: 'lauf', at: lauf.feedback?.at || lauf.updatedAt || '' })
  }
  return eintraege
}

/**
 * Zyklustag an `datum`, errechnet aus dem zeitlich naechsten Eintrag.
 *
 * - Naechster Eintrag gewinnt; bei gleichem Abstand der fruehere (vorwaerts
 *   rechnen ist sicherer, weil ein Zyklus nach vorn sichtbar weiterlaeuft).
 * - Am selben Tag mit zwei Eintraegen gewinnt der zuletzt geaenderte.
 * - Ergibt ein Eintrag keinen gueltigen Tag (rueckwaerts unter 1, vorwaerts
 *   ueber ZYKLUS_MAX), kommt der naechstbeste dran.
 * - Mehr als ZYKLUS_MAX_ABSTAND Tage weg zaehlt nicht.
 *
 * @returns {{ tag: number, basis: { date: string, day: number, quelle: string } } | null}
 */
export function errechneZyklustag(eintraege, datum) {
  if (!isValidDateString(datum)) return null
  const kandidaten = (eintraege || [])
    .map(e => ({ ...e, abstand: daysBetweenDates(e.date, datum) }))
    .filter(e => Math.abs(e.abstand) <= ZYKLUS_MAX_ABSTAND)
    .sort((a, b) => {
      const naehe = Math.abs(a.abstand) - Math.abs(b.abstand)
      if (naehe !== 0) return naehe
      // Gleicher Abstand: der Eintrag VOR dem Tag zuerst (abstand >= 0).
      if (a.abstand !== b.abstand) return b.abstand - a.abstand
      // Gleicher Tag: der zuletzt geaenderte zuerst.
      return String(b.at || '').localeCompare(String(a.at || ''))
    })

  for (const e of kandidaten) {
    const tag = e.day + e.abstand
    if (istZyklustag(tag)) {
      return { tag, basis: { date: e.date, day: e.day, quelle: e.quelle } }
    }
  }
  return null
}
