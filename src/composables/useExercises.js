import { ref } from 'vue'
import { db, generateId } from '../db/dexie.js'
import { toTitleCase } from '../utils/formatters.js'
import { pushRecord, pushDelete } from '../services/syncService.js'

// Module-level singleton state so all callers share the same exercises ref.
// Prevents (a) duplicate window listeners each time a view mounts,
// (b) redundant Dexie reloads, and (c) divergent refs across views.
const exercises = ref([])
const loading = ref(false)

async function loadExercises() {
  loading.value = true
  exercises.value = await db.exercises.orderBy('name').toArray()
  loading.value = false
}

// Register the sync listener exactly once at module load.
if (typeof window !== 'undefined' && !window.__fitnessExercisesListenerRegistered) {
  window.__fitnessExercisesListenerRegistered = true
  window.addEventListener('fitness-sync-changed', (e) => {
    if (e.detail?.collection === 'exercises') loadExercises()
  })
}

async function addExercise(name, muscleGroup, equipment, notes = '') {
  const exercise = {
    id: generateId(),
    name,
    muscleGroup,
    equipment,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  await db.exercises.add(exercise)
  exercises.value.push(exercise)
  exercises.value.sort((a, b) => a.name.localeCompare(b.name))
  pushRecord('exercises', exercise.id, exercise)
  return exercise
}

async function updateExercise(id, updates) {
  const updatedAt = new Date().toISOString()
  await db.exercises.update(id, { ...updates, updatedAt })
  const idx = exercises.value.findIndex(e => e.id === id)
  if (idx !== -1) Object.assign(exercises.value[idx], updates, { updatedAt })
  const full = await db.exercises.get(id)
  if (full) pushRecord('exercises', id, full)
}

async function deleteExercise(id) {
  await db.exercises.delete(id)
  exercises.value = exercises.value.filter(e => e.id !== id)
  pushDelete('exercises', id)
}

function getExerciseById(id) {
  return exercises.value.find(e => e.id === id)
}

function getExerciseDisplayName(id) {
  const ex = exercises.value.find(e => e.id === id)
  return ex ? toTitleCase(ex.name) : 'Unbekannt'
}

function getExerciseNotes(id) {
  return exercises.value.find(e => e.id === id)?.notes || ''
}

function filterExercises(muscleGroup = null, equipment = null, search = '') {
  return exercises.value.filter(e => {
    if (muscleGroup && e.muscleGroup !== muscleGroup) return false
    if (equipment && e.equipment !== equipment) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
}

export function useExercises() {
  return {
    exercises,
    loading,
    loadExercises,
    addExercise,
    updateExercise,
    deleteExercise,
    getExerciseById,
    getExerciseDisplayName,
    getExerciseNotes,
    filterExercises
  }
}
