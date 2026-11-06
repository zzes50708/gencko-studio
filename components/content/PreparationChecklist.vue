<script setup lang="ts">
import { computed, ref } from 'vue'

// 項目取自新手頁既有用品說明；勾選只代表用品備妥，不作飼養資格判定。
const items = ['房子', '底材', '加熱墊', '躲避屋', '水盆', '餌料', 'D3鈣粉', '綜合維他命']
const checked = ref<string[]>([])
const progress = computed(() => checked.value.length / items.length)
</script>

<template>
  <section class="preparation-checklist" aria-label="到家前用品清單">
    <div class="preparation-heading">
      <div>
        <span class="preparation-kicker">BEFORE ARRIVAL</span>
        <h3>逐項確認，準備好再出發</h3>
      </div>
      <span class="preparation-count" role="status" aria-live="polite">
        已備妥 {{ checked.length }} / {{ items.length }} 項
      </span>
    </div>
    <div
      class="preparation-meter"
      role="progressbar"
      aria-label="用品準備進度"
      :aria-valuenow="checked.length"
      :aria-valuemax="items.length"
      aria-valuemin="0"
    >
      <span :style="{ transform: `scaleX(${progress})` }" />
    </div>
    <div class="preparation-items">
      <label
        v-for="(item, index) in items"
        :key="item"
        :class="{ 'is-checked': checked.includes(item) }"
      >
        <input v-model="checked" type="checkbox" :value="item" />
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <path d="m6 12 4 4 8-8" />
        </svg>
        <span>{{ item }}</span>
        <span class="preparation-index" aria-hidden="true">0{{ index + 1 }}</span>
      </label>
    </div>
    <p>本次頁面的用品確認清單；環境設置與到家安排，請一併閱讀上下方說明。</p>
  </section>
</template>

<style scoped>
.preparation-checklist {
  margin-top: 24px;
  border-top: 1px solid var(--bd);
  padding-top: 20px;
}
.preparation-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 12px;
  flex-wrap: wrap;
}
.preparation-kicker {
  color: var(--pri);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}
.preparation-heading h3 {
  margin: 6px 0 0;
  font-size: 1rem;
  color: var(--txt);
}
.preparation-count {
  color: var(--txt-muted);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}
.preparation-meter {
  height: 3px;
  background: var(--bd);
  margin-block: 16px;
  overflow: hidden;
}
.preparation-meter > span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--pri);
  transform-origin: left;
  transition: transform 400ms var(--motion-ease-out);
}
.preparation-items {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.preparation-items label {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 56px;
  padding: 10px 12px;
  border: 1px solid var(--bd);
  color: var(--txt);
  font-size: 0.85rem;
  cursor: pointer;
}
.preparation-items input {
  position: absolute;
  inset: 0;
  opacity: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  cursor: pointer;
}
.preparation-items svg {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  fill: none;
  stroke: var(--txt-muted);
  stroke-width: 1.5;
}
.preparation-items path {
  stroke: var(--pri);
  stroke-width: 2;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset 240ms var(--motion-ease-out);
}
.preparation-items .is-checked {
  background: var(--pri-glow-soft);
  border-color: var(--pri);
}
.preparation-items .is-checked path {
  stroke-dashoffset: 0;
}
.preparation-items input:focus-visible + svg {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
.preparation-index {
  margin-left: auto;
  font-size: 0.65rem;
  color: var(--txt-muted);
}
.preparation-checklist p {
  font-size: 0.75rem;
  color: var(--txt-muted);
  line-height: 1.8;
  margin: 14px 0 0;
}
@media (max-width: 767px) {
  .preparation-items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .preparation-index {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .preparation-meter > span,
  .preparation-items path {
    transition: none;
  }
}
</style>
