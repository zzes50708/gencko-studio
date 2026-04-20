<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const supabase = useSupabaseClient()
const articleId = route.params.id

// [SEO] 為了在伺服器端渲染 (SSR) 期間就能拿到該文章資料以產生正確的 Meta，
// 我們使用 useAsyncData 獨立向 Supabase 請求單篇文章資料。
const { data: readingArticle, pending } = await useAsyncData(`article-${articleId}`, async () => {
    // 若 Store 已經有了，可以直接用 (CSR 場景)
    if (store.articlesList && store.articlesList.length > 0) {
        const found = store.articlesList.find(a => a.ID === articleId)
        if (found) return found
    }

    // 若 Store 沒有 (SSR 場景或直接進入內頁)，則直接去資料庫撈
    const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .eq('status', 'Published')
        .single()

    if (error || !data) return null

    return {
        ID: data.id,
        Title: data.title,
        Category: data.category,
        Summary: data.summary,
        Content: data.content,
        ImageURL: data.image_url,
        Author: data.author,
        PublishDate: data.publish_date
    }
})

// 當文章被載入後，將其存入 Store 以供全域 Navbar 計算進度條使用
if (readingArticle.value && import.meta.client) {
    store.readingArticle = readingArticle.value
}

const getMetaImg = (url) => {
    if (!url) return 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png'
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

const fmtDate = (d) => {
    try { return new Date(d).toISOString().split('T')[0] } catch(e) { return '' }
}

const siteData = computed(() => {
    if (readingArticle.value) {
        const art = readingArticle.value
        const imgUrl = getMetaImg(art.ImageURL)
        const artUrl = `https://www.genckobreeding.com/articles/${art.ID}`
        const isoDate = new Date(art.PublishDate).toISOString()

        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": art.Title,
            "image": [imgUrl],
            "datePublished": isoDate,
            "dateModified": isoDate,
            "author":[{
                "@type": "Person",
                "name": art.Author || "Gencko Studio",
                "url": "https://www.genckobreeding.com/about"
            }],
            "description": art.Summary
        }

        return {
            title: art.Title,
            desc: art.Summary || 'Gencko Studio 專業爬蟲與守宮飼養專欄。',
            img: imgUrl,
            url: artUrl,
            script:[{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
        }
    }
    
    // Fallback if not found
    return {
        title: '文章不存在',
        desc: '找不到此文章',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png',
        url: `https://www.genckobreeding.com/articles/${articleId}`,
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
        { property: 'og:type', content: 'article' }
    ],
    link:[
        { rel: 'canonical', href: computed(() => siteData.value.url) }
    ],
    script: computed(() => siteData.value.script)
})

const goBack = () => {
    store.readingArticle = null
    router.push('/articles')
}
</script>

<template>
    <div>
        <div v-if="pending" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>文章載入中...</p>
        </div>

        <div v-else-if="!readingArticle" style="text-align:center; padding:100px 0; color:#888;">
            <h2>找不到此文章或文章已下架</h2>
            <button @click="goBack" class="btn-back" style="margin-top:20px;">← 返回列表</button>
        </div>

        <div v-else>
            <button @click="goBack" class="btn-back">← 返回列表</button>
            <article class="reader-container">
                <div v-if="readingArticle.ImageURL" class="article-hero-image">
                    <img :src="convertLink(readingArticle.ImageURL)" :alt="readingArticle.Title" style="width:100%; height:auto; max-height:200px; object-fit:cover; border-radius:8px; margin-bottom:0px;" loading="eager">
                </div>
                <h1 style="color:var(--txt);font-size:2rem;margin-bottom:15px;">{{ readingArticle.Title }}</h1>
                <div style="color:#666;font-size:0.9rem;margin-bottom:20px;">
                    <time :datetime="readingArticle.PublishDate">📅 {{ fmtDate(readingArticle.PublishDate) }}</time>
                    <span style="margin-left:15px;">👤 {{ readingArticle.Author }}</span>
                    <span style="margin-left:15px;">📂 {{ readingArticle.Category }}</span>
                </div>
                <hr style="border-color:rgba(255,255,255,0.1); margin: 0px 0;">
                <div class="reader-content" v-html="readingArticle.Content"></div>
            </article>
            <button @click="goBack" class="btn-back" style="margin-top:30px;">← 返回列表</button>
        </div>
    </div>
</template>