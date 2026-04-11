<template>
  <div class="settings-view">
    <TopBar title="Einstellungen" />

    <div class="container page-content">
      <!-- User Names -->
      <div class="card settings-card">
        <h2 class="settings-title">Benutzer</h2>
        <div
          v-for="user in authStore.users"
          :key="user.id"
          class="settings-row"
        >
          <label :style="{ borderLeftColor: user.color }" class="user-label">
            <span class="user-label-id">{{ user.id === 'user1' ? 'Benutzer 1' : 'Benutzer 2' }}</span>
            <input
              type="text"
              :value="user.name"
              @change="updateName(user.id, $event)"
              class="form-input"
              :placeholder="user.id === 'user1' ? 'Name Benutzer 1' : 'Name Benutzer 2'"
            />
          </label>
        </div>
      </div>

      <!-- Seed exercises -->
      <div class="card settings-card">
        <h2 class="settings-title">Uebungskatalog</h2>
        <p class="settings-desc">Lade Standard-Uebungen in den Katalog. Bereits vorhandene Uebungen werden nicht doppelt angelegt.</p>
        <button class="btn btn-secondary btn-block" @click="seedExercises">
          Standard-Uebungen laden
        </button>
        <p v-if="seedMessage" class="seed-message">{{ seedMessage }}</p>
      </div>

      <!-- Seed History -->
      <div class="card settings-card">
        <h2 class="settings-title">Ausgangswerte</h2>
        <p class="settings-desc">Lade die aktuellen Max-Werte von Lisa und Gab als Startwerte in die History.</p>
        <button class="btn btn-secondary btn-block" @click="seedHistory" :disabled="seedingHistory">
          {{ seedingHistory ? 'Wird geladen...' : 'Ausgangswerte laden' }}
        </button>
        <p v-if="historyMessage" class="seed-message">{{ historyMessage }}</p>
      </div>

      <!-- About -->
      <div class="card settings-card">
        <h2 class="settings-title">Info</h2>
        <div class="about-row">
          <span>Version</span>
          <span>1.0.1</span>
        </div>
        <div class="about-row">
          <span>Daten</span>
          <span>Lokal (IndexedDB)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import { useAuthStore } from '../stores/auth.js'
import { db, generateId } from '../db/dexie.js'

const authStore = useAuthStore()
const seedMessage = ref('')
const historyMessage = ref('')
const seedingHistory = ref(false)

async function updateName(userId, event) {
  const name = event.target.value.trim()
  if (name) {
    await authStore.updateUserName(userId, name)
  }
}

