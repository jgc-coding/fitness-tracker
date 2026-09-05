<template>
  <div class="year-view">
    <!-- Person waehlen (in FitTrack Single ausgeblendet) -->
    <div v-if="users.length > 1" class="user-toggle">
      <button
        v-for="user in users"
        :key="user.id"
        class="toggle-btn"
        :class="{ active: selectedUser === user.id }"
        :style="{ '--user-color': user.color }"
        @click="selectedUser = user.id"
      >
        {{ authStore.getUserName(user.id) }}
      </button>
    </div>

    <EmptyState
      v-if="!plan"
      title="Kein aktiver Plan"
      description="Im Unterreiter Plan kannst du einen Plan von Claude importieren."
    />

    <template v-else>
      <!-- Zielkarte -->
      <div class="card goal-card">
        <p class="goal-name">{{ plan.name }}</p>
        <p v-if="plan.goal?.label" class="goal-label">{{ plan.goal.label }}</p>
        <div class="goal-facts">
          <div v-if="plan.goal?.date" class="fact">
            <span class="fact-value">{{ daysToGoal }}</span>
            <span class="fact-label">Tage</span>
          </div>
          <div v-if="plan.goal?.target" class="fact">
            <span class="fact-value">{{ plan.goal.target }}</span>
            <span class="fact-label">Ziel</span>
          </div>
          <div class="fact">
            <span class="fact-value">{{ doneCount }}/{{ totalCount }}</span>
            <span class="fact-label">Laeufe</span>
          </div>
        </div>
        <p class="goal-meta">
          <template v-if="plan.goal?.date">Termin {{ formatDate(plan.goal.date) }} · </template>
          Plan-Version {{ plan.planVersion || 1 }}
        </p>
      </div>

      <!-- Phasen mit ihren Wochen -->
      <div v-for="group in groups" :key="group.id" class="phase-block">
        <div class="phase-head">
          <h3 class="phase-name">{{ group.name }}</h3>
          <span class="phase-range">{{ group.range }}</span>
        </div>
        <p v-if="group.focus" class="phase-focus">{{ group.focus }}</p>

        <button
          v-for="week in group.weeks"
          :key="week.start"
          class="week-row"
          :class="{ current: week.isCurrent, past: week.isPast }"
          @click="$emit('jump', week.start)"
        >
          <span class="week-id">
            <span class="week-kw">KW {{ week.number }}</span>
            <span class="week-date">{{ week.label }}</span>
          </span>
          <span class="week-bar">
            <span
              class="week-fill"
              :style="{ width: week.percent + '%', backgroundColor: userColor }"
            ></span>
          </span>
          <span class="week-value" :class="week.gradeClass">{{ week.text }}</span>
        </button>
      </div>

      <p v-if="unplannedWeeks" class="year-hint">
        {{ unplannedWeeks }} Woche(n) ohne Wochenziel — Claude kann sie beim naechsten
        Anpassen ergaenzen.
      </p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import EmptyState from '../shared/EmptyState.vue'
import { useRunningStore } from '../../stores/running.js'
import { useAuthStore } from '../../stores/auth.js'
import { USERS } from '../../utils/constants.js'
import {
  getToday,
  mondayOf,
  addDaysToDate,
  daysBetweenDates,
  formatDayShort,
  formatDate,
  isoWeekOfDate
} from '../../utils/dateHelpers.js'

defineEmits(['jump'])

const running = useRunningStore()
const authStore = useAuthStore()

const users = USERS
const selectedUser = ref(authStore.defaultUserId)

const today = getToday()
const currentMonday = mondayOf(today)

const plan = computed(() => running.activePlan(selectedUser.value))
const userColor = computed(
  () => USERS.find(u => u.id === selectedUser.value)?.color || 'var(--color-accent)'
)

const daysToGoal = computed(() => {
  if (!plan.value?.goal?.date) return ''
  const days = daysBetweenDates(today, plan.value.goal.date)
  return days >= 0 ? days : 0
})

const planSessions = computed(() => (plan.value ? running.sessionsForPlan(plan.value.id) : []))
const totalCount = computed(() => planSessions.value.length)
const doneCount = computed(() => planSessions.value.filter(s => s.status === 'done').length)

