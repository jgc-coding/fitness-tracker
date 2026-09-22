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
    <UserSelectModal v-model="showUserSelect" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import BottomNav from './components/layout/BottomNav.vue'
import UserSelectModal from './components/shared/UserSelectModal.vue'
import { initSync } from './services/syncService.js'
import { db } from './db/dexie.js'
import { getToday } from './utils/dateHelpers.js'

const showUserSelect = ref(false)

onMounted(async () => {
  initSync()

  // Startdialog "Wer trainiert?" — aber nicht mitten in ein laufendes Training
  // hinein: liegt heute ein unfertiges Workout in der DB (gleiche Abfrage wie
  // resumeTodaysWorkout), gilt dessen Besetzung und der Dialog bleibt zu.
  try {
    const logs = await db.workoutLogs.where({ date: getToday() }).toArray()
    if (!logs.some(l => !l.completedAt)) {
      showUserSelect.value = true
    }
  } catch (e) {
    // DB nicht lesbar: Dialog trotzdem zeigen — er aendert ohne Bestaetigung nichts
    console.warn('[FitTrack] [WARN] Startdialog-Pruefung fehlgeschlagen:', e)
    showUserSelect.value = true
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
