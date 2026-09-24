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
          <div class="workout-titel">
            <h2>{{ currentDay?.title || 'Workout' }}</h2>
            <span class="workout-date">{{ formattedDate }}</span>
          </div>

          <!-- Wer trainiert: Farbkreise mit Anfangsbuchstaben rechts im Kopf
               (Variante C, Gabriel 24.09.2026 — vorher eine Chip-Zeile unter
               dem Titel). Tipp oeffnet den Dialog. -->
          <button
            class="user-avatare"
            :aria-label="`Wer trainiert: ${aktiveNamen}. Tippen zum Aendern`"
            :title="`Wer trainiert: ${aktiveNamen}`"
            @click="showUserSelect = true"
          >
            <span
              v-for="user in authStore.activeUsers"
              :key="user.id"
              class="user-avatar"
              :style="{ background: user.color }"
              aria-hidden="true"
            >{{ user.name.charAt(0) }}</span>
          </button>
        </div>

        <!-- Exercise list -->
        <div
          v-for="(planExercise, index) in workoutExercises"
          :key="planExercise.exerciseId + '-' + index"
          class="card exercise-card"
          :class="{ 'exercise-active': activeExerciseIndex === index }"
          @click="openExerciseInput(index)"
          @touchstart.passive="onCardTouchStart"
          @touchend.passive="onCardTouchEnd($event, index)"
        >
          <div class="exercise-row">
            <!-- Thumbnail links: Vorschaubild der KOPF-Uebung (die aktive Uebung des
                 bevorzugten Nutzers — auf Lisas Handy traegt die Karte Lisas
                 Uebung), ohne Bild die MuscleMap klein als Platzhalter.
                 Tipp aufs Thumbnail oeffnet die Detailansicht, NICHT das
                 Eingabe-Rad — darum @click.stop -->
            <div class="exercise-thumb" @click.stop="openExerciseDetail(kopfId(planExercise))">
              <img
                v-if="getThumbUrl(kopfId(planExercise))"
                :src="getThumbUrl(kopfId(planExercise))"
                alt=""
                class="thumb-foto"
              />
              <MuscleMap
                v-else
                :fallback-group="getMuscleGroupId(kopfId(planExercise))"
                :size="44"
              />
            </div>

            <div class="exercise-main">
              <div class="exercise-name-row">
                <h3 class="exercise-name">
                  {{ getExerciseName(kopfId(planExercise)) }}<span
                    v-if="getExerciseNotes(kopfId(planExercise))"
                    class="exercise-notes-inline"
                  > ({{ getExerciseNotes(kopfId(planExercise)) }})</span>
                </h3>
                <button class="btn-icon" @click.stop="openSwap(index)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
                </button>
              </div>

              <!-- Compact display of current values per user.
                   Layout nach Anzahl: 1 volle Breite, 2 nebeneinander, 3 untereinander -->
              <div class="exercise-values" :class="'users-' + authStore.activeUsers.length">
                <div v-for="user in authStore.activeUsers" :key="user.id" class="user-value" :data-user-id="user.id" :style="{ borderLeftColor: user.color }">
                  <span class="user-value-name">{{ user.name }}</span>
                  <span class="user-value-data">
                    <template v-if="getSavedValue(aktiveId(planExercise, user.id), user.id, 'weight')">
                      {{ getSavedValue(aktiveId(planExercise, user.id), user.id, 'weight') }}kg <span class="value-reps">x {{ getSavedValue(aktiveId(planExercise, user.id), user.id, 'reps') }}</span>
                    </template>
                    <template v-else-if="recommendations[aktiveId(planExercise, user.id)]?.[user.id]">
                      <span class="rec-hint">{{ recommendations[aktiveId(planExercise, user.id)][user.id].weight }}kg</span>
                      <!-- Wdh der letzten Einheit. {{ ' ' }} statt Leerzeichen: Vue streicht
                           Leerraum am Rand eines template, und nur dort darf umbrochen werden -->
                      <template v-if="getLastReps(aktiveId(planExercise, user.id), user.id) != null">
                        {{ ' ' }}<span class="rec-hint value-reps">x {{ getLastReps(aktiveId(planExercise, user.id), user.id) }}</span>
                      </template>
                      <span v-if="increaseFlags[aktiveId(planExercise, user.id)]?.[user.id]" class="increase-hint">&#8593;</span>
                    </template>
                    <template v-else>--</template>
                  </span>
                  <button
                    class="increase-icon-btn"
                    :class="{ active: increaseToggles[aktiveId(planExercise, user.id)]?.[user.id] }"
                    :style="{ '--user-color': user.color }"
                    :title="`${user.name}: Gewicht beim nächsten Mal steigern`"
                    @click.stop="toggleIncrease(aktiveId(planExercise, user.id), user.id)"
                  >
                    <img src="/logo.svg" alt="" class="increase-icon-logo" />
                  </button>
                  <!-- Schnellwechsel JE NUTZER (nur mit hinterlegten Alternativen):
                       Tipp aufs Symbol springt zur naechsten Ring-Uebung DIESES
                       Nutzers, der Name zeigt seine aktive Uebung. Der Stern
                       merkt sie als seinen Standard im Plan (erneuter Tipp
                       entfernt den Standard); Wischen auf dem Bereich wechselt
                       ebenfalls nur diesen Nutzer. -->
                  <div v-if="getRing(planExercise).length > 1" class="user-ring-row">
                    <button class="user-ring-btn" :title="`${user.name}: Alternative wechseln`" @click.stop="tapRingUser(index, user.id)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h13m0 0l-3-3m3 3l-3 3M20 17H7m0 0l3 3m-3-3l3-3"/></svg>
                      <span class="user-ring-name">{{ getExerciseName(aktiveId(planExercise, user.id)) }}</span>
                    </button>
                    <button
                      v-if="kannStandardMerken(index)"
                      class="user-star-btn"
                      :class="{ active: istStandard(planExercise, user.id) }"
                      :style="{ '--user-color': user.color }"
                      :title="`${user.name}: aktive Uebung als Standard merken`"
                      @click.stop="merkeStandard(index, user.id)"
                    >&#9733;</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Werkzeugzeile unter der Uebungsliste (Variante C, Gabriel
             24.09.2026): Uebung hinzufuegen, Workout-Notiz und Zyklustag (P11)
             als gleich hohe Knoepfe in einer Reihe, darunter "Workout
             beenden". Vorhandene Werte sind am Knopf erkennbar (getoente
             Flaeche, "Notiz ✓" / "Zyklus 17"; "Zyklus" statt "Zyklustag",
             damit alle drei auf 360 px in eine Reihe passen). Der
             Zyklus-Knopf erscheint nur, wenn ein aktiver Nutzer zyklus: true
             traegt. -->
        <div class="workout-werkzeuge">
          <button
            class="btn btn-secondary werkzeug-btn werkzeug-haupt"
            aria-label="Uebung hinzufuegen"
            @click="showQuickAdd = true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
            Uebung
          </button>
          <button
            class="btn btn-secondary werkzeug-btn"
            :class="{ 'hat-wert': workoutNote }"
            @click="openNoteModal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
            Notiz{{ workoutNote ? ' ✓' : '' }}
          </button>
          <button
            v-if="zyklusUser"
            class="btn btn-secondary werkzeug-btn"
            :class="{ 'hat-wert': currentCycleDay != null }"
            @click="openCycleModal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            Zyklus{{ currentCycleDay != null ? ' ' + currentCycleDay : '' }}
          </button>
        </div>

        <!-- Finish workout -->
        <button class="btn btn-primary btn-block" @click="finishWorkout" style="margin-top: var(--space-sm)">
          Workout beenden
        </button>
      </div>
    </div>

    <!-- Nutzer-Auswahl erneut oeffnen (Farbkreise im Kopf); Aenderung waehrend
         eines aktiven Workouts landet als userIds am workoutLog -->
    <UserSelectModal v-model="showUserSelect" @confirm="onActiveUsersChanged" />

    <!-- Uebungs-Detailansicht: grosses Bild, MuscleMap, Notizen je Nutzer -->
    <ExerciseDetail v-model="showExerciseDetail" :exercise="detailExercise" />

    <!-- Wheel Picker Modal for exercise input -->
    <Modal v-model="showWheelPicker" :title="activeExerciseName">
      <div v-if="activeExerciseIndex >= 0" class="picker-content">
        <!-- User tabs -->
        <div class="user-tabs">
          <button
            v-for="user in authStore.activeUsers"
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
          Empfehlung: {{ pickerRecommendation.weight }}kg<template v-if="pickerLastReps != null"> x {{ pickerLastReps }}</template>
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

        <!-- Nutzer-Wechsel-Hinweis: nutzerzahl-neutral, bei nur einem aktiven
             Nutzer gibt es nichts zu wechseln -->
        <p v-if="authStore.activeUsers.length > 1" class="picker-hint">
          Tippe oben auf einen Namen, um fuer diese Person einzutragen.
        </p>
      </div>
    </Modal>

    <!-- Workout-Notiz (P11): Freitext am workoutLog -->
    <Modal v-model="showNoteModal" title="Workout-Notiz">
      <textarea
        v-model="noteDraft"
        class="note-textarea"
        rows="5"
        placeholder="Notiz zum heutigen Training..."
      ></textarea>
      <button class="btn btn-primary btn-block" @click="saveNote">Speichern</button>
    </Modal>

    <!-- Zyklustag (P11): WheelPicker 1-45 fuer den Zyklus-Nutzer;
         Entfernen loescht nur dessen Schluessel in cycleDays -->
    <Modal v-model="showCycleModal" :title="zyklusUser ? `Zyklustag — ${zyklusUser.name}` : 'Zyklustag'">
      <div class="cycle-wheel">
        <WheelPicker
          :modelValue="cycleDraft"
          @update:modelValue="cycleDraft = $event"
          :values="cycleValues"
          label="Zyklustag"
          unit="Tag"
        />
      </div>
      <button class="btn btn-primary btn-block" @click="saveCycleDay">Speichern</button>
      <button
        class="btn btn-secondary btn-block"
        style="margin-top: var(--space-sm)"
        @click="removeCycleDay"
      >
        Entfernen
      </button>
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

    <!-- Quick Add Exercise Modal — passende Muskelgruppen zuerst -->
    <Modal v-model="showQuickAdd" title="Uebung hinzufuegen" fullHeight>
      <input v-model="quickAddSearch" type="text" placeholder="Uebung suchen..." class="search-input" />
      <div class="swap-list">
        <template v-for="section in quickAddSections" :key="section.label">
          <div v-if="section.items.length && section.label" class="swap-section-label">{{ section.label }}</div>
          <button v-for="ex in section.items" :key="ex.id" class="swap-item" @click="quickAddExercise(ex)">
            <span class="swap-name">{{ toTitleCase(ex.name) }}</span>
            <span class="swap-meta">{{ getMuscleLabel(ex.muscleGroup) }}</span>
          </button>
        </template>
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
import UserSelectModal from '../components/shared/UserSelectModal.vue'
import ExerciseDetail from '../components/tracking/ExerciseDetail.vue'
import WheelPicker from '../components/shared/WheelPicker.vue'
import MuscleMap from '../components/shared/MuscleMap.vue'
import { useWorkoutStore } from '../stores/workout.js'
import { usePlansStore } from '../stores/plans.js'
import { useAuthStore } from '../stores/auth.js'
import { useExercises } from '../composables/useExercises.js'
import { useHistory } from '../composables/useHistory.js'
import { isDeloadWeek, formatDate, getToday } from '../utils/dateHelpers.js'
import { MUSCLE_GROUPS } from '../utils/constants.js'
import { toTitleCase } from '../utils/formatters.js'
import { vorschauUrl, eintragFuerKey } from '../utils/uebungsBilder.js'
import {
  ringFuer,
  aktiveUebungId,
  naechsteImRing,
  mitNutzerUebung,
  vorbelegungAusBevorzugt,
  toggleBevorzugt
} from '../utils/uebungsRing.js'
import bildKatalog from '../data/uebungskatalog.json'
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
const { getLatestWeight, shouldIncreaseWeight } = useHistory()

