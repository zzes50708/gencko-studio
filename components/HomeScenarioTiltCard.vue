<script setup>
import { useAttrs } from 'vue'
import AtroposCard from '~/components/AtroposCard.vue'

const props = defineProps({
  index: { type: Number, required: true },
  to: { type: String, default: '' },
})

const attrs = useAttrs()
</script>

<template>
  <AtroposCard :rotate="14" :highlight="false" :shadow="false" :base-rotate-y="14" :base-rotate-x="2">
    <component
      :is="to ? 'NuxtLink' : 'div'"
      :to="to || undefined"
      class="scenario-card stack-tilt-card"
      :style="{ '--stack-i': String(index) }"
      v-bind="attrs"
    >
      <slot />
    </component>
  </AtroposCard>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .stack-tilt-card {
    position: relative;
    /* 位置與層級：靜態傾斜交給 AtroposCard 的 baseRotate  */
    transform: translateX(calc(var(--stack-i, 0) * -10px));
    z-index: calc(100 - (var(--stack-i, 0) * 2));
    will-change: transform;
  }

  /* 讓卡片微微重疊 */
  .stack-tilt-card:not(:first-child) {
    margin-left: -14px;
  }

  .stack-tilt-card:hover,
  .stack-tilt-card:focus-visible {
    transform: translateX(calc(var(--stack-i, 0) * -10px)) translateY(-6px);
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--bd-hover);
    border-color: var(--bd-hover);
    z-index: 999;
  }
}
</style>
