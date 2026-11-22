import { db } from '../db/dexie.js'
import { ausgelasseneEintraege } from '../utils/saetze.js'
import { letzteEinheit } from '../utils/deload.js'
import { useDeloadStore } from '../stores/deload.js'

/**
 * Deload-Wochen einer Person fuer die Regel "letzte Einheit". Sind sie nicht
 * lesbar, gilt die Einheit ohne Deload-Wissen (der Store hat es geloggt).
 */
export async function deloadWochenVon(userId) {
  const store = useDeloadStore()
  try {
    await store.bereit()
  } catch {
    return []
  }
  return store.wochenVon(userId)
}

export function useHistory() {
  async function getLatestWeight(exerciseId, userId) {
    const sets = await db.setLogs
      .where('[exerciseId+userId]')
      .equals([exerciseId, userId])
      .toArray()

    if (sets.length === 0) return null

    // Most recently LOGGED value — deliberately NOT the all-time heaviest.
    // Newest date first; within the same date the set that was entered last
    // wins (highest setNumber, then latest createdAt). This reflects "what we
    // lifted last time" rather than a personal record from weeks ago.
    sets.sort((a, b) =>
      b.date.localeCompare(a.date) ||
      (b.setNumber - a.setNumber) ||
      String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
    )
    return sets[0]
  }

  // Alle Saetze der letzten Einheit (juengstes Datum), nach Satznummer.
  // ohneWorkoutLogId laesst das laufende Workout aus — sonst waere nach dem
  // ersten Satz von heute "die letzte Einheit" schon heute. Nach einer
  // Deload-Woche zaehlt die Woche davor (v2.18.0, Regel letzteEinheit in
  // utils/deload.js — dieselbe, nach der der Steigern-Merker geschrieben wird).
  async function getLastSets(exerciseId, userId, ohneWorkoutLogId = null) {
    const sets = await db.setLogs
      .where('[exerciseId+userId]')
      .equals([exerciseId, userId])
      .toArray()
    return letzteEinheit(sets, { ohneWorkoutLogId, deloadWochen: await deloadWochenVon(userId) })
  }

  async function shouldIncreaseWeight(exerciseId, userId) {
    const lastSets = await getLastSets(exerciseId, userId)
    return lastSets.some(s => s.increaseNextTime)
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
    const satzNummern = {} // exerciseId|date -> Set der gespeicherten Satznummern
    for (const set of userSets) {
      if (!exerciseData[set.exerciseId]) exerciseData[set.exerciseId] = {}
      const existing = exerciseData[set.exerciseId][set.date]
      // Keep the heaviest weight for that date
      if (!existing || set.weight > existing.weight) {
        exerciseData[set.exerciseId][set.date] = { weight: set.weight, reps: set.reps }
      }
      const k = `${set.exerciseId}|${set.date}`
      if (!satzNummern[k]) satzNummern[k] = new Set()
      satzNummern[k].add(set.setNumber)
    }

    // Ausgelassene Saetze (v2.15.0): die Zelle zeigt dann "2/3" — gemacht
    // von vorgesehen. Nur fuer Zellen mit Wert; eine ganz ausgelassene Uebung
    // steht im Tages-Detail.
    const logs = await db.workoutLogs.toArray()
    for (const e of ausgelasseneEintraege(logs, userSets)) {
      if (e.userId !== userId) continue
      const zelle = exerciseData[e.exerciseId]?.[e.date]
      if (!zelle) continue
      const gemacht = satzNummern[`${e.exerciseId}|${e.date}`]?.size || 0
      zelle.ausgelassen = (zelle.ausgelassen || 0) + e.saetze.length
      zelle.saetze = gemacht
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
        // Nur Uebungen, die dieser User tatsaechlich geloggt hat — sonst
        // waechst die Tabelle mit jedem Katalog-Eintrag um eine leere Zeile.
        .filter(e => e.muscleGroup === muscleId && exerciseData[e.id])
        .map(e => {
          const data = exerciseData[e.id]
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

  return { getLatestWeight, getLastSets, shouldIncreaseWeight, buildSpreadsheetData }
}
