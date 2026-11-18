<template>
  <Modal
    :model-value="modelValue"
    :title="titel"
    @update:model-value="v => emit('update:modelValue', v)"
  >
    <!-- Verlauf (seit v2.8): ersetzt den Inhalt, bis "Zurueck zur Uebung" -->
    <div v-if="exercise && ansicht === 'verlauf'" ref="inhaltEl" class="detail-content">
      <button type="button" class="btn btn-ghost detail-zurueck" @click="zeigeAnsicht('uebung')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        Zurueck zur Uebung
      </button>
      <UebungsVerlauf :exercise-id="exercise.id" :start-user-id="verlaufStartNutzer" />
    </div>

    <!-- Wdh-Bereich aendern (v2.17.0): Unteransicht statt zweitem Modal -->
    <div v-else-if="exercise && ansicht === 'bereich' && entwurf" ref="inhaltEl" class="detail-content">
      <button type="button" class="btn btn-ghost detail-zurueck" @click="bereichFertig">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        Zurueck zur Uebung
      </button>
      <h3 class="detail-abschnitt bereich-titel" :style="{ color: entwurfNutzer?.color }">
        Wdh-Bereich fuer {{ entwurfNutzer?.name }}
      </h3>
      <p class="bereich-erklaerung">
        Erreicht die Person in allen Saetzen die obere Zahl, erinnert die App ans Steigern.
      </p>
      <div class="bereich-raeder">
        <WheelPicker v-model="entwurf.min" :values="WDH_WERTE" label="Von" unit="Wdh" />
        <WheelPicker v-model="entwurf.max" :values="WDH_WERTE" label="Bis" unit="Wdh" />
      </div>
      <p v-if="!entwurfGueltig" class="bereich-fehler" role="alert">
        Die erste Zahl muss kleiner sein als die zweite.
      </p>
      <button class="btn btn-primary btn-block" :disabled="!entwurfGueltig" @click="bereichFertig">
        Bereich speichern
      </button>
    </div>

    <div v-else-if="exercise" ref="inhaltEl" class="detail-content">
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

      <button type="button" class="btn btn-secondary btn-block detail-verlauf-knopf" @click="zeigeAnsicht('verlauf')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>
        Verlauf ansehen
      </button>

      <!-- Muskel-Grafik: primaer/sekundaer aus dem Manifest, ohne
           Manifest-Eintrag die Grobgruppe der Uebung. 240 px breit: die
           KI-Figur (seit v2.6.0) braucht mehr Platz als die alten Flaechen -->
      <div class="detail-map">
        <MuscleMap
          :primary="eintrag?.primaer || []"
          :secondary="eintrag?.sekundaer || []"
          :fallback-group="exercise.muscleGroup || ''"
          :size="240"
        />
      </div>

      <!-- Wdh-Bereich je Person (v2.17.0, gesynct): gespeichert oder 8-12.
           Tipp oeffnet die Raeder als Unteransicht -->
      <h3 class="detail-abschnitt">Wdh-Bereich</h3>
      <div class="bereich-liste">
        <button
          v-for="user in geordneteNutzer"
          :key="user.id"
          type="button"
          class="bereich-zeile"
          :style="{ borderLeftColor: user.color }"
          :aria-label="`Wdh-Bereich fuer ${user.name}: ${bereichText(user.id)} Wdh, aendern`"
          @click="oeffneBereich(user.id)"
        >
          <span class="bereich-name" :style="{ color: user.color }">{{ user.name }}</span>
          <span class="bereich-wert">
            Wdh-Bereich {{ bereichText(user.id) }}
            <span v-if="!bereiche[user.id]?.gespeichert" class="bereich-standard">Standard</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
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
import { ref, reactive, computed, watch, onUnmounted, nextTick } from 'vue'
import Modal from '../shared/Modal.vue'
import MuscleMap from '../shared/MuscleMap.vue'
import UebungsVerlauf from './UebungsVerlauf.vue'
import WheelPicker from '../shared/WheelPicker.vue'
import { ladeWdhBereiche, speichereWdhBereich } from '../../composables/useWdhBereich.js'
import { STANDARD_BEREICH, WDH_GRENZEN, wdhBereichGueltig } from '../../utils/steigerung.js'
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

// Uebung oder Verlauf. Bewusst KEIN zweites Modal: zwei offene Modals
// lauschen beide auf Android-Zurueck und gingen gemeinsam zu.
const ansicht = ref('uebung')
const inhaltEl = ref(null)

function zeigeAnsicht(neu) {
  ansicht.value = neu
  // Der Modal-Koerper scrollt — die neue Ansicht beginnt oben
  nextTick(() => {
    const koerper = inhaltEl.value?.closest('.modal-body')
    if (koerper) koerper.scrollTop = 0
  })
}

