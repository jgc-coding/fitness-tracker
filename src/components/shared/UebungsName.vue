<template>
  <!-- Angezeigter Uebungsname mit Hantel-Bildchen vor DB/BB (v2.19.0).
       Kein eigenes Element drumherum: der Name sitzt im Element der Ansicht
       und behaelt deren Schrift, Umbruch und Kuerzung. -->
  <template v-if="zeigen">
    <template v-for="(teil, i) in teile" :key="i">
      <span
        v-if="teil.kuerzel"
        class="hantel-kuerzel"
        :data-hantel="teil.art"
      ><svg
        v-if="teil.art === 'lang'"
        class="hantel-bild"
        viewBox="0 0 15 15"
        aria-hidden="true"
        focusable="false"
      ><path fill="currentColor" d="M4 3.5c-.5 0-1 .5-1 1V7h-.5V5.75c0-.41-.4-.75-.75-.75S1 5.34 1 5.75V7H.5c-.28 0-.5.26-.5.5s.22.5.5.5H1v1.25c0 .41.4.75.75.75s.75-.34.75-.75V8H3v2.5c0 .5.5 1 1 1s1-.5 1-1V8h5v2.5c0 .5.5 1 1 1s1-.5 1-1V8h.5v1.25c0 .41.4.75.75.75s.75-.34.75-.75V8h.5c.28 0 .5-.26.5-.5s-.22-.5-.5-.5H14V5.75c0-.41-.4-.75-.75-.75s-.75.34-.75.75V7H12V4.5c0-.5-.5-1-1-1s-1 .5-1 1V7H5V4.5c0-.48-.5-1-1-1"/></svg><svg
        v-else
        class="hantel-bild"
        viewBox="0 0 15 15"
        aria-hidden="true"
        focusable="false"
      ><g fill="currentColor"><rect x="2" y="2.5" width="1.2" height="3" rx="0.6"/><rect x="3.4" y="1.7" width="1.6" height="4.6" rx="0.8"/><rect x="5" y="3.5" width="5" height="1" rx="0.5"/><rect x="10" y="1.7" width="1.6" height="4.6" rx="0.8"/><rect x="11.8" y="2.5" width="1.2" height="3" rx="0.6"/><rect x="2" y="9.5" width="1.2" height="3" rx="0.6"/><rect x="3.4" y="8.7" width="1.6" height="4.6" rx="0.8"/><rect x="5" y="10.5" width="5" height="1" rx="0.5"/><rect x="10" y="8.7" width="1.6" height="4.6" rx="0.8"/><rect x="11.8" y="9.5" width="1.2" height="3" rx="0.6"/></g></svg>{{ teil.kuerzel }}</span>
      <template v-else>{{ teil.text }}</template>
    </template>
  </template>
  <template v-else>{{ name }}</template>
</template>

<script setup>
// Bilder: Langhantel aus "Pinhead Map Icons" (Quincy Morgan, CC0), die zwei
// Kurzhanteln selbst gezeichnet im selben Stil. Nachweis: Einstellungen ->
// Info und public/uebungsbilder/LIZENZ.md. Regeln: utils/hantelBild.js.
import { computed } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import { hantelTeile } from '../../utils/hantelBild.js'

const props = defineProps({
  // Der fertig angezeigte Name (nach toTitleCase)
  name: { type: String, default: '' },
  // Bild unabhaengig von der Einstellung zeigen (Vorschau in den Einstellungen)
  immer: { type: Boolean, default: false }
})

const authStore = useAuthStore()
const teile = computed(() => hantelTeile(props.name))
const zeigen = computed(() =>
  (props.immer || authStore.hantelBilderZeigen) && teile.value.some(t => t.kuerzel)
)
</script>

<style scoped>
.hantel-kuerzel {
  white-space: nowrap;
}

.hantel-bild {
  width: 1.15em;
  height: 1.15em;
  vertical-align: -0.2em;
  margin-right: 0.25em;
  color: var(--color-accent);
}
</style>
