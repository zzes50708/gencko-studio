<script setup lang="ts">
import { useHead } from '#imports'

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
  { no: '02', title: '準備評估' },
  { no: '03', title: '挑選個體' }
]

const lanes = [
  {
    no: '01',
    icon: icons.care,
    title: '了解飼養',
    caption: '知熱區冷區怎麼擺放，一週餵幾次?',
    actions: [
      { label: '飼養指南', to: '/care' },
      { label: '常見問題', to: '/faq' }
    ]
  },
  {
    no: '02',
    icon: icons.assess,
    title: '評估準備',
    caption: '怕買到不健康的守宮嗎?守宮入住前需要做什麼?',
    actions: [
      { label: '健康評估', to: '/health' },
      { label: '購買流程', to: '/buying-guide' }
    ]
  },
  {
    no: '03',
    icon: icons.pick,
    title: '挑選個體',
    caption: '都準備好了，來看看有哪些守宮吧',
    actions: [{ label: '新手推薦個體', to: '/shop?beginner=true' }]
  }
]

// prep 01 掛 /care inline 連結；02 是到家後行為，維持純文字。
const prepNotes = [
  {
    no: '01',
    icon: icons.home,
    title: '環境/營養品先備齊',
    body: '準備房子、底材、加熱墊、躲避屋、水盆、餌料，還有D3鈣粉與綜合維他命，再把守宮帶回家',
    to: '/care',
    linkLabel: '看飼養頁'
  },
  {
    no: '02',
    icon: icons.rest,
    title: '到家先安置',
    body: '給水並靜養2~3天，不要馬上上手或餵食'
  }
]

const knowledgeRoutes = [
  { label: '認識守宮', body: '豹紋守宮跟肥尾守宮是什麼', to: '/guide' },
  { label: '飼養指南', body: '從環境設置、餌料，建立完整飼養基礎', to: '/care' },
  { label: '飼養前評估', body: '用簡短問答確認時間、空間與日常準備', to: '/qs' },
  { label: '健康評估', body: '依外觀與行為整理觀察重點及就醫時機', to: '/health' },
  { label: '常見問題', body: '快速找到新手最常遇到的飼養與選購解答', to: '/faq' },
  { label: '知識文章', body: '需要深入理解時，繼續閱讀完整專欄內容', to: '/articles' }
]

useHead({
  title: '守宮新手｜第一次養守宮，該從哪開始',
  meta: [
    {
      name: 'description',
      content: '第一次養守宮別著急。先學習怎麼養、評估自己準備好了沒，再來看看漂亮的守宮吧。'
    },
    { property: 'og:title', content: '守宮新手｜第一次養守宮，該從哪開始' },
    {
      property: 'og:description',
      content: '先了解怎麼養，才能讓守宮健康快樂地長大。準備好再開始挑選守宮。'
    },
    { property: 'og:url', content: pageUrl }
  ],
  link: [{ rel: 'canonical', href: pageUrl }]
})
</script>

<template>
  <div class="starter-page">
    <div class="starter-document-meta">
      <span>GENCKO STARTER COURSE</span>
      <span>01 / FOUNDATION</span>
    </div>
    <PageHero
      kicker="START HERE"
      title="第一次養守宮，先別急著帶回家"
      lead="先了解怎麼養，才能讓守宮健康快樂地長大。準備好再開始挑選守宮"
    >
      <ol class="hero-flow">
        <li v-for="item in flowSteps" :key="item.no" class="flow-node">
          <span class="flow-dot">{{ item.no }}</span>
          <span class="flow-title">{{ item.title }}</span>
        </li>
      </ol>
    </PageHero>

    <nav class="starter-reading-index" aria-label="新手入門">
      <span>STARTING POINT</span>
      <a href="#knowledge-hub-title">LEARNING MAP</a>
      <a href="#starter-paths">THREE PATHS</a>
      <a href="#starter-checklist">CHECK</a>
    </nav>

    <section
      class="knowledge-hub"
      aria-labelledby="knowledge-hub-title"
      data-testid="newcomer-roadmap"
    >
      <div class="hub-heading">
        <span>LEARNING MAP</span>
        <h2 id="knowledge-hub-title">這些問題都了解了嗎?選一個開始</h2>
      </div>
      <div class="knowledge-grid">
        <NuxtLink
          no-prefetch
          v-for="item in knowledgeRoutes"
          :key="item.to"
          :to="item.to"
          class="knowledge-card"
        >
          <h3>{{ item.label }}</h3>
          <p>{{ item.body }}</p>
          <span aria-hidden="true">前往 →</span>
        </NuxtLink>
      </div>
    </section>

    <section id="starter-checklist" class="prep-panel">
      <div class="panel-head">
        <div class="panel-kicker">CHECK</div>
        <h2 class="sec-title">準備好把守宮帶回家了嗎?</h2>
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
          <NuxtLink no-prefetch v-if="item.to" :to="item.to" class="prep-link">
            {{ item.linkLabel || '看更多' }}
            <span aria-hidden="true">→</span>
          </NuxtLink>
        </article>
      </div>
    </section>

    <section id="starter-paths" class="lane-board">
      <article v-for="lane in lanes" :key="lane.no" class="lane-card">
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
            no-prefetch
            v-for="action in lane.actions"
            :key="action.to"
            :to="action.to"
            class="lane-chip"
          >
            <span>{{ action.label }}</span>
            <span class="lane-chip-arrow">→</span>
          </NuxtLink>
        </div>
      </article>
    </section>

  </div>