const showDaySelector = ref(false)
const showUserSelect = ref(false)
const showSwapModal = ref(false)
const showQuickAdd = ref(false)
const showWheelPicker = ref(false)
const swapSearch = ref('')
const quickAddSearch = ref('')
const swapIndex = ref(-1)
const recommendations = reactive({})
const increaseFlags = reactive({})
const increaseToggles = reactive({})
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
    ? getExerciseById(kopfId(workoutExercises.value[swapIndex.value]))
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

// Muskelgruppen, die im laufenden Workout vorkommen — daraus ergibt sich, was
// "passt" (Pull-Tag: Ruecken/Arme). Reihenfolge aus MUSCLE_GROUPS statt aus dem
// Workout, damit die Ueberschrift bei gleichem Tag immer gleich aussieht.
const workoutMuscleGroups = computed(() => {
  const ids = new Set()
  for (const ex of workoutExercises.value) {
    const group = getExerciseById(ex.exerciseId)?.muscleGroup
    if (group) ids.add(group)
  }
  return MUSCLE_GROUPS.filter(m => ids.has(m.id)).map(m => m.id)
})

// Hinzufuegen-Liste in zwei Abschnitten wie die Tausch-Liste: erst die
// Uebungen, die zum heutigen Workout passen, darunter alle uebrigen.
const quickAddSections = computed(() => {
  const list = searchFilter(exercises.value, quickAddSearch.value)
  const groups = workoutMuscleGroups.value
  if (groups.length === 0) return [{ label: '', items: [...list].sort(byLastUsedThenName) }]
  const fitting = list.filter(e => groups.includes(e.muscleGroup)).sort(byLastUsedThenName)
  const others = list.filter(e => !groups.includes(e.muscleGroup)).sort(byLastUsedThenName)
  return [
    { label: `Passend zum Workout (${groups.map(getMuscleLabel).join(', ')})`, items: fitting },
    { label: 'Andere Muskelgruppen', items: others }
  ]
})

