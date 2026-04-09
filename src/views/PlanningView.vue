<template>
  <div class="planning-view">
    <TopBar title="Planung">
      <template #right>
        <button class="btn btn-ghost" @click="showCreatePlan = true">+ Plan</button>
      </template>
    </TopBar>

    <div class="container page-content">
      <EmptyState
        v-if="plansStore.plans.length === 0"
        title="Keine Trainingsplaene"
        description="Erstelle deinen ersten Trainingsplan."
      >
        <button class="btn btn-primary" style="margin-top: 12px" @click="showCreatePlan = true">
          Plan erstellen
        </button>
      </EmptyState>

      <!-- Plan list -->
      <div v-else>
        <div v-for="plan in plansStore.plans" :key="plan.id" class="plan-section">
          <div class="card plan-header-card">
            <div class="plan-header">
              <div>
                <h2 class="plan-name">{{ plan.name }}</h2>
                <span class="plan-type">{{ plan.type === 'weekly' ? 'Woechentlich' : 'Alternierend (A/B)' }}</span>
              </div>
              <div class="plan-actions">
                <button
                  v-if="!plan.isActive"
                  class="btn btn-secondary btn-sm"
                  @click="plansStore.setActivePlan(plan.id)"
                >
                  Aktivieren
                </button>
                <span v-else class="active-badge">Aktiv</span>
                <button class="btn-icon" @click="editPlan(plan)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>

            <!-- Deload config -->
            <div class="deload-config">
              <label class="toggle-row">
                <span>Deload-Wochen</span>
                <input
                  type="checkbox"
                  :checked="plan.deloadEnabled"
                  @change="toggleDeload(plan)"
                />
              </label>
              <div v-if="plan.deloadEnabled" class="deload-details">
                <label>
                  Alle
                  <input
                    type="number"
                    :value="plan.deloadIntervalWeeks"
                    @change="updateDeloadInterval(plan, $event)"
                    class="inline-input"
                    min="2"
                    max="12"
                  />
                  Wochen
                </label>
              </div>
            </div>
          </div>

          <!-- Week variant tabs for alternating -->
          <div v-if="plan.type === 'alternating'" class="week-tabs">
            <button
              v-for="variant in ['A', 'B']"
              :key="variant"
              class="week-tab"
              :class="{ active: (selectedWeekVariant[plan.id] || 'A') === variant }"
              @click="selectedWeekVariant[plan.id] = variant"
            >
              Woche {{ variant }}
            </button>
          </div>

          <!-- Training days -->
          <div class="days-list">
            <div
              v-for="day in getDays(plan)"
              :key="day.id"
              class="card day-editor-card"
            >
              <div class="day-header">
                <input
                  :value="day.title"
                  @change="updateDayTitle(day, $event)"
                  class="day-title-input"
                  placeholder="Trainingstag Name..."
                />
                <button class="btn-icon danger" @click="deleteDay(day.id)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>

              <!-- Exercises in this day -->
              <div v-for="(ex, idx) in day.exercises" :key="idx" class="day-exercise">
                <span class="day-exercise-name">{{ getExerciseName(ex.exerciseId) }}</span>
                <div class="day-exercise-controls">
                  <input
                    type="number"
                    :value="ex.sets"
                    @change="updateExerciseSets(day, idx, $event)"
                    class="sets-input"
                    min="1"
                    max="10"
                  />
                  <span class="sets-label">Sets</span>
                  <button class="btn-icon small" @click="removeExerciseFromDay(day, idx)">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>

              <button class="btn btn-ghost btn-sm" @click="openExercisePicker(day)">
                + Uebung hinzufuegen
              </button>
            </div>

            <button
              class="btn btn-secondary btn-block"
              @click="addDay(plan)"
            >
              + Trainingstag hinzufuegen
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Plan Modal -->
    <Modal v-model="showCreatePlan" title="Neuer Trainingsplan">
      <div class="form-group">
        <label>Name</label>
        <input v-model="newPlanName" type="text" class="form-input" placeholder="z.B. Hypertrophie Block 1" />
      </div>
      <div class="form-group">
        <label>Typ</label>
        <div class="type-options">
          <button
            v-for="t in planTypes"
            :key="t.id"
            class="type-option"
            :class="{ active: newPlanType === t.id }"
            @click="newPlanType = t.id"
          >
            <strong>{{ t.label }}</strong>
            <span>{{ t.description }}</span>
          </button>
        </div>
      </div>
      <button class="btn btn-primary btn-block" @click="createPlan" :disabled="!newPlanName">
        Plan erstellen
      </button>
    </Modal>

    <!-- Edit Plan Modal -->
    <Modal v-model="showEditPlan" title="Plan bearbeiten">
      <div class="form-group">
        <label>Name</label>
        <input v-model="editPlanName" type="text" class="form-input" />
      </div>
      <button class="btn btn-primary btn-block" @click="savePlanEdit" style="margin-bottom: var(--space-sm)">
        Speichern
      </button>
      <button class="btn btn-secondary btn-block danger-text" @click="confirmDeletePlan">
        Plan loeschen
      </button>
    </Modal>

    <!-- Exercise Picker Modal -->
    <Modal v-model="showExercisePicker" title="Uebung waehlen" fullHeight>
      <input
        v-model="pickerSearch"
        type="text"
        placeholder="Uebung suchen..."
        class="search-input"
      />
      <div class="swap-list">
        <button
          v-for="ex in filteredPickerExercises"
          :key="ex.id"
          class="swap-item"
          @click="addExerciseToDay(ex)"
        >
          <span class="swap-name">{{ ex.name }}</span>
          <span class="swap-meta">{{ getMuscleLabel(ex.muscleGroup) }}</span>
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import EmptyState from '../components/shared/EmptyState.vue'
import Modal from '../components/shared/Modal.vue'
import { usePlansStore } from '../stores/plans.js'
import { useExercises } from '../composables/useExercises.js'
import { PLAN_TYPES, MUSCLE_GROUPS } from '../utils/constants.js'

