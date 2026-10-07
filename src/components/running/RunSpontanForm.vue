<template>
  <div class="spontan-form">
    <!-- Loeschen bestaetigen ersetzt das Formular (nie zwei Fenster uebereinander) -->
    <template v-if="loeschenFragen">
      <p class="form-title">Diesen Lauf wirklich loeschen?</p>
      <p class="form-hint">Er verschwindet auf allen Handys.</p>
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" :disabled="busy" @click="loeschenFragen = false">Nein</button>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="loeschen">Loeschen</button>
      </div>
    </template>

    <template v-else>
      <p class="form-title">{{ frage }}</p>
      <div class="art-grid" role="radiogroup" aria-label="Art des Laufs">
        <button
          v-for="art in SPONTAN_ARTEN"
          :key="art.id"
          type="button"
          class="art-chip"
          :class="{ active: werte.type === art.id }"
          role="radio"
          :aria-checked="werte.type === art.id"
          @click="werte.type = art.id"
        >
          <span class="art-symbol" aria-hidden="true">{{ art.symbol }}</span>
          <span class="art-label">{{ art.label }}</span>
        </button>
      </div>

      <label class="form-field">
        <span>Titel (optional)</span>
        <input
          v-model="werte.title"
          type="text"
          maxlength="60"
          class="form-input"
          :placeholder="titelPlatzhalter"
        />
      </label>

      <div v-if="personen.length > 1" class="personen" role="radiogroup" aria-label="Wer ist gelaufen?">
        <button
          v-for="p in personen"
          :key="p.id"
          type="button"
          class="person-chip"
          :class="{ active: userId === p.id }"
          :style="{ '--person-color': p.color }"
          role="radio"
          :aria-checked="userId === p.id"
          @click="userId = p.id"
        >
          {{ p.name }}
        </button>
      </div>

      <label class="form-field">
        <span>Datum</span>
        <input v-model="werte.date" type="date" :max="heute" class="form-input" />
      </label>

      <div class="form-grid">
        <label class="form-field">
          <span>Kilometer</span>
          <input v-model="werte.km" type="number" inputmode="decimal" step="0.1" min="0" class="form-input" />
        </label>
        <label class="form-field">
          <span>Minuten</span>
          <input v-model="werte.minutes" type="number" inputmode="numeric" step="1" min="0" class="form-input" />
        </label>
        <label class="form-field">
          <span>Puls</span>
          <input v-model="werte.avgHr" type="number" inputmode="numeric" step="1" min="0" class="form-input" />
        </label>
      </div>
      <p class="form-hint">Werte sind optional.</p>

      <RunEffortPicker v-model="werte.rpe" />

      <label class="form-field">
        <span>Notiz</span>
        <input
          v-model="werte.note"
          type="text"
          class="form-input"
          placeholder="z.B. spontan mit Freunden, schwere Beine"
        />
      </label>

      <ZyklusTagFeld v-model="werte.cycleDay" :user-id="userId" :date="werte.date" />

      <!-- Nur bei "Anders gelaufen": was wird aus dem geplanten Lauf? -->
      <template v-if="modus === 'anders'">
        <p class="form-title">Und der geplante Lauf „{{ lauf.title }}"?</p>
        <div class="behandlung" role="radiogroup" aria-label="Geplanter Lauf">
          <button
            type="button"
            class="behandlung-btn"
            :class="{ active: behandlung === BEHANDLUNG_AUSGELASSEN }"
            role="radio"
            :aria-checked="behandlung === BEHANDLUNG_AUSGELASSEN"
            @click="behandlung = BEHANDLUNG_AUSGELASSEN"
          >
            ausgelassen
          </button>
          <button
            type="button"
            class="behandlung-btn"
            :class="{ active: behandlung === BEHANDLUNG_OFFEN }"
            role="radio"
            :aria-checked="behandlung === BEHANDLUNG_OFFEN"
            @click="behandlung = BEHANDLUNG_OFFEN"
          >
            offen lassen
          </button>
        </div>
        <p class="form-hint">
          {{ behandlung === BEHANDLUNG_OFFEN
            ? 'Er bleibt geplant — du kannst ihn danach verschieben.'
            : 'Er wird als ausgelassen markiert.' }}
        </p>
      </template>

      <ul v-if="fehler.length" class="form-fehler">
        <li v-for="(f, i) in fehler" :key="i">{{ f }}</li>
      </ul>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" :disabled="busy" @click="$emit('abbrechen')">Abbrechen</button>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="speichern">Speichern</button>
      </div>

      <button
        v-if="modus === 'bearbeiten' && kannLoeschen"
        type="button"
        class="btn btn-ghost btn-block"
        @click="loeschenFragen = true"
      >
        Lauf loeschen
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import RunEffortPicker from './RunEffortPicker.vue'
import ZyklusTagFeld from './ZyklusTagFeld.vue'
import { useRunningStore } from '../../stores/running.js'
import { useAuthStore } from '../../stores/auth.js'
import {
  SPONTAN_ARTEN,
  BEHANDLUNG_AUSGELASSEN,
  BEHANDLUNG_OFFEN,
  vorbelegung,
  darfLoeschen
} from '../../utils/laufEintrag.js'
import { leseZyklusEingabe } from '../../utils/zyklusTag.js'
import { getRunType } from '../../utils/runPlanSchema.js'
import { getToday } from '../../utils/dateHelpers.js'

