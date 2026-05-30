import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { db, generateId } from '../db/dexie.js'
import { getToday } from '../utils/dateHelpers.js'
import { pushRecord } from '../services/syncService.js'

export const useWorkoutStore = defineStore('workout', () => {
  const activeWorkout = ref(null)
  const currentSets = ref([])
  const isWorkoutActive = computed(() => activeWorkout.value !== null)

  async function startWorkout(trainingDay, planId) {
    const today = getToday()
    // Look for an existing log for THIS specific training day today — not just
    // any log on today's date. Otherwise switching training days on the same
    // day would reuse the wrong workoutLog and mislabel history.
    const logs = await db.workoutLogs.where({ date: today }).toArray()
    let existing = logs.find(l => l.trainingDayId === trainingDay.id) || null

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
      pushRecord('workoutLogs', existing.id, existing)
    } else if (existing.completedAt) {
      // Re-opening a finished day — clear completedAt so new sets append to
      // the right session rather than a "finished" one.
      const updatedAt = new Date().toISOString()
      await db.workoutLogs.update(existing.id, { completedAt: null, updatedAt })
      existing = { ...existing, completedAt: null, updatedAt }
      pushRecord('workoutLogs', existing.id, existing)
    }

    activeWorkout.value = existing
    await loadSets()
  }

  // Ad-hoc workout that is NOT tied to a plan/training day. The log lives only
  // in memory — it is never written to db.workoutLogs, so it doesn't appear as
  // a saved workout in the history and can't be resumed after a full reload.
  // Sets logged against it ARE persisted (saveSet writes to db.setLogs + sync),
  // so the weights still feed each exercise's history/stats.
  // `exercises` is kept on the in-memory log so the view can rebuild its list
  // after navigating away and back within the same session.
  function startCustomWorkout(exercises = []) {
    activeWorkout.value = {
      id: generateId(),
      date: getToday(),
      planId: null,
      trainingDayId: null,
      isCustom: true,
      title: 'Individuelles Training',
      exercises: exercises.map(e => ({ ...e })),
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    currentSets.value = []
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

    // Validate numeric inputs — NaN would be serialized as null by Firestore
    // and break max/volume calculations downstream.
    const w = Number(weight)
    const r = Number(reps)
    if (!Number.isFinite(w) || w < 0) return
    if (!Number.isFinite(r) || r < 0) return
    weight = w
    reps = r

    const existing = currentSets.value.find(
      s => s.exerciseId === exerciseId && s.userId === userId && s.setNumber === setNumber
    )

    if (existing) {
      const updatedAt = new Date().toISOString()
      await db.setLogs.update(existing.id, {
        weight: Number(weight),
        reps: Number(reps),
        updatedAt
      })
      existing.weight = Number(weight)
      existing.reps = Number(reps)
      existing.updatedAt = updatedAt
      pushRecord('setLogs', existing.id, { ...existing })
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      await db.setLogs.add(setLog)
      currentSets.value.push(setLog)
      pushRecord('setLogs', setLog.id, setLog)
    }
  }

  async function toggleIncreaseNextTime(exerciseId, userId) {
    const sets = currentSets.value.filter(
      s => s.exerciseId === exerciseId && s.userId === userId
    )

    if (sets.length === 0) {
      // No set saved yet — look at the most recent set from a previous workout
      const prevSets = await db.setLogs
        .where('[exerciseId+userId]')
        .equals([exerciseId, userId])
        .toArray()
      if (prevSets.length === 0) return false
      prevSets.sort((a, b) => b.date.localeCompare(a.date))
      const lastDate = prevSets[0].date
      const lastDateSets = prevSets.filter(s => s.date === lastDate)
      const newValue = !lastDateSets[0].increaseNextTime
      const updatedAt = new Date().toISOString()
      for (const set of lastDateSets) {
        await db.setLogs.update(set.id, { increaseNextTime: newValue, updatedAt })
        set.increaseNextTime = newValue
        set.updatedAt = updatedAt
        pushRecord('setLogs', set.id, { ...set })
      }
      return newValue
    }

    const newValue = !sets[0].increaseNextTime
    const updatedAt = new Date().toISOString()
    for (const set of sets) {
      await db.setLogs.update(set.id, { increaseNextTime: newValue, updatedAt })
      set.increaseNextTime = newValue
      set.updatedAt = updatedAt
      pushRecord('setLogs', set.id, { ...set })
    }
    return newValue
  }

  async function finishWorkout() {
    if (!activeWorkout.value) return
    // Custom workouts are memory-only — there's no db.workoutLogs row to
    // complete, so just clear the in-memory state. The sets already persisted.
    if (!activeWorkout.value.isCustom) {
      const updatedAt = new Date().toISOString()
      const completedAt = new Date().toISOString()
      await db.workoutLogs.update(activeWorkout.value.id, { completedAt, updatedAt })
      const full = await db.workoutLogs.get(activeWorkout.value.id)
      if (full) pushRecord('workoutLogs', full.id, full)
    }
    activeWorkout.value = null
    currentSets.value = []
  }

  async function resumeTodaysWorkout() {
    const today = getToday()
    const logs = await db.workoutLogs.where({ date: today }).toArray()
    const unfinished = logs.find(l => !l.completedAt)
    if (unfinished) {
      activeWorkout.value = unfinished
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
    startCustomWorkout,
    loadSets,
    saveSet,
    toggleIncreaseNextTime,
    finishWorkout,
    resumeTodaysWorkout,
    getSetsForExercise
  }
})
