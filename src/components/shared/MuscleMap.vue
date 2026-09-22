<template>
  <svg
    class="muscle-map"
    :width="size"
    :height="hoehe"
    viewBox="0 0 210 156"
    role="img"
    aria-label="Muskelgrafik: Vorderseite und Rueckseite"
  >
    <!-- Vorderseite -->
    <g>
      <circle class="silhouette" cx="50" cy="13" r="8.5" />
      <path :class="cls('neck')" data-muscle="neck" d="M46 20 L54 20 L55.5 28 L44.5 28 Z" />
      <path :class="cls('traps')" data-muscle="traps" d="M44.5 28 L35 32.5 L44.5 32.5 Z" />
      <path :class="cls('traps')" data-muscle="traps" d="M55.5 28 L65 32.5 L55.5 32.5 Z" />
      <circle :class="cls('shoulders')" data-muscle="shoulders" cx="31" cy="35.5" r="5.5" />
      <circle :class="cls('shoulders')" data-muscle="shoulders" cx="69" cy="35.5" r="5.5" />
      <path :class="cls('chest')" data-muscle="chest" d="M36.5 33.5 L49 33.5 L49 46 Q42 49.5 37.5 44.5 Q36 39 36.5 33.5 Z" />
      <path :class="cls('chest')" data-muscle="chest" d="M63.5 33.5 L51 33.5 L51 46 Q58 49.5 62.5 44.5 Q64 39 63.5 33.5 Z" />
      <rect :class="cls('biceps')" data-muscle="biceps" x="26.5" y="41" width="6.5" height="14" rx="3" />
      <rect :class="cls('biceps')" data-muscle="biceps" x="67" y="41" width="6.5" height="14" rx="3" />
      <rect :class="cls('forearms')" data-muscle="forearms" x="25.5" y="56" width="6" height="16" rx="3" />
      <rect :class="cls('forearms')" data-muscle="forearms" x="68.5" y="56" width="6" height="16" rx="3" />
      <circle class="silhouette" cx="28.5" cy="75.5" r="2.8" />
      <circle class="silhouette" cx="71.5" cy="75.5" r="2.8" />
      <rect :class="cls('abdominals')" data-muscle="abdominals" x="44" y="48" width="12" height="22" rx="3" />
      <path :class="cls('obliques')" data-muscle="obliques" d="M37.5 46.5 L43 48.5 L43 68 L39.5 70 Q36.5 58 37.5 46.5 Z" />
      <path :class="cls('obliques')" data-muscle="obliques" d="M62.5 46.5 L57 48.5 L57 68 L60.5 70 Q63.5 58 62.5 46.5 Z" />
      <path class="silhouette" d="M39.5 70.5 L60.5 70.5 L61.5 79 L50 85 L38.5 79 Z" />
      <rect :class="cls('abductors')" data-muscle="abductors" x="35" y="78" width="3.6" height="18" rx="1.8" />
      <rect :class="cls('abductors')" data-muscle="abductors" x="61.4" y="78" width="3.6" height="18" rx="1.8" />
      <rect :class="cls('quadriceps')" data-muscle="quadriceps" x="39.2" y="79" width="6.8" height="36" rx="3.2" />
      <rect :class="cls('quadriceps')" data-muscle="quadriceps" x="54" y="79" width="6.8" height="36" rx="3.2" />
      <rect :class="cls('adductors')" data-muscle="adductors" x="46.4" y="80" width="3" height="20" rx="1.5" />
      <rect :class="cls('adductors')" data-muscle="adductors" x="50.6" y="80" width="3" height="20" rx="1.5" />
      <circle class="silhouette" cx="42.5" cy="118.5" r="3.4" />
      <circle class="silhouette" cx="57.5" cy="118.5" r="3.4" />
      <rect class="silhouette" x="39.5" y="122" width="6" height="25" rx="3" />
      <rect class="silhouette" x="54.5" y="122" width="6" height="25" rx="3" />
      <ellipse class="silhouette" cx="41" cy="150.5" rx="4.2" ry="2.6" />
      <ellipse class="silhouette" cx="59" cy="150.5" rx="4.2" ry="2.6" />
    </g>
    <!-- Rueckseite -->
    <g transform="translate(110 0)">
      <circle class="silhouette" cx="50" cy="13" r="8.5" />
      <path :class="cls('neck')" data-muscle="neck" d="M46 20 L54 20 L55.5 28 L44.5 28 Z" />
      <path :class="cls('traps')" data-muscle="traps" d="M50 26 L37.5 32.5 L50 41 L62.5 32.5 Z" />
      <circle :class="cls('shoulders')" data-muscle="shoulders" cx="31" cy="35.5" r="5.5" />
      <circle :class="cls('shoulders')" data-muscle="shoulders" cx="69" cy="35.5" r="5.5" />
      <rect :class="cls('triceps')" data-muscle="triceps" x="26.5" y="41" width="6.5" height="14" rx="3" />
      <rect :class="cls('triceps')" data-muscle="triceps" x="67" y="41" width="6.5" height="14" rx="3" />
      <rect :class="cls('forearms')" data-muscle="forearms" x="25.5" y="56" width="6" height="16" rx="3" />
      <rect :class="cls('forearms')" data-muscle="forearms" x="68.5" y="56" width="6" height="16" rx="3" />
      <circle class="silhouette" cx="28.5" cy="75.5" r="2.8" />
      <circle class="silhouette" cx="71.5" cy="75.5" r="2.8" />
      <path :class="cls('lats')" data-muscle="lats" d="M36 34 L45.5 39 L45.5 62 L40 64 Q36 50 36 34 Z" />
      <path :class="cls('lats')" data-muscle="lats" d="M64 34 L54.5 39 L54.5 62 L60 64 Q64 50 64 34 Z" />
      <rect :class="cls('middle_back')" data-muscle="middle_back" x="46" y="41.5" width="8" height="14" rx="2" />
      <rect :class="cls('lower_back')" data-muscle="lower_back" x="44" y="56.5" width="12" height="10.5" rx="2" />
      <ellipse :class="cls('glutes')" data-muscle="glutes" cx="44" cy="73.5" rx="6.8" ry="6" />
      <ellipse :class="cls('glutes')" data-muscle="glutes" cx="56" cy="73.5" rx="6.8" ry="6" />
      <rect :class="cls('hamstrings')" data-muscle="hamstrings" x="37.5" y="81" width="10" height="33" rx="4" />
      <rect :class="cls('hamstrings')" data-muscle="hamstrings" x="52.5" y="81" width="10" height="33" rx="4" />
      <circle class="silhouette" cx="42.5" cy="118.5" r="3.4" />
      <circle class="silhouette" cx="57.5" cy="118.5" r="3.4" />
      <rect :class="cls('calves')" data-muscle="calves" x="39" y="122" width="7" height="23" rx="3.5" />
      <rect :class="cls('calves')" data-muscle="calves" x="54" y="122" width="7" height="23" rx="3.5" />
      <ellipse class="silhouette" cx="41" cy="150.5" rx="4.2" ry="2.6" />
      <ellipse class="silhouette" cx="59" cy="150.5" rx="4.2" ry="2.6" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // Muskel-Ids aus dem Bild-Manifest (uebungskatalog.json), z.B. ['chest']
  primary: { type: Array, default: () => [] },
  secondary: { type: Array, default: () => [] },
  // Grobgruppen-Id der Uebung (muscleGroup) — greift nur ohne primary/secondary
  fallbackGroup: { type: String, default: '' },
  // Breite in px; Hoehe folgt dem Seitenverhaeltnis des viewBox
  size: { type: Number, default: 200 }
})

