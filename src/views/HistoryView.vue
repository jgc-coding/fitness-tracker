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
      <div v-else-if="spreadsheet.dates.length > 0" class="spreadsheet-wrapper">
        <div class="spreadsheet">
          <table>
            <thead>
              <tr>
                <th class="col-exercise sticky-col">Uebung</th>
                <th class="col-max sticky-max">Max</th>
                <th
                  v-for="date in spreadsheet.dates"
                  :key="date"
                  class="col-date"
                >
                  {{ formatDateHeader(date) }}
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
                  <td class="col-exercise sticky-col">{{ ex.name }}</td>
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
import { ref, reactive, onMounted } from 'vue'
import TopBar from '../components/layout/TopBar.vue'
import EmptyState from '../components/shared/EmptyState.vue'
import Modal from '../components/shared/Modal.vue'
import { useAuthStore } from '../stores/auth.js'
import { useHistory } from '../composables/useHistory.js'
import { useExercises } from '../composables/useExercises.js'
import { exportToCSV, exportToJSON } from '../utils/exportData.js'

const authStore = useAuthStore()
const { buildSpreadsheetData } = useHistory()
const { loadExercises } = useExercises()

const selectedUser = ref('user1')
const showExport = ref(false)
const loading = ref(true)
const spreadsheet = reactive({ muscleGroups: [], dates: [] })

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

onMounted(async () => {
  try {
    await loadExercises()
    await authStore.loadUserNames()
    await loadData()
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
