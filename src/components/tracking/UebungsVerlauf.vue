<template>
  <!-- Verlauf einer Uebung fuer EINEN Nutzer (Wunsch Gabriel 01.10.2026):
       Liniendiagramm, ein Punkt je Trainingstag (schwerster Satz), Zeitraum
       3 Monate / 6 Monate / 1 Jahr / Alle, darunter alle Werte als Liste.
       Regeln: utils/verlauf.js, Vertrag scripts/verlauf-test.mjs. -->
  <div class="verlauf">
    <div class="verlauf-nutzer" role="radiogroup" aria-label="Wessen Verlauf?">
      <button
        v-for="user in authStore.users"
        :key="user.id"
        type="button"
        role="radio"
        class="verlauf-kreis"
        :class="{ 'is-aktiv': user.id === userId }"
        :style="{ '--user-color': user.color, '--user-bg': user.bgColor }"
        :aria-checked="user.id === userId"
        :aria-label="user.name"
        :title="user.name"
        @click="userId = user.id"
      >
        <span class="verlauf-kreis-buchstabe" aria-hidden="true">{{ user.name.charAt(0) }}</span>
      </button>
      <span class="verlauf-nutzer-name">{{ nutzer?.name }}</span>
    </div>

    <div class="verlauf-zeitraum" role="radiogroup" aria-label="Zeitraum">
      <button
        v-for="z in ZEITRAEUME"
        :key="z.key"
        type="button"
        role="radio"
        class="verlauf-zeitraum-knopf"
        :class="{ 'is-aktiv': z.key === zeitraum }"
        :aria-checked="z.key === zeitraum"
        @click="zeitraum = z.key"
      >{{ z.label }}</button>
    </div>

    <p v-if="ladeFehler" class="verlauf-leer">
      Der Verlauf liess sich nicht laden. Bitte die Ansicht schliessen und neu oeffnen.
    </p>
    <p v-else-if="!geladen" class="verlauf-leer">Lade ...</p>
    <div v-else-if="alleTage.length === 0" class="verlauf-leer">
      Noch keine Eintraege fuer {{ nutzer?.name }} bei dieser Uebung.
    </div>
    <div v-else-if="punkte.length === 0" class="verlauf-leer">
      <p>Keine Eintraege in diesem Zeitraum. Letzter Eintrag: {{ datumLang(alleTage[alleTage.length - 1].date) }}.</p>
      <button type="button" class="btn btn-secondary" @click="zeitraum = 'alle'">Alle anzeigen</button>
    </div>

    <template v-else>
      <!-- Ablesezeile: der angetippte Punkt, sonst der juengste -->
      <div class="verlauf-ablesen" aria-live="polite">
        <span class="verlauf-ablesen-datum">{{ datumLang(aktiverPunkt.date) }}</span>
        <span class="verlauf-ablesen-wert">{{ wertText(aktiverPunkt) }}</span>
      </div>

      <svg
        ref="svgEl"
        class="verlauf-diagramm"
        :viewBox="`0 0 ${B} ${H}`"
        role="img"
        :aria-label="diagrammBeschreibung"
        @pointerdown="zeigeAuf"
        @pointermove="zeigeAuf"
      >
        <!-- Raster: waagrechte Haarlinien an runden Werten, Einheit oben links -->
        <g class="verlauf-raster">
          <line v-for="t in ax.ticks" :key="'g' + t" :x1="RL" :x2="B - RR" :y1="y(t)" :y2="y(t)" />
        </g>
        <g class="verlauf-achse">
          <text v-for="t in ax.ticks" :key="'t' + t" :x="RL - 6" :y="y(t) + 4" text-anchor="end">{{ formatZahl(t) }}</text>
          <text :x="RL - 6" :y="RO - 12" text-anchor="end">{{ einheit }}</text>
          <text v-for="m in xMarken" :key="m.date" :x="x(m.date)" :y="H - 6" text-anchor="middle">{{ m.label }}</text>
        </g>

        <!-- Fadenkreuz am angetippten Punkt -->
        <line
          v-if="beruehrt"
          class="verlauf-fadenkreuz"
          :x1="xs[aktiv]" :x2="xs[aktiv]" :y1="RO - 6" :y2="H - RU"
        />

        <path v-if="punkte.length > 1" class="verlauf-linie" :d="linie" :style="{ stroke: nutzer?.color }" />
        <circle
          v-for="(p, i) in punkte"
          :key="p.date"
          class="verlauf-punkt"
          :cx="xs[i]"
          :cy="ys[i]"
          :r="i === aktiv ? 6 : 4"
          :style="{ fill: nutzer?.color }"
        />

        <!-- Direkte Beschriftung nur am juengsten und am hoechsten Punkt -->
        <text
          v-for="l in beschriftungen"
          :key="'l' + l.i"
          class="verlauf-beschriftung"
          :x="l.x"
          :y="ys[l.i] - 11"
          :text-anchor="l.anker"
        >{{ formatZahl(wert(punkte[l.i])) }}</text>
      </svg>

      <!-- Tabelle: alle Werte lesbar, juengste zuerst; Tipp markiert den Punkt -->
      <h3 class="verlauf-abschnitt">Eintraege ({{ punkte.length }})</h3>
      <ul class="verlauf-liste">
        <li
          v-for="(p, i) in listeNeuZuerst"
          :key="p.date"
          class="verlauf-zeile"
          :class="{ 'is-aktiv': punkte.length - 1 - i === aktiv }"
          @click="waehle(punkte.length - 1 - i)"
        >
          <div class="verlauf-zeile-kopf">
            <span class="verlauf-zeile-datum">{{ datumLang(p.date) }}</span>
            <span class="verlauf-zeile-wert">{{ wertText(p) }}</span>
          </div>
          <div v-if="p.saetze.length > 1" class="verlauf-zeile-saetze">
            {{ p.saetze.length }} Saetze: {{ p.saetze.map(satzText).join(' · ') }}
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { db } from '../../db/dexie.js'
import { useAuthStore } from '../../stores/auth.js'
import { getToday, daysBetweenDates, weekdayShort } from '../../utils/dateHelpers.js'
import {
  ZEITRAEUME, zeitraumStart, verlaufPunkte, messgroesse, achse, formatZahl, naechsterIndex, monatsMarken
} from '../../utils/verlauf.js'

