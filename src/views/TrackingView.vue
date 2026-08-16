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
      <!-- Sync paused banner: no signed-in account -->
      <router-link v-if="syncStatus === 'auth-required'" to="/settings" class="sync-banner">
        Cloud-Sync pausiert — zum Anmelden hier tippen
      </router-link>

      <!-- Notification permission banner -->
      <div v-if="showNotifBanner" class="notif-banner" @click="enableNotifications">
        Tippe hier, um Workout-Info auf dem Sperrbildschirm zu aktivieren
        <button class="notif-dismiss" @click.stop="showNotifBanner = false">&times;</button>
      </div>

      <!-- Deload Banner -->
      <div v-if="isDeload" class="deload-banner">
        Deload-Woche: Volumen um 50% reduzieren
      </div>

      <!-- No active workout: choose what to start -->
      <div v-if="!workoutStore.isWorkoutActive" class="start-section">
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

          <!-- Individual training — always available, independent of the plan -->
          <button class="card day-card day-card-custom" @click="openCustomPicker">
            <span class="day-title">Individuelles Training</span>
            <span class="day-exercises">Uebungen frei waehlen</span>
          </button>
        </div>

        <p v-if="!plansStore.activePlan" class="no-plan-hint">
          Kein aktiver Trainingsplan — du kannst trotzdem ein individuelles Training
          starten oder in der <router-link to="/planning">Planung</router-link> einen Plan anlegen.
        </p>
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
            <h3 class="exercise-name">
              {{ getExerciseName(planExercise.exerciseId) }}<span
                v-if="getExerciseNotes(planExercise.exerciseId)"
                class="exercise-notes-inline"
              > ({{ getExerciseNotes(planExercise.exerciseId) }})</span>
            </h3>
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
              <button
                class="increase-icon-btn"
                :class="{ active: increaseToggles[planExercise.exerciseId]?.[user.id] }"
                :style="{ '--user-color': user.color }"
                :title="`${user.name}: Gewicht beim nächsten Mal steigern`"
                @click.stop="toggleIncrease(planExercise.exerciseId, user.id)"
              >
                <img src="/logo.svg" alt="" class="increase-icon-logo" />
              </button>
            </div>
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
          <span v-if="pickerShouldIncrease" class="increase-hint"> &#8593; erhoeht</span>
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
      <!-- Schritt 2: nur heute oder dauerhaft in den Plan uebernehmen? -->
      <div v-if="swapTargetId" class="swap-confirm">
        <p class="swap-confirm-text">
          <strong>{{ getExerciseName(swapTargetId) }}</strong> statt
          {{ swapOriginalName }} — nur fuer heute oder dauerhaft im Plan?
        </p>
        <button class="btn btn-primary btn-block" @click="applySwap(false)">Nur heute</button>
        <button
          v-if="canSwapPermanently"
          class="btn btn-secondary btn-block"
          style="margin-top: var(--space-sm)"
          @click="applySwap(true)"
        >
          Dauerhaft im Plan ersetzen
        </button>
      </div>

      <!-- Schritt 1: Ersatz waehlen — gleiche Muskelgruppe zuerst -->
      <template v-else>
        <input v-model="swapSearch" type="text" placeholder="Uebung suchen..." class="search-input" />
        <div class="swap-list">
          <template v-for="section in swapSections" :key="section.label">
            <div v-if="section.items.length && section.label" class="swap-section-label">{{ section.label }}</div>
            <button v-for="ex in section.items" :key="ex.id" class="swap-item" @click="swapTargetId = ex.id">
              <span class="swap-name">{{ toTitleCase(ex.name) }}</span>
              <span class="swap-meta">{{ getMuscleLabel(ex.muscleGroup) }}</span>
            </button>
          </template>
        </div>
      </template>
    </Modal>

    <!-- Quick Add Exercise Modal -->
    <Modal v-model="showQuickAdd" title="Uebung hinzufuegen" fullHeight>
      <input v-model="quickAddSearch" type="text" placeholder="Uebung suchen..." class="search-input" />
      <div class="swap-list">
        <button v-for="ex in filteredQuickAddExercises" :key="ex.id" class="swap-item" @click="quickAddExercise(ex)">
          <span class="swap-name">{{ toTitleCase(ex.name) }}</span>
          <span class="swap-meta">{{ getMuscleLabel(ex.muscleGroup) }}</span>
        </button>
      </div>
    </Modal>

    <!-- Individual Training: multi-select exercise picker -->
    <Modal v-model="showCustomPicker" title="Individuelles Training" fullHeight>
      <input v-model="customSearch" type="text" placeholder="Uebung suchen..." class="search-input" />
      <div class="swap-list">
        <button
          v-for="ex in filteredCustomExercises"
          :key="ex.id"
          class="swap-item"
          :class="{ 'is-selected': customSelectedIds.includes(ex.id) }"
          @click="toggleCustomExercise(ex.id)"
        >
          <span class="swap-check">
            <svg v-if="customSelectedIds.includes(ex.id)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
          <span class="swap-name">{{ toTitleCase(ex.name) }}</span>
          <span class="swap-meta">{{ getMuscleLabel(ex.muscleGroup) }}</span>
        </button>
      </div>
      <div class="picker-footer">
        <button
          class="btn btn-primary btn-block"
          :disabled="customSelectedIds.length === 0"
          @click="startCustom"
        >
          Training starten ({{ customSelectedIds.length }})
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import TopBar from '../components/layout/TopBar.vue'
import Modal from '../components/shared/Modal.vue'
import WheelPicker from '../components/shared/WheelPicker.vue'
import { useWorkoutStore } from '../stores/workout.js'
import { usePlansStore } from '../stores/plans.js'
import { useAuthStore } from '../stores/auth.js'
import { useExercises } from '../composables/useExercises.js'
import { useHistory } from '../composables/useHistory.js'
import { isDeloadWeek, formatDate, getToday } from '../utils/dateHelpers.js'
import { MUSCLE_GROUPS } from '../utils/constants.js'
import { toTitleCase } from '../utils/formatters.js'
import {
  requestNotificationPermission,
  isNotificationSupported,
  showWorkoutNotification,
  dismissWorkoutNotification,
  buildExerciseLines
} from '../utils/notifications.js'
import { syncStatus, flushQueue } from '../services/syncService.js'
import { db } from '../db/dexie.js'

