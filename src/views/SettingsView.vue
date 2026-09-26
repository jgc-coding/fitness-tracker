<template>
  <div class="settings-view">
    <TopBar title="Einstellungen" />

    <div class="container page-content">
      <!-- User Names -->
      <div class="card settings-card">
        <h2 class="settings-title">Benutzer</h2>
        <div
          v-for="(user, index) in authStore.users"
          :key="user.id"
          class="settings-row"
        >
          <label :style="{ borderLeftColor: user.color }" class="user-label">
            <span class="user-label-id">{{ 'Benutzer ' + (index + 1) }}</span>
            <input
              type="text"
              :value="user.name"
              @change="updateName(user.id, $event)"
              class="form-input"
              :placeholder="'Name Benutzer ' + (index + 1)"
            />
          </label>
        </div>

        <!-- Standard-Nutzer: Vorauswahl beim Eintragen und in der History -->
        <div v-if="authStore.users.length > 1" class="default-user">
          <span class="user-label-id">Standard-Nutzer</span>
          <p class="settings-desc">
            Wer beim Eintragen der Gewichte und in der History zuerst
            ausgewaehlt ist. Die Einstellung gilt nur auf diesem Geraet.
          </p>
          <div class="user-toggle">
            <button
              v-for="user in authStore.users"
              :key="user.id"
              class="toggle-btn"
              :class="{ active: authStore.defaultUserId === user.id }"
              :style="{ '--user-color': user.color }"
              @click="authStore.setDefaultUser(user.id)"
            >
              {{ user.name }}
            </button>
          </div>
        </div>

        <!-- Saetze je Uebung und Person (Gabriel 26.09.2026): gesynct, gilt
             also auf allen Geraeten -->
        <div class="default-user">
          <span class="user-label-id">Saetze je Uebung</span>
          <p class="settings-desc">
            Bei 1 wird wie bisher ein Wert je Uebung eingetragen. Ab 2 erfasst
            die Person jeden Satz einzeln. Die Einstellung gilt auf allen Geraeten.
          </p>
          <div v-for="user in authStore.users" :key="user.id" class="satz-zeile">
            <span class="satz-name" :style="{ borderLeftColor: user.color }">{{ user.name }}</span>
            <div class="user-toggle satz-auswahl" role="group" :aria-label="`Saetze je Uebung fuer ${user.name}`">
              <button
                v-for="n in SATZZAHL_MAX"
                :key="n"
                class="toggle-btn"
                :class="{ active: authStore.satzZahl(user.id) === n }"
                :style="{ '--user-color': user.color }"
                :aria-pressed="authStore.satzZahl(user.id) === n"
                @click="authStore.setSatzZahl(user.id, n)"
              >
                {{ n }}
              </button>
            </div>
          </div>
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
        <p class="settings-desc" style="margin-top: var(--space-md)">
          Ordnet Uebungen anhand ihres Namens automatisch eine Zeichnung zu.
          Bereits gesetzte, gueltige Bilder bleiben unangetastet.
        </p>
        <button class="btn btn-secondary btn-block" @click="assignImages" :disabled="assigningImages">
          {{ assigningImages ? 'Wird zugeordnet...' : 'Bilder automatisch zuordnen' }}
        </button>
        <p v-if="imageMessage" class="seed-message">{{ imageMessage }}</p>
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

      <!-- Backup -->
      <div class="card settings-card">
        <h2 class="settings-title">Backup</h2>
        <p class="settings-desc">
          Sichert alle Daten (beide Nutzer) als JSON-Datei. Der Import
          ergaenzt und aktualisiert nur — vorhandene neuere Eintraege bleiben
          unangetastet.
        </p>
        <button class="btn btn-secondary btn-block" @click="doBackupExport">
          Backup exportieren (JSON)
        </button>
        <button
          class="btn btn-secondary btn-block"
          style="margin-top: var(--space-sm)"
          @click="backupFileInput?.click()"
        >
          Backup importieren
        </button>
        <input
          ref="backupFileInput"
          type="file"
          accept=".json,application/json"
          style="display: none"
          @change="doBackupImport"
        />
        <p
          v-if="backupMessage"
          class="seed-message"
          :style="backupError ? { color: 'var(--color-danger)' } : null"
        >
          {{ backupMessage }}
        </p>
      </div>

      <!-- Cloud Sync -->
      <div class="card settings-card">
        <h2 class="settings-title">Cloud-Sync</h2>

        <template v-if="syncStatus === 'auth-required'">
          <p class="settings-desc">
            Melde dich mit dem gemeinsamen Fitness-Konto an, damit beide
            Handys ihre Daten teilen. Ohne Anmeldung laeuft die App normal
            weiter — nur eben ohne Abgleich.
          </p>
          <form @submit.prevent="doSignIn">
            <input
              v-model="loginEmail"
              type="email"
              class="form-input login-field"
              placeholder="E-Mail"
              autocomplete="username"
            />
            <input
              v-model="loginPassword"
              type="password"
              class="form-input login-field"
              placeholder="Passwort"
              autocomplete="current-password"
            />
            <button
              type="submit"
              class="btn btn-primary btn-block"
              :disabled="signingIn || !loginEmail || !loginPassword"
            >
              {{ signingIn ? 'Anmelden...' : 'Anmelden' }}
            </button>
          </form>
          <p v-if="loginError" class="login-error">{{ loginError }}</p>
        </template>

        <template v-else>
          <div class="about-row">
            <span>Status</span>
            <span :style="syncStatus === 'error' ? { color: 'var(--color-danger)' } : null">{{ syncLabel }}</span>
          </div>
          <div v-if="pendingPushCount > 0" class="about-row">
            <span>Ausstehend</span>
            <span :style="{ color: 'var(--color-danger)' }">
              {{ pendingPushCount }} Aenderung(en) — wird automatisch nachgeholt
            </span>
          </div>
          <div v-if="authUserEmail" class="about-row">
            <span>Konto</span>
            <span>{{ authUserEmail }}</span>
          </div>
          <button
            v-if="authUserEmail"
            class="btn btn-secondary btn-block"
            style="margin-top: var(--space-sm)"
            @click="doSignOut"
          >
            Abmelden
          </button>
        </template>
      </div>

      <!-- About -->
      <div class="card settings-card">
        <h2 class="settings-title">Info</h2>
        <div class="about-row">
          <span>Version</span>
          <span>{{ appVersion }}</span>
        </div>
        <div class="about-row">
          <span>Daten</span>
          <span>Lokal (IndexedDB)</span>
        </div>
        <!-- Bildnachweis: Pflicht der Lizenz CC BY-SA 4.0 (Urheber nennen,
             Lizenz verlinken, Aenderung kennzeichnen) — nie entfernen,
             solange noch eine Workout-Guide-Zeichnung im Manifest steht.
             Gleicher Nachweis in public/uebungsbilder/LIZENZ.md. -->
        <p class="bildnachweis">
          Linienzeichnungen:
          <a href="https://github.com/bryllim/workout-guide" target="_blank" rel="noopener">Workout Guide</a>
          von Bryl Lim, teils nach
          <a href="https://github.com/everkinetic/data" target="_blank" rel="noopener">Everkinetic</a>
          — Lizenz
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener">CC BY-SA 4.0</a>,
          fuer die App eingefaerbt. Die farbigen Uebungsbilder sind KI-generiert.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import { useAuthStore } from '../stores/auth.js'