const props = defineProps({
  exerciseId: { type: String, required: true },
  // Wessen Verlauf zuerst: der Standard-Nutzer, wenn er mittrainiert
  startUserId: { type: String, default: null }
})

const authStore = useAuthStore()

const userId = ref(props.startUserId || authStore.defaultUserId)
const zeitraum = ref(ZEITRAEUME[0].key)
const nutzer = computed(() => authStore.users.find(u => u.id === userId.value))

const saetze = ref([])
const geladen = ref(false)
const ladeFehler = ref(false)

async function lade() {
  geladen.value = false
  ladeFehler.value = false
  try {
    saetze.value = await db.setLogs
      .where('[exerciseId+userId]')
      .equals([props.exerciseId, userId.value])
      .toArray()
  } catch (e) {
    console.error('[FitTrack] [ERROR] Verlauf nicht ladbar:', props.exerciseId, userId.value, e)
    saetze.value = []
    ladeFehler.value = true
  }
  geladen.value = true
}

watch([() => props.exerciseId, userId], lade, { immediate: true })

const heute = getToday()
const von = computed(() => zeitraumStart(heute, ZEITRAEUME.find(z => z.key === zeitraum.value)?.monate ?? null))
const alleTage = computed(() => verlaufPunkte(saetze.value))
const punkte = computed(() => verlaufPunkte(saetze.value, von.value))

