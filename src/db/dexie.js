import Dexie from 'dexie'

export const db = new Dexie('FitnessTracker')

db.version(1).stores({
  exercises: 'id, muscleGroup, equipment, name',
  plans: 'id, isActive',
  trainingDays: 'id, planId, [planId+weekVariant+dayOrder]',
  workoutLogs: 'id, date, [planId+date]',
  setLogs: 'id, workoutLogId, [exerciseId+userId], [exerciseId+userId+date], [workoutLogId+exerciseId+setNumber]',
  syncQueue: '++id, collection, timestamp',
  meta: 'key'
})

// v2 (additiv, verlustfrei): Tombstones fuer geloeschte Datensaetze, damit ein
// Geraet, das waehrend einer Loeschung offline war, den Datensatz nicht wieder
// in die Cloud hochlaedt ("Wiederauferstehung"). id = `${collection}:${recordId}`.
db.version(2).stores({
  deletions: 'id, collection, deletedAt'
})

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
