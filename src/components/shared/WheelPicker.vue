<template>
  <div class="wheel-picker" ref="containerRef">
    <div class="wheel-label">{{ label }}</div>
    <div class="wheel-viewport" ref="viewportRef" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd" @mousedown="onMouseDown">
      <div class="wheel-fade-top"></div>
      <div class="wheel-fade-bottom"></div>
      <div class="wheel-highlight"></div>
      <div class="wheel-scroll" ref="scrollRef" :style="{ transform: `translateY(${offset}px)` }">
        <div
          v-for="val in values"
          :key="val"
          class="wheel-item"
          :class="{ selected: val === modelValue }"
        >
          {{ formatValue(val) }}
        </div>
      </div>
    </div>
    <div class="wheel-unit">{{ unit }}</div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  values: { type: Array, required: true },
  label: { type: String, default: '' },
  unit: { type: String, default: '' },
  decimals: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const ITEM_HEIGHT = 44
const VISIBLE_ITEMS = 5
const viewportRef = ref(null)
const scrollRef = ref(null)
const containerRef = ref(null)

const centerOffset = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT

const selectedIndex = computed(() => {
  const idx = props.values.indexOf(props.modelValue)
  return idx >= 0 ? idx : 0
})

const offset = ref(0)
let startY = 0
let startOffset = 0
let isDragging = false
let velocity = 0
let lastY = 0
let lastTime = 0
let animationFrame = null

function formatValue(val) {
  if (props.decimals && val % 1 !== 0) {
    return val.toFixed(2)
  }
  return String(val)
}

function setOffsetFromIndex(index) {
  offset.value = centerOffset - index * ITEM_HEIGHT
}

function snapToNearest() {
  const rawIndex = Math.round((centerOffset - offset.value) / ITEM_HEIGHT)
  const clampedIndex = Math.max(0, Math.min(props.values.length - 1, rawIndex))

  animateToIndex(clampedIndex)

  const newVal = props.values[clampedIndex]
  if (newVal !== props.modelValue) {
    emit('update:modelValue', newVal)
  }
}

function animateToIndex(index) {
  const target = centerOffset - index * ITEM_HEIGHT
  const start = offset.value
  const diff = target - start
  const duration = 200
  const startTime = performance.now()

  if (animationFrame) cancelAnimationFrame(animationFrame)

  function step(now) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const ease = 1 - Math.pow(1 - progress, 3)
    offset.value = start + diff * ease

    if (progress < 1) {
      animationFrame = requestAnimationFrame(step)
    }
  }
  animationFrame = requestAnimationFrame(step)
}

function momentumScroll() {
  if (Math.abs(velocity) < 0.5) {
    snapToNearest()
    return
  }

  offset.value += velocity
  velocity *= 0.92

  const maxOffset = centerOffset
  const minOffset = centerOffset - (props.values.length - 1) * ITEM_HEIGHT
  if (offset.value > maxOffset || offset.value < minOffset) {
    offset.value = Math.max(minOffset, Math.min(maxOffset, offset.value))
    snapToNearest()
    return
  }

  animationFrame = requestAnimationFrame(momentumScroll)
}

function onTouchStart(e) {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  isDragging = true
  startY = e.touches[0].clientY
  startOffset = offset.value
  lastY = startY
  lastTime = performance.now()
  velocity = 0
}

function onTouchMove(e) {
  if (!isDragging) return
  e.preventDefault()
  const y = e.touches[0].clientY
  const delta = y - startY
  offset.value = startOffset + delta

  const now = performance.now()
  const dt = now - lastTime
  if (dt > 0) {
    velocity = (y - lastY) / dt * 16
  }
  lastY = y
  lastTime = now
}

function onTouchEnd() {
  isDragging = false
  if (Math.abs(velocity) > 2) {
    momentumScroll()
  } else {
    snapToNearest()
  }
}

function onMouseDown(e) {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  isDragging = true
  startY = e.clientY
  startOffset = offset.value
  lastY = startY
  lastTime = performance.now()
  velocity = 0

  const onMouseMove = (e) => {
    if (!isDragging) return
    const y = e.clientY
    const delta = y - startY
    offset.value = startOffset + delta

    const now = performance.now()
    const dt = now - lastTime
    if (dt > 0) {
      velocity = (y - lastY) / dt * 16
    }
    lastY = y
    lastTime = now
  }

  const onMouseUp = () => {
    isDragging = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    if (Math.abs(velocity) > 2) {
      momentumScroll()
    } else {
      snapToNearest()
    }
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

watch(() => props.modelValue, () => {
  if (!isDragging) {
    setOffsetFromIndex(selectedIndex.value)
  }
})

onMounted(() => {
  nextTick(() => {
    setOffsetFromIndex(selectedIndex.value)
  })
})
</script>

<style scoped>
.wheel-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.wheel-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-xs);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.wheel-viewport {
  position: relative;
  height: calc(44px * 5);
  overflow: hidden;
  width: 100%;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.wheel-viewport:active {
  cursor: grabbing;
}

.wheel-fade-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 88px;
  background: linear-gradient(to bottom, var(--color-white) 0%, transparent 100%);
  z-index: 2;
  pointer-events: none;
}

.wheel-fade-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 88px;
  background: linear-gradient(to top, var(--color-white) 0%, transparent 100%);
  z-index: 2;
  pointer-events: none;
}

.wheel-highlight {
  position: absolute;
  top: 50%;
  left: 4px;
  right: 4px;
  height: 44px;
  transform: translateY(-50%);
  background: var(--color-bg);
  border-radius: var(--radius-sm);
  z-index: 1;
  pointer-events: none;
}

.wheel-scroll {
  position: relative;
  z-index: 1;
  will-change: transform;
}

.wheel-item {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-lg);
  color: var(--color-text-muted);
  transition: color 0.1s;
}

.wheel-item.selected {
  color: var(--color-text);
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xl);
}

.wheel-unit {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  margin-top: var(--space-xs);
  font-weight: var(--font-weight-medium);
}
</style>
