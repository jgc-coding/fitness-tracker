import { db } from '../db/dexie.js'
import { pushRecord } from '../services/syncService.js'

// Notizen je Nutzer je Uebung (Tabelle exerciseNotes, Dexie v4) — unabhaengig
// vom Workout. Deterministische Id `${exerciseId}_${userId}`: dieselbe Notiz
// trifft auf jedem Geraet denselben Datensatz, Last-Write-Wins per updatedAt
// greift beim Cloud-Sync.
// Leeren LOESCHT bewusst nicht (das braeuchte einen Tombstone), sondern
// schreibt text: '' — fachlich ist eine leere Notiz dasselbe.

function noteId(exerciseId, userId) {
  return `${exerciseId}_${userId}`
}

// Alle Notizen einer Uebung als Map userId -> Datensatz (fehlende Nutzer
// fehlen in der Map; der Aufrufer zeigt dann ein leeres Feld).
async function loadNotesForExercise(exerciseId) {
  const rows = await db.exerciseNotes.where('exerciseId').equals(exerciseId).toArray()
  const byUser = {}
  for (const row of rows) byUser[row.userId] = row
  return byUser
}

async function getNote(exerciseId, userId) {
  return db.exerciseNotes.get(noteId(exerciseId, userId))
}

// Speichert die Notiz eines Nutzers zu einer Uebung. Leerer Text ist gueltig
// (= Notiz geleert). createdAt bleibt beim Aktualisieren erhalten.
async function saveNote(exerciseId, userId, text) {
  const id = noteId(exerciseId, userId)
  const now = new Date().toISOString()
  const existing = await db.exerciseNotes.get(id)
  const note = {
    id,
    exerciseId,
    userId,
    text: text || '',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  }
  await db.exerciseNotes.put(note)
  pushRecord('exerciseNotes', id, note)
  return note
}

export function useExerciseNotes() {
  return {
    noteId,
    loadNotesForExercise,
    getNote,
    saveNote
  }
}
