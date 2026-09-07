<template>
  <div class="running-view">
    <TopBar title="Laufen" />

    <div class="container page-content">
      <!-- Unterreiter -->
      <div class="segment" role="tablist">
        <button
          v-for="tab in TABS"
          :key="tab.id"
          class="segment-btn"
          :class="{ active: activeTab === tab.id }"
          role="tab"
          :aria-selected="activeTab === tab.id"
          @click="selectTab(tab.id)"
        >
          {{ tab.label }}
        </button>
      </div>

      <p v-if="hinweis" class="sync-hinweis" :class="{ error: hinweisIstFehler }">{{ hinweis }}</p>

      <RunWeekView v-if="activeTab === 'week'" v-model:monday="monday" />
      <RunYearView v-else-if="activeTab === 'year'" @jump="jumpToWeek" />
      <RunPlanView v-else />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import RunWeekView from '../components/running/RunWeekView.vue'
import RunYearView from '../components/running/RunYearView.vue'
import RunPlanView from '../components/running/RunPlanView.vue'
import { useRunningStore } from '../stores/running.js'
import { useAuthStore } from '../stores/auth.js'
import { getToday, mondayOf } from '../utils/dateHelpers.js'
import { USERS } from '../utils/constants.js'

const TABS = [
  { id: 'week', label: 'Woche' },
  { id: 'year', label: 'Jahr' },
  { id: 'plan', label: 'Plan' }
]

// Modul-Variablen (nicht reaktiv): merken sich Unterreiter und Woche ueber
// einen Tab-Wechsel hinweg, ohne dafuer etwas zu speichern.
let lastTab = 'week'
let lastMonday = null

const running = useRunningStore()
const authStore = useAuthStore()

const activeTab = ref(lastTab)
const hinweis = ref('')
const hinweisIstFehler = ref(false)
const monday = ref(lastMonday || mondayOf(getToday()))

watch(activeTab, (value) => { lastTab = value })
watch(monday, (value) => { lastMonday = value })

function selectTab(id) {
  activeTab.value = id
}

function jumpToWeek(mondayDate) {
  monday.value = mondayDate
  activeTab.value = 'week'
}

onMounted(async () => {
  await running.loadAll()
  await authStore.loadUserNames()
  running.ladeIntervalsStatus()
  abgleichBeimOeffnen()
})

/**
 * Beim Oeffnen des Reiters neue Laeufe holen - nur fuer Nutzer, die auf
 * diesem Geraet verbunden sind, und hoechstens alle 15 Minuten (die Pause
 * steckt im Store). Laeuft im Hintergrund: die Ansicht wartet nicht darauf.
 */
async function abgleichBeimOeffnen() {
  for (const user of USERS) {
    if (running.intervalsBereit[user.id] !== true) continue
    try {
      const ergebnis = await running.syncFromIntervals(user.id)
      if (ergebnis.ok && (ergebnis.summary.zugeordnet > 0 || ergebnis.summary.ergaenzt > 0)) {
        hinweis.value = `${user.name}: ${ergebnis.text}`
        hinweisIstFehler.value = false
      }
    } catch (e) {
      // Sichtbar machen statt still schlucken - der Grund steht im Log.
      console.warn(`[FitTrack] [WARN] intervals: Abgleich fehlgeschlagen - ID ${e?.id || '?'}`)
      hinweis.value = `${user.name}: ${e?.satz || 'Abgleich fehlgeschlagen.'}`
      hinweisIstFehler.value = true
    }
  }
}
</script>

<style scoped>
.page-content {
  padding-top: var(--space-sm);
  padding-bottom: calc(var(--nav-height) + var(--space-xl));
}

.segment {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: var(--radius-full);
  background: rgba(155, 157, 165, 0.14);
  margin-bottom: var(--space-sm);
}

.segment-btn {
  flex: 1;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
  min-height: 36px;
  transition: background-color 0.15s, color 0.15s;
}

.segment-btn.active {
  background: var(--color-white);
  color: var(--color-accent);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
}

.sync-hinweis {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  padding: 0 var(--space-xs) var(--space-xs);
}

.sync-hinweis.error {
  color: var(--color-accent);
}
</style>
