<template>
  <!-- Graue KI-Figur (vorn links, hinten rechts), darueber je markiertem
       Muskel eine Farbflaeche mit seiner Maske. multiply laesst die
       Schattierung der Figur durchscheinen, wie in den Uebungsbildern.
       Bau der Dateien: scripts/muskelgrafik-bauen.mjs -->
  <div
    class="muscle-map"
    :style="{ width: size + 'px', height: hoehe + 'px' }"
    role="img"
    aria-label="Muskelgrafik: Vorderseite und Rueckseite"
  >
    <img class="grundfigur" :src="grundfigurUrl" alt="" draggable="false" />
    <span
      v-for="ebene in ebenen"
      :key="ebene.id"
      :class="['muskel', ebene.art]"
      :data-muscle="ebene.id"
      :style="ebene.stil"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  MUSKEL_IDS, GROBGRUPPEN, GRUNDFIGUR, GRUNDFIGUR_BREITE, GRUNDFIGUR_HOEHE,
  maskenPfad, muskelgrafikUrl
} from '../../data/muskelgrafik.js'

const props = defineProps({
  // Muskel-Ids aus dem Bild-Manifest (uebungskatalog.json), z.B. ['chest']
  primary: { type: Array, default: () => [] },
  secondary: { type: Array, default: () => [] },
  // Grobgruppen-Id der Uebung (muscleGroup) — greift nur ohne primary/secondary
  fallbackGroup: { type: String, default: '' },
  // Breite in px; Hoehe folgt dem Seitenverhaeltnis der Grundfigur
  size: { type: Number, default: 200 }
})

const markiert = computed(() => {
  if (props.primary.length > 0 || props.secondary.length > 0) {
    return { primaer: props.primary, sekundaer: props.secondary }
  }
  const gruppe = GROBGRUPPEN[props.fallbackGroup]
  if (!gruppe) return { primaer: [], sekundaer: [] }
  if (props.fallbackGroup === 'full_body') return { primaer: [], sekundaer: gruppe }
  return { primaer: gruppe, sekundaer: [] }
})

const hoehe = computed(() => Math.round(props.size * GRUNDFIGUR_HOEHE / GRUNDFIGUR_BREITE))
const grundfigurUrl = muskelgrafikUrl(GRUNDFIGUR)

// Nur markierte Muskeln bekommen eine Ebene; primaer schlaegt sekundaer
const ebenen = computed(() => {
  const liste = []
  for (const id of MUSKEL_IDS) {
    const art = markiert.value.primaer.includes(id)
      ? 'primaer'
      : (markiert.value.sekundaer.includes(id) ? 'sekundaer' : null)
    if (!art) continue
    const url = `url(${muskelgrafikUrl(maskenPfad(id))})`
    liste.push({ id, art, stil: { WebkitMaskImage: url, maskImage: url } })
  }
  return liste
})
</script>

<style scoped>
.muscle-map {
  position: relative;
  display: block;
  isolation: isolate;
}

.grundfigur {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
}

/* Masken strecken sich auf die Flaeche der Figur. Statische Farben statt
   color-mix (alte Android-WebViews); die Toene entsprechen dem Rot der
   Uebungsbilder, sekundaer deutlich heller. */
.muskel {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  mix-blend-mode: multiply;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.muskel.primaer {
  background-color: #f05c3c;
}

.muskel.sekundaer {
  background-color: #f6b2a0;
}
</style>