const groesse = computed(() => messgroesse(punkte.value))
const einheit = computed(() => (groesse.value === 'reps' ? 'Wdh' : 'kg'))
const wert = (p) => (groesse.value === 'reps' ? p.reps : p.weight)

// --- Zeichenflaeche (viewBox-Einheiten, skaliert mit der Breite) -----------
const B = 340
const H = 200
const RL = 36 // links: Werte der Achse
const RR = 22 // rechts: Platz fuer die Beschriftung des letzten Punkts
const RO = 30 // oben: Einheit und Beschriftungen ueber den Punkten
const RU = 24 // unten: Monatsmarken

const ax = computed(() => achse(punkte.value.map(wert)))

// Zeitachse: vom Beginn des Zeitraums bis heute (Luecken bleiben sichtbar);
// bei "Alle" ab dem ersten Eintrag
const xStart = computed(() => von.value || punkte.value[0]?.date || heute)
const spanne = computed(() => Math.max(1, daysBetweenDates(xStart.value, heute)))

function x(date) {
  const anteil = Math.min(1, Math.max(0, daysBetweenDates(xStart.value, date) / spanne.value))
  return RL + anteil * (B - RL - RR)
}

function y(v) {
  const { min, max } = ax.value
  return RO + (1 - (v - min) / (max - min || 1)) * (H - RO - RU)
}

