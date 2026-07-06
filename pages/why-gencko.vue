<script setup>
import { useHead } from '#imports'

const pageUrl = 'https://www.genckobreeding.com/why-gencko'

const trustRows = [
  {
    title: '個體資料公開透明',
    body: '編號、性別、生日、品種，每隻都寫得清清楚楚。'
  },
  {
    title: '飼養方式不藏私',
    body: '環境、溫濕度、怎麼餵，養法都整理好給你。'
  },
  {
    title: '配對工具自己玩',
    body: '基因計算機開放使用，配出來什麼自己先看。'
  },
  {
    title: '醫療資源先備著',
    body: '特寵醫院名單都幫你整理好，需要時找得到。'
  }
]

const overviewBlocks = [
  {
    tag: '身分證',
    title: '每隻都有身分證',
    body: '編號、性別、生日、品種都寫在明面上，看清楚再決定要不要私訊。',
    image: '/previews/identity-card.png',
    alt: 'Gencko 熱門個體電子身分證畫面'
  },
  {
    tag: '飼養',
    title: '養法先講明白',
    body: '環境、溫度、濕度、怎麼餵，買之前就看得到，不是帶回家才慢慢摸索。',
    image: '/previews/care-guide.png',
    alt: 'Gencko 飼養指南頁面畫面'
  },
  {
    tag: '計算機',
    title: '配對工具給你玩',
    body: '想配什麼基因，配對前自己先跑一次計算機，心裡有底再說。',
    image: '/previews/calculator-tool.png',
    alt: 'Gencko 基因計算機頁面畫面'
  },
  {
    tag: '醫院',
    title: '醫院名單先給你',
    body: '萬一有狀況，才不會臨時找不到醫生。名單我們先整理好了。',
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
    <section class="trust-hero card">
      <div class="hero-copy">
        <div class="hero-kicker">WHY GENCKO</div>
        <h1 class="page-title">買之前該知道的，我們都先給你看</h1>
        <p class="hero-lead">
          個體資料、怎麼養、配對工具、看診資源，這些不用等你開口問，我們一開始就都放上來了。
        </p>
      </div>

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
    </section>

    <section class="overview-grid">
      <article v-for="item in overviewBlocks" :key="item.tag" class="overview-card card">
        <div class="overview-head">
          <span class="overview-tag">{{ item.tag }}</span>
          <h2 class="overview-title">{{ item.title }}</h2>
        </div>
        <p class="overview-body">{{ item.body }}</p>

        <div class="preview-shell">
          <img :src="item.image" :alt="item.alt" class="preview-image" loading="lazy" />
        </div>
      </article>
    </section>

    <section class="next-panel card">
      <div class="next-head">
        <div class="hero-kicker">NEXT</div>
        <h2 class="sec-title">看完這些</h2>
        <p class="next-lead">資訊你都看過了，剩下的就交給你決定。</p>
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
.trust-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 12px 40px;
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

/* ---------- Hero ---------- */
.trust-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.98fr);
  gap: 18px;
  padding: 20px;
  margin-bottom: 16px;
  background: var(--card-bg);
  overflow: hidden;
}

.trust-hero::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -8%;
  width: 50%;
  height: 200%;
  background: radial-gradient(closest-side, var(--pri-glow-soft), transparent 70%);
  pointer-events: none;
}

.hero-copy {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 10px;
  align-content: start;
}

/* Kicker（小色點 + uppercase 標籤） */
.hero-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pri);
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: 0.16em;
}

.hero-kicker::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--pri);
  box-shadow: 0 0 0 4px var(--pri-glow-soft);
}

.hero-lead,
.overview-body,
.reason-body,
.next-lead {
  margin: 0;
  color: var(--txt);
  opacity: 0.8;
  line-height: 1.5;
}

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

/* ---------- Overview grid ---------- */
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
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.overview-head {
  display: grid;
  gap: 6px;
}

.overview-tag {
  justify-self: start;
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid rgba(232, 68, 10, 0.28);
  background: rgba(232, 68, 10, 0.06);
  color: var(--pri);
  font-weight: 900;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}

.overview-title,
.sec-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
  line-height: 1.2;
}

.overview-title {
  font-size: 1.08rem;
}

/* 圖片改為完整呈現（contain），不裁切；白底 letterbox 較溫和 */
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

/* ---------- Next CTA ---------- */
.next-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 18px;
  padding: 20px;
  background: var(--card-bg);
}

.next-head {
  display: grid;
  gap: 8px;
}

.next-lead {
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
  .reason-row:hover,
  .overview-card:hover {
    border-color: var(--bd-hover);
    transform: translateY(-3px);
    box-shadow: var(--shadow-hover);
  }
}

/* ---------- RWD ---------- */
@media (max-width: 900px) {
  .trust-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .trust-page {
    font-size: 13px;
    padding: 4px 12px 32px;
  }

  .trust-hero,
  .overview-card,
  .next-panel {
    padding: 16px;
  }

  .page-title {
    font-size: 1.32rem;
  }

  .hero-reasons {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .overview-title,
  .reason-head,
  .sec-title {
    font-size: 0.98rem;
  }

  .hero-lead,
  .overview-body,
  .reason-body,
  .next-lead {
    font-size: 0.84rem;
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
