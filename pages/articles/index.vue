<script setup>
import { ref, computed } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

const store = useMainStore()
const supabase = useSupabaseClient()

// SSR：抓取全部已發布文章（為了讓 Blog + ItemList schema 在伺服器端就有完整資料）
const { data: ssrArticles } = await useAsyncData('articles-list-seo-v5', async () => {
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, title, summary, category, image_url, publish_date, author, keywords, status')
      .ilike('status', 'published')
    if (error || !data) return []
    return data.map((a) => ({
      ID: a.id,
      Title: a.title,
      Summary: a.summary,
      Category: a.category,
      ImageURL: a.image_url,
      Author: a.author || 'Gencko Breeding Studio',
      PublishDate: a.publish_date || '',
      Keywords: a.keywords || ''
    }))
  } catch (e) {
    console.error('[articles-index SSR] fetch failed:', e?.message)
    return []
  }
})
// 用於 schema 的全文章來源：優先 SSR 資料，其次 store
const seoArticles = computed(() =>
  ssrArticles.value && ssrArticles.value.length ? ssrArticles.value : store.articlesList || []
)
// Debug: 將筆數注入 description 以驗證
if (import.meta.server) {
  console.log(
    '[articles-index SSR] ssrArticles count:',
    ssrArticles.value?.length,
    'store count:',
    store.articlesList?.length
  )
}
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

    <div v-if="store.loading && !filteredArticles.length" class="grid article-group-grid">
      <SkeletonCard v-for="n in 6" :key="n" variant="article" :img-height="180" />
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
        <div class="grid article-group-grid">
          <NuxtLink
            no-prefetch
            v-for="item in items"
            :key="item.ID"
            class="card article-card"
            :to="`/articles/${item.ID}`"
            style="text-decoration: none; color: inherit; display: flex; flex-direction: column"
          >
            <div class="article-thumb-wrap">
              <img
                v-if="item.ImageURL"
                :src="getCleanUrl(item.ImageURL, 600)"
                :alt="item.Title"
                class="card-img"
                loading="lazy"
              />
              <div v-else class="card-img article-thumb-fallback" aria-hidden="true">
                FIELD NOTE
              </div>
              <div class="art-cat-tag">{{ item.Category }}</div>
            </div>
            <div class="card-body" style="flex: 1">
              <time :datetime="item.PublishDate" class="date-text">
                {{ fmtDate(item.PublishDate) }}
              </time>
              <h3 class="morph-title">{{ item.Title }}</h3>
              <p class="art-summary">{{ item.Summary }}</p>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.articles-page-wrapper {
  margin: 0 auto;
  max-width: 1300px;
  padding: 6px 18px 48px;
}

.articles-document-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 14px;
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
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.55fr);
  gap: clamp(28px, 6vw, 90px);
  overflow: hidden;
  margin-bottom: 18px;
  padding: clamp(28px, 5vw, 64px);
  border: 1px solid var(--bd);
  border-radius: calc(var(--radius-lg) + 8px);
  background:
    linear-gradient(120deg, var(--pri-glow-soft), transparent 48%),
    repeating-linear-gradient(90deg, transparent 0 78px, var(--bd) 79px 80px), var(--card-bg);
  box-shadow: var(--shadow-card);
}

.articles-masthead::after {
  content: '05';
  position: absolute;
  right: -0.03em;
  bottom: -0.28em;
  color: var(--pri);
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: clamp(7rem, 19vw, 16rem);
  line-height: 1;
  opacity: 0.06;
  pointer-events: none;
}

.masthead-copy,
.masthead-routes {
  position: relative;
  z-index: 1;
}

.masthead-kicker {
  margin-bottom: 12px;
  color: var(--pri);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.17em;
}

.masthead-copy h1 {
  max-width: 720px;
  margin: 0;
  color: var(--txt);
  font-size: clamp(2.35rem, 6vw, 5.8rem);
  line-height: 0.95;
  letter-spacing: -0.055em;
}

.masthead-copy p {
  max-width: 640px;
  margin: 22px 0 0;
  color: var(--txt-muted);
  font-size: clamp(0.98rem, 1.4vw, 1.15rem);
  line-height: 1.8;
}

.masthead-routes {
  display: grid;
  align-content: end;
}

.masthead-routes a {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: var(--control-min-height);
  padding: 13px 2px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt);
  font-weight: 800;
  text-decoration: none;
}

.masthead-routes span {
  color: var(--pri);
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: 0.78rem;
}

.article-control-deck {
  position: sticky;
  top: 8px;
  z-index: 20;
  margin-bottom: 28px;
  padding: 12px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-lg);
  background: var(--card-bg-solid);
  box-shadow: var(--shadow-card);
}

