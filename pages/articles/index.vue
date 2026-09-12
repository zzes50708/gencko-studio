<script setup>
import { ref, computed } from 'vue'
import { useHead, useAsyncData } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

const store = useMainStore()
// SSR 與 SPA 共用同一份摘要資料；Pinia hydration 後不再重複抓取。
await useAsyncData('published-articles-ready', async () => {
  await store.loadArticles()
  return true
})
const seoArticles = computed(() => store.articlesList)
const artCat = ref('All')
const searchQuery = ref('')

const fixedCats = [
  { label: '全部文章', value: 'All' },
  { label: '新手必看', value: 'Beginner' },
  { label: '行為與互動', value: '行為與互動' },
  { label: '健康照護', value: '健康照護' },
  { label: '環境佈置', value: '環境佈置' },
  { label: '餵食與營養', value: '餵食與營養' }
]

const categoryOrder = ['新手必看', '環境佈置', '健康照護', '行為與互動', '餵食與營養']

const setCategory = (catValue) => {
  artCat.value = catValue
  searchQuery.value = ''
}

// 清除篩選（合併為方法，避免行內 @click 多語句被 prettier 拆掉分號而解析失敗）
const resetFilters = () => {
  searchQuery.value = ''
  artCat.value = 'All'
}

const popularTags = computed(() => {
  if (!store.articlesList.length) return []
  const counts = {}
  store.articlesList.forEach((a) => {
    const kws = (a.Keywords || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
    kws.forEach((k) => {
      if (!k.includes('新手')) counts[k] = (counts[k] || 0) + 1
    })
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)
})

const filteredArticles = computed(() => {
  if (!store.articlesList?.length) return []
  let list = [...store.articlesList]

  if (artCat.value === 'Beginner') {
    list = list.filter(
      (i) => (i.Keywords || '').toLowerCase().includes('新手') || (i.Category || '') === '新手必看'
    )
  } else if (artCat.value !== 'All') {
    list = list.filter((i) => i.Category === artCat.value)
  }

  if (searchQuery.value) {
    const terms = searchQuery.value.toLowerCase().split(/\s+/).filter(Boolean)
    list = list.filter((i) => {
      const t = (i.Title || '').toLowerCase()
      const s = (i.Summary || '').toLowerCase()
      const k = (i.Keywords || '').toLowerCase()
      return terms.every((term) => t.includes(term) || s.includes(term) || k.includes(term))
    })
  }

  return list
})

const groupedFilteredArticles = computed(() => {
  const groups = {}

  filteredArticles.value.forEach((item) => {
    const key = item.Category || '未分類'
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  })

  return Object.entries(groups).sort((a, b) => {
    const ai = categoryOrder.indexOf(a[0])
    const bi = categoryOrder.indexOf(b[0])
    const av = ai === -1 ? Number.MAX_SAFE_INTEGER : ai
    const bv = bi === -1 ? Number.MAX_SAFE_INTEGER : bi
    return av - bv || a[0].localeCompare(b[0])
  })
})

const toggleQuickTag = (tag) => {
  if (searchQuery.value === tag) {
    searchQuery.value = ''
  } else {
    searchQuery.value = tag
    artCat.value = 'All'
  }
}

const artsUrl = 'https://www.genckobreeding.com/articles'
const artsImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
const artsPublisher = {
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

// Blog + ItemList of BlogPosting（列出所有文章）
const blogSchema = computed(() => {
  const list = seoArticles.value
  return {
    '@type': 'Blog',
    '@id': `${artsUrl}#blog`,
    name: 'Gencko 守宮文章知識庫',
    description:
      '豹紋守宮與肥尾守宮完整知識庫：新手必看、環境佈置、健康照護、行為互動、餵食與營養。',
    url: artsUrl,
    inLanguage: 'zh-TW',
    publisher: artsPublisher,
    blogPost: list.map((a) => ({
      '@type': 'BlogPosting',
      '@id': `https://www.genckobreeding.com/articles/${a.ID}#article`,
      headline: a.Title,
      url: `https://www.genckobreeding.com/articles/${a.ID}`,
      image: a.ImageURL ? getCleanUrl(a.ImageURL) : artsImg,
      datePublished: a.PublishDate || '',
      dateModified: a.PublishDate || '',
      articleSection: a.Category || '',
      description: a.Summary || '',
      author: {
        '@type': a.Author && a.Author !== 'Gencko Studio' ? 'Person' : 'Organization',
        name: a.Author || 'Gencko Breeding Studio'
      },
      publisher: artsPublisher
    }))
  }
})

const itemListSchema = computed(() => {
  const list = seoArticles.value
  return {
    '@type': 'ItemList',
    '@id': `${artsUrl}#list`,
    name: 'Gencko 守宮飼養知識文章列表',
    numberOfItems: list.length,
    itemListElement: list.map((a, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://www.genckobreeding.com/articles/${a.ID}`,
      name: a.Title
    }))
  }
})

const artsBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    { '@type': 'ListItem', position: 2, name: '飼養知識專欄', item: artsUrl }
  ]
}

const artsWebPageLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': artsUrl,
  url: artsUrl,
  name: '守宮飼養知識文章列表｜Gencko 知識庫',
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: artsImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.page-title', '.search-input']
  },
  publisher: artsPublisher,
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
  mainEntity: blogSchema.value,
  hasPart: [itemListSchema.value]
}))

useHead({
  title: '守宮文章知識庫｜新手必看、健康、環境、餵食完整指南',
  meta: [
    {
      name: 'description',
      content:
        '豹紋守宮與肥尾守宮完整知識庫：新手必看、環境佈置、健康照護、行為互動、餵食與營養指南。Gencko Breeding Studio 飼養教學文章一站收錄。'
    },
    {
      name: 'keywords',
      content: '豹紋守宮飼養, 肥尾守宮飼養, 守宮新手, 守宮文章, 守宮知識庫, 守宮健康, 守宮環境'
    },
    // Open Graph
    { property: 'og:title', content: '守宮文章知識庫｜新手必看、健康、環境、餵食完整指南' },
    {
      property: 'og:description',
      content: '豹紋守宮與肥尾守宮完整知識庫：新手必看、環境佈置、健康照護、行為互動、餵食與營養。'
    },
    { property: 'og:image', content: artsImg },
    { property: 'og:image:alt', content: 'Gencko 守宮文章知識庫' },
    { property: 'og:url', content: artsUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '守宮文章知識庫｜新手必看、健康、環境、餵食完整指南' },
    { name: 'twitter:description', content: '豹紋守宮完整知識庫，飼養教學文章一站收錄。' },
    { name: 'twitter:image', content: artsImg }
  ],
  link: [
    { rel: 'canonical', href: artsUrl },
    {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: 'Gencko 守宮文章 RSS',
      href: 'https://www.genckobreeding.com/feed.xml'
    }
  ],
  script: computed(() => [
    { type: 'application/ld+json', innerHTML: JSON.stringify(artsWebPageLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(artsBreadcrumbLd) }
  ])
})

const fmtDate = (d) => {
  try {
    return new Date(d).toISOString().split('T')[0]
  } catch {
    return ''
  }
}
</script>

<template>
  <div class="articles-page-wrapper">
    <div class="articles-document-meta" aria-label="文章資料庫說明">
      <span>GENCKO FIELD JOURNAL</span>
      <span>SEARCH / READ / APPLY</span>
    </div>
    <header class="articles-masthead" data-testid="articles-editorial-stage">
      <div class="masthead-copy">
        <div class="masthead-kicker">GENCKO FIELD NOTES · 守宮知識誌</div>
        <h1>守宮文章知識庫</h1>
        <p>從飼養情境、健康觀察到行為與營養，用可以立即採取行動的文章整理每一個問題。</p>
      </div>
      <nav class="masthead-routes" aria-label="文章閱讀入口">
        <NuxtLink no-prefetch to="/start-here">
          新手閱讀路徑
          <span>01</span>
        </NuxtLink>
        <NuxtLink no-prefetch to="/care">
          完整飼養指南
          <span>02</span>
        </NuxtLink>
        <NuxtLink no-prefetch to="/health">
          健康狀況評估
          <span>03</span>
        </NuxtLink>
      </nav>
    </header>

    <section class="article-control-deck" aria-label="文章搜尋與分類">
      <div class="search-bar-wrap">
        <span class="search-icon" aria-hidden="true">⌕</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="搜尋關鍵字、症狀、主題..."
          class="search-input"
          aria-label="搜尋文章"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="btn-app btn-app--ghost btn-app--xs btn-app--pill clear-btn"
          aria-label="清除搜尋"
          @click="searchQuery = ''"
        >
          清除
        </button>
      </div>

      <div class="category-nav-row" aria-label="文章分類">
        <button
          v-for="cat in fixedCats"
          :key="cat.value"
          type="button"
          class="nav-chip"
          :class="{ active: artCat === cat.value, beginner: cat.value === 'Beginner' }"
          :aria-pressed="artCat === cat.value"
          @click="setCategory(cat.value)"
        >
          {{ cat.label }}
        </button>
      </div>

      <div v-if="popularTags.length > 0" class="quick-tags">
        <span class="tag-label">熱門主題</span>
        <div class="tags-scroll">
          <button
            v-for="t in popularTags"
            :key="t"
            type="button"
            class="q-tag"
            :class="{ active: searchQuery === t }"
            :aria-pressed="searchQuery === t"
            @click="toggleQuickTag(t)"
          >
            {{ t }}
          </button>
        </div>
      </div>
    </section>

    <div v-if="searchQuery || artCat !== 'All'" class="main-list-head">
      <h2 class="list-title">
        {{
          searchQuery ? `搜尋：${searchQuery}` : fixedCats.find((c) => c.value === artCat)?.label
        }}
      </h2>
    </div>

    <div v-if="store.articlesLoading && !filteredArticles.length" class="article-group-grid">
      <SkeletonCard v-for="n in 6" :key="n" variant="article" :img-height="180" />
    </div>

    <div
      v-else-if="store.articlesError && !filteredArticles.length"
      class="empty-state"
      role="alert"
    >
      <p>{{ store.articlesError }}</p>
      <button type="button" class="btn-app btn-app--primary" @click="store.loadArticles()">
        重新載入
      </button>
    </div>
    <div v-else>
      <div v-if="filteredArticles.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <div>目前沒有符合條件的文章</div>
        <button
          v-if="searchQuery || artCat !== 'All'"
          type="button"
          class="btn-app btn-app--primary btn-app--sm btn-app--pill"
          style="margin-top: 12px"
          @click="resetFilters()"
        >
          清除篩選
        </button>
      </div>

      <div v-for="[cat, items] in groupedFilteredArticles" v-else :key="cat" class="article-group">
        <div class="article-group-heading">
          <div class="article-group-cat">{{ cat }}</div>
          <span>{{ items.length }} 篇</span>
        </div>
        <div class="article-group-grid">
          <NuxtLink
            no-prefetch
            v-for="item in items"
            :key="item.ID"
            class="article-entry"
            :to="`/articles/${item.ID}`"
          >
            <div class="article-thumb-wrap">
              <img
                v-if="item.ImageURL"
                :src="getCleanUrl(item.ImageURL, 600)"
                :alt="item.Title"
                class="article-image"
                loading="lazy"
              />
              <div v-else class="article-image article-thumb-fallback" aria-hidden="true">
                FIELD NOTE
              </div>
              <div class="article-category-badge">{{ item.Category }}</div>
            </div>
            <div class="article-body">
              <time :datetime="item.PublishDate" class="date-text">
                {{ fmtDate(item.PublishDate) }}
              </time>
              <h3 class="article-title">{{ item.Title }}</h3>
              <p class="art-summary">{{ item.Summary }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 使用文章專屬類名，避免商品卡與首篇跨欄的全域規則互相覆蓋。 */
.articles-page-wrapper {
  max-width: 1300px;
  margin: 0 auto;
  padding: 8px 18px 28px;
  min-width: 0;
}
.articles-document-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}
.articles-document-meta span:first-child {
  color: var(--pri);
}
.articles-masthead {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(240px, 0.65fr);
  gap: 24px;
  padding-block: 22px;
}
.masthead-copy {
  min-width: 0;
}
.masthead-kicker {
  margin-bottom: 10px;
  color: var(--pri);
  font-size: 0.76rem;
  font-weight: 800;
}
.masthead-copy h1 {
  margin: 0;
  color: var(--txt);
  font-family: var(--font-heading-zh);
  font-size: clamp(2rem, 4.5vw, 3.7rem);
  line-height: 1.3;
  text-wrap: balance;
}
.masthead-copy p {
  max-width: 640px;
  margin: 16px 0 0;
  color: var(--txt-muted);
  line-height: 1.8;
  text-wrap: pretty;
}
.masthead-routes {
  display: grid;
  align-content: end;
}
.masthead-routes a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: var(--control-min-height);
  padding: 10px 2px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt);
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}
.masthead-routes span {
  color: var(--pri);
  font-size: 0.78rem;
}
.article-control-deck {
  padding-block: 16px;
  border-block: 1px solid var(--bd);
}
.search-bar-wrap {
  position: relative;
  width: 100%;
  margin-bottom: 10px;
}
.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--txt-muted);
}
.search-input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 12px 56px 12px 44px;
  background: transparent;
  border: 1px solid var(--bd);
  border-radius: 2px;
  color: var(--txt);
  font: inherit;
}
.clear-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  min-height: var(--control-min-height);
  min-width: 44px;
  padding: 6px;
}
.category-nav-row {
  display: flex;
  overflow-x: auto;
  gap: 0;
  border-bottom: 1px solid var(--bd);
}
.nav-chip {
  flex: 1 0 auto;
  min-height: var(--control-min-height);
  padding: 10px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--txt);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}
