<template>
  <Modal :model-value="modelValue" :title="session?.title || 'Lauf'" @update:model-value="close">
    <div v-if="session" class="sheet">
      <!-- Kopfzeile: Tag, Art, Person -->
      <div class="sheet-head">
        <span class="head-symbol" aria-hidden="true">{{ typeInfo.symbol }}</span>
        <div class="head-text">
          <p class="head-date">{{ weekdayShort(session.date) }}, {{ formatDayShort(session.date) }}</p>
          <p class="head-meta">
            {{ typeInfo.label }}
            <template v-if="userName"> · {{ userName }}</template>
          </p>
        </div>
        <span class="head-status" :class="'status-' + session.status">{{ statusLabel }}</span>
      </div>

      <p v-if="plannedFull" class="sheet-planned">Vorgabe: {{ plannedFull }}</p>

      <!-- Puls- und Tempovorgabe. Je Zeile ein Abschnitt des Laufs, weil ein
           Tempolauf mehrere Tempi hat (Grundtempo, schnelle Stuecke, Trab). -->
      <ul v-if="targetRows.length" class="sheet-targets">
        <li v-for="(row, i) in targetRows" :key="i" class="target-row">
          <span class="target-label">{{ row.label }}</span>
          <span v-if="row.hr" class="target-hr">Puls {{ row.hr }}</span>
          <span v-if="row.pace" class="target-pace">{{ row.pace }} /km</span>
        </li>
      </ul>

      <p v-if="session.description" class="sheet-description">{{ session.description }}</p>
      <p v-if="session.originalDate" class="sheet-hint">
        Verschoben — geplant war {{ formatDayShort(session.originalDate) }}
      </p>
      <p v-if="session.status === 'done' && actualFull" class="sheet-actual">
        Gelaufen: {{ actualFull }}
        <template v-if="session.actual?.avgHr"> · Puls {{ session.actual.avgHr }}</template>
      </p>
      <p v-if="session.actual?.note" class="sheet-note">„{{ session.actual.note }}"</p>
      <p v-if="session.feedback?.rpe" class="sheet-effort">
        Anstrengung {{ session.feedback.rpe }}/5 · {{ effortLabelOf(session.feedback.rpe) }}
      </p>
      <p v-if="session.feedback?.note" class="sheet-note">„{{ session.feedback.note }}"</p>

      <!-- Erledigt (mit Rueckmeldung) und spaeter nachgereichte Rueckmeldung -->
      <div v-if="mode === 'done' || mode === 'feedback'" class="sheet-form">
        <template v-if="mode === 'done'">
          <p class="form-title">Werte eintragen (alles freiwillig)</p>
          <div class="form-grid">
            <label class="form-field">
              <span>Kilometer</span>
              <input v-model="doneKm" type="number" inputmode="decimal" step="0.1" min="0" class="form-input" />
            </label>
            <label class="form-field">
              <span>Minuten</span>
              <input v-model="doneMinutes" type="number" inputmode="numeric" step="1" min="0" class="form-input" />
            </label>
            <label class="form-field">
              <span>Puls</span>
              <input v-model="doneHr" type="number" inputmode="numeric" step="1" min="0" class="form-input" />
            </label>
          </div>
        </template>

        <p class="form-title">Wie anstrengend war es?</p>
        <div class="effort-row">
          <button
            v-for="stufe in EFFORT_SCALE"
            :key="stufe.value"
            type="button"
            class="effort-btn"
            :class="{ active: feedbackRpe === stufe.value }"
            :aria-pressed="feedbackRpe === stufe.value"
            :aria-label="stufe.value + ' von 5, ' + stufe.label"
            @click="toggleEffort(stufe.value)"
          >
            {{ stufe.value }}
          </button>
        </div>
        <p class="effort-hint">{{ effortHint }}</p>

        <label class="form-field">
          <span>Notiz</span>
          <input
            v-model="feedbackNote"
            type="text"
            class="form-input"
            placeholder="z.B. schwere Beine, Magen war ok"
          />
        </label>

        <div class="form-actions">
          <button class="btn btn-secondary" @click="mode = null">Abbrechen</button>
          <button class="btn btn-primary" @click="mode === 'done' ? saveDone() : saveFeedbackOnly()">
            Speichern
          </button>
        </div>
      </div>

      <!-- Ausgelassen: Grund -->
      <div v-else-if="mode === 'skip'" class="sheet-form">
        <p class="form-title">Warum ausgelassen? (freiwillig)</p>
        <input v-model="skipNote" type="text" class="form-input" placeholder="z.B. krank, keine Zeit" />
        <div class="form-actions">
          <button class="btn btn-secondary" @click="mode = null">Abbrechen</button>
          <button class="btn btn-primary" @click="saveSkipped">Ausgelassen</button>
        </div>
      </div>

      <!-- Verschieben -->
      <div v-else-if="mode === 'move'" class="sheet-form">
        <p class="form-title">Auf welchen Tag?</p>
        <div class="day-grid">
          <button
            v-for="day in moveDays"
            :key="day.date"
            class="day-chip"
            :class="{ current: day.date === session.date }"
            @click="doMove(day.date)"
          >
            <span class="day-chip-name">{{ day.weekday }}</span>
            <span class="day-chip-date">{{ day.label }}</span>
          </button>
        </div>
        <label class="form-field">
          <span>Anderes Datum</span>
          <input v-model="moveDate" type="date" class="form-input" />
        </label>
        <div class="form-actions">
          <button class="btn btn-secondary" @click="mode = null">Abbrechen</button>
          <button class="btn btn-primary" :disabled="!moveDate || moveDate === session.date" @click="doMove(moveDate)">
            Verschieben
          </button>
        </div>
      </div>

      <!-- Tauschen -->
      <div v-else-if="mode === 'swap'" class="sheet-form">
        <p class="form-title">Mit welchem Lauf tauschen?</p>
        <p v-if="swapCandidates.length === 0" class="form-empty">
          In dieser Woche gibt es keinen zweiten Lauf zum Tauschen.
        </p>
        <button
          v-for="candidate in swapCandidates"
          :key="candidate.id"
          class="swap-option"
          @click="doSwap(candidate.id)"
        >
          <span class="swap-day">{{ weekdayShort(candidate.date) }} {{ formatDayShort(candidate.date) }}</span>
          <span class="swap-title">{{ candidate.title }}</span>
          <span class="swap-value">{{ formatRunValue(candidate.planned) }}</span>
        </button>
        <div class="form-actions">
          <button class="btn btn-secondary btn-block" @click="mode = null">Abbrechen</button>
        </div>
      </div>

      <!-- Standard: die Knoepfe -->
      <div v-else class="sheet-actions">
        <button v-if="session.status !== 'done'" class="btn btn-primary btn-block" @click="openDone">
          Erledigt
        </button>
        <button v-else class="btn btn-primary btn-block" @click="openFeedback">
          {{ session.feedback ? 'Rueckmeldung aendern' : 'Wie war es?' }}
        </button>
        <button v-if="session.status !== 'skipped'" class="btn btn-secondary btn-block" @click="mode = 'skip'">
          Ausgelassen
        </button>
        <button class="btn btn-secondary btn-block" @click="openMove">Verschieben</button>
        <button class="btn btn-secondary btn-block" @click="mode = 'swap'">Tauschen mit ...</button>
        <button
          v-if="session.status !== 'planned'"
          class="btn btn-ghost btn-block"
          @click="doReset"
        >
          Zurueck auf geplant
        </button>
      </div>

      <p v-if="errorMessage" class="sheet-error">{{ errorMessage }}</p>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '../shared/Modal.vue'
