<template>
  <div class="catalog-view">
    <TopBar title="Katalog">
      <template #right>
        <button class="btn btn-ghost" @click="showAddExercise = true">+ Neu</button>
      </template>
    </TopBar>

    <div class="container page-content">
      <!-- Search -->
      <input
        v-model="search"
        type="text"
        placeholder="Uebung suchen..."
        class="search-input"
      />

      <!-- Filters -->
      <div class="filters">
        <select v-model="filterMuscle" class="filter-select">
          <option value="">Alle Muskelgruppen</option>
          <option v-for="m in muscleGroups" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
        <select v-model="filterEquipment" class="filter-select">
          <option value="">Alle Geraete</option>
          <option v-for="e in equipmentTypes" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
      </div>

      <EmptyState
        v-if="!loading && filteredExercises.length === 0 && exercises.length === 0"
        title="Keine Uebungen"
        description="Fuege deine erste Uebung hinzu."
      >
        <button class="btn btn-primary" style="margin-top: 12px" @click="showAddExercise = true">
          Uebung hinzufuegen
        </button>
      </EmptyState>

      <EmptyState
        v-else-if="filteredExercises.length === 0"
        title="Keine Ergebnisse"
        description="Keine Uebungen gefunden fuer diese Filter."
      />

      <!-- Exercise list -->
      <div v-else class="exercise-list">
        <div
          v-for="ex in filteredExercises"
          :key="ex.id"
          class="card exercise-item"
          @click="editExercise(ex)"
        >
          <div class="exercise-info">
            <h3 class="exercise-name">{{ ex.name }}</h3>
            <div class="exercise-tags">
              <span class="tag">{{ getMuscleLabel(ex.muscleGroup) }}</span>
              <span class="tag">{{ getEquipmentLabel(ex.equipment) }}</span>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </div>

      <div v-if="exercises.length > 0" class="exercise-count">
        {{ filteredExercises.length }} von {{ exercises.length }} Uebungen
      </div>
    </div>

    <!-- Add Exercise Modal -->
    <Modal v-model="showAddExercise" title="Neue Uebung">
      <div class="form-group">
        <label>Name</label>
        <input v-model="newExerciseName" type="text" class="form-input" placeholder="z.B. Bankdruecken" />
      </div>
      <div class="form-group">
        <label>Muskelgruppe</label>
        <select v-model="newExerciseMuscle" class="form-input">
          <option value="">Waehlen...</option>
          <option v-for="m in muscleGroups" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Equipment</label>
        <select v-model="newExerciseEquipment" class="form-input">
          <option value="">Waehlen...</option>
          <option v-for="e in equipmentTypes" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notizen (optional)</label>
        <input v-model="newExerciseNotes" type="text" class="form-input" placeholder="z.B. langsame Ausfuehrung" />
      </div>
      <button
        class="btn btn-primary btn-block"
        @click="saveNewExercise"
        :disabled="!newExerciseName || !newExerciseMuscle || !newExerciseEquipment"
      >
        Hinzufuegen
      </button>
    </Modal>

    <!-- Edit Exercise Modal -->
    <Modal v-model="showEditExercise" title="Uebung bearbeiten">
      <div class="form-group">
        <label>Name</label>
        <input v-model="editName" type="text" class="form-input" />
      </div>
      <div class="form-group">
        <label>Muskelgruppe</label>
        <select v-model="editMuscle" class="form-input">
          <option v-for="m in muscleGroups" :key="m.id" :value="m.id">{{ m.label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Equipment</label>
        <select v-model="editEquipmentVal" class="form-input">
          <option v-for="e in equipmentTypes" :key="e.id" :value="e.id">{{ e.label }}</option>
        </select>
      </div>
      <div class="form-group">
        <label>Notizen</label>
        <input v-model="editNotes" type="text" class="form-input" />
      </div>
      <button class="btn btn-primary btn-block" @click="saveEditExercise" style="margin-bottom: var(--space-sm)">
        Speichern
      </button>
      <button class="btn btn-secondary btn-block danger-text" @click="confirmDeleteExercise">
        Loeschen
      </button>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import EmptyState from '../components/shared/EmptyState.vue'
import Modal from '../components/shared/Modal.vue'
import { useExercises } from '../composables/useExercises.js'
import { MUSCLE_GROUPS, EQUIPMENT_TYPES } from '../utils/constants.js'

const { exercises, loading, loadExercises, addExercise, updateExercise, deleteExercise, filterExercises } = useExercises()

const muscleGroups = MUSCLE_GROUPS
const equipmentTypes = EQUIPMENT_TYPES

const search = ref('')
const filterMuscle = ref('')
const filterEquipment = ref('')

const showAddExercise = ref(false)
const newExerciseName = ref('')
const newExerciseMuscle = ref('')
const newExerciseEquipment = ref('')
const newExerciseNotes = ref('')

const showEditExercise = ref(false)
const editId = ref(null)
const editName = ref('')
const editMuscle = ref('')
const editEquipmentVal = ref('')
const editNotes = ref('')

const filteredExercises = computed(() => {
  return filterExercises(filterMuscle.value || null, filterEquipment.value || null, search.value)
})

function getMuscleLabel(id) {
  return muscleGroups.find(m => m.id === id)?.label || id
}

function getEquipmentLabel(id) {
  return equipmentTypes.find(e => e.id === id)?.label || id
}

async function saveNewExercise() {
  if (!newExerciseName.value || !newExerciseMuscle.value || !newExerciseEquipment.value) return
  await addExercise(newExerciseName.value, newExerciseMuscle.value, newExerciseEquipment.value, newExerciseNotes.value)
  newExerciseName.value = ''
  newExerciseMuscle.value = ''
  newExerciseEquipment.value = ''
  newExerciseNotes.value = ''
  showAddExercise.value = false
}

function editExercise(ex) {
  editId.value = ex.id
  editName.value = ex.name
  editMuscle.value = ex.muscleGroup
  editEquipmentVal.value = ex.equipment
  editNotes.value = ex.notes || ''
  showEditExercise.value = true
}

async function saveEditExercise() {
  if (!editId.value) return
  await updateExercise(editId.value, {
    name: editName.value,
    muscleGroup: editMuscle.value,
    equipment: editEquipmentVal.value,
    notes: editNotes.value
  })
  showEditExercise.value = false
}

async function confirmDeleteExercise() {
  if (confirm('Uebung wirklich loeschen?')) {
    await deleteExercise(editId.value)
    showEditExercise.value = false
  }
}

onMounted(() => loadExercises())
</script>

<style scoped>
.page-content {
  padding-top: var(--space-md);
  padding-bottom: calc(var(--nav-height) + var(--space-xl));
}

.search-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  margin-bottom: var(--space-sm);
  background: var(--color-white);
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.filters {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.filter-select {
  flex: 1;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: var(--color-white);
  color: var(--color-text);
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.exercise-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.exercise-item:active {
  box-shadow: var(--shadow-md);
}

.exercise-name {
  font-size: var(--font-size-md);
  margin-bottom: var(--space-xs);
}

.exercise-tags {
  display: flex;
  gap: var(--space-xs);
}

.tag {
  padding: 2px var(--space-sm);
  background: var(--color-bg);
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.chevron {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.exercise-count {
  text-align: center;
  padding: var(--space-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
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
  background: var(--color-white);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.danger-text {
  color: var(--color-danger);
}
</style>