const ALLE_MUSKELN = [
  'neck', 'traps', 'shoulders', 'chest', 'biceps', 'triceps', 'forearms',
  'abdominals', 'obliques', 'lats', 'middle_back', 'lower_back', 'glutes',
  'abductors', 'adductors', 'quadriceps', 'hamstrings', 'calves'
]

// Grobgruppen der App (constants.js MUSCLE_GROUPS) -> Muskel-Ids der Grafik.
// full_body markiert alle Muskeln, aber nur hell (sekundaer).
const GROBGRUPPEN = {
  chest: ['chest'],
  back: ['lats', 'middle_back', 'lower_back', 'traps'],
  shoulders: ['shoulders'],
  legs: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'abductors', 'adductors'],
  arms: ['biceps', 'triceps', 'forearms'],
  core: ['abdominals', 'obliques'],
  full_body: ALLE_MUSKELN
}

const markiert = computed(() => {
  if (props.primary.length > 0 || props.secondary.length > 0) {
    return { primaer: props.primary, sekundaer: props.secondary }
  }
  const gruppe = GROBGRUPPEN[props.fallbackGroup]
  if (!gruppe) return { primaer: [], sekundaer: [] }
  if (props.fallbackGroup === 'full_body') return { primaer: [], sekundaer: gruppe }
  return { primaer: gruppe, sekundaer: [] }
})

const hoehe = computed(() => Math.round(props.size * 156 / 210))

function cls(id) {
  if (markiert.value.primaer.includes(id)) return 'muskel primaer'
  if (markiert.value.sekundaer.includes(id)) return 'muskel sekundaer'
  return 'muskel'
}
</script>

<style scoped>
.muscle-map {
  display: block;
}

/* Nicht trainierbare Silhouetten-Teile (Kopf, Haende, Knie, Fuesse) */
.silhouette {
  fill: #ccd1d4;
}

/* Muskelregionen: neutral grau, primaer Akzentrot, sekundaer hell.
   Statische Werte statt color-mix (alte Android-WebViews). */
.muskel {
  fill: #d7dadc;
}

.muskel.primaer {
  fill: var(--color-accent);
}

.muskel.sekundaer {
  fill: #e0aeb5;
}
</style>
