import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db/dexie.js'
import { pushRecord } from '../services/syncService.js'
import { getToday } from '../utils/dateHelpers.js'
import {
  DELOAD_PRAEFIX,
  deloadSchluessel,
  deloadStatus,
  deloadWochenAusMeta,
  istDeloadTag,
  istMontag
} from '../utils/deload.js'

// Deload-Wochen je Person (v2.18.0, Regeln in utils/deload.js). Der EINZIGE
// Ort, der `deload_<userId>_<Montag>` in db.meta liest oder schreibt —
// Startbildschirm, Training (Steigern-Ring, Vorschlag) und History lesen
// alle hier. Gesynct ueber db.meta, ein Eintrag je Person und Woche.
export const useDeloadStore = defineStore('deload', () => {
  const wochen = ref({}) // { userId: [Montage aufsteigend] }
  // Zaehlt jede Aenderung hoch — Ansichten beobachten das und rechnen neu
  const stand = ref(0)
  let laden = null

  async function neuLaden() {
    const records = await db.meta.where('key').startsWith(DELOAD_PRAEFIX).toArray()
    const { wochen: neu, ungueltig } = deloadWochenAusMeta(records)
    if (ungueltig.length) {
      // Nie still: ein kaputter Eintrag gehoert ins Log
      console.warn('[FitTrack] [WARN] Ungueltige Deload-Eintraege ignoriert:', ungueltig)
    }
    wochen.value = neu
    stand.value++
  }

  /** Laedt einmal; jeder Aufrufer kann darauf warten. */
  function bereit() {
    if (!laden) {
      laden = neuLaden().catch(err => {
        laden = null
        console.error('[FitTrack] [ERROR] Deload-Wochen nicht lesbar:', err)
        throw err
      })
    }
    return laden
  }

  function wochenVon(userId) {
    return wochen.value[userId] || []
  }

  function istDeload(userId, datum = getToday()) {
    return istDeloadTag(wochenVon(userId), datum)
  }

  function status(userId, heute = getToday()) {
    return deloadStatus(wochenVon(userId), heute)
  }

  /**
   * Setzt (an = true) oder entfernt (an = false) eine Woche fuer mehrere
   * Personen. Entfernen schreibt false statt zu loeschen (keine Tombstones).
   * Wirft bei ungueltiger Eingabe oder Schreibfehler — die Oberflaeche zeigt es.
   */
  async function setzen(userIds, montag, an) {
    if (!istMontag(montag) || typeof an !== 'boolean' || !Array.isArray(userIds) || userIds.length === 0) {
      throw new Error(`Deload ungueltig: ${JSON.stringify({ userIds, montag, an })}`)
    }
    const updatedAt = new Date().toISOString()
    for (const userId of userIds) {
      const key = deloadSchluessel(userId, montag)
      const record = { key, value: an, updatedAt }
      await db.meta.put(record)
      pushRecord('meta', key, record)
    }
    await neuLaden()
  }

  // Kommt per Sync eine Woche vom anderen Handy, sofort neu lesen
  if (typeof window !== 'undefined') {
    window.addEventListener('fitness-sync-changed', (e) => {
      if (e.detail?.collection === 'meta') {
        neuLaden().catch(err => console.error('[FitTrack] [ERROR] Deload-Wochen nach Sync nicht lesbar:', err))
      }
    })
  }

  return { wochen, stand, bereit, wochenVon, istDeload, status, setzen }
})
