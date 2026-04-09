import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, generateId } from '../db/dexie.js'
import { getToday } from '../utils/dateHelpers.js'

export const useWorkoutStore = defineStore('workout', () => {
  const activeWorkout = ref(null)
  const currentSets = ref([])
  const isWorkoutActive = computed(() => activeWorkout.value !== null)

  async function startWorkout(trainingDay, planId) {
    const today = getToday()
    let existing = await db.workoutLogs.where({ date: today }).first()

    if (!existing) {
      existing = {
        id: generateId(),
        date: today,
        planId,
        trainingDayId: trainingDay.id,
        startedAt: new Date().toISOString(),
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await db.workoutLogs.add(existing)
    }

    activeWorkout.value = existing
    await loadSets()
  }

  async function loadSets() {
    if (!activeWorkout.value) return
    currentSets.value = await db.setLogs
      .where('workoutLogId')
      .equals(activeWorkout.value.id)
      .toArray()
  }

  async function saveSet(exerciseId, userId, setNumber, weight, reps) {
    if (!activeWorkout.value) return

    const existing = currentSets.value.find(
      s => s.exerciseId === exerciseId && s.userId === userId && s.setNumber === setNumber
    )

    if (existing) {
      await db.setLogs.update(existing.id, {
        weight: Number(weight),
        reps: Number(reps),
        updatedAt: new Date().toISOString()
      })
      existing.weight = Number(weight)
      existing.reps = Number(reps)
    } else {
      const setLog = {
        id: generateId(),
        workoutLogId: activeWorkout.value.id,
        exerciseId,
        userId,
        setNumber,
        weight: Number(weight),
        reps: Number(reps),
        isWarmup: false,
        date: activeWorkout.value.date,
        increaseNextTime: false,
        createdAt: new Date().toISOString()
      }
      await db.setLogs.add(setLog)
      currentSets.value.push(setLog)
    }
  }

  async function toggleIncreaseNextTime(exerciseId, userId) {
    const sets = currentSets.value.filter(
      s => s.exerciseId === exerciseId && s.userId === userId
    )
    if (sets.length === 0) return

    const newValue = !sets[0].increaseNextTime
    for (const set of sets) {
      await db.setLogs.update(set.id, { increaseNextTime: newValue })
      set.increaseNextTime = newValue
    }
    return newValue
  }

  async function finishWorkout() {
    if (!activeWorkout.value) return
    await db.workoutLogs.update(activeWorkout.value.id, {
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    activeWorkout.value = null
    currentSets.value = []
  }

  async function resumeTodaysWorkout() {
    const today = getToday()
    const existing = await db.workoutLogs.where({ date: today }).first()
    if (existing && !existing.completedAt) {
      activeWorkout.value = existing
      await loadSets()
      return true
    }
    return false
  }

  function getSetsForExercise(exerciseId, userId) {
    return currentSets.value.filter(
      s => s.exerciseId === exerciseId && s.userId === userId
    )
  }

  return {
    activeWorkout,
    currentSets,
    isWorkoutActive,
    startWorkout,
    loadSets,
    saveSet,
    toggleIncreaseNextTime,
    finishWorkout,
    resumeTodaysWorkout,
    getSetsForExercise
  }
})
