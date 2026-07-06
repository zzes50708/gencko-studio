<script setup>
import { useHead } from '#imports'
import { onMounted } from 'vue'

const pageUrl = 'https://www.genckobreeding.com/start-here'

// 輕量 inline SVG（stroke 用 currentColor，隨主題變色）
const icons = {
  care: '<path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5 1.5-1.5 4-2 8-1.5V5c-4-.5-6.5 0-8 1.5z"/><path d="M12 6.5V20"/>',
  assess:
    '<path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>',
  pick: '<path d="M12 20s-7-4.2-7-9.3A3.4 3.4 0 0 1 12 7a3.4 3.4 0 0 1 7 3.7C19 15.8 12 20 12 20z"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/>',
  rest: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>'
}

const flowSteps = [
  { no: '01', title: '了解飼養' },
  { no: '02', title: '評估準備' },
  { no: '03', title: '挑選個體' }
]

const lanes = [
  {
    no: '01',
    icon: icons.care,
    title: '了解飼養',
    caption: '知道牠平常吃什麼、住什麼樣的環境嗎？',
    actions: [
      { label: '飼養指南', to: '/care' },
      { label: '常見問題', to: '/faq' }
    ]
  },
  {
    no: '02',
    icon: icons.assess,
    title: '評估準備',
    caption: '怕帶回家才發現自己還沒準備好？',
    actions: [
      { label: '健康評估', to: '/health' },
      { label: '購買流程', to: '/buying-guide' }
    ]
  },
  {
    no: '03',
    icon: icons.pick,
    title: '挑選個體',
    caption: '都準備得差不多，來看看哪隻適合你。',
    actions: [{ label: '新手推薦個體', to: '/shop?beginner=true' }]
  }
]

const prepNotes = [
  {
    no: '01',
    icon: icons.home,
    title: '環境和營養品先備齊',
    body: '加熱設備、濕區、躲避屋，還有鈣粉跟維他命，趁牠還沒到就準備好。'
  },
  {
    no: '02',
    icon: icons.rest,
    title: '到家後先讓牠靜一靜',
    body: '剛換環境會緊張，前幾天別太常打擾，觀察牠吃不吃、排泄和精神就好。'
  }
]

const nextLinks = [
  { label: '飼養指南', to: '/care' },
  { label: '健康評估', to: '/health' },
  { label: '購買流程', to: '/buying-guide' },
  { label: '進入商店', to: '/shop', primary: true }
]

useHead({
  title: '新手入門｜第一次養守宮，該從哪開始',
  meta: [
    {
      name: 'description',
      content: '第一次養守宮別急著挑個體。先搞懂怎麼養、評估自己準備好了沒，再來看新手推薦。'
    },
    { property: 'og:title', content: '新手入門｜第一次養守宮，該從哪開始' },
    {
      property: 'og:description',
      content: '先搞懂飼養，評估自己準備好了沒，再挑個體。順序對了就少踩雷。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})

onMounted(() => {
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
})
</script>

<template>
  <div class="starter-page">
    <section class="hero-stage card">
      <div class="hero-copy">
        <div class="hero-kicker">START HERE</div>
        <h1 class="page-title">第一次養守宮，先別急著挑個體</h1>
        <p class="hero-lead">
          很多人一開始就急著挑最漂亮的，結果東西沒備好、也不確定養不養得起來。先把基礎搞懂，帶回家才安心。
        </p>
      </div>

      <ol class="hero-flow">
        <template v-for="(item, idx) in flowSteps" :key="item.no">
          <li class="flow-node">
            <span class="flow-dot">{{ item.no }}</span>
            <span class="flow-title">{{ item.title }}</span>
          </li>
          <li v-if="idx < flowSteps.length - 1" class="flow-conn" aria-hidden="true">
            <span class="flow-conn-arrow">→</span>
          </li>
        </template>
      </ol>
    </section>

    <section class="lane-board">
      <article v-for="lane in lanes" :key="lane.no" class="lane-card card">
        <div class="lane-bar" />
        <div class="lane-head">
          <div class="lane-badge">
            <svg
              class="lane-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="lane.icon"
            />
            <span class="lane-index">{{ lane.no }}</span>
          </div>
          <div class="lane-copy">
            <h2 class="lane-title">{{ lane.title }}</h2>
            <p class="lane-caption">{{ lane.caption }}</p>
          </div>
        </div>

        <div class="lane-actions">
          <NuxtLink
            v-for="action in lane.actions"
            :key="action.to"
            :to="action.to"
            class="btn-app btn-app--ghost btn-app--sm btn-app--pill lane-chip"
          >
            <span>{{ action.label }}</span>
            <span class="lane-chip-arrow">→</span>
          </NuxtLink>
        </div>
      </article>
    </section>

    <section class="prep-panel card">
      <div class="panel-head">
        <div class="panel-kicker">CHECK</div>
        <h2 class="sec-title">帶回家前，先把這些準備好</h2>
      </div>

      <div class="prep-grid">
        <article v-for="item in prepNotes" :key="item.no" class="prep-card">
          <div class="prep-badge">
            <svg
              class="prep-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.9"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              v-html="item.icon"
            />
            <span class="prep-no">{{ item.no }}</span>
          </div>
          <h3 class="prep-title">{{ item.title }}</h3>
          <p class="prep-body">{{ item.body }}</p>
        </article>
      </div>
    </section>

    <section class="next-step card">
      <div class="next-head">
        <div class="panel-kicker">NEXT</div>
        <h2 class="sec-title">下一步</h2>
        <p class="next-lead">基礎有了、也準備得差不多，就可以來挑了。</p>
      </div>

      <div class="next-step-actions">
        <NuxtLink
          v-for="item in nextLinks"
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
.starter-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 4px 12px 40px;
}

.hero-stage,
.prep-panel,
.next-step {
  padding: 20px;
  background: var(--card-bg);
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

/* ---------- Hero ---------- */
.hero-stage {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 22px;
  align-items: center;
  margin-bottom: 16px;
  overflow: hidden;
}

.hero-stage::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -10%;
  width: 60%;
  height: 160%;
  background: radial-gradient(closest-side, var(--pri-glow-soft), transparent 70%);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
}

.hero-lead {
  margin: 2px 0 0;
  color: var(--txt);
  opacity: 0.78;
  line-height: 1.55;
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

/* ---------- Flow stepper ---------- */
.hero-flow {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.flow-node {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  min-height: 96px;
  padding: 14px 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.flow-dot,
.lane-badge,
.prep-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: var(--pri);
  border: 2px solid rgba(232, 68, 10, 0.28);
  background: rgba(232, 68, 10, 0.06);
}

.flow-dot {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  font-size: 0.92rem;
}

.flow-title {
  color: var(--txt);
  font-weight: 900;
  font-size: 0.98rem;
}

.flow-conn {
  flex: 0 0 34px;
  align-self: center;
  position: relative;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--pri), rgba(232, 68, 10, 0.15));
}

.flow-conn-arrow {
  position: absolute;
  right: -3px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--pri);
  font-size: 0.9rem;
  line-height: 1;
}

/* ---------- Lane board ---------- */
.lane-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.lane-card {
  position: relative;
  display: grid;
  gap: 14px;
  padding: 18px 16px 16px;
  overflow: hidden;
  background: var(--card-bg);
}

.lane-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: linear-gradient(90deg, var(--pri), var(--pri-light));
}

.lane-head {
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 12px;
  align-items: start;
}

.lane-badge,
.prep-badge {
  position: relative;
  width: 46px;
  height: 46px;
  border-radius: 12px;
}

.lane-icon,
.prep-icon {
  width: 24px;
  height: 24px;
}

/* 編號疊在徽章右下角 */
.lane-index,
.prep-no {
  position: absolute;
  right: -5px;
  bottom: -5px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--pri);
  color: #fff;
  font-size: 0.64rem;
  font-weight: 900;
  letter-spacing: 0;
  box-shadow: 0 0 0 2px var(--card-bg-solid);
}

