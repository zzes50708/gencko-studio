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
            <div class="scenario-card" @click="setBeginnerMode" role="button" tabindex="0">
                <div class="scenario-icon">🌱</div>
                <div class="scenario-title">新手入門</div>
                <div class="scenario-desc">好養、強壯、預算友善</div>
            </div>
            <NuxtLink to="/auction" class="scenario-card" style="text-decoration:none; display:block; color:inherit; position:relative;">
                <div v-if="hasActiveAuction" class="live-badge">🔥 競標中</div>
                <div class="scenario-icon">🔨</div>
                <div class="scenario-title">線上競標</div>
                <div class="scenario-desc">參與限時競標與直購</div>
            </NuxtLink>
            <NuxtLink to="/calculator" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-icon">🧬</div>
                <div class="scenario-title">基因計算</div>
                <div class="scenario-desc">專業玩家的選育工具</div>
            </NuxtLink>
            <NuxtLink to="/hospital" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-icon">🏥</div>
                <div class="scenario-title">特寵醫院</div>
                <div class="scenario-desc">全台特寵就醫地圖</div>
            </NuxtLink>
        </nav>

        <!-- Hot Picks Section -->
        <section class="home-section" aria-labelledby="hot-picks-title">
            <div class="section-head">
                <h2 id="hot-picks-title" class="sec-title">熱門精選</h2>
                <NuxtLink to="/shop" class="sec-more" style="text-decoration:none;" aria-label="查看更多熱門商品">查看更多 &rarr;</NuxtLink>
            </div>
            
            <div v-if="loading && hotList.length === 0" style="display:flex; gap:15px; overflow:hidden; padding:10px 0;">
                <div class="sk-card" v-for="n in 5" :key="n" style="width:220px; flex-shrink:0;">
                    <div class="skeleton sk-img" style="height:180px;"></div>
                    <div class="sk-body"><div class="skeleton sk-title" style="width:60%; margin:0 auto;"></div></div>
                </div>
            </div>

            <div v-else-if="hotList.length > 0" class="hot-marquee-mask">
                <div class="hot-track">
                    <!-- 🌟 確保 in 之後有一個空白 -->
                    <div class="hot-card-item" v-for="(i, idx) in[ ...hotList, ...hotList, ...hotList, ...hotList ]" :key="idx">
                        <NuxtLink :to="`/product/${i.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                            <div style="position:relative;">
                                <!-- 使用 NuxtImg 取代 img -->
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
                            <div class="card-body" style="padding:15px; text-align:center;">
                                <h3 class="slim-title" style="margin:0; font-size:1.1rem; white-space:normal;">{{ i.Morph }}</h3>
                            </div>
                        </NuxtLink>
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
                <NuxtLink to="/articles" class="sec-more" style="text-decoration:none;" aria-label="閱讀更多文章">專欄文章 &rarr;</NuxtLink>
            </div>
            <div class="grid">
                <article class="card article-card" v-for="item in articlesList.slice(0, 3)" :key="item.ID">
                    <NuxtLink :to="`/articles/${item.ID}`" style="display:block; text-decoration:none; color:inherit; height:100%;">
                        <div style="position:relative; overflow:hidden;">
                            <!-- 使用 NuxtImg 取代 img -->
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
                            <time class="date-text" style="font-size:0.8rem;color:#888;margin-bottom:5px;display:block;">{{ fmtDate(item.PublishDate) }}</time>
                            <h3 class="slim-title" style="font-size:1.1rem;margin-bottom:8px;white-space:normal;">{{ item.Title }}</h3>
                            <p class="art-summary" style="margin:0;">{{ item.Summary }}</p>
                        </div>
                    </NuxtLink>
                </article>
            </div>
        </section>
    </div>
</template>

<style scoped>
.live-badge {
    position: absolute;
    top: 0px;
    right: 0px;
    background: #e74c3c;
    color: #fff;
    font-size: 1.5em;
    font-weight: bold;
    padding: 6px 10px;
    border-radius: 30px;
    box-shadow: 0 5px 5px rgba(0,0,0,0.2);
    animation: pulse-badge 1.5s infinite;
    z-index: 1;
}
@keyframes pulse-badge {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.9; }
    100% { transform: scale(1); opacity: 1; }
}
</style>