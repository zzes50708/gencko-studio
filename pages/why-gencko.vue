<script setup lang="ts">
import { useHead } from '#imports'

const pageUrl = 'https://www.genckobreeding.com/why-gencko'

const trustRows = [
  { title: '資料透明', body: '性別、生日、基因都在頁面中' },
  { title: '飼養教學', body: '該怎麼養，該注意什麼，都幫你們整理好了' },
  { title: '專業繁殖工具', body: '專業爬蟲的基因計算機' },
  { title: '特寵醫院名單', body: '不怕找不到最近的特寵醫院' }
]

// 連結地圖：四張卡整張可點，各對到一個真實頁面。
// （身分證改連 /shop：/identity 是動態路由需 id，裸 /identity 不 match。）
const overviewBlocks = [
  {
    tag: '身分證',
    title: '每隻都有身分證',
    body: '性別、生日、品系，每隻都做成一張電子身分證，不怕忘記資料',
    to: '/shop',
    image: '/previews/identity-card.png',
    alt: 'Gencko 熱門個體電子身分證畫面'
  },
  {
    tag: '飼養',
    title: '第一次養也不怕',
    body: '熱區冷區、濕度、餵食頻率，飼養指南幫你準備好了',
    to: '/care',
    image: '/previews/care-guide.png',
    alt: 'Gencko 飼養指南頁面畫面'
  },
  {
    tag: '基因計算機',
    title: '工作室都在用的基因計算機',
    body: '基因變成數據，所有繁殖結果都是可以預測的',
    to: '/calculator',
    image: '/previews/calculator-tool.png',
    alt: 'Gencko 基因計算機頁面畫面'
  },
  {
    tag: '特寵醫院',
    title: '輕鬆收藏特寵醫院名單',
    body: '搜尋離家最近的特寵醫院資訊，不怕需要時找不到',
    to: '/hospital',
    image: '/previews/hospital-tool.png',
    alt: 'Gencko 特寵醫院頁面畫面'
  }
]

const purchasePaths = [
  {
    label: '了解購買流程',
    body: '先看挑選、詢問、確認與交付的現有流程說明。',
    to: '/buying-guide'
  },
  { label: '認識 Gencko', body: '了解工作室的品牌理念、服務與專業背景。', to: '/about' },
  { label: '查看可選個體', body: '回到現有商品頁確認個體資料與頁面所列條件。', to: '/shop' },
  { label: '聯絡與常見問題', body: '從常見問題找到客服方式與購買前常見解答。', to: '/faq' }
]

