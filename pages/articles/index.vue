<script setup>
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const artCat = ref('All')

// 文章分類選項
const articleCats = computed(() => {
    if (!store.articlesList.length) return[]
    return[...new Set(store.articlesList.map(i => i.Category).filter(c => c))]
})

// 篩選後的文章列表
const filteredArticles = computed(() => {
    if (!store.articlesList || store.articlesList.length === 0) return[]
    let list = store.articlesList
    if (artCat.value !== 'All') {
        list = list.filter(i => i.Category === artCat.value)
    }
    return list
})

useHead({
    title: '專欄文章',
    meta:[
        { name: 'description', content: 'Gencko Studio 文章專欄，提供豹紋守宮、肥尾守宮飼養教學、基因解析、疾病預防與市場趨勢分析。' },
        { property: 'og:title', content: '專欄文章 | Gencko Studio' },
        { property: 'og:description', content: 'Gencko Studio 文章專欄，提供豹紋守宮、肥尾守宮飼養教學、基因解析、疾病預防與市場趨勢分析。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/articles' }
    ]
})

const fmtDate = (d) => {
    try { return new Date(d).toISOString().split('T')[0] } catch(e) { return '' }
}
</script>

<template>
    <div class="articles-page-wrapper">
        <!-- 🌟 桌機版顯示標題，手機版隱藏 -->
        <h1 class="page-title dt-only">專欄文章</h1>
        
        <!-- 🌟 App-like 分類選單 -->
        <div class="filter-row">
            <label class="filter-label">分類篩選</label>
            <div class="select-wrapper">
                <select v-model="artCat" class="filter-select">
                    <option value="All">全部文章</option>
                    <option v-for="c in articleCats" :key="c" :value="c">{{ c }}</option>
                </select>
                <span class="select-icon">▼</span>
            </div>
        </div>

        <div v-if="filteredArticles.length === 0" class="empty-state">
            此分類尚無文章 (或正在載入中...)
        </div>

        <transition-group tag="div" name="list" class="grid" v-else>
            <article class="card article-card" v-for="item in filteredArticles" :key="item.ID">
                <NuxtLink :to="`/articles/${item.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                    <div style="position:relative; overflow:hidden;">
                        <!-- 使用 NuxtImg 進行圖片最佳化 -->
                        <NuxtImg 
                            v-if="item.ImageURL" 
                            :src="getCleanUrl(item.ImageURL)" 
                            :alt="item.Title" 
                            class="card-img" 
                            style="height:180px;" 
                            loading="lazy"
                            width="400"
                            height="180"
                            fit="cover"
                            format="webp"
                        />
                        <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                        <div class="art-cat-tag">{{ item.Category }}</div>
                    </div>
                    <div class="card-body">
                        <time :datetime="item.PublishDate" class="date-text">{{ fmtDate(item.PublishDate) }}</time>
                        <h2 class="morph-title">{{ item.Title }}</h2>
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
}

.dt-only { display: block; }

/* 🌟 App-like 分類選單 */
.filter-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    background: rgba(255, 255, 255, 0.03);
    padding: 10px 15px;
    border-radius: 12px;
    border: 1px solid var(--bd);
}

.filter-label {
    color: #888;
    font-weight: bold;
    font-size: 0.95rem;
    white-space: nowrap;
}

.select-wrapper {
    position: relative;
    flex: 1;
    max-width: 200px;
}

.filter-select {
    width: 100%;
    background: #111;
    color: #fff;
    padding: 8px 30px 8px 12px;
    border: 1px solid #333;
    border-radius: 8px;
    font-size: 0.95rem;
    font-weight: bold;
    appearance: none;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
}

.filter-select:focus {
    border-color: var(--pri);
}

.select-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.7rem;
    color: #888;
    pointer-events: none;
}

.empty-state {
    text-align: center;
    padding: 50px;
    color: #666;
    font-size: 1.1rem;
    background: var(--card-bg);
    border: 1px dashed var(--bd);
    border-radius: 12px;
}

.date-text {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 8px;
    display: block;
}

.morph-title {
    font-size: 1.15rem;
    margin: 0 0 8px 0;
    line-height: 1.3;
}

.art-summary {
    margin: 0;
    color: #aaa;
    font-size: 0.9rem;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* Day Mode Overrides */
:global(body.day-mode) .filter-row { background: #f9f9f9; border-color: #eee; }
:global(body.day-mode) .filter-select { background: #fff; color: #333; border-color: #ccc; }
:global(body.day-mode) .filter-label { color: #555; }
:global(body.day-mode) .empty-state { background: #f9f9f9; border-color: #ccc; color: #666; }

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    
    .articles-page-wrapper {
        padding: 5px 10px 15px 10px; /* 壓縮頂部與兩側留白 */
    }
    
    .filter-row {
        margin-bottom: 12px;
        padding: 8px 12px;
    }
    
    .select-wrapper {
        max-width: 100%;
    }
    
    .filter-select {
        padding: 8px 30px 8px 12px;
        font-size: 0.95rem;
    }

    /* 🌟 強制雙欄排版與縮小內容 */
    .grid {
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
    }

    .card-img {
        height: 120px !important; /* 縮減圖片高度，避免卡片過長 */
    }

    .card-body {
        padding: 8px !important; /* 縮減內距 */
    }

    .date-text {
        font-size: 0.7rem !important;
        margin-bottom: 4px !important;
    }

    .morph-title {
        font-size: 0.95rem !important;
        margin-bottom: 4px !important;
        line-height: 1.2 !important;
        white-space: nowrap; /* 強制單行避免撐破 */
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .art-summary {
        font-size: 0.8rem !important;
        line-height: 1.4 !important;
        -webkit-line-clamp: 2 !important; /* 確保簡介最多兩行 */
    }
    
    .art-cat-tag {
        font-size: 0.65rem !important;
        padding: 2px 6px !important;
        top: 6px !important;
        left: 6px !important;
    }
}
</style>