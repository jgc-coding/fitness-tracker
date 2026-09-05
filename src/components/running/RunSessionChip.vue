<template>
  <button
    class="run-chip"
    :class="['status-' + session.status, { unplanned: session.unplanned }]"
    :style="{ '--chip-color': color, '--chip-bg': bgColor }"
    @click="$emit('open', session)"
  >
    <span class="chip-symbol" aria-hidden="true">{{ typeSymbol }}</span>
    <span class="chip-text">
      <span class="chip-title">{{ session.title }}</span>
      <span v-if="userName" class="chip-user">{{ userName }}</span>
    </span>
    <span class="chip-values">
      <span v-if="session.originalDate" class="chip-moved" :title="'Verschoben von ' + session.originalDate">↷</span>
      <span class="chip-planned">{{ plannedText }}</span>
      <span v-if="session.status === 'done'" class="chip-done">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span v-if="actualText">{{ actualText }}</span>
      </span>
      <span v-else-if="session.status === 'skipped'" class="chip-skipped">ausgelassen</span>
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { getRunType } from '../../utils/runPlanSchema.js'
import { formatRunValue } from '../../utils/formatters.js'

const props = defineProps({
  session: { type: Object, required: true },
  color: { type: String, default: 'var(--color-accent)' },
  bgColor: { type: String, default: 'var(--color-bg)' },
  // Nur gesetzt, wenn mehrere Nutzer angezeigt werden.
  userName: { type: String, default: '' }
})

defineEmits(['open'])

const typeSymbol = computed(() => getRunType(props.session.type).symbol)
const plannedText = computed(() => formatRunValue(props.session.planned))
const actualText = computed(() => formatRunValue(props.session.actual))
</script>

<style scoped>
.run-chip {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  width: 100%;
  text-align: left;
  padding: var(--space-sm);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--chip-color);
  background: var(--chip-bg);
  color: var(--color-text);
  min-height: 44px;
  transition: transform 0.1s ease;
}

.run-chip:active {
  transform: scale(0.99);
}

.chip-symbol {
  font-size: var(--font-size-md);
  line-height: 1;
  flex-shrink: 0;
}

.chip-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chip-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-user {
  font-size: var(--font-size-xs);
  color: var(--chip-color);
  font-weight: var(--font-weight-medium);
}

.chip-values {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-light);
}

.chip-planned {
  font-variant-numeric: tabular-nums;
}

.chip-moved {
  color: var(--chip-color);
  font-size: var(--font-size-sm);
  line-height: 1;
}

.chip-done {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}

.status-done .chip-planned {
  text-decoration: none;
  opacity: 0.6;
}

.status-skipped .chip-title {
  text-decoration: line-through;
  color: var(--color-text-muted);
}

.status-skipped .chip-planned {
  opacity: 0.6;
}

.chip-skipped {
  color: var(--color-text-muted);
}

.unplanned .chip-title::after {
  content: ' (ungeplant)';
  color: var(--color-text-muted);
  font-weight: var(--font-weight-normal);
}
</style>
