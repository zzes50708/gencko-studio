<script setup lang="ts">
import { useHead } from '#imports'
import { getWebPage, getBreadcrumb, getPublisher, GECKO_TAXONS } from '~/utils/seo-schemas'
import { absUrl, DEFAULT_OG_IMAGE } from '~/utils/site-constants'

const pageUrl = absUrl('/guide')

// 豹紋 vs 肥尾對照
const compareRows = [
  { dim: '體型', leopard: '較修長，成體約18~25cm', fat: '較圓潤，成體約18~25cm' },
  { dim: '尾巴形狀', leopard: '尾巴呈細長錐形', fat: '尾部通常更為肥厚' },
  {
    dim: '眼睛特徵',
    leopard: '類似貓眼的縱向瞳孔，若攜帶基因也會有對應的特殊眼',
    fat: '大多純黑且圓潤，若攜帶基因也會有對應的特殊眼'
  },
  { dim: '品系特色', leopard: '顏色與花紋品系選擇較多', fat: '品系選擇較少，但外觀辨識度高' }
]

const definitionPoints = [
  { label: '分類', value: '守宮是壁虎的通稱，屬於肉食性的蜥蜴。' },
  { label: '活動', value: '白天多半躲藏休息，夜間通常較為活躍。' },
  { label: '生活', value: '主要生活在備妥冷熱區、躲避處與水源的飼養環境中。' },
  { label: '常見種類', value: '寵物市場常見豹紋守宮與肥尾守宮，兩者都有不同花色與品系。' }
]

const readinessColumns = [
  {
    eyebrow: 'WHY IT WORKS',
    title: '適合作為入門寵物的原因',
    items: ['生活空間相對集中，不需要外出散步', '日常照護流程明確，容易建立固定習慣', '豹紋與肥尾守宮都有多種外觀可供認識與選擇']
  },
  {
    eyebrow: 'BEFORE YOU START',
    title: '帶回家前需要確認',
    items: ['能否準備合適的環境與日常用品', '能否穩定取得活餌並接受餵食昆蟲', '能否負擔長期照護與必要時的特殊寵物醫療']
  }
]

// 定義型 FAQ（給 AI Overview / 語音搜尋引用）
const faqs = [
  {
    q: '守宮好養嗎？會咬人嗎？',
    a: '守宮的日常需求相對明確，但仍需要穩定冷熱區、適當環境、餵食活餌與持續觀察。個體在緊迫時可能防禦或咬人，剛到家應先讓牠安定，不要急著上手。'
  },
  {
    q: '守宮多少錢？',
    a: '價格會依物種、品系、年齡與個體狀態而不同。實際可選個體與售價請以選購頁當下資料為準。'
  },
  {
    q: '守宮壽命多長、吃什麼？',
    a: '守宮是需要長期照顧的寵物，照護合適時可能陪伴飼主多年。日常以合適的活餌為主，並依年齡、體況與飼養方式調整餵食及營養補充。'
  }
]

