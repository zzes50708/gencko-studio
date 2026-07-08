<script setup>
import { computed } from 'vue'
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
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/' },
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
    { type: 'application/ld+json', children: JSON.stringify(genesWebPageLd.value) },
    { type: 'application/ld+json', children: JSON.stringify(genesBreadcrumbLd) }
  ])
})
</script>

<template>
  <div class="genes-page-wrapper">
    <!-- SEO：頁面唯一 h1（sr-only 含完整關鍵字，全裝置都讓爬蟲讀到） -->
    <h1 class="sr-only">守宮基因圖鑑｜豹紋守宮與肥尾守宮完整基因辭典</h1>
    <!-- 視覺主標保留為 div（桌機可見、手機隱藏） -->
    <div class="page-title dt-only" aria-hidden="true">守宮基因圖鑑</div>

    <!-- 🌟 App-like 分段切換器 -->
    <div class="segmented-control">
      <button
        type="button"
        class="segment"
        :class="{ active: geneSpecies === '豹紋守宮' }"
        @click="geneSpecies = '豹紋守宮'"
      >
        豹紋守宮
      </button>
      <button
        type="button"
        class="segment"
        :class="{ active: geneSpecies === '肥尾守宮' }"
        @click="geneSpecies = '肥尾守宮'"
      >
        肥尾守宮
      </button>
    </div>

    <div class="genes-content">
      <div v-for="(list, cat) in GENES_DB[geneSpecies]" :key="cat" class="gene-section">
        <div class="section-header">
          <h2 class="gene-cat-title">
            <span class="cat-badge" :class="`cat-${cat}`">{{ cat }}</span>
          </h2>
        </div>

        <div class="gene-btn-grid">
          <NuxtLink
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
    </div>
  </div>
</template>

<style scoped>
.genes-page-wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding-top: 15px;
}

.dt-only {
  display: block;
}

.segmented-control {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 30px;
  padding: 4px;
  margin-bottom: 25px;
  position: relative;
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
.gene-btn-item:hover .g-cta {
  opacity: 1;
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

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }

  .genes-page-wrapper {
    padding: 5px 10px 15px 10px;
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
</style>