const filteredCustomExercises = computed(() =>
  [...searchFilter(exercises.value, customSearch.value)].sort(byLastUsedThenName)
)

// Uebung des im Rad gewaehlten Nutzers — Titel und Schrittweite wechseln
// mit dem Nutzer-Tab (jeder traegt fuer SEINE aktive Uebung ein)
const activeExerciseName = computed(() => {
  if (activeExerciseIndex.value < 0) return ''
  const ex = workoutExercises.value[activeExerciseIndex.value]
  return ex ? getExerciseName(aktiveId(ex, pickerUserId.value)) : ''
})

// Determine if exercise uses 1.25kg steps (barbell or machine_weight)
const useDecimalSteps = computed(() => {
  if (activeExerciseIndex.value < 0) return false
  const ex = workoutExercises.value[activeExerciseIndex.value]
  if (!ex) return false
  const exercise = getExerciseById(aktiveId(ex, pickerUserId.value))
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
  return ex ? (recommendations[aktiveId(ex, pickerUserId.value)]?.[pickerUserId.value] || null) : null
})

const pickerShouldIncrease = computed(() => {
  if (activeExerciseIndex.value < 0) return false
  const ex = workoutExercises.value[activeExerciseIndex.value]
  return ex ? (increaseFlags[aktiveId(ex, pickerUserId.value)]?.[pickerUserId.value] || false) : false
})

const pickerLastReps = computed(() => {
  if (activeExerciseIndex.value < 0) return null
  const ex = workoutExercises.value[activeExerciseIndex.value]
  return ex ? getLastReps(aktiveId(ex, pickerUserId.value), pickerUserId.value) : null
})

