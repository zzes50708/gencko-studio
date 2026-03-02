<script>
import { computed } from 'vue';
import { useHead } from '@vueuse/head';

export default {
    name: 'ArticlesView',
    props: {
        filteredArticles: { type: Array, default: () => [] },
        articleCats: { type: Array, default: () => [] },
        readingArticle: { type: Object, default: null },
        artCat: { type: String, default: 'All' }
    },
    emits: ['update:artCat', 'open-article', 'close-article'],
    setup(props) {
        // [SEO] 圖片連結轉換邏輯 (需與 methods 內的保持一致以供 Meta 使用)
        const getMetaImg = (url) => {
            if (!url) return 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1200&output=webp&q=80`;
        };

        const siteData = computed(() => {
            if (props.readingArticle) {
                const art = props.readingArticle;
                const imgUrl = getMetaImg(art.ImageURL);
                const artUrl = `https://www.gencko.tw/articles/${art.ID}`;
                const isoDate = new Date(art.PublishDate).toISOString();

                // BlogPosting Schema
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
                        "url": "https://www.gencko.tw/about"
                    }],
                    "description": art.Summary
                };

                return {
                    title: art.Title,
                    desc: art.Summary || 'Gencko Studio 專業爬蟲與守宮飼養專欄。',
                    img: imgUrl,
                    url: artUrl,
                    script: [{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
                };
            } else {
                return {
                    title: '專欄文章',
                    desc: 'Gencko Studio 文章專欄，提供豹紋守宮、肥尾守宮飼養教學、基因解析、疾病預防與市場趨勢分析。',
                    img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
                    url: 'https://www.gencko.tw/articles',
                    script: []
                };
            }
        });

        useHead({
            title: computed(() => siteData.value.title),
            meta: [
                { name: 'description', content: computed(() => siteData.value.desc) },
                { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
                { property: 'og:description', content: computed(() => siteData.value.desc) },
                { property: 'og:image', content: computed(() => siteData.value.img) },
                { property: 'og:url', content: computed(() => siteData.value.url) },
                { property: 'og:type', content: computed(() => props.readingArticle ? 'article' : 'website') },
                { name: 'twitter:card', content: 'summary_large_image' }
            ],
            link: [
                { rel: 'canonical', href: computed(() => siteData.value.url) }
            ],
            script: computed(() => siteData.value.script)
        });
    },
    methods: {
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        },
        fmtDate(d) {
            try { return new Date(d).toISOString().split('T')[0]; } catch(e){ return ''; }
        }
    }
}
</script>

<template>
    <div>
        <!-- List Mode -->
        <div v-show="!readingArticle">
            <h1 class="page-title">專欄文章</h1>
            <div style="margin-bottom:20px; display:flex; gap:10px; align-items:center;">
                <label style="color:#aaa;">分類：</label>
                <select :value="artCat" @change="$emit('update:artCat', $event.target.value)" style="background:#111; color:#fff; padding:8px; border:1px solid #333; border-radius:4px;">
                    <option value="All">全部文章</option>
                    <option v-for="c in articleCats" :key="c" :value="c">{{ c }}</option>
                </select>
            </div>

            <div v-if="filteredArticles.length===0" style="text-align:center;padding:50px;color:#666;font-size:1.2rem;">
                此分類尚無文章
            </div>

            <transition-group tag="div" name="list" class="grid" v-else>
                <article class="card article-card" v-for="item in filteredArticles" :key="item.ID" @click="$emit('open-article', item)" style="cursor:pointer;">
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
                </article>
            </transition-group>
        </div>

        <!-- Reader Mode -->
        <div v-if="readingArticle">
            <button @click="$emit('close-article')" class="btn-back">← 返回列表</button>
            <article class="reader-container">
                <h1 style="color:#fff;font-size:2rem;margin-bottom:15px;">{{ readingArticle.Title }}</h1>
                <div style="color:#666;font-size:0.9rem;margin-bottom:20px;">
                    <time :datetime="readingArticle.PublishDate">📅 {{ fmtDate(readingArticle.PublishDate) }}</time>
                    <span style="margin-left:15px;">👤 {{ readingArticle.Author }}</span>
                    <span style="margin-left:15px;">📂 {{ readingArticle.Category }}</span>
                </div>
                <hr style="border-color:rgba(255,255,255,0.1); margin: 20px 0;">
                <div class="reader-content" v-html="readingArticle.Content"></div>
            </article>
            <button @click="$emit('close-article')" class="btn-back" style="margin-top:30px;">← 返回列表</button>
        </div>
    </div>
</template>