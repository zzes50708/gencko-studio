<script setup lang="ts">
import { useHead } from '#imports'
import { getWebPage, getBreadcrumb, getPublisher, GECKO_TAXONS } from '~/utils/seo-schemas'
import { absUrl, DEFAULT_OG_IMAGE } from '~/utils/site-constants'

const pageUrl = absUrl('/guide')

// 豹紋 vs 肥尾對照
const compareRows = [
  { dim: '體型', leopard: '較修長，成體約 20cm', fat: '較壯，尾巴肥厚儲脂' },
  { dim: '濕度', leopard: '偏乾，濕區局部保濕', fat: '稍需一點濕度' },
  { dim: '個性', leopard: '溫馴、好上手', fat: '同樣溫和、較內斂' },
  { dim: '品系', leopard: '顏色花紋品系最多', fat: '品系較少但有特色' }
]

// 延伸內鏈
const nextActions = [
  { label: '選購守宮', to: '/shop' },
  { label: '飼養指南', to: '/care' },
  { label: '基因計算機', to: '/calculator' },
  { label: '飼養前評估', to: '/qs' },
  { label: '特寵醫院', to: '/hospital' },
  { label: '進入商店', to: '/shop', primary: true }
]

// 如何開始養守宮（新手四步；給 AI Overview HowTo 引用）
const startSteps = [
  {
    title: '先準備環境與設備',
    body: '加熱、躲避屋、濕區、鈣粉與維他命，趁牠還沒到家就先備好。',
    to: '/care',
    linkLabel: '看飼養指南'
  },
  {
    title: '做飼養前評估',
    body: '確認自己有時間、預算與心理準備，別衝動入手。',
    to: '/qs',
    linkLabel: '飼養前評估'
  },
  {
    title: '挑選健康個體',
    body: '看清楚個體資料、問狀態，挑穩定進食、精神好的。',
    to: '/shop',
    linkLabel: '選購守宮'
  },
  {
    title: '到家先靜養',
    body: '頭幾天少干擾，觀察牠吃不吃、排不排便、精神好不好。',
    to: '/start-here',
    linkLabel: '新手入門'
  }
]

// 定義型 FAQ（給 AI Overview / 語音搜尋引用）
const faqs = [
  {
    q: '守宮是什麼？',
    a: '守宮是壁虎的一類，屬於蜥蜴、不是蛇。寵物市場最常見的是豹紋守宮和肥尾守宮，體型小、白天多半躲著、晚上比較活躍，養在飼養箱裡就好，不用遛。'
  },
  {
    q: '新手適合養守宮嗎？',
    a: '適合。守宮需求單純——加熱、躲避、定期餵蟲、換水，一週花不了多少時間。但牠是活體不是擺飾，帶回家前先把環境備好、了解基本照顧再入手。'
  },
  {
    q: '守宮好養嗎？會咬人嗎？',
    a: '相對好養，個性溫馴。少數會因緊迫哈氣，但很少真的咬，咬了也不太痛。剛到家先讓牠靜養幾天，別急著上手。'
  },
  {
    q: '守宮多少錢？',
    a: '看品系。普通色平價就能入手，特殊基因或組合品系價格較高。實際在售價格可以到選購頁看。'
  },
  {
    q: '守宮壽命多長、吃什麼？',
    a: '照顧得當可以養 10 年以上，豹紋守宮常見 15～20 年。主食是活餌（蟋蟀、杜比亞等），依年齡調整餵食頻率，並搭配鈣粉與維他命。'
  },
  {
    q: '豹紋守宮和肥尾守宮差在哪？',
    a: '豹紋偏乾、體型較修長、顏色品系最多；肥尾尾巴肥厚儲脂、稍微需要一點濕度，個性一樣溫和。詳細差異可以看飼養指南。'
  }
]

// ── SEO：WebPage(about Taxon) + FAQPage + Breadcrumb ──
const webPageLd = getWebPage({
  url: pageUrl,
  name: '守宮是什麼？新手養守宮完整入門｜豹紋・肥尾守宮',
  about: GECKO_TAXONS,
  speakable: ['.guide-lead', '.guide-sec-body', '.faq-a'],
  mainEntity: {
    '@type': 'Article',
    headline: '守宮是什麼？新手養守宮完整入門',
    description:
      '守宮是壁虎的一類蜥蜴，寵物市場最常見豹紋守宮與肥尾守宮。本文說明什麼是守宮、新手適不適合養、豹紋與肥尾的差異，並延伸到選購、飼養、基因計算與特寵醫院。',
    inLanguage: 'zh-TW',
    about: GECKO_TAXONS,
    publisher: getPublisher()
  }
})

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a }
  }))
}

const howToLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: '如何開始養守宮（新手四步）',
  description: '第一次養守宮的四個步驟：準備環境設備、做飼養前評估、挑選健康個體、到家先靜養。',
  inLanguage: 'zh-TW',
  step: startSteps.map((s, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: s.title,
    text: s.body,
    url: `${pageUrl}#step-${i + 1}`
  }))
}

const breadcrumbLd = getBreadcrumb([
  { name: '首頁', url: '/' },
  { name: '守宮入門', url: '/guide' }
])

useHead({
  title: '守宮是什麼？新手養守宮完整入門｜豹紋・肥尾守宮',
  meta: [
    {
      name: 'description',
      content:
        '守宮是什麼？守宮是壁虎的一類蜥蜴，寵物最常見豹紋守宮與肥尾守宮。一頁看懂守宮是什麼、新手適不適合養、好不好養、壽命、吃什麼、豹紋與肥尾差異，並延伸到選購與飼養。'
    },
    {
      name: 'keywords',
      content:
        '守宮, 守宮是什麼, 守宮好養嗎, 新手養守宮, 豹紋守宮, 肥尾守宮, 守宮壽命, 守宮吃什麼, 守宮價格'
    },
    { property: 'og:title', content: '守宮是什麼？新手養守宮完整入門' },
    {
      property: 'og:description',
      content: '一頁看懂守宮是什麼、新手適不適合、豹紋與肥尾差異，並延伸到選購與飼養。'
    },
    { property: 'og:image', content: DEFAULT_OG_IMAGE },
    { property: 'og:url', content: pageUrl },
    { property: 'og:type', content: 'article' },
    { name: 'twitter:card', content: 'summary_large_image' }
  ],
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(webPageLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(howToLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(faqLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbLd) }
  ]
})
</script>

<template>
  <div class="guide-page">
    <PageHero
      layout="stack"
      kicker="守宮入門"
      title="守宮是什麼？第一次養守宮先看這頁"
      lead="守宮是壁虎的一類、屬於蜥蜴。寵物市場最常見的是豹紋守宮和肥尾守宮——體型小、好照顧、不用遛，是很多人入門爬蟲的第一隻。"
    />

    <section class="guide-sec card">
      <h2 class="sec-title">什麼是守宮</h2>
      <p class="guide-sec-body">
        守宮就是壁虎，是蜥蜴、不是蛇。牠們白天多半躲在躲避屋裡，晚上比較活躍，養在一個布置好的飼養箱裡就好。寵物市場最常見的兩種是
        <strong>豹紋守宮</strong>
        （Eublepharis macularius）和
        <strong>肥尾守宮</strong>
        （Hemitheconyx caudicinctus），顏色與花紋的品系很多，也是新手最容易上手的爬蟲之一。
      </p>
    </section>

    <section class="guide-sec card">
      <h2 class="sec-title">新手適不適合養守宮</h2>
      <p class="guide-sec-body">
        適合。守宮的需求很單純：加熱、躲避、定期餵活餌、換水，一週花不了多少時間，也不會吵。但牠是活體不是擺飾——帶回家前先把環境備好、把基本照顧搞懂再入手。不確定自己準備好了沒，可以先做
        <NuxtLink to="/qs" class="guide-inline-link">飼養前評估</NuxtLink>
        ，或看
        <NuxtLink to="/care" class="guide-inline-link">飼養指南</NuxtLink>
        。
      </p>
    </section>

    <section class="guide-sec card">
      <h2 class="sec-title">豹紋守宮 vs 肥尾守宮</h2>
      <div class="cmp-grid">
        <div class="cmp-row cmp-head">
          <span></span>
          <span>豹紋守宮</span>
          <span>肥尾守宮</span>
        </div>
        <div v-for="row in compareRows" :key="row.dim" class="cmp-row">
          <span class="cmp-dim">{{ row.dim }}</span>
          <span>{{ row.leopard }}</span>
          <span>{{ row.fat }}</span>
        </div>
      </div>
      <p class="guide-sec-body">
        兩種都溫馴好養。想直接看在售個體可以到
        <NuxtLink to="/shop" class="guide-inline-link">選購守宮</NuxtLink>
        ，想玩配對可以用
        <NuxtLink to="/calculator" class="guide-inline-link">基因計算機</NuxtLink>
        。
      </p>
    </section>

    <section class="guide-sec card">
      <h2 class="sec-title">如何開始養守宮（新手四步）</h2>
      <ol class="step-list">
        <li v-for="(s, i) in startSteps" :id="`step-${i + 1}`" :key="s.title" class="step-item">
          <span class="step-no">{{ i + 1 }}</span>
          <div class="step-copy">
            <h3 class="step-title">{{ s.title }}</h3>
            <p class="guide-sec-body">{{ s.body }}</p>
            <NuxtLink :to="s.to" class="guide-inline-link">{{ s.linkLabel }} →</NuxtLink>
          </div>
        </li>
      </ol>
    </section>

    <section class="guide-sec card">
      <div class="faq-head">
        <div class="panel-kicker">FAQ</div>
        <h2 class="sec-title">關於守宮的常見問題</h2>
      </div>
      <div class="faq-list">
        <div v-for="item in faqs" :key="item.q" class="faq-item">
          <h3 class="faq-q">{{ item.q }}</h3>
          <p class="faq-a">{{ item.a }}</p>
        </div>
      </div>
    </section>

    <NextCta title="準備好了嗎" lead="看懂守宮了，就往選購或飼養走。" :actions="nextActions" />
  </div>
