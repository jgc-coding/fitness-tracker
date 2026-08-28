import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db/dexie.js'
import { USERS } from '../utils/constants.js'
import { pushRecord } from '../services/syncService.js'

// Der Standard-Nutzer ist eine GERAETE-Einstellung, kein geteilter Datensatz:
// auf Lisas Handy soll Lisa vorausgewaehlt sein, auf Gabs Handy Gab. Deshalb
// localStorage statt db.meta — die meta-Tabelle wird mit der Cloud abgeglichen,
// beide Handys wuerden sich den Wert also gegenseitig ueberschreiben.
// Der Schluessel traegt den DB-Namen, weil Haupt-App und FitTrack Single
// dieselbe Origin und damit denselben localStorage teilen.
const DEFAULT_USER_KEY = `${db.name}:defaultUserId`

export const useAuthStore = defineStore('auth', () => {
  const users = ref([...USERS])
  const historyViewUser = ref('user1')
  const defaultUserId = ref(users.value[0].id)

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
    // Unbekannte Id (Backup vom anderen Geraet, Single-App): erster Nutzer
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

  function getUserName(userId) {
    return users.value.find(u => u.id === userId)?.name || userId
  }

  // Synchron beim Anlegen des Stores — jede View, die defaultUserId liest,
  // bekommt so ohne eigenen Ladeaufruf den richtigen Wert.
  loadDefaultUser()

  return {
    users,
    historyViewUser,
    defaultUserId,
    updateUserName,
    loadUserNames,
    setDefaultUser,
    getUserName
  }
})
