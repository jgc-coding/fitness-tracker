<template>
  <div class="history-view">
    <TopBar title="History">
      <template #right>
        <button class="btn btn-ghost" @click="showExport = true">Export</button>
      </template>
    </TopBar>

    <div class="page-content">
      <!-- User toggle -->
      <div class="container">
        <div class="user-toggle">
          <button
            v-for="user in authStore.users"
            :key="user.id"
            class="toggle-btn"
            :class="{ active: selectedUser === user.id }"
            :style="{ '--user-color': user.color }"
            @click="selectUser(user.id)"
          >
            {{ user.name }}
          </button>
        </div>
      </div>

      <EmptyState
        v-if="!loading && spreadsheet.dates.length === 0"
        title="Noch keine Workouts"
        description="Starte dein erstes Workout im Tracking-Bereich."
      />

      <!-- Spreadsheet table -->
      <div v-else-if="spreadsheet.dates.length > 0" ref="sheetWrapper" class="spreadsheet-wrapper">
        <div class="spreadsheet">
          <table>
            <thead>
              <tr>
                <th class="col-exercise sticky-col">Uebung</th>
                <th class="col-max sticky-max">Max</th>
                <!-- Tages-Detail (P12): Kopfzelle antippbar, Punkt markiert
                     Tage mit vorhandener Notiz oder Zyklustag -->
                <th
                  v-for="date in spreadsheet.dates"
                  :key="date"
                  class="col-date date-head"
                  @click="openDayModal(date)"
                >
                  {{ formatDateHeader(date) }}<span v-if="metaDates.has(date)" class="meta-dot"></span>
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="group in spreadsheet.muscleGroups" :key="group.id">
                <!-- Muscle group header -->
                <tr class="group-row">
                  <td class="sticky-col group-label" :colspan="2 + spreadsheet.dates.length">
                    {{ group.label }}
                  </td>
                </tr>
                <!-- Exercise rows -->
                <tr v-for="ex in group.exercises" :key="ex.id" class="exercise-row">
                  <td class="col-exercise sticky-col">{{ toTitleCase(ex.name) }}</td>
                  <td class="col-max sticky-max">
                    <span v-if="ex.max > 0" class="max-value">{{ ex.max }}</span>
                  </td>
                  <td
                    v-for="date in spreadsheet.dates"
                    :key="date"
                    class="col-date"
                    :class="{ 'has-value': ex.dates[date] }"
                  >
                    <template v-if="ex.dates[date]">
                      <span class="cell-weight">{{ ex.dates[date].weight }}</span>
                      <span class="cell-reps">x{{ ex.dates[date].reps }}</span>
                    </template>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tages-Detail (P12): alle workoutLogs des angetippten Datums mit
         Titel, Teilnehmern, Notiz und Zyklustag; Notiz und Zyklustag sind
         hier nachtraeglich editierbar (Bausteine wie P11, Schreibweg
         db.workoutLogs.update + pushRecord — die Store-Funktionen haengen
         am aktiven Workout und passen hier nicht) -->
    <Modal v-model="showDayModal" :title="dayModalTitle">
      <p v-if="dayLogs.length === 0" class="day-empty">
        Kein Workout-Eintrag zu diesem Datum.
      </p>
      <div v-else class="day-logs">
        <div v-for="log in dayLogs" :key="log.id" class="card day-log">
          <div class="day-log-title">{{ logTitle(log) }}</div>
          <!-- Teilnehmer aus userIds; alte Logs ohne das Feld: keine Anzeige -->
          <div v-if="logUserNames(log)" class="day-log-users">{{ logUserNames(log) }}</div>
          <p v-if="log.note" class="day-log-note">{{ log.note }}</p>
          <div v-if="cycleEntries(log).length > 0" class="day-log-cycle">
            <span v-for="entry in cycleEntries(log)" :key="entry.userId">
              Zyklustag {{ entry.day }} ({{ entry.name }})
            </span>
          </div>
          <div class="day-log-actions">
            <button class="btn btn-secondary meta-btn" @click="openLogNote(log)">
              Notiz{{ log.note ? ' ✓' : '' }}
            </button>
            <button v-if="zyklusUser" class="btn btn-secondary meta-btn" @click="openLogCycle(log)">
              Zyklustag{{ logCycleDay(log) != null ? ' ' + logCycleDay(log) : '' }}
            </button>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Workout-Notiz nachtraeglich (Baustein wie P11) -->
    <Modal v-model="showLogNote" title="Workout-Notiz">
      <textarea
        v-model="logNoteDraft"
        class="note-textarea"
        rows="5"
        placeholder="Notiz zum Training..."
      ></textarea>
      <button class="btn btn-primary btn-block" @click="saveLogNote">Speichern</button>
    </Modal>

    <!-- Zyklustag nachtraeglich (Baustein wie P11): WheelPicker 1-45,
         Entfernen loescht nur den Schluessel des Zyklus-Nutzers -->
    <Modal v-model="showLogCycle" :title="zyklusUser ? `Zyklustag — ${zyklusUser.name}` : 'Zyklustag'">
      <div class="cycle-wheel">
        <WheelPicker
          :modelValue="logCycleDraft"
          @update:modelValue="logCycleDraft = $event"
          :values="cycleValues"
          label="Zyklustag"
          unit="Tag"
        />
      </div>
      <button class="btn btn-primary btn-block" @click="saveLogCycle">Speichern</button>
      <button
        class="btn btn-secondary btn-block"
        style="margin-top: var(--space-sm)"
        @click="removeLogCycle"
      >
        Entfernen
      </button>
    </Modal>

    <!-- Export Modal -->
    <Modal v-model="showExport" title="Daten exportieren">
      <div class="export-options">
        <button class="card export-option" @click="doExport('csv')">
          <strong>CSV Export</strong>
          <span>Fuer Excel / Google Sheets</span>
        </button>
        <button class="card export-option" @click="doExport('json')">
          <strong>JSON Export</strong>
          <span>Alle Daten (Backup)</span>
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import EmptyState from '../components/shared/EmptyState.vue'
import Modal from '../components/shared/Modal.vue'
import WheelPicker from '../components/shared/WheelPicker.vue'
import { db } from '../db/dexie.js'
import { pushRecord } from '../services/syncService.js'
import { useAuthStore } from '../stores/auth.js'
import { useHistory } from '../composables/useHistory.js'
import { useExercises } from '../composables/useExercises.js'
import { exportToCSV, exportToJSON } from '../utils/exportData.js'
import { toTitleCase } from '../utils/formatters.js'
import { formatDate } from '../utils/dateHelpers.js'