.dt-only {
  display: block;
}

.search-bar-wrap {
  margin-bottom: 10px;
  position: relative;
  width: 100%;
}

.search-icon {
  color: var(--txt);
  font-size: 1.1rem;
  left: 15px;
  opacity: 0.5;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.search-input {
  background: rgba(128, 128, 128, 0.055);
  border: 1px solid var(--bd);
  border-radius: var(--radius-md);
  color: var(--txt);
  font-size: 1rem;
  font-weight: 700;
  outline: none;
  min-height: 52px;
  padding: 14px 48px;
  transition: 0.3s;
  width: 100%;
}

.search-input:focus {
  border-color: var(--pri);
  box-shadow: 0 0 10px var(--pri-glow);
}

.clear-btn {
  height: auto;
  min-height: var(--control-min-height);
  padding: 6px 10px;
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
}

.category-nav-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  margin-bottom: 0;
  overflow-x: auto;
  padding-bottom: 5px;
  scrollbar-width: none;
}

.category-nav-row::-webkit-scrollbar {
  display: none;
}

.nav-chip {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 8px;
  color: var(--txt);
  cursor: pointer;
  flex: 1;
  font-size: 0.9rem;
  font-weight: 700;
  min-width: max-content;
  min-height: var(--control-min-height);
  opacity: 0.7;
  padding: 10px 12px;
  text-align: center;
  transition: 0.2s;
  white-space: nowrap;
  font-family: inherit;
}

.nav-chip:focus-visible,
.q-tag:focus-visible,
.clear-btn:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 2px;
}

.nav-chip.active {
  background: var(--pri);
  border-color: var(--pri);
  box-shadow: 0 4px 10px var(--pri-glow);
  color: #fff;
  opacity: 1;
}

.nav-chip.beginner {
  border-color: var(--ok-text);
  color: var(--ok-text);
}

.nav-chip.beginner.active {
  background: var(--ok-fill);
  border-color: var(--ok-fill);
  color: #fff;
}

.quick-tags {
  align-items: center;
  background: rgba(128, 128, 128, 0.05);
  border-radius: 8px;
  display: flex;
  margin: 10px 0 0;
  padding: 8px 12px;
}

.tag-label {
  font-size: 0.8rem;
  font-weight: 700;
  margin-right: 8px;
  opacity: 0.5;
  white-space: nowrap;
}

.tags-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  scrollbar-width: none;
}

.tags-scroll::-webkit-scrollbar {
  display: none;
}

.q-tag {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 12px;
  color: var(--txt);
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  min-height: var(--control-min-height);
  padding: 4px 10px;
  white-space: nowrap;
}

.q-tag.active {
  background: rgba(232, 68, 10, 0.1);
  border-color: var(--pri);
  color: var(--pri);
}

.list-title {
  border-left: 4px solid var(--pri);
  color: var(--txt);
  font-size: 1.2rem;
  margin-bottom: 15px;
  padding-left: 10px;
}

.article-group {
  margin-bottom: 36px;
}

.article-group:last-child {
  margin-bottom: 0;
}

.article-group-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  border-bottom: 1px solid var(--bd);
}

