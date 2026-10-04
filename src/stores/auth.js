import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, generateId } from '../db/dexie.js'
import { USERS } from '../utils/constants.js'
import { pushRecord } from '../services/syncService.js'
import { satzZahlGueltig } from '../utils/saetze.js'

// Der Standard-Nutzer ist eine GERAETE-Einstellung, kein geteilter Datensatz:
// auf dem Handy von user1 soll user1 vorausgewaehlt sein, auf dem von user2
// user2. Deshalb localStorage statt db.meta — die meta-Tabelle wird mit der
// Cloud abgeglichen, beide Handys wuerden sich den Wert gegenseitig ueberschreiben.
// Der Schluessel traegt den DB-Namen, damit sich mehrere Apps derselben
// Origin den localStorage nicht in die Quere kommen.
const DEFAULT_USER_KEY = `${db.name}:defaultUserId`

// Wer heute trainiert, ist ebenfalls eine GERAETE-Einstellung (siehe oben):
// die Auswahl auf dem Startbildschirm gilt fuer dieses Handy, nicht fuer alle.
const ACTIVE_USERS_KEY = `${db.name}:activeUserIds`
// Kennung DIESES Geraets (v2.8.1): jeder Trainingsstart stempelt sie als
// `deviceId` an den workoutLog, fortgesetzt wird nur ein eigenes Training
// (utils/trainingGeraet.js) — sonst sprang ein Handy in das laufende Training
// des anderen. Geraete-lokal wie der Standard-Nutzer, nie in db.meta.
const DEVICE_ID_KEY = `${db.name}:deviceId`

// Nur Erstwert des ref — der echte Fallback ohne gespeicherte Auswahl ist der
// Standard-Nutzer dieses Geraets (siehe loadActiveUsers), nie ein leeres Array.
const ACTIVE_USERS_FALLBACK = ['user1', 'user2']