import { db, generateId } from '../db/dexie.js'
import {
  pushRecord,
  syncStatus,
  lastSyncAt,
  authUserEmail,
  pendingPushCount,
  signIn,
  signOutSync,
  resyncAll
} from '../services/syncService.js'
import { exportToJSON, importFromJSON } from '../utils/exportData.js'
import { useExercises } from '../composables/useExercises.js'
import { findeImageKey, eintragFuerKey } from '../utils/uebungsBilder.js'
import { SATZZAHL_MAX } from '../utils/saetze.js'
import bildKatalog from '../data/uebungskatalog.json'
import { STANDARD_UEBUNGEN } from '../data/standardUebungen.js'

const authStore = useAuthStore()
const { updateExercise } = useExercises()
const seedMessage = ref('')
const imageMessage = ref('')
const assigningImages = ref(false)
const historyMessage = ref('')
const seedingHistory = ref(false)
const backupFileInput = ref(null)
const backupMessage = ref('')
const backupError = ref(false)
// __APP_VERSION__ is injected at build time from package.json (see vite.config.js)
const appVersion = __APP_VERSION__

const loginEmail = ref('')
const loginPassword = ref('')
const loginError = ref('')
const signingIn = ref(false)

const SYNC_LABELS = {
  idle: 'Nicht gestartet',
  connecting: 'Verbinde...',
  'auth-required': 'Anmeldung erforderlich',
  synced: 'Aktiv',
  offline: 'Offline',
  error: 'Fehler'
}

