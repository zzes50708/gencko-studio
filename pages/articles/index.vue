<script setup>
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const artCat = ref('All')
const searchQuery = ref('')

// 1. 固定分類清單 (包含虛擬的新手必看)
const fixedCats = [
    { label: '全部文章', value: 'All' },
    { label: '新手必看', value: 'Beginner' },
    { label: '行為與互動', value: '行為與互動' },
    { label: '健康照護', value: '健康照護' },
    { label: '環境佈置', value: '環境佈置' },
    { label: '餵食與營養', value: '餵食與營養' }
]

// 2. 切換分類並清空搜尋欄
const setCategory = (catValue) => {
    artCat.value = catValue
    searchQuery.value = '' // 🌟 點選分類時清空搜尋欄
}

// 3. 自動分析最高頻率的熱門標籤 (供搜尋欄下方使用)
const popularTags = computed(() => {
    if (!store.articlesList.length) return []
    const counts = {}
    store.articlesList.forEach(a => {
        const kws = (a.Keywords || '').split(',').map(k => k.trim()).filter(k => k)
        kws.forEach(k => {
            // 排除「新手」相關標籤（已有獨立分類）
            if (k && !k.includes('新手')) {
                counts[k] = (counts[k] || 0) + 1
            }
        })
    })
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(item => item[0])
})

// 4. 極致寬鬆搜尋與分類邏輯
const filteredArticles = computed(() => {
    if (!store.articlesList || store.articlesList.length === 0) return []
    let list = store.articlesList

    // 🌟 分類篩選邏輯
    if (artCat.value === 'Beginner') {
        // 新手必看：keywords 含「新手」OR category 為「新手必看」（雙重支援，兼容不同後台設定方式）
        list = list.filter(i =>
            (i.Keywords || '').toLowerCase().includes('新手') ||
            (i.Category || '') === '新手必看'
        )
    } else if (artCat.value !== 'All') {
        // 一般分類：比對 Category 欄位
        list = list.filter(i => i.Category === artCat.value)
    }

    // 🌟 搜尋過濾邏輯（Title + Summary + Keywords 三欄全文搜尋）
    if (searchQuery.value) {
        const terms = searchQuery.value.toLowerCase().split(/\s+/).filter(t => t)
        list = list.filter(i => {
            const t = (i.Title || '').toLowerCase()
            const s = (i.Summary || '').toLowerCase()
            const k = (i.Keywords || '').toLowerCase()
            return terms.every(term => t.includes(term) || s.includes(term) || k.includes(term))
        })
    }

    return list
})

const toggleQuickTag = (tag) => {
    if (searchQuery.value === tag) {
        searchQuery.value = ''
    } else {
        searchQuery.value = tag
        artCat.value = 'All' // 點擊標籤時回到全部分類
    }
}

const blogSchema = computed(() => ({
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "豹紋守宮飼養知識專欄",
    "description": "豹紋守宮完整知識庫：飼養教學、健康照護、基因科普、環境佈置。由 Gencko Studio 專業繁育工作室整理。",
    "url": "https://www.genckobreeding.com/articles",
    "publisher": {
        "@type": "Organization",
        "name": "Gencko Studio",
        "url": "https://www.genckobreeding.com"
    },
    "blogPost": store.articlesList.slice(0, 10).map(a => ({
        "@type": "BlogPosting",
        "headline": a.Title,
        "url": `https://www.genckobreeding.com/articles/${a.ID}`,
        "datePublished": a.PublishDate || '',
        "description": a.Summary || ''
    }))
}))

