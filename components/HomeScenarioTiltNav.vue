<script setup>
defineProps({
  ariaLabel: { type: String, default: '快速導覽' },
})
</script>

<template>
  <nav class="home-scenario-grid stack-tilt-wrap" :aria-label="ariaLabel">
    <slot />
  </nav>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .stack-tilt-wrap {
    perspective: 900px;
    perspective-origin: 50% 35%;
  }

  /* 桌機用 flex 才能真正「微重疊」看到層級差 */
  .stack-tilt-wrap {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 0;
  }

  /* hover 任一張卡時，其他卡略降存在感 */
  .stack-tilt-wrap:hover :deep(.stack-tilt-card) {
    opacity: 0.92;
  }
  .stack-tilt-wrap:hover :deep(.stack-tilt-card:hover),
  .stack-tilt-wrap:hover :deep(.stack-tilt-card:focus-visible) {
    opacity: 1;
  }
}
</style>