import { useRunningStore } from '../../stores/running.js'
import { getRunType, getEffortLabel, RUN_EFFORT_SCALE } from '../../utils/runPlanSchema.js'
import { formatRunValue, formatRunValueFull } from '../../utils/formatters.js'
import { weekdayShort, formatDayShort, addDaysToDate } from '../../utils/dateHelpers.js'

const props = defineProps({
  modelValue: Boolean,
  session: { type: Object, default: null },
  // Laeufe desselben Nutzers in derselben Woche (ohne diesen Lauf).
  swapCandidates: { type: Array, default: () => [] },
  userName: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const running = useRunningStore()

const mode = ref(null)
const doneKm = ref('')
const doneMinutes = ref('')
const doneHr = ref('')
const feedbackRpe = ref(null)
const feedbackNote = ref('')
const skipNote = ref('')
const moveDate = ref('')
const errorMessage = ref('')

const STATUS_LABELS = { planned: 'geplant', done: 'erledigt', skipped: 'ausgelassen' }
const EFFORT_SCALE = RUN_EFFORT_SCALE

const typeInfo = computed(() => getRunType(props.session?.type))
const statusLabel = computed(() => STATUS_LABELS[props.session?.status] || '')
const plannedFull = computed(() => formatRunValueFull(props.session?.planned))
const actualFull = computed(() => formatRunValueFull(props.session?.actual))

/**
 * Puls- und Tempovorgabe als fertige Zeilen. Fehlt bei einer einzigen Vorgabe
 * die Bezeichnung, steht dort "Ziel" — eine namenlose Zeile saehe aus, als
 * waere etwas verlorengegangen.
 */
const targetRows = computed(() => {
  const list = props.session?.targets || []
  return list.map((t, i) => ({
    label: t.label || (list.length === 1 ? 'Ziel' : `Teil ${i + 1}`),
    hr: t.hrFrom && t.hrTo ? `${t.hrFrom}–${t.hrTo}` : '',
    pace: t.paceFrom && t.paceTo
      ? (t.paceFrom === t.paceTo ? t.paceFrom : `${t.paceFrom}–${t.paceTo}`)
      : ''
  }))
})

const effortLabelOf = (rpe) => getEffortLabel(rpe)

// Solange nichts gewaehlt ist, erklaert die Zeile die Skala; danach die Stufe.
const effortHint = computed(() => {
  const stufe = EFFORT_SCALE.find(e => e.value === feedbackRpe.value)
  if (stufe) return `${stufe.label} — ${stufe.hint}`
  return '1 = sehr locker, 5 = maximal. Freiwillig.'
})

// Sieben Tage vor und nach dem aktuellen Tag.
const moveDays = computed(() => {
  if (!props.session) return []
  const days = []
  for (let offset = -7; offset <= 7; offset++) {
    const date = addDaysToDate(props.session.date, offset)
    days.push({ date, weekday: weekdayShort(date), label: formatDayShort(date) })
  }
  return days
})

// Beim Oeffnen eines anderen Laufs alles zuruecksetzen.
watch(
  () => [props.modelValue, props.session?.id],
  () => {
    mode.value = null
    errorMessage.value = ''
  }
)

function close() {
  emit('update:modelValue', false)
}

function openDone() {
  const s = props.session
  // Vorbelegung mit den Planwerten: meistens stimmt es ungefaehr, und ein
  // Antippen von "Speichern" reicht.
  doneKm.value = s.actual?.km ?? s.planned?.km ?? ''
  doneMinutes.value = s.actual?.minutes ?? s.planned?.minutes ?? ''
  doneHr.value = s.actual?.avgHr ?? ''
  ladeFeedback()
  mode.value = 'done'
}

/** Rueckmeldung nachtragen — der Normalfall, wenn die Uhr den Haken gesetzt hat. */
function openFeedback() {
  ladeFeedback()
  mode.value = 'feedback'
}

function ladeFeedback() {
  feedbackRpe.value = props.session?.feedback?.rpe ?? null
  feedbackNote.value = props.session?.feedback?.note ?? ''
}

/** Nochmal auf dieselbe Stufe tippen loescht sie — die Angabe ist freiwillig. */
function toggleEffort(value) {
  feedbackRpe.value = feedbackRpe.value === value ? null : value
}

function openMove() {
  moveDate.value = props.session.date
  mode.value = 'move'
}

async function run(action) {
  errorMessage.value = ''
  try {
    await action()
    close()
  } catch (e) {
    console.error('[FitTrack] [ERROR] Laufplaner-Aktion fehlgeschlagen:', e)
    errorMessage.value = 'Das hat nicht geklappt. Bitte erneut versuchen.'
  }
}

function saveDone() {
  run(() =>
    running.markDone(
      props.session.id,
      {
        km: doneKm.value,
        minutes: doneMinutes.value,
        avgHr: doneHr.value,
        // Die technische Notiz (z.B. "Gesamtzeit 12:00 h" von der Uhr) bleibt
        // erhalten; der eigene Text gehoert zur Rueckmeldung.
        note: props.session.actual?.note ?? ''
      },
      { rpe: feedbackRpe.value, note: feedbackNote.value }
    )
  )
}

function saveFeedbackOnly() {
  run(() => running.saveFeedback(props.session.id, { rpe: feedbackRpe.value, note: feedbackNote.value }))
}

function saveSkipped() {
  run(() => running.markSkipped(props.session.id, skipNote.value))
}

function doMove(date) {
  if (!date) return
  run(() => running.moveSession(props.session.id, date))
}

function doSwap(otherId) {
  run(() => running.swapSessions(props.session.id, otherId))
}

function doReset() {
  run(() => running.resetToPlanned(props.session.id))
}
</script>

<style scoped>
.sheet-head {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding-bottom: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
}

.head-symbol {
  font-size: var(--font-size-xl);
  line-height: 1;
}

.head-text {
  flex: 1;
  min-width: 0;
}

.head-date {
  font-weight: var(--font-weight-semibold);
}

.head-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.head-status {
  font-size: var(--font-size-xs);
  padding: 2px var(--space-sm);
  border-radius: var(--radius-full);
  background: var(--color-bg);
  color: var(--color-text-light);
}

.head-status.status-done {
  background: rgba(45, 138, 78, 0.12);
  color: var(--color-success);
}

.head-status.status-skipped {
  background: rgba(155, 157, 165, 0.18);
  color: var(--color-text-muted);
}

.sheet-planned {
  margin-top: var(--space-md);
  font-weight: var(--font-weight-medium);
}

.sheet-targets {
  list-style: none;
  margin: var(--space-sm) 0 0;
  padding: var(--space-sm) var(--space-md);
  background: var(--color-bg);
  border-radius: var(--radius-md);
}

.target-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-sm);
  padding: 2px 0;
  font-size: var(--font-size-sm);
}