useHead({
    title: '豹紋守宮飼養知識專欄',
    meta: [
        { name: 'description', content: '豹紋守宮（Eublepharis macularius）完整知識庫：飼養教學、健康照護、基因科普、環境佈置與新手必看指南。由 Gencko Studio 專業繁育工作室整理。' },
        { property: 'og:title', content: '豹紋守宮飼養知識專欄 | Gencko Studio' },
        { property: 'og:description', content: '新手入門、健康照護、基因科普、環境佈置，守宮飼養必讀文章全收錄。' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/articles' }
    ],
    link: [
        { rel: 'canonical', href: 'https://www.genckobreeding.com/articles' }
    ],
    script: computed(() => [{ type: 'application/ld+json', children: JSON.stringify(blogSchema.value) }])
})

const fmtDate = (d) => {
    try { return new Date(d).toISOString().split('T')[0] } catch(e) { return '' }
}
</script>

<template>
    <div class="articles-page-wrapper">
        <h1 class="page-title dt-only">專欄文章</h1>
        
        <!-- 🌟 第一層：搜尋欄 -->
        <div class="search-bar-wrap">
            <span class="search-icon">🔍</span>
            <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="搜尋標題或隱藏關鍵字..." 
                class="search-input" 
            />
            <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">✕</button>
        </div>

        <!-- 🌟 第二層：固定六大分類 (固定一行) -->
        <div class="category-nav-row">
            <div 
                v-for="cat in fixedCats" 
                :key="cat.value"
                class="nav-chip"
                :class="{ active: artCat === cat.value, beginner: cat.value === 'Beginner' }"
                @click="setCategory(cat.value)"
            >
                {{ cat.label }}
            </div>
        </div>

        <!-- 🌟 第三層：熱門搜尋 -->
        <div class="quick-tags" v-if="popularTags.length > 0">
            <span class="tag-label">猜你想找：</span>
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

        <!-- 文章列表標題 -->
        <div class="main-list-head" v-if="searchQuery || artCat !== 'All'">
            <h2 class="list-title">
                {{ searchQuery ? `搜尋：${searchQuery}` : (artCat === 'All' ? '全部文章' : fixedCats.find(c=>c.value===artCat)?.label) }}
            </h2>
        </div>

        <transition-group tag="div" name="list" class="grid">
            <div v-if="filteredArticles.length === 0" key="empty-msg" class="empty-state" style="grid-column: 1 / -1;">
                <div style="font-size:2rem; margin-bottom:8px;">📭</div>
                <div>找不到相關文章</div>
                <button v-if="searchQuery || artCat !== 'All'" @click="searchQuery = ''; artCat = 'All'" style="margin-top:12px; padding:8px 20px; background:var(--pri); color:#fff; border:none; border-radius:20px; cursor:pointer; font-size:0.85rem;">清除篩選</button>
            </div>

            <article class="card article-card" v-for="item in filteredArticles" :key="item.ID">
                <NuxtLink :to="`/articles/${item.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                    <div style="position:relative; overflow:hidden;">
                        <!-- 🌟 核心修正：將 NuxtImg 替換為原生 img，徹底繞過 Vercel 402 收費限制 -->
                        <img 
                            v-if="item.ImageURL" 
                            :src="getCleanUrl(item.ImageURL, 600)" 
                            :alt="item.Title" 
                            class="card-img" 
                            style="height:180px;" 
                            loading="lazy"
                        />
                        <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                        <div class="art-cat-tag">{{ item.Category }}</div>
                    </div>
                    <div class="card-body">
                        <time :datetime="item.PublishDate" class="date-text">{{ fmtDate(item.PublishDate) }}</time>
                        <h3 class="morph-title">{{ item.Title }}</h3>
                        <p class="art-summary">{{ item.Summary }}</p>
                    </div>
                </NuxtLink>
            </article>
        </transition-group>
    </div>
</template>

<style scoped>
.articles-page-wrapper {
    max-width: 1300px;
    margin: 0 auto;
    padding-bottom: 30px;
}
.dt-only { display: block; }

/* 🌟 Search Bar */
.search-bar-wrap {
    position: relative;
    margin-bottom: 15px;
    width: 100%;
}
.search-icon {
    position: absolute;
    left: 15px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.1rem;
    color: var(--txt);
    opacity: 0.5;
}
.search-input {
    width: 100%;
    padding: 14px 45px;
    background: var(--card-bg);
    border: 1px solid var(--bd);
    color: var(--txt);
    border-radius: 12px;
    font-size: 1rem;
    font-weight: bold;
    outline: none;
    transition: 0.3s;
}
.search-input:focus {
    border-color: var(--pri);
    box-shadow: 0 0 10px var(--pri-glow);
}
.clear-btn {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(128,128,128,0.2);
    border: none;
    color: var(--txt);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
}

/* 🌟 固定一行分類導覽 */
.category-nav-row {
    display: flex;
    gap: 8px;
    margin-bottom: 15px;
    padding-bottom: 5px;
    overflow-x: auto;
    scrollbar-width: none;
    flex-wrap: nowrap;
}
.category-nav-row::-webkit-scrollbar { display: none; }

.nav-chip {
    flex: 1;
    min-width: max-content;
    padding: 10px 12px;
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 8px;
    color: var(--txt);
    opacity: 0.7;
    font-weight: bold;
    font-size: 0.9rem;
    text-align: center;
    cursor: pointer;
    transition: 0.2s;
    white-space: nowrap;
}
.nav-chip.active {
    background: var(--pri);
    color: #fff;
    border-color: var(--pri);
    opacity: 1;
    box-shadow: 0 4px 10px var(--pri-glow);
}
.nav-chip.beginner {
    border-color: #4caf50;
    color: #4caf50;
}
.nav-chip.beginner.active {
    background: #4caf50;
    color: #fff;
    border-color: #4caf50;
}

/* 🌟 Quick Tags */
.quick-tags {
    display: flex;
    align-items: center;
    margin-bottom: 25px;
    background: rgba(128,128,128,0.05);
    padding: 8px 12px;
    border-radius: 8px;
}
.tag-label { font-size: 0.8rem; font-weight: bold; opacity: 0.5; margin-right: 8px; white-space: nowrap; }
.tags-scroll { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
.tags-scroll::-webkit-scrollbar { display: none; }
.q-tag {
    padding: 4px 10px;
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 12px;
    font-size: 0.8rem;
    color: var(--txt);
    cursor: pointer;
    white-space: nowrap;
}
.q-tag.active { border-color: var(--pri); color: var(--pri); }

/* 文章列表與卡片 */
.list-title {
    font-size: 1.2rem;
    color: var(--txt);
    border-left: 4px solid var(--pri);
    padding-left: 10px;
    margin-bottom: 15px;
}
.empty-state {
    text-align: center;
    padding: 50px;
    color: var(--txt);
    opacity: 0.5;
    background: var(--card-bg);
    border-radius: 12px;
}
.date-text { font-size: 0.8rem; opacity: 0.5; margin-bottom: 5px; display: block; }
.morph-title { font-size: 1.1rem; margin-bottom: 5px; color: var(--txt); }
.art-summary { font-size: 0.85rem; opacity: 0.7; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .articles-page-wrapper { padding: 5px 10px; }
    .nav-chip {
        padding: 8px 10px;
        font-size: 0.75rem;
        border-radius: 6px;
    }
    .grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
    .card-img { height: 120px !important; }
    .morph-title { font-size: 0.9rem !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
}
</style>