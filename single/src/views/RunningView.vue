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
})
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
</style>