const DEFAULT_EXERCISES = [
  // Legs
  { name: 'Hack Squat', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'Leg curl', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'hip thrusts', muscleGroup: 'legs', equipment: 'barbell' },
  { name: '"bad girl"', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: '"good girl"', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'seated leg curl', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'seated leg extension', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'calve raises', muscleGroup: 'legs', equipment: 'machine_weight' },
  { name: 'lunges', muscleGroup: 'legs', equipment: 'dumbbell' },

  // Chest
  { name: 'DB Bench press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'DB incline Bench press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { name: 'machine: chest press', muscleGroup: 'chest', equipment: 'machine_weight' },
  { name: 'machine: incline chest press', muscleGroup: 'chest', equipment: 'machine_weight' },
  { name: 'Cable Crossover', muscleGroup: 'chest', equipment: 'machine_cable' },
  { name: 'BB Bench press', muscleGroup: 'chest', equipment: 'barbell' },
  { name: 'BB incline Bench press', muscleGroup: 'chest', equipment: 'barbell' },

  // Back
  { name: 'weighted pull up', muscleGroup: 'back', equipment: 'bodyweight' },
  { name: 'Latzug', muscleGroup: 'back', equipment: 'machine_cable' },
  { name: 'chest supported row', muscleGroup: 'back', equipment: 'dumbbell' },
  { name: 'low row', muscleGroup: 'back', equipment: 'machine_cable' },
  { name: 'cable row (without chest support)', muscleGroup: 'back', equipment: 'machine_cable' },
  { name: 'lower back', muscleGroup: 'back', equipment: 'machine_weight' },

  // Shoulders
  { name: 'shoulder press', muscleGroup: 'shoulders', equipment: 'machine_weight' },
  { name: 'BB overhead press', muscleGroup: 'shoulders', equipment: 'barbell' },
  { name: 'DB Side lateral', muscleGroup: 'shoulders', equipment: 'dumbbell' },

  // Arms
  { name: 'Standing Concentration Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
  { name: 'Cable Bicep Curl', muscleGroup: 'arms', equipment: 'machine_cable' },
  { name: 'Cable Rope Triceps Pushdown', muscleGroup: 'arms', equipment: 'machine_cable' },
  { name: 'Cable Overhead Triceps Extension', muscleGroup: 'arms', equipment: 'machine_cable' },

  // Core
  { name: 'core', muscleGroup: 'core', equipment: 'bodyweight' }
]

async function seedExercises() {
  const existing = await db.exercises.toArray()
  const existingNames = new Set(existing.map(e => e.name.toLowerCase()))

  let added = 0
  const now = new Date().toISOString()

  for (const ex of DEFAULT_EXERCISES) {
    if (!existingNames.has(ex.name.toLowerCase())) {
      await db.exercises.add({
        id: generateId(),
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment,
        notes: '',
        createdAt: now,
        updatedAt: now
      })
      added++
    }
  }

  if (added > 0) {
    seedMessage.value = `${added} Uebungen hinzugefuegt!`
  } else {
    seedMessage.value = 'Alle Uebungen bereits vorhanden.'
  }

  setTimeout(() => { seedMessage.value = '' }, 3000)
}

// History seed data from screenshots: [exerciseName, lisaMax, gabMax]
const SEED_HISTORY = [
  // Legs
  ['Hack Squat', 22.5, 50],
  ['hip thrusts', 30, 50],
  ['"bad girl"', 40, 60],
  ['seated leg curl', 52.5, 85],
  ['seated leg extension', 50, 70],
  ['calve raises', 25, 90],
  ['lunges', 20, 50],
  ['Leg Press', 0, 180],
  ['Leg curl', 0, 70],
  ['"good girl"', 0, 0],
  // Chest
  ['DB Bench press', 12, 36],
  ['DB incline Bench press', 0, 34],
  ['machine: chest press', 16.25, 100],
  ['machine: incline chest press', 13.75, 100],
  ['Cable Crossover', 0, 10],
  ['BB Bench press', 40, 70],
  ['BB incline Bench press', 0, 0],
  // Back
  ['weighted pull up', 33, 15],
  ['Latzug', 45, 85],
  ['chest supported row', 40, 130],
  ['low row', 0, 120],
  ['cable row (without chest support)', 40, 65],
  ['lower back', 20, 40],
  // Shoulders
  ['shoulder press', 15, 85],
  ['BB overhead press', 2.5, 25],
  ['DB Side lateral', 6, 10],
  // Arms
  ['Cable Bicep Curl', 14, 28],
  ['Cable Rope Triceps Pushdown', 15, 24],
  ['Cable Overhead Triceps Extension', 0, 31],
  ['Standing Concentration Curl', 0, 0],
  // Core
  ['core', 0, 0]
]

async function seedHistory() {
  seedingHistory.value = true
  historyMessage.value = ''

  try {
    // Check if already seeded
    const existingMeta = await db.meta.get('historySeedDone')
    if (existingMeta) {
      historyMessage.value = 'Ausgangswerte bereits vorhanden.'
      seedingHistory.value = false
      setTimeout(() => { historyMessage.value = '' }, 3000)
      return
    }

    // Load exercises
    const allExercises = await db.exercises.toArray()
    const exerciseMap = {}
    for (const ex of allExercises) {
      exerciseMap[ex.name.toLowerCase()] = ex.id
    }

    const seedDate = '2026-04-08' // Yesterday as baseline
    const now = new Date().toISOString()

    // Create a workout log entry for the seed
    const workoutLogId = generateId()
    await db.workoutLogs.add({
      id: workoutLogId,
      planId: 'seed',
      date: seedDate,
      startedAt: now,
      completedAt: now
    })

    let added = 0
    for (const [name, lisaMax, gabMax] of SEED_HISTORY) {
      const exerciseId = exerciseMap[name.toLowerCase()]
      if (!exerciseId) continue

      // Lisa (user1)
      if (lisaMax > 0) {
        await db.setLogs.add({
          id: generateId(),
          workoutLogId,
          exerciseId,
          userId: 'user1',
          setNumber: 1,
          weight: lisaMax,
          reps: 8,
          date: seedDate,
          createdAt: now
        })
        added++
      }

      // Gab (user2)
      if (gabMax > 0) {
        await db.setLogs.add({
          id: generateId(),
          workoutLogId,
          exerciseId,
          userId: 'user2',
          setNumber: 1,
          weight: gabMax,
          reps: 8,
          date: seedDate,
          createdAt: now
        })
        added++
      }
    }

    await db.meta.put({ key: 'historySeedDone', value: true })
    historyMessage.value = `${added} Ausgangswerte eingetragen!`
  } catch (e) {
    console.error('Seed history error:', e)
    historyMessage.value = 'Fehler beim Laden der Werte.'
  }

  seedingHistory.value = false
  setTimeout(() => { historyMessage.value = '' }, 3000)
}

onMounted(() => authStore.loadUserNames())
</script>

<style scoped>
.page-content {
  padding-top: var(--space-md);
  padding-bottom: calc(var(--nav-height) + var(--space-xl));
}

.settings-card {
  margin-bottom: var(--space-md);
}

.settings-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-md);
}

.settings-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--space-md);
}

.settings-row {
  margin-bottom: var(--space-md);
}

.settings-row:last-child {
  margin-bottom: 0;
}

.user-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  border-left: 3px solid;
  padding-left: var(--space-sm);
}

.user-label-id {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  background: var(--color-white);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.seed-message {
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-success);
  text-align: center;
}

.about-row {
  display: flex;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-sm);
}

.about-row:last-child {
  border-bottom: none;
}
</style>
