<template>
  <div class="tracking-view">
    <TopBar title="Tracking">
      <template #right>
        <button v-if="workoutStore.isWorkoutActive" class="btn btn-ghost" @click="showDaySelector = true">
          Tag wechseln
        </button>
      </template>
    </TopBar>

    <div class="container page-content">
      <!-- Notification permission banner -->
      <div v-if="showNotifBanner" class="notif-banner" @click="enableNotifications">
        Tippe hier, um Workout-Info auf dem Sperrbildschirm zu aktivieren
        <button class="notif-dismiss" @click.stop="showNotifBanner = false">&times;</button>
      </div>

      <!-- Deload Banner -->
      <div v-if="isDeload" class="deload-banner">
        Deload-Woche: Volumen um 50% reduzieren
      </div>

      <!-- No active plan -->
      <EmptyState
        v-if="!plansStore.activePlan"
        title="Kein aktiver Trainingsplan"
        description="Erstelle zuerst einen Trainingsplan im Bereich Planung."
      >
        <router-link to="/planning" class="btn btn-primary" style="margin-top: 12px">
          Zur Planung
        </router-link>
      </EmptyState>

      <!-- Plan exists but no workout started -->
      <div v-else-if="!workoutStore.isWorkoutActive" class="start-section">
        <h2 class="section-title">Training starten</h2>
        <div class="day-cards">
          <button
            v-for="day in availableDays"
            :key="day.id"
            class="card day-card"
            @click="startWorkout(day)"
          >
            <span class="day-title">{{ day.title }}</span>
            <span class="day-exercises">{{ day.exercises.length }} Uebungen</span>
          </button>
        </div>
      </div>

      <!-- Active workout -->
      <div v-else class="workout-active">
        <div class="workout-header">
          <h2>{{ currentDay?.title || 'Workout' }}</h2>
          <span class="workout-date">{{ formattedDate }}</span>
        </div>

        <!-- Exercise list -->
        <div
          v-for="(planExercise, index) in workoutExercises"
          :key="planExercise.exerciseId + '-' + index"
          class="card exercise-card"
          :class="{ 'exercise-active': activeExerciseIndex === index }"
          @click="openExerciseInput(index)"
        >
          <div class="exercise-name-row">
            <h3 class="exercise-name">{{ getExerciseName(planExercise.exerciseId) }}</h3>
            <button class="btn-icon" @click.stop="openSwap(index)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
            </button>
          </div>

          <!-- Compact display of current values per user -->
          <div class="exercise-values">
            <div v-for="user in authStore.users" :key="user.id" class="user-value" :style="{ borderLeftColor: user.color }">
              <span class="user-value-name">{{ user.name }}</span>
              <span class="user-value-data">
                <template v-if="getSavedValue(planExercise.exerciseId, user.id, 'weight')">
                  {{ getSavedValue(planExercise.exerciseId, user.id, 'weight') }}kg x {{ getSavedValue(planExercise.exerciseId, user.id, 'reps') }}
                </template>
                <template v-else-if="recommendations[planExercise.exerciseId]?.[user.id]">
                  <span class="rec-hint">{{ recommendations[planExercise.exerciseId][user.id].weight }}kg</span>
                  <span v-if="increaseFlags[planExercise.exerciseId]?.[user.id]" class="increase-hint">&#8593;</span>
                </template>
                <template v-else>--</template>
              </span>
            </div>
          </div>

          <!-- Increase weight toggles -->
          <div class="increase-toggles">
            <button
              v-for="user in authStore.users"
              :key="user.id"
              class="increase-btn"
              :class="{ active: increaseToggles[planExercise.exerciseId]?.[user.id] }"
              :style="{ '--user-color': user.color }"
              @click.stop="toggleIncrease(planExercise.exerciseId, user.id)"
            >
              &#8593; {{ user.name }}
            </button>
          </div>
        </div>

        <!-- Quick add exercise -->
        <button class="btn btn-secondary btn-block" @click="showQuickAdd = true" style="margin-top: var(--space-md)">
          + Uebung hinzufuegen
        </button>

        <!-- Finish workout -->
        <button class="btn btn-primary btn-block" @click="finishWorkout" style="margin-top: var(--space-sm)">
          Workout beenden
        </button>
      </div>
    </div>

    <!-- Wheel Picker Modal for exercise input -->
    <Modal v-model="showWheelPicker" :title="activeExerciseName">
      <div v-if="activeExerciseIndex >= 0" class="picker-content">
        <!-- User tabs -->
        <div class="user-tabs">
          <button
            v-for="user in authStore.users"
            :key="user.id"
            class="user-tab"
            :class="{ active: pickerUserId === user.id }"
            :style="{ '--user-color': user.color }"
            @click="pickerUserId = user.id"
          >
            {{ user.name }}
          </button>
        </div>

        <!-- Recommendation hint -->
        <div v-if="pickerRecommendation" class="picker-rec">
          Empfehlung: {{ pickerRecommendation.weight }}kg
          <span v-if="pickerShouldIncrease" class="increase-hint"> &#8593; steigern!</span>
        </div>

        <!-- Wheel pickers side by side -->
        <div class="wheels-row">
          <WheelPicker
            :modelValue="pickerWeight"
            @update:modelValue="pickerWeight = $event"
            :values="weightValues"
            label="Gewicht"
            unit="kg"
            :decimals="useDecimalSteps"
          />
          <WheelPicker
            :modelValue="pickerReps"
            @update:modelValue="pickerReps = $event"
            :values="repsValues"
            label="Reps"
            unit="Wdh"
          />
        </div>

        <!-- Save button -->
        <button class="btn btn-primary btn-block" @click="savePickerValues" style="margin-top: var(--space-md)">
          Speichern
        </button>

        <!-- Switch to other user hint -->
        <p class="picker-hint">
          Tippe auf den anderen Namen um fuer {{ otherUserName }} einzutragen.
        </p>
      </div>
    </Modal>

    <!-- Day Selector Modal -->
    <Modal v-model="showDaySelector" title="Trainingstag waehlen">
      <div class="day-cards">
        <button
          v-for="day in availableDays"
          :key="day.id"
          class="card day-card"
          @click="switchDay(day)"
        >
          <span class="day-title">{{ day.title }}</span>
          <span class="day-exercises">{{ day.exercises.length }} Uebungen</span>
        </button>
      </div>
    </Modal>

    <!-- Exercise Swap Modal -->
    <Modal v-model="showSwapModal" title="Uebung tauschen" fullHeight>
      <input v-model="swapSearch" type="text" placeholder="Uebung suchen..." class="search-input" />
      <div class="swap-list">
        <button v-for="ex in filteredSwapExercises" :key="ex.id" class="swap-item" @click="swapExercise(ex.id)">
          <span class="swap-name">{{ ex.name }}</span>
          <span class="swap-meta">{{ getMuscleLabel(ex.muscleGroup) }}</span>
        </button>
      </div>
    </Modal>

    <!-- Quick Add Exercise Modal -->
    <Modal v-model="showQuickAdd" title="Uebung hinzufuegen" fullHeight>
      <input v-model="quickAddSearch" type="text" placeholder="Uebung suchen..." class="search-input" />
      <div class="swap-list">
        <button v-for="ex in filteredQuickAddExercises" :key="ex.id" class="swap-item" @click="quickAddExercise(ex)">
          <span class="swap-name">{{ ex.name }}</span>
          <span class="swap-meta">{{ getMuscleLabel(ex.muscleGroup) }}</span>
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import EmptyState from '../components/shared/EmptyState.vue'
import Modal from '../components/shared/Modal.vue'
import WheelPicker from '../components/shared/WheelPicker.vue'
import { useWorkoutStore } from '../stores/workout.js'
import { usePlansStore } from '../stores/plans.js'
import { useAuthStore } from '../stores/auth.js'
import { useExercises } from '../composables/useExercises.js'
import { useHistory } from '../composables/useHistory.js'
import { isDeloadWeek, formatDate, getToday } from '../utils/dateHelpers.js'
import { MUSCLE_GROUPS } from '../utils/constants.js'
import {
  requestNotificationPermission,
  isNotificationSupported,
  showWorkoutNotification,
  dismissWorkoutNotification,
  buildExerciseLines
} from '../utils/notifications.js'

