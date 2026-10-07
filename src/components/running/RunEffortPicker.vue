<template>
  <div class="effort">
    <p class="form-title">Wie anstrengend war es?</p>
    <div class="effort-row">
      <button
        v-for="stufe in EFFORT_SCALE"
        :key="stufe.value"
        type="button"
        class="effort-btn"
        :class="{ active: modelValue === stufe.value }"
        :aria-pressed="modelValue === stufe.value"
        :aria-label="stufe.value + ' von 5, ' + stufe.label"
        @click="toggle(stufe.value)"
      >
        {{ stufe.value }}
      </button>
    </div>
    <p class="effort-hint">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { RUN_EFFORT_SCALE } from '../../utils/runPlanSchema.js'

// Anstrengung 1-5 als v-model (Zahl oder null). Aus RunSessionSheet
// herausgeloest, weil "Anders gelaufen" und "+ Lauf eintragen" dieselbe
// Auswahl brauchen.
const props = defineProps({
  modelValue: { type: Number, default: null }
})
const emit = defineEmits(['update:modelValue'])

const EFFORT_SCALE = RUN_EFFORT_SCALE

// Solange nichts gewaehlt ist, erklaert die Zeile die Skala; danach die Stufe.
const hint = computed(() => {
  const stufe = EFFORT_SCALE.find(e => e.value === props.modelValue)
  if (stufe) return `${stufe.label} — ${stufe.hint}`
  return '1 = sehr locker, 5 = maximal. Optional.'
})

/** Nochmal auf dieselbe Stufe tippen loescht sie — die Angabe ist optional. */
function toggle(value) {
  emit('update:modelValue', props.modelValue === value ? null : value)
}
</script>

<style scoped>
.effort {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.form-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

/* Anstrengung 1-5: fuenf Flaechen, die sich mit dem Daumen sicher treffen lassen. */
.effort-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-xs);
}

.effort-btn {
  min-height: 44px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-white);
  color: var(--color-text);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  font-variant-numeric: tabular-nums;
}

.effort-btn.active {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-white);
}

.effort-hint {
  min-height: 1.2em;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>