// Firebase auth error codes -> readable German messages
const LOGIN_ERRORS = {
  'auth/invalid-credential': 'E-Mail oder Passwort ist falsch.',
  'auth/invalid-email': 'Das ist keine gueltige E-Mail-Adresse.',
  'auth/user-disabled': 'Dieses Konto wurde deaktiviert.',
  'auth/too-many-requests': 'Zu viele Versuche — bitte kurz warten.',
  'auth/network-request-failed': 'Keine Verbindung — bitte spaeter erneut versuchen.'
}

async function doSignIn() {
  if (signingIn.value) return
  loginError.value = ''
  signingIn.value = true
  try {
    await signIn(loginEmail.value.trim(), loginPassword.value)
    loginPassword.value = ''
  } catch (e) {
    loginError.value = LOGIN_ERRORS[e?.code] || 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.'
    console.error('Login error:', e)
  }
  signingIn.value = false
}

async function doSignOut() {
  await signOutSync()
}

async function doBackupExport() {
  try {
    await exportToJSON() // ohne userId = komplette Datenbank
    backupError.value = false
    backupMessage.value = 'Backup-Datei wurde heruntergeladen.'
  } catch (e) {
    console.error('Backup export error:', e)
    backupError.value = true
    backupMessage.value = 'Export fehlgeschlagen.'
  }
  setTimeout(() => { backupMessage.value = '' }, 5000)
}

async function doBackupImport(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // reset, damit dieselbe Datei erneut waehlbar ist
  if (!file) return
  try {
    const text = await file.text()
    const { imported, skipped } = await importFromJSON(text)
    await authStore.loadUserNames()
    await authStore.loadSatzZahlen()
    resyncAll() // bringt neue lokale Daten in die Cloud (falls angemeldet)
    backupError.value = false
    backupMessage.value = `Import fertig: ${imported} uebernommen, ${skipped} unveraendert.`
  } catch (e) {
    console.error('Backup import error:', e)
    backupError.value = true
    backupMessage.value = e?.message || 'Import fehlgeschlagen.'
  }
  setTimeout(() => { backupMessage.value = '' }, 6000)
}

const syncLabel = computed(() => {
  const base = SYNC_LABELS[syncStatus.value] || syncStatus.value
  return lastSyncAt.value
    ? `${base} (${lastSyncAt.value.toLocaleTimeString('de-DE')})`
    : base
})

async function updateName(userId, event) {
  const name = event.target.value.trim()
  if (name) {
    await authStore.updateUserName(userId, name)
  }
}

// Standardliste der Uebungen (fuer "Standard-Uebungen laden"): liegt seit
// 24.09.2026 in src/data/standardUebungen.js, damit Vertragstest und
// scripts/uebungen-cloud.mjs dieselbe Liste lesen
const DEFAULT_EXERCISES = STANDARD_UEBUNGEN

