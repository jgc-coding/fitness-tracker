import { ref } from 'vue'
import { db, generateId } from '../db/dexie.js'

export function useExercises() {
  const exercises = ref([])
  const loading = ref(false)

  async function loadExercises() {
    loading.value = true
    exercises.value = await db.exercises.orderBy('name').toArray()
    loading.value = false
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
    return exercise
  }

  async function updateExercise(id, updates) {
    await db.exercises.update(id, { ...updates, updatedAt: new Date().toISOString() })
    const idx = exercises.value.findIndex(e => e.id === id)
    if (idx !== -1) Object.assign(exercises.value[idx], updates)
  }

  async function deleteExercise(id) {
    await db.exercises.delete(id)
    exercises.value = exercises.value.filter(e => e.id !== id)
  }

  function getExerciseById(id) {
    return exercises.value.find(e => e.id === id)
  }

  function filterExercises(muscleGroup = null, equipment = null, search = '') {
    return exercises.value.filter(e => {
      if (muscleGroup && e.muscleGroup !== muscleGroup) return false
      if (equipment && e.equipment !== equipment) return false
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }

  return { exercises, loading, loadExercises, addExercise, updateExercise, deleteExercise, getExerciseById, filterExercises }
}