const unplannedWeeks = computed(() => {
  if (!plan.value) return 0
  const covered = new Set((plan.value.weeks || []).map(w => w.start))
  const mondays = new Set(planSessions.value.map(s => mondayOf(s.date)))
  return [...mondays].filter(m => !covered.has(m)).length
})

/** Wochen des Plans, nach Phasen gruppiert. Wochen ohne Phase kommen zuletzt. */
const groups = computed(() => {
  if (!plan.value) return []
  const phases = [...(plan.value.phases || [])].sort((a, b) => a.from.localeCompare(b.from))
  const weeks = [...(plan.value.weeks || [])].sort((a, b) => a.start.localeCompare(b.start))

  const result = phases.map(phase => ({
    id: phase.id,
    name: phase.name,
    focus: phase.focus || '',
    range: `${formatDayShort(phase.from)} - ${formatDayShort(phase.to)}`,
    weeks: weeks.filter(w => w.phaseId === phase.id).map(buildWeek)
  }))

  const loose = weeks.filter(w => !phases.some(p => p.id === w.phaseId))
  if (loose.length > 0) {
    result.push({ id: '__ohne__', name: 'Ohne Phase', focus: '', range: '', weeks: loose.map(buildWeek) })
  }
  return result.filter(group => group.weeks.length > 0)
})

function buildWeek(week) {
  const target = running.weekTarget(selectedUser.value, week.start)
  const isKm = target.mode === 'km'
  const done = isKm ? target.doneKm : target.doneMinutes
  const goal = isKm ? target.goalKm : target.goalMinutes
  const unit = isKm ? 'km' : 'min'
  const percent = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0
  const isPast = addDaysToDate(week.start, 6) < today

  return {
    start: week.start,
    number: isoWeekOfDate(week.start),
    label: formatDayShort(week.start),
    percent,
    text: goal > 0 ? `${format(done)}/${format(goal)} ${unit}` : '-',
    isCurrent: week.start === currentMonday,
    isPast,
    // Erfuellungsgrad nur bei abgeschlossenen Wochen einfaerben.
    gradeClass: isPast ? (percent >= 90 ? 'grade-good' : percent >= 70 ? 'grade-ok' : 'grade-low') : ''
  }
}

function format(value) {
  return String(Math.round(value * 10) / 10).replace('.', ',')
}
</script>

<style scoped>
.user-toggle {
  display: flex;
  gap: var(--space-xs);
  margin: var(--space-sm) 0 var(--space-md);
}

.toggle-btn {
  flex: 1;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  background: var(--color-white);
  color: var(--color-text-light);
  min-height: 44px;
}

.toggle-btn.active {
  border-color: var(--user-color, var(--color-accent));
  color: var(--user-color, var(--color-accent));
}

.goal-card {
  margin-bottom: var(--space-md);
}

.goal-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.goal-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.goal-facts {
  display: flex;
  gap: var(--space-md);
  margin: var(--space-md) 0 var(--space-sm);
}

.fact {
  display: flex;
  flex-direction: column;
}

.fact-value {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-accent);
}

.fact-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.goal-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.phase-block {
  margin-bottom: var(--space-lg);
}

.phase-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.phase-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.phase-range {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.phase-focus {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--space-sm);
}

.week-row {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  text-align: left;
  padding: var(--space-sm) var(--space-xs);
  border-bottom: 1px solid var(--color-border);
  min-height: 44px;
  background: none;
}

.week-row.current {
  background: var(--color-accent-soft);
  border-radius: var(--radius-sm);
}

.week-row.past {
  opacity: 0.85;
}

.week-id {
  width: 92px;
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-xs);
}

.week-kw {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.week-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.week-bar {
  flex: 1;
  height: 6px;
  border-radius: var(--radius-full);
  background: rgba(155, 157, 165, 0.2);
  overflow: hidden;
}

.week-fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
}

.week-value {
  width: 84px;
  flex-shrink: 0;
  text-align: right;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  font-variant-numeric: tabular-nums;
}

.week-value.grade-good {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.week-value.grade-low {
  color: var(--color-text-muted);
}

.year-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-bottom: var(--space-md);
}
</style>