.lane-copy {
  display: grid;
  gap: 4px;
  padding-top: 2px;
}

.lane-title,
.sec-title,
.prep-title,
.flow-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
}

.lane-title {
  font-size: 1.05rem;
}

.lane-caption,
.prep-body {
  margin: 0;
  color: var(--txt);
  opacity: 0.8;
  line-height: 1.5;
}

.lane-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 統一膠囊按鈕：沿用全域 .btn-app--ghost，只覆寫箭頭排版 */
.lane-chip {
  justify-content: space-between;
  gap: 10px;
  min-width: 118px;
}

.lane-chip-arrow {
  opacity: 0.7;
}

/* ---------- Prep panel ---------- */
.prep-panel {
  margin-bottom: 16px;
}

.panel-head {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.prep-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.prep-card {
  display: grid;
  gap: 10px;
  padding: 18px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
}

.prep-title {
  font-size: 1.02rem;
}

/* ---------- Next step CTA ---------- */
.next-step {
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

.next-step-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

/* ---------- Hover ---------- */
@media (hover: hover) and (pointer: fine) {
  .flow-node:hover,
  .lane-card:hover,
  .prep-card:hover {
    border-color: var(--bd-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-hover);
  }
}

/* ---------- RWD ---------- */
@media (max-width: 900px) {
  .hero-stage {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}

@media (max-width: 640px) {
  .starter-page {
    font-size: 13px;
    padding: 4px 12px 32px;
  }

  .hero-stage,
  .prep-panel,
  .next-step {
    padding: 16px;
  }

  .page-title {
    font-size: 1.32rem;
  }

  .hero-lead,
  .next-lead {
    font-size: 0.86rem;
  }

  /* 手機流程：改為垂直 stepper，連接線不再隱藏 */
  .hero-flow {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  .flow-node {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
    min-height: 0;
    gap: 12px;
    padding: 12px 14px;
  }

  .flow-dot {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
  }

  .flow-conn {
    flex: 0 0 18px;
    align-self: flex-start;
    width: 3px;
    height: 18px;
    margin-left: 30px;
    background: linear-gradient(180deg, var(--pri), rgba(232, 68, 10, 0.25));
  }

  .flow-conn-arrow {
    display: none;
  }

  .lane-board {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .lane-card {
    padding: 14px 14px 12px;
    gap: 12px;
  }

  .prep-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .lane-title,
  .prep-title,
  .flow-title {
    font-size: 0.98rem;
  }

  .lane-caption,
  .prep-body {
    font-size: 0.82rem;
  }

  .next-step {
    gap: 14px;
  }

  .next-step-actions {
    width: 100%;
    justify-content: stretch;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .flow-node,
  .lane-card,
  .prep-card {
    transition: none;
  }

  .flow-node:hover,
  .lane-card:hover,
  .prep-card:hover {
    transform: none;
  }
}
</style>