const xs = computed(() => punkte.value.map(p => x(p.date)))
const ys = computed(() => punkte.value.map(p => y(wert(p))))
const linie = computed(() => xs.value.map((px, i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${ys.value[i].toFixed(1)}`).join(' '))
const xMarken = computed(() => monatsMarken(xStart.value, heute))

const beschriftungen = computed(() => {
  const n = punkte.value.length
  if (n === 0) return []
  const letzter = n - 1
  let hoechster = 0
  punkte.value.forEach((p, i) => { if (wert(p) >= wert(punkte.value[hoechster])) hoechster = i })
  const liste = [letzter]
  // Den Hoechstwert nur zusaetzlich, wenn er woanders liegt und nicht
  // in die Beschriftung des letzten Punkts laeuft
  if (hoechster !== letzter && Math.abs(xs.value[hoechster] - xs.value[letzter]) > 34) liste.push(hoechster)
  return liste.map(i => ({
    i,
    x: Math.min(B - 2, Math.max(RL + 2, xs.value[i])),
    anker: xs.value[i] > B - RR - 8 ? 'end' : xs.value[i] < RL + 12 ? 'start' : 'middle'
  }))
})

// --- Antippen / Ziehen: der naechste Punkt wird abgelesen -----------------
const svgEl = ref(null)
const gewaehlt = ref(null)
const beruehrt = ref(false)
const aktiv = computed(() => {
  const n = punkte.value.length
  return gewaehlt.value !== null && gewaehlt.value < n ? gewaehlt.value : n - 1
})
const aktiverPunkt = computed(() => punkte.value[aktiv.value])

function zeigeAuf(e) {
  // Maus nur mit gedrueckter Taste, Finger immer (Ziehen liest weiter ab)
  if (e.type === 'pointermove' && e.pointerType === 'mouse' && e.buttons === 0) return
  const rect = svgEl.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  const xv = ((e.clientX - rect.left) / rect.width) * B
  const i = naechsterIndex(xs.value, xv)
  if (i >= 0) waehle(i)
}

function waehle(i) {
  gewaehlt.value = i
  beruehrt.value = true
}

// Neuer Nutzer oder Zeitraum: wieder beim juengsten Punkt beginnen
watch([userId, zeitraum], () => {
  gewaehlt.value = null
  beruehrt.value = false
})

// --- Texte ------------------------------------------------------------------
function datumLang(date) {
  const [yy, mm, dd] = date.split('-')
  return `${weekdayShort(date)} ${dd}.${mm}.${yy.slice(2)}`
}

function wertText(p) {
  if (groesse.value === 'reps') return `${p.reps} Wdh`
  return `${formatZahl(p.weight)} kg${p.reps !== null ? ` × ${p.reps}` : ''}`
}

function satzText(s) {
  return groesse.value === 'reps' ? `${s.reps ?? '–'}` : `${formatZahl(s.weight)}${s.reps !== null ? ` × ${s.reps}` : ''}`
}

const listeNeuZuerst = computed(() => [...punkte.value].reverse())

const diagrammBeschreibung = computed(() => {
  const n = punkte.value.length
  if (!n) return ''
  const erster = punkte.value[0]
  const letzter = punkte.value[n - 1]
  return `${einheit.value === 'kg' ? 'Gewichtsverlauf' : 'Wiederholungen'} von ${nutzer.value?.name}: ` +
    `${n} Trainingstage vom ${datumLang(erster.date)} bis ${datumLang(letzter.date)}, zuletzt ${wertText(letzter)}. ` +
    'Alle Werte stehen in der Liste darunter.'
})
</script>

<style scoped>
/* Nutzerwahl wie auf dem Startbildschirm, aber nur einer zugleich */
.verlauf-nutzer {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-sm);
}

.verlauf-kreis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
}

.verlauf-kreis-buchstabe {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--user-bg);
  color: var(--user-color);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  transition: background-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.verlauf-kreis.is-aktiv .verlauf-kreis-buchstabe {
  background: var(--user-color);
  color: var(--color-white);
  box-shadow: 0 0 0 2px var(--color-white), 0 0 0 4px var(--user-color);
}

.verlauf-nutzer-name {
  margin-left: var(--space-xs);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

/* Zeitraum: ein Segment-Schalter in voller Breite */
.verlauf-zeitraum {
  display: flex;
  gap: 2px;
  padding: 2px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-md);
}

.verlauf-zeitraum-knopf {
  flex: 1;
  min-height: 40px;
  border: none;
  border-radius: calc(var(--radius-sm) - 2px);
  background: transparent;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
  transition: background-color 0.15s, color 0.15s;
}

.verlauf-zeitraum-knopf.is-aktiv {
  background: var(--color-white);
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  box-shadow: var(--shadow-sm);
}

.verlauf-leer {
  padding: var(--space-lg) 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  line-height: 1.5;
}

.verlauf-leer .btn {
  margin-top: var(--space-sm);
}

.verlauf-ablesen {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: var(--space-xs);
}

.verlauf-ablesen-datum {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.verlauf-ablesen-wert {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

/* pan-y: senkrecht scrollt die Seite weiter, waagrecht liest der Finger ab */
.verlauf-diagramm {
  display: block;
  width: 100%;
  height: auto;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  margin-bottom: var(--space-md);
}

.verlauf-raster line {
  stroke: var(--color-border);
  stroke-width: 1;
}

.verlauf-achse text {
  fill: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.verlauf-fadenkreuz {
  stroke: var(--color-text-muted);
  stroke-width: 1;
}

.verlauf-linie {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* Ring in Flaechenfarbe: Punkte bleiben auf der Linie lesbar */
.verlauf-punkt {
  stroke: var(--color-white);
  stroke-width: 2;
  transition: r 0.15s;
}

.verlauf-beschriftung {
  fill: var(--color-text);
  font-size: 12px;
  font-weight: 600;
  paint-order: stroke;
  stroke: var(--color-white);
  stroke-width: 3px;
  stroke-linejoin: round;
}

.verlauf-abschnitt {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-light);
  margin-bottom: var(--space-sm);
}

.verlauf-liste {
  list-style: none;
  margin: 0;
  padding: 0;
}

.verlauf-zeile {
  padding: var(--space-sm);
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
}

.verlauf-zeile.is-aktiv {
  background: var(--color-bg);
}

.verlauf-zeile-kopf {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-sm);
}

.verlauf-zeile-datum {
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
  font-variant-numeric: tabular-nums;
}

.verlauf-zeile-wert {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.verlauf-zeile-saetze {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}
</style>
