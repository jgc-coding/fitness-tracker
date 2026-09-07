<template>
  <div class="plan-view">
    <!-- Was gerade aktiv ist -->
    <div v-for="card in planCards" :key="card.userId" class="card plan-card">
      <div class="plan-card-head">
        <span class="plan-user" :style="{ color: card.color }">{{ card.name }}</span>
        <span v-if="card.plan" class="plan-version">Version {{ card.plan.planVersion || 1 }}</span>
      </div>

      <template v-if="card.plan">
        <p class="plan-name">{{ card.plan.name }}</p>
        <p class="plan-goal">
          {{ card.plan.goal?.label || 'Ohne Ziel' }}
          <template v-if="card.plan.goal?.date"> · {{ formatDate(card.plan.goal.date) }}</template>
          <template v-if="card.plan.goal?.target"> · {{ card.plan.goal.target }}</template>
        </p>
        <div class="plan-facts">
          <span>{{ card.sessionCount }} Laeufe</span>
          <span>{{ card.doneCount }} erledigt</span>
          <span v-if="card.importedAt">importiert {{ card.importedAt }}</span>
        </div>
        <p v-if="card.next" class="plan-next">
          Naechster Lauf: {{ weekdayShort(card.next.date) }} {{ formatDayShort(card.next.date) }} ·
          {{ card.next.title }}
        </p>
        <p v-if="card.olderPlans > 0" class="plan-older">
          {{ card.olderPlans }} frueherer Plan bleibt als Geschichte erhalten.
        </p>
        <button class="btn btn-ghost btn-block delete-btn" @click="removePlan(card.plan)">
          Plan loeschen
        </button>
      </template>
      <p v-else class="plan-empty">Noch kein Plan importiert.</p>
    </div>

    <!-- Import -->
    <div class="card plan-card">
      <h2 class="card-title">Plan importieren</h2>
      <p class="card-desc">
        Die Datei kommt von Claude. Sie wird zuerst geprueft, danach siehst du eine
        Vorschau — geschrieben wird erst nach deiner Bestaetigung.
      </p>

      <template v-if="!preview">
        <button class="btn btn-secondary btn-block" @click="fileInput?.click()">
          Datei waehlen
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json,application/json"
          style="display: none"
          @change="onFileChosen"
        />
        <textarea
          v-model="pastedText"
          class="paste-area"
          rows="4"
          placeholder="... oder JSON hier einfuegen"
        ></textarea>
        <button
          class="btn btn-primary btn-block"
          :disabled="!pastedText.trim()"
          @click="checkText(pastedText)"
        >
          Pruefen
        </button>
      </template>

      <!-- Vorschau vor dem Schreiben -->
      <div v-else class="preview">
        <p class="preview-title">Vorschau</p>
        <p class="preview-summary">{{ preview.text }}</p>
        <ul class="preview-list">
          <li v-for="line in preview.lines" :key="line">{{ line }}</li>
        </ul>
        <div class="form-actions">
          <button class="btn btn-secondary" :disabled="applying" @click="cancelPreview">
            Abbrechen
          </button>
          <button
            class="btn btn-primary"
            :disabled="applying || preview.summary.unchanged"
            @click="applyPreview"
          >
            {{ applying ? 'Wird uebernommen...' : 'Uebernehmen' }}
          </button>
        </div>
      </div>

      <div v-if="errors.length > 0" class="error-box">
        <p class="error-title">Die Datei passt nicht zum Format — es wurde nichts geaendert.</p>
        <ul class="error-list">
          <li v-for="line in errors.slice(0, 8)" :key="line">{{ line }}</li>
        </ul>
        <p v-if="errors.length > 8" class="error-more">... und {{ errors.length - 8 }} weitere.</p>
        <p class="error-hint">
          Gib diese Zeilen an Claude weiter — sie nennen die Stelle in der Datei.
        </p>
      </div>

      <p v-if="message" class="plan-message" :class="{ error: messageIsError }">{{ message }}</p>
    </div>

    <!-- Status-Export -->
    <div class="card plan-card">
      <h2 class="card-title">Stand an Claude geben</h2>
      <p class="card-desc">
        Exportiert Plan und Stand im selben Format: Haken, Ist-Werte und
        Verschiebungen. Claude passt damit den Plan an.
      </p>
      <div class="export-actions">
        <button class="btn btn-secondary" :disabled="!hasPlans" @click="copyStatus">Kopieren</button>
        <button class="btn btn-secondary" :disabled="!hasPlans" @click="downloadStatus">
          Herunterladen
        </button>
        <button v-if="canShareFiles" class="btn btn-secondary" :disabled="!hasPlans" @click="shareStatus">
          Teilen
        </button>
      </div>
      <button class="btn btn-ghost btn-block feedback-btn" @click="copyFeedback">
        Nur Rueckmeldungen kopieren
      </button>
      <p class="export-hint">
        Kurzer Text der letzten acht Wochen mit Anstrengung und Notizen — passt in
        eine Chat-Nachricht, ohne den ganzen Jahresplan.
      </p>
      <p v-if="exportMessage" class="plan-message" :class="{ error: exportIsError }">
        {{ exportMessage }}
      </p>
    </div>

    <!-- Verbindung zu Garmin ueber intervals.icu -->
    <div class="card plan-card">
      <h2 class="card-title">Verbindung intervals.icu</h2>
      <p class="card-desc">
        Holt fertige Laeufe von der Uhr und setzt den Haken samt Ist-Werten
        selbst. Athleten-Id und Schluessel bleiben auf diesem Geraet - jeder
        traegt hier seinen eigenen Zugang ein.
      </p>

      <div v-for="karte in intervalsKarten" :key="karte.userId" class="intervals-user">
        <div class="intervals-head">
          <span class="plan-user" :style="{ color: karte.color }">{{ karte.name }}</span>
          <span class="intervals-state" :class="{ on: karte.verbunden }">
            {{ karte.verbunden ? 'verbunden' : 'nicht verbunden' }}
          </span>
        </div>

        <template v-if="karte.verbunden">
          <p class="intervals-sync">{{ karte.abgleichText }}</p>
          <div class="form-actions">
            <button
              class="btn btn-secondary"
              :disabled="busyUser === karte.userId"
              @click="jetztAbgleichen(karte.userId)"
            >
              {{ busyUser === karte.userId ? 'Laeuft...' : 'Jetzt abgleichen' }}
            </button>
            <button class="btn btn-ghost" @click="verbindungEntfernen(karte.userId)">
              Entfernen
            </button>
          </div>
        </template>

        <template v-else>
          <input
            v-model="eingabe[karte.userId].athleteId"
            class="intervals-input"
            type="text"
            inputmode="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Athleten-Id, z.B. i123456"
          />
          <input
            v-model="eingabe[karte.userId].apiKey"
            class="intervals-input"
            type="password"
            autocomplete="off"
            spellcheck="false"
            placeholder="API-Schluessel"
          />
          <button
            class="btn btn-primary btn-block"
            :disabled="busyUser === karte.userId || !eingabeVollstaendig(karte.userId)"
            @click="verbinden(karte.userId)"
          >
            {{ busyUser === karte.userId ? 'Wird geprueft...' : 'Verbinden und testen' }}
          </button>
        </template>

        <p
          v-if="intervalsMeldung[karte.userId]"
          class="plan-message"
          :class="{ error: intervalsIstFehler[karte.userId] }"
        >
          {{ intervalsMeldung[karte.userId] }}
        </p>
        <p v-if="intervalsDetail[karte.userId]" class="intervals-detail">
          {{ intervalsDetail[karte.userId] }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRunningStore } from '../../stores/running.js'
