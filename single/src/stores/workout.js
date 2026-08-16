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

  // Ad-hoc workout that is NOT tied to a plan/training day. Persisted in
  // db.workoutLogs like plan workouts (since v1.2.0), so it survives reloads
  // and Android killing the PWA; `exercises` carries the picked list.
  async function startCustomWorkout(exercises = []) {
    const log = {
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
    await db.workoutLogs.add(log)
    pushRecord('workoutLogs', log.id, log)
    activeWorkout.value = log
    currentSets.value = []
  }

  // Merkt Abweichungen von der Plan-Liste (Tausch, Quick-Add) am aktiven
  // Workout-Log, damit sie Tab-Wechsel und App-Neustart ueberleben.
  async function persistWorkoutExercises(list) {
    if (!activeWorkout.value) return
    const exercises = list.map(e => ({ ...e }))
    const updatedAt = new Date().toISOString()
    activeWorkout.value.exercises = exercises
    activeWorkout.value.updatedAt = updatedAt
    await db.workoutLogs.update(activeWorkout.value.id, { exercises, updatedAt })
    const full = await db.workoutLogs.get(activeWorkout.value.id)
    if (full) pushRecord('workoutLogs', full.id, full)
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

    markExerciseUsed(exerciseId)
  }

  // Nutzung fuer die "zuletzt benutzt"-Sortierung merken (Tausch-/Add-Listen).
  // Bewusst fire-and-forget: ein Fehler hier darf das Satz-Speichern nicht stoeren.
  function markExerciseUsed(exerciseId) {
    const lastUsedAt = new Date().toISOString()
    db.exercises.update(exerciseId, { lastUsedAt, updatedAt: lastUsedAt })
      .then(async (count) => {
        if (!count) return
        const full = await db.exercises.get(exerciseId)
        if (full) pushRecord('exercises', exerciseId, full)
      })
      .catch(() => {})
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
    const updatedAt = new Date().toISOString()
    const completedAt = new Date().toISOString()
    await db.workoutLogs.update(activeWorkout.value.id, { completedAt, updatedAt })
    const full = await db.workoutLogs.get(activeWorkout.value.id)
    if (full) pushRecord('workoutLogs', full.id, full)
    activeWorkout.value = null
    currentSets.value = []
  }

  async function resumeTodaysWorkout() {
    const today = getToday()
    const logs = await db.workoutLogs.where({ date: today }).toArray()
    // Bei mehreren unfertigen Logs (z.B. Individuell begonnen, dann Plan-Tag
    // gestartet) gewinnt das zuletzt gestartete.
    const unfinished = logs
      .filter(l => !l.completedAt)
      .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')))[0]
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
    persistWorkoutExercises,
    loadSets,
    saveSet,
    toggleIncreaseNextTime,
    finishWorkout,
    resumeTodaysWorkout,
    getSetsForExercise
  }
})
