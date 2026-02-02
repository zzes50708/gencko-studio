<script>
export default {
    name: 'ArticlesView',
    props: {
        filteredArticles: { type: Array, default: () => [] },
        articleCats: { type: Array, default: () => [] },
        readingArticle: { type: Object, default: null },
        artCat: { type: String, default: 'All' }
    },
    emits: ['update:artCat', 'open-article', 'close-article'],
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
                <div class="card article-card" v-for="item in filteredArticles" :key="item.ID" @click="$emit('open-article', item)">
                    <div style="position:relative; overflow:hidden;">
                        <img v-if="item.ImageURL" :src="convertLink(item.ImageURL)" class="card-img" style="height:180px;" loading="lazy">
                        <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                        <div class="art-cat-tag">{{ item.Category }}</div>
                    </div>
                    <div class="card-body">
                        <div style="font-size:0.8rem;color:#888;margin-bottom:5px;">{{ fmtDate(item.PublishDate) }}</div>
                        <div class="morph-title" style="font-size:1.1rem;margin-bottom:8px;">{{ item.Title }}</div>
                        <div class="art-summary">{{ item.Summary }}</div>
                    </div>
                </div>
            </transition-group>
        </div>

        <!-- Reader Mode -->
        <div v-if="readingArticle">
            <button @click="$emit('close-article')" class="btn-back">← 返回列表</button>
            <article class="reader-container">
                <h1 style="color:#fff;font-size:2rem;margin-bottom:15px;">{{ readingArticle.Title }}</h1>
                <div style="color:#666;font-size:0.9rem;margin-bottom:20px;">
                    <span>📅 {{ fmtDate(readingArticle.PublishDate) }}</span>
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