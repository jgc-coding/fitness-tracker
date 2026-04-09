import { db } from '../db/dexie.js'

export async function exportToCSV(userId = null) {
  let sets = await db.setLogs.toArray()
  if (userId) {
    sets = sets.filter(s => s.userId === userId)
  }

  const exercises = await db.exercises.toArray()
  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e.name]))

  sets.sort((a, b) => a.date.localeCompare(b.date) || a.exerciseId.localeCompare(b.exerciseId) || a.setNumber - b.setNumber)

  const header = 'Datum,Benutzer,Uebung,Set,Gewicht (kg),Wiederholungen,Volumen,Gewicht steigern\n'
  const rows = sets.map(s =>
    `${s.date},${s.userId},${exerciseMap[s.exerciseId] || s.exerciseId},${s.setNumber},${s.weight},${s.reps},${s.weight * s.reps},${s.increaseNextTime ? 'Ja' : 'Nein'}`
  ).join('\n')

  const csv = header + rows
  downloadFile(csv, `fitness-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv')
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
