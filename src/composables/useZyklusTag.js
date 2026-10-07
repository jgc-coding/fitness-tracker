import { db } from '../db/dexie.js'
import { sammleZyklusEintraege, errechneZyklustag } from '../utils/zyklusTag.js'

/**
 * Errechneter Zyklustag einer Person an einem Tag — nur ein Vorschlag, die
 * Regeln stehen in utils/zyklusTag.js. Liest direkt aus IndexedDB, damit es
 * im Krafttraining auch ohne geladenen Lauf-Store funktioniert.
 * @returns {Promise<{ tag: number, basis: { date: string, day: number, quelle: string } } | null>}
 */
export async function errechneZyklustagFuer(userId, datum) {
  if (!userId || !datum) return null
  try {
    const [logs, laeufe] = await Promise.all([
      db.workoutLogs.toArray(),
      db.runSessions.where('userId').equals(userId).toArray()
    ])
    return errechneZyklustag(sammleZyklusEintraege(userId, logs, laeufe), datum)
  } catch (e) {
    // Ohne Vorschlag bleibt das Feld leer und laesst sich von Hand fuellen.
    console.warn('[FitTrack] [WARN] Zyklustag nicht errechenbar:', e?.message || e)
    return null
  }
}
