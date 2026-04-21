<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const supabase = useSupabaseClient()

// 從路由參數取得要顯示的基因名稱，並進行解碼
const geneName = decodeURIComponent(route.params.id)

// [SEO] 為了在 SSR 期間取得資料，我們使用 useAsyncData。
// 若 Store 中已經存在該筆資料，則直接拿來用；否則向資料庫查詢。
const { data: viewingGene, pending } = await useAsyncData(`gene-${geneName}`, async () => {
    if (store.genePages && store.genePages.length > 0) {
        const found = store.genePages.find(g => g.Name === geneName)
        if (found) return found
    }

    const { data, error } = await supabase
        .from('genetic_pages')
        .select('*')
        .eq('name', geneName)
        .single()

    if (error || !data) return null

    return {
        Name: data.name,
        ImageURL: data.image_url,
        Warning: data.warning,
        Brief: data.brief,
        Detail: data.detail,
        Source: data.source
    }
})

// 若是在客戶端且已取得資料，同步回 Store
if (viewingGene.value && import.meta.client) {
    store.viewingGene = viewingGene.value
}

// SEO 用的圖片網址處理
const getMetaImg = (url) => {
    if (!url) return 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    let target = url
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1200&output=webp&q=80`
}

const siteData = computed(() => {
    if (viewingGene.value) {
        const g = viewingGene.value
        const img = getMetaImg(g.ImageURL)
        const url = `https://www.genckobreeding.com/genes/${encodeURIComponent(g.Name)}`
        const desc = g.Brief || `Gencko Studio 收錄的 ${g.Name} 基因詳細介紹與特徵說明。`

        // Article Schema (視為百科條目)
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": `${g.Name} - 守宮基因圖鑑`,
            "image": [img],
            "author": {
                "@type": "Organization",
                "name": "Gencko Studio"
            },
            "description": desc
        }

        return {
            title: g.Name,
            desc: desc,
            img: img,
            url: url,
            type: 'article',
            script:[{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
        }
    }

    return {
        title: '找不到此基因',
        desc: '資料庫中找不到該基因條目',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
        url: `https://www.genckobreeding.com/genes/${encodeURIComponent(geneName)}`,
        type: 'website',
        script:[]
    }
})

