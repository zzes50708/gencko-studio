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
        
        <!-- 🌟 App-like 分段切換器 -->
        <div class="segmented-control">
            <div class="segment" :class="{active: geneSpecies === '豹紋守宮'}" @click="geneSpecies = '豹紋守宮'">豹紋守宮</div>
            <div class="segment" :class="{active: geneSpecies === '肥尾守宮'}" @click="geneSpecies = '肥尾守宮'">肥尾守宮</div>
        </div>

        <div class="genes-content">
            <div v-for="(list, cat) in GENES_DB[geneSpecies]" :key="cat" class="gene-section">
                <!-- 🌟 移除吸頂設定，恢復自然排版 -->
                <div class="section-header">
                    <h2 class="gene-cat-title">{{ cat }}</h2>
                </div>
                
                <div class="gene-btn-grid">
                    <NuxtLink v-for="g in list" :key="g" :to="`/genes/${encodeURIComponent(g)}`" class="gene-btn-item">
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
}

.segment.active {
    background: var(--pri);
    color: #fff;
    opacity: 1;
    box-shadow: 0 4px 10px rgba(255, 69, 0, 0.4);
}

/* 🌟 移除 sticky 定位，改回普通區塊 */
.section-header {
    background: var(--card-bg);
    padding: 10px 15px;
    margin-bottom: 15px;
    border-bottom: 1px solid var(--bd);
    border-radius: 8px;
}

.gene-cat-title {
    font-size: 1.2rem;
    color: var(--txt);
    margin: 0;
    font-weight: 900;
    letter-spacing: 1px;
}

.gene-section {
    margin-bottom: 30px;
}

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
    color: var(--txt);
    font-weight: bold;
    font-size: 1rem;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    text-decoration: none;
}

.gene-btn-item:hover {
    border-color: var(--pri);
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(255,69,0,0.2);
}

.g-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.g-arrow {
    color: var(--txt);
    opacity: 0.3;
    font-size: 0.9rem;
    transition: transform 0.2s, opacity 0.2s, color 0.2s;
    margin-left: 8px;
    flex-shrink: 0;
}

.gene-btn-item:hover .g-arrow {
    transform: translateX(3px);
    opacity: 1;
    color: var(--pri);
}

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    
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
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .gene-btn-item {
        padding: 10px 12px;
        border-radius: 10px;
        min-height: 54px;
        align-items: center; 
    }
    
    .g-name {
        white-space: normal !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        font-size: 0.9rem;
        line-height: 1.3;
    }

    .g-arrow {
        display: block !important;
        font-size: 0.85rem;
    }
    
    .section-header {
        padding: 8px 12px;
        margin-bottom: 8px; /* 縮減與下方基因卡片的間距 */
    }
    
    .gene-cat-title {
        font-size: 1.05rem;
    }
    
    .gene-section {
        margin-bottom: 15px;
    }
}
</style>