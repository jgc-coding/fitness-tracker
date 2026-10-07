<template>
  <div v-if="zyklusUser" class="zyklus">
    <div class="zyklus-zeile">
      <label class="zyklus-label" :for="feldId">Zyklustag</label>
      <div class="zyklus-stepper">
        <button type="button" class="step-btn" aria-label="Einen Tag weniger" @click="schritt(-1)">−</button>
        <input
          :id="feldId"
          :value="modelValue ?? ''"
          type="text"
          inputmode="numeric"
          maxlength="2"
          class="zyklus-input"
          :class="{ ungueltig: !gueltig }"
          placeholder="–"
          @input="eingabe($event.target.value)"
        />
        <button type="button" class="step-btn" aria-label="Einen Tag mehr" @click="schritt(1)">+</button>
      </div>
    </div>
    <p class="zyklus-hint" :class="{ fehler: !gueltig }">
      {{ hinweis }}
      <button v-if="hatWert" type="button" class="zyklus-leeren" @click="leeren">entfernen</button>
    </p>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import { errechneZyklustagFuer } from '../../composables/useZyklusTag.js'
import { leseZyklusEingabe, ZYKLUS_MAX } from '../../utils/zyklusTag.js'
import { formatDayShort } from '../../utils/dateHelpers.js'

/**
 * Zyklustag am Lauf (seit v2.12.0), nur fuer die Person mit `zyklus: true`.
 * v-model ist der Rohwert des Feldes (Zahl, Text oder leer); das Formular
 * prueft ihn beim Speichern mit `leseZyklusEingabe`.
 *
 * Ist noch nichts gespeichert, setzt das Feld den ERRECHNETEN Tag ein und
 * sagt, woraus er stammt. Gespeichert wird er erst mit dem Formular — also
 * nur, was die Person gesehen hat.
 */
const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  userId: { type: String, default: '' },
  date: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const zyklusUser = computed(() => authStore.users.find(u => u.id === props.userId && u.zyklus) || null)

const feldId = `zyklus-${Math.random().toString(36).slice(2, 8)}`

// Woher der Wert im Feld stammt: 'gespeichert' (aus dem Lauf), 'errechnet',
// 'eigen' (getippt) oder null (leer und nichts errechenbar).
const quelle = ref(null)
const vorschlag = ref(null)

const gueltig = computed(() => leseZyklusEingabe(props.modelValue).ok)
const hatWert = computed(() => props.modelValue !== null && props.modelValue !== '')

const hinweis = computed(() => {
  if (!gueltig.value) return `Bitte eine Zahl von 1 bis ${ZYKLUS_MAX} oder leer lassen.`
  const basis = vorschlag.value?.basis
  const herkunft = basis ? `errechnet aus Tag ${basis.day} am ${formatDayShort(basis.date)}` : ''
  // Das Datum endet schon auf einen Punkt ("01.10.").
  if (quelle.value === 'errechnet' && herkunft) return herkunft
  if (quelle.value === 'eigen' && vorschlag.value && Number(props.modelValue) !== vorschlag.value.tag) {
    return `Korrigiert — errechnet waere Tag ${vorschlag.value.tag}.`
  }
  if (quelle.value === 'gespeichert') return 'Eingetragen. Optional.'
  if (!hatWert.value) return 'Kein Eintrag in der Naehe zum Rechnen. Optional.'
  return 'Optional.'
})

async function rechne() {
  if (!zyklusUser.value || !props.date) {
    vorschlag.value = null
    return
  }
  const fuer = `${props.userId}|${props.date}`
  const ergebnis = await errechneZyklustagFuer(props.userId, props.date)
  // Hat sich Person oder Tag inzwischen geaendert, gilt ein neuerer Aufruf.
  if (fuer !== `${props.userId}|${props.date}`) return
  vorschlag.value = ergebnis
  if (quelle.value === 'gespeichert' || quelle.value === 'eigen') return
  quelle.value = ergebnis ? 'errechnet' : null
  emit('update:modelValue', ergebnis ? ergebnis.tag : null)
}

onMounted(() => {
  quelle.value = hatWert.value ? 'gespeichert' : null
  rechne()
})

// Anderer Tag oder andere Person im Formular: neu rechnen (ein getippter
// oder gespeicherter Wert bleibt stehen).
watch(() => [props.userId, props.date], rechne)

function eingabe(text) {
  quelle.value = 'eigen'
  emit('update:modelValue', text)
}

function schritt(richtung) {
  const aktuell = leseZyklusEingabe(props.modelValue)
  const basis = aktuell.ok && aktuell.wert !== null ? aktuell.wert : (vorschlag.value?.tag ?? (richtung > 0 ? 0 : 2))
  const neu = Math.min(ZYKLUS_MAX, Math.max(1, basis + richtung))
  quelle.value = 'eigen'
  emit('update:modelValue', neu)
}

function leeren() {
  quelle.value = 'eigen'
  emit('update:modelValue', null)
}
</script>

<style scoped>
.zyklus {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.zyklus-zeile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
}

.zyklus-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.zyklus-stepper {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.step-btn {
  width: 44px;
  height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  color: var(--color-text);
  font-size: var(--font-size-lg);
  line-height: 1;
}

.zyklus-input {
  width: 56px;
  height: 44px;
  text-align: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
  background: var(--color-white);
  color: var(--color-text);
}

.zyklus-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.zyklus-input.ungueltig {
  border-color: var(--color-danger);
}

.zyklus-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.zyklus-hint.fehler {
  color: var(--color-danger);
}

.zyklus-leeren {
  margin-left: var(--space-xs);
  color: var(--color-accent);
  font-size: var(--font-size-xs);
  text-decoration: underline;
  min-height: 0;
  padding: 0;
}
</style>
