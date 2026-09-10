<script setup>
import { computed, ref } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { GENES_DB } from '~/utils/genes-db'

const store = useMainStore()

// 綁定全域的物種選擇狀態，讓使用者切換頁面回來時能記住最後選擇的物種
const geneSpecies = computed({
  get: () => store.geneSpecies || '豹紋守宮',
  set: (val) => {
    store.geneSpecies = val
  }
})

const geneQuery = ref('')
const normalizedGeneQuery = computed(() => geneQuery.value.trim().toLocaleLowerCase('zh-TW'))
const filteredGeneGroups = computed(() => {
  const query = normalizedGeneQuery.value
  return Object.fromEntries(
    Object.entries(GENES_DB[geneSpecies.value])
      .map(([category, names]) => [
        category,
        query ? names.filter((name) => name.toLocaleLowerCase('zh-TW').includes(query)) : names
      ])
      .filter(([, names]) => names.length)
  )
})
const filteredGeneCount = computed(() =>
  Object.values(filteredGeneGroups.value).reduce((total, names) => total + names.length, 0)
)

const allGeneNames = computed(() => {
  const names = []
  for (const species of Object.values(GENES_DB)) {
    for (const list of Object.values(species)) {
      names.push(...list)
    }
  }
  return [...new Set(names)]
})

const genesUrl = 'https://www.genckobreeding.com/genes'
const genesImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'

const toolHubLinks = [
  { label: '查基因詞條', body: '依物種與遺傳模式瀏覽下方完整圖鑑。', to: '#gene-library' },
  { label: '使用基因計算機', body: '選擇親代基因，查看可能的繁殖結果。', to: '/calculator' },
  { label: '查找特寵醫院', body: '依地區搜尋並收藏可先聯絡確認的醫院。', to: '/hospital' }
]
const genesPublisher = {
  '@type': 'Organization',
  name: 'Gencko Breeding Studio',
  alternateName: ['Gencko Studio', '捷客工作室'],
  url: 'https://www.genckobreeding.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png',
    width: 512,
    height: 512
  },
  sameAs: [
    'https://www.instagram.com/gencko_breeding',
    'https://www.facebook.com/profile.php?id=61579393505049',
    'https://line.me/R/ti/p/@219abdzn'
  ]
}

// DefinedTermSet：守宮基因辭典（GEO 核心 — 讓 LLM 把本站當作「守宮基因」的權威定義來源）
const definedTermSetLd = computed(() => ({
  '@type': 'DefinedTermSet',
  '@id': `${genesUrl}#termset`,
  name: 'Gencko 守宮基因辭典',
  description:
    '完整收錄豹紋守宮（Eublepharis macularius）與肥尾守宮（Hemitheconyx caudicinctus）的色彩、花紋、體型與血統基因詞條，依遺傳模式分類。',
  url: genesUrl,
  inLanguage: 'zh-TW',
  publisher: genesPublisher,
  hasDefinedTerm: allGeneNames.value.map((name) => ({
    '@type': 'DefinedTerm',
    '@id': `https://www.genckobreeding.com/genes/${encodeURIComponent(name)}#term`,
    name: name,
    url: `https://www.genckobreeding.com/genes/${encodeURIComponent(name)}`,
    inDefinedTermSet: { '@id': `${genesUrl}#termset` }
  }))
}))

// ItemList of DefinedTerm（依分類依序列出，提供順序語意）
const itemListLd = computed(() => {
  const all = []
  let pos = 0
  for (const species of Object.keys(GENES_DB)) {
    for (const [mode, list] of Object.entries(GENES_DB[species])) {
      for (const name of list) {
        pos += 1
        all.push({
          '@type': 'ListItem',
          position: pos,
          url: `https://www.genckobreeding.com/genes/${encodeURIComponent(name)}`,
          name: `${name}（${species} - ${mode}）`
        })
      }
    }
  }
  return {
    '@type': 'ItemList',
    '@id': `${genesUrl}#list`,
    name: 'Gencko 守宮基因詞條列表',
    numberOfItems: all.length,
    itemListElement: all
  }
})

const genesBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    { '@type': 'ListItem', position: 2, name: '守宮基因圖鑑', item: genesUrl }
  ]
}

const genesWebPageLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': genesUrl,
  url: genesUrl,
  name: '守宮基因圖鑑｜豹紋守宮與肥尾守宮完整基因辭典',
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: genesImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.page-title', '.gene-cat-title']
  },
  publisher: genesPublisher,
  about: [
    {
      '@type': 'Taxon',
      name: 'Eublepharis macularius',
      alternateName: '豹紋守宮',
      sameAs: 'https://www.wikidata.org/wiki/Q185061'
    },
    {
      '@type': 'Taxon',
      name: 'Hemitheconyx caudicinctus',
      alternateName: '肥尾守宮',
      sameAs: 'https://www.wikidata.org/wiki/Q913571'
    }
  ],
  mainEntity: definedTermSetLd.value,
  hasPart: [itemListLd.value]
}))

useHead({
  title: '守宮基因圖鑑｜豹紋守宮與肥尾守宮完整基因辭典',
  meta: [
    {
      name: 'description',
      content:
        '完整收錄豹紋守宮（Eublepharis macularius）與肥尾守宮（Hemitheconyx caudicinctus）的色彩、花紋、體型與血統基因詞條，依顯性、隱性、共顯性、多遺傳分類。每筆基因附遺傳模式、特徵說明與選育注意事項。'
    },
    {
      name: 'keywords',
      content:
        '守宮基因圖鑑, 豹紋守宮基因, 肥尾守宮基因, 守宮品系, morph, 白化, 雪花, 共顯性, 隱性遺傳'
    },
    // Open Graph
    { property: 'og:title', content: '守宮基因圖鑑｜豹紋守宮與肥尾守宮完整基因辭典' },
    {
      property: 'og:description',
      content:
        '完整收錄豹紋守宮與肥尾守宮的基因詞條，依顯性、隱性、共顯性、多遺傳分類，每筆附特徵說明與選育注意事項。'
    },
    { property: 'og:image', content: genesImg },
    { property: 'og:image:alt', content: 'Gencko 守宮基因圖鑑' },
    { property: 'og:url', content: genesUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '守宮基因圖鑑｜豹紋守宮與肥尾守宮完整基因辭典' },
    {
      name: 'twitter:description',
      content: '完整收錄豹紋守宮與肥尾守宮的基因詞條，依顯性、隱性、共顯性、多遺傳分類。'
    },
    { name: 'twitter:image', content: genesImg }
  ],
  link: [{ rel: 'canonical', href: genesUrl }],
  script: computed(() => [
    { type: 'application/ld+json', innerHTML: JSON.stringify(genesWebPageLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(genesBreadcrumbLd) }
  ])
})
</script>

<template>
  <div class="genes-page-wrapper">
    <div class="genes-document-meta" aria-label="基因圖鑑說明">
      <span>GENCKO REFERENCE LIBRARY</span>
      <span>SPECIES / INHERITANCE / NOTES</span>
    </div>
    <header class="genes-hero">
      <span class="genes-kicker">GENETICS INDEX / 遺傳資料庫</span>
      <h1>守宮基因圖鑑</h1>
      <p>先選物種，再依遺傳模式縮小範圍；每一詞條保留來源、警語與計算工具入口。</p>
    </header>

    <nav class="tool-hub" aria-label="基因與工具快速入口">
      <NuxtLink
        no-prefetch
        v-for="item in toolHubLinks"
        :key="item.to"
        :to="item.to"
        class="tool-hub-card"
      >
        <strong>{{ item.label }}</strong>
        <span>{{ item.body }}</span>
        <small aria-hidden="true">前往 →</small>
      </NuxtLink>
    </nav>

    <section id="gene-library" class="gene-library-controls" aria-label="基因詞條篩選">
      <div class="segmented-control">
        <button
          type="button"
          class="segment"
          :class="{ active: geneSpecies === '豹紋守宮' }"
          :aria-pressed="geneSpecies === '豹紋守宮'"
          @click="geneSpecies = '豹紋守宮'"
        >
          豹紋守宮
        </button>
        <button
          type="button"
          class="segment"
          :class="{ active: geneSpecies === '肥尾守宮' }"
          :aria-pressed="geneSpecies === '肥尾守宮'"
          @click="geneSpecies = '肥尾守宮'"
        >
          肥尾守宮
        </button>
      </div>
      <label class="gene-search">
        <span>搜尋詞條</span>
        <input
          v-model="geneQuery"
          type="search"
          aria-label="搜尋基因詞條"
          placeholder="輸入基因名稱"
        />
      </label>
      <div class="gene-result-count" aria-live="polite">
        {{ geneSpecies }} · {{ filteredGeneCount }} 筆
      </div>
    </section>

    <div class="genes-content">
      <div v-for="(list, cat) in filteredGeneGroups" :key="cat" class="gene-section">
        <div class="section-header">
          <h2 class="gene-cat-title">
            <span class="cat-badge" :class="`cat-${cat}`">{{ cat }}</span>
          </h2>
        </div>

        <div class="gene-btn-grid">
          <NuxtLink
            no-prefetch
            v-for="g in list"
            :key="g"
            :to="`/genes/${encodeURIComponent(g)}`"
            class="gene-btn-item"
          >
            <span class="g-name">{{ g }}</span>
            <span class="g-cta">查看說明 ➜</span>
          </NuxtLink>
        </div>
      </div>
      <div v-if="filteredGeneCount === 0" class="gene-empty">
        <strong>找不到符合的基因詞條</strong>
        <span>請調整關鍵字，或切換物種後再查詢。</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.genes-page-wrapper {
  max-width: 1080px;
  margin: 0 auto;
  padding-top: 15px;
}

.genes-document-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.genes-document-meta span:first-child {
  color: var(--pri);
}

.genes-hero {
  max-width: 760px;
  margin-bottom: 24px;
}
.genes-kicker {
  color: var(--pri);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}
.genes-hero h1 {
  margin: 8px 0;
  color: var(--txt);
  font-size: clamp(2rem, 5vw, 4.2rem);
  line-height: 0.98;
  letter-spacing: -0.055em;
}
.genes-hero p {
  max-width: 62ch;
  margin: 0;
  color: var(--txt-muted);
  line-height: 1.65;
}

.dt-only {
  display: block;
}

.tool-hub {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 18px;
}

.tool-hub-card {
  display: grid;
  gap: 6px;
  padding: 15px;
  color: var(--txt);
  text-decoration: none;
  border: 1px solid var(--bd);
  border-radius: 0;
  background: var(--card-bg);
}

.tool-hub-card span {
  color: var(--txt-muted);
  font-size: 0.84rem;
  line-height: 1.45;
}

.tool-hub-card small {
  color: var(--pri);
  font-weight: 850;
}

.segmented-control {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 30px;
  padding: 4px;
  margin: 0;
  position: relative;
}

.gene-library-controls {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(260px, 1fr) auto;
  gap: 14px;
  align-items: end;
  margin-bottom: 30px;
  padding: 16px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}
.gene-search {
  display: grid;
  gap: 6px;
  color: var(--txt-muted);
  font-size: 0.78rem;
  font-weight: 800;
}
.gene-search input {
  width: 100%;
  min-height: var(--control-min-height);
  padding: 0 14px;
  border: 1px solid var(--bd-solid);
  border-radius: var(--radius-sm);
  background: var(--gb-inner-bg);
  color: var(--txt);
  font: inherit;
}
.gene-search input:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}
.gene-result-count {
  min-width: 120px;
  padding-bottom: 12px;
  color: var(--pri);
  font-variant-numeric: tabular-nums;
  font-weight: 900;
  text-align: right;
}
.gene-empty {
  display: grid;
  gap: 6px;
  padding: 36px;
  border: 1px dashed var(--bd-solid);
  border-radius: var(--radius-lg);
  color: var(--txt);
  text-align: center;
}
.gene-empty span {
  color: var(--txt-muted);
}

