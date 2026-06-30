import Dexie from 'dexie'

// FitTrack Single uses its OWN IndexedDB database name ('FitnessTrackerSingle'),
// completely separate from the two-user app ('FitnessTracker'). This guarantees
// the single-user variant never shares or mixes data with the original app,
// even when both happen to be opened in the same browser on the same device.
export const db = new Dexie('FitnessTrackerSingle')

db.version(1).stores({
  exercises: 'id, muscleGroup, equipment, name',
  plans: 'id, isActive',
  trainingDays: 'id, planId, [planId+weekVariant+dayOrder]',
  workoutLogs: 'id, date, [planId+date]',
  setLogs: 'id, workoutLogId, [exerciseId+userId], [exerciseId+userId+date], [workoutLogId+exerciseId+setNumber]',
  syncQueue: '++id, collection, timestamp',
  meta: 'key'
})

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