</template>

<style scoped>
.starter-page {
  width: min(1180px, calc(100% - 36px));
  margin-inline: auto;
  padding: 4px 0 0;
}

.starter-document-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  white-space: nowrap;
}

:deep(.page-hero) {
  margin-bottom: 0;
  padding: clamp(24px, 3.2vw, 38px) 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  box-shadow: none;
}

:deep(.page-hero--split) {
  grid-template-columns: minmax(0, 0.94fr) minmax(440px, 1.06fr);
  gap: clamp(28px, 4vw, 56px);
}

:deep(.page-hero .hero-copy) {
  gap: 10px;
}

:deep(.page-hero .page-title) {
  max-width: 15ch;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(1.9rem, 3.25vw, 2.85rem);
  line-height: 1.15;
  text-wrap: balance;
}

:deep(.page-hero .hero-lead) {
  max-width: 48ch;
  color: var(--txt-muted);
  font-size: 0.92rem;
  line-height: 1.7;
  text-wrap: pretty;
}

.hero-flow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.flow-node {
  display: grid;
  align-content: center;
  gap: 7px;
  min-width: 0;
  min-height: 70px;
  padding: 8px 18px;
  border-left: 1px solid var(--bd);
}

.flow-dot {
  color: var(--pri);
  font-size: 0.7rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.flow-title {
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 0.98rem;
  font-weight: 700;
  white-space: nowrap;
}

.starter-reading-index {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) repeat(3, minmax(0, 1fr));
  align-items: center;
  gap: 20px;
  min-height: 42px;
  margin: 12px 0 0;
  border-bottom: 1px solid var(--bd);
}

.starter-reading-index span,
.starter-reading-index a {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  min-height: 40px;
  color: var(--txt);
  font-size: 0.7rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.starter-reading-index span {
  color: var(--pri);
  letter-spacing: 0.1em;
}

#knowledge-hub-title,
#starter-paths,
#starter-checklist {
  scroll-margin-top: 84px;
}

.knowledge-hub,
.prep-panel,
.lane-board {
  padding: clamp(22px, 2.8vw, 32px) 0;
  border-bottom: 1px solid var(--bd);
}

.hub-heading,
.panel-head {
  display: grid;
  grid-template-columns: minmax(120px, 0.22fr) minmax(0, 1fr);
  align-items: start;
  gap: 22px;
  margin-bottom: 20px;
}

.hub-heading span,
.panel-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding-top: 6px;
  color: var(--pri);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.13em;
  white-space: nowrap;
}

.hub-heading span::before,
.panel-kicker::before {
  content: '';
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  background: var(--pri);
}

.hub-heading h2,
.sec-title {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(1.45rem, 2.35vw, 2.05rem);
  line-height: 1.2;
  text-wrap: balance;
}

.knowledge-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px clamp(24px, 3vw, 42px);
}

.knowledge-card {
  display: grid;
  align-content: start;
  gap: 8px;
  min-height: var(--control-min-height);
  padding: 0;
  color: var(--txt);
  text-decoration: none;
  background: transparent;
}

.knowledge-card h3,
.knowledge-card p {
  margin: 0;
}

.knowledge-card h3 {
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.02rem;
}

.knowledge-card p {
  color: var(--txt-muted);
  font-size: 0.86rem;
  line-height: 1.6;
  text-wrap: pretty;
}

.knowledge-card span {
  margin-top: 2px;
  color: var(--pri);
  font-size: 0.76rem;
  font-weight: 850;
}

.prep-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(28px, 4vw, 56px);
}

.prep-card,
.lane-card {
  min-width: 0;
  background: transparent;
}

.prep-card {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-content: start;
  gap: 8px 14px;
}

.prep-card + .prep-card {
  padding-left: clamp(28px, 4vw, 56px);
  border-left: 1px solid var(--bd);
}

.lane-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(24px, 3vw, 42px);
}

.lane-card {
  display: flex;
  min-height: 150px;
  flex-direction: column;
  gap: 14px;
}