.segment {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  border-radius: 25px;
  font-size: 1rem;
  font-weight: bold;
  color: var(--txt);
  opacity: 0.6;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  border: none;
  font-family: inherit;
  min-height: var(--control-min-height);
}

.segment:focus-visible,
.gene-btn-item:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

.segment.active {
  background: var(--pri);
  color: #fff;
  opacity: 1;
  box-shadow: 0 4px 10px rgba(255, 69, 0, 0.4);
}

/* 🌟 只保留標題，移除背景與邊框 */
.section-header {
  background: transparent;
  padding: 0;
  margin-bottom: 12px;
  border-bottom: none;
  border-radius: 0;
}

.gene-cat-title {
  font-size: 1.2rem;
  color: var(--txt);
  margin: 0;
  font-weight: 900;
  letter-spacing: 1px;
}
.cat-badge {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  background: rgba(232, 68, 10, 0.15);
  color: var(--pri-light);
  border: 1px solid rgba(232, 68, 10, 0.3);
}
.g-cta {
  font-size: 0.72rem;
  color: var(--pri);
  opacity: 0.75;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
  transition: opacity 0.2s;
}
.gene-section {
  margin-bottom: 30px;
}

.gene-btn-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.gene-btn-item {
  position: relative;
  background: linear-gradient(135deg, var(--card-bg) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid var(--bd);
  border-radius: 14px;
  padding: 8px 4px;
  text-align: center;
  cursor: pointer;
  transition:
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2px;
  color: var(--txt);
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.5px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  text-decoration: none;
  min-width: 0;
  min-height: var(--control-min-height);
  overflow: hidden;
}

.gene-btn-item::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 69, 0, 0) 0%, rgba(255, 69, 0, 0) 100%);
  border-radius: inherit;
  transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.gene-btn-item:active {
  transform: translateY(-1px) scale(0.98);
}