// Vorauswahl im Rad und erster Notification-Knopf: der Standard-Nutzer des
// Geraets — ist er heute nicht aktiv, der erste aktive Nutzer.
const preferredUserId = computed(() => {
  const active = authStore.activeUsers
  return active.some(u => u.id === authStore.defaultUserId)
    ? authStore.defaultUserId
    : (active[0]?.id || authStore.defaultUserId)
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

// Vorschaubild der Uebung — nur wenn der gespeicherte imageKey im Manifest
// existiert, sonst null (kein kaputtes Bild-Icon bei verwaisten Keys).
function getThumbUrl(exerciseId) {
  return vorschauUrl(eintragFuerKey(bildKatalog, getExerciseById(exerciseId)?.imageKey))
}

// Grobgruppe fuer den MuscleMap-Platzhalter, wenn kein Foto zugeordnet ist
function getMuscleGroupId(exerciseId) {
  return getExerciseById(exerciseId)?.muscleGroup || ''
}

// Detailansicht (Tipp aufs Thumbnail — das Rad bleibt dem Karten-Tipp)
const showExerciseDetail = ref(false)
const detailExercise = ref(null)

function openExerciseDetail(exerciseId) {
  if (istWischNachklick()) return
  const ex = getExerciseById(exerciseId)
  if (!ex) return
  detailExercise.value = ex
  showExerciseDetail.value = true
}

function getSavedValue(exerciseId, userId, field) {
  const sets = workoutStore.getSetsForExercise(exerciseId, userId)
  const set = sets.find(s => s.setNumber === 1)
  return set ? set[field] : null
}

// Wdh der letzten Einheit — aus DEMSELBEN gespeicherten Satz wie der
// Gewichtsvorschlag daneben. Vorher standen beide in getrennten Speichern, die
// nacheinander gefuellt wurden: der Vorschlag nur bei einem Treffer, die Wdh
// dagegen immer. Blieb die zweite Abfrage leer, zeigte die Karte das Gewicht
// ohne Wdh, bis die App neu startete (Gabriel beim Uebungstausch, 15.09.2026).
function getLastReps(exerciseId, userId) {
  return recommendations[exerciseId]?.[userId]?.reps ?? null
}

// Gewichtsschritt der Uebung: 1.25 kg fuer Langhantel/Maschine, sonst 1 kg
function getWeightStep(exerciseId) {
  const eq = getExerciseById(exerciseId)?.equipment
  return eq === 'barbell' || eq === 'machine_weight' ? 1.25 : 1
}

async function loadRecommendations() {
  for (const ex of workoutExercises.value) {
    // Je Nutzer SEINE aktive Uebung (Schnellwechsel-Ring) — der Schluessel in
    // recommendations/increaseFlags ist immer die Uebung, die er wirklich macht
    for (const user of authStore.activeUsers) {
      const exId = aktiveId(ex, user.id)
      if (!recommendations[exId]) recommendations[exId] = {}
      if (!increaseFlags[exId]) increaseFlags[exId] = {}

      const latest = await getLatestWeight(exId, user.id)

      const shouldInc = await shouldIncreaseWeight(exId, user.id)
      increaseFlags[exId][user.id] = shouldInc

      if (latest) {
        // Steigern-Merker wirkt direkt auf den Vorschlag: Schrittweite aufschlagen,
        // der Pfeil im UI zeigt dann nur noch an, DASS erhoeht wurde.
        const weight = shouldInc
          ? Math.round((latest.weight + getWeightStep(exId)) * 100) / 100
          : latest.weight
        // latest traegt die Wdh dieses Satzes mit — getLastReps liest sie von
        // hier. Ein Eintrag, ein Paar: das Rad startet mit dem, was die Karte
        // zeigt, und ein leeres Abfrageergebnis kann kein halbes Paar hinterlassen.
        recommendations[exId][user.id] = { ...latest, weight }
      }
    }
  }
}

// --- Workout-Notiz und Zyklustag (P11): beide Felder liegen am workoutLog ---

const showNoteModal = ref(false)
const showCycleModal = ref(false)
const noteDraft = ref('')
const cycleDraft = ref(1)

// Additiv gelesen: alte workoutLogs ohne note/cycleDays bleiben gueltig
const workoutNote = computed(() => workoutStore.activeWorkout?.note || '')

// Der Zyklus-Nutzer: der aktive Nutzer mit zyklus: true (siehe constants.js)
const zyklusUser = computed(() => authStore.activeUsers.find(u => u.zyklus) || null)

// Vorlesetext der Farbkreise im Kopf ("Lisa, Gab")
const aktiveNamen = computed(() => authStore.activeUsers.map(u => u.name).join(', '))

const currentCycleDay = computed(() => {
  const uid = zyklusUser.value?.id
  const days = workoutStore.activeWorkout?.cycleDays
  return uid && days && days[uid] != null ? days[uid] : null
})

const cycleValues = computed(() => {
  const vals = []
  for (let d = 1; d <= 45; d++) vals.push(d)
  return vals
})

function openNoteModal() {
  noteDraft.value = workoutNote.value
  showNoteModal.value = true
}

async function saveNote() {
  await workoutStore.updateWorkoutNote(noteDraft.value.trim())
  showNoteModal.value = false
}

function openCycleModal() {
  cycleDraft.value = currentCycleDay.value ?? 1
  showCycleModal.value = true
}

async function saveCycleDay() {
  if (!zyklusUser.value) return
  await workoutStore.setCycleDay(zyklusUser.value.id, cycleDraft.value)
  showCycleModal.value = false
}

async function removeCycleDay() {
  if (!zyklusUser.value) return
  await workoutStore.setCycleDay(zyklusUser.value.id, null)
  showCycleModal.value = false
}

// --- Schnellwechsel-Ring (P10 + Standard je Nutzer): Regeln in
// --- utils/uebungsRing.js, Vertrag in scripts/uebungsring-test.mjs ---

// Beim Aufbau der Workout-Liste bekommt jeder Eintrag seine Basis (die
// geplante Uebung); Resume/Override behalten gespeicherte Werte. Die im Plan
// gemerkten Standard-Uebungen (`bevorzugt`) werden beim ersten Aufbau in
// `userExerciseIds` ueberfuehrt — ein gespeichertes Objekt (Resume) gewinnt.
function mitBasis(list) {
  return list.map(e => {
    const eintrag = { ...e, basisExerciseId: e.basisExerciseId || e.exerciseId }
    if (!eintrag.userExerciseIds) eintrag.userExerciseIds = vorbelegungAusBevorzugt(eintrag)
    return eintrag
  })
}

// Ring der Karte (fuers v-if der Wechsel-Zeile)
function getRing(entry) {
  return ringFuer(entry)
}

// Aktive Uebung eines Nutzers an dieser Karte
function aktiveId(entry, userId) {
  return aktiveUebungId(entry, userId)
}

// Kopf der Karte (Titel, Thumbnail, Detailansicht): die Uebung des
// bevorzugten Nutzers — auf Lisas Handy traegt die Karte Lisas Uebung.
function kopfId(entry) {
  return aktiveUebungId(entry, preferredUserId.value)
}

// Stern-Zustand: ist die aktive Uebung des Nutzers sein gemerkter Standard?
function istStandard(entry, userId) {
  return (entry.bevorzugt || {})[userId] === aktiveId(entry, userId)
}

// Standards lassen sich nur fuer echte Plan-Positionen merken — nicht fuer
// Quick-Adds und nicht im individuellen Training (wie beim dauerhaften Tausch).
function kannStandardMerken(index) {
  const day = currentDay.value
  if (!day?.id || workoutStore.activeWorkout?.isCustom) return false
  return planPositionFuer(index) >= 0
}

// Plan-Position eines Workout-Eintrags: ueber den Index (solange er in der
// Plan-Liste liegt und die Basis stimmt), sonst ueber die Basis-Uebung.
function planPositionFuer(index) {
  const day = currentDay.value
  const entry = workoutExercises.value[index]
  if (!day?.exercises || !entry) return -1
  if (index < day.exercises.length && day.exercises[index].exerciseId === entry.basisExerciseId) return index
  return day.exercises.findIndex(e => e.exerciseId === entry.basisExerciseId)
}

// Stern: aktive Uebung des Nutzers als seinen Standard im PLAN merken
// (erneuter Tipp entfernt ihn). Gesynct — gilt damit auf allen Geraeten.
async function merkeStandard(index, userId) {
  if (istWischNachklick()) return
  const entry = workoutExercises.value[index]
  const day = currentDay.value
  const planIndex = planPositionFuer(index)
  if (!entry || planIndex < 0 || !day?.id) return
  const neu = toggleBevorzugt(day.exercises[planIndex].bevorzugt, userId, aktiveId(entry, userId))
  // Kopier-Leitplanke wie beim dauerhaften Tausch; basisExerciseId und
  // userExerciseIds gehoeren dem Workout-Log, nicht dem Plan
  const updated = day.exercises.map((e, i) => ({
    ...e,
    alternativen: [...(e.alternativen || [])],
    bevorzugt: i === planIndex ? neu : { ...(e.bevorzugt || {}) }
  }))
  await plansStore.updateTrainingDay(day.id, { exercises: updated })
  // updateTrainingDay ersetzt das Objekt im Store — Referenz nachziehen
  currentDay.value = plansStore.trainingDays.find(d => d.id === day.id) || day
  // Stern sofort sichtbar und nach Resume erhalten: auch am Workout-Eintrag
  workoutExercises.value[index] = { ...entry, bevorzugt: neu }
  await workoutStore.persistWorkoutExercises(workoutExercises.value)
}

async function cycleRingUser(index, userId, dir = 1) {
  const entry = workoutExercises.value[index]
  const nextId = naechsteImRing(entry, userId, dir)
  if (!nextId) return
  workoutExercises.value[index] = mitNutzerUebung(entry, userId, nextId)
  // Gleicher Weg wie beim Tausch: Abweichung am Log sichern, Empfehlungen
  // und Notification nachziehen
  await workoutStore.persistWorkoutExercises(workoutExercises.value)
  await loadRecommendations()
  updateNotification()
}

function tapRingUser(index, userId) {
  if (istWischNachklick()) return
  cycleRingUser(index, userId, 1)
}

// Wisch-Erkennung auf der Karte: horizontal (|dx| > 40 px und |dx| > 2|dy|)
// wechselt im Ring; vertikales Scrollen bleibt unberuehrt (passive Listener,
// kein preventDefault). Manche WebViews feuern nach einem Wisch trotzdem noch
// ein click auf das Element unterm Finger — der Zeitstempel faengt diesen
// Nachklick in allen Klick-Zielen der Karte ab.
const touchStart = { x: 0, y: 0 }
let letzterWischUm = 0

function istWischNachklick() {
  return Date.now() - letzterWischUm < 400
}

function onCardTouchStart(e) {
  touchStart.x = e.touches[0].clientX
  touchStart.y = e.touches[0].clientY
}

function onCardTouchEnd(e, index) {
  const dx = e.changedTouches[0].clientX - touchStart.x
  const dy = e.changedTouches[0].clientY - touchStart.y
  if (Math.abs(dx) <= 40 || Math.abs(dx) <= 2 * Math.abs(dy)) return
  letzterWischUm = Date.now()
  // Ohne Alternativen loest Wischen nichts aus (nur der Nachklick-Schutz greift)
  if (getRing(workoutExercises.value[index]).length <= 1) return
  // Wisch auf einem Nutzer-Bereich wechselt DESSEN Uebung; ausserhalb (Kopf)
  // die des bevorzugten Nutzers. target ist das Element des Fingerkontakts.
  const bereich = e.target?.closest?.('.user-value')
  const userId = bereich?.dataset?.userId || preferredUserId.value
  // Wisch nach links = vorwaerts im Ring, nach rechts = zurueck
  cycleRingUser(index, userId, dx < 0 ? 1 : -1)
}

function openExerciseInput(index) {
  if (istWischNachklick()) return
  activeExerciseIndex.value = index
  const ex = workoutExercises.value[index]
  // Standard-Nutzer vorausgewaehlt (pro Geraet); nicht aktiv -> erster aktiver
  pickerUserId.value = preferredUserId.value

  // Pre-fill with saved value or recommendation — fuer die aktive Uebung
  // DIESES Nutzers (Schnellwechsel-Ring)
  const exId = aktiveId(ex, pickerUserId.value)
  const saved = workoutStore.getSetsForExercise(exId, pickerUserId.value).find(s => s.setNumber === 1)
  if (saved) {
    pickerWeight.value = saved.weight
    pickerReps.value = saved.reps
  } else {
    const rec = recommendations[exId]?.[pickerUserId.value]
    // ?? statt ||: 0 kg (Koerpergewichtsuebung) ist ein gueltiger Wert
    pickerWeight.value = rec?.weight ?? 20
    pickerReps.value = getLastReps(exId, pickerUserId.value) ?? 10
  }

  showWheelPicker.value = true
}

// When switching user in picker, load their saved/recommended values
watch(pickerUserId, (userId) => {
  if (activeExerciseIndex.value < 0) return
  const ex = workoutExercises.value[activeExerciseIndex.value]
  const exId = aktiveId(ex, userId)
  const saved = workoutStore.getSetsForExercise(exId, userId).find(s => s.setNumber === 1)
  if (saved) {
    pickerWeight.value = saved.weight
    pickerReps.value = saved.reps
  } else {
    const rec = recommendations[exId]?.[userId]
    pickerWeight.value = rec?.weight ?? 20
    pickerReps.value = getLastReps(exId, userId) ?? 10
  }
})

async function savePickerValues() {
  const ex = workoutExercises.value[activeExerciseIndex.value]
  // Der Satz gehoert zur aktiven Uebung DES NUTZERS — Lisas Latzug-Satz
  // landet bei Latzug, Gabs Klimmzug-Satz bei Klimmzug
  await workoutStore.saveSet(aktiveId(ex, pickerUserId.value), pickerUserId.value, 1, pickerWeight.value, pickerReps.value)

  // Auto-Wechsel: reihum zum naechsten AKTIVEN Nutzer ohne gespeicherten Satz
  // (gemessen an SEINER aktiven Uebung). Bei einem aktiven Nutzer laeuft die
  // Schleife leer, das Rad schliesst sich.
  const active = authStore.activeUsers
  const startIdx = active.findIndex(u => u.id === pickerUserId.value)
  for (let i = 1; i < active.length; i++) {
    const candidate = active[(startIdx + i + active.length) % active.length]
    const candidateSaved = workoutStore.getSetsForExercise(aktiveId(ex, candidate.id), candidate.id).find(s => s.setNumber === 1)
    if (!candidateSaved) {
      pickerUserId.value = candidate.id
      return
    }
  }

  showWheelPicker.value = false
  activeExerciseIndex.value = -1
  updateNotification()
}

async function toggleIncrease(exerciseId, userId) {
  if (istWischNachklick()) return
  const result = await workoutStore.toggleIncreaseNextTime(exerciseId, userId)
  if (!increaseToggles[exerciseId]) increaseToggles[exerciseId] = {}
  increaseToggles[exerciseId][userId] = result
}

// Bestaetigte Nutzer-Auswahl ueber die Farbkreise im Kopf: der Store ist schon
// aktualisiert (UserSelectModal), hier bleibt nur, die Besetzung am laufenden
// Workout-Log nachzuziehen — gespeicherte Saetze bleiben unangetastet.
async function onActiveUsersChanged(userIds) {
  if (workoutStore.isWorkoutActive) {
    await workoutStore.updateWorkoutUsers(userIds)
    // Ein neu dazugekommener Nutzer braucht seine Empfehlungen, und die
    // Notification darf nur noch die aktive Besetzung zeigen.
    await loadRecommendations()
    updateNotification()
  }
}

async function enableNotifications() {
  const granted = await requestNotificationPermission()
  showNotifBanner.value = false
  if (granted && currentDay.value) {
    updateNotification()
  }
}

// Daten fuer die Knoepfe in der Sperrbildschirm-Notification: je Nutzer die
// Warteschlange der noch offenen Uebungen samt fertigem setLog-Datensatz.
// Der Service Worker schreibt beim Knopfdruck den ersten Eintrag in IndexedDB —
// auch bei geschlossener App (siehe public/sw-custom.js).
//
// Android zeigt nur ZWEI Knoepfe. Platz 2 gehoert fest "Workout beenden",
// Platz 1 dem Quick-Log des Standard-Nutzers (hat der alles eingetragen,
// rueckt der andere Nutzer nach). Dieselbe Regel steckt im Service Worker,
// der die Notification nach jedem Knopfdruck neu aufbaut.
function buildNotificationActions(userOrder, queues, userNames) {
  const actions = []
  for (const userId of userOrder) {
    const queue = queues[userId] || []
    if (queue.length > 0) {
      actions.push({ action: `log-${userId}`, title: `${userNames[userId]} OK: ${queue[0].label}` })
      break
    }
  }
  actions.push({ action: 'finish-workout', title: 'Workout beenden' })
  return actions
}

function buildNotificationQuickLog() {
  const aw = workoutStore.activeWorkout
  if (!aw) return { actions: [], data: null }
  const queues = {}
  const userNames = {}
  // Nur AKTIVE Nutzer, bevorzugter zuerst: er bekommt den einen
  // Quick-Log-Knopf (Standard-Nutzer, wenn aktiv — sonst der erste aktive)
  const orderedUsers = [
    ...authStore.activeUsers.filter(u => u.id === preferredUserId.value),
    ...authStore.activeUsers.filter(u => u.id !== preferredUserId.value)
  ]
  for (const user of orderedUsers) {
    userNames[user.id] = user.name
    const queue = []
    for (const ex of workoutExercises.value) {
      // Warteschlange je Nutzer ueber SEINE aktive Uebung (Schnellwechsel-Ring)
      const exId = aktiveId(ex, user.id)
      const saved = workoutStore.getSetsForExercise(exId, user.id).find(s => s.setNumber === 1)
      if (saved) continue
      const rec = recommendations[exId]?.[user.id]
      const weight = rec?.weight ?? 20
      const reps = getLastReps(exId, user.id) ?? 10
      queue.push({
        label: `${getExerciseName(exId)} ${weight}kg x${reps}`,
        set: {
          workoutLogId: aw.id,
          exerciseId: exId,
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
  }
  const userOrder = orderedUsers.map(u => u.id)
  return {
    actions: buildNotificationActions(userOrder, queues, userNames),
    data: {
      kind: 'workout-quicklog',
      dbName: db.name,
      // Der Service Worker braucht die Log-Id, um "beenden" schreiben zu koennen
      workoutLogId: aw.id,
      title: currentDay.value?.title || 'Workout',
      userOrder,
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
    authStore.activeUsers,
    recommendations,
    getSavedValue,
    getLastReps,
    aktiveId
  )
  const { actions, data } = buildNotificationQuickLog()
  showWorkoutNotification(currentDay.value.title, lines, { actions, data })
}

// Vom Sperrbildschirm geloggte Saetze (Service Worker) in Ansicht und Cloud holen
async function onSwMessage(e) {
  // Ueber den Notification-Knopf beendet: der Service Worker hat completedAt
  // schon geschrieben — hier nur noch die offene Ansicht zuruecksetzen.
  if (e.data?.type === 'workout-finished') {
    workoutStore.clearActiveWorkout()
    clearWorkoutView()
    dismissWorkoutNotification()
    flushQueue()
    return
  }
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
  workoutExercises.value = mitBasis(aw?.exercises?.length ? aw.exercises : day.exercises)
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
  // Der freie Tausch ist eine Karten-Entscheidung — angezeigt wird die
  // Kopf-Uebung (Sicht des bevorzugten Nutzers)
  return ex ? getExerciseName(kopfId(ex)) : ''
})

// "Dauerhaft" gibt es nur fuer Uebungen, die wirklich im Plan-Tag stehen —
// nicht fuer Quick-Adds (Index hinter Planlaenge) und nicht im individuellen Training.
const canSwapPermanently = computed(() => {
  const day = currentDay.value
  if (!day?.id || workoutStore.activeWorkout?.isCustom) return false
  return swapIndex.value >= 0 && swapIndex.value < (day.exercises?.length || 0)
})

function openSwap(index) {
  if (istWischNachklick()) return
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
      exerciseId: newExerciseId,
      // Freier Tausch ist eine Karten-Entscheidung fuer ALLE: individuelle
      // Ring-Staende werden zurueckgesetzt, jeder folgt der neuen Uebung
      userExerciseIds: {}
    }
    // Abweichung am Workout-Log sichern — sonst ist sie nach Tab-Wechsel/Reload weg
    await workoutStore.persistWorkoutExercises(workoutExercises.value)

    if (permanent && canSwapPermanently.value) {
      const day = currentDay.value
      // Jeden Eintrag kopieren, `alternativen`/`bevorzugt` als frische Kopien:
      // reaktive Vue-Proxys kann IndexedDB nicht klonen (DataCloneError beim put).
      // basisExerciseId gehoert dem Workout-Log, nicht dem Plan — nicht mitschreiben.
      const updated = day.exercises.map((e, i) =>
        i === swapIndex.value
          ? { ...e, exerciseId: newExerciseId, alternativen: [...(e.alternativen || [])], bevorzugt: { ...(e.bevorzugt || {}) } }
          : { ...e, alternativen: [...(e.alternativen || [])], bevorzugt: { ...(e.bevorzugt || {}) } }
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
    basisExerciseId: exercise.id,
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
  const dayExercises = customSelectedIds.value.map(id => ({ exerciseId: id, basisExerciseId: id, sets: 2, notes: '' }))
  await workoutStore.startCustomWorkout(dayExercises)
  currentDay.value = { title: 'Individuelles Training', exercises: dayExercises }
  workoutExercises.value = [...dayExercises]
  await loadRecommendations()
  await requestNotificationPermission()
  updateNotification()
}

function clearWorkoutView() {
  workoutExercises.value = []
  currentDay.value = null
}

async function finishWorkout() {
  await workoutStore.finishWorkout()
  clearWorkoutView()
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
      workoutExercises.value = mitBasis(aw.exercises || [])
    } else {
      const day = plansStore.trainingDays.find(d => d.id === aw.trainingDayId)
      // Abweichungen vom Plan (Tausch/Quick-Add) liegen am Log und gewinnen;
      // Fallback auf die Plan-Liste. Ohne Tag (geloescht) traegt das Log die Liste.
      currentDay.value = day || { title: 'Workout', exercises: aw.exercises || [] }
      workoutExercises.value = mitBasis(aw.exercises?.length ? aw.exercises : (day?.exercises || []))
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

/* Kopf: Titel + Datum links, Farbkreise der aktiven Nutzer rechts */
.workout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-md);
  margin-bottom: var(--space-md);
}

.workout-titel {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* Wer trainiert: Kreise mit Anfangsbuchstaben in der Nutzerfarbe, mehrere
   leicht ueberlappend; der Ring in Seitenfarbe trennt sie. Der Knopf ist
   44 px hoch (Tippflaeche), die Kreise 32 px. Der negative Rand rechts
   gleicht Innenabstand (4 px) und Ring (2 px) aus: die farbige Flaeche des
   letzten Kreises schliesst buendig mit den Karten ab. */
.user-avatare {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 44px;
  min-height: 44px;
  margin-right: -6px;
  padding: 0 var(--space-xs);
  border-radius: var(--radius-full);
}

.user-avatare:active {
  background: var(--color-border);
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-bg);
  border-radius: 50%;
  color: var(--color-white);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
}

.user-avatar + .user-avatar {
  margin-left: -8px;
}

/* Werkzeugzeile unter der Liste: gleich hohe Knoepfe, Breite nach Inhalt
   ("+ Uebung" bekommt den groessten Anteil). Knappe Innenabstaende: mit
   Zyklus-Knopf brauchen alle drei rund 300 px, auf 360-px-Handys bleiben
   so gut 30 px Luft. Erst unter ~340 px rutscht der letzte Knopf in eine
   zweite Zeile, statt abgeschnitten zu werden. */
.workout-werkzeuge {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.werkzeug-btn {
  flex: 1 1 auto;
  gap: 6px;
  padding: var(--space-sm);
  white-space: nowrap;
}

.werkzeug-haupt {
  flex-grow: 2;
}

.werkzeug-btn svg {
  flex-shrink: 0;
}

/* Wert vorhanden (Notiz gespeichert, Zyklustag gesetzt): leicht getoent in
   der Akzentfarbe, wie der aktive Reiter unten. Statische Farben, kein
   color-mix (alte Android-WebViews). */
.werkzeug-btn.hat-wert {
  background: var(--color-accent-soft);
  border-color: rgba(145, 31, 47, 0.3);
  color: var(--color-accent);
}

.note-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-family: inherit;
  resize: vertical;
  margin-bottom: var(--space-md);
}

.note-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Das Rad allein in der Modal-Mitte, schmaler als die Gewicht/Wdh-Reihe */
.cycle-wheel {
  max-width: 160px;
  margin: 0 auto var(--space-md);
}

.workout-header h2 {
  font-size: var(--font-size-xl);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

/* text-light statt text-muted: 4,7:1 statt 2,5:1 Kontrast auf dem Seitengrund */
.workout-date {
  color: var(--color-text-light);
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

.exercise-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
}

.exercise-thumb {
  flex-shrink: 0;
  width: 44px;
  padding-top: 4px;
}

.thumb-foto {
  display: block;
  width: 40px;
  height: 40px;
  object-fit: contain;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
}

.exercise-main {
  flex: 1;
  min-width: 0;
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

/* Schnellwechsel-Knopf: Symbol mit Punktreihe darunter (ein Punkt je
   Ring-Position, aktiver Punkt in Akzentfarbe). Statische Farben, kein
   color-mix (alte Android-WebViews). */
/* Schnellwechsel-Zeile JE NUTZER: Symbol + aktive Uebung, rechts der Stern
   zum Merken des Standards. Volle Breite unterhalb der Wertezeile
   (flex-basis 100% + wrap am .user-value). Statische Farben, kein color-mix. */
.user-ring-row {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-top: 2px;
  min-width: 0;
}

.user-ring-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-white);
  color: var(--color-text-light);
  font-size: 12px;
  flex: 1;
  min-width: 0;
}

.user-ring-btn svg {
  flex-shrink: 0;
}

.user-ring-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-star-btn {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-white);
  color: var(--color-border);
  font-size: 15px;
  line-height: 1;
}

.user-star-btn.active {
  color: var(--user-color);
  border-color: var(--user-color);
}

.exercise-values {
  display: flex;
  gap: var(--space-sm);
}

/* Drei aktive Nutzer: Zeilen untereinander — nebeneinander waere auf
   Handybreite zu schmal. 1 Nutzer fuellt die Zeile (flex: 1), 2 wie bisher. */
.exercise-values.users-3 {
  flex-direction: column;
}

.user-value {
  flex: 1;
  display: flex;
  align-items: center;
  /* wrap: die Schnellwechsel-Zeile (.user-ring-row) rutscht als volle
     Breite unter Name + Werte */
  flex-wrap: wrap;
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
  /* Darf umbrechen: "42.5kg x 10" passt bei 360 px nicht in die halbe Karte.
     Getrennt wird nur vor dem "x" (.value-reps bleibt zusammen). */
  overflow: hidden;
  text-overflow: ellipsis;
}

.value-reps {
  white-space: nowrap;
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