import { useAuthStore } from '../../stores/auth.js'
import { USERS } from '../../utils/constants.js'
import { describeDiff } from '../../utils/runPlanMerge.js'
import { downloadFile } from '../../utils/exportData.js'
import { getToday, formatDate, formatDayShort, weekdayShort } from '../../utils/dateHelpers.js'

const running = useRunningStore()
const authStore = useAuthStore()

const fileInput = ref(null)
const pastedText = ref('')
const preview = ref(null)
const errors = ref([])
const message = ref('')
const messageIsError = ref(false)
const applying = ref(false)
const exportMessage = ref('')
const exportIsError = ref(false)

const today = getToday()
const hasPlans = computed(() => running.plans.length > 0)

// Teilen-Knopf nur zeigen, wenn das Geraet Dateien teilen kann (Android Chrome).
const canShareFiles = (() => {
  try {
    return typeof navigator !== 'undefined' && typeof navigator.canShare === 'function'
      && navigator.canShare({ files: [new File(['x'], 'test.json', { type: 'application/json' })] })
  } catch {
    return false
  }
})()

const planCards = computed(() =>
  USERS.map((user) => {
    const plan = running.activePlan(user.id)
    const sessions = plan ? running.sessionsForPlan(plan.id) : []
    const next = sessions
      .filter(s => s.status === 'planned' && s.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null
    return {
      userId: user.id,
      name: authStore.getUserName(user.id),
      color: user.color,
      plan,
      sessionCount: sessions.length,
      doneCount: sessions.filter(s => s.status === 'done').length,
      importedAt: plan?.updatedAt ? formatDate(plan.updatedAt.slice(0, 10)) : '',
      olderPlans: running.plansByUser(user.id).filter(p => p.isActive !== true).length,
      next
    }
  })
)

function resetFeedback() {
  errors.value = []
  message.value = ''
  messageIsError.value = false
}

async function onFileChosen(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // gleiche Datei soll erneut waehlbar sein
  if (!file) return
  try {
    checkText(await file.text())
  } catch (e) {
    console.error('[FitTrack] [ERROR] Laufplan-Datei nicht lesbar:', e)
    resetFeedback()
    messageIsError.value = true
    message.value = 'Die Datei liess sich nicht lesen. Bitte erneut versuchen.'
  }
}

function checkText(text) {
  resetFeedback()
  preview.value = null
  const result = running.prepareImport(text)
  if (!result.ok) {
    errors.value = result.errors
    return
  }

  const summary = result.diff.summary
  preview.value = {
    diff: result.diff,
    summary,
    text: describeDiff(summary),
    lines: buildPreviewLines(result.diff)
  }
}

function buildPreviewLines(diff) {
  const lines = []
  for (const plan of diff.plansToPut) {
    const owner = authStore.getUserName(plan.userId)
    lines.push(`${owner}: Plan "${plan.name}"${plan.isActive ? ' (wird aktiv)' : ' (wird inaktiv)'}`)
  }
  if (diff.summary.sessionsNew) lines.push(`${diff.summary.sessionsNew} neue Laeufe`)
  if (diff.summary.sessionsUpdated) lines.push(`${diff.summary.sessionsUpdated} Laeufe angepasst`)
  if (diff.summary.sessionsDeleted) lines.push(`${diff.summary.sessionsDeleted} geplante Laeufe in der Zukunft entfernt`)
  if (diff.summary.sessionsProtected) lines.push(`${diff.summary.sessionsProtected} erledigte oder ausgelassene Laeufe bleiben unveraendert`)
  return lines
}

function cancelPreview() {
  preview.value = null
  resetFeedback()
}

async function applyPreview() {
  if (!preview.value || applying.value) return
  applying.value = true
  try {
    const summary = await running.applyImport(preview.value.diff)
    message.value = `Import fertig: ${describeDiff(summary)}`
    messageIsError.value = false
    preview.value = null
    pastedText.value = ''
  } catch (e) {
    console.error('[FitTrack] [ERROR] Laufplan-Import fehlgeschlagen:', e)
    messageIsError.value = true
    message.value = `Der Import ist fehlgeschlagen, es wurde nichts geaendert. Technische Ursache: ${e?.message || 'unbekannt'}`
  }
  applying.value = false
}

async function removePlan(plan) {
  const count = running.sessionsForPlan(plan.id).length
  if (!confirm(`Plan "${plan.name}" wirklich loeschen? ${count} Laeufe werden mit entfernt.`)) return
  try {
    await running.deletePlan(plan.id)
    messageIsError.value = false
    message.value = 'Plan geloescht.'
  } catch (e) {
    console.error('[FitTrack] [ERROR] Plan loeschen fehlgeschlagen:', e)
    messageIsError.value = true
    message.value = 'Loeschen fehlgeschlagen. Bitte erneut versuchen.'
  }
}

function statusJson() {
  return running.exportStatus(USERS.map(u => u.id))
}

function exportFileName() {
  return `laufplan-stand-${getToday()}.json`
}

async function copyStatus() {
  exportIsError.value = false
  try {
    await navigator.clipboard.writeText(statusJson())
    exportMessage.value = 'In die Zwischenablage kopiert — jetzt bei Claude einfuegen.'
  } catch (e) {
    console.error('[FitTrack] [WARN] Kopieren nicht moeglich:', e)
    exportIsError.value = true
    exportMessage.value = 'Kopieren hat nicht geklappt. Nutze stattdessen "Herunterladen".'
  }
  clearExportMessage()
}

/**
 * Kurzfassung der Rueckmeldungen — der schnelle Weg, wenn nur die letzten
 * Wochen besprochen werden sollen. Der grosse Export enthaelt dasselbe.
 */
async function copyFeedback() {
  exportIsError.value = false
  const { text, count } = running.exportFeedbackText(USERS.map(u => u.id), {
    nameOf: (id) => authStore.getUserName(id)
  })
  try {
    await navigator.clipboard.writeText(text)
    exportMessage.value = count > 0
      ? `${count} ${count === 1 ? 'Rueckmeldung' : 'Rueckmeldungen'} kopiert — jetzt bei Claude einfuegen.`
      : 'Kopiert — in den letzten acht Wochen gibt es allerdings noch keine Rueckmeldung.'
  } catch (e) {
    // Zwischenablage gesperrt (kommt in manchen Browsern vor): dann wenigstens
    // als Datei ausgeben, statt den Text verschwinden zu lassen.
    console.error('[FitTrack] [WARN] Kopieren nicht moeglich:', e)
    try {
      downloadFile(text, `laufplan-rueckmeldungen-${getToday()}.txt`, 'text/plain;charset=utf-8')
      exportIsError.value = false
      exportMessage.value = 'Kopieren war gesperrt — der Text wurde stattdessen als Datei gespeichert.'
    } catch (e2) {
      console.error('[FitTrack] [ERROR] Rueckmeldungen weder kopierbar noch speicherbar:', e2)
      exportIsError.value = true
      exportMessage.value = `Das hat nicht geklappt. Technische Ursache: ${e?.name || 'unbekannt'}`
    }
  }
  clearExportMessage()
}

function downloadStatus() {
  exportIsError.value = false
  try {
    downloadFile(statusJson(), exportFileName(), 'application/json')
    exportMessage.value = 'Datei wurde heruntergeladen.'
  } catch (e) {
    console.error('[FitTrack] [ERROR] Export fehlgeschlagen:', e)
    exportIsError.value = true
    exportMessage.value = 'Export fehlgeschlagen.'
  }
  clearExportMessage()
}

async function shareStatus() {
  exportIsError.value = false
  try {
    const file = new File([statusJson()], exportFileName(), { type: 'application/json' })
    await navigator.share({ files: [file], title: 'Laufplan-Stand' })
    exportMessage.value = 'Geteilt.'
  } catch (e) {
    if (e?.name !== 'AbortError') {
      console.error('[FitTrack] [WARN] Teilen nicht moeglich:', e)
      exportIsError.value = true
      exportMessage.value = 'Teilen hat nicht geklappt. Nutze stattdessen "Herunterladen".'
    }
  }
  clearExportMessage()
}

function clearExportMessage() {
  setTimeout(() => { exportMessage.value = '' }, 6000)
}
// --- Verbindung zu intervals.icu ---------------------------------------------

const eingabe = ref(Object.fromEntries(USERS.map(u => [u.id, { athleteId: '', apiKey: '' }])))
const busyUser = ref(null)
const intervalsMeldung = ref({})
const intervalsIstFehler = ref({})
const intervalsDetail = ref({})

const intervalsKarten = computed(() =>
  USERS.map(u => ({
    userId: u.id,
    name: u.name,
    color: u.color,
    verbunden: running.intervalsBereit[u.id] === true,
    abgleichText: abgleichText(running.intervalsAbgleich[u.id])
  }))
)

function abgleichText(iso) {
  if (!iso) return 'Noch nicht abgeglichen.'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Noch nicht abgeglichen.'
  const zeit = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `Zuletzt abgeglichen: ${formatDate(iso.slice(0, 10))}, ${zeit} Uhr`
}

function eingabeVollstaendig(userId) {
  const wert = eingabe.value[userId]
  return Boolean(wert?.athleteId?.trim() && wert?.apiKey?.trim())
}

function melde(userId, text, istFehler = false, detail = '') {
  intervalsMeldung.value = { ...intervalsMeldung.value, [userId]: text }
  intervalsIstFehler.value = { ...intervalsIstFehler.value, [userId]: istFehler }
  intervalsDetail.value = { ...intervalsDetail.value, [userId]: detail }
}

async function verbinden(userId) {
  const athleteId = eingabe.value[userId].athleteId.trim()
  const apiKey = eingabe.value[userId].apiKey.trim()
  if (!athleteId || !apiKey) return

  busyUser.value = userId
  melde(userId, '')
  try {
    await running.testeIntervals(athleteId, apiKey)
    if (!running.speichereZugang(userId, athleteId, apiKey)) {
      melde(userId, 'Der Zugang liess sich auf diesem Geraet nicht speichern.', true)
      return
    }
    eingabe.value[userId] = { athleteId: '', apiKey: '' }
    melde(userId, 'Verbindung steht. Laeufe werden ab jetzt automatisch geholt.')
    await jetztAbgleichen(userId)
  } catch (e) {
    console.warn(`[FitTrack] [WARN] intervals: Test fehlgeschlagen - ID ${e?.id || '?'}`)
    melde(userId, e?.satz || 'Der Test ist fehlgeschlagen.', true, e?.zeile || '')
  } finally {
    busyUser.value = null
  }
}

async function jetztAbgleichen(userId) {
  busyUser.value = userId
  try {
    const ergebnis = await running.syncFromIntervals(userId, { force: true })
    if (ergebnis.ok) melde(userId, ergebnis.text)
    else if (ergebnis.grund === 'offline') melde(userId, 'Offline - der naechste Abgleich holt alles nach.', true)
    else if (ergebnis.grund === 'kein-zugang') melde(userId, 'Fuer diesen Nutzer ist kein Zugang hinterlegt.', true)
  } catch (e) {
    console.warn(`[FitTrack] [WARN] intervals: Abgleich fehlgeschlagen - ID ${e?.id || '?'}`)
    melde(userId, e?.satz || 'Der Abgleich ist fehlgeschlagen.', true, e?.zeile || '')
  } finally {
    busyUser.value = null
  }
}

function verbindungEntfernen(userId) {
  running.entferneZugang(userId)
  melde(userId, 'Zugang entfernt. Bereits eingetragene Ist-Werte bleiben erhalten.')
}

</script>

<style scoped>
.plan-card {
  margin-bottom: var(--space-md);
}

.plan-card-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
}

