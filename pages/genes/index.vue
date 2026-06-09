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

const allGeneNames = computed(() => {
    const names = []
    for (const species of Object.values(GENES_DB)) {
        for (const list of Object.values(species)) {
            names.push(...list)
        }
    }
    return [...new Set(names)]
})

const collectionSchema = computed(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "守宮基因圖鑑",
    "description": "收錄完整豹紋守宮與肥尾守宮基因資料庫，提供基因簡介、選育特徵與遺傳法則說明。",
    "url": "https://www.genckobreeding.com/genes",
    "about": {
        "@type": "Taxon",
        "name": "Eublepharis macularius",
        "alternateName": "豹紋守宮"
    },
    "hasPart": allGeneNames.value.map(name => ({
        "@type": "DefinedTerm",
        "name": name,
        "url": `https://www.genckobreeding.com/genes/${encodeURIComponent(name)}`
    }))
}))

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
    ],
    script: computed(() => [{ type: 'application/ld+json', children: JSON.stringify(collectionSchema.value) }])
})
</script>

<template>
    <div class="genes-page-wrapper">
        <!-- 桌機版顯示標題，手機版隱藏以節省空間 -->
        <h1 class="page-title dt-only">守宮基因圖鑑</h1>
        
        <!-- 🌟 App-like 分段切換器 -->
        <div class="segmented-control">
            <button type="button" class="segment" :class="{active: geneSpecies === '豹紋守宮'}" @click="geneSpecies = '豹紋守宮'">豹紋守宮</button>
            <button type="button" class="segment" :class="{active: geneSpecies === '肥尾守宮'}" @click="geneSpecies = '肥尾守宮'">肥尾守宮</button>
        </div>

        <div class="genes-content">
            <div v-for="(list, cat) in GENES_DB[geneSpecies]" :key="cat" class="gene-section">
                <div class="section-header">
                    <h2 class="gene-cat-title">
                        <span class="cat-badge" :class="`cat-${cat}`">{{ cat }}</span>
                    </h2>
                </div>

                <div class="gene-btn-grid">
                    <NuxtLink v-for="g in list" :key="g" :to="`/genes/${encodeURIComponent(g)}`" class="gene-btn-item">
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
.cat-badge {
    display: inline-block;
    padding: 3px 12px;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 700;
    background: rgba(232,68,10,0.15);
    color: var(--pri-light);
    border: 1px solid rgba(232,68,10,0.3);
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
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 12px;
    padding: 12px 10px;
    text-align: center;
    cursor: pointer;
    transition: 0.3s;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
    color: var(--txt);
    font-weight: bold;
    font-size: 0.92rem;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    text-decoration: none;
    min-width: 0;
}

.gene-btn-item:hover {
    border-color: var(--pri);
    transform: translateY(-3px);
    box-shadow: 0 6px 15px rgba(255,69,0,0.2);
}

.g-name {
    width: 100%;
    white-space: nowrap;
    overflow: visible;
    text-align: center;
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
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
    }

    .gene-btn-item {
        padding: 10px 4px;
        border-radius: 8px;
        min-height: 48px;
        gap: 2px;
        font-size: 0.78rem;
    }
    .g-cta { display: none; }

    .g-name {
        white-space: nowrap !important;
        overflow: visible !important;
        font-size: 0.78rem;
        line-height: 1.2;
        letter-spacing: -0.5px;
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

/* 🌟 更小手機螢幕適配（如 iPhone SE / 360px 以下） */
@media (max-width: 400px) {
    .gene-btn-grid {
        gap: 5px;
    }

    .gene-btn-item {
        padding: 8px 3px;
        font-size: 0.7rem;
    }

    .g-name {
        font-size: 0.7rem;
        letter-spacing: -0.5px;
    }
}

/* 🌟 極小螢幕（iPhone SE 320px） */
@media (max-width: 340px) {
    .gene-btn-grid {
        gap: 4px;
    }

    .gene-btn-item {
        padding: 7px 2px;
        font-size: 0.62rem;
    }

    .g-name {
        font-size: 0.62rem;
        letter-spacing: -0.6px;
    }
}
</style>