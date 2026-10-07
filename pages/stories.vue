<script setup lang="ts">
import { useHead } from '#imports'

const pageUrl = 'https://www.genckobreeding.com/stories'

const currentActions = [
  { label: '先看新手入門', to: '/start-here' },
  { label: '先看信任保證', to: '/why-gencko' },
  { label: '先去選購守宮', to: '/shop' }
]

useHead({
  title: '客戶案例｜展覽與真實飼養故事預備頁',
  meta: [
    {
      name: 'description',
      content: '這是未來要放客戶案例、展覽照片與真實飼養故事的預備頁，先保留內容位置與結構。'
    },
    { name: 'robots', content: 'noindex, follow' },
    { property: 'og:title', content: '客戶案例｜展覽與真實飼養故事預備頁' },
    {
      property: 'og:description',
      content: '先建立案例頁骨架，後續可逐步補上展覽花絮、到家紀錄與真實客戶故事。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})
</script>

<template>
  <div class="site-document-page stories-page" data-testid="stories-holding-page">
    <div class="stories-document-meta" aria-label="故事頁面說明">
      <span>GENCKO STORY ARCHIVE</span>
      <span>REAL RECORDS IN PREPARATION</span>
    </div>
    <header class="hero card">
      <div>
        <div class="eyebrow">STORIES</div>
        <h1 class="page-title">真實故事，內容整理中</h1>
        <p class="lead">
          我們只會在取得可公開的真實照片與紀錄後發布案例。整理完成前，先從現有飼養內容與個體資料認識
          Gencko。
        </p>
      </div>
    </header>

    <section class="content-section">
      <article class="card content-card">
        <div class="section-head">
          <h2 class="sec-title">先看看這些內容</h2>
        </div>
        <div class="action-grid">
          <NuxtLink
            no-prefetch
            v-for="item in currentActions"
            :key="item.to"
            :to="item.to"
            class="link-chip"
          >
            {{ item.label }}
          </NuxtLink>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.stories-page {
  padding-block: 8px 28px;
}
.stories-document-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.68rem;
  font-weight: 800;
}
.stories-document-meta span:first-child,
.eyebrow {
  color: var(--pri);
}
.hero {
  padding-block: 12px;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}
.eyebrow {
  font-size: 0.8rem;
  font-weight: 900;
}
.page-title {
  margin-block: 6px 8px;
  color: var(--txt);
  font-family: var(--font-heading-zh);
  line-height: var(--site-page-title-line);
}
.lead {
  margin: 0;
  color: var(--txt-muted);
  line-height: 1.6;
}
.content-section {
  margin-block: 12px 0;
}
.content-card {
  padding: 0;
  border: 0;
  box-shadow: none;
  background: transparent;
}
.section-head {
  margin-bottom: 8px;
}
.sec-title {
  margin: 0;
  font-size: 1rem;
}
.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.link-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 6px 8px;
  border: 1px solid var(--txt);
  border-radius: 2px;
  color: var(--txt);
  text-decoration: none;
  font-weight: 800;
}
.link-chip:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
