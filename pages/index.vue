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
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' }
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
/* 
  [局部樣式修復] 
  已清除與 assets/css/style.css 重複的宣告，
  專注於首頁專屬的特殊元素佈局與行動端 App 化覆寫。
*/
.home-page-wrapper {
    width: 100%;
    overflow-x: hidden;
}

.live-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #e74c3c; /* 狀態警告色，保留 */
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

.home-header-wrap { 
    padding: 0 10px 20px 10px; 
    text-align: center; 
}

.hero-main-title { 
    font-size: 2.5rem; 
    font-weight: 900; 
    margin-bottom: 10px; 
    letter-spacing: 1px; 
    text-shadow: 0 0 25px var(--pri-glow); 
    color: var(--txt); 
    line-height: 1.1; 
}

/* 首頁社群按鈕微調覆寫 */
.btn-soc { 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    padding: 10px 20px; 
    font-size: 0.9rem; 
    border-radius: 30px; 
    color: var(--txt); 
    text-decoration: none; 
    font-weight: bold; 
    transition: 0.2s; 
    opacity: 0.9; 
}
.btn-soc:hover { 
    transform: scale(1.05); 
    opacity: 1; 
    border-color: var(--pri); 
    color: var(--pri); 
}

/* 首頁專屬卡片微調 */
.scenario-card { 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    padding: 15px 10px; 
    border-radius: 12px; 
    text-align: center; 
    cursor: pointer; 
    transition: 0.3s; 
    box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
}
.scenario-card:active { 
    transform: scale(0.95); 
}
.scenario-icon { 
    font-size: 2rem; 
    margin-bottom: 8px; 
}
.scenario-title { 
    font-weight: bold; 
    color: var(--pri); 
    margin-bottom: 4px; 
    font-size: 0.95rem; 
}
.scenario-desc { 
    font-size: 0.75rem; 
    color: var(--txt); 
    opacity: 0.6; 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
}

/* 首頁區塊微調 */
.home-section { 
    margin-bottom: 30px; 
    background: var(--card-bg); 
    padding: 20px; 
    border-radius: 12px; 
    border: 1px solid var(--bd); 
    box-shadow: 0 4px 20px rgba(0,0,0,0.1); 
}

.hot-skeleton-wrapper { 
    display: flex; 
    gap: 15px; 
    overflow: hidden; 
    padding: 10px 0; 
}

.empty-state-text { 
    text-align: center; 
    padding: 20px; 
    color: var(--txt); 
    opacity: 0.6; 
    font-weight: bold; 
}

/* 🌟 Mobile App-like Optimizations */
@media (max-width: 768px) {
    .home-page-wrapper {
        padding: 0;
    }

    .hero-main-title { 
        font-size: 2rem; 
        margin-top: -5px; 
        margin-bottom: -5px; 
    }

    .mobile-row-nowrap .btn-line-join { 
        width: 100%; 
        padding: 5px 0; 
        font-size: 0.95rem; 
        height: auto; 
        line-height: 1.2; 
    }
    
    .hero-btn-group { 
        margin-bottom: 8px !important; 
    }
    
    .social-group { 
        display: grid; 
        grid-template-columns: 1fr 1fr 1fr; 
        gap: 10px; 
        width: 100%; 
        margin-bottom: 15px; 
    }
    
    .social-group .btn-soc { 
        padding: 5px 0; 
        font-size: 0.85rem; 
        width: 100%; 
        text-align: center; 
        height: auto; 
        line-height: 1.2; 
        margin-bottom: -25px;
    }

    .home-scenario-grid { 
        grid-template-columns: repeat(4, 1fr); 
        gap: 3px; 
        margin-bottom: 5px; 
        padding: 0 20px; 
    }
    
    .scenario-card { 
        padding: 8px 0px; 
        border-radius: 15px; 
    }
    
    .scenario-icon { 
        font-size: 1rem; 
        margin-bottom: 3px; 
    }
    
    .scenario-title { 
        font-size: 0.75rem; 
        margin-bottom: 0px; 
    }
    
    .scenario-desc { 
        font-size: 0.6rem; 
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis; 
    }

    .home-section {
        padding: 0px 0;
        margin-bottom: 5px;
        border-radius: 0;
        border-left: none;
        border-right: none;
        background: transparent !important;
        box-shadow: none !important;
        border-bottom: 1px solid var(--bd);
    }

    .section-head {
        padding: 0 15px;
        margin-bottom: 5px;
        border-bottom: none; 
    }

    .hot-marquee-mask {
        padding-left: 15px;
        mask-image: linear-gradient(to right, #000 90%, transparent);
        -webkit-mask-image: linear-gradient(to right, #000 90%, transparent);
    }
    
    .hot-card-item {
        width: 100px;
        border-radius: 6px;
    }

    .card-img {
        height: 93px;
    }
    
    .card-body { 
        padding: 6px !important; 
    }
    
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
</style>