const route = useRoute()
const workoutStore = useWorkoutStore()
const plansStore = usePlansStore()
const authStore = useAuthStore()
const { exercises, loadExercises, getExerciseById } = useExercises()
const { getLatestWeight, getLastSets, shouldIncreaseWeight } = useHistory()

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

// Individual ("custom") training: multi-select exercise picker state
const showCustomPicker = ref(false)
const customSearch = ref('')
const customSelectedIds = ref([])

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

// "Zuletzt benutzt" nach vorn, Rest alphabetisch — die eigenen Standard-
// Uebungen stehen damit oben statt irgendwo im Alphabet.
function byLastUsedThenName(a, b) {
  const la = a.lastUsedAt || ''
  const lb = b.lastUsedAt || ''
  if (la !== lb) return lb.localeCompare(la)
  return a.name.localeCompare(b.name)
}

function searchFilter(list, term) {
  if (!term) return list
  const t = term.toLowerCase()
  return list.filter(e => e.name.toLowerCase().includes(t))
}

// Tausch-Liste in zwei Abschnitten: erst dieselbe Muskelgruppe (beim
// "Geraet belegt"-Tausch fast immer das Gesuchte), dann alle anderen.
const swapSections = computed(() => {
  const current = swapIndex.value >= 0
    ? getExerciseById(workoutExercises.value[swapIndex.value]?.exerciseId)
    : null
  const list = searchFilter(exercises.value, swapSearch.value)
  if (!current) return [{ label: '', items: [...list].sort(byLastUsedThenName) }]
  const same = list.filter(e => e.muscleGroup === current.muscleGroup && e.id !== current.id).sort(byLastUsedThenName)
  const others = list.filter(e => e.muscleGroup !== current.muscleGroup).sort(byLastUsedThenName)
  return [
    { label: `Gleiche Muskelgruppe (${getMuscleLabel(current.muscleGroup)})`, items: same },
    { label: 'Andere Muskelgruppen', items: others }
  ]
})

