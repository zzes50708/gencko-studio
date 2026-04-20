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
    <div>
        <h1 class="page-title">守宮基因圖鑑</h1>
        <div class="tabs">
            <div class="tab" :class="{active: geneSpecies === '豹紋守宮'}" @click="geneSpecies = '豹紋守宮'">豹紋守宮</div>
            <div class="tab" :class="{active: geneSpecies === '肥尾守宮'}" @click="geneSpecies = '肥尾守宮'">肥尾守宮</div>
        </div>
        <div v-for="(list, cat) in GENES_DB[geneSpecies]" :key="cat" class="gene-section">
            <h2 class="gene-cat-title">{{ cat }}</h2>
            <div class="gene-btn-grid">
                <NuxtLink v-for="g in list" :key="g" :to="`/genes/${encodeURIComponent(g)}`" class="gene-btn-item" style="text-decoration:none;">
                    {{ g }} <span>➜</span>
                </NuxtLink>
            </div>
        </div>
    </div>
</template>