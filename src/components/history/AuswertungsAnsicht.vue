<template>
  <!-- Auswertung mehrerer Uebungen (History -> Auswertung, v2.15.0, Wunsch
       Gabriel 12.11.2026): Zeitraum frei waehlbar, Auswahl "Alle" (jede
       Uebung mit mindestens zwei Eintraegen im Zeitraum), je Workout aus dem
       aktiven Plan (Push/Pull/Legs, gleicher Name vor der Klammer = eine
       Gruppe) oder eine eigene Mehrfachauswahl. Oben die Rangliste der
       Veraenderung (Gewicht oder 1RM), darunter je Uebung ein kleines
       Diagramm mit Gewicht und 1RM auf derselben Zeitachse. Ein Diagramm mit
       vielen Linien waere ab fuenf Uebungen unlesbar — darum kleine Vielfache.
       Regeln: utils/auswertung.js, Vertrag scripts/auswertung-test.mjs. -->
  <div class="auswertung">
    <!-- Filter: alles oben, nichts in den Karten -->
    <div class="aw-segment" role="radiogroup" aria-label="Zeitraum">
      <button
        v-for="z in AUSWERTUNG_ZEITRAEUME"
        :key="z.key"
        type="button"
        role="radio"
        class="aw-segment-knopf"
        :class="{ 'is-aktiv': z.key === einst.zeitraum }"
        :aria-checked="z.key === einst.zeitraum"
        @click="waehleZeitraum(z.key)"
      >{{ z.label }}</button>
    </div>

    <div v-if="einst.zeitraum === 'frei'" class="aw-frei">
      <label class="aw-datum">
        <span>Von</span>
        <input v-model="einst.freiVon" type="date" :max="heute" />
      </label>
      <label class="aw-datum">
        <span>Bis</span>
        <input v-model="einst.freiBis" type="date" :max="heute" />
      </label>
    </div>

    <div class="aw-chips" role="radiogroup" aria-label="Welche Übungen">
      <button
        v-for="c in auswahlChips"
        :key="c.key"
        type="button"
        role="radio"
        class="aw-chip"
        :class="{ 'is-aktiv': c.key === einst.auswahl }"
        :aria-checked="c.key === einst.auswahl"
        :style="{ '--user-color': farbe }"
        @click="waehleAuswahl(c.key)"
      >{{ c.label }}</button>
    </div>

    <p v-if="ladeFehler" class="aw-leer">
      Die Auswertung ließ sich nicht laden. Bitte die History schließen und neu öffnen.
      <small class="aw-diagnose">Technische Ursache: {{ ladeFehler }}</small>
    </p>
    <p v-else-if="!geladen" class="aw-leer">Lade ...</p>
    <p v-else-if="grenzen.fehler" class="aw-leer">{{ grenzen.fehler }}</p>
    <p v-else-if="punkteAlleZeit.size === 0" class="aw-leer">
      Noch keine Einträge für {{ nutzerName }}.
    </p>
    <div v-else-if="ids.length === 0" class="aw-leer">
      <p v-if="einst.auswahl === 'eigene'">Noch keine Übung gewählt.</p>
      <p v-else>Keine Übung mit mindestens zwei Einträgen in diesem Zeitraum.</p>
      <button v-if="einst.auswahl === 'eigene'" type="button" class="btn btn-secondary" @click="oeffneEigene">Übungen wählen</button>
      <button v-else-if="einst.zeitraum !== 'alle'" type="button" class="btn btn-secondary" @click="waehleZeitraum('alle')">Ganzen Zeitraum zeigen</button>
    </div>

    <template v-else>
      <!-- Rangliste: wo ging es am meisten voran? Tipp springt zur Karte -->
      <section class="aw-abschnitt">
        <div class="aw-kopf">
          <div>
            <h3 class="aw-titel">Veränderung im Zeitraum</h3>
            <p class="aw-untertitel">{{ zusammenfassung }}</p>
          </div>
          <div class="aw-segment aw-segment-klein" role="radiogroup" aria-label="Messgröße">
            <button
              v-for="m in MODI"
              :key="m.key"
              type="button"
              role="radio"
              class="aw-segment-knopf"
              :class="{ 'is-aktiv': m.key === einst.modus }"
              :aria-checked="m.key === einst.modus"
              @click="einst.modus = m.key"
            >{{ m.label }}</button>
          </div>
        </div>
        <ul class="aw-rang">
          <li v-for="z in rang" :key="z.id">
            <button type="button" class="aw-rang-zeile" @click="springeZu(z.id)">
              <span class="aw-rang-text">
                <span class="aw-rang-name">{{ z.name }}</span>
                <span class="aw-rang-detail">{{ rangDetail(z) }}</span>
              </span>
              <span class="aw-rang-spur" aria-hidden="true">
                <span class="aw-rang-null" :style="{ left: skala.nullLinie + '%' }"></span>
                <span
                  v-if="z.balken.breite > 0"
                  class="aw-rang-balken"
                  :class="{ minus: z.v && z.v.diff < 0 }"
                  :style="{ left: z.balken.links + '%', width: z.balken.breite + '%', '--user-color': farbe }"
                ></span>
              </span>
              <span class="aw-rang-prozent">{{ z.v ? (z.v.prozent !== null ? prozentText(z.v.prozent) : diffText(z.v.diff, z.v.einheit)) : '–' }}</span>
            </button>
          </li>
        </ul>
      </section>

      <!-- Kleine Diagramme: gleiche Zeitachse, je eigene Wert-Achse -->
      <section class="aw-abschnitt">
        <div class="aw-legende">
          <span class="aw-legende-eintrag">
            <svg width="24" height="10" viewBox="0 0 24 10" aria-hidden="true">
              <line x1="1" y1="5" x2="23" y2="5" class="aw-legende-linie" :style="{ stroke: farbe }" />
              <circle cx="12" cy="5" r="3" :style="{ fill: farbe }" />
            </svg>
            Gewicht (schwerster Satz)
          </span>
          <span class="aw-legende-eintrag">
            <svg width="24" height="10" viewBox="0 0 24 10" aria-hidden="true">
              <line x1="1" y1="5" x2="23" y2="5" class="aw-legende-linie aw-legende-1rm" :style="{ stroke: farbe }" />
            </svg>
            geschätztes 1RM
          </span>
        </div>
        <article v-for="z in karten" :id="'aw-karte-' + z.id" :key="z.id" class="card aw-karte">
          <header class="aw-karte-kopf">
            <h4 class="aw-karte-name">{{ z.name }}</h4>
            <button type="button" class="aw-karte-verlauf" @click="oeffneVerlauf(z.id)">Verlauf ›</button>
          </header>
          <VerlaufMini
            v-if="z.punkte.length > 0"
            :punkte="z.punkte"
            :von="xVon"
            :bis="grenzen.bis"
            :farbe="farbe"
            :name="z.name"
          />
          <p v-else class="aw-karte-leer">Keine Einträge in diesem Zeitraum.</p>
        </article>
      </section>
    </template>

    <!-- Eigene Auswahl: Uebungen mit Eintraegen dieser Person, nach Muskelgruppe -->
    <Modal v-model="showEigene" title="Übungen wählen">
      <div v-for="g in eigeneListe" :key="g.id" class="aw-wahl-gruppe">
        <h4 class="aw-wahl-titel">{{ g.label }}</h4>
        <label v-for="u in g.uebungen" :key="u.id" class="aw-wahl-zeile">
          <input type="checkbox" :checked="eigeneSet.has(u.id)" @change="schalteEigene(u.id)" />
          <span class="aw-wahl-name">{{ u.name }}</span>
          <span class="aw-wahl-anzahl">{{ u.tage }} {{ u.tage === 1 ? 'Tag' : 'Tage' }}</span>
        </label>
      </div>
      <p v-if="eigeneListe.length === 0" class="aw-leer">Noch keine Einträge für {{ nutzerName }}.</p>
      <div class="aw-wahl-knoepfe">
        <button type="button" class="btn btn-secondary" :disabled="einst.eigene.length === 0" @click="einst.eigene = []">Keine</button>
        <button type="button" class="btn btn-primary" @click="showEigene = false">Fertig ({{ einst.eigene.length }})</button>
      </div>
    </Modal>

    <!-- Einzelverlauf wie in der Uebungs-Detailansicht -->
    <Modal v-model="showVerlauf" :title="verlaufName">
      <UebungsVerlauf v-if="verlaufId" :key="verlaufId" :exercise-id="verlaufId" :start-user-id="userId" />
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import Modal from '../shared/Modal.vue'
import VerlaufMini from './VerlaufMini.vue'
import UebungsVerlauf from '../tracking/UebungsVerlauf.vue'
import { db } from '../../db/dexie.js'
import { useAuthStore } from '../../stores/auth.js'
import { usePlansStore } from '../../stores/plans.js'
import { useExercises } from '../../composables/useExercises.js'
import { MUSCLE_GROUPS } from '../../utils/constants.js'
import { toTitleCase } from '../../utils/formatters.js'
import { getToday } from '../../utils/dateHelpers.js'
import { formatZahl } from '../../utils/verlauf.js'
import {
  AUSWERTUNG_ZEITRAEUME, zeitraumGrenzen, workoutGruppen, gruppenUebungen, punkteJeUebung,
  sortiereUebungen, auswahlIds, veraenderung, rangliste, balkenSkala, balken, prozentText,
  diffText, einstellungenAus
} from '../../utils/auswertung.js'

