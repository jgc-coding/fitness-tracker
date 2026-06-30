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

    for (const ex of groupExercises) {
      const data = exerciseData[ex.id] || {}
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

  const csv = rows.join('\n')
  downloadFile(csv, `fitness-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8')
}

export async function exportToJSON(userId = null) {
  const data = {
    exercises: await db.exercises.toArray(),
    plans: await db.plans.toArray(),
    trainingDays: await db.trainingDays.toArray(),
    workoutLogs: await db.workoutLogs.toArray(),
    setLogs: userId
      ? (await db.setLogs.toArray()).filter(s => s.userId === userId)
      : await db.setLogs.toArray(),
    exportedAt: new Date().toISOString()
  }

  const json = JSON.stringify(data, null, 2)
  downloadFile(json, `fitness-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json')
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
