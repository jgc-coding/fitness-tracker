import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db } from '../db/dexie.js'
import { USERS } from '../utils/constants.js'

export const useAuthStore = defineStore('auth', () => {
  const users = ref([...USERS])
  const historyViewUser = ref('user1')

  async function updateUserName(userId, name) {
    const user = users.value.find(u => u.id === userId)
    if (user) {
      user.name = name
      await db.meta.put({ key: `userName_${userId}`, value: name })
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