const filteredQuickAddExercises = computed(() =>
  [...searchFilter(exercises.value, quickAddSearch.value)].sort(byLastUsedThenName)
)

const filteredCustomExercises = computed(() =>
  [...searchFilter(exercises.value, customSearch.value)].sort(byLastUsedThenName)
)

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
  const name = getExerciseById(exerciseId)?.name
  return name ? toTitleCase(name) : 'Unbekannt'
}

function getExerciseNotes(exerciseId) {
  return getExerciseById(exerciseId)?.notes || ''
}

function getMuscleLabel(id) {
  return MUSCLE_GROUPS.find(m => m.id === id)?.label || id
}

function getSavedValue(exerciseId, userId, field) {
  const sets = workoutStore.getSetsForExercise(exerciseId, userId)
  const set = sets.find(s => s.setNumber === 1)
  return set ? set[field] : null
}

// Gewichtsschritt der Uebung: 1.25 kg fuer Langhantel/Maschine, sonst 1 kg
function getWeightStep(exerciseId) {
  const eq = getExerciseById(exerciseId)?.equipment
  return eq === 'barbell' || eq === 'machine_weight' ? 1.25 : 1
}

async function loadRecommendations() {
  for (const ex of workoutExercises.value) {
    if (!recommendations[ex.exerciseId]) recommendations[ex.exerciseId] = {}
    if (!increaseFlags[ex.exerciseId]) increaseFlags[ex.exerciseId] = {}
    if (!lastSetsCache[ex.exerciseId]) lastSetsCache[ex.exerciseId] = {}

    for (const user of authStore.users) {
      const latest = await getLatestWeight(ex.exerciseId, user.id)

      const shouldInc = await shouldIncreaseWeight(ex.exerciseId, user.id)
      increaseFlags[ex.exerciseId][user.id] = shouldInc

      if (latest) {
        // Steigern-Merker wirkt direkt auf den Vorschlag: Schrittweite aufschlagen,
        // der Pfeil im UI zeigt dann nur noch an, DASS erhoeht wurde.
        const weight = shouldInc
          ? Math.round((latest.weight + getWeightStep(ex.exerciseId)) * 100) / 100
          : latest.weight
        recommendations[ex.exerciseId][user.id] = { ...latest, weight }
      }

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
    // ?? statt ||: 0 kg (Koerpergewichtsuebung) ist ein gueltiger Wert
    pickerWeight.value = rec?.weight ?? 20
    pickerReps.value = lastSets?.[0]?.reps ?? 10
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
    pickerWeight.value = rec?.weight ?? 20
    pickerReps.value = lastSets?.[0]?.reps ?? 10
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

// Daten fuer die Log-Knoepfe in der Sperrbildschirm-Notification: je Nutzer die
// Warteschlange der noch offenen Uebungen samt fertigem setLog-Datensatz.
// Der Service Worker schreibt beim Knopfdruck den ersten Eintrag in IndexedDB —
// auch bei geschlossener App (siehe public/sw-custom.js).
function buildNotificationQuickLog() {
  const aw = workoutStore.activeWorkout
  if (!aw) return { actions: [], data: null }
  const queues = {}
  const userNames = {}
  const actions = []
  for (const user of authStore.users) {
    userNames[user.id] = user.name
    const queue = []
    for (const ex of workoutExercises.value) {
      const saved = workoutStore.getSetsForExercise(ex.exerciseId, user.id).find(s => s.setNumber === 1)
      if (saved) continue
      const rec = recommendations[ex.exerciseId]?.[user.id]
      const lastSets = lastSetsCache[ex.exerciseId]?.[user.id]
      const weight = rec?.weight ?? 20
      const reps = lastSets?.[0]?.reps ?? 10
      queue.push({
        label: `${getExerciseName(ex.exerciseId)} ${weight}kg x${reps}`,
        set: {
          workoutLogId: aw.id,
          exerciseId: ex.exerciseId,
          userId: user.id,
          setNumber: 1,
          weight,
          reps,
          isWarmup: false,
          date: aw.date,
          increaseNextTime: false
        }
      })
    }
    queues[user.id] = queue
    if (queue.length > 0) {
      actions.push({ action: `log-${user.id}`, title: `${user.name} OK: ${queue[0].label}` })
    }
  }
  return {
    actions,
    data: {
      kind: 'workout-quicklog',
      dbName: db.name,
      title: currentDay.value?.title || 'Workout',
      userNames,
      queues
    }
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
  const { actions, data } = buildNotificationQuickLog()
  showWorkoutNotification(currentDay.value.title, lines, { actions, data })
}

// Vom Sperrbildschirm geloggte Saetze (Service Worker) in Ansicht und Cloud holen
async function onSwMessage(e) {
  if (e.data?.type !== 'quicklog-saved') return
  await workoutStore.loadSets()
  updateNotification()
  flushQueue()
}

async function startWorkout(day) {
  currentDay.value = day
  await workoutStore.startWorkout(day, plansStore.activePlan.id)
  // Ein heute schon begonnener Tag kann Abweichungen (Tausch/Quick-Add) am Log
  // tragen — die gewinnen gegen die Plan-Liste.
  const aw = workoutStore.activeWorkout
  workoutExercises.value = [...(aw?.exercises?.length ? aw.exercises : day.exercises)]
  await loadRecommendations()
  await requestNotificationPermission()
  updateNotification()
}

async function switchDay(day) {
  showDaySelector.value = false
  await workoutStore.finishWorkout()
  await startWorkout(day)
}

const swapTargetId = ref(null)

const swapOriginalName = computed(() => {
  if (swapIndex.value < 0) return ''
  const ex = workoutExercises.value[swapIndex.value]
  return ex ? getExerciseName(ex.exerciseId) : ''
})

// "Dauerhaft" gibt es nur fuer Uebungen, die wirklich im Plan-Tag stehen —
// nicht fuer Quick-Adds (Index hinter Planlaenge) und nicht im individuellen Training.
const canSwapPermanently = computed(() => {
  const day = currentDay.value
  if (!day?.id || workoutStore.activeWorkout?.isCustom) return false
  return swapIndex.value >= 0 && swapIndex.value < (day.exercises?.length || 0)
})

function openSwap(index) {
  swapIndex.value = index
  swapSearch.value = ''
  swapTargetId.value = null
  showSwapModal.value = true
}

async function applySwap(permanent) {
  const newExerciseId = swapTargetId.value
  if (!newExerciseId) return
  if (swapIndex.value >= 0 && swapIndex.value < workoutExercises.value.length) {
    workoutExercises.value[swapIndex.value] = {
      ...workoutExercises.value[swapIndex.value],
      exerciseId: newExerciseId
    }
    // Abweichung am Workout-Log sichern — sonst ist sie nach Tab-Wechsel/Reload weg
    await workoutStore.persistWorkoutExercises(workoutExercises.value)

    if (permanent && canSwapPermanently.value) {
      const day = currentDay.value
      const updated = day.exercises.map((e, i) =>
        i === swapIndex.value ? { ...e, exerciseId: newExerciseId } : e
      )
      await plansStore.updateTrainingDay(day.id, { exercises: updated })
      // updateTrainingDay ersetzt das Objekt im Store — Referenz nachziehen
      currentDay.value = plansStore.trainingDays.find(d => d.id === day.id) || day
    }

    await loadRecommendations()
    updateNotification()
  }
  swapTargetId.value = null
  showSwapModal.value = false
}

async function quickAddExercise(exercise) {
  workoutExercises.value.push({
    exerciseId: exercise.id,
    sets: 3,
    notes: ''
  })
  showQuickAdd.value = false
  await workoutStore.persistWorkoutExercises(workoutExercises.value)
  await loadRecommendations()
  updateNotification()
}

function openCustomPicker() {
  customSearch.value = ''
  customSelectedIds.value = []
  showCustomPicker.value = true
}

function toggleCustomExercise(id) {
  if (customSelectedIds.value.includes(id)) {
    customSelectedIds.value = customSelectedIds.value.filter(x => x !== id)
  } else {
    customSelectedIds.value = [...customSelectedIds.value, id]
  }
}

async function startCustom() {
  if (customSelectedIds.value.length === 0) return
  showCustomPicker.value = false
  // Preserve picker order; default to 2 sets like the planning picker does.
  const dayExercises = customSelectedIds.value.map(id => ({ exerciseId: id, sets: 2, notes: '' }))
  await workoutStore.startCustomWorkout(dayExercises)
  currentDay.value = { title: 'Individuelles Training', exercises: dayExercises }
  workoutExercises.value = [...dayExercises]
  await loadRecommendations()
  await requestNotificationPermission()
  updateNotification()
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
    const aw = workoutStore.activeWorkout
    if (aw.isCustom) {
      // Individuelle Trainings liegen seit v1.2.0 in der DB und ueberleben Reloads
      currentDay.value = { title: aw.title || 'Individuelles Training', exercises: aw.exercises || [] }
      workoutExercises.value = [...(aw.exercises || [])]
    } else {
      const day = plansStore.trainingDays.find(d => d.id === aw.trainingDayId)
      // Abweichungen vom Plan (Tausch/Quick-Add) liegen am Log und gewinnen;
      // Fallback auf die Plan-Liste. Ohne Tag (geloescht) traegt das Log die Liste.
      currentDay.value = day || { title: 'Workout', exercises: aw.exercises || [] }
      workoutExercises.value = [...(aw.exercises?.length ? aw.exercises : (day?.exercises || []))]
    }
    await loadRecommendations()
  }

  // App-Shortcut "Individuelles Training" (Long-Press aufs App-Icon)
  if (route.query.start === 'custom' && !workoutStore.isWorkoutActive) {
    openCustomPicker()
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onSwMessage)
  }
})

onUnmounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', onSwMessage)
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

.sync-banner {
  display: block;
  background: var(--color-user2-bg);
  color: var(--color-user2);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-user2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-align: center;
  margin-bottom: var(--space-sm);
  text-decoration: none;
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
  flex: 1;
  min-width: 0;
}

.exercise-notes-inline {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  color: var(--color-text-muted);
  font-style: italic;
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
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-xs) var(--space-sm);
  border-left: 3px solid;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-bg);
  font-size: var(--font-size-sm);
  min-width: 0;
}

