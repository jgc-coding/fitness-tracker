<template>
  <!-- Wer trainiert: unter den Trainingskarten ein duenner Strich, darunter je
       Nutzer ein Farbkreis mit Anfangsbuchstaben (Wunsch Gabriel 30.09.2026,
       ersetzt den Startdialog). Ausgewaehlt = volle Farbe mit Ring, sonst
       blass. Ein Tipp nimmt jemanden dazu oder heraus; der Start eines
       Trainings uebernimmt die Auswahl (workoutStore liest activeUserIds). -->
  <div class="start-nutzer" role="group" aria-label="Wer trainiert?">
    <button
      v-for="user in authStore.users"
      :key="user.id"
      type="button"
      class="start-nutzer-kreis"
      :class="{ 'is-aktiv': istAktiv(user.id) }"
      :style="{ '--user-color': user.color, '--user-bg': user.bgColor }"
      :aria-pressed="istAktiv(user.id)"
      :aria-label="`${user.name} trainiert mit`"
      :title="user.name"
      @click="umschalten(user.id)"
    >
      <span class="start-nutzer-buchstabe" aria-hidden="true">{{ user.name.charAt(0) }}</span>
    </button>
  </div>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth.js'

const authStore = useAuthStore()

function istAktiv(userId) {
  return authStore.activeUserIds.includes(userId)
}

function umschalten(userId) {
  const ids = authStore.activeUserIds
  const neu = ids.includes(userId) ? ids.filter(id => id !== userId) : [...ids, userId]
  // Einer trainiert immer: der letzte ausgewaehlte Kreis laesst sich nicht
  // abwaehlen (setActiveUsers wuerde eine leere Liste ohnehin verwerfen)
  if (neu.length === 0) return
  authStore.setActiveUsers(neu)
}
</script>

<style scoped>
.start-nutzer {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid var(--color-border);
}

/* Tippflaeche 48 px, sichtbarer Kreis 40 px; der Ring (Luecke in
   Seitenfarbe + 2 px Nutzerfarbe) passt in den Rest der Tippflaeche */
.start-nutzer-kreis {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  -webkit-tap-highlight-color: transparent;
}

.start-nutzer-buchstabe {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--user-bg);
  color: var(--user-color);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  transition: background-color 0.15s, color 0.15s, box-shadow 0.15s, transform 0.1s;
}

.start-nutzer-kreis.is-aktiv .start-nutzer-buchstabe {
  background: var(--user-color);
  color: var(--color-white);
  box-shadow: 0 0 0 2px var(--color-bg), 0 0 0 4px var(--user-color);
}

.start-nutzer-kreis:active .start-nutzer-buchstabe {
  transform: scale(0.92);
}
</style>
