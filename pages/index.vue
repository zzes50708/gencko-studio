<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const router = useRouter()

useHead({
    meta:[
        { 
            name: 'description', 
            content: 'Gencko Studio 專注於豹紋守宮繁育、提供基因計算機工具、全台特寵醫院地圖，以及豐富的飼養知識專欄。新手入門首選的爬蟲與守宮平台。' 
        },
        { property: 'og:title', content: 'Gencko Studio | 專業豹紋守宮繁育與爬蟲知識' },
        { property: 'og:description', content: '提供專業守宮選育、基因計算工具與特寵醫療地圖。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' }
    ],
    script:[
        {
            type: 'application/ld+json',
            children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": "Gencko Studio",
                "url": "https://www.genckobreeding.com/",
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://www.genckobreeding.com/shop?kw={search_term_string}",
                    "query-input": "required name=search_term_string"
                }
            })
        }
    ]
})

// 透過 Pinia Store 取得資料
const loading = computed(() => store.loading)
const hotList = computed(() => store.hotList)
const articlesList = computed(() => store.articlesList)
const auctionList = computed(() => store.auctionList)

const hasActiveAuction = computed(() => {
    if (!auctionList.value || auctionList.value.length === 0) return false
    const now = new Date().getTime()
    return auctionList.value.some(a => new Date(a.end_time).getTime() > now)
})

const fmtDate = (d) => {
    try { return new Date(d).toISOString().split('T')[0] } catch(e) { return '' }
}

const setBeginnerMode = () => {
    // 透過 query 傳遞參數，後續將在 Shop 頁面中接接並觸發篩選
    router.push({ path: '/shop', query: { beginner: 'true' } })
}
</script>

<template>
    <div class="home-page-wrapper">
        <!-- Hero Section -->
        <section class="home-header-wrap" aria-label="品牌形象首圖">
            <div class="hero-content hero-content-inner">
                <h1 class="hero-main-title">GENCKO STUDIO</h1>
                
                <div class="hero-btn-group mobile-row-nowrap" style="margin-bottom:8px; justify-content:center;">
                    <a href="https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg" target="_blank" class="btn-hero btn-line-join" rel="noopener noreferrer">
                        🔥 點擊加入社群享優惠
                    </a>
                </div>
                <div class="hero-btn-group social-group" style="justify-content:center; margin-bottom: 8px;">
                    <a href="https://www.instagram.com/gencko_breeding" target="_blank" class="btn-hero btn-soc" rel="noopener noreferrer">IG</a>
                    <a href="https://www.facebook.com/profile.php?id=61579393505049&locale=zh_TW" target="_blank" class="btn-hero btn-soc" rel="noopener noreferrer">FB</a>
                    <a href="https://myship.7-11.com.tw/general/detail/GM2509175195515" target="_blank" class="btn-hero btn-soc" rel="noopener noreferrer">賣貨便</a>
                </div>
            </div>
        </section>
        
        <!-- Scenarios Navigation -->
        <nav class="home-scenario-grid" aria-label="快速導覽">
            <div class="scenario-card" @click="setBeginnerMode" role="button" tabindex="0">
                <div class="scenario-icon">🌱</div>
                <div class="scenario-title">新手入門</div>
                <div class="scenario-desc">好養強壯預算友善</div>
            </div>
            <NuxtLink to="/auction" class="scenario-card" style="text-decoration:none; display:block; color:inherit; position:relative;">
                <div v-if="hasActiveAuction" class="live-badge">🔥 競標中</div>
                <div class="scenario-icon">🔨</div>
                <div class="scenario-title">線上競標</div>
                <div class="scenario-desc">參與競標與直購</div>
            </NuxtLink>
            <NuxtLink to="/calculator" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-icon">🧬</div>
                <div class="scenario-title">基因計算</div>
                <div class="scenario-desc">專業的選育工具</div>
            </NuxtLink>
            <NuxtLink to="/hospital" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-icon">🏥</div>
                <div class="scenario-title">特寵醫院</div>
                <div class="scenario-desc">全台就醫地圖</div>
            </NuxtLink>
        </nav>

        <!-- Hot Picks Section -->
        <section class="home-section" aria-labelledby="hot-picks-title">
            <div class="section-head">
                <h2 id="hot-picks-title" class="sec-title">熱門精選</h2>
                <NuxtLink to="/shop" class="sec-more" style="text-decoration:none;" aria-label="查看更多熱門商品">查看更多 &rarr;</NuxtLink>
            </div>
            
            <div v-if="loading && hotList.length === 0" class="hot-skeleton-wrapper">
                <div class="sk-card" v-for="n in 5" :key="n" style="width:220px; flex-shrink:0;">
                    <div class="skeleton sk-img" style="height:180px;"></div>
                    <div class="sk-body"><div class="skeleton sk-title" style="width:60%; margin:0 auto;"></div></div>
                </div>
            </div>

            <div v-else-if="hotList.length > 0" class="hot-marquee-mask">
                <div class="hot-track">
                    <div class="hot-card-item" v-for="(i, idx) in [ ...hotList, ...hotList, ...hotList, ...hotList ]" :key="idx">
                        <NuxtLink :to="`/product/${i.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                            <div style="position:relative;">
                                <NuxtImg 
                                    v-if="i.ImageURL" 
                                    :src="getCleanUrl(i.ImageURL)" 
                                    :alt="i.Morph + ' 守宮'" 
                                    class="card-img" 
                                    loading="lazy" 
                                    width="220" 
                                    height="180" 
                                    fit="cover" 
                                    format="webp" 
                                />
                                <div v-else class="card-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:3rem;background:#000;">🦎</div>
                                <div v-if="i.Status === 'ForSale'" class="trust-badge">🛡️ 100% HEALTH</div>
                            </div>
                            <div class="card-body" style="padding:12px; text-align:center;">
                                <h3 class="slim-title" style="margin:0; font-size:1.05rem; white-space:normal; line-height:1.2;">{{ i.Morph }}</h3>
                            </div>
                        </NuxtLink>
                    </div>
                </div>
            </div>
            <div v-else class="empty-state-text">
                暫無熱門精選商品
            </div>
        </section>

        <!-- Latest Articles Section -->
        <section class="home-section articles-section" aria-labelledby="latest-articles-title">
            <div class="section-head">
                <h2 id="latest-articles-title" class="sec-title">最新文章</h2>
                <NuxtLink to="/articles" class="sec-more" style="text-decoration:none;" aria-label="閱讀更多文章">專欄文章 &rarr;</NuxtLink>
            </div>
            <div class="grid article-grid">
                <article class="card article-card" v-for="item in articlesList.slice(0, 3)" :key="item.ID">
                    <NuxtLink :to="`/articles/${item.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                        <div style="position:relative; overflow:hidden;">
                            <NuxtImg 
                                v-if="item.ImageURL" 
                                :src="getCleanUrl(item.ImageURL)" 
                                :alt="item.Title" 
                                class="card-img" 
                                style="height:180px;" 
                                loading="lazy" 
                                width="400" 
                                height="180" 
                                fit="cover" 
                                format="webp" 
                            />
                            <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                            <div class="art-cat-tag">{{ item.Category }}</div>
                        </div>
                        <div class="card-body">
                            <time class="date-text" style="font-size:0.8rem;color:#888;margin-bottom:6px;display:block;">{{ fmtDate(item.PublishDate) }}</time>
                            <h3 class="slim-title" style="font-size:1.15rem;margin-bottom:6px;white-space:normal;line-height:1.3;">{{ item.Title }}</h3>
                            <p class="art-summary" style="margin:0;">{{ item.Summary }}</p>
                        </div>
                    </NuxtLink>
                </article>
            </div>
        </section>
    </div>