const workoutStore = useWorkoutStore()
const plansStore = usePlansStore()
const authStore = useAuthStore()
const { exercises, loadExercises, getExerciseById } = useExercises()
const { getMaxWeight, getLastSets, shouldIncreaseWeight } = useHistory()

const showDaySelector = ref(false)
const showSwapModal = ref(false)
const showQuickAdd = ref(false)
const showWheelPicker = ref(false)
const swapSearch = ref('')
const quickAddSearch = ref('')
const swapIndex = ref(-1)
const recommendations = reactive({})
const increaseFlags = reactive({})
const increaseToggles = reactive({})
const lastSetsCache = reactive({})
const workoutExercises = ref([])
const currentDay = ref(null)

// Wheel picker state
const activeExerciseIndex = ref(-1)
const pickerUserId = ref('user1')
const pickerWeight = ref(20)
const pickerReps = ref(10)

const showNotifBanner = ref(false)
const formattedDate = computed(() => formatDate(getToday()))

const isDeload = computed(() => {
  const plan = plansStore.activePlan
  if (!plan?.deloadEnabled) return false
  return isDeloadWeek(plan.deloadStartDate, plan.deloadIntervalWeeks)
})

const availableDays = computed(() => plansStore.getTodaysTrainingDays())

const filteredSwapExercises = computed(() => {
  if (!swapSearch.value) return exercises.value
  return exercises.value.filter(e => e.name.toLowerCase().includes(swapSearch.value.toLowerCase()))
})