.g-name {
  position: relative;
  width: 100%;
  white-space: nowrap;
  overflow: visible;
  text-align: center;
  z-index: 1;
}

@media (hover: hover) and (pointer: fine) {
  .gene-btn-item:hover .g-cta {
    opacity: 1;
  }

  .gene-btn-item:hover {
    border-color: var(--pri);
    transform: translateY(-3px);
    box-shadow:
      0 10px 24px rgba(255, 69, 0, 0.18),
      0 2px 6px rgba(255, 69, 0, 0.08);
    color: var(--pri);
  }

  .gene-btn-item:hover::before {
    background: linear-gradient(135deg, rgba(255, 69, 0, 0.08) 0%, rgba(255, 69, 0, 0) 100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .segment,
  .gene-btn-item,
  .gene-btn-item::before,
  .g-cta {
    transition: none;
  }

  .gene-btn-item:active {
    transform: none;
  }
}

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
  .genes-hero h1 {
    font-size: 2.35rem;
  }
  .gene-library-controls {
    grid-template-columns: 1fr;
    padding: 12px;
  }
  .gene-result-count {
    padding: 0;
    text-align: left;
  }
  .dt-only {
    display: none !important;
  }

  .genes-page-wrapper {
    padding: 5px 10px 15px 10px;
  }

  .tool-hub {
    grid-template-columns: 1fr;
    margin-bottom: 12px;
  }

  .segmented-control {
    padding: 2px;
    margin-bottom: 4px;
    border-radius: 20px;
  }

  .segment {
    padding: 8px 0;
    font-size: 0.9rem;
    border-radius: 18px;
  }

  .gene-btn-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px;
  }

  .gene-btn-item {
    padding: 10px 3px;
    border-radius: 10px;
    min-height: 48px;
    gap: 2px;
    font-size: 0.88rem;
    letter-spacing: 0.2px;
  }
  .g-cta {
    display: none;
  }

  .g-name {
    white-space: nowrap !important;
    overflow: visible !important;
    font-size: 0.88rem;
    line-height: 1.2;
    letter-spacing: -0.2px;
  }

  .g-arrow {
    display: block !important;
    font-size: 0.85rem;
  }

  .section-header {
    padding: 0;
    margin-bottom: 8px; /* 縮減與下方基因卡片的間距 */
  }

  .gene-cat-title {
    font-size: 1.05rem;
  }

  .gene-section {
    margin-bottom: 15px;
  }
}

/* 🌟 更小手機螢幕適配（≤400px） */
@media (max-width: 400px) {
  .gene-btn-grid {
    gap: 5px;
  }

  .gene-btn-item {
    padding: 9px 2px;
    font-size: 0.8rem;
  }

  .g-name {
    font-size: 0.8rem;
    letter-spacing: -0.4px;
  }
}