</template>

<style scoped>
.guide-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 4px 12px 40px;
}

.card {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.guide-sec {
  padding: 20px;
  margin-bottom: 16px;
  background: var(--card-bg);
}

.sec-title {
  margin: 0 0 10px;
  color: var(--txt);
  font-weight: 900;
  font-size: 1.15rem;
}

.guide-sec-body {
  margin: 0;
  color: var(--txt);
  opacity: 0.85;
  line-height: 1.65;
}

.guide-sec-body strong {
  color: var(--pri);
  font-weight: 800;
}

.guide-inline-link {
  color: var(--pri);
  font-weight: 800;
  text-decoration: none;
}
.guide-inline-link:hover {
  text-decoration: underline;
}

/* 步驟 */
.step-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 12px;
}
.step-item {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  align-items: start;
}
.step-no {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 2px solid rgba(232, 68, 10, 0.28);
  background: rgba(232, 68, 10, 0.06);
  color: var(--pri);
  font-weight: 900;
}
.step-copy {
  display: grid;
  gap: 4px;
}
.step-title {
  margin: 0;
  color: var(--txt);
  font-weight: 900;
  font-size: 1rem;
}

/* 對照表 */
.cmp-grid {
  display: grid;
  gap: 1px;
  margin: 4px 0 14px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--bd);
}
.cmp-row {
  display: grid;
  grid-template-columns: 72px 1fr 1fr;
  gap: 1px;
}
.cmp-row > span {
  padding: 10px 12px;
  background: rgba(128, 128, 128, 0.05);
  color: var(--txt);
  font-size: 0.9rem;
  line-height: 1.4;
}
.cmp-head > span {
  background: rgba(232, 68, 10, 0.08);
  color: var(--pri);
  font-weight: 900;
}
.cmp-dim {
  color: var(--pri) !important;
  font-weight: 800;
}

/* FAQ */
.faq-head {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
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
.faq-list {
  display: grid;
  gap: 12px;
}
.faq-item {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
}
.faq-q {
  margin: 0 0 6px;
  color: var(--txt);
  font-weight: 900;
  font-size: 1rem;
}
.faq-a {
  margin: 0;
  color: var(--txt);
  opacity: 0.85;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .guide-page {
    font-size: 13px;
    padding: 4px 12px 32px;
  }
  .guide-sec {
    padding: 16px;
  }
  .sec-title {
    font-size: 1.05rem;
  }
  .cmp-row {
    grid-template-columns: 60px 1fr 1fr;
  }
  .cmp-row > span {
    padding: 8px 9px;
    font-size: 0.8rem;
  }
}
</style>
