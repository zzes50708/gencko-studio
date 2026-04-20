<script setup>
import { computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { GENES_DB } from '~/utils/genes-db.js'

const store = useMainStore()

// 綁定全域的物種選擇狀態，讓使用者切換頁面回來時能記住最後選擇的物種
const geneSpecies = computed({
    get: () => store.geneSpecies || '豹紋守宮',
    set: (val) => { store.geneSpecies = val }
})

useHead({
    title: '守宮基因圖鑑',
    meta:[
        { name: 'description', content: '收錄完整豹紋守宮與肥尾守宮基因資料庫。提供基因簡介、選育特徵與遺傳法則說明，是玩家必備的查詢工具。' },
        { property: 'og:title', content: '守宮基因圖鑑 | Gencko Studio' },
        { property: 'og:description', content: '收錄完整豹紋守宮與肥尾守宮基因資料庫。提供基因簡介、選育特徵與遺傳法則說明，是玩家必備的查詢工具。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/genes' },
        { property: 'og:type', content: 'website' }
    ],
    link:[
        { rel: 'canonical', href: 'https://www.genckobreeding.com/genes' }
    ]
})
</script>

<template>
    <div class="genes-page-wrapper">
        <!-- 桌機版顯示標題，手機版隱藏以節省空間 -->
        <h1 class="page-title dt-only">守宮基因圖鑑</h1>
        
        <!-- 🌟 App-like 分段切換器 (Segmented Control) -->
        <div class="segmented-control">
            <div class="segment" :class="{active: geneSpecies === '豹紋守宮'}" @click="geneSpecies = '豹紋守宮'">豹紋守宮</div>
            <div class="segment" :class="{active: geneSpecies === '肥尾守宮'}" @click="geneSpecies = '肥尾守宮'">肥尾守宮</div>
        </div>

        <div class="genes-content">
            <div v-for="(list, cat) in GENES_DB[geneSpecies]" :key="cat" class="gene-section">
                <!-- 🌟 加入吸頂效果的分類標題 -->
                <div class="section-header-sticky">
                    <h2 class="gene-cat-title">{{ cat }}</h2>
                </div>
                
                <div class="gene-btn-grid">
                    <NuxtLink v-for="g in list" :key="g" :to="`/genes/${encodeURIComponent(g)}`" class="gene-btn-item" style="text-decoration:none;">
                        <span class="g-name">{{ g }}</span> 
                        <span class="g-arrow">➜</span>
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

.dt-only { display: block; }

/* 🌟 App-like 分段切換器 */
.segmented-control {
    display: flex;
    background: rgba(255, 255, 255, 0.05);
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
    color: #888;
    cursor: pointer;
    transition: all 0.3s ease;
}

.segment.active {
    background: var(--pri);
    color: #fff;
    box-shadow: 0 4px 10px rgba(255, 69, 0, 0.4);
}

/* 🌟 吸頂分類標題 */
.section-header-sticky {
    position: sticky;
    /* 桌導覽列高度大約是 Top(40) + Nav(50) = 90px，加上安全區 */
    top: calc(90px + env(safe-area-inset-top, 0px));
    background: rgba(8, 8, 8, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 10;
    padding: 10px 0;
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
}

.gene-cat-title {
    font-size: 1.2rem;
    color: var(--pri);
    margin: 0;
    font-weight: 700;
    letter-spacing: 1px;
}

.gene-section {
    margin-bottom: 30px;
}

/* 🌟 圓角基因按鈕 */
.gene-btn-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
}

.gene-btn-item {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 12px;
    padding: 15px;
    text-align: left;
    cursor: pointer;
    transition: 0.3s;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #eee;
    font-weight: bold;
    font-size: 1rem;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
}

.gene-btn-item:hover {
    border-color: var(--pri);
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(255,69,0,0.3);
    background: rgba(255,255,255,0.05);
}

.g-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.g-arrow {
    color: var(--pri);
    font-size: 0.9rem;
    opacity: 0.8;
    transition: transform 0.2s;
}

.gene-btn-item:hover .g-arrow {
    transform: translateX(3px);
    opacity: 1;
}

/* Day Mode Overrides */
:global(body.day-mode) .segmented-control { background: #eee; border-color: #ddd; }
:global(body.day-mode) .segment { color: #666; }
:global(body.day-mode) .segment.active { background: var(--pri); color: #fff; }
:global(body.day-mode) .section-header-sticky { background: rgba(255,255,255,0.95); border-bottom-color: #eee; }
:global(body.day-mode) .gene-btn-item { background: #fff; border-color: #ddd; color: #333; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
:global(body.day-mode) .gene-btn-item:hover { background: #f9f9f9; border-color: var(--pri); }

/* Mobile Optimizations */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .genes-page-wrapper { padding-top: 0; }
    
    .segmented-control { margin-bottom: 15px; }
    .segment { padding: 10px 0; font-size: 0.95rem; }
    
    .gene-btn-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
    }

    .gene-btn-item {
        padding: 12px 15px;
        font-size: 0.95rem;
        border-radius: 12px;
        justify-content: space-between;
        text-align: left;
    }
    
    .g-name { white-space: normal; }

    /* 確保手機版箭頭強制顯示，不受之前全域 CSS 的隱藏影響 */
    .g-arrow { display: block !important; }
    
    .section-header-sticky {
        padding: 8px 5px;
        margin-bottom: 10px;
    }
    .gene-cat-title { font-size: 1.1rem; }
}
</style>