useHead({
  title: '品牌與購買｜選擇 Gencko 前先了解',
  meta: [
    {
      name: 'description',
      content: 'Gencko 有完整的個體資料、飼養教學、特寵醫院資訊乃至繁殖說明，讓你看完再決定。'
    },
    { property: 'og:title', content: '品牌與購買｜選擇 Gencko 前先了解' },
    {
      property: 'og:description',
      content: '個體資料、飼養教學、特寵醫院資訊乃至繁殖說明，讓你看完再決定。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})
</script>

<template>
  <div class="trust-page" data-testid="trust-evidence-map">
    <div class="trust-document-meta" aria-label="品牌資料說明">
      <span>GENCKO BRAND FILE</span>
      <span>DATA / CARE / CONTINUITY</span>
    </div>
    <PageHero
      kicker="WHY GENCKO"
      title="買之前該知道的，我們都先給你看"
      lead="個體資料、飼養教學、特寵醫院資訊乃至繁殖說明，一站搞定。"
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

    <section class="purchase-hub" aria-labelledby="purchase-hub-title">
      <div class="hub-heading">
        <span>PURCHASE PATH</span>
        <h2 id="purchase-hub-title">從品牌、流程到個體資料，一次找到入口</h2>
      </div>
      <div class="purchase-grid">
        <NuxtLink
          no-prefetch
          v-for="item in purchasePaths"
          :key="item.to"
          :to="item.to"
          class="purchase-card card"
        >
          <h3>{{ item.label }}</h3>
          <p>{{ item.body }}</p>
          <span aria-hidden="true">前往 →</span>
        </NuxtLink>
      </div>
    </section>

    <section class="overview-grid">
      <NuxtLink
        no-prefetch
        v-for="item in overviewBlocks"
        :key="item.tag"
        :to="item.to"
        class="overview-card card"
      >
        <div class="overview-head">
          <span class="overview-tag">{{ item.tag }}</span>
          <span class="overview-cta" aria-hidden="true">前往網頁→</span>
        </div>
        <h2 class="overview-title">{{ item.title }}</h2>
        <p class="overview-body">{{ item.body }}</p>

        <div class="preview-shell">
          <img :src="item.image" :alt="item.alt" class="preview-image" loading="lazy" />
        </div>
      </NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.trust-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 18px 48px;
}

.trust-document-meta {
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

.trust-document-meta span:first-child {
  color: var(--pri);
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.purchase-hub {
  position: relative;
  overflow: hidden;
  margin-bottom: 22px;
  padding: clamp(20px, 3vw, 32px);
  border: 1px solid var(--bd);
  border-radius: calc(var(--radius-lg) + 8px);
  background: linear-gradient(130deg, var(--pri-glow-soft), transparent 55%), var(--card-bg);
  box-shadow: var(--shadow-card);
}

.hub-heading {
  display: grid;
  gap: 5px;
  margin-bottom: 12px;
}

.hub-heading span {
  color: var(--pri);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.hub-heading h2 {
  margin: 0;
  color: var(--txt);
  max-width: 720px;
  font-size: clamp(1.5rem, 3vw, 2.35rem);
  line-height: 1.1;
  letter-spacing: -0.035em;
}

.purchase-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.purchase-card {
  display: grid;
  gap: 8px;
  min-height: 138px;
  padding: 16px;
  color: var(--txt);
  text-decoration: none;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.purchase-card h3,
.purchase-card p {
  margin: 0;
}

.purchase-card p {
  color: var(--txt-muted);
  line-height: 1.55;
}

.purchase-card span {
  color: var(--pri);
  font-size: 0.82rem;
  font-weight: 850;
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
  min-height: var(--control-min-height);
  padding: 18px;
  background: var(--card-bg);
  color: inherit;
  text-decoration: none;
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.purchase-card:focus-visible,
.overview-card:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
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

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
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

  .purchase-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .trust-page {
    font-size: 13px;
    padding: 4px 10px 32px;
  }

  .hero-reasons {
    grid-template-columns: 1fr;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .purchase-grid {
    grid-template-columns: 1fr;
  }

  .purchase-hub {
    padding: 18px 14px;
  }

  .purchase-card {
    min-height: 0;
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
  .purchase-card,
  .reason-row,
  .overview-card {
    transition: none;
  }

  .reason-row:hover,
  .overview-card:hover {
    transform: none;
  }
}
/* 品牌信任頁採用清晰的目錄式結構，保留原始內容與連結。 */
.trust-page,
.trust-hero,
.purchase-hub,
.purchase-card,
.reason-row,
.overview-card {
  border-radius: 0;
  box-shadow: none;
}

.trust-hero h1,
.purchase-title,
.overview-title,
.reason-head {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.035em;
}

.trust-hero,
.purchase-hub {
  background-image: none;
}

.overview-card img {
  aspect-ratio: 1;
  object-fit: cover;
}

/* 品牌信任資訊使用連續編輯格線，避免承諾內容變成一疊宣傳卡。 */
.purchase-hub {
  padding: 30px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.hero-reasons,
.purchase-grid,
.overview-grid {
  gap: 0;
  border-top: 1px solid var(--bd);
  border-left: 1px solid var(--bd);
}

.reason-row,
.purchase-card,
.overview-card {
  border-width: 0 1px 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.reason-check,
.overview-tag {
  border-radius: 0;
  box-shadow: none;
}

.reason-check {
  border: 0;
  background: var(--ok-text);
  color: #fff;
}

.overview-tag {
  padding: 0;
  border: 0;
  background: transparent;
}

.preview-shell {
  border-radius: 0;
  background: transparent;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .reason-row:hover,
  .overview-card:hover {
    transform: none;
    border-color: var(--pri);
    background: transparent;
    box-shadow: none;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .reason-row:hover,
  .overview-card:hover {
    transform: none;
    box-shadow: none;
  }
}
/* 品牌資訊以連續欄位呈現，保留預覽圖片與明確入口。 */
.trust-page {
  padding: 8px 18px 28px;
}
.trust-page :deep(.page-hero) {
  padding: 22px 0;
  margin-bottom: 20px;
  border: 0;
}
.trust-page :deep(.page-title) {
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.35;
}
.hero-reasons,
.purchase-grid,
.overview-grid {
  border: 0;
  gap: 0 24px;
}
.reason-row,
.purchase-card,
.overview-card {
  border: 0;
  border-bottom: 1px solid var(--bd);
  padding: 16px 0;
  min-height: 0;
  background: transparent;
  box-shadow: none;
}
.reason-row:hover,
.overview-card:hover {
  border-color: var(--bd);
}
.reason-check {
  color: var(--pri);
  background: transparent;
}
.purchase-hub {
  padding: 20px 0;
  margin: 0;
  border: 0;
}
.hub-heading h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  line-height: 1.45;
}
.overview-grid {
  margin-top: 18px;
}
.overview-title {
  font-size: 1.4rem;
  line-height: 1.5;
}
.overview-cta,
.purchase-card > span {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  width: fit-content;
  text-decoration: underline;
  text-underline-offset: 5px;
  white-space: nowrap;
}
.preview-shell {
  border: 0;
  margin-top: 12px;
}
.overview-card img {
  aspect-ratio: auto;
  object-fit: contain;
}
.trust-page :deep(.page-hero) {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.trust-page :deep(.page-title) {
  border: 0;
  padding-left: 0;
  text-align: left;
}
.reason-head,
.reason-body {
  text-align: left;
}
.hero-reasons {
  align-self: stretch;
}
.trust-page h2,
.trust-page h3 {
  text-align: left;
}
.trust-page :deep(.page-hero) {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.trust-page :deep(.page-title) {
  border: 0;
  padding-left: 0;
  text-align: left;
}
.reason-head,
.reason-body {
  text-align: left;
}
.hero-reasons {
  align-self: stretch;
}
.trust-page h2,
.trust-page h3 {
  text-align: left;
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
