<script setup>
import { computed } from 'vue'

const props = defineProps({
  colors:       { type: Array,  default: () => ['#FF8C00', '#FFD700', '#FF5A1F', '#E8440A', '#FF8C00'] },
  duration:     { type: Number, default: 2500 },
  borderWidth:  { type: Number, default: 2 },
  borderRadius: { type: Number, default: 12 },
  blur:         { type: Number, default: 4 },
  bgColor:      { type: String, default: null },
})

const dur      = computed(() => `${props.duration}ms`)
const allColors = computed(() => props.colors.join(', '))
const bw        = computed(() => `${props.borderWidth}px`)
const br        = computed(() => `${props.borderRadius}px`)
const brInner   = computed(() => `${Math.max(0, props.borderRadius - props.borderWidth)}px`)
const blurVal   = computed(() => `${props.blur}px`)
const bg        = computed(() => props.bgColor ?? 'var(--gb-inner-bg, var(--card-bg-solid))')
</script>

<template>
  <div class="gb-outer">
    <div class="gb-inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.gb-outer {
  position: relative;
  padding: v-bind(bw);
  border-radius: v-bind(br);
  overflow: hidden;
}

.gb-outer::before {
  content: '';
  position: absolute;
  inset: -200%;
  background: conic-gradient(v-bind(allColors));
  animation: gb-spin v-bind(dur) linear infinite;
  filter: blur(v-bind(blurVal));
}

.gb-inner {
  position: relative;
  z-index: 1;
  border-radius: v-bind(brInner);
  overflow: hidden;
  background: v-bind(bg);
}

@keyframes gb-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .gb-outer::before { animation: none; }
}
</style>