const authStore = useAuthStore()
const { buildSpreadsheetData } = useHistory()
const { loadExercises } = useExercises()

const selectedUser = ref('user1')
const showExport = ref(false)
const loading = ref(true)
const spreadsheet = reactive({ muscleGroups: [], dates: [] })
const sheetWrapper = ref(null)

function formatDateHeader(dateStr) {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}`
}

async function selectUser(userId) {
  selectedUser.value = userId
  await loadData()
}

async function loadData() {
  try {
    const data = await buildSpreadsheetData(selectedUser.value)
    spreadsheet.muscleGroups = data.muscleGroups
    spreadsheet.dates = data.dates
    // Neueste Trainings stehen ganz rechts — beim Oeffnen direkt dorthin
    // scrollen, denn der Standardblick ist "was war letztes Mal?".
    await nextTick()
    if (sheetWrapper.value) sheetWrapper.value.scrollLeft = sheetWrapper.value.scrollWidth
  } catch (e) {
    console.error('Error loading history:', e)
    spreadsheet.muscleGroups = []
    spreadsheet.dates = []
  }
}

async function doExport(type) {
  if (type === 'csv') await exportToCSV(selectedUser.value)
  else await exportToJSON(selectedUser.value)
  showExport.value = false
}

// --- Tages-Detail (P12): workoutLogs je Datum, Notiz/Zyklustag editierbar ---

const showDayModal = ref(false)
const showLogNote = ref(false)
const showLogCycle = ref(false)
const dayModalDate = ref(null)
const editLogId = ref(null)
const logNoteDraft = ref('')
const logCycleDraft = ref(1)
// Alle Logs einmal geladen; nach jedem Edit wird nur der eine Eintrag
// gegen den frischen DB-Stand getauscht (speist Modal UND Punkt-Markierung)
const workoutLogsAll = ref([])
const trainingDayTitles = ref({})

// Zyklus-Nutzer aus ALLEN Nutzern (History ist unabhaengig von der
// Tageswahl im Tracking), laut constants.js nur Lisa
const zyklusUser = computed(() => authStore.users.find(u => u.zyklus) || null)

const cycleValues = computed(() => {
  const vals = []
  for (let d = 1; d <= 45; d++) vals.push(d)
  return vals
})

// Daten mit vorhandener Notiz oder Zyklustag -> Punkt an der Kopfzelle
const metaDates = computed(() => {
  const s = new Set()
  for (const log of workoutLogsAll.value) {
    if ((log.note || '') !== '' || Object.keys(log.cycleDays || {}).length > 0) {
      s.add(log.date)
    }
  }
  return s
})

const dayLogs = computed(() => {
  if (!dayModalDate.value) return []
  return workoutLogsAll.value
    .filter(l => l.date === dayModalDate.value)
    .sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')))
})

const dayModalTitle = computed(() =>
  dayModalDate.value ? formatDate(dayModalDate.value) : ''
)

async function loadLogs() {
  workoutLogsAll.value = await db.workoutLogs.toArray()
  const days = await db.trainingDays.toArray()
  const titles = {}
  for (const d of days) titles[d.id] = d.title
  trainingDayTitles.value = titles
}

function openDayModal(date) {
  dayModalDate.value = date
  showDayModal.value = true
}

function logTitle(log) {
  if (log.isCustom) return log.title || 'Individuelles Training'
  return trainingDayTitles.value[log.trainingDayId] || 'Workout'
}

function logUserNames(log) {
  if (!Array.isArray(log.userIds) || log.userIds.length === 0) return ''
  return log.userIds.map(id => authStore.getUserName(id)).join(', ')
}

// Alle Zyklustag-Eintraege des Logs mit Nutzernamen (verlustfrei anzeigen,
// auch wenn ein Schluessel nicht dem heutigen Zyklus-Nutzer gehoert)
function cycleEntries(log) {
  const days = log.cycleDays || {}
  return Object.keys(days).map(userId => ({
    userId,
    day: days[userId],
    name: authStore.getUserName(userId)
  }))
}

function logCycleDay(log) {
  const uid = zyklusUser.value?.id
  const days = log.cycleDays
  return uid && days && days[uid] != null ? days[uid] : null
}

// Schreibweg fuer nachtraegliche Edits: db.workoutLogs.update + pushRecord
// mit dem vollen Datensatz — NICHT die Store-Funktionen aus P11, die haengen
// am aktiven Workout. Danach den lokalen Eintrag gegen den DB-Stand tauschen.
async function patchLog(logId, patch) {
  const updatedAt = new Date().toISOString()
  await db.workoutLogs.update(logId, { ...patch, updatedAt })
  const full = await db.workoutLogs.get(logId)
  if (full) {
    pushRecord('workoutLogs', full.id, full)
    const idx = workoutLogsAll.value.findIndex(l => l.id === logId)
    if (idx >= 0) workoutLogsAll.value[idx] = full
  }
}

function openLogNote(log) {
  editLogId.value = log.id
  logNoteDraft.value = log.note || ''
  showLogNote.value = true
}

async function saveLogNote() {
  if (!editLogId.value) return
  await patchLog(editLogId.value, { note: logNoteDraft.value.trim() })
  showLogNote.value = false
}

function openLogCycle(log) {
  editLogId.value = log.id
  logCycleDraft.value = logCycleDay(log) ?? 1
  showLogCycle.value = true
}

// cycleDays mergen, nie ersetzen: frisch aus der DB lesen, flach kopieren,
// genau EINEN Schluessel setzen oder loeschen (Stolperfalle aus P11)
async function writeLogCycle(day) {
  if (!zyklusUser.value || !editLogId.value) return
  const fresh = await db.workoutLogs.get(editLogId.value)
  const cycleDays = { ...(fresh?.cycleDays || {}) }
  if (day == null) {
    delete cycleDays[zyklusUser.value.id]
  } else {
    cycleDays[zyklusUser.value.id] = day
  }
  await patchLog(editLogId.value, { cycleDays })
  showLogCycle.value = false
}

async function saveLogCycle() {
  await writeLogCycle(logCycleDraft.value)
}

async function removeLogCycle() {
  await writeLogCycle(null)
}

onMounted(async () => {
  try {
    await loadExercises()
    await authStore.loadUserNames()
    // Standard-Nutzer aus den Einstellungen ist vorausgewaehlt (pro Geraet)
    selectedUser.value = authStore.defaultUserId
    await loadData()
    await loadLogs()
  } catch (e) {
    console.error('Error initializing history view:', e)
  }
  loading.value = false
})
</script>

<style scoped>
.page-content {
  padding-top: var(--space-md);
  padding-bottom: calc(var(--nav-height) + var(--space-xl));
}

.user-toggle {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
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

/* Spreadsheet */
.spreadsheet-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.spreadsheet {
  min-width: 100%;
}

table {
  border-collapse: collapse;
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

thead {
  position: sticky;
  top: 0;
  z-index: 10;
}

th {
  background: var(--color-white);
  border-bottom: 2px solid var(--color-accent);
  padding: var(--space-xs) var(--space-sm);
  text-align: center;
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

td {
  padding: var(--space-xs) var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

/* Sticky exercise name column */
.sticky-col {
  position: sticky;
  left: 0;
  z-index: 5;
  background: var(--color-white);
  min-width: 140px;
  max-width: 180px;
  text-align: left;
}

.sticky-max {
  position: sticky;
  left: 140px;
  z-index: 5;
  background: var(--color-white);
  min-width: 48px;
  text-align: center;
  border-right: 2px solid var(--color-border);
}

th.sticky-col {
  z-index: 15;
}

th.sticky-max {
  z-index: 15;
}

/* Muscle group header */
.group-row .group-label {
  position: sticky;
  left: 0;
  background: var(--color-bg);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-accent);
  padding: var(--space-sm) var(--space-sm);
}

/* Exercise name */
.exercise-row .col-exercise {
  font-size: var(--font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Max column */
.max-value {
  font-weight: var(--font-weight-bold);
  color: var(--color-accent);
}

/* Date columns */
.col-date {
  min-width: 56px;
  text-align: center;
  color: var(--color-text-muted);
}

.col-date.has-value {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-accent) 4%, transparent);
}

.cell-weight {
  font-weight: var(--font-weight-semibold);
}

.cell-reps {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-left: 1px;
}

/* Tages-Detail (P12) */
.date-head {
  cursor: pointer;
}

.date-head:active {
  background: var(--color-bg);
}

.meta-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: var(--radius-full);
  background: var(--color-accent);
  margin-left: 3px;
  vertical-align: middle;
}

.day-empty {
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.day-logs {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.day-log {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.day-log-title {
  font-weight: var(--font-weight-semibold);
}

.day-log-users {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.day-log-note {
  font-size: var(--font-size-sm);
  color: var(--color-text);
  white-space: pre-wrap;
  margin: 0;
}

.day-log-cycle {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.day-log-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.meta-btn {
  padding: var(--space-xs) var(--space-md);
  font-size: var(--font-size-sm);
}

.note-textarea {
  width: 100%;
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-family: inherit;
  resize: vertical;
  margin-bottom: var(--space-md);
}

.note-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Das Rad allein in der Modal-Mitte (wie im Tracking) */
.cycle-wheel {
  max-width: 160px;
  margin: 0 auto var(--space-md);
}

/* Export Modal */
.export-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.export-option {
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.export-option:active {
  box-shadow: var(--shadow-md);
}

.export-option span {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