const filteredQuickAddExercises = computed(() => {
  if (!quickAddSearch.value) return exercises.value
  return exercises.value.filter(e => e.name.toLowerCase().includes(quickAddSearch.value.toLowerCase()))
})

const activeExerciseName = computed(() => {
  if (activeExerciseIndex.value < 0) return ''
  const ex = workoutExercises.value[activeExerciseIndex.value]
  return ex ? getExerciseName(ex.exerciseId) : ''
})

// Determine if exercise uses 1.25kg steps (barbell or machine_weight)
const useDecimalSteps = computed(() => {
  if (activeExerciseIndex.value < 0) return false
  const ex = workoutExercises.value[activeExerciseIndex.value]
  if (!ex) return false
  const exercise = getExerciseById(ex.exerciseId)
  if (!exercise) return false
  return exercise.equipment === 'barbell' || exercise.equipment === 'machine_weight'
})

const weightValues = computed(() => {
  if (useDecimalSteps.value) {
    const vals = []
    for (let w = 1.25; w <= 300; w += 1.25) {
      vals.push(Math.round(w * 100) / 100)
    }
    return vals
  } else {
    const vals = []
    for (let w = 1; w <= 300; w += 1) {
      vals.push(w)
    }
    return vals
  }
})

const repsValues = computed(() => {
  const vals = []
  for (let r = 1; r <= 30; r++) vals.push(r)
  return vals
})

const pickerRecommendation = computed(() => {
  if (activeExerciseIndex.value < 0) return null
  const ex = workoutExercises.value[activeExerciseIndex.value]
  return recommendations[ex?.exerciseId]?.[pickerUserId.value] || null
})

const pickerShouldIncrease = computed(() => {
  if (activeExerciseIndex.value < 0) return false
  const ex = workoutExercises.value[activeExerciseIndex.value]
  return increaseFlags[ex?.exerciseId]?.[pickerUserId.value] || false
})

const otherUserName = computed(() => {
  const other = authStore.users.find(u => u.id !== pickerUserId.value)
  return other?.name || ''
})

function getExerciseName(exerciseId) {
  return getExerciseById(exerciseId)?.name || 'Unbekannt'
}

function getMuscleLabel(id) {
  return MUSCLE_GROUPS.find(m => m.id === id)?.label || id
}

function getSavedValue(exerciseId, userId, field) {
  const sets = workoutStore.getSetsForExercise(exerciseId, userId)
  const set = sets.find(s => s.setNumber === 1)
  return set ? set[field] : null
}

