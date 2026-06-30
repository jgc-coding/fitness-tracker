import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db/dexie.js'
import { USERS } from '../utils/constants.js'
import { pushRecord } from '../services/syncService.js'

export const useAuthStore = defineStore('auth', () => {
  const users = ref([...USERS])
  const historyViewUser = ref('user1')

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

  function getUserName(userId) {
    return users.value.find(u => u.id === userId)?.name || userId
  }

  return { users, historyViewUser, updateUserName, loadUserNames, getUserName }
})