// ── SEO：WebPage(about Taxon) + FAQPage + Breadcrumb ──
const webPageLd = getWebPage({
  url: pageUrl,
  name: '守宮是什麼？認識豹紋守宮與肥尾守宮',
  about: GECKO_TAXONS,
  speakable: ['.hero-lead', '.guide-sec-body', '.faq-a'],
  mainEntity: {
    '@type': 'Article',
    headline: '守宮是什麼？認識豹紋守宮與肥尾守宮',
    description:
      '認識守宮的基本分類、生活方式，以及豹紋守宮與肥尾守宮的體型、外觀、環境需求與品系特色。',
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

const breadcrumbLd = getBreadcrumb([
  { name: '首頁', url: '/' },
  { name: '守宮介紹', url: '/guide' }
])

useHead({
  title: '守宮是什麼？認識豹紋守宮與肥尾守宮',
  meta: [
    {
      name: 'description',
      content:
        '守宮是什麼？認識豹紋守宮與肥尾守宮的基本分類、生活方式、外觀特色與飼養前需要確認的事情。'
    },
    {
      name: 'keywords',
      content:
        '守宮, 守宮是什麼, 守宮好養嗎, 新手養守宮, 豹紋守宮, 肥尾守宮, 守宮壽命, 守宮吃什麼, 守宮價格'
    },
    { property: 'og:title', content: '守宮是什麼？認識豹紋守宮與肥尾守宮' },
    {
      property: 'og:description',
      content: '認識守宮的生活方式、飼養前準備，以及豹紋守宮與肥尾守宮的主要差異。'
    },
    { property: 'og:image', content: DEFAULT_OG_IMAGE },
    { property: 'og:url', content: pageUrl },
    { property: 'og:type', content: 'article' },
    { name: 'twitter:card', content: 'summary_large_image' }
  ],
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(webPageLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(faqLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbLd) }
  ]
})
</script>

<template>
  <div class="guide-page">
    <div class="guide-document-meta" aria-label="頁面摘要">
      <span>GENCKO FIELD NOTES</span>
      <span>01 / GECKOS</span>
    </div>
    <PageHero
      layout="split"
      kicker="守宮介紹"
      title="守宮是什麼？認識豹紋守宮與肥尾守宮"
      lead="兩種常見寵物守宮的差異，先正確認識，再決定是否適合開始飼養。"
    >
      <figure class="hero-visual">
        <NuxtImg
          src="/images/guide/hero-gecko.webp"
          alt="橘色豹紋守宮近照"
          width="640"
          height="360"
          sizes="sm:100vw md:50vw lg:520px"
          loading="eager"
          fetchpriority="high"
        />
      </figure>
    </PageHero>

    <nav
      class="guide-orientation-map"
      data-testid="guide-orientation-map"
      aria-label="入門閱讀方向"
    >
      <div class="orientation-copy">
        <span>START WITH CONTEXT</span>
        <strong>看完介紹，依你的下一個問題繼續</strong>
      </div>
      <NuxtLink no-prefetch to="/start-here">新手入門</NuxtLink>
      <NuxtLink no-prefetch to="/care">飼養指南</NuxtLink>
      <NuxtLink no-prefetch to="/qs">飼養前評估</NuxtLink>
      <NuxtLink no-prefetch to="/shop">選購個體</NuxtLink>
    </nav>

    <section id="guide-basics" class="guide-sec">
      <h2 class="sec-title">什麼是守宮</h2>
      <dl class="definition-grid">
        <div v-for="point in definitionPoints" :key="point.label" class="definition-item">
          <dt>{{ point.label }}</dt>
          <dd>{{ point.value }}</dd>
        </div>
      </dl>
    </section>

    <section id="guide-ready" class="guide-sec">
      <h2 class="sec-title">新手適不適合養守宮</h2>
      <div class="readiness-grid">
        <article v-for="column in readinessColumns" :key="column.title" class="readiness-column">
          <span>{{ column.eyebrow }}</span>
          <h3>{{ column.title }}</h3>
          <ul>
            <li v-for="item in column.items" :key="item">{{ item }}</li>
          </ul>
        </article>
      </div>
      <p class="guide-sec-body guide-followup">
        不確定是否準備完成，可先
        <NuxtLink no-prefetch to="/care" class="guide-inline-link">查看飼養指南 →</NuxtLink>
        或進行
        <NuxtLink no-prefetch to="/qs" class="guide-inline-link">飼養前評估 →</NuxtLink>
      </p>
    </section>

    <section id="guide-species" class="guide-sec">
      <h2 class="sec-title">豹紋守宮 vs 肥尾守宮</h2>
      <div class="species-portraits">
        <div class="species-portrait">
          <NuxtImg
            src="/images/guide/leopard-gecko.webp"
            alt="豹紋守宮外觀"
            width="1200"
            height="1200"
            sizes="sm:50vw md:36vw lg:390px"
            loading="lazy"
          />
          <strong>豹紋守宮</strong>
          <i lang="la">Eublepharis macularius</i>
        </div>
        <div class="species-portrait">
          <NuxtImg
            src="/images/guide/fat-tailed-gecko.webp"
            alt="肥尾守宮外觀"
            width="1200"
            height="1200"
            sizes="sm:50vw md:36vw lg:390px"
            loading="lazy"
          />
          <strong>肥尾守宮</strong>
          <i lang="la">Hemitheconyx caudicinctus</i>
        </div>
      </div>
      <div class="cmp-grid cmp-desktop">
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
      <div class="cmp-mobile">
        <section v-for="species in ['leopard', 'fat'] as const" :key="species" class="cmp-species">
          <h3>{{ species === 'leopard' ? '豹紋守宮' : '肥尾守宮' }}</h3>
          <dl>
            <div v-for="row in compareRows" :key="row.dim">
              <dt>{{ row.dim }}</dt>
              <dd>{{ row[species] }}</dd>
            </div>
          </dl>
        </section>
      </div>
      <p class="guide-sec-body">
        實際個體仍會有體態、食慾與行為差異。決定物種後，可以查看
        <NuxtLink no-prefetch to="/shop" class="guide-inline-link">可選個體 →</NuxtLink>
      </p>
    </section>

    <div class="starter-route">
      <div>
        <span>START HERE</span>
        <strong>第一次飼養，先了解守宮</strong>
      </div>
      <NuxtLink no-prefetch to="/start-here" class="guide-inline-link">
        查看新手入門 →
      </NuxtLink>
    </div>

    <section id="guide-faq" class="guide-sec">
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
  </div>
</template>

<style scoped>
.guide-page {
  width: min(1120px, calc(100% - 36px));
  margin-inline: auto;
  padding: 4px 0 0;
}

.guide-document-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 40px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  line-height: 1.3;
  white-space: nowrap;
}

.guide-document-meta span:first-child {
  color: var(--pri);
}

:deep(.page-hero) {
  margin-bottom: 0;
  padding: clamp(24px, 3.2vw, 38px) 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  box-shadow: none;
}

:deep(.page-hero .hero-copy) {
  gap: 10px;
}

:deep(.page-hero .page-title) {
  max-width: 18ch;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: clamp(1.9rem, 3.25vw, 2.85rem);
  line-height: 1.15;
  text-wrap: balance;
}

:deep(.page-hero .hero-lead) {
  max-width: 74ch;
  color: var(--txt-muted);
  font-size: 0.92rem;
  line-height: 1.7;
  text-wrap: pretty;
}

.hero-visual {
  margin: 0;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #eee9e2;
}

.hero-visual img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.guide-orientation-map {
  display: grid;
  grid-template-columns: minmax(230px, 1.25fr) repeat(4, minmax(118px, 0.75fr));
  align-items: stretch;
  margin: 12px 0 0;
  border-bottom: 1px solid var(--bd);
}

.orientation-copy,
.guide-orientation-map a {
  min-height: 48px;
  padding: 8px 14px;
  background: transparent;
  border: 0;
  border-right: 1px solid var(--bd);
  border-radius: 0;
  box-shadow: none;
}

.guide-orientation-map > :last-child {
  border-right: 0;
}

.orientation-copy {
  display: grid;
  align-content: center;
  gap: 2px;
  padding-left: 0;
}

.orientation-copy span {
  color: var(--pri);
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.orientation-copy strong {
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 0.82rem;
}

.guide-orientation-map a {
  display: flex;
  align-items: center;
  color: var(--txt);
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.guide-sec {
  display: grid;
  grid-template-columns: minmax(180px, 0.28fr) minmax(0, 1fr);
  align-items: start;
  column-gap: clamp(28px, 4vw, 58px);
  padding: clamp(22px, 2.8vw, 32px) 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  overflow: visible;
}

.guide-sec > * {
  grid-column: 2;
}

.guide-sec > .sec-title,
.guide-sec > .faq-head {
  grid-column: 1;
  grid-row: 1 / span 3;
}

.sec-title {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.12rem;
  line-height: 1.45;
  text-wrap: balance;
}

.guide-sec-body {
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.9rem;
  line-height: 1.75;
  text-wrap: pretty;
}

.guide-sec-body strong {
  color: var(--pri);
  font-weight: 800;
}

.definition-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  border-top: 1px solid var(--bd);
}

.definition-item {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--bd);
}

.definition-item:nth-child(odd) {
  padding-right: 20px;
}

.definition-item:nth-child(even) {
  padding-left: 20px;
  border-left: 1px solid var(--bd);
}

.definition-item dt,
.definition-item dd {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.65;
}

.definition-item dt {
  color: var(--pri);
  font-weight: 900;
}

.definition-item dd {
  color: var(--txt-muted);
}

.readiness-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
}

