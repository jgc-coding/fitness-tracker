import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db } from '../db/dexie.js'
import { USERS } from '../utils/constants.js'
import { pushRecord } from '../services/syncService.js'

// Der Standard-Nutzer ist eine GERAETE-Einstellung, kein geteilter Datensatz:
// auf Lisas Handy soll Lisa vorausgewaehlt sein, auf Gabs Handy Gab. Deshalb
// localStorage statt db.meta — die meta-Tabelle wird mit der Cloud abgeglichen,
// beide Handys wuerden sich den Wert also gegenseitig ueberschreiben.
// Der Schluessel traegt den DB-Namen, damit sich mehrere Apps derselben
// Origin den localStorage nicht in die Quere kommen.
const DEFAULT_USER_KEY = `${db.name}:defaultUserId`

// Wer heute trainiert, ist ebenfalls eine GERAETE-Einstellung (siehe oben):
// die Auswahl im Startdialog gilt fuer dieses Handy, nicht fuer alle.
const ACTIVE_USERS_KEY = `${db.name}:activeUserIds`
// Nur Erstwert des ref — der echte Fallback ohne gespeicherte Auswahl ist der
// Standard-Nutzer dieses Geraets (siehe loadActiveUsers), nie ein leeres Array.
const ACTIVE_USERS_FALLBACK = ['user1', 'user2']

export const useAuthStore = defineStore('auth', () => {
  const users = ref([...USERS])
  const historyViewUser = ref('user1')
  const defaultUserId = ref(users.value[0].id)
  const activeUserIds = ref([...ACTIVE_USERS_FALLBACK])
  const activeUsers = computed(() =>
    users.value.filter(u => activeUserIds.value.includes(u.id))
  )
  // Vorauswahl NUR fuer den Startdialog: letzte Auswahl plus Standard-Nutzer
  // dieses Geraets — der eigene Nutzer ist beim App-Start immer schon angehakt
  // und bleibt im Dialog abwaehlbar. Der Chip-Weg im Workout nutzt das bewusst
  // nicht, dort zaehlt allein die aktuelle Besetzung. Reihenfolge wie in USERS.
  const startVorauswahl = computed(() => {
    const ids = new Set([...activeUserIds.value, defaultUserId.value])
    return users.value.map(u => u.id).filter(id => ids.has(id))
  })

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

  async function loadUserNames() {
    for (const user of users.value) {
      const stored = await db.meta.get(`userName_${user.id}`)
      if (stored) {
        user.name = stored.value
      }
    }
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

  function getUserName(userId) {
    return users.value.find(u => u.id === userId)?.name || userId
  }

  // Synchron beim Anlegen des Stores — jede View, die defaultUserId oder
  // activeUserIds liest, bekommt so ohne eigenen Ladeaufruf den richtigen Wert.
  loadDefaultUser()
  loadActiveUsers()

  return {
    users,
    historyViewUser,
    defaultUserId,
    activeUserIds,
    activeUsers,
    startVorauswahl,
    updateUserName,
    loadUserNames,
    setDefaultUser,
    setActiveUsers,
    getUserName
  }
})
