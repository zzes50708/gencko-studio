<script setup>
import { computed } from 'vue'

// 三頁共用的頁尾 CTA：kicker + 標題 + lead + 一排按鈕（主/次）。
const props = defineProps({
  kicker: { type: String, default: 'NEXT' },
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  // [{ label, to, primary? }]
  actions: { type: Array, default: () => [] }
})

// 手機版欄數：4 顆用 2×2，其餘照顆數排一列。
const mobileCols = computed(() => (props.actions.length === 4 ? 2 : props.actions.length || 1))
</script>

<template>
  <section class="next-cta card">
    <div class="next-head">
      <div class="next-kicker">{{ kicker }}</div>
      <h2 class="sec-title">{{ title }}</h2>
      <p v-if="lead" class="next-lead">{{ lead }}</p>
    </div>

    <div class="next-actions" :style="{ '--cols': mobileCols }">
      <NuxtLink
        v-for="a in actions"
        :key="a.to"
        :to="a.to"
        class="btn-app btn-app--md btn-app--pill"
        :class="a.primary ? 'btn-app--primary' : 'btn-app--ghost'"
      >
        {{ a.label }}
      </NuxtLink>
    </div>
  </section>
</template>

<style scoped>
.next-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  padding: 20px;
  background: var(--card-bg);
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.next-head {
  display: grid;
  gap: 8px;
}

.next-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pri);
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
}

.next-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--pri);
  box-shadow: 0 0 0 4px var(--pri-glow-soft);
}

.sec-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
}

.next-lead {
  margin: 0;
  color: var(--txt);
  opacity: 0.78;
  font-size: 0.92rem;
}

.next-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .next-cta {
    padding: 16px;
    gap: 14px;
  }

  .sec-title {
    font-size: 0.98rem;
  }

  .next-lead {
    font-size: 0.86rem;
  }

  .next-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
  }

  .next-actions .btn-app {
    padding-inline: 8px;
  }
}
</style>