</template>

<style scoped>
.home-page-wrapper {
    width: 100%;
    overflow-x: hidden;
}

.live-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #e74c3c;
    color: #fff;
    font-size: 0.7rem;
    font-weight: bold;
    padding: 4px 8px;
    border-radius: 20px;
    box-shadow: 0 4px 10px rgba(231, 76, 60, 0.4);
    animation: pulse-badge 1.5s infinite;
    z-index: 10;
}
@keyframes pulse-badge {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
    100% { transform: scale(1); opacity: 1; }
}

.home-header-wrap { padding: 0 10px 20px 10px; text-align: center; }
.hero-content-inner { max-width: 700px; margin: 0 auto; }
.hero-main-title { font-size: 2.5rem; font-weight: 900; margin-bottom: 10px; letter-spacing: 1px; text-shadow: 0 0 25px rgba(255, 69, 0, 0.4); color: #fff; line-height: 1.1; }

.hero-btn-group { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.btn-line-join { background: var(--pri) !important; color: #fff !important; padding: 12px 30px; font-size: 1.1rem; border-radius: 30px; box-shadow: 0 0 15px var(--pri-glow); border: none; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: bold; }
.btn-soc { background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.3); padding: 10px 20px; font-size: 0.9rem; border-radius: 30px; color: #fff; text-decoration: none; font-weight: bold; transition: 0.2s; }
.btn-soc:hover, .btn-line-join:hover { transform: scale(1.05); }

/* Scenarios */
.home-scenario-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 30px; }
.scenario-card { background: var(--card-bg); border: 1px solid var(--bd); padding: 15px 10px; border-radius: 12px; text-align: center; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.scenario-card:active { transform: scale(0.95); }
.scenario-icon { font-size: 2rem; margin-bottom: 8px; }
.scenario-title { font-weight: bold; color: var(--pri); margin-bottom: 4px; font-size: 0.95rem; }
.scenario-desc { font-size: 0.75rem; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Sections */
.home-section { margin-bottom: 30px; background: rgba(255,255,255,0.02); padding: 20px; border-radius: 12px; border: 1px solid var(--bd); }
.section-head { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
.sec-title { font-size: 1.4rem; font-weight: 900; color: #fff; border-left: 4px solid var(--pri); padding-left: 12px; line-height: 1; margin: 0; }
.sec-more { color: #888; font-size: 0.9rem; font-weight: bold; }

/* Hot Track */
.hot-skeleton-wrapper { display:flex; gap:15px; overflow:hidden; padding:10px 0; }
.hot-marquee-mask { overflow: hidden; width: 100%; position: relative; padding: 5px 0; mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent); }
.hot-track { display: grid; grid-template-rows: repeat(2, 1fr); grid-auto-flow: column; gap: 12px; width: max-content; animation: hotScroll 60s linear infinite; }
.hot-track:hover { animation-play-state: paused; }
.hot-card-item { width: 220px; flex-shrink: 0; background: var(--card-bg); border: 1px solid var(--bd); border-radius: 10px; overflow: hidden; transition: 0.3s; }
@keyframes hotScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

/* Cards inside Track */
.card-img { width: 100%; height: 160px; object-fit: cover; border-bottom: 1px solid var(--bd); }
.trust-badge { position: absolute; bottom: 5px; left: 5px; background: rgba(0,0,0,0.8); border: 1px solid #FFD700; color: #FFD700; font-size: 0.6rem; padding: 2px 5px; border-radius: 4px; z-index: 5; }
.empty-state-text { text-align:center; padding:20px; color:#666; font-weight: bold; }

/* Article Grid */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px; }
.article-card { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 10px; overflow: hidden; transition: 0.3s; }
.art-cat-tag { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: var(--pri); border: 1px solid var(--pri); padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; z-index: 2; font-weight: bold; }
.art-summary { font-size: 0.9rem; color: #aaa; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* Day Mode Overrides */
:global(body.day-mode) .scenario-card { background: #fff; border-color: #ddd; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
:global(body.day-mode) .home-section { background: #fff; border-color: #ddd; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
:global(body.day-mode) .section-head { border-bottom-color: #eee; }
:global(body.day-mode) .sec-title { color: #111; }
:global(body.day-mode) .hot-card-item { background: #fff; border-color: #ddd; }
:global(body.day-mode) .article-card { background: #fff; border-color: #ddd; }
:global(body.day-mode) .card-img { background: #f9f9f9; border-bottom-color: #eee; }
:global(body.day-mode) .slim-title { color: #111; }
:global(body.day-mode) .art-cat-tag { background: #fff; color: var(--pri); border-color: var(--pri); }
:global(body.day-mode) .btn-soc { background: #fff; color: #555; border-color: #ccc; }

/* 🌟 Mobile App-like Optimizations */
@media (max-width: 768px) {
    .home-page-wrapper {
        padding: 0;
    }

    /* 縮減 GENCKO STUDIO 標題與上下行距 */
    .hero-main-title { font-size: 1.8rem; margin-top: 5px; margin-bottom: 5px; }

    /* 縮減加入社群按鈕與 IG FB 賣貨便的上下行距、高度 */
    .mobile-row-nowrap .btn-line-join { width: 100%; padding: 8px 0; font-size: 0.95rem; height: auto; line-height: 1.2; }
    .hero-btn-group { margin-bottom: 8px !important; }
    .social-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; width: 100%; margin-bottom: 8px; }
    .social-group .btn-soc { padding: 8px 0; font-size: 0.85rem; width: 100%; text-align: center; height: auto; line-height: 1.2; }

    /* 4 個按鈕並排 */
    .home-scenario-grid { grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 15px; padding: 0 10px; }
    .scenario-card { padding: 10px 4px; border-radius: 12px; }
    .scenario-icon { font-size: 1.4rem; margin-bottom: 4px; }
    .scenario-title { font-size: 0.75rem; margin-bottom: 2px; }
    .scenario-desc { font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Edge-to-Edge 滿版設計 */
    .home-section {
        padding: 20px 0;
        margin-bottom: 15px;
        border-radius: 0;
        border-left: none;
        border-right: none;
        background: transparent !important;
        box-shadow: none !important;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .section-head {
        padding: 0 15px;
        margin-bottom: 15px;
        border-bottom: none; 
    }

    .hot-marquee-mask {
        padding-left: 15px;
        mask-image: linear-gradient(to right, #000 90%, transparent);
        -webkit-mask-image: linear-gradient(to right, #000 90%, transparent);
    }
    
    /* 熱門精選卡片高度寬度縮減 1/3 */
    .hot-card-item {
        width: 106px; /* 約原 160px 的 2/3 */
        border-radius: 8px;
    }

    .card-img {
        height: 93px; /* 約原 140px 的 2/3 */
    }
    
    .card-body { padding: 6px !important; }
    
    /* 品系欄單行、縮減行距 */
    .slim-title { 
        font-size: 0.8rem !important; 
        line-height: 1.2 !important; 
        white-space: nowrap !important; 
        overflow: hidden !important; 
        text-overflow: ellipsis !important; 
        margin-bottom: 0 !important;
    }

    .article-grid {
        padding: 0 15px;
        grid-template-columns: 1fr;
    }
}

:global(body.day-mode) @media (max-width: 768px) {
    .home-section { border-bottom-color: #eee; }
}
</style>