const props = defineProps({
  userId: { type: String, required: true }
})

const MODI = [
  { key: 'weight', label: 'Gewicht' },
  { key: 'e1rm', label: '1RM' }
]
const GRUPPEN_REIHENFOLGE = MUSCLE_GROUPS.map(m => m.id)

const authStore = useAuthStore()
const plansStore = usePlansStore()
const { exercises, loadExercises, getExerciseById } = useExercises()

const heute = getToday()
const nutzer = computed(() => authStore.users.find(u => u.id === props.userId))
const nutzerName = computed(() => nutzer.value?.name || '')
const farbe = computed(() => nutzer.value?.color || 'var(--color-accent)')

// --- Gemerkte Einstellungen (pro Geraet, wie der Standard-Nutzer) ----------
const SPEICHER_KEY = `${db.name}:auswertung`
function ladeEinstellungen() {
  try {
    return einstellungenAus(localStorage.getItem(SPEICHER_KEY))
  } catch {
    return einstellungenAus(null)
  }
}
const einst = reactive(ladeEinstellungen())
watch(einst, () => {
  try {
    localStorage.setItem(SPEICHER_KEY, JSON.stringify(einst))
  } catch {
    // Privater Modus o. ae.: die Ansicht funktioniert trotzdem, nur ohne Merken
  }
}, { deep: true })

