<template>
  <div class="week-view">
    <!-- Wochen-Navigation -->
    <div class="week-head">
      <button class="nav-btn" aria-label="Woche zurueck" @click="shiftWeek(-7)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <div class="week-label">
        <span class="week-kw">KW {{ weekNumber }}</span>
        <span class="week-range">{{ rangeLabel }}</span>
      </div>
      <button class="nav-btn" aria-label="Woche vor" @click="shiftWeek(7)">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <button class="today-btn" :class="{ muted: isCurrentWeek }" @click="goToday">Heute</button>
    </div>

    <p v-if="phaseLine" class="phase-line">{{ phaseLine }}</p>
    <p v-if="weekNote" class="week-note">{{ weekNote }}</p>

    <EmptyState
      v-if="!hasAnything"
      title="Noch kein Laufplan"
      description="Im Unterreiter Plan kannst du einen Plan von Claude importieren."
    />

    <template v-else>
      <!-- Wochenziel je Person -->
      <div class="goals">
        <div v-for="row in goalRows" :key="row.userId" class="goal-row">
          <span class="goal-name" :style="{ color: row.color }">{{ row.name }}</span>
          <div class="goal-bar">
            <div
              class="goal-fill"
              :style="{ width: row.percent + '%', backgroundColor: row.solidColor }"
            ></div>
          </div>
          <span class="goal-value">{{ row.text }}</span>
        </div>
      </div>

      <!-- Sieben Tage -->
      <div class="days">
        <div
          v-for="day in days"
          :key="day.date"
          class="day-row"
          :class="{ today: day.date === today }"
        >
          <div class="day-label">
            <span class="day-name">{{ day.weekday }}</span>
            <span class="day-date">{{ day.label }}</span>
          </div>
          <div class="day-chips">
            <RunSessionChip
              v-for="entry in day.entries"
              :key="entry.session.id"
              :session="entry.session"
              :color="entry.color"
              :bg-color="entry.bgColor"
              :user-name="showUserNames ? entry.name : ''"
              @open="openSession"
            />
            <p v-if="day.entries.length === 0" class="day-empty">Ruhetag</p>
          </div>
        </div>
      </div>
    </template>

    <RunSessionSheet
      v-model="sheetOpen"
      :session="selectedSession"
      :swap-candidates="swapCandidates"
      :user-name="selectedUserName"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import RunSessionChip from './RunSessionChip.vue'
import RunSessionSheet from './RunSessionSheet.vue'
import EmptyState from '../shared/EmptyState.vue'
import { useRunningStore } from '../../stores/running.js'
import { useAuthStore } from '../../stores/auth.js'
import { USERS } from '../../utils/constants.js'
import {
  getToday,
  mondayOf,
  addDaysToDate,
  weekdayShort,
  formatDayShort,
  isoWeekOfDate
} from '../../utils/dateHelpers.js'

const props = defineProps({
  monday: { type: String, required: true }
})
const emit = defineEmits(['update:monday'])

const running = useRunningStore()
const authStore = useAuthStore()

const today = getToday()
const sheetOpen = ref(false)
const selectedId = ref(null)

const showUserNames = USERS.length > 1

const weekNumber = computed(() => isoWeekOfDate(props.monday))
const isCurrentWeek = computed(() => props.monday === mondayOf(today))

const rangeLabel = computed(() => {
  const sunday = addDaysToDate(props.monday, 6)
  const [, monthA] = props.monday.split('-')
  const [, monthB, dayB] = sunday.split('-')
  const startDay = props.monday.split('-')[2]
  // Gleicher Monat: '14.-20.01.' statt '14.01.-20.01.'
  return monthA === monthB
    ? `${startDay}.-${dayB}.${monthB}.`
    : `${formatDayShort(props.monday)}-${formatDayShort(sunday)}`
})

const phaseLine = computed(() => {
  const phase = running.phaseFor(authStore.defaultUserId, props.monday)
  if (!phase) return ''
  const week = phase.weekNumber ? ` · Woche ${phase.weekNumber} von ${phase.weekCount}` : ''
  return `${phase.name}${week}`
})