// Verlauf zuerst fuer den Standard-Nutzer, wenn er mittrainiert — sonst fuer
// den ersten, der trainiert (die Kreise im Verlauf schalten um)
const verlaufStartNutzer = computed(() =>
  authStore.activeUserIds.includes(authStore.defaultUserId)
    ? authStore.defaultUserId
    : authStore.activeUserIds[0] || authStore.defaultUserId
)

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

// Wdh-Bereich je Person (v2.17.0). Lesen und Schreiben NUR ueber
// composables/useWdhBereich.js — dieselben Funktionen nutzt die Karte.
const WDH_WERTE = Array.from(
  { length: WDH_GRENZEN.max - WDH_GRENZEN.min + 1 },
  (_, i) => WDH_GRENZEN.min + i
)
const bereiche = ref({})
// Offene Unteransicht: { userId, min, max }, sonst null
const entwurf = ref(null)
// Die Uebung, fuer die der Entwurf gilt — wechselt die Uebung, bevor er
// gesichert ist, landet er trotzdem bei der richtigen
let entwurfUebung = null

const entwurfNutzer = computed(() => authStore.users.find(u => u.id === entwurf.value?.userId) || null)
const entwurfGueltig = computed(() => Boolean(entwurf.value && wdhBereichGueltig(entwurf.value)))

function bereichText(userId) {
  const b = bereiche.value[userId] || STANDARD_BEREICH
  return `${b.min}-${b.max}`
}

async function ladeBereiche() {
  const exerciseId = props.exercise?.id
  if (!exerciseId) return
  const geladen = await ladeWdhBereiche(authStore.users.map(u => u.id), exerciseId)
  // Inzwischen eine andere Uebung offen: nichts Fremdes anzeigen
  if (props.exercise?.id === exerciseId) bereiche.value = geladen
}

function oeffneBereich(userId) {
  const b = bereiche.value[userId] || STANDARD_BEREICH
  entwurf.value = { userId, min: b.min, max: b.max }
  entwurfUebung = props.exercise?.id || null
  zeigeAnsicht('bereich')
}

// Sichert den Entwurf, wenn er gueltig ist und sich etwas geaendert hat.
// Ein ungueltiger Entwurf (min nicht kleiner als max) wird nie geschrieben.
async function sichereEntwurf() {
  const e = entwurf.value
  const exerciseId = entwurfUebung
  entwurf.value = null
  entwurfUebung = null
  if (!e || !exerciseId) return
  const bereich = wdhBereichGueltig(e)
  if (!bereich) return
  const alt = bereiche.value[e.userId]
  if (alt?.gespeichert && alt.min === bereich.min && alt.max === bereich.max) return
  // Unveraendert 8-12 ohne Eintrag: kein Schreiben, bleibt Standard
  if (!alt?.gespeichert && bereich.min === STANDARD_BEREICH.min && bereich.max === STANDARD_BEREICH.max) return
  const ok = await speichereWdhBereich(e.userId, exerciseId, bereich)
  if (ok && props.exercise?.id === exerciseId) {
    bereiche.value = { ...bereiche.value, [e.userId]: { ...bereich, gespeichert: true } }
  }
}

async function bereichFertig() {
  await sichereEntwurf()
  zeigeAnsicht('uebung')
}

watch(
  () => props.modelValue,
  (open) => {
    if (open && props.exercise) {
      ansicht.value = 'uebung'
      entwurf.value = null
      entwurfUebung = null
      gespeichertHinweis.value = false
      bereiche.value = {}
      ladeNotizen()
      ladeBereiche()
      startBildwechsel()
    } else {
      stopBildwechsel()
      // Schliessen (auch per Android-Back) sichert ungespeicherte Aenderungen
      speichereGeaenderte()
      sichereEntwurf()
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

.detail-verlauf-knopf {
  margin-bottom: var(--space-md);
}

.detail-zurueck {
  margin: calc(-1 * var(--space-sm)) 0 var(--space-sm) calc(-1 * var(--space-sm));
  padding-left: var(--space-xs);
  gap: 2px;
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

.bereich-liste {
  margin-bottom: var(--space-md);
}

.bereich-zeile {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  min-height: 44px;
  padding: var(--space-sm);
  margin-bottom: var(--space-xs);
  border: none;
  border-left: 3px solid;
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  background: var(--color-bg);
  font-family: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
}

.bereich-name {
  flex: 0 0 72px;
  min-width: 0;
  font-weight: var(--font-weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bereich-wert {
  flex: 1;
  min-width: 0;
}

.bereich-standard {
  margin-left: var(--space-xs);
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-muted);
}

.bereich-titel {
  margin-top: var(--space-xs);
}

.bereich-erklaerung {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: var(--space-md);
}

.bereich-raeder {
  display: flex;
  justify-content: center;
  gap: var(--space-lg, 24px);
  margin-bottom: var(--space-md);
}

.bereich-fehler {
  font-size: var(--font-size-sm);
  color: var(--color-accent);
  text-align: center;
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
