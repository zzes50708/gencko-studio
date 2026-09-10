<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { FAQ_CATEGORIES, FAQ_DATA } from '~/utils/faq'
import { absUrl, DEFAULT_OG_IMAGE } from '~/utils/site-constants'
import {
  getWebPage,
  getBreadcrumb,
  getBreadcrumbForPath,
  getSocialMeta,
  GECKO_TAXONS
} from '~/utils/seo-schemas'

const faqUrl = absUrl('/faq')
const faqTitle = '常見問題 FAQ｜Gencko 守宮飼養、健康、購買完整解答'
const faqDesc =
  'Gencko Breeding Studio 常見問題整理：豹紋守宮與肥尾守宮飼養知識、健康判讀、基因與品系說明、官網功能使用、購買流程與售後保障，新手入手前必讀。'

// FAQ 答案：去 HTML 標籤、合併換行
const stripFaq = (s: string) =>
  String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const faqPageLd = {
  '@type': 'FAQPage',
  '@id': `${faqUrl}#faq`,
  mainEntity: FAQ_DATA.map((q) => ({
    '@type': 'Question',
    name: q.title.replace(/（必讀）|\(必讀\)/g, '').trim(),
    acceptedAnswer: {
      '@type': 'Answer',
      text: stripFaq(q.ans)
    }
  }))
}

const faqBreadcrumbLd = getBreadcrumb(getBreadcrumbForPath('/faq'))

const faqWebPageLd = getWebPage({
  url: faqUrl,
  name: faqTitle,
  image: DEFAULT_OG_IMAGE,
  speakable: ['.faq-q', '.faq-answer', '.q-text'],
  about: GECKO_TAXONS,
  mainEntity: faqPageLd
})

useHead({
  title: faqTitle,
  meta: [
    { name: 'description', content: faqDesc },
    {
      name: 'keywords',
      content: '守宮 FAQ, 豹紋守宮新手, 守宮飼養問題, 守宮健康, 守宮購買流程, Gencko 常見問題'
    },
    ...getSocialMeta({
      title: faqTitle,
      description: '守宮飼養知識、健康判讀、基因品系說明、購買與售後保障完整解答。',
      imageAlt: 'Gencko 守宮常見問題 FAQ',
      url: faqUrl,
      type: 'website'
    })
  ],
  link: [{ rel: 'canonical', href: faqUrl }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(faqWebPageLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(faqBreadcrumbLd) }
  ]
})

const activeCategory = ref('gecko')
const activeIndex = ref<string | null>(null) // 格式：'catId-qIdx'

const currentCategory = computed(() => FAQ_CATEGORIES.find((c) => c.id === activeCategory.value))

const switchCategory = (id: string) => {
  activeCategory.value = id
  activeIndex.value = null
}

const toggleQ = (key: string) => {
  activeIndex.value = activeIndex.value === key ? null : key
}
</script>

<template>
  <div class="faq-page-wrapper">
    <TheBackButton wrapper-class="m-only" fallback="/" />

    <div class="content-card">
      <div class="faq-document-meta" aria-label="FAQ 閱讀說明">
        <span>GENCKO ANSWER DESK</span>
        <span>依分類閱讀 / 展開完整回答</span>
      </div>
      <header class="faq-intro" data-testid="faq-route-map">
        <div class="faq-intro-copy">
          <div class="faq-kicker">QUICK ANSWERS · 先找問題，再決定下一步</div>
          <h1>常見問題 FAQ</h1>
          <p>依主題切換，展開後直接閱讀完整答案；需要更深入時，可接著前往對應的指南與工具。</p>
        </div>
        <nav class="faq-route-map" aria-label="FAQ 延伸入口">
          <NuxtLink no-prefetch to="/start-here">新手入門</NuxtLink>
          <NuxtLink no-prefetch to="/care">飼養指南</NuxtLink>
          <NuxtLink no-prefetch to="/health">健康評估</NuxtLink>
          <NuxtLink no-prefetch to="/buying-guide">購買流程</NuxtLink>
        </nav>
      </header>

      <!-- 分類 Tab -->
      <div class="cat-tabs" role="tablist" aria-label="常見問題分類">
        <button
          v-for="cat in FAQ_CATEGORIES"
          :key="cat.id"
          type="button"
          class="cat-tab"
          :class="{ active: activeCategory === cat.id }"
          role="tab"
          :aria-selected="activeCategory === cat.id"
          @click="switchCategory(cat.id)"
        >
          <span class="cat-tab-title">{{ cat.title }}</span>
          <span class="cat-tab-sub dt-only">{{ cat.subtitle }}</span>
        </button>
      </div>

      <!-- 問題列表 -->
      <div class="faq-list">
        <div
          v-for="(q, idx) in currentCategory?.questions"
          :key="idx"
          class="faq-item"
          :class="{ active: activeIndex === `${activeCategory}-${idx}` }"
        >
          <button
            type="button"
            class="faq-q"
            :aria-expanded="activeIndex === `${activeCategory}-${idx}`"
            :aria-controls="`faq-answer-${activeCategory}-${idx}`"
            @click="toggleQ(`${activeCategory}-${idx}`)"
          >
            <span class="q-text">{{ q.title }}</span>
            <span class="q-icon">{{ activeIndex === `${activeCategory}-${idx}` ? '▲' : '▼' }}</span>
          </button>
          <div
            v-show="activeIndex === `${activeCategory}-${idx}`"
            :id="`faq-answer-${activeCategory}-${idx}`"
            class="faq-body-wrapper"
          >
            <div class="faq-body-inner">
              <div class="faq-a" v-html="q.ans ? q.ans.replace(/\n/g, '<br>') : ''"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.faq-page-wrapper {
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 18px 48px;
}