.target-label {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-text-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.target-hr {
  flex: 0 0 auto;
  color: var(--color-text-light);
  font-variant-numeric: tabular-nums;
}

.target-pace {
  flex: 0 0 auto;
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.sheet-description,
.sheet-hint,
.sheet-actual,
.sheet-note {
  margin-top: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.sheet-actual {
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.sheet-hint {
  color: var(--color-text-muted);
}

.sheet-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-top: var(--space-md);
}

.sheet-form {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.form-empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.form-input {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  background: var(--color-white);
  color: var(--color-text);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Anstrengung 1-5: fuenf Flaechen, die sich mit dem Daumen sicher treffen lassen. */
.effort-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-xs);
}

.effort-btn {
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  color: var(--color-text);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.effort-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-white);
}

.effort-hint {
  min-height: 1.2em;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.sheet-effort {
  margin-top: var(--space-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.form-actions .btn {
  flex: 1;
}

.day-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-xs);
}

.day-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-xs) 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  min-height: 44px;
  justify-content: center;
}

.day-chip.current {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
}

.day-chip-name {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.day-chip-date {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.swap-option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  text-align: left;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  min-height: 44px;
}

.swap-day {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  width: 62px;
  flex-shrink: 0;
}

.swap-title {
  flex: 1;
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.swap-value {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.sheet-error {
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-danger);
  text-align: center;
}
</style>