const plansStore = usePlansStore()
const { exercises, loadExercises, getExerciseById } = useExercises()

const showCreatePlan = ref(false)
const showEditPlan = ref(false)
const showExercisePicker = ref(false)
const newPlanName = ref('')
const newPlanType = ref('weekly')
const editPlanName = ref('')
const editPlanId = ref(null)
const pickerSearch = ref('')
const pickerDay = ref(null)
const selectedWeekVariant = reactive({})
const planTypes = PLAN_TYPES

const filteredPickerExercises = computed(() => {
  if (!pickerSearch.value) return exercises.value
  return exercises.value.filter(e => e.name.toLowerCase().includes(pickerSearch.value.toLowerCase()))
})

function getExerciseName(id) {
  return getExerciseById(id)?.name || 'Unbekannt'
}

function getMuscleLabel(id) {
  return MUSCLE_GROUPS.find(m => m.id === id)?.label || id
}

function getDays(plan) {
  const variant = plan.type === 'alternating' ? (selectedWeekVariant[plan.id] || 'A') : null
  return plansStore.getDaysForPlan(plan.id, variant)
}

async function createPlan() {
  if (!newPlanName.value) return
  await plansStore.createPlan(newPlanName.value, newPlanType.value)
  newPlanName.value = ''
  newPlanType.value = 'weekly'
  showCreatePlan.value = false
}

function editPlan(plan) {
  editPlanId.value = plan.id
  editPlanName.value = plan.name
  showEditPlan.value = true
}

async function savePlanEdit() {
  if (editPlanId.value && editPlanName.value) {
    await plansStore.updatePlan(editPlanId.value, { name: editPlanName.value })
  }
  showEditPlan.value = false
}

async function confirmDeletePlan() {
  if (confirm('Plan wirklich loeschen? Alle Trainingstage werden ebenfalls geloescht.')) {
    await plansStore.deletePlan(editPlanId.value)
    showEditPlan.value = false
  }
}

