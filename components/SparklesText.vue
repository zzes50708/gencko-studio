<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps({ spawnInterval: { type: Number, default: 180 } })

const COLORS = ['#FF8C00', '#FFD700']

let uid = 0
const sparkles = ref([])
const now = ref(Date.now())
let raf = null
let spawner = null

function spawnStar() {
  sparkles.value.push({
    id: uid++,
    x:    5 + Math.random() * 90,
    y:    5 + Math.random() * 90,
    rot:  Math.random() * 360,
    size: Math.round(28 + Math.random() * 20),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    born: Date.now(),
    life: 700 + Math.random() * 400,
  })
}

function tick() {
  const t = Date.now()
  now.value = t
  sparkles.value = sparkles.value.filter(s => t - s.born < s.life)
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  raf = requestAnimationFrame(tick)
  spawner = setInterval(spawnStar, props.spawnInterval)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  clearInterval(spawner)
})

function starStyle(s) {
  const p = Math.min((now.value - s.born) / s.life, 1)
  const opacity = p < 0.4 ? p / 0.4 : 1 - (p - 0.4) / 0.6
  const scale   = p < 0.5 ? p / 0.5  : 1 - (p - 0.5) / 0.5
  const rot     = s.rot + p * 180
  return {
    position:      'absolute',
    left:          s.x + '%',
    top:           s.y + '%',
    width:         s.size + 'px',
    height:        s.size + 'px',
    opacity:       Math.max(0, opacity),
    transform:     `translate(-50%,-50%) scale(${Math.max(0, scale)}) rotate(${rot}deg)`,
    pointerEvents: 'none',
    zIndex:        30,
    fill:          s.color,
  }
}
</script>

<template>
  <span class="sp-wrap">
    <svg
      v-for="s in sparkles"
      :key="s.id"
      viewBox="0 0 21 21"
      aria-hidden="true"
      :style="starStyle(s)"
    >
      <path
        d="M9.82531 0.843845C10.0553 0.215178 10.9446 0.215178 11.1746 0.843845L11.8618 2.72026C12.4006 4.19229 12.3916 6.39157 13.5 7.5C14.6084 8.60843 16.8077 8.59935 18.2797 9.13822L20.1561 9.82534C20.7858 10.0553 20.7858 10.9447 20.1561 11.1747L18.2797 11.8618C16.8077 12.4007 14.6084 12.3916 13.5 13.5C12.3916 14.6084 12.4006 16.8077 11.8618 18.2798L11.1746 20.1562C10.9446 20.7858 10.0553 20.7858 9.82531 20.1562L9.13819 18.2798C8.59932 16.8077 8.60843 14.6084 7.5 13.5C6.39157 12.3916 4.19225 12.4007 2.72023 11.8618L0.843814 11.1747C0.215148 10.9447 0.215148 10.0553 0.843814 9.82534L2.72023 9.13822C4.19225 8.59935 6.39157 8.60843 7.5 7.5C8.60843 6.39157 8.59932 4.19229 9.13819 2.72026L9.82531 0.843845Z"
        :fill="s.color"
      />
    </svg>
    <slot />
  </span>
</template>

<style scoped>
.sp-wrap {
  position: relative;
  display: inline-block;
  width: 100%;
  overflow: visible;
}

@media (hover: none), (pointer: coarse) {
  .sp-wrap svg { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sp-wrap svg { display: none; }
}
</style>
