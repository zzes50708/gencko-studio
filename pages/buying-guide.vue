<script setup>
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

const flowNodes = [
  {
    no: '01',
    icon: icons.pick,
    group: '買前',
    title: '看中意的個體',
    body: '從外觀、狀態和價格看起，找到幾隻想進一步了解的。'
  },
  {
    no: '02',
    icon: icons.chat,
    group: '私訊',
    title: '私訊問清楚',
    body: '性別、基因、平常吃什麼、目前狀態，還有怎麼交付，都問一問。'
  },
  {
    no: '03',
    icon: icons.deal,
    group: '購買',
    title: '談好條件',
    body: '保留規則、付款方式、什麼時候交付，這些先講清楚。'
  },
  {
    no: '04',
    icon: icons.home,
    group: '到家前',
    title: '先把環境備好',
    body: '加熱、濕區、躲避屋和營養品，趁牠還沒到先準備。'
  },
  {
    no: '05',
    icon: icons.rest,
    group: '到家後',
    title: '讓牠先適應',
    body: '剛到會怕生，前幾天別太常打擾，注意精神、進食和排泄。'
  }
]

const checkpoints = [
  {
    title: '私訊前',
    rows: ['挑好想問的那幾隻', '把想問的問題列一列']
  },
  {
    title: '付款前',
    rows: ['確認保留和付款規則', '問清楚什麼時候出貨']
  },
  {
    title: '到家後',
    rows: ['前幾天盡量少打擾', '拍點照片影片留記錄']
  }
]

const nextActions = [
  { label: '新手入門', to: '/start-here' },
  { label: '信任保證', to: '/why-gencko' },
  { label: '進入商店', to: '/shop', primary: true }
]

useHead({
  title: '購買流程｜從看上到帶回家，會經過這幾步',
  meta: [
    {
      name: 'description',
      content: '看中意、私訊問清楚、談好條件，再到準備環境和到家適應，購買守宮的流程一頁看懂。'
    },
    { property: 'og:title', content: '購買流程｜從看上到帶回家，會經過這幾步' },
    {
      property: 'og:description',
      content: '把流程拆開看，每一步要做什麼一目了然。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})
</script>

<template>
  <div class="flow-page">
    <section class="flow-hero card">
      <div class="hero-copy">
        <div class="hero-kicker">BUYING FLOW</div>
        <h1 class="page-title">買守宮，流程大概長這樣</h1>
        <p class="hero-lead">第一次買難免緊張，其實流程沒那麼複雜，知道每一步在做什麼就好。</p>
      </div>

      <div class="hero-strip" aria-hidden="true">
        <template v-for="(item, idx) in flowLabels" :key="item">
          <span class="hero-strip-item">{{ item }}</span>
          <span v-if="idx < flowLabels.length - 1" class="hero-strip-line">
            <span class="hero-strip-arrow">→</span>
          </span>
        </template>
      </div>
    </section>

    <section class="content-grid">
      <section class="poster card">
        <div class="panel-kicker">FLOW</div>

        <article v-for="node in flowNodes" :key="node.no" class="poster-node">
          <div class="node-pin">
            <div class="node-no">{{ node.no }}</div>
          </div>

          <div class="node-card">
            <div class="node-top">
              <span class="node-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.9"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  v-html="node.icon"
                />
              </span>
              <span class="node-group">{{ node.group }}</span>
            </div>
            <h2 class="node-title">{{ node.title }}</h2>
            <p class="node-body">{{ node.body }}</p>
          </div>
        </article>
      </section>

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

    <section class="next-panel card">
      <div class="next-head">
        <div class="panel-kicker">NEXT</div>
        <h2 class="sec-title">流程看完後</h2>
        <p class="next-lead">流程都懂了，就可以開始挑了。</p>
      </div>

      <div class="next-actions">
        <NuxtLink
          v-for="item in nextActions"
          :key="item.to"
          :to="item.to"
          class="btn-app btn-app--md btn-app--pill"
          :class="item.primary ? 'btn-app--primary' : 'btn-app--ghost'"
        >
          {{ item.label }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.flow-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 12px 40px;
}

.flow-hero,
.poster,
.check-panel,
.next-panel {
  padding: 20px;
  background: var(--card-bg);
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

/* ---------- Hero ---------- */
.flow-hero {
  position: relative;
  display: grid;
  gap: 14px;
  margin-bottom: 16px;
  overflow: hidden;
}

.flow-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -8%;
  width: 55%;
  height: 200%;
  background: radial-gradient(closest-side, var(--pri-glow-soft), transparent 70%);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
}

.hero-lead {
  margin: 0;
  color: var(--txt);
  opacity: 0.78;
  line-height: 1.5;
  font-size: 0.95rem;
}

/* Kicker（小色點 + uppercase 標籤） */
.hero-kicker,
.panel-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pri);
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
}

.hero-kicker::before,
.panel-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--pri);
  box-shadow: 0 0 0 4px var(--pri-glow-soft);
}

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