.user-value-name {
  color: var(--color-text-light);
  flex-shrink: 0;
}

.user-value-data {
  font-weight: var(--font-weight-semibold);
  flex: 1;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rec-hint {
  color: var(--color-text-muted);
  font-style: italic;
}

.increase-hint {
  color: var(--color-success);
  font-weight: var(--font-weight-bold);
}

.increase-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
  opacity: 0.35;
}

.increase-icon-btn:active {
  background: var(--color-bg);
}

.increase-icon-btn.active {
  opacity: 1;
  border-color: var(--user-color);
  background: color-mix(in srgb, var(--user-color) 12%, white);
}

.increase-icon-logo {
  width: 16px;
  height: 16px;
  display: block;
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

.swap-section-label {
  padding: var(--space-sm) 0 var(--space-xs);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
}

.swap-confirm-text {
  margin-bottom: var(--space-md);
  line-height: 1.5;
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

.day-card-custom {
  border: 1px dashed var(--color-border);
}

.no-plan-hint {
  margin-top: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.5;
}

.no-plan-hint a {
  color: var(--color-accent);
  font-weight: var(--font-weight-medium);
}

/* Multi-select rows in the individual-training picker */
.swap-item .swap-name {
  flex: 1;
  min-width: 0;
}

.swap-item.is-selected {
  background: var(--color-bg);
}

.swap-item.is-selected .swap-name {
  color: var(--color-accent);
  font-weight: var(--font-weight-semibold);
}

.swap-check {
  width: 18px;
  height: 18px;
  margin-right: var(--space-xs);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  color: var(--color-white);
}

.swap-item.is-selected .swap-check {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.picker-footer {
  position: sticky;
  bottom: 0;
  padding: var(--space-md) 0;
  background: var(--color-white);
}
</style>