const weekNote = computed(() => running.weekTarget(authStore.defaultUserId, props.monday).note)

const hasAnything = computed(
  () => running.plans.length > 0 || running.sessionsForWeek(props.monday).length > 0
)

const goalRows = computed(() =>
  USERS.map((user) => {
    const target = running.weekTarget(user.id, props.monday)
    const hasPlan = running.plansByUser(user.id).length > 0
    if (!hasPlan && target.sessionCount === 0) return null

    const isKm = target.mode === 'km'
    const done = isKm ? target.doneKm : target.doneMinutes
    const goal = isKm ? target.goalKm : target.goalMinutes
    const unit = isKm ? 'km' : 'min'
    return {
      userId: user.id,
      name: authStore.getUserName(user.id),
      color: user.color,
      solidColor: user.color,
      percent: goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0,
      text: goal > 0 ? `${formatNumber(done)} / ${formatNumber(goal)} ${unit}` : 'kein Ziel'
    }
  }).filter(Boolean)
)

const days = computed(() =>
  Array.from({ length: 7 }, (_, offset) => {
    const date = addDaysToDate(props.monday, offset)
    const entries = []
    for (const user of USERS) {
      for (const session of running.sessionsForDay(user.id, date)) {
        entries.push({
          session,
          name: authStore.getUserName(user.id),
          color: user.color,
          bgColor: user.bgColor
        })
      }
    }
    return { date, weekday: weekdayShort(date), label: formatDayShort(date), entries }
  })
)

const selectedSession = computed(() => running.getSession(selectedId.value))

const selectedUserName = computed(() =>
  selectedSession.value && showUserNames ? authStore.getUserName(selectedSession.value.userId) : ''
)

// Tauschpartner: gleiche Person, gleiche Woche, nicht der Lauf selbst.
const swapCandidates = computed(() => {
  const current = selectedSession.value
  if (!current) return []
  return running
    .sessionsForWeek(props.monday)
    .filter(s => s.userId === current.userId && s.id !== current.id)
    .sort((a, b) => a.date.localeCompare(b.date))
})

function formatNumber(value) {
  return String(Math.round(value * 10) / 10).replace('.', ',')
}

function shiftWeek(days) {
  emit('update:monday', addDaysToDate(props.monday, days))
}

function goToday() {
  emit('update:monday', mondayOf(today))
}

function openSession(session) {
  selectedId.value = session.id
  sheetOpen.value = true
}
</script>

<style scoped>
.week-head {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-sm) 0;
}

.nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  color: var(--color-text-light);
  flex-shrink: 0;
}

.nav-btn:active {
  background: var(--color-bg);
}

.week-label {
  flex: 1;
  text-align: center;
  min-width: 0;
}

.week-kw {
  font-weight: var(--font-weight-semibold);
  margin-right: var(--space-xs);
}

.week-range {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-variant-numeric: tabular-nums;
}

.today-btn {
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent);
  background: var(--color-accent-soft);
  flex-shrink: 0;
  min-height: 32px;
}

.today-btn.muted {
  color: var(--color-text-muted);
  background: var(--color-bg);
}

.phase-line {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
}

.week-note {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: 2px;
}

.goals {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  margin: var(--space-md) 0;
}

.goal-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.goal-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  width: 56px;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-bar {
  flex: 1;
  height: 8px;
  border-radius: var(--radius-full);
  background: rgba(155, 157, 165, 0.2);
  overflow: hidden;
}

.goal-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.goal-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.days {
  display: flex;
  flex-direction: column;
}

.day-row {
  display: flex;
  gap: var(--space-sm);
  padding: var(--space-sm) 0;
  border-top: 1px solid var(--color-border);
}

.day-row.today {
  background: rgba(145, 31, 47, 0.05);
  border-radius: var(--radius-sm);
  margin: 0 calc(var(--space-sm) * -1);
  padding-left: var(--space-sm);
  padding-right: var(--space-sm);
}

.day-label {
  width: 44px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: var(--space-xs);
}

.day-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.day-date {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.today .day-name,
.today .day-date {
  color: var(--color-accent);
}

.day-chips {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.day-empty {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  padding: var(--space-sm) 0;
}
</style>
