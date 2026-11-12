<template>
  <!-- Kleines Verlaufsdiagramm EINER Uebung fuer die Auswertung (v2.15.0):
       Gewicht als Linie in der Personenfarbe, das geschaetzte 1RM gestrichelt
       auf DERSELBEN kg-Achse — wie der Einzelverlauf (UebungsVerlauf.vue),
       nur kompakt. Alle Karten teilen dieselbe Zeitachse (von..bis), damit
       man sie untereinander vergleichen kann. Antippen/Ziehen liest den
       naechsten Tag ab; ohne Beruehrung steht der juengste da.
       Regeln: utils/verlauf.js -->
  <div class="mini">
    <div class="mini-ablesen" aria-live="polite">
      <span class="mini-datum">{{ datumKurz(aktiverPunkt.date) }}</span>
      <span class="mini-wert">{{ wertText(aktiverPunkt) }}<span
        v-if="zeigtEinRM && aktiverPunkt.e1rm !== null"
        class="mini-1rm"
      > · 1RM ≈ {{ formatZahl(Math.round(aktiverPunkt.e1rm)) }}</span></span>
    </div>
    <svg
      ref="svgEl"
      class="mini-diagramm"
      :viewBox="`0 0 ${B} ${H}`"
      role="img"
      :aria-label="beschreibung"
      @pointerdown="zeigeAuf"
      @pointermove="zeigeAuf"
    >
      <g class="mini-raster">
        <line v-for="t in ax.ticks" :key="'g' + t" :x1="RL" :x2="B - RR" :y1="y(t)" :y2="y(t)" />
      </g>
      <g class="mini-achse">
        <text v-for="t in ax.ticks" :key="'t' + t" :x="RL - 5" :y="y(t) + 4" text-anchor="end">{{ formatZahl(t) }}</text>
        <text v-for="m in xMarken" :key="m.date" :x="x(m.date)" :y="H - 4" text-anchor="middle">{{ m.label }}</text>
      </g>
      <line v-if="beruehrt" class="mini-fadenkreuz" :x1="xs[aktiv]" :x2="xs[aktiv]" :y1="RO - 4" :y2="H - RU" />
      <path v-if="einRMLinie" class="mini-linie mini-linie-1rm" :d="einRMLinie" :style="{ stroke: farbe }" />
      <path v-if="punkte.length > 1" class="mini-linie" :d="linie" :style="{ stroke: farbe }" />
      <circle
        v-for="(p, i) in punkte"
        :key="p.date"
        class="mini-punkt"
        :cx="xs[i]"
        :cy="ys[i]"
        :r="i === aktiv ? 5 : 3"
        :style="{ fill: farbe }"
      />
    </svg>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { daysBetweenDates, weekdayShort } from '../../utils/dateHelpers.js'
import { achse, formatZahl, naechsterIndex, monatsMarken, messgroesse, mitEinRM } from '../../utils/verlauf.js'

const props = defineProps({
  // Punkte aus verlaufPunkte (aelteste zuerst), mindestens einer
  punkte: { type: Array, required: true },
  // Zeitachse: Beginn (null = erster Punkt) und Ende (Kalendertage)
  von: { type: String, default: null },
  bis: { type: String, required: true },
  farbe: { type: String, default: 'var(--color-accent)' },
  // Fuer Vorleser: Name der Uebung
  name: { type: String, default: '' }
})

const B = 340
const H = 128
const RL = 34 // links: Werte der Achse
const RR = 10
const RO = 10
const RU = 20 // unten: Monatsmarken

const groesse = computed(() => messgroesse(props.punkte))
const wert = (p) => (groesse.value === 'reps' ? p.reps : p.weight)
const zeigtEinRM = computed(() => mitEinRM(props.punkte))

const ax = computed(() => achse(props.punkte.map(wert).concat(
  zeigtEinRM.value ? props.punkte.map(p => p.e1rm).filter(e => e !== null) : []
).filter(Number.isFinite), 3))

const xStart = computed(() => props.von || props.punkte[0]?.date || props.bis)
const spanne = computed(() => Math.max(1, daysBetweenDates(xStart.value, props.bis)))

function x(date) {
  const anteil = Math.min(1, Math.max(0, daysBetweenDates(xStart.value, date) / spanne.value))
  return RL + anteil * (B - RL - RR)
}

