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

      <!-- About -->
      <div class="card settings-card">
        <h2 class="settings-title">Info</h2>
        <div class="about-row">
          <span>Version</span>
          <span>1.0.0</span>
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
