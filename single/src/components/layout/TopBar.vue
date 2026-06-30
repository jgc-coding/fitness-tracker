<template>
  <header class="top-bar">
    <div class="top-bar-content">
      <div class="top-bar-left">
        <slot name="left">
          <img src="/logo.svg" alt="Logo" class="top-bar-logo" />
        </slot>
      </div>
      <h1 class="top-bar-title">{{ title }}</h1>
      <div class="top-bar-right">
        <span class="sync-dot" :class="'sync-' + syncStatus" :title="syncTitle"></span>
        <slot name="right"></slot>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { syncStatus, lastSyncAt } from '../../services/syncService.js'

defineProps({
  title: {
    type: String,
    default: ''
  }
})

const syncTitle = computed(() => {
  const last = lastSyncAt.value
    ? ` (zuletzt ${lastSyncAt.value.toLocaleTimeString('de-DE')})`
    : ''
  const labels = {
    idle: 'Sync nicht gestartet',
    connecting: 'Verbinde mit Cloud...',
    synced: 'Synchronisiert',
    offline: 'Offline',
    error: 'Sync-Fehler'
  }
  return (labels[syncStatus.value] || syncStatus.value) + last
})
</script>

<style scoped>
.top-bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
}

.top-bar-content {
  display: flex;
  align-items: center;
  height: var(--topbar-height);
  padding: 0 var(--space-md);
  max-width: 600px;
  margin: 0 auto;
}

.top-bar-left {
  display: flex;
  align-items: center;
}

.top-bar-logo {
  height: 28px;
  width: auto;
}

.top-bar-title {
  flex: 1;
  text-align: center;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.sync-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-text-muted);
  transition: background 0.2s;
}

.sync-dot.sync-synced {
  background: var(--color-success, #2e7d32);
}

.sync-dot.sync-connecting {
  background: #f0a500;
  animation: pulse 1s ease-in-out infinite;
}

.sync-dot.sync-error {
  background: var(--color-danger, #c62828);
}

.sync-dot.sync-offline {
  background: var(--color-text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