// --- Daten -------------------------------------------------------------------
const saetze = ref([])
const logs = ref([])
const geladen = ref(false)
const ladeFehler = ref('')

async function lade() {
  geladen.value = false
  ladeFehler.value = ''
  try {
    if (exercises.value.length === 0) await loadExercises()
    if (plansStore.plans.length === 0) await plansStore.loadPlans()
    saetze.value = await db.setLogs.toArray()
    logs.value = await db.workoutLogs.toArray()
  } catch (e) {
    console.error('[Fitness Tracker] [ERROR] Auswertung nicht ladbar:', e)
    ladeFehler.value = `${e?.name || 'Fehler'} beim Lesen der Datenbank`
  }
  geladen.value = true
}

onMounted(lade)

// --- Zeitraum ------------------------------------------------------------------
const grenzen = computed(() => zeitraumGrenzen(einst.zeitraum, heute, einst.freiVon, einst.freiBis))

// Zeitachse der kleinen Diagramme: bei "Alle" ab dem ersten Eintrag ueberhaupt
// unter den gezeigten Uebungen, sonst ab dem Beginn des Zeitraums
const xVon = computed(() => {
  if (grenzen.value.von) return grenzen.value.von
  let erster = null
  for (const z of karten.value) {
    const d = z.punkte[0]?.date
    if (d && (!erster || d < erster)) erster = d
  }
  return erster
})

function waehleZeitraum(key) {
  // Beim ersten Wechsel auf "Frei" mit dem bisherigen Zeitraum vorbelegen
  if (key === 'frei' && (!einst.freiVon || !einst.freiBis)) {
    const bisher = grenzen.value
    einst.freiVon = bisher.von || ersterTag.value || heute
    einst.freiBis = bisher.bis || heute
  }
  einst.zeitraum = key
}

// --- Auswahl -------------------------------------------------------------------
const punkte = computed(() => (grenzen.value.fehler ? new Map() : punkteJeUebung(saetze.value, props.userId, grenzen.value.von, grenzen.value.bis)))
const punkteAlleZeit = computed(() => punkteJeUebung(saetze.value, props.userId))

const ersterTag = computed(() => {
  let erster = null
  for (const liste of punkteAlleZeit.value.values()) {
    if (liste[0] && (!erster || liste[0].date < erster)) erster = liste[0].date
  }
  return erster
})

const gruppen = computed(() => {
  const plan = plansStore.activePlan
  return plan ? workoutGruppen(plansStore.getDaysForPlan(plan.id)) : []
})

const gruppenIds = computed(() => {
  const ergebnis = {}
  for (const g of gruppen.value) ergebnis[g.key] = gruppenUebungen(g, logs.value, saetze.value, props.userId)
  return ergebnis
})

