import { ref } from 'vue'
import { db } from '../db/dexie.js'

export function useHistory() {
  const workoutHistory = ref([])
  const loading = ref(false)

  async function loadHistory(userId = null, limit = 50) {
    loading.value = true
    const logs = await db.workoutLogs.orderBy('date').reverse().limit(limit).toArray()

    const enriched = []
    for (const log of logs) {
      let sets = await db.setLogs.where('workoutLogId').equals(log.id).toArray()
      if (userId) {
        sets = sets.filter(s => s.userId === userId)
      }
      if (sets.length === 0 && userId) continue

      const day = await db.trainingDays.get(log.trainingDayId)
      enriched.push({
        ...log,
        trainingDayTitle: day?.title || 'Unbekannt',
        sets
      })
    }

    workoutHistory.value = enriched
    loading.value = false
  }

  async function getMaxWeight(exerciseId, userId) {
    const sets = await db.setLogs
      .where('[exerciseId+userId]')
      .equals([exerciseId, userId])
      .toArray()

    if (sets.length === 0) return null

    let max = null
    for (const set of sets) {
      if (!max || set.weight > max.weight) {
        max = set
      }
    }
    return max
  }

  async function getLastSets(exerciseId, userId) {
    const sets = await db.setLogs
      .where('[exerciseId+userId]')
      .equals([exerciseId, userId])
      .toArray()

    if (sets.length === 0) return []

    sets.sort((a, b) => b.date.localeCompare(a.date) || a.setNumber - b.setNumber)

    const lastDate = sets[0].date
    return sets.filter(s => s.date === lastDate)
  }

  async function shouldIncreaseWeight(exerciseId, userId) {
    const lastSets = await getLastSets(exerciseId, userId)
    return lastSets.some(s => s.increaseNextTime)
  }

  async function getExerciseHistory(exerciseId, userId, limit = 20) {
    const sets = await db.setLogs
      .where('[exerciseId+userId]')
      .equals([exerciseId, userId])
      .toArray()

    sets.sort((a, b) => b.date.localeCompare(a.date) || a.setNumber - b.setNumber)

    const byDate = {}
    for (const set of sets) {
      if (!byDate[set.date]) byDate[set.date] = []
      byDate[set.date].push(set)
    }

    return Object.entries(byDate)
      .slice(0, limit)
      .map(([date, dateSets]) => ({
        date,
        sets: dateSets,
        maxWeight: Math.max(...dateSets.map(s => s.weight)),
        totalVolume: dateSets.reduce((sum, s) => sum + s.weight * s.reps, 0)
      }))
  }

  /**
   * Build spreadsheet data: exercises grouped by muscle, dates as columns (old→new left→right)
   * Returns { muscleGroups: [{ id, label, exercises: [{ id, name, max, dates: { [date]: { weight, reps } } }] }], dates: [string] }
   */
  async function buildSpreadsheetData(userId) {
    if (!userId) return { muscleGroups: [], dates: [] }

    // Get all exercises
    const allExercises = await db.exercises.orderBy('name').toArray()

    // Get all set logs for this user
    const allSets = await db.setLogs.toArray()
    const userSets = allSets.filter(s => s.userId === userId)

    // Collect all unique dates
    const dateSet = new Set()
    userSets.forEach(s => { if (s.date) dateSet.add(s.date) })
    const dates = [...dateSet].sort() // ascending = old left, new right

    // Build exercise data map: exerciseId -> { [date]: { weight, reps } }
    const exerciseData = {}
    for (const set of userSets) {
      if (!exerciseData[set.exerciseId]) exerciseData[set.exerciseId] = {}
      const existing = exerciseData[set.exerciseId][set.date]
      // Keep the heaviest weight for that date
      if (!existing || set.weight > existing.weight) {
        exerciseData[set.exerciseId][set.date] = { weight: set.weight, reps: set.reps }
      }
    }

    // Group exercises by muscle group, only include those with data
    const muscleOrder = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full_body']
    const muscleLabels = {
      legs: 'Beine', chest: 'Brust', back: 'Ruecken', shoulders: 'Schultern',
      arms: 'Arme', core: 'Core', full_body: 'Ganzkoerper'
    }

    const groups = []
    for (const muscleId of muscleOrder) {
      const groupExercises = allExercises
        .filter(e => e.muscleGroup === muscleId)
        .map(e => {
          const data = exerciseData[e.id] || {}
          const weights = Object.values(data).map(d => d.weight)
          return {
            id: e.id,
            name: e.name,
            max: weights.length > 0 ? Math.max(...weights) : 0,
            dates: data
          }
        })

      if (groupExercises.length > 0) {
        groups.push({
          id: muscleId,
          label: muscleLabels[muscleId] || muscleId,
          exercises: groupExercises
        })
      }
    }

    return { muscleGroups: groups, dates }
  }

  return { workoutHistory, loading, loadHistory, getMaxWeight, getLastSets, shouldIncreaseWeight, getExerciseHistory, buildSpreadsheetData }
}