async function seedExercises() {
  const existing = await db.exercises.toArray()
  const existingNames = new Set(existing.map(e => e.name.toLowerCase()))

  let added = 0
  const now = new Date().toISOString()

  for (const ex of DEFAULT_EXERCISES) {
    if (!existingNames.has(ex.name.toLowerCase())) {
      const exercise = {
        id: generateId(),
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment,
        notes: '',
        createdAt: now,
        updatedAt: now
      }
      await db.exercises.add(exercise)
      pushRecord('exercises', exercise.id, exercise)
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

// Bilder automatisch zuordnen: setzt imageKey NUR bei Uebungen ohne gueltigen
// Wert — leer oder verwaist, also ein Key, den das Manifest nicht mehr kennt
// (z.B. die Foto-Keys vor dem Wechsel auf Zeichnungen am 22.09.2026).
// Idempotent: ein zweiter Lauf aendert nichts mehr. Findet der Name keinen
// Treffer, bleibt ein verwaister Key stehen (zeigt die MuscleMap) — nie
// ungefragt loeschen. Schreibweg ist updateExercise aus useExercises, damit
// pushRecord die Cloud mitzieht.
async function assignImages() {
  assigningImages.value = true
  try {
    const alle = await db.exercises.toArray()
    let zugeordnet = 0
    let ohneBild = 0
    for (const ex of alle) {
      if (ex.imageKey && eintragFuerKey(bildKatalog, ex.imageKey)) continue
      const key = findeImageKey(bildKatalog, ex.name)
      if (key) {
        await updateExercise(ex.id, { imageKey: key })
        zugeordnet++
      } else {
        ohneBild++
      }
    }
    imageMessage.value = `${zugeordnet} zugeordnet, ${ohneBild} ohne Bild`
  } catch (e) {
    console.error('Bild-Zuordnung fehlgeschlagen:', e)
    imageMessage.value = 'Zuordnung fehlgeschlagen.'
  }
  assigningImages.value = false
  setTimeout(() => { imageMessage.value = '' }, 5000)
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
    // Check if already seeded ON THIS DEVICE. We deliberately use localStorage
    // (not the synced `meta` table) so the second device can still refuse or
    // skip independently. Also short-circuit if we already see seed data in
    // the synced DB (the partner already did the seed).
    if (localStorage.getItem('historySeedDone') === '1') {
      historyMessage.value = 'Ausgangswerte bereits vorhanden.'
      seedingHistory.value = false
      setTimeout(() => { historyMessage.value = '' }, 3000)
      return
    }
    const seedWorkout = await db.workoutLogs.where({ planId: 'seed' }).first()
    if (seedWorkout) {
      localStorage.setItem('historySeedDone', '1')
      historyMessage.value = 'Ausgangswerte sind bereits via Sync vorhanden.'
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
    const workoutLog = {
      id: workoutLogId,
      planId: 'seed',
      date: seedDate,
      startedAt: now,
      completedAt: now,
      updatedAt: now
    }
    await db.workoutLogs.add(workoutLog)
    pushRecord('workoutLogs', workoutLogId, workoutLog)

    let added = 0
    for (const [name, lisaMax, gabMax] of SEED_HISTORY) {
      const exerciseId = exerciseMap[name.toLowerCase()]
      if (!exerciseId) continue

      // Lisa (user1)
      if (lisaMax > 0) {
        const setLog = {
          id: generateId(),
          workoutLogId,
          exerciseId,
          userId: 'user1',
          setNumber: 1,
          weight: lisaMax,
          reps: 8,
          date: seedDate,
          createdAt: now,
          updatedAt: now
        }
        await db.setLogs.add(setLog)
        pushRecord('setLogs', setLog.id, setLog)
        added++
      }

      // Gab (user2)
      if (gabMax > 0) {
        const setLog = {
          id: generateId(),
          workoutLogId,
          exerciseId,
          userId: 'user2',
          setNumber: 1,
          weight: gabMax,
          reps: 8,
          date: seedDate,
          createdAt: now,
          updatedAt: now
        }
        await db.setLogs.add(setLog)
        pushRecord('setLogs', setLog.id, setLog)
        added++
      }
    }

    localStorage.setItem('historySeedDone', '1')
    historyMessage.value = `${added} Ausgangswerte eingetragen!`
  } catch (e) {
    console.error('Seed history error:', e)
    historyMessage.value = 'Fehler beim Laden der Werte.'
  }

  seedingHistory.value = false
  setTimeout(() => { historyMessage.value = '' }, 3000)
}

onMounted(() => {
  authStore.loadUserNames()
  authStore.loadSatzZahlen()
})
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

.default-user {
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-md);
}

.default-user .settings-desc {
  margin-top: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.user-toggle {
  display: flex;
  gap: var(--space-xs);
}

.toggle-btn {
  flex: 1;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  background: var(--color-white);
  color: var(--color-text-light);
  transition: all 0.15s;
}

.toggle-btn.active {
  border-color: var(--user-color, var(--color-accent));
  color: var(--user-color, var(--color-accent));
  background: var(--color-white);
}

/* Saetze je Uebung: Name links (Farbstrich wie oben), rechts 1-5 */
.satz-zeile {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.satz-name {
  flex: 0 0 64px;
  min-width: 0;
  padding-left: var(--space-sm);
  border-left: 3px solid;
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.satz-auswahl {
  flex: 1;
}

.satz-auswahl .toggle-btn {
  padding: 6px 0;
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

.login-field {
  margin-bottom: var(--space-sm);
}

.login-error {
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-danger);
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

.bildnachweis {
  padding-top: var(--space-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  line-height: 1.5;
}

.bildnachweis a {
  color: var(--color-accent);
}
</style>
