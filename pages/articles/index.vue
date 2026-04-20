<script setup>
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

const store = useMainStore()
const artCat = ref('All')

// 文章分類選項
const articleCats = computed(() => {
    if (!store.articlesList.length) return[]
    return [...new Set(store.articlesList.map(i => i.Category).filter(c => c))]
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
</script>

<template>
    <div>
        <h1 class="page-title">專欄文章</h1>
        <div style="margin-bottom:20px; display:flex; gap:10px; align-items:center;">
            <label style="color:#aaa;">分類：</label>
            <select v-model="artCat" style="background:#111; color:#fff; padding:8px; border:1px solid #333; border-radius:4px;">
                <option value="All">全部文章</option>
                <option v-for="c in articleCats" :key="c" :value="c">{{ c }}</option>
            </select>
        </div>

        <div v-if="filteredArticles.length === 0" style="text-align:center;padding:50px;color:#666;font-size:1.2rem;">
            此分類尚無文章 (或正在載入中...)
        </div>

        <transition-group tag="div" name="list" class="grid" v-else>
            <article class="card article-card" v-for="item in filteredArticles" :key="item.ID">
                <NuxtLink :to="`/articles/${item.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                    <div style="position:relative; overflow:hidden;">
                        <img v-if="item.ImageURL" :src="convertLink(item.ImageURL)" :alt="item.Title" class="card-img" style="height:180px;" loading="lazy">
                        <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                        <div class="art-cat-tag">{{ item.Category }}</div>
                    </div>
                    <div class="card-body">
                        <time :datetime="item.PublishDate" style="font-size:0.8rem;color:#888;margin-bottom:5px;display:block;">{{ fmtDate(item.PublishDate) }}</time>
                        <h2 class="morph-title" style="font-size:1.1rem;margin:0 0 8px 0;">{{ item.Title }}</h2>
                        <p class="art-summary" style="margin:0;">{{ item.Summary }}</p>
                    </div>
                </NuxtLink>
            </article>
        </transition-group>
    </div>
</template>