async function toggleDeload(plan) {
  await plansStore.updatePlan(plan.id, {
    deloadEnabled: !plan.deloadEnabled,
    deloadStartDate: !plan.deloadEnabled ? new Date().toISOString().split('T')[0] : plan.deloadStartDate
  })
}

async function updateDeloadInterval(plan, event) {
  await plansStore.updatePlan(plan.id, { deloadIntervalWeeks: Number(event.target.value) })
}

async function addDay(plan) {
  const variant = plan.type === 'alternating' ? (selectedWeekVariant[plan.id] || 'A') : null
  const count = getDays(plan).length + 1
  await plansStore.addTrainingDay(plan.id, `Tag ${count}`, variant)
}

async function updateDayTitle(day, event) {
  await plansStore.updateTrainingDay(day.id, { title: event.target.value })
}

async function deleteDay(dayId) {
  if (confirm('Trainingstag loeschen?')) {
    await plansStore.deleteTrainingDay(dayId)
  }
}

function openExercisePicker(day) {
  pickerDay.value = day
  pickerSearch.value = ''
  showExercisePicker.value = true
}

async function addExerciseToDay(exercise) {
  if (!pickerDay.value) return
  const updatedExercises = [
    ...pickerDay.value.exercises,
    { exerciseId: exercise.id, sets: 3, notes: '' }
  ]
  await plansStore.updateTrainingDay(pickerDay.value.id, { exercises: updatedExercises })
  showExercisePicker.value = false
}

async function removeExerciseFromDay(day, index) {
  const updatedExercises = day.exercises.filter((_, i) => i !== index)
  await plansStore.updateTrainingDay(day.id, { exercises: updatedExercises })
}

async function updateExerciseSets(day, index, event) {
  const updatedExercises = [...day.exercises]
  updatedExercises[index] = { ...updatedExercises[index], sets: Number(event.target.value) }
  await plansStore.updateTrainingDay(day.id, { exercises: updatedExercises })
}

onMounted(async () => {
  await loadExercises()
  await plansStore.loadPlans()
})
</script>

<style scoped>
.page-content {
  padding-top: var(--space-md);
  padding-bottom: calc(var(--nav-height) + var(--space-xl));
}

.plan-section {
  margin-bottom: var(--space-xl);
}

.plan-header-card {
  margin-bottom: var(--space-md);
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.plan-name {
  font-size: var(--font-size-xl);
  margin-bottom: 2px;
}

.plan-type {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.plan-actions {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.btn-sm {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--font-size-xs);
  min-height: 32px;
}

.active-badge {
  padding: var(--space-xs) var(--space-sm);
  background: var(--color-accent);
  color: var(--color-white);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.deload-config {
  margin-top: var(--space-md);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
}

.deload-details {
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.inline-input {
  width: 50px;
  padding: var(--space-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: var(--font-size-sm);
  margin: 0 var(--space-xs);
}

.week-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.week-tab {
  flex: 1;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-weight: var(--font-weight-medium);
  background: var(--color-white);
  color: var(--color-text-light);
}

.week-tab.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-white);
}

.days-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.day-editor-card {
  padding: var(--space-md);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-sm);
}

.day-title-input {
  flex: 1;
  border: none;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  background: transparent;
  padding: var(--space-xs) 0;
}

.day-title-input:focus {
  outline: none;
  border-bottom: 2px solid var(--color-accent);
}

.day-exercise {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.day-exercise-name {
  font-size: var(--font-size-sm);
}

.day-exercise-controls {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.sets-input {
  width: 40px;
  padding: var(--space-xs);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  text-align: center;
  font-size: var(--font-size-sm);
}

.sets-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.btn-icon.small {
  width: 28px;
  height: 28px;
}

.btn-icon.danger {
  color: var(--color-danger);
}

.danger-text {
  color: var(--color-danger);
}

.form-group {
  margin-bottom: var(--space-md);
}

.form-group label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-xs);
}

.form-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.type-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.type-option {
  padding: var(--space-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  transition: border-color 0.15s;
}

.type-option.active {
  border-color: var(--color-accent);
}

.type-option span {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
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
</style>
