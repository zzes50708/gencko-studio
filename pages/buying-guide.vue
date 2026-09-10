<script setup lang="ts">
import { useHead } from '#imports'

const pageUrl = 'https://www.genckobreeding.com/buying-guide'

// 輕量 inline SVG（stroke 用 currentColor，隨主題變色）
const icons = {
  pick: '<path d="M12 20s-7-4.2-7-9.3A3.4 3.4 0 0 1 12 7a3.4 3.4 0 0 1 7 3.7C19 15.8 12 20 12 20z"/>',
  chat: '<path d="M4 5h16v11H9l-4 3v-3H4z"/><path d="M8 9h8"/><path d="M8 12h5"/>',
  deal: '<path d="M9 12l2 2 4-4"/><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/>',
  rest: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
}

const flowLabels = ['挑選', '詢問', '確認', '到家']

// 連結地圖：只有 01（有守宮可逛）、04（對到飼養頁）掛連結，其餘純流程不連。
const flowNodes = [
  {
    no: '01',
    icon: icons.pick,
    group: '買前',
    title: '找找喜歡的守宮',
    body: '找外觀喜歡、狀況良好、價格能接受的守宮',
    to: '/shop',
    linkLabel: '去逛守宮'
  },
  {
    no: '02',
    icon: icons.chat,
    group: '私訊',
    title: '私訊官方',
    body: '喜歡的守宮還在不在?基因不了解請先詢問。私訊前請確保已經了解購買規定。'
  },
  {
    no: '03',
    icon: icons.deal,
    group: '購買',
    title: '確保已經了解規定',
    body: '匯款方式、交易時間、保留幾天、訂金多少。'
  },
  {
    no: '04',
    icon: icons.home,
    group: '到家前',
    title: '先把環境備好',
    body: '環境布置好、熱區冷區準備好、食物營養品準備好。',
    to: '/care',
    linkLabel: '看飼養頁'
  },
  {
    no: '05',
    icon: icons.rest,
    group: '到家後',
    title: '讓寶寶先休息',
    body: '請給寶寶好的休息環境，檢查排便狀況，檢查是否有脫水或其他健康問題。'
  }
]

const checkpoints = [
  {
    title: '私訊前',
    rows: ['想問哪一隻', '守宮的基因與特性都了解了嗎']
  },
  {
    title: '購買時',
    rows: ['保留天數、付款方式講定', '確認寄出日期跟包裝方式']
  },
  {
    title: '到家後',
    rows: ['靜養3~5天', '拍照錄影，有疑慮第一時間詢問不要拖']
  }
]

useHead({
  title: '購買流程｜從挑選到帶回家，會經過這幾步',
  meta: [
    {
      name: 'description',
      content: '找喜歡的守宮、私訊問清楚、談好流程、準備環境和到家適應，購買守宮的流程一頁看懂。'
    },
    { property: 'og:title', content: '購買流程｜從挑選到帶回家，會經過這幾步' },
    {
      property: 'og:description',
      content: '流程一項一項看，每一步要做什麼一目了然。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})
</script>

<template>
  <div class="flow-page">
    <div class="flow-document-meta" aria-label="購買流程說明">
      <span>GENCKO PURCHASE NOTES</span>
      <span>PREPARE / REVIEW / DECIDE</span>
    </div>
    <PageHero
      layout="stack"
      kicker="BUYING FLOW"
      title="買守宮，流程長這樣"
      lead="第一次買沒經驗很正常。這邊把守宮到家前後的每一步拆開說明。"
    >
      <div class="hero-strip" aria-hidden="true">
        <template v-for="(item, idx) in flowLabels" :key="item">
          <span class="hero-strip-item">{{ item }}</span>
          <span v-if="idx < flowLabels.length - 1" class="hero-strip-line">
            <span class="hero-strip-arrow">→</span>
          </span>
        </template>
      </div>
    </PageHero>

    <nav
      class="purchase-decision-path"
      data-testid="purchase-decision-path"
      aria-label="購買決策入口"
    >
      <div class="decision-path-copy">
        <span>BEFORE YOU DECIDE</span>
        <strong>先確認資訊，再進入交易</strong>
      </div>
      <NuxtLink no-prefetch to="/why-gencko">了解品牌與資料</NuxtLink>
      <NuxtLink no-prefetch to="/faq">閱讀購買問答</NuxtLink>
      <NuxtLink no-prefetch to="/care">準備飼養環境</NuxtLink>
      <NuxtLink no-prefetch to="/shop" class="is-primary">查看可選個體</NuxtLink>
    </nav>

    <section class="content-grid">
      <Timeline :nodes="flowNodes" />

      <section class="check-panel card">
        <div class="panel-head">
          <div class="panel-kicker">CHECKPOINT</div>
          <h2 class="sec-title">三個檢查點</h2>
        </div>

        <div class="check-grid">
          <article v-for="item in checkpoints" :key="item.title" class="check-card">
            <div class="check-title">{{ item.title }}</div>
            <div class="check-list">
              <div v-for="row in item.rows" :key="row" class="check-item">
                <span class="check-badge" aria-hidden="true">
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
                <span>{{ row }}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped>
.flow-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 18px 48px;
}

.flow-document-meta {
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

.flow-document-meta span:first-child {
  color: var(--pri);
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.purchase-decision-path {
  display: grid;
  grid-template-columns: minmax(220px, 1.35fr) repeat(4, minmax(130px, 0.65fr));
  gap: 1px;
  overflow: hidden;
  margin-bottom: 18px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-lg);
  background: var(--bd);
  box-shadow: var(--shadow-card);
}

.decision-path-copy,
.purchase-decision-path a {
  min-height: 76px;
  padding: 14px 16px;
  background: var(--card-bg-solid);
}

.decision-path-copy {
  display: grid;
  align-content: center;
  gap: 4px;
}

.decision-path-copy span {
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.decision-path-copy strong {
  color: var(--txt);
}

.purchase-decision-path a {
  display: flex;
  align-items: center;
  color: var(--txt);
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;
}

.purchase-decision-path a.is-primary {
  background: var(--pri);
  color: #fff;
}

/* Hero 內的流程 pill 帶（slot 內容，樣式留在頁面） */
.hero-strip {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.hero-strip-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  color: var(--txt);
  font-weight: 800;
  font-size: 0.9rem;
}

.hero-strip-line {
  position: relative;
  width: 26px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--pri), rgba(232, 68, 10, 0.2));
}

.hero-strip-arrow {
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--pri);
  font-size: 0.85rem;
  line-height: 1;
}

/* ---------- Content grid ---------- */
.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 16px;
  margin-bottom: 16px;
}

.panel-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pri);
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
}

