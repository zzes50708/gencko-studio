<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useIntersectionObserver, useMediaQuery } from '@vueuse/core'

// 漸進增強：SSR、無 JS 及減少動態時內容預設可見。
const root = ref<HTMLElement | null>(null)
const hidden = ref(false)
const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const { stop } = useIntersectionObserver(
  root,
  ([entry]) => {
    if (entry?.isIntersecting) {
      hidden.value = false
      stop()
    }
  },
  { threshold: 0.08 }
)

onMounted(() => {
  if (!reduceMotion.value && 'IntersectionObserver' in window && root.value) {
    hidden.value = root.value.getBoundingClientRect().top > window.innerHeight
  }
})
watch(reduceMotion, (value) => {
  if (value) hidden.value = false
})
onUnmounted(stop)
</script>

<template>
  <div ref="root" class="experience-reveal" :class="{ 'experience-reveal--pending': hidden }">
    <slot />
  </div>
</template>

<style scoped>
.experience-reveal {
  min-width: 0;
  opacity: 1;
  transform: none;
  transition:
    opacity var(--motion-duration-scene) var(--motion-ease-out),
    transform var(--motion-duration-scene) var(--motion-ease-out);
}
.experience-reveal--pending {
  opacity: 0;
  transform: translateY(12px);
}
.experience-reveal:focus-within {
  opacity: 1;
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .experience-reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