.readiness-column {
  padding: 16px 20px 16px 0;
}

.readiness-column + .readiness-column {
  padding-right: 0;
  padding-left: 20px;
  border-left: 1px solid var(--bd);
}

.readiness-column > span {
  color: var(--pri);
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.readiness-column h3 {
  margin: 4px 0 10px;
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1rem;
}

.readiness-column ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding-left: 1.1em;
  color: var(--txt-muted);
  font-size: 0.84rem;
  line-height: 1.6;
}

.readiness-column li::marker {
  color: var(--pri);
}

.guide-followup {
  margin-top: 4px;
}

.guide-inline-link {
  display: inline-block;
  min-height: var(--control-min-height);
  padding: 9px 2px;
  color: var(--pri);
  font-weight: 800;
  text-decoration: none;
}

.guide-inline-link:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}

.guide-orientation-map a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}

.species-portraits {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 16px;
}

.species-portrait {
  display: grid;
  gap: 3px;
}

.species-portrait img {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  margin-bottom: 7px;
  object-fit: cover;
}

.species-portrait strong {
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1rem;
}

.species-portrait i {
  color: var(--txt-muted);
  font-family: Georgia, serif;
  font-size: 0.72rem;
}

.cmp-grid {
  display: grid;
  gap: 0;
  margin: 0 0 14px;
  overflow: hidden;
  border: 1px solid var(--bd);
  border-radius: 0;
}