.nav-chip.active {
  color: var(--pri);
  border-bottom-color: var(--pri);
}
.quick-tags {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  min-width: 0;
}
.tag-label {
  flex-shrink: 0;
  color: var(--txt-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}
.tags-scroll {
  display: flex;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
}
.q-tag {
  flex-shrink: 0;
  min-height: var(--control-min-height);
  padding: 6px 10px;
  border: 1px solid var(--bd);
  border-radius: 2px;
  background: transparent;
  color: var(--txt);
  font: inherit;
  font-size: 0.8rem;
  white-space: nowrap;
  cursor: pointer;
}
.q-tag.active {
  color: var(--pri);
  border-color: var(--pri);
}
.search-input:focus-visible,
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
.list-title {
  margin: 18px 0;
  color: var(--txt);
  font-size: 1.2rem;
  overflow-wrap: anywhere;
}
.article-group {
  margin-block: 24px;
}
.article-group:last-child {
  margin-bottom: 0;
}
.article-group-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bd);
  margin-bottom: 16px;
}
.article-group-cat {
  font-family: var(--font-heading-zh);
  font-weight: 700;
  font-size: 1.25rem;
}
.article-group-heading > span {
  color: var(--txt-muted);
  font-size: 0.85rem;
  white-space: nowrap;
}
.article-group-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px 20px;
}
.article-entry {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid var(--bd);
}
.article-group-grid :deep(.sk-card) {
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}
.article-group-grid :deep(.sk-img) {
  height: auto !important;
  aspect-ratio: 16 / 10;
}
.article-group-grid :deep(.sk-body) {
  padding: 12px 0 16px;
}
.article-thumb-wrap {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: var(--card-bg);
}
.article-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.article-thumb-fallback {
  display: grid;
  place-items: center;
  color: var(--txt-muted);
  font-size: 0.8rem;
}
.article-category-badge {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 5px 9px;
  background: var(--card-bg-solid);
  color: var(--txt);
  font-size: 0.75rem;
  font-weight: 700;
}
.article-body {
  padding: 12px 0 16px;
}
.date-text {
  color: var(--txt-muted);
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}
.article-title {
  margin: 8px 0;
  font-family: var(--font-heading-zh);
  font-size: 1.2rem;
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.article-title::after {
  content: ' →';
  color: var(--pri);
  white-space: nowrap;
}
.art-summary {
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.9rem;
  line-height: 1.8;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.empty-state {
  padding: 32px 0;
  text-align: center;
  color: var(--txt-muted);
}
.empty-icon {
  margin-bottom: 12px;
  font-size: 2rem;
}
:deep(.app-back-btn),
.btn-app {
  min-height: var(--control-min-height);
  border-radius: 2px;
  box-shadow: none;
  font-family: var(--font-body-zh);
}
@media (hover: hover) and (pointer: fine) {
  .masthead-routes a:hover,
  .article-entry:hover .article-title,
  .q-tag:hover,
  .nav-chip:hover {
    color: var(--pri);
  }
}
@media (max-width: 1023px) {
  .article-group-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 767px) {
  .articles-page-wrapper {
    padding-inline: 14px;
  }
  .articles-masthead {
    grid-template-columns: 1fr;
    gap: 16px;
    padding-block: 18px;
  }
  .masthead-routes {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .masthead-routes a {
    font-size: 0.85rem;
    gap: 4px;
  }
  .masthead-routes span {
    display: none;
  }
  .dt-only {
    display: none;
  }
  .article-group-grid {
    gap: 20px 14px;
  }
}
@media (max-width: 539px) {
  .article-group-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
@media (prefers-reduced-motion: reduce) {
  .nav-chip,
  .q-tag,
  .clear-btn {
    transition: none;
  }
}
</style>
