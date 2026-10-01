<template>
  <div class="app-shell">
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <BottomNav />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import BottomNav from './components/layout/BottomNav.vue'
import { initSync } from './services/syncService.js'
import { db } from './db/dexie.js'
import { getToday } from './utils/dateHelpers.js'
import { useAuthStore } from './stores/auth.js'
import { offenesTrainingDiesesGeraets } from './utils/trainingGeraet.js'

const authStore = useAuthStore()

onMounted(async () => {
  initSync()

  // Wer trainiert: jeder App-Start beginnt mit dem Standard-Nutzer (seit v2.7
  // ohne Dialog — die Farbkreise auf dem Startbildschirm zeigen die Auswahl).
  // Nicht mitten in ein laufendes Training hinein: liegt heute ein unfertiges
  // Workout DIESES Geraets in der DB (gleiche Regel wie resumeTodaysWorkout,
  // utils/trainingGeraet.js), gilt dessen Besetzung. Ein offenes Training des
  // anderen Handys zaehlt nicht (v2.8.1).
  try {
    const heute = getToday()
    const logs = await db.workoutLogs.where({ date: heute }).toArray()
    if (!offenesTrainingDiesesGeraets(logs, heute, authStore.deviceId)) {
      authStore.resetActiveUsers()
    }
  } catch (e) {
    // DB nicht lesbar: trotzdem zuruecksetzen — die Kreise zeigen es sichtbar an
    console.warn('[FitTrack] [WARN] Pruefung auf offenes Workout fehlgeschlagen:', e)
    authStore.resetActiveUsers()
  }
})
</script>

<style scoped>
.app-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