async function loadRecommendations() {
  for (const ex of workoutExercises.value) {
    if (!recommendations[ex.exerciseId]) recommendations[ex.exerciseId] = {}
    if (!increaseFlags[ex.exerciseId]) increaseFlags[ex.exerciseId] = {}
    if (!lastSetsCache[ex.exerciseId]) lastSetsCache[ex.exerciseId] = {}

    for (const user of authStore.users) {
      const max = await getMaxWeight(ex.exerciseId, user.id)
      if (max) recommendations[ex.exerciseId][user.id] = max

      const shouldInc = await shouldIncreaseWeight(ex.exerciseId, user.id)
      increaseFlags[ex.exerciseId][user.id] = shouldInc

      const last = await getLastSets(ex.exerciseId, user.id)
      lastSetsCache[ex.exerciseId][user.id] = last
    }
  }
}

function openExerciseInput(index) {
  activeExerciseIndex.value = index
  const ex = workoutExercises.value[index]
  pickerUserId.value = authStore.users[0].id

  // Pre-fill with saved value or recommendation
  const saved = workoutStore.getSetsForExercise(ex.exerciseId, pickerUserId.value).find(s => s.setNumber === 1)
  if (saved) {
    pickerWeight.value = saved.weight
    pickerReps.value = saved.reps
  } else {
    const rec = recommendations[ex.exerciseId]?.[pickerUserId.value]
    const lastSets = lastSetsCache[ex.exerciseId]?.[pickerUserId.value]
    pickerWeight.value = rec?.weight || 20
    pickerReps.value = lastSets?.[0]?.reps || 10
  }

  showWheelPicker.value = true
}

// When switching user in picker, load their saved/recommended values
watch(pickerUserId, (userId) => {
  if (activeExerciseIndex.value < 0) return
  const ex = workoutExercises.value[activeExerciseIndex.value]
  const saved = workoutStore.getSetsForExercise(ex.exerciseId, userId).find(s => s.setNumber === 1)
  if (saved) {
    pickerWeight.value = saved.weight
    pickerReps.value = saved.reps
  } else {
    const rec = recommendations[ex.exerciseId]?.[userId]
    const lastSets = lastSetsCache[ex.exerciseId]?.[userId]
    pickerWeight.value = rec?.weight || 20
    pickerReps.value = lastSets?.[0]?.reps || 10
  }
})

async function savePickerValues() {
  const ex = workoutExercises.value[activeExerciseIndex.value]
  await workoutStore.saveSet(ex.exerciseId, pickerUserId.value, 1, pickerWeight.value, pickerReps.value)

  // Auto-switch to other user if they haven't entered yet
  const otherUser = authStore.users.find(u => u.id !== pickerUserId.value)
  if (otherUser) {
    const otherSaved = workoutStore.getSetsForExercise(ex.exerciseId, otherUser.id).find(s => s.setNumber === 1)
    if (!otherSaved) {
      pickerUserId.value = otherUser.id
      return
    }
  }

  showWheelPicker.value = false
  activeExerciseIndex.value = -1
  updateNotification()
}

async function toggleIncrease(exerciseId, userId) {
  const result = await workoutStore.toggleIncreaseNextTime(exerciseId, userId)
  if (!increaseToggles[exerciseId]) increaseToggles[exerciseId] = {}
  increaseToggles[exerciseId][userId] = result
}

async function enableNotifications() {
  const granted = await requestNotificationPermission()
  showNotifBanner.value = false
  if (granted && currentDay.value) {
    updateNotification()
  }
}

function updateNotification() {
  if (!currentDay.value) return
  const lines = buildExerciseLines(
    workoutExercises.value,
    getExerciseName,
    authStore.users,
    recommendations,
    getSavedValue
  )
  showWorkoutNotification(currentDay.value.title, lines)
}

async function startWorkout(day) {
  currentDay.value = day
  workoutExercises.value = [...day.exercises]
  await workoutStore.startWorkout(day, plansStore.activePlan.id)
  await loadRecommendations()
  await requestNotificationPermission()
  updateNotification()
}

async function switchDay(day) {
  showDaySelector.value = false
  await workoutStore.finishWorkout()
  await startWorkout(day)
}

function openSwap(index) {
  swapIndex.value = index
  swapSearch.value = ''
  showSwapModal.value = true
}

async function swapExercise(newExerciseId) {
  if (swapIndex.value >= 0 && swapIndex.value < workoutExercises.value.length) {
    workoutExercises.value[swapIndex.value] = {
      ...workoutExercises.value[swapIndex.value],
      exerciseId: newExerciseId
    }
    await loadRecommendations()
  }
  showSwapModal.value = false
}

