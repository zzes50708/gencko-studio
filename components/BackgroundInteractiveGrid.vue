<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const HW = 35
const HH = 40
const COL_W = 70
const ROW_H = 60
const EVEN_X = 35
const ODD_X  = 0
const ORIG_Y = 40

function rowParity(row) {
  return ((row % 2) + 2) % 2
}

function hexCenter(row, col) {
  const x = (rowParity(row) === 0 ? EVEN_X : ODD_X) + col * COL_W
  const y = ORIG_Y + row * ROW_H
  return { x, y }
}

function hexPoints(cx, cy) {
  return `${cx},${cy-HH} ${cx+HW},${cy-HH/2} ${cx+HW},${cy+HH/2} ${cx},${cy+HH} ${cx-HW},${cy+HH/2} ${cx-HW},${cy-HH/2}`
}

function pixelToHex(px, py) {
  const rowApprox = (py - ORIG_Y) / ROW_H
  let bestRow = 0, bestCol = 0, bestDist = Infinity
  for (let dr = -2; dr <= 2; dr++) {
    const row = Math.round(rowApprox) + dr
    const xOrig = rowParity(row) === 0 ? EVEN_X : ODD_X
    const colApprox = (px - xOrig) / COL_W
    for (let dc = -1; dc <= 1; dc++) {
      const col = Math.round(colApprox) + dc
      const { x, y } = hexCenter(row, col)
      const dist = Math.hypot(px - x, py - y)
      if (dist < bestDist) { bestDist = dist; bestRow = row; bestCol = col }
    }
  }
  return { row: bestRow, col: bestCol }
}

const hovRow = ref(null)
const hovCol = ref(null)
let rafId = null

function onMouseMove(e) {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    const { row, col } = pixelToHex(e.clientX, e.clientY)
    if (row !== hovRow.value || col !== hovCol.value) {
      hovRow.value = row
      hovCol.value = col
    }
    rafId = null
  })
}

function onMouseLeave() {
  hovRow.value = null
  hovCol.value = null
}

const hovPolygon = computed(() => {
  if (hovRow.value === null) return null
  const { x, y } = hexCenter(hovRow.value, hovCol.value)
  return hexPoints(x, y)
})

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  document.documentElement.addEventListener('mouseleave', onMouseLeave)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  document.documentElement.removeEventListener('mouseleave', onMouseLeave)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <svg class="bg-hex-grid" aria-hidden="true">
    <polygon
      v-if="hovPolygon"
      :points="hovPolygon"
      class="bg-hex-cell"
    />
  </svg>
</template>

<style scoped>
.bg-hex-grid {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  pointer-events: none;
  overflow: visible;
}
.bg-hex-cell {
  fill: rgba(255, 110, 10, 0.28);
  stroke: none;
  transition: opacity 600ms ease;
}
@media (hover: none), (pointer: coarse) {
  .bg-hex-grid { display: none; }
}
</style>
