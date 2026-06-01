<script setup>
import { ref, computed, toRefs } from 'vue'
import { useMediaQuery } from '@vueuse/core'

const props = withDefaults(defineProps(), {
  cols: 8,
  rows: 8,
  fillColor: 'rgba(232, 68, 10, 0.22)',
  strokeColor: 'rgba(232, 68, 10, 0.14)',
})

const { fillColor, strokeColor } = toRefs(props)

const hoveredIndex = ref(null)
const canHover = useMediaQuery('(hover: hover) and (pointer: fine)')

const safeCols = computed(() => {
  const n = Number(props.cols)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.max(1, Math.floor(n))
})

const safeRows = computed(() => {
  const n = Number(props.rows)
  if (!Number.isFinite(n) || n <= 0) return 1
  return Math.max(1, Math.floor(n))
})

const total = computed(() => safeCols.value * safeRows.value)
const cellW = computed(() => 100 / safeCols.value)
const cellH = computed(() => 100 / safeRows.value)

function getX(i) { return (i % safeCols.value) * cellW.value }
function getY(i) { return Math.floor(i / safeCols.value) * cellH.value }

function onEnter(i) {
  if (!canHover.value) return
  hoveredIndex.value = i
}

function onLeave() {
  if (!canHover.value) return
  hoveredIndex.value = null
}
</script>

<template>
  <svg
    class="igp-svg"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <rect
      v-for="i in total"
      :key="i"
      :x="getX(i - 1)"
      :y="getY(i - 1)"
      :width="cellW"
      :height="cellH"
      :fill="hoveredIndex === i ? fillColor : 'transparent'"
      :stroke="strokeColor"
      stroke-width="0.3"
      class="igp-cell"
      @mouseenter="onEnter(i)"
      @mouseleave="onLeave()"
    />
  </svg>
</template>

<style scoped>
.igp-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.igp-cell {
  pointer-events: all;
  transition: fill 80ms ease;
}
/* 離開時慢速淡出 */
.igp-cell:not(:hover) {
  transition: fill 900ms ease;
}
</style>