export const useAuthStore = defineStore('auth', () => {
  // Eigene Kopien: loadUserNames setzt die echten Namen hier, die Platzhalter
  // in constants.js bleiben unberuehrt
  const users = ref(USERS.map(u => ({ ...u })))
  const historyViewUser = ref('user1')
  const defaultUserId = ref(users.value[0].id)
  const activeUserIds = ref([...ACTIVE_USERS_FALLBACK])
  const deviceId = ref(null)
  const activeUsers = computed(() =>
    users.value.filter(u => activeUserIds.value.includes(u.id))
  )

  async function updateUserName(userId, name) {
    const user = users.value.find(u => u.id === userId)
    if (user) {
      user.name = name
      const key = `userName_${userId}`
      const record = { key, value: name, updatedAt: new Date().toISOString() }
      await db.meta.put(record)
      pushRecord('meta', key, record)
    }
  }

  // Die Namen kommen nur aus db.meta (seit v2.10 keine Namen mehr im Code,
  // das Repo ist oeffentlich). Ohne gespeicherten Namen bleibt der sichtbare
  // Platzhalter "Person n" stehen — dann einmal in den Einstellungen eintragen.
  async function loadUserNames() {
    for (const user of users.value) {
      const stored = await db.meta.get(`userName_${user.id}`)
      if (typeof stored?.value === 'string' && stored.value.trim()) {
        user.name = stored.value
      }
    }
  }

  // Bringt der Cloud-Sync Namen vom anderen Handy (oder beim ersten Start),
  // sofort anzeigen — nicht erst beim naechsten Wechsel der Ansicht
  if (typeof window !== 'undefined') {
    window.addEventListener('fitness-sync-changed', (e) => {
      if (e.detail?.collection === 'meta') loadUserNames()
    })
  }

  // Saetze je Uebung und Person (Gabriel 26.09.2026): 1 = ein Referenzwert
  // wie bis v2.3, ab 2 wird jeder Satz einzeln erfasst (Regeln in
  // utils/saetze.js). Anders als der Standard-Nutzer eine GETEILTE
  // Einstellung: db.meta wird gesynct — die 3 Saetze von user1 gelten auch
  // auf dem Handy von user2, wenn beide zusammen trainieren.
  const satzZahlen = ref({})

  function satzZahl(userId) {
    return satzZahlen.value[userId] || 1
  }

  async function loadSatzZahlen() {
    const zahlen = {}
    for (const user of users.value) {
      const stored = await db.meta.get(`saetze_${user.id}`)
      const n = satzZahlGueltig(stored?.value)
      if (stored && n === null) {
        // Nicht still ueberdecken: ein kaputter Wert gehoert ins Log
        console.warn('[FitTrack] [WARN] Ungueltige Satzzahl ignoriert, nutze 1:', user.id, stored.value)
      }
      zahlen[user.id] = n || 1
    }
    satzZahlen.value = zahlen
  }

  async function setSatzZahl(userId, anzahl) {
    const n = satzZahlGueltig(anzahl)
    if (n === null || !users.value.some(u => u.id === userId)) {
      console.warn('[FitTrack] [WARN] Satzzahl nicht gespeichert (ungueltig):', userId, anzahl)
      return
    }
    satzZahlen.value = { ...satzZahlen.value, [userId]: n }
    const key = `saetze_${userId}`
    const record = { key, value: n, updatedAt: new Date().toISOString() }
    await db.meta.put(record)
    pushRecord('meta', key, record)
  }

  function loadDeviceId() {
    let id = null
    try {
      id = localStorage.getItem(DEVICE_ID_KEY)
      if (!id) {
        id = 'g-' + generateId()
        localStorage.setItem(DEVICE_ID_KEY, id)
      }
    } catch (e) {
      // Gesperrter Speicher: Kennung nur fuer diese Sitzung — ein Neuladen
      // setzt dann kein Training fort, springt aber nie in ein fremdes
      console.warn('[FitTrack] [WARN] Geraete-Kennung nicht speicherbar, gilt nur bis zum Neuladen:', e)
      id = id || 'g-' + generateId()
    }
    deviceId.value = id
  }

  function loadDefaultUser() {
    let stored = null
    try {
      stored = localStorage.getItem(DEFAULT_USER_KEY)
    } catch (e) {
      // Privater Modus oder gesperrter Speicher: Vorauswahl bleibt der erste Nutzer
      console.warn('[FitTrack] [WARN] Standard-Nutzer nicht lesbar:', e)
    }
    // Unbekannte Id (z.B. Backup vom anderen Geraet): erster Nutzer
    defaultUserId.value = users.value.some(u => u.id === stored) ? stored : users.value[0].id
  }

  function setDefaultUser(userId) {
    if (!users.value.some(u => u.id === userId)) {
      console.warn('[FitTrack] [WARN] Unbekannter Standard-Nutzer ignoriert:', userId)
      return
    }
    defaultUserId.value = userId
    try {
      localStorage.setItem(DEFAULT_USER_KEY, userId)
    } catch (e) {
      console.warn('[FitTrack] [WARN] Standard-Nutzer nicht speicherbar:', e)
    }
  }

  // Unbekannte Ids raus, Reihenfolge wie in USERS (stabile Chip-Anzeige).
  // null statt leerem Array, damit die Aufrufer sauber auf den Fallback gehen.
  function sanitizeActiveIds(ids) {
    if (!Array.isArray(ids)) return null
    const clean = users.value.map(u => u.id).filter(id => ids.includes(id))
    return clean.length > 0 ? clean : null
  }

  function loadActiveUsers() {
    let parsed = null
    try {
      const raw = localStorage.getItem(ACTIVE_USERS_KEY)
      if (raw) parsed = JSON.parse(raw)
    } catch (e) {
      // Kaputter JSON-Rest oder gesperrter Speicher: Fallback greift unten
      console.warn('[FitTrack] [WARN] Aktive Nutzer nicht lesbar:', e)
    }
    // Ohne gespeicherte Auswahl (Erststart): der Standard-Nutzer dieses
    // Geraets — loadDefaultUser() ist beim Store-Anlegen vorher gelaufen.
    activeUserIds.value = sanitizeActiveIds(parsed) || [defaultUserId.value]
  }

  function setActiveUsers(ids) {
    const clean = sanitizeActiveIds(ids)
    if (!clean) {
      console.warn('[FitTrack] [WARN] Ungueltige Nutzer-Auswahl ignoriert:', ids)
      return
    }
    activeUserIds.value = clean
    try {
      localStorage.setItem(ACTIVE_USERS_KEY, JSON.stringify(clean))
    } catch (e) {
      console.warn('[FitTrack] [WARN] Aktive Nutzer nicht speicherbar:', e)
    }
  }

  // Zurueck auf genau den Standard-Nutzer dieses Geraets (Entscheidung
  // Gabriel 22.09.2026, seit v2.7 ohne Dialog): beim App-Start ohne offenes
  // Workout und nach "Workout beenden". Mittrainierende tippt man auf dem
  // Startbildschirm je Training dazu (StartNutzerwahl).
  function resetActiveUsers() {
    setActiveUsers([defaultUserId.value])
  }

  function getUserName(userId) {
    return users.value.find(u => u.id === userId)?.name || userId
  }

  // Synchron beim Anlegen des Stores — jede View, die defaultUserId oder
  // activeUserIds liest, bekommt so ohne eigenen Ladeaufruf den richtigen Wert.
  loadDeviceId()
  loadDefaultUser()
  loadActiveUsers()

  return {
    users,
    historyViewUser,
    defaultUserId,
    activeUserIds,
    deviceId,
    activeUsers,
    updateUserName,
    loadUserNames,
    satzZahlen,
    satzZahl,
    loadSatzZahlen,
    setSatzZahl,
    setDefaultUser,
    setActiveUsers,
    resetActiveUsers,
    getUserName
  }
})