.cmp-row {
  display: grid;
  grid-template-columns: 72px 1fr 1fr;
  border-bottom: 1px solid var(--bd);
}

.cmp-row:last-child {
  border-bottom: 0;
}

.cmp-row > span {
  padding: 10px 12px;
  color: var(--txt);
  background: transparent;
  border-right: 1px solid var(--bd);
  font-size: 0.86rem;
  line-height: 1.45;
}

.cmp-row > span:last-child {
  border-right: 0;
}

.cmp-head > span {
  color: var(--pri);
  font-weight: 900;
}

.cmp-dim {
  color: var(--pri) !important;
  font-weight: 800;
}

.cmp-mobile {
  display: none;
}

.faq-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 28px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.starter-route {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  padding: clamp(18px, 2.4vw, 26px) 0;
  border-bottom: 1px solid var(--bd);
}

.starter-route > div {
  display: grid;
  gap: 4px;
}

.starter-route span {
  color: var(--pri);
  font-size: 0.62rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.starter-route strong {
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1.05rem;
}

.faq-q {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', 'Songti TC', serif;
  font-size: 1rem;
  line-height: 1.45;
}

.faq-head {
  display: grid;
  align-content: start;
  gap: 6px;
}

.panel-kicker {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.13em;
}

.panel-kicker::before {
  content: '';
  width: 6px;
  height: 6px;
  background: var(--pri);
}

.faq-item {
  padding: 15px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}

.faq-item:nth-child(-n + 2) {
  padding-top: 0;
}

.faq-item:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.faq-q {
  margin-bottom: 5px;
}

.faq-a {
  margin: 0;
  padding: 0;
  color: var(--txt-muted);
  background: transparent;
  border: 0;
  font-size: 0.88rem;
  line-height: 1.7;
  text-wrap: pretty;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .guide-inline-link:hover,
  .guide-orientation-map a:hover {
    color: inherit;
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    transform: none;
    text-decoration: none;
  }

  .guide-inline-link:hover {
    color: var(--pri);
  }
}

@media (max-width: 800px) {
  .guide-orientation-map {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .orientation-copy {
    grid-column: 1 / -1;
    border-right: 0;
    border-bottom: 1px solid var(--bd);
  }

  .guide-orientation-map a:nth-of-type(2n) {
    border-right: 0;
  }

  .guide-orientation-map a:nth-last-child(n + 3) {
    border-bottom: 1px solid var(--bd);
  }
}

@media (max-width: 640px) {
  .guide-page {
    width: min(100% - 28px, 540px);
  }

  .guide-document-meta {
    min-height: 36px;
    font-size: 0.54rem;
  }

  :deep(.page-hero) {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
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

  .guide-orientation-map {
    margin-top: 8px;
  }

  .orientation-copy,
  .guide-orientation-map a {
    min-height: 42px;
    padding: 8px 9px;
  }

  .orientation-copy {
    padding-left: 0;
  }

  .guide-orientation-map a {
    font-size: 0.72rem;
  }

  .guide-sec {
    display: block;
    padding: 20px 0;
  }

  .guide-sec > .sec-title,
  .guide-sec > .faq-head {
    margin-bottom: 14px;
  }

  .sec-title {
    font-size: 1.05rem;
  }

  .guide-sec-body,
  .faq-a {
    font-size: 0.8rem;
    line-height: 1.65;
  }

  .definition-grid,
  .readiness-grid,
  .faq-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .definition-item,
  .definition-item:nth-child(odd),
  .definition-item:nth-child(even) {
    padding: 11px 0;
    border-left: 0;
  }

  .definition-item {
    grid-template-columns: 62px minmax(0, 1fr);
  }

  .definition-item dt,
  .definition-item dd,
  .readiness-column ul {
    font-size: 0.78rem;
  }

  .readiness-column,
  .readiness-column + .readiness-column {
    padding: 14px 0;
    border-left: 0;
  }

  .readiness-column + .readiness-column {
    border-top: 1px solid var(--bd);
  }

  .species-portraits {
    gap: 10px;
  }

  .species-portrait strong {
    font-size: 0.9rem;
  }

  .species-portrait i {
    font-size: 0.62rem;
  }

  .cmp-desktop {
    display: none;
  }

  .cmp-mobile {
    display: grid;
    gap: 18px;
    margin-bottom: 8px;
  }

  .cmp-species h3 {
    margin: 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--bd);
    color: var(--pri);
    font-family: 'Noto Serif TC', 'Songti TC', serif;
    font-size: 0.92rem;
  }

  .cmp-species dl,
  .cmp-species dl > div {
    margin: 0;
  }

  .cmp-species dl > div {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid var(--bd);
  }

  .cmp-species dt,
  .cmp-species dd {
    margin: 0;
    font-size: 0.76rem;
    line-height: 1.55;
  }

  .cmp-species dt {
    color: var(--pri);
    font-weight: 800;
  }

  .cmp-species dd {
    color: var(--txt-muted);
  }

  .starter-route {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
    padding: 16px 0;
  }

  .starter-route strong {
    font-size: 0.94rem;
  }

  .faq-item,
  .faq-item:first-child,
  .faq-item:last-child {
    padding: 13px 0;
    border-bottom: 1px solid var(--bd);
  }
}

@media (prefers-reduced-motion: reduce) {
  .guide-inline-link,
  .guide-orientation-map a {
    transition: none;
  }
}
</style>