.faq-document-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 14px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.faq-document-meta span:first-child {
  color: var(--pri);
}
.dt-only {
  display: block;
}
.m-only {
  display: none !important;
}

.content-card {
  background: transparent;
  border: 1px solid var(--bd);
  border-radius: calc(var(--radius-lg) + 8px);
  padding: clamp(18px, 4vw, 42px);
  box-shadow: var(--shadow-card);
  background-image:
    radial-gradient(circle at 100% 0, var(--pri-glow-soft), transparent 28%),
    linear-gradient(var(--card-bg), var(--card-bg));
}

.faq-intro {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(250px, 0.6fr);
  gap: clamp(24px, 6vw, 72px);
  align-items: end;
  margin-bottom: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--bd);
}

.faq-kicker {
  margin-bottom: 10px;
  color: var(--pri);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.15em;
}

.faq-intro h1 {
  font-size: clamp(2.2rem, 6vw, 5.2rem);
  margin: 0;
  color: var(--txt);
  line-height: 0.98;
  letter-spacing: -0.055em;
}

.faq-intro p {
  max-width: 650px;
  margin: 16px 0 0;
  color: var(--txt-muted);
  line-height: 1.75;
}

.faq-route-map {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.faq-route-map a {
  display: inline-flex;
  align-items: center;
  min-height: var(--control-min-height);
  padding: 10px 12px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-sm);
  color: var(--txt);
  font-size: 0.82rem;
  font-weight: 800;
  text-decoration: none;
}

/* ── 分類 Tab ── */
.cat-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.cat-tab {
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 12px;
  min-height: var(--control-min-height);
  border-radius: 10px;
  border: 1px solid var(--bd);
  background: var(--card-bg);
  color: var(--txt);
  cursor: pointer;
  transition: 0.2s;
  opacity: 0.65;
}
.cat-tab.active {
  background: var(--pri);
  color: #fff;
  border-color: var(--pri);
  opacity: 1;
  box-shadow: 0 3px 12px var(--pri-glow);
}
.cat-tab-title {
  font-size: 0.95rem;
  font-weight: 800;
}
.cat-tab-sub {
  font-size: 0.72rem;
  opacity: 0.8;
}
.cat-tab.active .cat-tab-sub {
  opacity: 0.9;
}

/* ── FAQ 列表 ── */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.faq-item {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: 0.25s;
}
.faq-item.active {
  border-color: var(--pri);
  box-shadow: 0 4px 15px var(--pri-glow-soft);
}

.faq-q {
  width: 100%;
  padding: 16px 18px;
  min-height: var(--control-min-height);
  cursor: pointer;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--txt);
  font-size: 1rem;
  transition: 0.2s;
  background: transparent;
  border: none;
  font-family: inherit;
  text-align: left;
}
.faq-item.active .faq-q {
  background: rgba(232, 68, 10, 0.05);
  color: var(--pri);
}
.q-text {
  flex: 1;
  padding-right: 12px;
  line-height: 1.4;
}
.q-icon {
  font-size: 0.75rem;
  opacity: 0.5;
  transition: 0.2s;
  flex-shrink: 0;
}
.faq-item.active .q-icon {
  opacity: 1;
  color: var(--pri);
}

.faq-body-wrapper {
  display: block;
}
.faq-body-inner {
  overflow: hidden;
}
.faq-a {
  padding: 16px 18px;
  background: rgba(128, 128, 128, 0.04);
  color: var(--txt);
  opacity: 0.9;
  line-height: 1.75;
  border-top: 1px dashed var(--bd);
  font-size: 0.93rem;
}

