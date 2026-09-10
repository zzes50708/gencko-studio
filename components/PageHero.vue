<script setup lang="ts">
// 三頁共用的 Hero：kicker（色點）+ 標題 + lead + 主色 glow。
// 右側/下方的輔助內容（流程 stepper、pill 流程帶、信任理由）由 slot 傳入，
// slot 內容仍由呼叫頁的 scoped 樣式負責（.hero-flow / .hero-strip / .hero-reasons）。
defineProps({
  kicker: { type: String, required: true },
  title: { type: String, required: true },
  lead: { type: String, default: '' },
  // 'split' = 左文右輔助雙欄；'stack' = 文字在上、輔助在下整寬
  layout: { type: String, default: 'split' }
})
</script>

<template>
  <section class="page-hero card" :class="`page-hero--${layout}`">
    <div class="hero-copy">
      <div class="hero-kicker">{{ kicker }}</div>
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="lead" class="hero-lead">{{ lead }}</p>
    </div>
    <div class="hero-aux">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.page-hero {
  position: relative;
  padding: clamp(28px, 5vw, 64px) 0;
  margin-bottom: clamp(24px, 4vw, 48px);
  border-block: 1px solid var(--bd);
  background: transparent;
  overflow: visible;
}

.card {
  border-radius: 0;
  box-shadow: none;
}

.page-hero::before {
  display: none;
}

.page-hero--split {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: var(--space-5);
  align-items: center;
}

.page-hero--stack {
  display: grid;
  gap: var(--space-3);
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: var(--space-2);
}

.hero-aux {
  position: relative;
  z-index: 1;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--pri);
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
}

.hero-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 0;
  background: var(--pri);
  box-shadow: none;
}

.hero-lead {
  margin: 0;
  color: var(--txt);
  opacity: 0.78;
  line-height: 1.55;
  font-size: 0.95rem;
}

@media (max-width: 900px) {
  .page-hero--split {
    grid-template-columns: 1fr;
    gap: var(--space-4);
  }
}

@media (max-width: 640px) {
  .page-hero {
    padding: 24px 0;
  }

  .page-title {
    font-size: 1.32rem;
  }

  .hero-lead {
    font-size: 0.86rem;
  }
}
</style>