/**
 * Formular fuer selbst eingetragene Laeufe (seit v2.12.0), drei Modi:
 *   'anders'     — aus einem geplanten Lauf heraus: stattdessen anders gelaufen
 *   'bearbeiten' — einen ungeplanten Lauf aendern (oder loeschen)
 *   'neu'        — "+ Lauf eintragen" in der Wochenansicht
 * Regeln in utils/laufEintrag.js. Speichert selbst und meldet 'fertig'.
 */
const props = defineProps({
  modus: { type: String, required: true },
  // Der geplante (anders) bzw. ungeplante (bearbeiten) Lauf.
  lauf: { type: Object, default: null },
  // Nur fuer 'neu': Auswahl der Person und Startwerte.
  personen: { type: Array, default: () => [] },
  startUserId: { type: String, default: '' },
  startDatum: { type: String, default: '' }
})
const emit = defineEmits(['fertig', 'abbrechen'])

const running = useRunningStore()
const authStore = useAuthStore()
const heute = getToday()

const start = props.modus === 'neu'
  ? { ...vorbelegung(null, { heute, modus: 'neu' }), date: props.startDatum || heute }
  : vorbelegung(props.lauf, { heute, modus: props.modus })

const werte = reactive(start)
const userId = ref(props.modus === 'neu' ? props.startUserId : props.lauf?.userId || '')
const behandlung = ref(BEHANDLUNG_AUSGELASSEN)
const fehler = ref([])
const busy = ref(false)
const loeschenFragen = ref(false)

const kannLoeschen = computed(() => darfLoeschen(props.lauf))

const frage = computed(() =>
  props.modus === 'anders' ? 'Was bist du stattdessen gelaufen?' : 'Was bist du gelaufen?'
)

const titelPlatzhalter = computed(() =>
  werte.type ? getRunType(werte.type).label : 'z.B. Lauf mit Freunden'
)

const istZyklusNutzer = computed(() => authStore.users.some(u => u.id === userId.value && u.zyklus))

async function speichern() {
  fehler.value = []
  const zyklus = leseZyklusEingabe(werte.cycleDay)
  if (istZyklusNutzer.value && !zyklus.ok) {
    fehler.value = ['Zyklustag: bitte eine Zahl von 1 bis 45 oder leer lassen.']
    return
  }
  const eingabe = {
    ...werte,
    // Nur die Person mit Zyklus-Erfassung bekommt einen Zyklustag.
    cycleDay: istZyklusNutzer.value ? zyklus.wert : null
  }

  busy.value = true
  try {
    let ergebnis
    if (props.modus === 'anders') ergebnis = await running.ersetzeLauf(props.lauf.id, eingabe, behandlung.value)
    else if (props.modus === 'bearbeiten') ergebnis = await running.bearbeiteLauf(props.lauf.id, eingabe)
    else ergebnis = await running.addSpontanLauf(userId.value, eingabe)
    emit('fertig', ergebnis)
  } catch (e) {
    if (e?.eingabeFehler) {
      fehler.value = e.eingabeFehler
    } else {
      console.error('[FitTrack] [ERROR] Lauf eintragen fehlgeschlagen:', e)
      fehler.value = ['Das hat nicht geklappt. Bitte erneut versuchen.']
    }
  } finally {
    busy.value = false
  }
}

async function loeschen() {
  fehler.value = []
  busy.value = true
  try {
    await running.loescheLauf(props.lauf.id)
    emit('fertig', null)
  } catch (e) {
    console.error('[FitTrack] [ERROR] Lauf loeschen fehlgeschlagen:', e)
    loeschenFragen.value = false
    fehler.value = e?.eingabeFehler || ['Das hat nicht geklappt. Bitte erneut versuchen.']
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.spontan-form {
  margin-top: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.form-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  margin-top: calc(-1 * var(--space-xs));
}

/* Arten als Kacheln: drei je Zeile passen auch auf 360 px. */
.art-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-xs);
}

.art-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 52px;
  padding: var(--space-xs) 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  color: var(--color-text);
}

.art-chip.active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-weight: var(--font-weight-semibold);
}

.art-symbol {
  font-size: var(--font-size-lg);
  line-height: 1;
}

.art-label {
  font-size: var(--font-size-xs);
  text-align: center;
  line-height: 1.2;
}

.personen {
  display: flex;
  gap: var(--space-xs);
}

.person-chip {
  flex: 1;
  min-height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-white);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.person-chip.active {
  border-color: var(--person-color);
  color: var(--person-color);
  font-weight: var(--font-weight-semibold);
  box-shadow: inset 0 0 0 1px var(--person-color);
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

.behandlung {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xs);
}

.behandlung-btn {
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.behandlung-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-weight: var(--font-weight-semibold);
}

.form-fehler {
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: var(--font-size-sm);
  color: var(--color-danger);
}

.form-actions {
  display: flex;
  gap: var(--space-sm);
  margin-top: var(--space-xs);
}

.form-actions .btn {
  flex: 1;
}
</style>