@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }
  .m-only {
    display: flex !important;
  }
  .faq-page-wrapper {
    padding: 0 10px 32px;
  }
  .content-card {
    padding: 14px;
    border-radius: 12px;
  }
  .cat-tabs {
    gap: 6px;
  }
  .faq-intro {
    grid-template-columns: 1fr;
    gap: 18px;
    margin-bottom: 18px;
    padding-bottom: 20px;
  }
  .faq-route-map {
    grid-template-columns: 1fr 1fr;
  }
  .cat-tab {
    padding: 8px 6px;
    min-width: 80px;
  }
  .cat-tab-title {
    font-size: 0.82rem;
  }
  .faq-list {
    gap: 7px;
  }
  .faq-q {
    padding: 13px 12px;
    font-size: 0.93rem;
  }
  .faq-a {
    padding: 12px;
    font-size: 0.88rem;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .faq-route-map a:hover {
    border-color: var(--bd-hover);
    color: var(--pri);
  }

  .cat-tab:hover {
    opacity: 0.9;
    border-color: var(--bd-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cat-tab,
  .faq-item,
  .faq-q,
  .q-icon,
  .faq-body-wrapper {
    transition: none;
  }
}
/* FAQ 以分隔線取代卡片堆疊，讓問題與答案更接近索引頁。 */
.faq-page-wrapper,
.content-card,
.faq-intro,
.faq-item {
  border-radius: 0;
  box-shadow: none;
}

.faq-intro h1,
.faq-q {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.025em;
}

.faq-list {
  counter-reset: faq-answer;
  gap: 0;
  border-top: 1px solid var(--bd);
}

.faq-item {
  counter-increment: faq-answer;
  border-width: 0 0 1px;
}

.faq-q::before {
  content: counter(faq-answer, decimal-leading-zero);
  flex: 0 0 34px;
  color: var(--pri);
  font-size: 0.7rem;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.cat-tab,
.faq-route-map a,
.faq-q {
  border-radius: 2px;
  box-shadow: none;
}

/* FAQ 採索引式手風琴，分類和答案由細線與橘色 active state 區分。 */
.content-card {
  padding: 32px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.faq-route-map {
  gap: 0;
  border-top: 1px solid var(--bd);
  border-left: 1px solid var(--bd);
}

.faq-route-map a {
  border-width: 0 1px 1px 0;
  border-radius: 0;
  background: transparent;
}

.cat-tabs {
  gap: 0;
  margin-bottom: 28px;
  border-bottom: 1px solid var(--bd);
}

.cat-tab {
  border-width: 0 0 2px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  opacity: 1;
}

.cat-tab.active {
  border-color: var(--pri);
  background: transparent;
  color: var(--pri);
  box-shadow: none;
}

.faq-item,
.faq-item.active {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.faq-item.active {
  border-color: var(--pri);
}

.faq-item.active .faq-q,
.faq-a {
  background: transparent;
}

.faq-q {
  padding-left: 0;
  padding-right: 0;
}

.faq-a {
  padding-left: 0;
  padding-right: 0;
}

@media (max-width: 768px) {
  .content-card {
    padding: 20px 0;
  }

  .faq-route-map {
    border-left: 0;
  }

  .faq-route-map a {
    padding-left: 8px;
    padding-right: 8px;
  }
}
/* FAQ 使用完整寬度的文字列，操作與正文分層。 */
.faq-page-wrapper {
  padding: 8px 18px 28px;
}
.content-card {
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
}
.faq-intro {
  padding: 20px 0;
  margin-bottom: 18px;
  gap: 24px;
}
.faq-intro h1 {
  font-family: var(--font-heading-zh);
  font-size: clamp(2rem, 4.5vw, 3.7rem);
  line-height: 1.3;
}
.faq-route-map {
  border: 0;
  gap: 8px;
}
.faq-route-map a {
  border: 1px solid var(--txt);
  border-radius: 2px;
  min-height: 44px;
}
.faq-q {
  font-family: var(--font-body-zh);
  letter-spacing: normal;
  gap: 10px;
}
.q-icon {
  opacity: 1;
  color: var(--pri);
}
.cat-tab-title {
  white-space: nowrap;
}
.cat-tabs {
  margin-bottom: 16px;
}
.faq-a {
  padding: 12px 0 18px 44px;
  border-top: 0;
}
.faq-a :deep(a) {
  color: var(--pri);
  text-decoration: underline;
  text-underline-offset: 4px;
}
@media (max-width: 768px) {
  .faq-a {
    padding-left: 0;
  }
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
