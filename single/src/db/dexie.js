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

// v2 (additiv, verlustfrei): Ohne Cloud-Sync entstehen hier zwar keine
// Tombstones (pushDelete ist ein No-op), aber die geteilte exportData.js
// liest/schreibt die Tabelle — z.B. beim Import eines Backups der Haupt-App.
db.version(2).stores({
  deletions: 'id, collection, deletedAt'
})

// v3 (additiv, verlustfrei): Laufplaner. Phasen und Wochenziele liegen IM
// Plan-Datensatz, die einzelnen Laeufe als eigene Datensaetze — dieselbe
// Struktur wie in der Haupt-App, damit eine Laufplan-Datei in beiden Apps
// funktioniert. Ohne Cloud-Sync ist hier nur der lokale Teil aktiv.
db.version(3).stores({
  runPlans: 'id, userId, isActive',
  runSessions: 'id, planId, userId, date, [userId+date], externalId'
})

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}
