<script setup lang="ts">
import { useHead } from '#imports'

const pageUrl = 'https://www.genckobreeding.com/why-gencko'

// 連結地圖：四張卡整張可點，各對到一個真實頁面。
// 個體證書以 ID 搜尋，連向專用查詢頁。
const overviewBlocks = [
  {
    tag: '個體證書',
    title: '個體證書',
    to: '/certificates',
    image: '/previews/identity-card.png',
    alt: 'Gencko 個體證書畫面',
    action: '查看個體證書'
  },
  {
    tag: '飼養',
    title: '飼養指南',
    to: '/care',
    image: '/previews/care-guide.png',
    alt: 'Gencko 飼養指南頁面畫面',
    action: '閱讀飼養指南'
  },
  {
    tag: '基因計算機',
    title: '基因計算機',
    to: '/calculator',
    image: '/previews/calculator-tool.png',
    alt: 'Gencko 基因計算機頁面畫面',
    action: '開啟基因計算'
  },
  {
    tag: '特寵醫院',
    title: '特寵醫院',
    to: '/hospital',
    image: '/previews/hospital-tool.png',
    alt: 'Gencko 特寵醫院頁面畫面',
    action: '尋找特寵醫院'
  }
]

const purchasePaths = [
  {
    label: '購買流程',
    to: '/buying-guide'
  },
  { label: '關於工作室', to: '/about' },
  { label: '選購守宮', to: '/shop' },
  { label: '常見問題', to: '/faq' }
]

useHead({
  title: '品牌與服務｜Gencko',
  meta: [
    {
      name: 'description',
      content: '個體證書、飼養指南、基因計算與特寵醫院查詢。'
    },
    { property: 'og:title', content: '品牌與服務｜Gencko' },
    {
      property: 'og:description',
      content: '個體證書、飼養指南、基因計算與特寵醫院查詢。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})
</script>

<template>
  <div class="site-document-page trust-page" data-testid="trust-evidence-map">
    <div class="trust-document-meta" aria-label="品牌資料說明">
      <span>GENCKO BRAND FILE</span>
      <span>DATA / CARE / CONTINUITY</span>
    </div>
    <PageHero layout="stack" kicker="WHY GENCKO" title="品牌與服務" />

    <section class="purchase-hub" aria-labelledby="purchase-hub-title">
      <div class="hub-heading">
        <span>PURCHASE PATH</span>
        <h2 id="purchase-hub-title">相關頁面</h2>
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
        class="overview-card card interactive-card"
      >
        <div class="overview-head">
          <span class="overview-tag">{{ item.tag }}</span>
          <span class="overview-direction" aria-hidden="true">↗</span>
        </div>
        <h2 class="overview-title">{{ item.title }}</h2>

        <div class="preview-shell">
          <ArticleImage :src="item.image" :alt="item.alt" class="preview-image" loading="lazy" />
        </div>
        <HoverAction class="overview-action">{{ item.action }}</HoverAction>
      </NuxtLink>
    </section>
  </div>
</template>

<style scoped>
.overview-action {
  justify-self: start;
  margin-top: 8px;
}
.overview-direction {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  color: var(--pri);
  border: 1px solid var(--bd);
  border-radius: 50%;
  transition:
    transform 320ms var(--motion-ease-out),
    background-color 180ms ease,
    color 180ms ease;
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .overview-card:is(:hover, :focus-visible) .overview-direction {
    transform: rotate(45deg);
    background: var(--pri-btn);
    color: white;
    border-color: var(--pri-btn);
    text-decoration: none;
  }
  .overview-card:is(:hover, :focus-visible) .overview-title {
    text-decoration: underline;
    text-underline-offset: 5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .overview-direction {
    transition: none;
    transform: none !important;
  }
}
</style>

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

<style scoped>
/* 證據照片隨卡片進入視野呈現，文案和前往連結維持可讀可用。 */
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .overview-card {
      view-timeline-name: --brand-evidence;
      view-timeline-axis: block;
    }
    .overview-card .preview-shell {
      animation: brand-evidence-entry linear both;
      animation-timeline: --brand-evidence;
      animation-range: entry 0% entry 80%;
    }
    @keyframes brand-evidence-entry {
      from {
        opacity: 0.55;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
    .overview-card:focus-visible .preview-shell {
      animation: none;
    }
  }
}
</style>

<style scoped>
/* 短資訊兩欄，詳細介紹保持單欄；整張連結皆可觸控。 */
.trust-page :deep(.page-hero) {
  padding: 10px 0;
  margin-bottom: 10px;
}
.reason-row {
  padding: 10px 0;
}
.purchase-hub {
  padding: 12px 0;
}
.purchase-card {
  padding: 10px 0;
  gap: 5px;
  align-content: start;
}
.purchase-card > span {
  min-height: 0;
  line-height: 1.5;
}
.hub-heading {
  margin-bottom: 8px;
}
.overview-grid {
  margin-top: 10px;
}
.overview-card {
  gap: 6px;
  padding: 12px 0;
}
.preview-shell {
  margin-top: 6px;
}
@media (max-width: 767px) {
  .hero-reasons,
  .purchase-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
  }
  .reason-row {
    gap: 4px;
  }
  .reason-head {
    font-size: 14px;
    gap: 4px;
  }
  .reason-body {
    font-size: 13px;
    line-height: 1.5;
  }
  .purchase-card {
    min-width: 0;
  }
  .purchase-card h3 {
    font-size: 15px;
    line-height: 1.4;
  }
  .purchase-card p {
    font-size: 13px;
  }
  .hub-heading h2 {
    font-size: 18px;
  }
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .overview-title {
    font-size: 18px;
    line-height: 1.4;
  }
  .overview-cta {
    min-height: 24px;
  }
  .preview-shell {
    aspect-ratio: auto;
    height: 140px;
  }
  .preview-image {
    max-height: 140px;
  }
}
</style>
