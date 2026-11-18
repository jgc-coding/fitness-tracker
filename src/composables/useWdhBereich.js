import { db } from '../db/dexie.js'
import { pushRecord } from '../services/syncService.js'
import { STANDARD_BEREICH, wdhBereichGueltig, wdhBereichSchluessel } from '../utils/steigerung.js'

// Wdh-Bereich je Person und Uebung (v2.17.0). Der EINZIGE Ort, der
// `wdhBereich_<userId>_<exerciseId>` in db.meta liest oder schreibt —
// Detailansicht und Karte (Steigern-Erinnerung) nutzen beide diese
// Funktionen. Gesynct ueber db.meta, ein Eintrag je Paar; fehlt er oder ist
// er kaputt, gilt 8-12 (kaputt mit Warnung im Log, nie still).

/**
 * Bereich einer Person fuer eine Uebung.
 * Liefert { min, max, gespeichert } — gespeichert = false heisst Standard 8-12.
 */
export async function ladeWdhBereich(userId, exerciseId) {
  const stored = await db.meta.get(wdhBereichSchluessel(userId, exerciseId))
  const bereich = wdhBereichGueltig(stored?.value)
  if (stored && !bereich) {
    console.warn('[FitTrack] [WARN] Ungueltiger Wdh-Bereich ignoriert, nutze 8-12:', userId, exerciseId, stored.value)
  }
  return bereich
    ? { ...bereich, gespeichert: true }
    : { ...STANDARD_BEREICH, gespeichert: false }
}

/** Bereiche mehrerer Personen fuer eine Uebung: { [userId]: { min, max, gespeichert } } */
export async function ladeWdhBereiche(userIds, exerciseId) {
  const ergebnis = {}
  for (const userId of userIds) {
    ergebnis[userId] = await ladeWdhBereich(userId, exerciseId)
  }
  return ergebnis
}

/**
 * Speichert einen Bereich (ganze Zahlen, 1 <= min < max <= 50). Ungueltiges
 * wird nicht geschrieben, sondern geloggt; Rueckgabe true = gespeichert.
 */
export async function speichereWdhBereich(userId, exerciseId, wert) {
  const bereich = wdhBereichGueltig(wert)
  if (!bereich || !userId || !exerciseId) {
    console.warn('[FitTrack] [WARN] Wdh-Bereich nicht gespeichert (ungueltig):', userId, exerciseId, wert)
    return false
  }
  const key = wdhBereichSchluessel(userId, exerciseId)
  const record = { key, value: bereich, updatedAt: new Date().toISOString() }
  await db.meta.put(record)
  pushRecord('meta', key, record)
  return true
}
