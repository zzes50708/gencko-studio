<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  rows: { dim: string; leopard: string; fat: string }[]
}>()
const selected = ref(0)
const current = computed(() => props.rows[selected.value]!)
</script>

<template>
  <section class="species-study" aria-label="觀察兩種守宮的差異">
    <div class="study-heading">
      <span>FIELD COMPARISON</span>
      <span>選一項特徵，並排觀察</span>
    </div>
    <div class="study-switch" role="group" aria-label="選擇比較特徵">
      <span
        class="study-selection"
        aria-hidden="true"
        :style="{ transform: `translateX(${selected * 100}%)` }"
      />
      <button
        v-for="(row, index) in rows"
        :key="row.dim"
        type="button"
        :aria-pressed="selected === index"
        @click="selected = index"
      >
        {{ row.dim }}
      </button>
    </div>
    <slot :feature="current.dim" />
    <div class="study-result" role="status" aria-live="polite" aria-atomic="true">
      <div class="study-caption">
        <span>{{ current.dim }}</span>
        <span aria-hidden="true">0{{ selected + 1 }} / 0{{ rows.length }}</span>
      </div>
      <Transition name="study-detail" mode="out-in">
        <dl :key="current.dim" class="study-pair">
          <div>
            <dt>豹紋守宮</dt>
            <dd>{{ current.leopard }}</dd>
          </div>
          <div>
            <dt>肥尾守宮</dt>
            <dd>{{ current.fat }}</dd>
          </div>
        </dl>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.species-study {
  margin-block: 18px;
}
.study-heading,
.study-caption {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--txt-muted);
  font-size: 0.75rem;
}
.study-heading > span:first-child {
  color: var(--pri);
  font-weight: 800;
  letter-spacing: 0.1em;
}
.study-switch {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 12px 0 20px;
  border-block: 1px solid var(--bd);
}
.study-switch button {
  border: 0;
  background: transparent;
  color: var(--txt);
  font: inherit;
  font-size: 0.85rem;
  min-height: 48px;
  padding: 8px 4px;
  cursor: pointer;
}
.study-switch button[aria-pressed='true'] {
  color: var(--pri);
  font-weight: 800;
}
.study-selection {
  position: absolute;
  z-index: -1;
  inset: 0 auto 0 0;
  width: 25%;
  border-bottom: 2px solid var(--pri);
  background: var(--pri-glow-soft);
  transition: transform 320ms var(--motion-ease-out);
}
.study-result {
  border-block: 1px solid var(--bd);
  padding-block: 16px;
}
.study-caption {
  color: var(--pri);
  font-weight: 800;
}
.study-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 14px 0 0;
  min-height: 112px;
}
.study-pair > div {
  padding: 0 20px;
}
.study-pair > div:first-child {
  border-right: 1px solid var(--bd);
  padding-left: 0;
}
.study-pair dt {
  font-size: 0.75rem;
  color: var(--txt-muted);
  margin-bottom: 8px;
}
.study-pair dd {
  margin: 0;
  line-height: 1.8;
  font-size: 0.95rem;
  color: var(--txt);
}
.study-detail-enter-active,
.study-detail-leave-active {
  transition:
    opacity 140ms ease,
    transform 200ms var(--motion-ease-out);
}
.study-detail-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.study-detail-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
button:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: -3px;
}
@media (max-width: 767px) {
  .study-pair {
    min-height: 190px;
  }
  .study-pair > div {
    padding-inline: 12px;
  }
  .study-heading {
    font-size: 0.65rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .study-selection,
  .study-detail-enter-active,
  .study-detail-leave-active {
    transition: none;
  }
  .study-detail-enter-from,
  .study-detail-leave-to {
    transform: none;
  }
}
</style>
