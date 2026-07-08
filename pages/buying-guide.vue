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

const nextActions = [
  { label: '新手入門', to: '/start-here' },
  { label: '信任保證', to: '/why-gencko' },
  { label: '進入商店', to: '/shop', primary: true }
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

    <NextCta
      title="流程看完了嗎"
      lead="詳細看看有哪些該注意的，或是直接看守宮"
      :actions="nextActions"
    />
  </div>
</template>

<style scoped>
.flow-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 12px 40px;
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
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

@media (hover: hover) and (pointer: fine) {
  .check-card:hover {
    border-color: var(--bd-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-hover);
  }
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .flow-page {
    font-size: 13px;
    padding: 4px 12px 32px;
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
}

@media (prefers-reduced-motion: reduce) {
  .check-card {
    transition: none;
  }

  .check-card:hover {
    transform: none;
  }
}
</style>
