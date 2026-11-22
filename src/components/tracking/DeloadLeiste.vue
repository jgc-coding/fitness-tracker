<template>
  <!-- Deload-Wochen (v2.18.0, Gabriel 22.11.2026): unter den Farbkreisen je
       ausgewaehlter Person eine Zeile. Faellig = dezent gefaerbt, sonst
       keine Erinnerung. Ein Tipp oeffnet das Fenster zum Eintragen,
       Nachtragen, Vorplanen und Entfernen. Regeln: utils/deload.js. -->
  <div class="deload-leiste">
    <p v-if="ladeFehler" class="deload-fehler" role="alert">
      Deload-Wochen konnten nicht geladen werden. Bitte die App neu öffnen.
      <span class="deload-diagnose">Technische Ursache: {{ ladeFehler }}</span>
    </p>
    <template v-else>
      <button
        v-for="z in zeilen"
        :key="z.user.id"
        type="button"
        class="deload-zeile"
        :class="z.klasse"
        :aria-label="`Deload ${z.user.name}: ${z.text.titel}, ${z.text.info}`"
        @click="oeffnen()"
      >
        <span class="deload-punkt" :style="{ background: z.user.color }" aria-hidden="true">{{ z.user.name.charAt(0) }}</span>
        <span class="deload-text">
          <b>{{ z.laeuft ? '✓ ' : '' }}{{ z.text.titel }}</b>
          <small>{{ z.text.info }}</small>
        </span>
        <span class="deload-pfeil" aria-hidden="true">›</span>
      </button>
    </template>
  </div>

  <Modal v-model="offen" title="Deload-Wochen">
    <div class="deload-fenster">
      <div class="deload-gilt" role="group" aria-label="Gilt für">
        <span>Gilt für</span>
        <button
          v-for="user in authStore.users"
          :key="user.id"
          type="button"
          class="deload-gilt-kreis"
          :class="{ 'is-aktiv': auswahl.includes(user.id) }"
          :style="{ '--user-color': user.color, '--user-bg': user.bgColor }"
          :aria-pressed="auswahl.includes(user.id)"
          :aria-label="`${user.name}`"
          :title="user.name"
          @click="umschaltenPerson(user.id)"
        >{{ user.name.charAt(0) }}</button>
      </div>

      <button
        type="button"
        class="btn btn-block deload-jetzt"
        :class="dieseGesetzt ? 'btn-secondary' : 'btn-primary'"
        :disabled="auswahl.length === 0 || speichert || dieseGesetzt"
        @click="umschaltenWoche(diese)"
      >{{ dieseGesetzt ? `✓ Diese Woche (${kwText(diese)}) ist Deload` : `Diese Woche (${kwText(diese)}) ist Deload` }}</button>

      <p v-if="fehler" class="deload-fehler" role="alert">
        {{ fehler.text }}
        <span class="deload-diagnose">Technische Ursache: {{ fehler.diagnose }}</span>
      </p>

      <ul class="deload-wochen">
        <li v-for="w in wochenZeilen" :key="w.montag">
          <button
            type="button"
            class="deload-woche"
            :class="{ 'ist-diese': w.montag === diese }"
            :disabled="auswahl.length === 0 || speichert"
            :aria-label="`${w.kw}: ${w.marke || 'keine Deload-Woche'}. Tippen zum ${w.alleHaben ? 'Entfernen' : 'Eintragen'}`"
            @click="umschaltenWoche(w.montag)"
          >
            <span class="deload-kw">{{ w.kw }}</span>
            <span class="deload-spanne">{{ w.montag === diese ? 'diese Woche' : w.spanne }}</span>
            <!-- Nur bei einem Teil der Gewaehlten eingetragen: deren Punkte -->
            <span v-if="w.teilweise.length" class="deload-teilweise" aria-hidden="true">
              <span class="deload-teilweise-text">Deload</span>
              <span v-for="u in w.teilweise" :key="u.id" class="deload-mini" :style="{ background: u.color }">{{ u.name.charAt(0) }}</span>
            </span>
            <span v-if="w.marke" class="deload-marke" :class="w.markeKlasse">{{ w.marke }}</span>
          </button>
        </li>
      </ul>
      <p class="deload-hinweis">
        Ein Tipp auf eine Woche trägt sie ein oder entfernt sie wieder, für alle oben gewählten Personen.
        So lässt sich nachtragen, vorplanen oder verschieben. Nach einer Deload-Woche folgen 8 normale Wochen.
      </p>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Modal from '../shared/Modal.vue'
import { useAuthStore } from '../../stores/auth.js'
import { useDeloadStore } from '../../stores/deload.js'
import { getToday, mondayOf } from '../../utils/dateHelpers.js'
import { deloadZeile, istErinnerung, kwText, wochenFenster, wochenSpanne, zielWert } from '../../utils/deload.js'

const authStore = useAuthStore()
const deloadStore = useDeloadStore()

const ladeFehler = ref('')
const offen = ref(false)
const auswahl = ref([])
const speichert = ref(false)
const fehler = ref(null)

const heute = () => getToday()
const diese = computed(() => { void offen.value; return mondayOf(heute()) })

const zeilen = computed(() => {
  void deloadStore.stand
  return authStore.activeUsers.map(user => {
    const status = deloadStore.status(user.id, heute())
    return {
      user,
      text: deloadZeile(status),
      laeuft: status.art === 'laeuft',
      klasse: {
        'ist-faellig': istErinnerung(status),
        'ist-laeuft': status.art === 'laeuft',
        'ist-leer': status.art === 'leer'
      }
    }
  })
})

function hat(userId, montag) {
  return deloadStore.wochenVon(userId).includes(montag)
}

