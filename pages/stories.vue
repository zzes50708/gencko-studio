<script setup lang="ts">
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
  <div class="stories-page" data-testid="stories-holding-page">
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
      <div class="hero-state">
        <div class="hero-state-badge">內容整理中</div>
        <p>目前沒有以示意心得冒充客戶見證；本頁維持預備狀態，並保留前往既有公開內容的入口。</p>
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
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(24px, 4vw, 56px) 18px 72px;
}

.stories-document-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 14px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.stories-document-meta span:first-child {
  color: var(--pri);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
  gap: clamp(28px, 5vw, 72px);
  position: relative;
  overflow: hidden;
  padding: clamp(26px, 5vw, 68px) 0;
  margin-bottom: clamp(40px, 6vw, 80px);
  border: 0;
  border-block: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
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

.page-title {
  max-width: 760px;
  margin: 8px 0 18px;
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(2.5rem, 6vw, 5.8rem);
  font-weight: 600;
  line-height: 1.04;
  letter-spacing: -0.045em;
}

.hero-state,
.content-card {
  padding: 14px;
}

.hero-state {
  align-self: end;
  border: 1px solid var(--bd);
  border-left: 2px solid var(--pri);
  border-radius: 2px;
  background: var(--card-bg);
}

.hero-state-badge,
.story-title {
  color: var(--txt);
  font-weight: 900;
}

.hero-state-badge {
  display: inline-flex;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: var(--pri);
  margin-bottom: 10px;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
}

.content-section {
  margin-bottom: clamp(44px, 7vw, 88px);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  border-top: 1px solid var(--bd);
}

.story-card {
  min-height: 210px;
  padding: clamp(20px, 3vw, 34px);
  border: 0;
  border-right: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.story-card:last-child {
  border-right: 0;
}

.story-title {
  margin: 0 0 8px;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.24rem;
  font-weight: 600;
  letter-spacing: -0.025em;
}

.content-card {
  padding: clamp(24px, 4vw, 48px) 0 0;
  border: 0;
  border-top: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  border: 1px solid var(--bd);
}

.link-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--control-min-height);
  padding: 8px 10px;
  border-radius: 0;
  border: 0;
  border-right: 1px solid var(--bd);
  background: transparent;
  color: var(--txt);
  text-decoration: none;
  font-weight: 800;
  transition:
    border-color var(--transition),
    color var(--transition),
    background-color var(--transition);
}

.link-chip:last-child {
  border-right: 0;
}

.link-chip:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
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

  .stories-page {
    padding: 4px 10px 32px;
  }

  .story-card,
  .story-card:last-child,
  .link-chip,
  .link-chip:last-child {
    border-right: 0;
    border-bottom: 1px solid var(--bd);
  }

  .action-grid {
    border-bottom: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .link-chip {
    transition: none;
  }
}
/* 預備內容維持普通章節，不製造空白卡片。 */
.stories-page {
  padding: 8px 18px 28px;
}
.hero {
  padding: 22px 0;
  margin-bottom: 20px;
  border-top: 0;
  gap: 24px;
}
.page-title {
  font-size: clamp(2rem, 4.5vw, 3.7rem);
  line-height: 1.3;
}
.hero-state {
  padding: 14px 0;
  border: 0;
  border-top: 1px solid var(--bd);
  background: transparent;
}
.content-section {
  margin-bottom: 22px;
}
.story-grid {
  gap: 0 24px;
}
.story-card {
  padding: 18px 0;
  min-height: 0;
  border-right: 0;
}
.content-card {
  padding-top: 18px;
}
.action-grid {
  gap: 8px;
  border: 0;
}
.link-chip,
.link-chip:last-child {
  min-height: 44px;
  border: 1px solid var(--txt);
  border-radius: 2px;
}
/* 本頁返回與次要操作使用同一按鈕形式。 */
:deep(.app-back-btn),
.btn-app {
  border-radius: 2px;
  min-height: 44px;
  box-shadow: none;
  font-family: var(--font-body-zh);
}
:deep(.app-back-btn) {
  border: 1px solid var(--txt);
}
</style>