/* 🌟 極小螢幕（iPhone SE 320px） */
@media (max-width: 340px) {
  .gene-btn-grid {
    gap: 4px;
  }

  .gene-btn-item {
    padding: 8px 2px;
    font-size: 0.7rem;
  }

  .g-name {
    font-size: 0.7rem;
    letter-spacing: -0.5px;
  }
}
/* 精品資訊索引：以排版與細線取代厚卡片效果。 */
.genes-page-wrapper {
  max-width: 1180px;
}

.genes-hero,
.gene-library-controls,
.gene-section {
  border-radius: 0;
  box-shadow: none;
}

.genes-hero {
  background: var(--card-bg);
  border-bottom: 1px solid var(--bd);
}

.genes-hero h1,
.gene-cat-title {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.035em;
}

.gene-btn-item,
.gene-search input {
  border-radius: 2px;
  box-shadow: none;
}

.gene-btn-item {
  background: var(--card-bg);
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .gene-btn-item:hover {
    box-shadow: none;
    transform: none;
  }
}

/* 基因圖鑑改為索引式排版，避免舊版卡片、膠囊與光暈干擾閱讀。 */
.tool-hub {
  gap: 0;
  margin-bottom: 32px;
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
}

.tool-hub-card {
  min-height: 154px;
  padding: clamp(18px, 2.5vw, 30px);
  border: 0;
  border-right: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}

.tool-hub-card:last-child {
  border-right: 0;
}

.gene-library-controls {
  grid-template-columns: minmax(260px, 0.8fr) minmax(260px, 1fr) auto;
  gap: 24px;
  padding: 18px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
}

.segmented-control {
  padding: 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}

.segment {
  padding: 11px 0;
  border-radius: 0;
  border-bottom: 2px solid transparent;
  box-shadow: none;
}

.segment.active {
  border-color: var(--pri);
  background: transparent;
  box-shadow: none;
  color: var(--pri);
}

.gene-search input {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
}

.gene-empty,
.gene-btn-item {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.gene-btn-item {
  min-height: 72px;
  padding: 12px 8px;
}

.cat-badge {
  padding: 0 0 0 8px;
  border: 0;
  border-left: 2px solid var(--pri);
  border-radius: 0;
  background: transparent;
  color: var(--pri);
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .gene-btn-item:hover {
    border-color: var(--pri);
    background: var(--pri-glow-soft);
    box-shadow: none;
    transform: none;
  }
}

@media (max-width: 768px) {
  .tool-hub {
    grid-template-columns: 1fr;
  }

  .tool-hub-card {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--bd);
  }

  .tool-hub-card:last-child {
    border-bottom: 0;
  }

  .gene-library-controls {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 14px 0;
  }
}
/* 基因目錄統一搜尋控制與詞條閱讀入口。 */
.genes-page-wrapper {
  padding: 8px 18px 28px;
}
.gene-btn-grid {
  border: 0;
  gap: 0 22px;
}
.gene-btn-item {
  border: 0;
  border-bottom: 1px solid var(--bd);
  padding: 16px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.gene-btn-item:hover {
  transform: none;
  box-shadow: none;
}
.g-name {
  font-family: var(--font-heading-zh);
  line-height: 1.5;
}
.g-cta {
  display: inline-block;
  opacity: 1;
  color: var(--pri);
  text-decoration: underline;
  text-underline-offset: 4px;
  white-space: nowrap;
}
.gene-section {
  margin-block: 22px;
}
.cat-badge {
  border-radius: 0;
  background: transparent;
  padding-left: 0;
}
.gene-search input {
  min-height: 44px;
  border-radius: 2px;
}
.genes-hero {
  padding-block: 22px;
  margin-bottom: 18px;
}
.genes-hero h1 {
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.3;
}
.tool-hub {
  border: 0;
  gap: 0 22px;
  margin-bottom: 20px;
}
.tool-hub-card {
  border: 0;
  border-block: 1px solid var(--bd);
  padding: 14px 0;
  background: transparent;
  box-shadow: none;
}
.tool-hub-card small {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.gene-library-controls {
  padding-block: 16px;
}
.segment {
  min-height: 44px;
  white-space: nowrap;
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