.lane-card + .lane-card {
  padding-left: clamp(24px, 3vw, 42px);
  border-left: 1px solid var(--bd);
}

.lane-head {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
}

.lane-badge,
.prep-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  color: var(--pri);
}

.lane-icon,
.prep-icon {
  width: 21px;
  height: 21px;
}

.lane-index,
.prep-no {
  position: absolute;
  right: -2px;
  bottom: -3px;
  color: var(--pri);
  background: var(--card-bg-solid);
  font-size: 0.58rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.lane-copy {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.lane-title,
.prep-title {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.02rem;
  line-height: 1.35;
}

.lane-caption,
.prep-body {
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.84rem;
  line-height: 1.6;
  text-wrap: pretty;
}

.prep-title,
.prep-body,
.prep-link {
  grid-column: 2;
}

.lane-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: auto;
}

.lane-chip,
.prep-link {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 7px;
  min-height: var(--control-min-height);
  padding: 0;
  color: var(--txt);
  font-size: 0.8rem;
  font-weight: 850;
  text-decoration: none;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  white-space: nowrap;
}

.prep-link {
  justify-self: start;
  min-height: var(--control-min-height);
  color: var(--pri);
}

.lane-chip {
  min-height: var(--control-min-height);
}

.lane-chip-arrow {
  color: var(--pri);
}

.knowledge-card:focus-visible,
.starter-reading-index a:focus-visible,
.lane-chip:focus-visible,
.prep-link:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .knowledge-card:hover,
  .lane-chip:hover,
  .prep-link:hover {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    transform: none;
    text-decoration: none;
  }

  .knowledge-card:hover,
  .lane-chip:hover {
    color: var(--txt);
  }

  .prep-link:hover {
    color: var(--pri);
  }
}

@media (max-width: 900px) {
  :deep(.page-hero--split) {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}

@media (max-width: 640px) {
  .starter-page {
    width: min(100% - 28px, 540px);
  }

  .starter-document-meta {
    min-height: 36px;
    font-size: 0.54rem;
  }

  :deep(.page-hero) {
    padding: 20px 0;
  }

  :deep(.page-hero .page-title) {
    max-width: none;
    font-size: clamp(1.5rem, 6.8vw, 1.9rem);
    line-height: 1.22;
  }

  :deep(.page-hero .hero-lead) {
    font-size: 0.82rem;
    line-height: 1.65;
  }

  .flow-node {
    min-height: 60px;
    padding: 6px 9px;
  }

  .flow-title {
    font-size: 0.78rem;
  }

  .starter-reading-index {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    margin-top: 8px;
  }

  .starter-reading-index span {
    grid-column: 1 / -1;
    min-height: 30px;
    border-bottom: 1px solid var(--bd);
    font-size: 0.58rem;
  }

  .starter-reading-index a {
    justify-content: center;
    min-height: 38px;
    font-size: 0.63rem;
  }

  .knowledge-hub,
  .prep-panel,
  .lane-board {
    padding: 20px 0;
  }

  .hub-heading,
  .panel-head {
    grid-template-columns: 1fr;
    gap: 5px;
    margin-bottom: 16px;
  }

  .hub-heading span,
  .panel-kicker {
    padding-top: 0;
    font-size: 0.62rem;
  }

  .hub-heading h2,
  .sec-title {
    font-size: 1.34rem;
  }

  .knowledge-grid,
  .prep-grid,
  .lane-board {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .knowledge-card {
    gap: 6px;
    padding: 13px 0;
    border-bottom: 1px solid var(--bd);
  }

  .knowledge-card:first-child {
    padding-top: 0;
  }

  .knowledge-card:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .knowledge-card h3,
  .lane-title,
  .prep-title {
    font-size: 0.96rem;
  }

  .knowledge-card p,
  .lane-caption,
  .prep-body {
    font-size: 0.8rem;
  }

  .prep-card,
  .lane-card {
    min-height: 0;
    padding: 14px 0;
    border-bottom: 1px solid var(--bd);
  }

  .prep-card:first-child,
  .lane-card:first-child {
    padding-top: 0;
  }

  .prep-card:last-child,
  .lane-card:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  .prep-card + .prep-card,
  .lane-card + .lane-card {
    padding-left: 0;
    border-left: 0;
  }

  .lane-card {
    gap: 10px;
  }

  .lane-actions {
    gap: 14px;
    margin-top: 0;
  }
}

@media (max-width: 340px) {
  .starter-document-meta {
    letter-spacing: 0.07em;
  }

  .starter-reading-index a {
    font-size: 0.58rem;
  }

  .flow-title {
    font-size: 0.72rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .knowledge-card,
  .starter-reading-index a,
  .lane-chip,
  .prep-link {
    transition: none;
  }
}
</style>
