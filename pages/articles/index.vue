<script setup>
import { ref, computed } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

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
        return data.map(a => ({
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
const seoArticles = computed(() => (ssrArticles.value && ssrArticles.value.length ? ssrArticles.value : (store.articlesList || [])))
// Debug: 將筆數注入 description 以驗證
if (import.meta.server) {
    console.log('[articles-index SSR] ssrArticles count:', ssrArticles.value?.length, 'store count:', store.articlesList?.length)
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

const popularTags = computed(() => {
    if (!store.articlesList.length) return []
    const counts = {}
    store.articlesList.forEach((a) => {
        const kws = (a.Keywords || '').split(',').map((k) => k.trim()).filter(Boolean)
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
        list = list.filter((i) =>
            (i.Keywords || '').toLowerCase().includes('新手') ||
            (i.Category || '') === '新手必看'
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
const artsImg = 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png'
const artsPublisher = {
    "@type": "Organization",
    "name": "Gencko Breeding Studio",
    "alternateName": ["Gencko Studio", "捷客工作室"],
    "url": "https://www.genckobreeding.com",
    "logo": { "@type": "ImageObject", "url": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png", "width": 512, "height": 512 },
    "sameAs": [
        "https://www.instagram.com/gencko_breeding",
        "https://www.facebook.com/profile.php?id=61579393505049",
        "https://line.me/R/ti/p/@219abdzn"
    ]
}

// Blog + ItemList of BlogPosting（列出所有文章）
const blogSchema = computed(() => {
    const list = seoArticles.value
    return {
        "@type": "Blog",
        "@id": `${artsUrl}#blog`,
        "name": "Gencko 守宮文章知識庫",
        "description": "豹紋守宮與肥尾守宮完整知識庫：新手必看、環境佈置、健康照護、行為互動、餵食與營養。",
        "url": artsUrl,
        "inLanguage": "zh-TW",
        "publisher": artsPublisher,
        "blogPost": list.map((a) => ({
            "@type": "BlogPosting",
            "@id": `https://www.genckobreeding.com/articles/${a.ID}#article`,
            "headline": a.Title,
            "url": `https://www.genckobreeding.com/articles/${a.ID}`,
            "image": a.ImageURL ? getCleanUrl(a.ImageURL) : artsImg,
            "datePublished": a.PublishDate || '',
            "dateModified": a.PublishDate || '',
            "articleSection": a.Category || '',
            "description": a.Summary || '',
            "author": {
                "@type": a.Author && a.Author !== 'Gencko Studio' ? "Person" : "Organization",
                "name": a.Author || "Gencko Breeding Studio"
            },
            "publisher": artsPublisher
        }))
    }
})

const itemListSchema = computed(() => {
    const list = seoArticles.value
    return {
        "@type": "ItemList",
        "@id": `${artsUrl}#list`,
        "name": "Gencko 守宮飼養知識文章列表",
        "numberOfItems": list.length,
        "itemListElement": list.map((a, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "url": `https://www.genckobreeding.com/articles/${a.ID}`,
            "name": a.Title
        }))
    }
})

const artsBreadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://www.genckobreeding.com/" },
        { "@type": "ListItem", "position": 2, "name": "飼養知識專欄", "item": artsUrl }
    ]
}

const artsWebPageLd = computed(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": artsUrl,
    "url": artsUrl,
    "name": "守宮飼養知識文章列表｜Gencko 知識庫",
    "inLanguage": "zh-TW",
    "isPartOf": { "@type": "WebSite", "@id": "https://www.genckobreeding.com/#website" },
    "primaryImageOfPage": { "@type": "ImageObject", "url": artsImg },
    "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".page-title", ".search-input"]
    },
    "publisher": artsPublisher,
    "about": [
        { "@type": "Taxon", "name": "Eublepharis macularius", "alternateName": "豹紋守宮", "sameAs": "https://www.wikidata.org/wiki/Q185061" },
        { "@type": "Taxon", "name": "Hemitheconyx caudicinctus", "alternateName": "肥尾守宮", "sameAs": "https://www.wikidata.org/wiki/Q913571" }
    ],
    "mainEntity": blogSchema.value,
    "hasPart": [itemListSchema.value]
}))

useHead({
    title: '守宮文章知識庫｜新手必看、健康、環境、餵食完整指南',
    meta: [
        { name: 'description', content: '豹紋守宮與肥尾守宮完整知識庫：新手必看、環境佈置、健康照護、行為互動、餵食與營養指南。Gencko Breeding Studio 飼養教學文章一站收錄。' },
        { name: 'keywords', content: '豹紋守宮飼養, 肥尾守宮飼養, 守宮新手, 守宮文章, 守宮知識庫, 守宮健康, 守宮環境' },
        // Open Graph
        { property: 'og:title', content: '守宮文章知識庫｜新手必看、健康、環境、餵食完整指南' },
        { property: 'og:description', content: '豹紋守宮與肥尾守宮完整知識庫：新手必看、環境佈置、健康照護、行為互動、餵食與營養。' },
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
    link: [{ rel: 'canonical', href: artsUrl }],
    script: computed(() => [
        { type: 'application/ld+json', children: JSON.stringify(artsWebPageLd.value) },
        { type: 'application/ld+json', children: JSON.stringify(artsBreadcrumbLd) }
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
        <!-- SEO：頁面唯一 h1 為 sr-only 含關鍵字版本（mobile+desktop 一致）；視覺主標保留為 div 不影響爬蟲 H1 階層 -->
        <h1 class="sr-only">守宮文章知識庫｜新手必看、健康、環境、餵食完整指南</h1>
        <div class="page-title dt-only" aria-hidden="true">文章知識庫</div>

        <div class="search-bar-wrap">
            <span class="search-icon">🔎</span>
            <input
                v-model="searchQuery"
                type="text"
                placeholder="搜尋關鍵字、症狀、主題..."
                class="search-input"
            />
            <button
                v-if="searchQuery"
                class="btn-app btn-app--ghost btn-app--xs btn-app--pill clear-btn"
                aria-label="清除搜尋"
                @click="searchQuery = ''"
            >
                清除
            </button>
        </div>

        <div class="category-nav-row">
            <div
                v-for="cat in fixedCats"
                :key="cat.value"
                class="nav-chip"
                :class="{ active: artCat === cat.value, beginner: cat.value === 'Beginner' }"
                role="button"
                tabindex="0"
                @click="setCategory(cat.value)"
                @keydown.enter.space.prevent="setCategory(cat.value)"
            >
                {{ cat.label }}
            </div>
        </div>

        <div v-if="popularTags.length > 0" class="quick-tags">
            <span class="tag-label">熱門主題</span>
            <div class="tags-scroll">
                <span
                    v-for="t in popularTags"
                    :key="t"
                    class="q-tag"
                    :class="{ active: searchQuery === t }"
                    @click="toggleQuickTag(t)"
                >
                    {{ t }}
                </span>
            </div>
        </div>

        <div v-if="searchQuery || artCat !== 'All'" class="main-list-head">
            <h2 class="list-title">
                {{ searchQuery ? `搜尋：${searchQuery}` : fixedCats.find((c) => c.value === artCat)?.label }}
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
                    class="btn-app btn-app--primary btn-app--sm btn-app--pill"
                    style="margin-top:12px;"
                    @click="searchQuery = ''; artCat = 'All'"
                >
                    清除篩選
                </button>
            </div>

            <div
                v-for="[cat, items] in groupedFilteredArticles"
                v-else
                :key="cat"
                class="article-group"
            >
                <div class="article-group-cat">{{ cat }}</div>
                <div class="grid article-group-grid">
                    <NuxtLink
                        v-for="item in items"
                        :key="item.ID"
                        class="card article-card"
                        :to="`/articles/${item.ID}`"
                        style="text-decoration:none; color:inherit; display:flex; flex-direction:column;"
                    >
                        <div class="article-thumb-wrap">
                            <img
                                v-if="item.ImageURL"
                                :src="getCleanUrl(item.ImageURL, 600)"
                                :alt="item.Title"
                                class="card-img"
                                style="height:180px;"
                                loading="lazy"
                            />
                            <div
                                v-else
                                class="card-img article-thumb-fallback"
                                style="height:180px;"
                            >
                                📝
                            </div>
                            <div class="art-cat-tag">{{ item.Category }}</div>
                        </div>
                        <div class="card-body" style="flex:1;">
                            <time :datetime="item.PublishDate" class="date-text">{{ fmtDate(item.PublishDate) }}</time>
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
    padding-bottom: 30px;
}

.dt-only { display: block; }

.search-bar-wrap {
    margin-bottom: 15px;
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
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 12px;
    color: var(--txt);
    font-size: 1rem;
    font-weight: 700;
    outline: none;
    padding: 14px 45px;
    transition: 0.3s;
    width: 100%;
}

.search-input:focus {
    border-color: var(--pri);
    box-shadow: 0 0 10px var(--pri-glow);
}

.clear-btn {
    height: auto;
    min-height: 30px;
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
    margin-bottom: 15px;
    overflow-x: auto;
    padding-bottom: 5px;
    scrollbar-width: none;
}

.category-nav-row::-webkit-scrollbar { display: none; }

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
    opacity: 0.7;
    padding: 10px 12px;
    text-align: center;
    transition: 0.2s;
    white-space: nowrap;
}

.nav-chip.active {
    background: var(--pri);
    border-color: var(--pri);
    box-shadow: 0 4px 10px var(--pri-glow);
    color: #fff;
    opacity: 1;
}

.nav-chip.beginner {
    border-color: #4caf50;
    color: #4caf50;
}

.nav-chip.beginner.active {
    background: #4caf50;
    border-color: #4caf50;
    color: #fff;
}

.quick-tags {
    align-items: center;
    background: rgba(128, 128, 128, 0.05);
    border-radius: 8px;
    display: flex;
    margin-bottom: 25px;
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

.tags-scroll::-webkit-scrollbar { display: none; }

.q-tag {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 12px;
    color: var(--txt);
    cursor: pointer;
    font-size: 0.8rem;
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
    margin-bottom: 12px;
}

.article-group:last-child {
    margin-bottom: 0;
}

.article-group-cat {
    background: rgba(255, 69, 0, 0.08);
    border-radius: 5px;
    color: var(--pri);
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 1px;
    margin-bottom: 6px;
    padding: 3px 9px;
}

.article-group-grid {
    gap: 12px;
}

.article-thumb-wrap {
    overflow: hidden;
    position: relative;
}

.article-thumb-fallback {
    align-items: center;
    background: #1a1a1a;
    display: flex;
    font-size: 3rem;
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

@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .articles-page-wrapper { padding: 5px 10px; }
    .nav-chip {
        border-radius: 6px;
        font-size: 0.75rem;
        padding: 8px 10px;
    }
    .grid.article-group-grid {
        gap: 8px !important;
        grid-template-columns: repeat(2, 1fr) !important;
    }
    .card-img { height: 120px !important; }
    .morph-title {
        font-size: 0.9rem !important;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}
</style>