.panel-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--pri);
  box-shadow: 0 0 0 4px var(--pri-glow-soft);
}

/* ---------- Checkpoint panel ---------- */
.check-panel {
  display: grid;
  align-content: start;
  padding: 20px;
  background: var(--card-bg);
}

.panel-head {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.sec-title,
.check-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
}

.check-grid {
  display: grid;
  gap: 12px;
}

.check-card {
  display: grid;
  gap: 8px;
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.check-title {
  color: var(--pri);
  font-size: 0.98rem;
}

.check-list {
  display: grid;
  gap: 8px;
}

.check-item {
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 8px;
  align-items: center;
  color: var(--txt);
  font-weight: 700;
  font-size: 0.9rem;
}

.check-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  color: var(--ok-text);
  border: 2px solid var(--ok-text);
}

.check-badge svg {
  width: 12px;
  height: 12px;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .purchase-decision-path a:not(.is-primary):hover {
    color: var(--pri);
    background: var(--pri-glow-soft);
  }

  .check-card:hover {
    border-color: var(--bd-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-hover);
  }
}

@media (max-width: 900px) {
  .purchase-decision-path {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .decision-path-copy {
    grid-column: 1 / -1;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .flow-page {
    font-size: 13px;
    padding: 4px 10px 32px;
  }

  .hero-strip-item {
    padding: 4px 10px;
    font-size: 0.8rem;
  }

  .hero-strip-line {
    width: 16px;
  }

  .check-panel {
    padding: 16px;
  }

  .sec-title,
  .check-title {
    font-size: 0.98rem;
  }

  .check-item {
    font-size: 0.82rem;
  }

  .purchase-decision-path a {
    min-height: var(--control-min-height);
    padding: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .check-card {
    transition: none;
  }

  .purchase-decision-path a {
    transition: none;
  }

  .check-card:hover {
    transform: none;
  }
}
/* 選購導讀以檢查清單的理性結構呈現，避免色塊壓過內容。 */
.buying-guide-page,
.buying-hero,
.decision-path,
.check-panel,
.check-card,
.buying-cta {
  border-radius: 0;
  box-shadow: none;
}

.buying-hero h1,
.check-title,
.decision-path-copy strong {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.03em;
}

.buying-hero,
.decision-path,
.check-panel {
  background-image: none;
}

.check-card,
.buying-cta {
  border-radius: 2px;
}

.flow-page,
.purchase-decision-path,
.check-panel,
.check-card {
  border-radius: 0;
  box-shadow: none;
}

.flow-page .sec-title,
.flow-page .check-title {
  font-family: 'Noto Serif TC', serif;
}

.hero-strip-item,
.purchase-decision-path a {
  border-radius: 2px;
}

/* 購買流程改為交易前檢查表，讓每一步的先後關係比色塊更清楚。 */
.hero-strip {
  gap: 0;
  padding: 12px 0;
  border-width: 1px 0;
}

.hero-strip-item,
.hero-strip-line {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.hero-strip-item {
  padding: 0 12px 0 0;
  border: 0;
}

.hero-strip-line {
  width: 22px;
  background: var(--bd);
}

.purchase-decision-path {
  gap: 0;
  margin-bottom: 32px;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.decision-path-copy,
.purchase-decision-path a {
  border-right: 1px solid var(--bd);
  background: transparent;
}

.purchase-decision-path > :last-child {
  border-right: 0;
}

.purchase-decision-path a.is-primary {
  background: var(--pri);
}

.check-panel {
  padding: 26px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
}

.check-grid {
  gap: 0;
  border-top: 1px solid var(--bd);
}

.check-card {
  padding: 16px 0;
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.check-badge,
.panel-kicker::before {
  border-radius: 0;
  box-shadow: none;
}

.check-badge {
  border: 0;
  background: var(--ok-text);
  color: #fff;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .purchase-decision-path a:not(.is-primary):hover,
  .check-card:hover {
    transform: none;
    background: transparent;
    box-shadow: none;
  }
}

@media (max-width: 900px) {
  .decision-path-copy,
  .purchase-decision-path a {
    border-bottom: 1px solid var(--bd);
  }

  .purchase-decision-path > :last-child {
    border-bottom: 0;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .check-card:hover {
    transform: none;
    box-shadow: none;
  }
}
/* 流程與檢查點移除大型包框，只有操作入口保留按鈕。 */
.flow-page {
  padding: 8px 18px 28px;
}
.flow-page :deep(.page-hero) {
  padding: 22px 0;
  margin-bottom: 16px;
  border: 0;
}
.flow-page :deep(.page-title) {
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.35;
}
.purchase-decision-path {
  padding: 14px 0;
  margin-bottom: 20px;
  border: 0;
  border-block: 1px solid var(--bd);
  background: transparent;
  box-shadow: none;
  gap: 10px;
}
.purchase-decision-path a {
  border: 1px solid var(--txt);
  border-radius: 2px;
  min-height: 44px;
}
.check-panel {
  border: 0;
  padding: 0;
  background: transparent;
  box-shadow: none;
}
.check-group {
  border: 0;
  border-bottom: 1px solid var(--bd);
  padding: 14px 0;
  background: transparent;
}
.content-grid {
  margin-bottom: 20px;
  gap: 28px;
}
.flow-page :deep(.poster) {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  border-radius: 0;
}
.flow-page :deep(.node-card) {
  padding: 12px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  transform: none;
}
.flow-page :deep(.node-no) {
  border-radius: 0;
  background: transparent;
  color: var(--pri);
  box-shadow: none;
}
.flow-page :deep(.node-line) {
  background: var(--bd);
}
.flow-page :deep(.node-link) {
  border: 1px solid var(--txt);
  border-radius: 2px;
  padding: 8px 14px;
  width: fit-content;
  color: var(--txt);
}
.check-grid {
  border: 0;
  gap: 0;
}
.check-card {
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  padding: 14px 0;
  background: transparent;
  box-shadow: none;
}
.check-badge {
  background: transparent;
  color: var(--pri);
  border: 0;
  border-radius: 0;
}
.check-title {
  font-family: var(--font-heading-zh);
}
.flow-page :deep(.node-link) {
  justify-self: start;
}
.flow-page :deep(.page-hero) {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.flow-page :deep(.page-title) {
  border: 0;
  padding-left: 0;
  text-align: left;
}
.hero-strip {
  gap: 12px;
}
.hero-strip-line {
  min-width: 22px;
  margin: 0;
}
.purchase-decision-path a {
  min-height: 44px;
  padding: 10px 14px;
}
.flow-page :deep(.sec-title) {
  border: 0;
  padding-left: 0;
}
.flow-page :deep(.node-title),
.check-title {
  text-align: left;
}
.flow-page :deep(.page-hero) {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}
.flow-page :deep(.page-title) {
  border: 0;
  padding-left: 0;
  text-align: left;
}
.hero-strip {
  gap: 12px;
}
.hero-strip-line {
  min-width: 22px;
  margin: 0;
}
.purchase-decision-path a {
  min-height: 44px;
  padding: 10px 14px;
}
.flow-page :deep(.sec-title) {
  border: 0;
  padding-left: 0;
}
.flow-page :deep(.node-title),
.check-title {
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
.decision-path-copy { padding: 0; border: 0; }
@media (max-width: 768px) { .purchase-decision-path .decision-path-copy { border: 0; padding: 0 0 10px; } }
</style>
