<script setup>
import { useHead } from '#imports'

const pageUrl = 'https://www.genckobreeding.com/why-gencko'

const trustRows = [
  { title: '個體資料公開', body: '編號、性別、生日、品種都在頁面上。' },
  { title: '飼養方式透明', body: '溫度、濕度、餵食頻率整理成一頁。' },
  { title: '工具開放試', body: '基因計算機直接開放使用。' },
  { title: '醫療先備好', body: '特寵醫院名單先列好。' }
]

// 連結地圖：四張卡整張可點，各對到一個真實頁面。
// （身分證改連 /shop：/identity 是動態路由需 id，裸 /identity 不 match。）
const overviewBlocks = [
  {
    tag: '身分證',
    title: '每隻都有身分證',
    body: '編號、性別、生日、品種，每隻都做成一張電子身分證。',
    to: '/shop',
    image: '/previews/identity-card.png',
    alt: 'Gencko 熱門個體電子身分證畫面'
  },
  {
    tag: '飼養',
    title: '養法先講明白',
    body: '熱點涼區的溫差、濕度、依年齡的餵食頻率，飼養頁全寫死。',
    to: '/care',
    image: '/previews/care-guide.png',
    alt: 'Gencko 飼養指南頁面畫面'
  },
  {
    tag: '計算機',
    title: '配對工具給你玩',
    body: '想配什麼基因，配對前自己先跑一次計算機。',
    to: '/calculator',
    image: '/previews/calculator-tool.png',
    alt: 'Gencko 基因計算機頁面畫面'
  },
  {
    tag: '醫院',
    title: '醫院名單先給你',
    body: '特寵醫院名單都列好了，地區、聯絡方式一次找到。',
    to: '/hospital',
    image: '/previews/hospital-tool.png',
    alt: 'Gencko 特寵醫院頁面畫面'
  }
]

const nextActions = [
  { label: '新手入門', to: '/start-here' },
  { label: '購買流程', to: '/buying-guide' },
  { label: '進入商店', to: '/shop', primary: true }
]

useHead({
  title: '信任保證｜買之前該知道的，我們都先給你看',
  meta: [
    {
      name: 'description',
      content: 'Gencko 把個體資料、飼養方式、配對工具和醫療資源都先攤開，讓你自己看清楚再決定。'
    },
    { property: 'og:title', content: '信任保證｜買之前該知道的，我們都先給你看' },
    {
      property: 'og:description',
      content: '個體資料、養法、配對工具、看診資源，通通先給你看。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})
</script>

<template>
  <div class="trust-page">
    <PageHero
      kicker="WHY GENCKO"
      title="買之前該知道的，我們都先給你看"
      lead="個體資料、怎麼養、配對工具、看診資源，不用等你問，一開始就都擺出來。"
    >
      <div class="hero-reasons">
        <div v-for="item in trustRows" :key="item.title" class="reason-row">
          <div class="reason-head">
            <span class="reason-check" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12l5 5L20 6" />
              </svg>
            </span>
            {{ item.title }}
          </div>
          <p class="reason-body">{{ item.body }}</p>
        </div>
      </div>
    </PageHero>

    <section class="overview-grid">
      <NuxtLink
        v-for="item in overviewBlocks"
        :key="item.tag"
        :to="item.to"
        class="overview-card card"
      >
        <div class="overview-head">
          <span class="overview-tag">{{ item.tag }}</span>
          <span class="overview-cta" aria-hidden="true">查看 →</span>
        </div>
        <h2 class="overview-title">{{ item.title }}</h2>
        <p class="overview-body">{{ item.body }}</p>

        <div class="preview-shell">
          <img :src="item.image" :alt="item.alt" class="preview-image" loading="lazy" />
        </div>
      </NuxtLink>
    </section>

    <NextCta title="看完這些" lead="資訊都擺出來了，接下來看你。" :actions="nextActions" />
  </div>
</template>

<style scoped>
.trust-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 12px 40px;
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

/* ---------- Hero 內的信任理由（slot 內容，樣式留在頁面） ---------- */
.hero-reasons {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
}

.reason-row {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.reason-head {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--txt);
  font-weight: 900;
}

.reason-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  border-radius: 999px;
  color: var(--ok-text);
  border: 2px solid var(--ok-text);
}

.reason-check svg {
  width: 11px;
  height: 11px;
}

.reason-body,
.overview-body {
  margin: 0;
  color: var(--txt);
  opacity: 0.8;
  line-height: 1.5;
}

/* ---------- Overview grid（整張卡可點） ---------- */
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.overview-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  background: var(--card-bg);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.overview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.overview-tag {
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid rgba(232, 68, 10, 0.28);
  background: rgba(232, 68, 10, 0.06);
  color: var(--pri);
  font-weight: 900;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.overview-cta {
  color: var(--pri);
  font-weight: 800;
  font-size: 0.85rem;
}

.overview-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
  font-size: 1.08rem;
  line-height: 1.2;
}

/* 圖片完整呈現（contain），不裁切；白底 letterbox 較溫和 */
.preview-shell {
  display: grid;
  place-items: center;
  overflow: hidden;
  margin-top: 4px;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: #fff;
}

.preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  pointer-events: none;
  user-select: none;
}

@media (hover: hover) and (pointer: fine) {
  .reason-row:hover,
  .overview-card:hover {
    border-color: var(--bd-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-hover);
  }

  .overview-card:hover .overview-cta {
    text-decoration: underline;
  }
}

@media (max-width: 900px) {
  .hero-reasons {
    gap: 10px;
  }
}

@media (max-width: 640px) {
  .trust-page {
    font-size: 13px;
    padding: 4px 12px 32px;
  }

  .hero-reasons {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .overview-card {
    padding: 16px;
  }

  .overview-title,
  .reason-head {
    font-size: 0.98rem;
  }

  .reason-body,
  .overview-body {
    font-size: 0.84rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .reason-row,
  .overview-card {
    transition: none;
  }

  .reason-row:hover,
  .overview-card:hover {
    transform: none;
  }
}
</style>