const reihenfolge = computed(() => sortiereUebungen(exercises.value, GRUPPEN_REIHENFOLGE))

const auswahlChips = computed(() => [
  { key: 'alle', label: 'Alle' },
  ...gruppen.value.map(g => ({ key: g.key, label: g.label })),
  { key: 'eigene', label: einst.eigene.length ? `Eigene (${einst.eigene.length})` : 'Eigene …' }
])

// Gemerkte Workout-Gruppe gibt es im aktiven Plan nicht mehr: sichtbar
// zurueck auf "Alle" (der Chip zeigt es), erst wenn der Plan geladen ist
watch([geladen, gruppen], () => {
  if (!geladen.value || ladeFehler.value) return
  if (!auswahlChips.value.some(c => c.key === einst.auswahl)) einst.auswahl = 'alle'
})

function waehleAuswahl(key) {
  einst.auswahl = key
  if (key === 'eigene') oeffneEigene()
}

const ids = computed(() => {
  const roh = auswahlIds(einst.auswahl, {
    alle: reihenfolge.value,
    punkte: punkte.value,
    gruppenIds: gruppenIds.value,
    eigene: einst.eigene
  })
  // Eigene Auswahl in derselben Ordnung wie "Alle" (Muskelgruppe, Name)
  if (einst.auswahl !== 'eigene') return roh
  const gewaehlt = new Set(roh)
  const bekannt = reihenfolge.value.filter(id => gewaehlt.has(id))
  return [...bekannt, ...roh.filter(id => !bekannt.includes(id))]
})

function uebungsName(id) {
  const name = getExerciseById(id)?.name
  return name ? toTitleCase(name) : 'Unbekannte Übung'
}

const karten = computed(() => ids.value.map(id => ({
  id,
  name: uebungsName(id),
  punkte: punkte.value.get(id) || []
})))

// --- Rangliste -----------------------------------------------------------------
const zeilen = computed(() => karten.value.map(k => ({ ...k, v: veraenderung(k.punkte, einst.modus) })))
const skala = computed(() => {
  const s = balkenSkala(zeilen.value.map(z => z.v?.prozent))
  return { ...s, nullLinie: balken(0, s).nullLinie }
})
const rang = computed(() => rangliste(zeilen.value).map(z => ({ ...z, balken: balken(z.v?.prozent, skala.value) })))

const zusammenfassung = computed(() => {
  const mitWert = zeilen.value.filter(z => z.v)
  const hoch = mitWert.filter(z => z.v.diff > 0).length
  const runter = mitWert.filter(z => z.v.diff < 0).length
  if (mitWert.length === 0) return 'Erster gegen letzten Trainingstag'
  const teile = [`${hoch} von ${mitWert.length} gesteigert`]
  if (runter > 0) teile.push(`${runter} gesunken`)
  return teile.join(', ') + ' · erster gegen letzten Tag'
})

function rangDetail(z) {
  if (!z.v) return z.punkte.length === 1 ? 'nur 1 Tag' : 'keine Werte'
  // 1RM ist eine Schaetzung: ganze kg
  const f = (w) => formatZahl(einst.modus === 'e1rm' && z.v.einheit === 'kg' ? Math.round(w) : w)
  return `${f(z.v.start)} → ${f(z.v.ende)} ${z.v.einheit}`
}

function springeZu(id) {
  const el = document.getElementById('aw-karte-' + id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// --- Eigene Auswahl --------------------------------------------------------------
const showEigene = ref(false)
const eigeneSet = computed(() => new Set(einst.eigene))

function oeffneEigene() {
  showEigene.value = true
}

function schalteEigene(id) {
  einst.eigene = eigeneSet.value.has(id) ? einst.eigene.filter(x => x !== id) : [...einst.eigene, id]
}

// Uebungen mit Eintraegen dieser Person (ganze Zeit) plus schon gewaehlte,
// gruppiert nach Muskelgruppe
const eigeneListe = computed(() => {
  const mitDaten = new Set([...punkteAlleZeit.value.keys(), ...einst.eigene])
  const liste = exercises.value.filter(e => mitDaten.has(e.id))
  const gruppenListe = []
  for (const g of [...MUSCLE_GROUPS, { id: null, label: 'Sonstige' }]) {
    const uebungen = liste
      .filter(e => (g.id === null ? !GRUPPEN_REIHENFOLGE.includes(e.muscleGroup) : e.muscleGroup === g.id))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), 'de', { sensitivity: 'base' }))
      .map(e => ({ id: e.id, name: toTitleCase(e.name), tage: punkteAlleZeit.value.get(e.id)?.length || 0 }))
    if (uebungen.length > 0) gruppenListe.push({ id: g.id || 'sonstige', label: g.label, uebungen })
  }
  return gruppenListe
})

