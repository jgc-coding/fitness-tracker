<template>
  <Modal
    :model-value="modelValue"
    :title="titel"
    @update:model-value="v => emit('update:modelValue', v)"
  >
    <div v-if="exercise" class="detail-content">
      <!-- Grosse Zeichnung: bei zwei Bildern (Start- und Endposition) blendet
           die Anzeige im Wechsel weich ueber (Bewegungs-Eindruck); ein Bild
           steht still. Beide Bilder liegen uebereinander im DOM, damit der
           erste Wechsel nicht auf das Nachladen wartet. -->
      <div v-if="eintrag" class="detail-bild-wrap">
        <img
          v-for="(relativ, i) in eintrag.bilder"
          :key="relativ"
          :src="bildUrl(eintrag, i)"
          alt=""
          class="detail-bild"
          :class="{ sichtbar: i === bildPosition }"
        />
      </div>

      <!-- Muskel-Grafik: primaer/sekundaer aus dem Manifest, ohne
           Manifest-Eintrag die Grobgruppe der Uebung -->
      <div class="detail-map">
        <MuscleMap
          :primary="eintrag?.primaer || []"
          :secondary="eintrag?.sekundaer || []"
          :fallback-group="exercise.muscleGroup || ''"
          :size="170"
        />
      </div>

      <!-- Gemeinsame Uebungs-Notiz (bestehendes notes-Feld, nur Anzeige) -->
      <p v-if="exercise.notes" class="detail-notiz-gemeinsam">{{ exercise.notes }}</p>

      <!-- Notiz je Nutzer (exerciseNotes, Dexie v4): alle drei Nutzer,
           Standard-Nutzer zuoberst, Nutzerfarbe am linken Rand -->
      <h3 class="detail-abschnitt">Persoenliche Notizen</h3>
      <div
        v-for="user in geordneteNutzer"
        :key="user.id"
        class="nutzer-notiz"
        :style="{ borderLeftColor: user.color }"
      >
        <label class="nutzer-notiz-name" :style="{ color: user.color }" :for="'notiz-' + user.id">
          {{ user.name }}
        </label>
        <textarea
          :id="'notiz-' + user.id"
          v-model="notizTexte[user.id]"
          rows="2"
          class="nutzer-notiz-feld"
          :placeholder="'Notiz fuer ' + user.name + '...'"
        ></textarea>
      </div>

      <button class="btn btn-primary btn-block" @click="speichern">
        {{ gespeichertHinweis ? 'Gespeichert' : 'Notizen speichern' }}
      </button>
    </div>
  </Modal>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import Modal from '../shared/Modal.vue'
import MuscleMap from '../shared/MuscleMap.vue'
import { useAuthStore } from '../../stores/auth.js'
import { useExerciseNotes } from '../../composables/useExerciseNotes.js'
import { toTitleCase } from '../../utils/formatters.js'
import { bildUrl, eintragFuerKey } from '../../utils/uebungsBilder.js'
import bildKatalog from '../../data/uebungskatalog.json'

const props = defineProps({
  modelValue: Boolean,
  // Uebungs-Datensatz aus dem Katalog (id, name, notes, imageKey, muscleGroup)
  exercise: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])

const authStore = useAuthStore()
const { loadNotesForExercise, saveNote } = useExerciseNotes()

const titel = computed(() => (props.exercise ? toTitleCase(props.exercise.name) : ''))

// Manifest-Eintrag nur bei gueltigem imageKey — verwaiste Keys zeigen kein Bild
const eintrag = computed(() => eintragFuerKey(bildKatalog, props.exercise?.imageKey))

const bildPosition = ref(0)
let wechselTimer = null

function stopBildwechsel() {
  if (wechselTimer) {
    clearInterval(wechselTimer)
    wechselTimer = null
  }
}

function startBildwechsel() {
  stopBildwechsel()
  bildPosition.value = 0
  const anzahl = eintrag.value?.bilder?.length || 0
  if (anzahl < 2) return
  // "Bewegung reduzieren" im System: Standbild statt Dauer-Animation
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  wechselTimer = setInterval(() => {
    bildPosition.value = (bildPosition.value + 1) % anzahl
  }, 1200)
}

// Alle drei Nutzer, der Standard-Nutzer des Geraets zuoberst
const geordneteNutzer = computed(() => [
  ...authStore.users.filter(u => u.id === authStore.defaultUserId),
  ...authStore.users.filter(u => u.id !== authStore.defaultUserId)
])

const notizTexte = reactive({})
// Zuletzt gespeicherter Stand je Nutzer — nur Geaendertes wird geschrieben,
// unveraenderte Notizen erzeugen sonst unnoetige Cloud-Pushes.
let geladeneTexte = {}
const gespeichertHinweis = ref(false)

async function ladeNotizen() {
  const byUser = await loadNotesForExercise(props.exercise.id)
  geladeneTexte = {}
  for (const user of authStore.users) {
    const text = byUser[user.id]?.text || ''
    notizTexte[user.id] = text
    geladeneTexte[user.id] = text
  }
}

// Schreibt nur geaenderte Notizen (saveNote pusht danach in die Cloud).
// Es wird NIE ein exerciseNotes-Datensatz geloescht — Leeren = text ''.
async function speichereGeaenderte() {
  if (!props.exercise) return
  for (const user of authStore.users) {
    const text = notizTexte[user.id] ?? ''
    if (text !== geladeneTexte[user.id]) {
      await saveNote(props.exercise.id, user.id, text)
      geladeneTexte[user.id] = text
    }
  }
}

async function speichern() {
  await speichereGeaenderte()
  gespeichertHinweis.value = true
  setTimeout(() => {
    gespeichertHinweis.value = false
  }, 1500)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.exercise) {
      gespeichertHinweis.value = false
      ladeNotizen()
      startBildwechsel()
    } else {
      stopBildwechsel()
      // Schliessen (auch per Android-Back) sichert ungespeicherte Aenderungen
      speichereGeaenderte()
    }
  }
)

onUnmounted(stopBildwechsel)
</script>

<style scoped>
.detail-bild-wrap {
  position: relative;
  height: 240px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-md);
}

/* Bilder uebereinander, nur das aktive sichtbar — die Opacity-Transition
   ergibt die weiche Ueberblendung. top/left statt inset (alte WebViews). */
.detail-bild {
  position: absolute;
  top: 8px;
  left: 8px;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  object-fit: contain;
  opacity: 0;
  transition: opacity 0.45s ease-in-out;
}

.detail-bild.sichtbar {
  opacity: 1;
}

.detail-map {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-md);
}

.detail-notiz-gemeinsam {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  font-style: italic;
  margin-bottom: var(--space-md);
  line-height: 1.5;
}

.detail-abschnitt {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-light);
  margin-bottom: var(--space-sm);
}

.nutzer-notiz {
  border-left: 3px solid;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-bg);
  padding: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.nutzer-notiz-name {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-xs);
}

.nutzer-notiz-feld {
  width: 100%;
  padding: var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  font-family: inherit;
  background: var(--color-white);
  resize: vertical;
}

.nutzer-notiz-feld:focus {
  outline: none;
  border-color: var(--color-accent);
}
</style>
