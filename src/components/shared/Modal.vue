<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" ref="overlayEl" class="modal-overlay" :style="overlayStil" @click.self="close">
        <div class="modal-content" :class="{ 'modal-full': fullHeight, 'mit-tastatur': tastatur }">
          <div class="modal-grabber" aria-hidden="true"></div>
          <div class="modal-header">
            <h2 class="modal-title">{{ title }}</h2>
            <button class="modal-close" @click="close">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <slot></slot>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: Boolean,
  title: { type: String, default: '' },
  fullHeight: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

function close() {
  emit('update:modelValue', false)
}

// Bildschirmtastatur (Android, Chrome ab 108): Die Tastatur legt sich UEBER
// die Seite, statt sie zu verkleinern. Das Fenster klebt unten am Rand und
// rutschte so hinter die Tastatur — beim Suchen verschwanden die Treffer,
// sobald die Liste kuerzer wurde. Solange das Modal offen ist, misst es
// darum den sichtbaren Bereich (visualViewport) und legt die Ueberlagerung
// genau darauf; ohne Tastatur bleibt alles wie vorher (inset: 0).
// Suchfenster (fullHeight) bleiben bei offener Tastatur voll hoch, damit die
// Treffer direkt unter dem Suchfeld stehen, statt beim Tippen zu springen.
const overlayEl = ref(null)
const tastatur = ref(null) // null = keine Tastatur; sonst { top, hoehe } in px

// Ab so viel verdeckter Hoehe gilt die Tastatur als offen. Bleibt unter
// jeder echten Tastatur (ab ca. 200 px), liegt aber ueber der Adressleiste
// im Browser-Tab (ca. 56 px), die den sichtbaren Bereich ebenfalls kuerzt.
const TASTATUR_AB_PX = 100

function messeSichtbarenBereich() {
  const vv = window.visualViewport
  // Beim Zoomen ist der sichtbare Bereich auch ohne Tastatur klein — dann
  // nichts nachfuehren
  if (!vv || vv.scale > 1.01) {
    tastatur.value = null
    return
  }
  // clientHeight = Hoehe der Seite ohne Tastatur (die Tastatur verkleinert
  // nur den sichtbaren Bereich, nicht die Seite)
  const verdeckt = document.documentElement.clientHeight - vv.offsetTop - vv.height
  const vorher = tastatur.value
  tastatur.value = verdeckt > TASTATUR_AB_PX
    ? { top: Math.round(vv.offsetTop), hoehe: Math.round(vv.height) }
    : null
  // Gerade aufgegangen: das Eingabefeld im nun kleineren Fenster sichtbar
  // halten (der Browser hat vor der Verkleinerung gescrollt)
  if (!vorher && tastatur.value) {
    nextTick(() => {
      const aktiv = document.activeElement
      if (aktiv && overlayEl.value?.contains(aktiv)) aktiv.scrollIntoView({ block: 'nearest' })
    })
  }
}

const overlayStil = computed(() => tastatur.value
  ? { top: `${tastatur.value.top}px`, height: `${tastatur.value.hoehe}px`, bottom: 'auto' }
  : null)

function tastaturBeobachten(an) {
  const vv = window.visualViewport
  if (!vv) return
  if (an) {
    vv.addEventListener('resize', messeSichtbarenBereich)
    vv.addEventListener('scroll', messeSichtbarenBereich)
    messeSichtbarenBereich()
  } else {
    vv.removeEventListener('resize', messeSichtbarenBereich)
    vv.removeEventListener('scroll', messeSichtbarenBereich)
    tastatur.value = null
  }
}

// Android-Zurueck (bzw. Browser-Back) soll ein offenes Modal schliessen statt
// die Seite/App zu verlassen: Beim Oeffnen wird ein History-Eintrag mit
// GLEICHER URL gepusht (der Router navigiert dadurch nicht). Back entfernt
// ihn -> popstate -> Modal zu. Schliessen ueber die UI geht selbst einen
// History-Schritt zurueck, damit kein Geister-Eintrag uebrig bleibt.
let pushedState = false

function onPopState() {
  pushedState = false
  window.removeEventListener('popstate', onPopState)
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    tastaturBeobachten(open)
    if (open) {
      history.pushState({ modal: true }, '')
      pushedState = true
      window.addEventListener('popstate', onPopState)
    } else if (pushedState) {
      pushedState = false
      window.removeEventListener('popstate', onPopState)
      // Erst Vues DOM-Update (Modal schliessen) abschliessen lassen, dann den
      // History-Eintrag entfernen — ein synchrones back() hier wuerde mitten
      // im Update-Zyklus eine Router-Reaktion ausloesen.
      nextTick(() => history.back())
    }
  }
)

// View-Wechsel waehrend offenem Modal: nur den Listener abbauen. Ein
// history.back() hier wuerde mit der laufenden Router-Navigation kollidieren;
// der verbleibende Eintrag kostet schlimmstenfalls einen zusaetzlichen Back.
onUnmounted(() => {
  window.removeEventListener('popstate', onPopState)
  tastaturBeobachten(false)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(30, 31, 35, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}

.modal-content {
  background: var(--color-white);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-lg);
}

.modal-grabber {
  width: 36px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--color-border);
  margin: var(--space-sm) auto 0;
  flex-shrink: 0;
}

.modal-content.modal-full {
  max-height: 95vh;
}

/* Offene Tastatur: die Ueberlagerung ist per Inline-Stil auf den sichtbaren
   Bereich verkleinert, Hoehen beziehen sich jetzt darauf (vh wuerde hinter
   die Tastatur reichen). Suchfenster bleiben voll hoch, damit die Treffer
   beim Tippen nicht nach unten wandern. */
.modal-content.mit-tastatur {
  max-height: calc(100% - var(--space-sm));
}

.modal-content.modal-full.mit-tastatur {
  height: calc(100% - var(--space-sm));
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  color: var(--color-text-light);
}

.modal-close:active {
  background: var(--color-bg);
}

.modal-body {
  overflow-y: auto;
  padding: var(--space-md);
  flex: 1;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: translateY(100%);
}
</style>
