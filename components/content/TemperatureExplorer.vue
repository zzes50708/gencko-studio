<script setup lang="ts">
import { computed, ref } from 'vue'
import { TEMP_GRADIENT } from '~/utils/care'

const zones = [TEMP_GRADIENT.cold, TEMP_GRADIENT.middle, TEMP_GRADIENT.hot]
const selected = ref(0)
const current = computed(() => zones[selected.value]!)
</script>

<template>
  <section class="temperature-study" aria-label="探索溫度梯度">
    <div class="temperature-heading">
      <span>THERMAL GRADIENT</span>
      <span>點選區域，觀察冷熱配置</span>
    </div>
    <div class="temperature-track" aria-hidden="true">
      <span class="temperature-marker" :style="{ transform: `translateX(${selected * 100}%)` }">
        <span>↓</span>
      </span>
    </div>
    <div class="temperature-zones" role="group" aria-label="選擇溫度區域">
      <button
        v-for="(zone, index) in zones"
        :key="zone.label"
        type="button"
        :aria-pressed="selected === index"
        @click="selected = index"
      >
        <strong>{{ zone.range }}</strong>
        <span>{{ zone.label }}</span>
      </button>
    </div>
    <div class="temperature-summary" role="status" aria-live="polite" aria-atomic="true">
      <Transition name="temperature-value" mode="out-in">
        <div :key="selected">
          <span>{{ current.label }}</span>
          <strong>{{ current.range }}</strong>
        </div>
      </Transition>
      <p>冷熱區需同時保留；示意位置與色帶不代表實測分布。</p>
    </div>
  </section>
</template>

<style scoped>
.temperature-study {
  margin-block: 16px;
  border: 1px solid var(--bd);
  padding: 20px;
  border-radius: var(--radius-md);
  background: var(--card-bg);
}
.temperature-heading {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.7rem;
  color: var(--txt-muted);
}
.temperature-heading > span:first-child {
  font-weight: 800;
  letter-spacing: 0.1em;
  color: var(--pri);
}
.temperature-track {
  height: 14px;
  margin-top: 38px;
  background: linear-gradient(90deg, #3b82f6, #facc15, #fb923c);
  border-radius: 3px;
  position: relative;
}
.temperature-marker {
  position: absolute;
  top: -28px;
  width: 33.33333%;
  text-align: center;
  color: var(--txt);
  transition: transform 400ms var(--motion-ease-out);
}
.temperature-marker > span {
  display: inline-block;
  font-size: 24px;
  line-height: 28px;
  font-weight: 800;
}
.temperature-zones {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 10px;
}
.temperature-zones button {
  display: grid;
  justify-items: center;
  gap: 5px;
  padding: 12px 4px;
  min-height: 72px;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--txt-muted);
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.temperature-zones button[aria-pressed='true'] {
  color: var(--txt);
  border-bottom-color: var(--pri);
  background: var(--pri-glow-soft);
}
.temperature-zones strong {
  font-size: clamp(0.85rem, 2vw, 1.15rem);
  font-variant-numeric: tabular-nums;
}
.temperature-zones button > span {
  font-size: 0.75rem;
}
.temperature-summary {
  border-top: 1px solid var(--bd);
  margin-top: 16px;
  padding-top: 16px;
}
.temperature-summary > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 36px;
}
.temperature-summary strong {
  font-size: 1.6rem;
  font-variant-numeric: tabular-nums;
  color: var(--pri);
}
.temperature-summary p {
  margin: 12px 0 0;
  font-size: 0.75rem;
  line-height: 1.7;
  color: var(--txt-muted);
}
.temperature-value-enter-active,
.temperature-value-leave-active {
  transition:
    opacity 120ms ease,
    transform 180ms var(--motion-ease-out);
}
.temperature-value-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.temperature-value-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
button:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: -3px;
}
@media (max-width: 767px) {
  .temperature-study {
    padding: 14px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .temperature-marker,
  .temperature-value-enter-active,
  .temperature-value-leave-active {
    transition: none;
  }
  .temperature-value-enter-from,
  .temperature-value-leave-to {
    transform: none;
  }
}
</style>