function y(v) {
  const { min, max } = ax.value
  return RO + (1 - (v - min) / (max - min || 1)) * (H - RO - RU)
}

const xs = computed(() => props.punkte.map(p => x(p.date)))
const ys = computed(() => props.punkte.map(p => y(wert(p) ?? 0)))
const linie = computed(() => xs.value.map((px, i) => `${i ? 'L' : 'M'}${px.toFixed(1)} ${ys.value[i].toFixed(1)}`).join(' '))
const xMarken = computed(() => monatsMarken(xStart.value, props.bis))

const einRMLinie = computed(() => {
  if (!zeigtEinRM.value) return ''
  const teile = []
  props.punkte.forEach((p, i) => {
    if (p.e1rm !== null) teile.push(`${teile.length ? 'L' : 'M'}${xs.value[i].toFixed(1)} ${y(p.e1rm).toFixed(1)}`)
  })
  return teile.length > 1 ? teile.join(' ') : ''
})

// --- Ablesen -----------------------------------------------------------------
const svgEl = ref(null)
const gewaehlt = ref(null)
const beruehrt = ref(false)
const aktiv = computed(() => {
  const n = props.punkte.length
  return gewaehlt.value !== null && gewaehlt.value < n ? gewaehlt.value : n - 1
})
const aktiverPunkt = computed(() => props.punkte[aktiv.value] || { date: props.bis, weight: null, reps: null, e1rm: null })

function zeigeAuf(e) {
  // Maus nur mit gedrueckter Taste, Finger immer (Ziehen liest weiter ab)
  if (e.type === 'pointermove' && e.pointerType === 'mouse' && e.buttons === 0) return
  const rect = svgEl.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return
  const i = naechsterIndex(xs.value, ((e.clientX - rect.left) / rect.width) * B)
  if (i >= 0) {
    gewaehlt.value = i
    beruehrt.value = true
  }
}

// Neue Daten (Zeitraum, Person): wieder beim juengsten Tag
watch(() => props.punkte, () => {
  gewaehlt.value = null
  beruehrt.value = false
})

function datumKurz(date) {
  if (!date) return ''
  const [yy, mm, dd] = date.split('-')
  return `${weekdayShort(date)} ${dd}.${mm}.${yy.slice(2)}`
}

function wertText(p) {
  if (groesse.value === 'reps') return p.reps != null ? `${p.reps} Wdh` : '–'
  if (p.weight == null) return '–'
  return `${formatZahl(p.weight)} kg${p.reps != null ? ` × ${p.reps}` : ''}`
}

const beschreibung = computed(() => {
  const n = props.punkte.length
  if (!n) return ''
  const erster = props.punkte[0]
  const letzter = props.punkte[n - 1]
  return `${props.name}: ${n} Trainingstage vom ${datumKurz(erster.date)} bis ${datumKurz(letzter.date)}, ` +
    `zuerst ${wertText(erster)}, zuletzt ${wertText(letzter)}` +
    (zeigtEinRM.value && letzter.e1rm !== null ? `, geschaetztes 1RM etwa ${formatZahl(Math.round(letzter.e1rm))} kg` : '')
})
</script>

<style scoped>
.mini-ablesen {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-sm);
  margin-bottom: 2px;
}

.mini-datum {
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
  white-space: nowrap;
}

.mini-wert {
  text-align: right;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.mini-1rm {
  white-space: nowrap;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
}

/* pan-y: senkrecht scrollt die Seite weiter, waagrecht liest der Finger ab */
.mini-diagramm {
  display: block;
  width: 100%;
  height: auto;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}

.mini-raster line {
  stroke: var(--color-border);
  stroke-width: 1;
}

.mini-achse text {
  fill: var(--color-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.mini-fadenkreuz {
  stroke: var(--color-text-muted);
  stroke-width: 1;
}

.mini-linie {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}

/* 1RM: gestrichelt und etwas leiser, damit das echte Gewicht vorne bleibt */
.mini-linie-1rm {
  stroke-dasharray: 5 4;
  opacity: 0.8;
}

/* Ring in Flaechenfarbe: Punkte bleiben auf der Linie lesbar */
.mini-punkt {
  stroke: var(--color-white);
  stroke-width: 1.5;
}
</style>
