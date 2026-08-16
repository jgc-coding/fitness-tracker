import { db } from '../db/dexie.js'

export async function exportToCSV(userId = null) {
  if (!userId) return

  // Build spreadsheet-style data (same structure as History view)
  const allExercises = await db.exercises.orderBy('name').toArray()
  const allSets = (await db.setLogs.toArray()).filter(s => s.userId === userId)

  // Collect dates
  const dateSet = new Set()
  allSets.forEach(s => { if (s.date) dateSet.add(s.date) })
  const dates = [...dateSet].sort()

  // Build exercise data: exerciseId -> { [date]: { weight, reps } }
  const exerciseData = {}
  for (const set of allSets) {
    if (!exerciseData[set.exerciseId]) exerciseData[set.exerciseId] = {}
    const existing = exerciseData[set.exerciseId][set.date]
    if (!existing || set.weight > existing.weight) {
      exerciseData[set.exerciseId][set.date] = { weight: set.weight, reps: set.reps }
    }
  }

  // Format dates as DD.MM
  const formatDate = (d) => {
    const dt = new Date(d)
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}`
  }

  // Build CSV rows grouped by muscle group
  const muscleOrder = ['legs', 'chest', 'back', 'shoulders', 'arms', 'core', 'full_body']
  const muscleLabels = {
    legs: 'Beine', chest: 'Brust', back: 'Ruecken', shoulders: 'Schultern',
    arms: 'Arme', core: 'Core', full_body: 'Ganzkoerper'
  }

  // Header row: Uebung | Max | Date1 kg | Date1 Reps | Date2 kg | Date2 Reps | ...
  const headerCells = ['Uebung', 'Max']
  for (const date of dates) {
    const label = formatDate(date)
    headerCells.push(`${label} kg`, `${label} Reps`)
  }
  const rows = [headerCells.join(';')]

  for (const muscleId of muscleOrder) {
    const groupExercises = allExercises.filter(e => e.muscleGroup === muscleId)
    const withData = groupExercises.filter(e => exerciseData[e.id])
    if (withData.length === 0) continue

    // Muscle group separator
    rows.push('')
    rows.push(`--- ${muscleLabels[muscleId] || muscleId} ---`)

    for (const ex of withData) {
      const data = exerciseData[ex.id]
      const weights = Object.values(data).map(d => d.weight)
      const max = weights.length > 0 ? Math.max(...weights) : ''
      const cells = [ex.name, max]
      for (const date of dates) {
        const d = data[date]
        cells.push(d ? d.weight : '', d ? d.reps : '')
      }
      rows.push(cells.join(';'))
    }
  }

  // UTF-8-BOM (U+FEFF) vorne dran, sonst zeigt Excel Umlaute in
  // Uebungsnamen als Muellzeichen an.
  const csv = String.fromCharCode(0xfeff) + rows.join('\n')
  downloadFile(csv, `fitness-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8')
}

export async function exportToJSON(userId = null) {
  const data = {
    exportVersion: 2,
    appVersion: __APP_VERSION__,
    exportedAt: new Date().toISOString(),
    exercises: await db.exercises.toArray(),
    plans: await db.plans.toArray(),
    trainingDays: await db.trainingDays.toArray(),
    workoutLogs: await db.workoutLogs.toArray(),
    setLogs: userId
      ? (await db.setLogs.toArray()).filter(s => s.userId === userId)
      : await db.setLogs.toArray(),
    meta: await db.meta.toArray(),
    deletions: await db.deletions.toArray()
  }

  const json = JSON.stringify(data, null, 2)
  downloadFile(json, `fitness-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
}

// Tables a backup may contain, with their primary key field.
const IMPORT_TABLES = [
  { name: 'exercises', keyField: 'id' },
  { name: 'plans', keyField: 'id' },
  { name: 'trainingDays', keyField: 'id' },
  { name: 'workoutLogs', keyField: 'id' },
  { name: 'setLogs', keyField: 'id' },
  { name: 'meta', keyField: 'key' },
  { name: 'deletions', keyField: 'id' }
]

/**
 * Restore from a JSON backup. MERGE-only: a record is written when it doesn't
 * exist yet or the backup copy is newer (updatedAt). Nothing is deleted except
 * records the backup itself marks as deleted (tombstones) that weren't changed
 * afterwards. Works with old v1 exports (missing tables are skipped).
 * Returns { imported, skipped } for the UI message.
 */
export async function importFromJSON(jsonText) {
  let data
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Die Datei ist kein gueltiges JSON.')
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.exercises)) {
    throw new Error('Das ist kein Fitness-Tracker-Backup (Struktur unbekannt).')
  }

  let imported = 0
  let skipped = 0

  for (const { name, keyField } of IMPORT_TABLES) {
    const rows = data[name]
    const table = db[name]
    if (!Array.isArray(rows) || !table) continue

    for (const row of rows) {
      const key = row?.[keyField]
      if (key === undefined || key === null || key === '') {
        skipped++
        continue
      }
      try {
        const existing = await table.get(key)
        const incoming = row.updatedAt || row.createdAt || row.deletedAt || ''
        const current = existing
          ? existing.updatedAt || existing.createdAt || existing.deletedAt || ''
          : null
        if (!existing || incoming > current) {
          await table.put(row)
          imported++
        } else {
          skipped++
        }
      } catch (e) {
        console.error(`Import failed for ${name}/${key}:`, e)
        skipped++
      }
    }
  }

  // Apply imported tombstones locally: remove records the backup knows as
  // deleted, unless they were modified again after the deletion.
  if (Array.isArray(data.deletions)) {
    for (const t of data.deletions) {
      if (!t?.collection || !t?.recordId) continue
      const table = db[t.collection]
      if (!table || t.collection === 'deletions') continue
      try {
        const rec = await table.get(t.recordId)
        if (!rec) continue
        const recTime = rec.updatedAt || rec.createdAt || ''
        if (!recTime || recTime <= (t.deletedAt || '')) {
          await table.delete(t.recordId)
        }
      } catch (e) {
        console.error('Tombstone apply on import failed:', e)
      }
    }
  }

  // Let open views reload their reactive state from Dexie.
  for (const collection of ['exercises', 'plans', 'trainingDays', 'workoutLogs', 'setLogs']) {
    window.dispatchEvent(
      new CustomEvent('fitness-sync-changed', { detail: { collection } })
    )
  }

  return { imported, skipped }
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
