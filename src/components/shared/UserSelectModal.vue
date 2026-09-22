<template>
  <Modal
    :modelValue="modelValue"
    title="Wer trainiert?"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <div class="user-select-list">
      <button
        v-for="user in authStore.users"
        :key="user.id"
        class="user-select-item"
        :class="{ 'is-selected': selected.includes(user.id) }"
        :style="{ '--user-color': user.color, '--user-bg': user.bgColor }"
        @click="toggleUser(user.id)"
      >
        <span class="user-select-check">
          <svg v-if="selected.includes(user.id)" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        <span class="user-select-name">{{ user.name }}</span>
      </button>
    </div>
    <button
      class="btn btn-primary btn-block"
      :disabled="selected.length === 0"
      @click="confirm"
    >
      Bestaetigen
    </button>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import Modal from './Modal.vue'
import { useAuthStore } from '../../stores/auth.js'

// Mehrfachauswahl "Wer trainiert heute?". Uebernommen wird die Auswahl NUR
// ueber den Bestaetigen-Knopf — Schliessen per Android-Back oder X laesst die
// bisherigen activeUserIds unveraendert gelten (selected ist nur lokal).
const props = defineProps({
  modelValue: Boolean,
  // Abweichende Vorauswahl NUR fuers Oeffnen (Array aus Nutzer-Ids). Der
  // Startdialog haengt darueber den Standard-Nutzer an; ohne Prop (Chip-Weg
  // im Workout) gilt die letzte bestaetigte Auswahl.
  vorauswahl: { type: Array, default: null }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const authStore = useAuthStore()
const selected = ref([])

// Beim Oeffnen vorbelegen: uebergebene Vorauswahl, sonst die letzte Auswahl
watch(
  () => props.modelValue,
  (open) => {
    if (open) selected.value = props.vorauswahl ? [...props.vorauswahl] : [...authStore.activeUserIds]
  }
)

function toggleUser(userId) {
  if (selected.value.includes(userId)) {
    selected.value = selected.value.filter(id => id !== userId)
  } else {
    selected.value = [...selected.value, userId]
  }
}

function confirm() {
  if (selected.value.length === 0) return
  authStore.setActiveUsers(selected.value)
  // Der Store hat die Ids validiert und sortiert — die weitergeben, nicht
  // die rohe Klick-Reihenfolge.
  emit('confirm', [...authStore.activeUserIds])
  emit('update:modelValue', false)
}
</script>

<style scoped>
.user-select-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.user-select-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  text-align: left;
  transition: all 0.15s;
}

.user-select-item.is-selected {
  border-color: var(--user-color);
  background: var(--user-bg);
}

.user-select-check {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  color: var(--color-white);
}

.user-select-item.is-selected .user-select-check {
  background: var(--user-color);
  border-color: var(--user-color);
}

.user-select-name {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text);
}

.user-select-item.is-selected .user-select-name {
  color: var(--user-color);
}
</style>
