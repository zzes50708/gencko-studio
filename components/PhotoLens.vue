<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'

// 採用 Inspira UI Lens 的圓形遮罩與游標原點縮放；觸控裝置不綁定滑鼠事件。
const props = withDefaults(
  defineProps<{
    src: string
    zoomFactor?: number
    lensSize?: number
    fit?: 'cover' | 'contain'
  }>(),
  { zoomFactor: 2.25, lensSize: 300, fit: 'cover' }
)
const enabled = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')
const hovering = ref(false)
const lensFailed = ref(false)
const position = ref({ x: 0, y: 0 })
function move(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  position.value = { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
const listeners = computed(() =>
  enabled.value
    ? {
        mouseenter: (event: MouseEvent) => {
          move(event)
          hovering.value = true
        },
        mousemove: move,
        mouseleave: () => {
          hovering.value = false
        }
      }
    : {}
)
const origin = computed(() => `${position.value.x}px ${position.value.y}px`)
const mask = computed(
  () =>
    `radial-gradient(circle ${props.lensSize / 2}px at ${origin.value}, black 100%, transparent 100%)`
)
watch(enabled, () => {
  hovering.value = false
})
watch(
  () => props.src,
  () => {
    hovering.value = false
    lensFailed.value = false
  }
)
</script>

<template>
  <div class="photo-lens" :data-lens-enabled="enabled" v-on="listeners">
    <slot />
    <Transition name="photo-lens-focus">
      <div
        v-if="enabled && hovering && !lensFailed"
        class="photo-lens__overlay"
        aria-hidden="true"
        :style="{ maskImage: mask, WebkitMaskImage: mask, transformOrigin: origin }"
      >
        <div
          class="photo-lens__zoom"
          :style="{ transform: `scale(${zoomFactor})`, transformOrigin: origin }"
        >
          <img
            :src="src"
            alt=""
            draggable="false"
            :style="{ objectFit: fit }"
            @error="lensFailed = true"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.photo-lens {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
}
.photo-lens__overlay,
.photo-lens__zoom {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.photo-lens__overlay {
  overflow: hidden;
}
.photo-lens__zoom img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
}
.photo-lens-focus-enter-active,
.photo-lens-focus-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms var(--motion-ease-out);
}
.photo-lens-focus-enter-from {
  opacity: 0;
  transform: scale(0.58);
}
.photo-lens-focus-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
@media (prefers-reduced-motion: reduce) {
  .photo-lens-focus-enter-active,
  .photo-lens-focus-leave-active {
    transition: none;
  }
  .photo-lens-focus-enter-from,
  .photo-lens-focus-leave-to {
    transform: none;
  }
}
</style>