.poster > .panel-kicker {
  margin-bottom: 14px;
}

/* ---------- Poster timeline（連接線自動跟隨內容高度） ---------- */
.poster-node {
  position: relative;
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 12px;
  align-items: stretch;
}

.poster-node:not(:last-child) {
  padding-bottom: 14px;
}

.node-pin {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.node-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 2px solid rgba(232, 68, 10, 0.28);
  background: rgba(232, 68, 10, 0.06);
  color: var(--pri);
  font-weight: 900;
  font-size: 0.85rem;
}

/* 垂直連接線：以 pin 欄的 flex 剩餘空間繪製，內容變高也對齊 */
.poster-node:not(:last-child) .node-pin::after {
  content: '';
  width: 3px;
  flex: 1 1 auto;
  margin: 6px 0 -14px;
  border-radius: 999px;
  background: linear-gradient(180deg, var(--pri), rgba(232, 68, 10, 0.2));
}

.node-card {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.node-top {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.node-icon {
  display: inline-flex;
  color: var(--pri);
}

.node-icon svg {
  width: 18px;
  height: 18px;
}

.node-group {
  color: var(--pri);
  font-weight: 900;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
}

.node-title,
.sec-title,
.check-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
}

.node-title {
  font-size: 1.05rem;
}

.node-body {
  margin: 0;
  color: var(--txt);
  opacity: 0.8;
  line-height: 1.5;
}

/* ---------- Checkpoint panel ---------- */
.check-panel {
  display: grid;
  align-content: start;
}

.panel-head {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
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

/* ---------- Next CTA ---------- */
.next-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
}

.next-head {
  display: grid;
  gap: 8px;
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
  gap: 10px;
}

/* ---------- Hover ---------- */
@media (hover: hover) and (pointer: fine) {
  .node-card:hover,
  .check-card:hover {
    border-color: var(--bd-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-hover);
  }
}

/* ---------- RWD ---------- */
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

  .flow-hero,
  .poster,
  .check-panel,
  .next-panel {
    padding: 16px;
  }

  .page-title {
    font-size: 1.32rem;
  }

  .hero-lead,
  .next-lead {
    font-size: 0.86rem;
  }

  .hero-strip-item {
    padding: 4px 10px;
    font-size: 0.8rem;
  }

  .hero-strip-line {
    width: 16px;
  }

  .poster-node {
    grid-template-columns: 40px 1fr;
    gap: 10px;
  }

  .node-no {
    width: 34px;
    height: 34px;
    font-size: 0.74rem;
  }

  .node-card {
    padding: 12px 14px;
  }

  .node-title,
  .sec-title,
  .check-title {
    font-size: 0.98rem;
  }

  .node-body,
  .check-item {
    font-size: 0.82rem;
  }

  .next-panel {
    gap: 14px;
  }

  .next-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .next-actions .btn-app {
    padding-inline: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .node-card,
  .check-card {
    transition: none;
  }

  .node-card:hover,
  .check-card:hover {
    transform: none;
  }
}
</style>
