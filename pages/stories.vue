<script setup>
import { useHead } from '#imports'

const pageUrl = 'https://www.genckobreeding.com/stories'

const upcomingBlocks = [
  {
    title: '客戶到家紀錄',
    body: '之後會放新手實際到家後的環境配置、穩定流程與飼養心得，讓訪客看到真實落地情境。'
  },
  {
    title: '展覽與現場花絮',
    body: '你之後參展時拍到的展場照片、互動紀錄與作品展示，可以集中整理在這裡。'
  },
  {
    title: '案例型內容',
    body: '不是做成流水帳，而是做成有前後對照、有重點學習價值的案例頁，提升信任感與內容厚度。'
  }
]

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
  <div class="stories-page">
    <header class="hero card">
      <div>
        <div class="eyebrow">STORIES</div>
        <h1 class="page-title">客戶案例</h1>
        <p class="lead">
          這頁先作為預備頁使用。等你後續參展、補拍客戶案例與展覽素材後，可以直接把真實照片與故事掛上來。
        </p>
      </div>
      <div class="hero-state">
        <div class="hero-state-badge">目前狀態</div>
        <p>已先建立頁面結構，之後可直接替換成展覽照片、到家紀錄與案例內容，不需要重做導覽。</p>
      </div>
    </header>

    <section class="content-section">
      <div class="section-head">
        <h2 class="sec-title">之後適合放什麼</h2>
      </div>
      <div class="story-grid">
        <article v-for="item in upcomingBlocks" :key="item.title" class="story-card card">
          <h3 class="story-title">{{ item.title }}</h3>
          <p class="story-body">{{ item.body }}</p>
        </article>
      </div>
    </section>

    <section class="content-section">
      <article class="card content-card">
        <div class="section-head">
          <h2 class="sec-title">這段期間可以先導去哪裡</h2>
        </div>
        <div class="action-grid">
          <NuxtLink v-for="item in currentActions" :key="item.to" :to="item.to" class="link-chip">
            {{ item.label }}
          </NuxtLink>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.stories-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 12px 28px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
  gap: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.eyebrow {
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  color: var(--pri);
}

.lead,
.story-body,
.hero-state p {
  color: var(--txt);
  opacity: 0.82;
  line-height: 1.78;
}

.hero-state,
.content-card {
  padding: 14px;
}

.hero-state {
  border: 1px dashed var(--bd-hover);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(232, 68, 10, 0.1), transparent 60%), rgba(128, 128, 128, 0.04);
}

.hero-state-badge,
.story-title {
  color: var(--txt);
  font-weight: 900;
}

.hero-state-badge {
  display: inline-flex;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(232, 68, 10, 0.14);
  color: var(--pri);
  margin-bottom: 8px;
}

.content-section {
  margin-bottom: 12px;
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.story-card {
  padding: 14px;
}

.story-title {
  margin: 0 0 8px;
  font-size: 1.12rem;
}

.content-card {
  padding: 14px;
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
  min-height: 52px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.06);
  color: var(--txt);
  text-decoration: none;
  font-weight: 800;
}

@media (hover: hover) and (pointer: fine) {
  .link-chip:hover {
    border-color: var(--bd-hover);
    color: var(--pri);
  }
}

@media (max-width: 900px) {
  .hero,
  .story-grid,
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>