function quickAddExercise(exercise) {
  workoutExercises.value.push({
    exerciseId: exercise.id,
    sets: 3,
    notes: ''
  })
  showQuickAdd.value = false
  loadRecommendations()
}

async function finishWorkout() {
  await workoutStore.finishWorkout()
  workoutExercises.value = []
  currentDay.value = null
  dismissWorkoutNotification()
}

onMounted(async () => {
  await loadExercises()
  await plansStore.loadPlans()
  await authStore.loadUserNames()

  // Show notification banner if not yet permitted
  if (isNotificationSupported() && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    showNotifBanner.value = true
  }

  const resumed = await workoutStore.resumeTodaysWorkout()
  if (resumed && workoutStore.activeWorkout) {
    const day = plansStore.trainingDays.find(d => d.id === workoutStore.activeWorkout.trainingDayId)
    if (day) {
      currentDay.value = day
      workoutExercises.value = [...day.exercises]
      await loadRecommendations()
    }
  }
})
</script>

<style scoped>
.page-content {
  padding-top: var(--space-md);
  padding-bottom: calc(var(--nav-height) + var(--space-xl));
}

.notif-banner {
  background: var(--color-accent);
  color: var(--color-white);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  text-align: center;
  margin-bottom: var(--space-sm);
  cursor: pointer;
  position: relative;
}

.notif-dismiss {
  position: absolute;
  right: var(--space-sm);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-white);
  font-size: var(--font-size-lg);
  opacity: 0.7;
}

.deload-banner {
  background: var(--color-accent);
  color: var(--color-white);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-align: center;
  margin-bottom: var(--space-md);
}

.section-title {
  font-size: var(--font-size-xl);
  margin-bottom: var(--space-md);
}

.day-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.day-card {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: box-shadow 0.15s;
}

.day-card:active {
  box-shadow: var(--shadow-md);
}

.day-title {
  font-weight: var(--font-weight-semibold);
}

.day-exercises {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.workout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.workout-header h2 {
  font-size: var(--font-size-xl);
}

.workout-date {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.exercise-card {
  margin-bottom: var(--space-sm);
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.exercise-card:active {
  box-shadow: var(--shadow-md);
}

.exercise-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.exercise-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  color: var(--color-text-light);
}

.btn-icon:active {
  background: var(--color-bg);
}

.exercise-values {
  display: flex;
  gap: var(--space-sm);
}

.user-value {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-xs) var(--space-sm);
  border-left: 3px solid;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-bg);
  font-size: var(--font-size-sm);
}

.user-value-name {
  color: var(--color-text-light);
}

.user-value-data {
  font-weight: var(--font-weight-semibold);
}

.rec-hint {
  color: var(--color-text-muted);
  font-style: italic;
}

.increase-hint {
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}

.increase-toggles {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.increase-btn {
  flex: 1;
  padding: var(--space-xs) var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  transition: all 0.15s;
}

.increase-btn.active {
  border-color: var(--user-color);
  color: var(--user-color);
  background: color-mix(in srgb, var(--user-color) 8%, transparent);
}

/* Wheel Picker Modal */
.picker-content {
  display: flex;
  flex-direction: column;
}

.user-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.user-tab {
  flex: 1;
  padding: var(--space-sm);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-md);
  background: var(--color-white);
  color: var(--color-text-light);
  transition: all 0.15s;
}

.user-tab.active {
  border-color: var(--user-color);
  color: var(--user-color);
  background: color-mix(in srgb, var(--user-color) 5%, white);
}

.picker-rec {
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--space-md);
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
}

.wheels-row {
  display: flex;
  gap: var(--space-lg);
  justify-content: center;
}

.picker-hint {
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: var(--space-md);
}

.search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  margin-bottom: var(--space-md);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.swap-list {
  display: flex;
  flex-direction: column;
}

.swap-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
}

.swap-item:active {
  background: var(--color-bg);
}

.swap-name {
  font-weight: var(--font-weight-medium);
}

.swap-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.start-section {
  padding-top: var(--space-md);
}
</style>