.plan-user {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.plan-version {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.plan-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  margin-top: var(--space-xs);
}

.plan-goal {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.plan-facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.plan-next {
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
}

.plan-older {
  margin-top: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.plan-empty {
  margin-top: var(--space-xs);
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.delete-btn {
  margin-top: var(--space-sm);
}

.card-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-sm);
}

.card-desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--space-md);
}

.paste-area {
  width: 100%;
  margin: var(--space-sm) 0;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-family: inherit;
  background: var(--color-white);
  color: var(--color-text);
  resize: vertical;
}

.paste-area:focus {
  outline: none;
  border-color: var(--color-accent);
}

.preview {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-sm);
  background: var(--color-bg);
}

.preview-title {
  font-size: var(--font-size-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-muted);
}

.preview-summary {
  font-weight: var(--font-weight-medium);
  margin: var(--space-xs) 0;
}

.preview-list {
  list-style: none;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.preview-list li::before {
  content: '· ';
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-sm);
}

.form-actions .btn {
  flex: 1;
}

.error-box {
  margin-top: var(--space-md);
  border: 1px solid rgba(192, 57, 43, 0.35);
  border-radius: var(--radius-sm);
  background: rgba(192, 57, 43, 0.06);
  padding: var(--space-sm);
}

.error-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-danger);
}