.article-group-heading > span {
  color: var(--txt-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.article-group-cat {
  background: rgba(255, 69, 0, 0.08);
  border-radius: 5px;
  color: var(--pri);
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: -1px;
  padding: 9px 4px;
  border-bottom: 2px solid var(--pri);
}

.article-group-grid {
  gap: 12px;
}

.article-thumb-wrap {
  min-height: 180px;
  border-bottom: 1px solid var(--bd);
  overflow: hidden;
  position: relative;
}

.article-thumb-wrap .card-img {
  width: 100%;
  height: 210px;
  object-fit: cover;
  transition: transform var(--transition);
}

.article-thumb-fallback {
  align-items: center;
  background: #1a1a1a;
  display: flex;
  color: var(--pri);
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: 1rem;
  letter-spacing: 0.14em;
  justify-content: center;
}

.empty-state {
  background: var(--card-bg);
  border-radius: 12px;
  color: var(--txt);
  opacity: 0.5;
  padding: 50px;
  text-align: center;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.date-text {
  display: block;
  font-size: 0.8rem;
  margin-bottom: 5px;
  opacity: 0.5;
}

.morph-title {
  color: var(--txt);
  font-size: 1.1rem;
  margin-bottom: 5px;
}

.art-summary {
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  display: -webkit-box;
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.7;
  overflow: hidden;
}

.article-card {
  overflow: hidden;
  border: 1px solid var(--bd);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  transition:
    transform var(--transition),
    border-color var(--transition),
    box-shadow var(--transition);
}

.article-card .card-body {
  padding: 18px;
}

@media (min-width: 769px) {
  .article-group-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .article-group-grid .article-card:first-child {
    grid-column: span 2;
  }

  .article-group-grid .article-card:first-child .article-thumb-wrap .card-img {
    height: 320px;
  }

  .article-group-grid .article-card:first-child .morph-title {
    font-size: clamp(1.35rem, 2.5vw, 2rem);
    line-height: 1.15;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .masthead-routes a:hover {
    color: var(--pri);
  }

  .article-card:hover {
    transform: translateY(-5px);
    border-color: var(--bd-hover);
    box-shadow: var(--shadow-hover);
  }

  .article-card:hover .article-thumb-wrap .card-img {
    transform: scale(1.025);
  }
}

@media (prefers-reduced-motion: reduce) {
  .search-input,
  .nav-chip,
  .q-tag,
  .article-card,
  .clear-btn,
  .article-thumb-wrap .card-img {
    transition: none;
  }

  .article-card:hover,
  .article-card:hover .article-thumb-wrap .card-img {
    transform: none;
  }
}

@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }
  .articles-page-wrapper {
    padding: 5px 10px 32px;
  }
  .articles-masthead {
    grid-template-columns: 1fr;
    gap: 24px;
    padding: 24px 18px;
    background: linear-gradient(145deg, var(--pri-glow-soft), transparent 55%), var(--card-bg);
  }
  .masthead-copy h1 {
    font-size: clamp(2.25rem, 14vw, 4rem);
  }
  .article-control-deck {
    position: relative;
    top: auto;
  }
  .nav-chip {
    border-radius: 6px;
    font-size: 0.75rem;
    padding: 8px 10px;
  }
  .grid.article-group-grid {
    gap: 8px !important;
    grid-template-columns: 1fr !important;
  }
  .card-img {
    height: 150px !important;
  }
  .morph-title {
    font-size: 0.9rem !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
/* 文章索引以期刊目錄感呈現，影像與文字維持同等權重。 */
.articles-page-wrapper,
.articles-masthead,
.article-control-deck,
.article-card,
.article-thumb-wrap {
  border-radius: 0;
  box-shadow: none;
}

.articles-masthead h1,
.article-group-heading,
.article-card .card-title {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.03em;
}

.articles-masthead,
.article-control-deck,
.article-card {
  background-image: none;
}

.article-thumb-wrap,
.article-thumb-wrap .card-img {
  aspect-ratio: 1;
}

.category-nav-row a,
.article-card {
  border-radius: 2px;
}

/* 文章入口改為期刊目錄，分類與文章列皆以細線連續排列。 */
.articles-masthead,
.article-control-deck {
  padding: 28px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.category-nav-row {
  gap: 0;
  border-bottom: 1px solid var(--bd);
}

.nav-chip,
.q-tag,
.quick-tags {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.nav-chip {
  border-width: 0 0 2px;
  opacity: 1;
}

.nav-chip.active {
  background: transparent;
  color: var(--pri);
  box-shadow: none;
}

.quick-tags {
  margin-top: 16px;
  padding: 10px 0;
  border-width: 1px 0;
}

.article-group-grid {
  gap: 0;
  border-top: 1px solid var(--bd);
  border-left: 1px solid var(--bd);
}

.article-card {
  border-width: 0 1px 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.article-card .card-body {
  padding: 18px 0 0;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .article-card:hover {
    transform: none;
    border-color: var(--pri);
    box-shadow: none;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .article-card:hover {
    transform: none;
    box-shadow: none;
  }
}
/* 期刊以圖片、標題與細線建立層級。 */
.articles-page-wrapper {
  padding: 8px 18px 28px;
}
.articles-masthead {
  margin-bottom: 18px;
  padding-block: 22px;
  gap: 24px;
}
.articles-masthead h1 {
  font-family: var(--font-heading-zh);
  font-size: clamp(2rem, 4.5vw, 3.7rem);
  line-height: 1.3;
}
.article-control-deck {
  padding: 16px 0;
  margin-bottom: 20px;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}
.masthead-routes a {
  min-height: 44px;
}
.nav-chip,
.q-tag {
  border-radius: 2px;
  box-shadow: none;
  min-height: 44px;
  white-space: nowrap;
}
.article-group {
  margin-block: 24px;
}
.article-card {
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.article-card:hover {
  transform: none;
  box-shadow: none;
}
.article-card .card-body {
  padding: 14px 0;
}
.article-card .morph-title {
  font-family: var(--font-heading-zh);
  line-height: 1.5;
}
.article-card .card-img {
  border-radius: 0;
}
.article-card .morph-title::after {
  content: ' →';
  color: var(--pri);
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
