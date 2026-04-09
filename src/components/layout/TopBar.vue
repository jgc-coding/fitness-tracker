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
        <slot name="right"></slot>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  }
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
</style>