.error-list {
  list-style: none;
  margin-top: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  word-break: break-word;
}

.error-list li::before {
  content: '· ';
}

.error-more,
.error-hint {
  margin-top: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.export-actions {
  display: flex;
  gap: var(--space-sm);
}

.export-actions .btn {
  flex: 1;
}

.feedback-btn {
  margin-top: var(--space-sm);
}

.export-hint {
  margin-top: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.plan-message {
  margin-top: var(--space-sm);
  font-size: var(--font-size-sm);
  color: var(--color-success);
}

.plan-message.error {
  color: var(--color-danger);
}

.intervals-user {
  padding-top: var(--space-sm);
  border-top: 1px solid rgba(155, 157, 165, 0.2);
  margin-top: var(--space-sm);
}

.intervals-user:first-of-type {
  border-top: none;
  margin-top: 0;
  padding-top: 0;
}

.intervals-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.intervals-state {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.intervals-state.on {
  color: var(--color-success, #2f7d4f);
}

.intervals-sync {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  margin-bottom: var(--space-xs);
}

.intervals-input {
  width: 100%;
  padding: var(--space-sm);
  margin-bottom: var(--space-xs);
  border: 1px solid rgba(155, 157, 165, 0.35);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  background: var(--color-white);
  color: var(--color-text);
}

.intervals-detail {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-light);
  margin-top: 2px;
}
</style>
