<script setup>
import { computed } from 'vue'

// 全域動作速度倍率：0.3 = 速度放慢到 30%（等同時間拉長約 3.33 倍）
const MOTION_SPEED = 0.3
const MOTION_TIME_SCALE = 1 / MOTION_SPEED

// PatternBackground 額外速度倍率：10 = 先用誇張值確認速度確實有生效
const PATTERN_SPEED_MULT = 10

// Speed presets (ms per cycle)
const SPEED = { Slow: 12000, Normal: 8000, Fast: 4000 }

// Size presets (px per tile)
const SIZES = { sm: 28, md: 40, lg: 56 }

const props = defineProps({
  animate:   { type: Boolean, default: true },
  direction: { type: String,  default: 'bottom' },  // 'top' | 'bottom' | 'left' | 'right' | 'diagonal'
  variant:   { type: String,  default: 'big-dot' }, // 'big-dot' | 'small-dot' | 'grid'
  size:      { type: [String, Number], default: 'md' },   // 'sm' | 'md' | 'lg' | Number(px)
  mask:      { type: String,  default: 'ellipse-top' }, // 'none' | 'ellipse-top' | 'ellipse-bottom' | 'fade-y' | 'fade-x'
  speed:     { type: [String, Number], default: 'Slow' }, // 'Slow'|'Normal'|'Fast' or ms
  color:     { type: String,  default: '' },              // CSS color, overrides default
})

const tilePx = computed(() =>
  typeof props.size === 'number' ? props.size : (SIZES[props.size] ?? 40)
)

const cycleMs = computed(() => {
  const base = typeof props.speed === 'number' ? props.speed : (SPEED[props.speed] ?? 12000)
  return Math.max(1, Math.round((base * MOTION_TIME_SCALE) / PATTERN_SPEED_MULT))
})

// Pattern color — caller passes explicit CSS color, or defaults per variant
const patColor = computed(() =>
  props.color || 'rgba(180,60,8,0.10)'
)

const bgImage = computed(() => {
  const c = patColor.value
  const t = tilePx.value
  if (props.variant === 'big-dot')
    return `radial-gradient(circle, ${c} ${t * 0.10}px, transparent ${t * 0.10}px)`
  if (props.variant === 'small-dot')
    return `radial-gradient(circle, ${c} ${t * 0.055}px, transparent ${t * 0.055}px)`
  // grid
  return `linear-gradient(${c} 1px, transparent 1px),
          linear-gradient(90deg, ${c} 1px, transparent 1px)`
})

// Mask gradient
const maskImage = computed(() => {
  switch (props.mask) {
    case 'ellipse-top':
      return 'radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%)'
    case 'ellipse-bottom':
      return 'radial-gradient(ellipse 80% 60% at 50% 100%, black 30%, transparent 100%)'
    case 'fade-y':
      return 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)'
    case 'fade-x':
      return 'linear-gradient(to right, transparent 0%, black 20%, black 80%, transparent 100%)'
    default:
      return 'none'
  }
})

const bgSize      = computed(() => `${tilePx.value}px ${tilePx.value}px`)
const animDur     = computed(() => `${cycleMs.value}ms`)
const negSize     = computed(() => `-${tilePx.value}px`)
const posSize     = computed(() => `${tilePx.value}px`)
</script>

<template>
  <div
    class="pat-bg"
    :class="[animate && `pat-move-${direction}`]"
    :style="{
      backgroundImage: bgImage,
      backgroundSize:  bgSize,
      WebkitMaskImage: maskImage,
      maskImage:       maskImage,
      '--pat-dur':     animDur,
      '--pat-neg':     negSize,
      '--pat-pos':     posSize,
    }"
  />
</template>

<style scoped>
.pat-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-repeat: repeat;
}

.pat-move-top      { animation: pat-top      var(--pat-dur) linear infinite; }
.pat-move-bottom   { animation: pat-bottom   var(--pat-dur) linear infinite; }
.pat-move-left     { animation: pat-left     var(--pat-dur) linear infinite; }
.pat-move-right    { animation: pat-right    var(--pat-dur) linear infinite; }
.pat-move-diagonal { animation: pat-diagonal var(--pat-dur) linear infinite; }

@keyframes pat-top      { from { background-position: 0 0; } to { background-position: 0 var(--pat-neg); } }
@keyframes pat-bottom   { from { background-position: 0 0; } to { background-position: 0 var(--pat-pos); } }
@keyframes pat-left     { from { background-position: 0 0; } to { background-position: var(--pat-neg) 0; } }
@keyframes pat-right    { from { background-position: 0 0; } to { background-position: var(--pat-pos) 0; } }
@keyframes pat-diagonal { from { background-position: 0 0; } to { background-position: var(--pat-neg) var(--pat-neg); } }
</style>