// --- Einzelverlauf -----------------------------------------------------------
const showVerlauf = ref(false)
const verlaufId = ref(null)
const verlaufName = computed(() => (verlaufId.value ? uebungsName(verlaufId.value) : ''))

async function oeffneVerlauf(id) {
  verlaufId.value = id
  await nextTick()
  showVerlauf.value = true
}
</script>

<style scoped>
/* Segment-Schalter wie im Einzelverlauf */
.aw-segment {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-sm);
}

.aw-segment-knopf {
  flex: 1;
  min-height: 40px;
  padding: 0 4px;
  border: none;
  border-radius: calc(var(--radius-sm) - 2px);
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
  white-space: nowrap;
  transition: background-color 0.15s, color 0.15s;
}

.aw-segment-knopf.is-aktiv {
  background: var(--color-white);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
}

.aw-segment-klein {
  flex: 0 0 auto;
  margin-bottom: 0;
}

.aw-segment-klein .aw-segment-knopf {
  min-height: 34px;
  padding: 0 10px;
}

.aw-frei {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.aw-datum {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.aw-datum input {
  width: 100%;
  min-height: 40px;
  padding: 0 var(--space-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

/* Auswahl als Chips, umbrechend */
.aw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
  margin-bottom: var(--space-md);
}

.aw-chip {
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-white);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
}

.aw-chip.is-aktiv {
  border-color: var(--user-color);
  background: var(--user-color);
  color: var(--color-white);
}

.aw-leer {
  padding: var(--space-lg) 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  line-height: 1.5;
}

.aw-leer .btn {
  margin-top: var(--space-sm);
}

.aw-diagnose {
  display: block;
  margin-top: var(--space-xs);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.aw-abschnitt {
  margin-bottom: var(--space-lg);
}

.aw-kopf {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}

.aw-titel {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.aw-untertitel {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

/* Rangliste: Name (darunter Start -> Ende) | Balken | Prozent. Feste
   Spaltenbreiten, sonst stehen die Balken je Zeile woanders. */
.aw-rang {
  list-style: none;
  margin: 0;
  padding: 0;
}

.aw-rang-zeile {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px 60px;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  min-height: 48px;
  padding: 4px 0;
  border: none;
  border-bottom: 1px solid var(--color-border);
  background: transparent;
  text-align: left;
}

.aw-rang-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.aw-rang-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.aw-rang-spur {
  position: relative;
  height: 10px;
}

.aw-rang-null {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: var(--color-text-muted);
}

.aw-rang-balken {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 0 4px 4px 0;
  background: var(--user-color);
}

/* Rueckgang: nach links, blasser — die Richtung traegt die Aussage */
.aw-rang-balken.minus {
  border-radius: 4px 0 0 4px;
  opacity: 0.45;
}

.aw-rang-prozent {
  text-align: right;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  white-space: nowrap;
}

.aw-rang-detail {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.aw-legende {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  margin-bottom: var(--space-sm);
}

.aw-legende-eintrag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.aw-legende-linie {
  stroke-width: 2;
}

.aw-legende-1rm {
  stroke-dasharray: 5 4;
}

.aw-karte {
  margin-bottom: var(--space-sm);
  /* Sprung aus der Rangliste: Karte nicht unter der Kopfleiste */
  scroll-margin-top: 72px;
}

.aw-karte-kopf {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
  margin-bottom: 2px;
}

.aw-karte-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.aw-karte-verlauf {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 var(--space-xs);
  border: none;
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-accent);
}

.aw-karte-leer {
  padding: var(--space-sm) 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

/* Eigene Auswahl */
.aw-wahl-gruppe {
  margin-bottom: var(--space-md);
}

.aw-wahl-titel {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-light);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: var(--space-xs);
}

.aw-wahl-zeile {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-height: 44px;
  border-bottom: 1px solid var(--color-border);
}

.aw-wahl-zeile input {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
}

.aw-wahl-name {
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text);
}

.aw-wahl-anzahl {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.aw-wahl-knoepfe {
  display: flex;
  gap: var(--space-sm);
  position: sticky;
  bottom: 0;
  padding-top: var(--space-sm);
  background: var(--color-white);
}

.aw-wahl-knoepfe .btn-primary {
  flex: 1;
}
</style>
