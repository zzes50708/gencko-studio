<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

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

const getMetaImg = (url) => {
    if (!url) return 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    let target = url
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1200&output=webp&q=80`
}

const convertLink = (url) => {
    if (!url) return ''
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    let target = url
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`
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
    <div>
        <div v-if="pending" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>基因資料載入中...</p>
        </div>

        <div v-else-if="!viewingGene" style="text-align:center; padding:100px 0; color:#888;">
            <h2>找不到「{{ geneName }}」的資料</h2>
            <p>可能該基因條目尚未建立或已被移除。</p>
            <button @click="goBack" class="btn-back" style="margin-top:20px;">← 返回圖鑑列表</button>
        </div>

        <div v-else class="prod-container">
            <button class="btn-back" @click="goBack">← 返回圖鑑列表</button>
            <div class="page-text-box">
                <h1 class="page-title">{{ viewingGene.Name }}</h1>
                <div v-if="viewingGene.Warning" class="warn-box">{{ viewingGene.Warning }}</div>
                <div class="about-layout">
                    <img v-if="viewingGene.ImageURL" :src="convertLink(viewingGene.ImageURL)" :alt="viewingGene.Name + ' 基因特徵'" class="about-img">
                    <div class="about-content">
                        <h3>基因簡介</h3>
                        <p>{{ viewingGene.Brief }}</p>
                        <div v-if="viewingGene.Detail">
                            <h3 style="margin-top:20px;color:var(--pri)">詳細敘述</h3>
                            <p style="white-space:pre-wrap">{{ viewingGene.Detail }}</p>
                        </div>
                        <div v-if="viewingGene.Source" style="margin-top:20px;font-size:0.9rem;color:#888;border-top:1px solid var(--bd);padding-top:10px;text-align:left;">
                            資料來源：{{ viewingGene.Source }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>