useHead({
    title: computed(() => siteData.value.title),
    meta:[
        { name: 'description', content: computed(() => siteData.value.desc) },
        { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
        { property: 'og:description', content: computed(() => siteData.value.desc) },
        { property: 'og:image', content: computed(() => siteData.value.img) },
        { property: 'og:url', content: computed(() => siteData.value.url) },
        { property: 'og:type', content: computed(() => siteData.value.type) }
    ],
    link:[
        { rel: 'canonical', href: computed(() => siteData.value.url) }
    ],
    script: computed(() => siteData.value.script)
})

const goBack = () => {
    store.viewingGene = null
    router.push('/genes')
}
</script>

<template>
    <div class="gene-detail-wrapper">
        <div v-if="pending" style="text-align:center; padding:100px 0; color:var(--txt); opacity:0.6;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>基因資料載入中...</p>
        </div>

        <div v-else-if="!viewingGene" style="text-align:center; padding:100px 0; color:var(--txt); opacity:0.6;">
            <h2>找不到「{{ geneName }}」的資料</h2>
            <p>可能該基因條目尚未建立或已被移除。</p>
            <button @click="goBack" class="app-back-btn" style="margin: 20px auto; justify-content: center;">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><polyline points="15 18 9 12 15 6"></polyline></svg> 返回圖鑑列表
            </button>
        </div>

        <div v-else class="gene-container">
            <!-- 🌟 App-like 返回按鈕 -->
            <button class="app-back-btn" @click="goBack">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                返回圖鑑
            </button>

            <!-- 🌟 集中閱讀的卡片化設計 -->
            <div class="content-card">
                <h1 class="gene-title">{{ viewingGene.Name }}</h1>
                
                <div v-if="viewingGene.Warning" class="warn-box">
                    <span style="font-size: 1.2rem; margin-right: 5px;">⚠️</span>
                    {{ viewingGene.Warning }}
                </div>
                
                <div class="gene-layout">
                    <!-- 使用 NuxtImg 優化載入 -->
                    <NuxtImg 
                        v-if="viewingGene.ImageURL" 
                        :src="getCleanUrl(viewingGene.ImageURL)" 
                        :alt="viewingGene.Name + ' 基因特徵'" 
                        class="gene-img"
                        width="600"
                        height="600"
                        fit="cover"
                        format="webp"
                        loading="eager"
                    />
                    
                    <div class="gene-text-content">
                        <h3>📖 基因簡介</h3>
                        <p class="brief-txt">{{ viewingGene.Brief }}</p>
                        
                        <div v-if="viewingGene.Detail" class="detail-section">
                            <h3>🔍 詳細敘述</h3>
                            <p class="detail-txt">{{ viewingGene.Detail }}</p>
                        </div>
                        
                        <div v-if="viewingGene.Source" class="source-text">
                            資料來源：{{ viewingGene.Source }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.gene-detail-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding-top: 5px;
    padding-bottom: 20px;
}

/* 🌟 App-like 返回按鈕 (適配日夜變數) */
.app-back-btn {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    color: var(--txt);
    font-size: 1.1rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    margin-bottom: 10px;
    border-radius: 30px;
    transition: 0.2s;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.app-back-btn:active {
    transform: scale(0.95);
    background: var(--bd);
}

/* 🌟 卡片化內容 (適配日夜變數) */
.content-card {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.gene-title {
    font-size: 2.2rem;
    margin: 0 0 20px 0;
    color: var(--txt);
    line-height: 1.2;
    border-bottom: 1px solid var(--bd);
    padding-bottom: 15px;
}

.warn-box {
    background: rgba(244, 67, 54, 0.1);
    border: 1px solid #f44336;
    color: var(--txt);
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 25px;
    font-weight: bold;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    line-height: 1.5;
}

.gene-layout {
    display: flex;
    gap: 30px;
    align-items: flex-start;
}

.gene-img {
    width: 45%;
    border-radius: 12px;
    object-fit: cover;
    border: 1px solid var(--bd);
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.gene-text-content {
    flex: 1;
    min-width: 0; /* 🌟 解決手機版 Flex 容器被文字撐破的黑魔法 */
    width: 100%;
}

h3 {
    color: var(--pri);
    font-size: 1.25rem;
    margin: 0 0 10px 0;
}

/* 2. 找到 p 標籤，更新換行規則 */
p {
    color: var(--txt);
    opacity: 0.9;
    line-height: 1.7;
    font-size: 1.05rem;
    white-space: pre-wrap; /* 🌟 改用 pre-wrap，對手機瀏覽器相容性更好 */
    overflow-wrap: anywhere; /* 🌟 絕對強制截斷過長的連續英文字或網址 */
    word-wrap: break-word;
    word-break: normal;
    text-align: justify;
}

.detail-section {
    margin-top: 25px;
}

.source-text {
    margin-top: 30px;
    font-size: 0.85rem;
    color: var(--txt);
    opacity: 0.6;
    border-top: 1px dashed var(--bd);
    padding-top: 15px;
}

/* 🌟 Mobile Responsive */
@media (max-width: 768px) {
    .gene-detail-wrapper {
        padding-top: 0;
    }
    
    .app-back-btn {
        padding: 6px 12px;
        margin-bottom: 5px;
        font-size: 0.95rem;
    }
    
    .content-card {
        padding: 20px;
        border-radius: 12px;
    }
    
    .gene-title {
        font-size: 1.8rem;
        margin-bottom: 15px;
        padding-bottom: 10px;
    }
    
    .gene-layout {
        flex-direction: column;
        gap: 20px;
    }
    
    .gene-img {
        width: 100%;
        max-height: 350px;
    }
    
    p {
        font-size: 1rem;
    }
}
</style>