const dieseGesetzt = computed(() => {
  void deloadStore.stand
  return auswahl.value.length > 0 && auswahl.value.every(id => hat(id, diese.value))
})

const wochenZeilen = computed(() => {
  void deloadStore.stand
  const personen = authStore.users.filter(u => auswahl.value.includes(u.id))
  const stati = personen.map(u => deloadStore.status(u.id, heute()))
  const extra = stati.flatMap(s => [s.letzte, s.vorschlag]).filter(Boolean)
  return wochenFenster(heute(), extra).map(montag => {
    const mit = personen.filter(u => hat(u.id, montag))
    const alleHaben = personen.length > 0 && mit.length === personen.length
    // Vorschlag nur, wo noch nichts eingetragen ist und keine geplante
    // Woche ihn ersetzt
    const vorschlag = mit.length === 0 && stati.some(s => s.art !== 'geplant' && s.vorschlag === montag)
    let marke = ''
    let markeKlasse = ''
    if (alleHaben) {
      marke = montag > diese.value ? 'geplant' : '✓ Deload'
      markeKlasse = montag > diese.value ? 'ist-geplant' : 'ist-gemacht'
    } else if (vorschlag) {
      marke = 'Vorschlag'
      markeKlasse = 'ist-vorschlag'
    }
    return {
      montag,
      kw: kwText(montag),
      spanne: wochenSpanne(montag),
      alleHaben,
      teilweise: alleHaben ? [] : mit,
      marke,
      markeKlasse
    }
  })
})

function oeffnen() {
  // Vorbelegt: wer gerade trainiert (die Farbkreise darueber)
  auswahl.value = authStore.activeUsers.map(u => u.id)
  fehler.value = null
  offen.value = true
}

function umschaltenPerson(userId) {
  auswahl.value = auswahl.value.includes(userId)
    ? auswahl.value.filter(id => id !== userId)
    : [...auswahl.value, userId]
}

async function umschaltenWoche(montag) {
  if (speichert.value || auswahl.value.length === 0) return
  const an = zielWert(auswahl.value, id => hat(id, montag))
  speichert.value = true
  fehler.value = null
  try {
    await deloadStore.setzen([...auswahl.value], montag, an)
  } catch (err) {
    const id = Date.now().toString(36)
    console.error('[FitTrack] [ERROR] Deload-Woche nicht gespeichert:', id, montag, err)
    fehler.value = {
      text: 'Das hat nicht geklappt. Bitte noch einmal tippen.',
      diagnose: `${err?.name || 'Fehler'} · ID ${id}`
    }
  } finally {
    speichert.value = false
  }
}

onMounted(async () => {
  try {
    await deloadStore.bereit()
  } catch (err) {
    ladeFehler.value = `${err?.name || 'Fehler'} · ID ${Date.now().toString(36)}`
  }
})
</script>

<style scoped>
.deload-leiste {
  display: flex;
  flex-direction: column;
  margin-top: var(--space-md);
  background: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.deload-leiste:empty {
  display: none;
}

.deload-zeile {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  color: var(--color-text);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.deload-zeile + .deload-zeile {
  border-top: 1px solid var(--color-border);
}

.deload-zeile:active {
  background: var(--color-bg);
}

/* Dezente Erinnerung: warmer Hauch und ein schmaler Streifen links */
.deload-zeile.ist-faellig {
  background: #fbf1de;
  box-shadow: inset 3px 0 0 #e3b866;
}

.deload-zeile.ist-faellig b {
  color: #8a5a0b;
}

.deload-zeile.ist-laeuft b {
  color: var(--color-success);
}

.deload-zeile.ist-leer b {
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
}

.deload-punkt {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  flex-shrink: 0;
  color: var(--color-white);
  font-size: 12px;
  font-weight: var(--font-weight-bold);
}

.deload-text {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  font-size: var(--font-size-sm);
  line-height: 1.35;
}

.deload-text b {
  font-weight: var(--font-weight-semibold);
}

.deload-text small {
  color: var(--color-text-light);
  font-size: var(--font-size-xs);
}

.deload-pfeil {
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);
}

.deload-fenster {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.deload-gilt {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: var(--font-size-sm);
  color: var(--color-text-light);
}

.deload-gilt-kreis {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--user-bg);
  color: var(--user-color);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.deload-gilt-kreis.is-aktiv {
  background: var(--user-color);
  color: var(--color-white);
  box-shadow: 0 0 0 2px var(--color-card), 0 0 0 4px var(--user-color);
}

.deload-wochen {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.deload-wochen li + li {
  border-top: 1px solid var(--color-border);
}

.deload-woche {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  text-align: left;
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  cursor: pointer;
}

.deload-woche.ist-diese {
  background: var(--color-bg);
}

.deload-woche:disabled {
  cursor: default;
}

.deload-kw {
  width: 52px;
  flex-shrink: 0;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.deload-spanne {
  flex: 1;
  min-width: 0;
  color: var(--color-text-light);
  font-size: var(--font-size-xs);
}

.deload-teilweise {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.deload-teilweise-text {
  margin-right: 2px;
  color: var(--color-success);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.deload-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  color: var(--color-white);
  font-size: 10px;
  font-weight: var(--font-weight-bold);
}

.deload-marke {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.deload-marke.ist-gemacht {
  background: rgba(45, 138, 78, 0.12);
  color: var(--color-success);
}

.deload-marke.ist-geplant {
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.deload-marke.ist-vorschlag {
  border: 1px dashed #e3b866;
  color: #8a5a0b;
}

.deload-hinweis {
  margin: 0;
  color: var(--color-text-light);
  font-size: var(--font-size-xs);
}

.deload-fehler {
  margin: 0;
  padding: 10px 12px;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

.deload-diagnose {
  display: block;
  margin-top: 2px;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}
</style>
