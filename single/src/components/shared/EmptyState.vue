<template>
  <div class="empty-state">
    <div class="empty-icon" v-if="icon" v-html="icon"></div>
    <p class="empty-title">{{ title }}</p>
    <p class="empty-description" v-if="description">{{ description }}</p>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  title: String,
  description: String,
  icon: String
})
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl) var(--space-md);
  text-align: center;
  gap: var(--space-sm);
}

.empty-icon {
  color: var(--color-text-muted);
  opacity: 0.5;
  margin-bottom: var(--space-sm);
}

.empty-title {
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-light);
}

.empty-description {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
</style>
