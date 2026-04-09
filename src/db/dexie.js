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

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
