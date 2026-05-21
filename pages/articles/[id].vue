<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

// 🌟 強制每個不同 URL 建立獨立元件實例，防止 CSR 元件複用導致 useAsyncData 不重新抓取
definePageMeta({
    key: route => route.fullPath
})

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
        .ilike('status', 'published')
        .single()

    if (error || !data) return null

    return {
        ID: data.id,
        Title: data.title,
        Category: data.category,
        Summary: data.summary,
        Content: data.content,
        ImageURL: data.image_url,
        Author: data.author || 'Gencko Studio',
        PublishDate: data.publish_date || data.created_at,
        Keywords: data.keywords || ''
    }
})

// 當文章被載入後，將其存入 Store 以供全域 Navbar 計算進度條使用
if (readingArticle.value && import.meta.client) {
    store.readingArticle = readingArticle.value
}

const fmtDate = (d) => {
    try { return new Date(d).toISOString().split('T')[0] } catch(e) { return '' }
}

const siteData = computed(() => {
    if (readingArticle.value) {
        const art = readingArticle.value
        const imgUrl = getCleanUrl(art.ImageURL)
        const artUrl = `https://www.genckobreeding.com/articles/${art.ID}`
        
        // 🌟 修正 SSR 崩潰 Bug：加入 try-catch 保護日期解析
        let isoDate = ''
        try {
            isoDate = art.PublishDate ? new Date(art.PublishDate).toISOString() : new Date().toISOString()
        } catch (e) {
            isoDate = new Date().toISOString() // 若日期格式錯誤，使用當下時間作為預設值
        }

        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": art.Title,
            "image": [imgUrl],
            "datePublished": isoDate,
            "dateModified": isoDate,
            "author": [{
                "@type": "Person",
                "name": art.Author || "Gencko Studio",
                "url": "https://www.genckobreeding.com/about",
                "worksFor": {
                    "@type": "Organization",
                    "name": "Gencko Studio"
                }
            }],
            "publisher": {
                "@type": "Organization",
                "name": "Gencko Studio",
                "url": "https://www.genckobreeding.com",
                "logo": { "@type": "ImageObject", "url": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png" },
                "sameAs": [
                    "https://www.instagram.com/gencko_breeding",
                    "https://www.facebook.com/profile.php?id=61579393505049"
                ]
            },
            "mainEntityOfPage": artUrl,
            "inLanguage": "zh-TW",
            "about": {
                "@type": "Thing",
                "name": "豹紋守宮",
                "alternateName": "Eublepharis macularius"
            },
            "description": art.Summary,
            "keywords": art.Keywords || "" // 🌟 新增：注入 JSON-LD
        }

        return {
            title: art.Title,
            desc: art.Summary || 'Gencko Studio 專業爬蟲與守宮飼養專欄。',
            keywords: art.Keywords || 'Gencko Studio, 豹紋守宮, 肥尾守宮, 爬蟲, 飼養教學', // 🌟 預設備用關鍵字
            img: imgUrl,
            url: artUrl,
            script:[{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
        }
    }
    
    // Fallback if not found
    return {
        title: '文章不存在',
        desc: '找不到此文章',
        keywords: '',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png',
        url: `https://www.genckobreeding.com/articles/${articleId}`,
        script:[]
    }
})

useHead({
    title: computed(() => siteData.value.title),
    meta:[
        { name: 'description', content: computed(() => siteData.value.desc) },
        { name: 'keywords', content: computed(() => siteData.value.keywords) }, // 🌟 新增：Meta Keywords
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

// 🌟 相關文章：同分類優先，其次任意文章，排除自身，最多 4 篇
const relatedArticles = computed(() => {
    if (!readingArticle.value || !store.articlesList.length) return []
    const self = readingArticle.value.ID
    const cat = readingArticle.value.Category
    const selfKws = (readingArticle.value.Keywords || '').toLowerCase().split(',').map(k => k.trim()).filter(Boolean)

    const scored = store.articlesList
        .filter(a => a.ID !== self)
        .map(a => {
            let score = 0
            if (a.Category === cat) score += 3
            const aKws = (a.Keywords || '').toLowerCase().split(',').map(k => k.trim()).filter(Boolean)
            score += selfKws.filter(k => aKws.includes(k)).length
            return { ...a, _score: score }
        })
        .sort((a, b) => b._score - a._score || (b.ImageURL ? 1 : 0) - (a.ImageURL ? 1 : 0))
    return scored.slice(0, 4)
})
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
                    <img :src="getCleanUrl(readingArticle.ImageURL)" :alt="readingArticle.Title" style="width:100%; height:auto; max-height:200px; object-fit:cover; border-radius:8px; margin-bottom:0px;" loading="eager">
                </div>
                <h1 style="color:var(--txt);font-size:2rem;margin-bottom:15px;">{{ readingArticle.Title }}</h1>
                <div style="color:#666;font-size:0.9rem;margin-bottom:20px;">
                    <time :datetime="readingArticle.PublishDate">📅 {{ fmtDate(readingArticle.PublishDate) }}</time>
                    <span style="margin-left:15px;">👤 {{ readingArticle.Author }}</span>
                    <span style="margin-left:15px;">📂 {{ readingArticle.Category }}</span>
                </div>
                <hr style="border-color:rgba(255,255,255,0.1); margin: 0px 0;">
                <div class="reader-content" v-html="readingArticle.Content"></div>

                <!-- 🌟 E-E-A-T 作者資訊卡：提升 AI 引用可信度 & 品牌識別 -->
                <div class="author-card" itemscope itemtype="https://schema.org/Organization">
                    <img
                        src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png"
                        alt="Gencko Studio Logo"
                        class="author-avatar"
                        itemprop="logo"
                        loading="lazy"
                    />
                    <div class="author-info">
                        <div class="author-name" itemprop="name">Gencko Studio</div>
                        <div class="author-role">專業豹紋守宮（Eublepharis macularius）繁育工作室</div>
                        <p class="author-bio" itemprop="description">
                            致力於豹紋守宮與肥尾守宮的科學化選育，提供基因計算工具、飼養知識專欄與線上競標服務。
                        </p>
                        <div class="author-links">
                            <a href="https://www.instagram.com/gencko_breeding" target="_blank" rel="noopener" class="author-link" itemprop="sameAs">Instagram</a>
                            <a href="https://www.facebook.com/profile.php?id=61579393505049" target="_blank" rel="noopener" class="author-link" itemprop="sameAs">Facebook</a>
                            <NuxtLink to="/about" class="author-link">關於我們</NuxtLink>
                        </div>
                    </div>
                </div>
            </article>
            <!-- 🌟 相關文章（內部連結 + SEO 停留時間）-->
            <section v-if="relatedArticles.length > 0" class="related-articles-section">
                <h2 class="related-title">延伸閱讀</h2>
                <div class="related-articles-grid">
                    <NuxtLink
                        v-for="art in relatedArticles"
                        :key="art.ID"
                        :to="`/articles/${art.ID}`"
                        class="related-art-card"
                        style="text-decoration:none; color:inherit;"
                    >
                        <div class="related-art-img-wrap">
                            <img v-if="art.ImageURL" :src="getCleanUrl(art.ImageURL, 300)" :alt="art.Title" loading="lazy" decoding="async" />
                            <div v-else class="related-art-img-placeholder">📝</div>
                        </div>
                        <div class="related-art-info">
                            <span class="related-art-cat">{{ art.Category }}</span>
                            <div class="related-art-title">{{ art.Title }}</div>
                        </div>
                    </NuxtLink>
                </div>
            </section>

            <button @click="goBack" class="btn-back" style="margin-top:30px;">← 返回列表</button>
        </div>
    </div>
</template>

<style scoped>
/* ── E-E-A-T 作者資訊卡 ── */
.author-card {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    margin-top: 36px;
    padding: 20px;
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: var(--radius-md);
    border-left: 3px solid var(--pri);
}
.author-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid var(--bd);
}
.author-info { flex: 1; min-width: 0; }
.author-name {
    font-size: 1rem;
    font-weight: 900;
    color: var(--txt);
    margin-bottom: 2px;
}
.author-role {
    font-size: 0.78rem;
    color: var(--pri);
    font-weight: 600;
    margin-bottom: 8px;
}
.author-bio {
    font-size: 0.85rem;
    color: var(--txt);
    opacity: 0.75;
    line-height: 1.6;
    margin: 0 0 10px 0;
}
.author-links {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}
.author-link {
    font-size: 0.78rem;
    font-weight: bold;
    color: var(--txt);
    opacity: 0.6;
    text-decoration: none;
    border: 1px solid var(--bd);
    padding: 3px 10px;
    border-radius: 20px;
    transition: 0.2s;
}
.author-link:hover {
    opacity: 1;
    border-color: var(--pri);
    color: var(--pri);
}

@media (max-width: 768px) {
    .author-card { flex-direction: column; gap: 12px; padding: 14px; }
    .author-avatar { width: 44px; height: 44px; }
    .related-articles-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
    .related-art-title { font-size: 0.82rem !important; }
}

/* ── 延伸閱讀 ── */
.related-articles-section { margin-top: 32px; }
.related-title {
    font-size: 1.1rem;
    font-weight: 900;
    color: var(--txt);
    border-left: 3px solid var(--pri);
    padding-left: 10px;
    margin-bottom: 14px;
}
.related-articles-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}
.related-art-card {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: transform var(--transition), border-color var(--transition);
    cursor: pointer;
}
.related-art-card:hover {
    transform: translateY(-3px);
    border-color: var(--bd-hover);
}
.related-art-img-wrap {
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--card-bg);
}
.related-art-img-wrap img {
    width: 100%; height: 100%;
    object-fit: cover;
    transition: transform var(--transition);
}
.related-art-card:hover .related-art-img-wrap img { transform: scale(1.04); }
.related-art-img-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; background: rgba(128,128,128,0.1);
}
.related-art-info { padding: 10px; }
.related-art-cat {
    font-size: 0.68rem;
    color: var(--pri);
    font-weight: bold;
    background: var(--pri-glow-soft);
    padding: 2px 7px;
    border-radius: 10px;
    display: inline-block;
    margin-bottom: 5px;
}
.related-art-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--txt);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>