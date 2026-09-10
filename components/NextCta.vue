<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'

interface CtaAction {
  label: string
  to: string
  primary?: boolean
}

// 三頁共用的頁尾 CTA：kicker + 標題 + lead + 一排按鈕（主/次）。
const props = defineProps({
  kicker: { type: String, default: 'NEXT' },
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  actions: { type: Array as PropType<CtaAction[]>, default: () => [] }
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
        no-prefetch
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
  gap: var(--space-5);
  padding: clamp(28px, 5vw, 56px) 0;
  border-block: 1px solid var(--bd);
  background: transparent;
}

.card {
  border-radius: 0;
  box-shadow: none;
}

.next-head {
  display: grid;
  gap: var(--space-2);
}

.next-kicker {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--pri);
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
}

.next-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 0;
  background: var(--pri);
  box-shadow: none;
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
  gap: var(--space-2);
}

@media (max-width: 640px) {
  .next-cta {
    padding: 24px 0;
    gap: var(--space-3);
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
