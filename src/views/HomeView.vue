<script>
import { useHead } from '@vueuse/head';

export default {
    name: 'HomeView',
    props: {
        loading: { type: Boolean, default: false },
        hotList: { type: Array, default: () => [] },
        articlesList: { type: Array, default: () => [] }
    },
    emits: ['navigate', 'set-beginner', 'open-product', 'open-article'],
    setup() {
        useHead({
            // [SEO] 移除 title 設定，讓它自動使用 App.vue 定義的「Gencko Studio｜專業豹紋守宮選育工作室」
            meta: [
                { 
                    name: 'description', 
                    content: 'Gencko Studio 專注於豹紋守宮繁育、提供基因計算機工具、全台特寵醫院地圖，以及豐富的飼養知識專欄。新手入門首選的爬蟲與守宮平台。' 
                },
                { property: 'og:title', content: 'Gencko Studio | 專業豹紋守宮繁育與爬蟲知識' },
                { property: 'og:description', content: '提供專業守宮選育、基因計算工具與特寵醫療地圖。' },
                // 可替換為更具代表性的首頁 Banner 圖片
                { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' }
            ],
            // 結構化資料 (Structured Data) - 幫助 Google 理解這是品牌首頁
            script: [
                {
                    type: 'application/ld+json',
                    children: JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "Gencko Studio",
                        "url": "https://www.gencko.tw/",
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": "https://www.gencko.tw/shop?kw={search_term_string}",
                            "query-input": "required name=search_term_string"
                        }
                    })
                }
            ]
        });
    },
    methods: {
        // --- 顯示輔助函式 (View Helper) ---
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
        <!-- Hero Section -->
        <section class="home-header-wrap" aria-label="品牌形象首圖">
            <div class="hero-content hero-content-inner">
                <h1 class="hero-main-title">GENCKO STUDIO</h1>
                
                <div class="hero-btn-group mobile-row-nowrap" style="margin-bottom:15px; justify-content:center;">
                    <a href="https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg" target="_blank" class="btn-hero btn-line-join" rel="noopener noreferrer">
                        🔥 點擊加入社群享優惠
                    </a>
                </div>
                <div class="hero-btn-group social-group" style="justify-content:center;">
                    <a href="https://www.instagram.com/gencko_breeding" target="_blank" class="btn-hero btn-soc" rel="noopener noreferrer">IG</a>
                    <a href="https://www.facebook.com/profile.php?id=61579393505049&locale=zh_TW" target="_blank" class="btn-hero btn-soc" rel="noopener noreferrer">FB</a>
                    <a href="https://myship.7-11.com.tw/general/detail/GM2509175195515" target="_blank" class="btn-hero btn-soc" rel="noopener noreferrer">賣貨便</a>
                </div>
            </div>
        </section>
        
        <!-- Scenarios Navigation -->
        <nav class="home-scenario-grid" aria-label="快速導覽">
            <!-- 新手入門帶有特定過濾邏輯，保留原寫法，但改為更像按鈕的語意 -->
            <div class="scenario-card" @click="$emit('set-beginner')" role="button" tabindex="0">
                <div class="scenario-icon">🌱</div>
                <div class="scenario-title">新手入門</div>
                <div class="scenario-desc">好養、強壯、預算友善</div>
            </div>
            <router-link to="/breeders" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-icon">👑</div>
                <div class="scenario-title">種群展示</div>
                <div class="scenario-desc">欣賞 Gencko 核心種公母</div>
            </router-link>
            <router-link to="/calculator" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-icon">🧬</div>
                <div class="scenario-title">基因計算</div>
                <div class="scenario-desc">專業玩家的選育工具</div>
            </router-link>
            <router-link to="/hospital" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-icon">🏥</div>
                <div class="scenario-title">特寵醫院</div>
                <div class="scenario-desc">全台特寵就醫地圖</div>
            </router-link>
        </nav>

        <!-- Hot Picks Section -->
        <section class="home-section" aria-labelledby="hot-picks-title">
            <div class="section-head">
                <h2 id="hot-picks-title" class="sec-title">熱門精選</h2>
                <a href="/shop" class="sec-more" style="text-decoration:none;" aria-label="查看更多熱門商品">查看更多 &rarr;</a>
            </div>
            
            <div v-if="loading && hotList.length===0" style="display:flex; gap:15px; overflow:hidden; padding:10px 0;">
                <div class="sk-card" v-for="n in 5" :key="n" style="width:220px; flex-shrink:0;">
                    <div class="skeleton sk-img" style="height:180px;"></div>
                    <div class="sk-body"><div class="skeleton sk-title" style="width:60%; margin:0 auto;"></div></div>
                </div>
            </div>

            <div v-else-if="hotList.length > 0" class="hot-marquee-mask">
                <div class="hot-track">
                    <div class="hot-card-item" v-for="(i, idx) in[...hotList, ...hotList, ...hotList, ...hotList]" :key="idx">
                        <!-- 加入 router-link 讓爬蟲能沿著首頁抓到最熱門的商品 -->
                        <router-link :to="`/product/${i.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                            <div style="position:relative;">
                                <img v-if="i.ImageURL" :src="convertLink(i.ImageURL)" :alt="i.Morph + ' 守宮'" class="card-img" loading="lazy">
                                <div v-else class="card-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:3rem;background:#000;">🦎</div>
                                <div v-if="i.Status==='ForSale'" class="trust-badge">🛡️ 100% HEALTH</div>
                            </div>
                            <div class="card-body" style="padding:15px; text-align:center;">
                                <h3 class="slim-title" style="margin:0; font-size:1.1rem; white-space:normal;">{{i.Morph}}</h3>
                            </div>
                        </router-link>
                    </div>
                </div>
            </div>
            <div v-else style="text-align:center; padding:20px; color:#666;">
                暫無熱門精選商品
            </div>
        </section>

        <!-- Latest Articles Section -->
        <section class="home-section" style="background:rgba(255,255,255,0.02);" aria-labelledby="latest-articles-title">
            <div class="section-head">
                <h2 id="latest-articles-title" class="sec-title">最新文章</h2>
                <a href="/articles" class="sec-more" style="text-decoration:none;" aria-label="閱讀更多文章">專欄文章 &rarr;</a>
            </div>
            <div class="grid">
                <article class="card article-card" v-for="item in articlesList.slice(0, 3)" :key="item.ID">
                    <!-- 使用 router-link 讓爬蟲能抓到最新發布的文章 -->
                    <router-link :to="`/articles/${item.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                        <div style="position:relative; overflow:hidden;">
                            <img v-if="item.ImageURL" :src="convertLink(item.ImageURL)" :alt="item.Title" class="card-img" style="height:180px;" loading="lazy">
                            <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                            <div class="art-cat-tag">{{ item.Category }}</div>
                        </div>
                        <div class="card-body">
                            <time class="date-text" style="font-size:0.8rem;color:#888;margin-bottom:5px;display:block;">{{ fmtDate(item.PublishDate) }}</time>
                            <h3 class="slim-title" style="font-size:1.1rem;margin-bottom:8px;white-space:normal;">{{ item.Title }}</h3>
                            <p class="art-summary" style="margin:0;">{{ item.Summary }}</p>
                        </div>
                    </router-link>
                </article>
            </div>
        </section>
    </div>
</template>