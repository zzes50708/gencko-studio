<script setup>
import { computed, ref, watch } from 'vue'
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
        { property: 'og:title', content: '專業豹紋守宮繁育與爬蟲知識 | Gencko Studio' },
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

// 熱門精選：處理圖片載入失敗（避免部分卡片顯示成黑塊）
const hotImgErrorIds = ref(new Set())
const isHotImgError = (id) => hotImgErrorIds.value.has(id)
const onHotImgError = (id) => {
    if (!id) return
    const next = new Set(hotImgErrorIds.value)
    next.add(id)
    hotImgErrorIds.value = next
}

// 圖片成功載入後，清掉該 id 的錯誤狀態（避免短暫錯誤導致之後一直顯示白底）
const onHotImgLoad = (id) => {
    if (!id) return
    if (!hotImgErrorIds.value.has(id)) return
    const next = new Set(hotImgErrorIds.value)
    next.delete(id)
    hotImgErrorIds.value = next
}

// 熱門精選：偵測是否有「不同個體共用同一張圖片」的資料問題（只在開發模式輸出）
watch(
    hotList,
    (list) => {
        if (!import.meta.dev) return
        if (!Array.isArray(list) || list.length === 0) return

        const normalizeForCompare = (raw) => {
            try {
                let t = String(raw || '').trim()
                if (!t) return ''
                // 盡量模擬 getCleanUrl 的正規化流程，用來抓「看似不同字串但其實同一張圖」的情況
                if (t.includes('wsrv.nl')) {
                    try {
                        const u = new URL(t)
                        t = u.searchParams.get('url') || t
                    } catch (e) {}
                }
                try { t = decodeURIComponent(t) } catch (e) {}
                if (t.includes('cdn.jsdelivr.net/gh/')) {
                    t = t
                        .replace('https://cdn.jsdelivr.net/gh/', 'https://raw.githubusercontent.com/')
                        .replace('@main/', '/main/')
                        .replace('@master/', '/master/')
                }
                t = t.replace(/^https?:\/\//, '')
                return t
            } catch (e) {
                return ''
            }
        }

        const byUrl = new Map()
        for (const item of list) {
            const url = (item?.ImageURL || '').trim()
            if (!url) continue
            const key = normalizeForCompare(url) || url
            if (!byUrl.has(key)) byUrl.set(key, [])
            byUrl.get(key).push({ id: item.ID, morph: item.Morph, url })
        }

        const duplicates = []
        for (const [url, items] of byUrl.entries()) {
            if (items.length >= 2) duplicates.push({ url, items })
        }

        if (duplicates.length) {
            console.warn('[Hot Picks] 發現多個個體共用同一張（正規化後）圖片：', duplicates)
        }
    },
    { immediate: true }
)
</script>

<template>
    <div class="home-page-wrapper">
        <!-- Hero Section -->
        <section class="home-header-wrap home-hero" aria-label="品牌形象首圖">
            <div class="hero-content hero-content-inner">
                <h1 class="hero-main-title">
                    <SparklesText>
                        <RadiantText :duration="2">GENCKO STUDIO</RadiantText>
                    </SparklesText>
                </h1>
                <GradientButton :border-radius="12" :border-width="2" :duration="2500" class="hero-bento-gb">
                    <div class="hero-bento">
                        <a href="https://www.instagram.com/gencko_breeding" target="_blank" class="bento-btn" rel="noopener noreferrer">IG</a>
                        <a href="https://www.facebook.com/profile.php?id=61579393505049&locale=zh_TW" target="_blank" class="bento-btn" rel="noopener noreferrer">FB</a>
                        <a href="https://myship.7-11.com.tw/general/detail/GM2509175195515" target="_blank" class="bento-btn" rel="noopener noreferrer">賣貨便</a>
                        <a href="https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg" target="_blank" class="bento-btn bento-btn--wide" rel="noopener noreferrer">
                            🔥 點擊加入社群享優惠
                        </a>
                    </div>
                </GradientButton>
            </div>
        </section>

        <!-- Mobile Only: Scenarios Bento (同形式，但不與上方合併) -->
        <section class="mobile-only home-scenario-bento-wrap" aria-label="快速導覽（手機）">
            <div class="scenario-bento-box" aria-hidden="false">
                <nav class="hero-bento hero-bento--scenario" aria-label="快速導覽">
                    <button type="button" class="bento-btn bento-btn--scenario" @click="setBeginnerMode">🌱 新手入門</button>
                    <NuxtLink to="/auction" class="bento-btn bento-btn--scenario" style="text-decoration:none;" aria-label="線上競標">🔨 線上競標</NuxtLink>
                    <NuxtLink to="/calculator" class="bento-btn bento-btn--scenario" style="text-decoration:none;" aria-label="基因計算">🧬 基因計算</NuxtLink>
                    <NuxtLink to="/hospital" class="bento-btn bento-btn--scenario" style="text-decoration:none;" aria-label="特寵醫院">🏥 特寵醫院</NuxtLink>
                </nav>
            </div>
        </section>
        
        <!-- Scenarios Navigation -->
        <nav class="home-scenario-grid" aria-label="快速導覽">
            <div class="scenario-card" @click="setBeginnerMode" role="button" tabindex="0">
                <div class="scenario-body">
                    <div class="scenario-icon">🌱</div>
                    <div class="scenario-title">新手入門</div>
                </div>
                <div class="scenario-hint">篩選好養、健康、預算友善的守宮</div>
            </div>
            <NuxtLink to="/auction" class="scenario-card" style="text-decoration:none; display:block; color:inherit; position:relative;">
                <div v-if="hasActiveAuction" class="live-badge">🔥 競標中</div>
                <div class="scenario-body">
                    <div class="scenario-icon">🔨</div>
                    <div class="scenario-title">線上競標</div>
                </div>
                <div class="scenario-hint">即時出價，與玩家競拍心儀守宮</div>
            </NuxtLink>
            <NuxtLink to="/calculator" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-body">
                    <div class="scenario-icon">🧬</div>
                    <div class="scenario-title">基因計算</div>
                </div>
                <div class="scenario-hint">預測親代交配後代的基因組合</div>
            </NuxtLink>
            <NuxtLink to="/hospital" class="scenario-card" style="text-decoration:none; display:block; color:inherit;">
                <div class="scenario-body">
                    <div class="scenario-icon">🏥</div>
                    <div class="scenario-title">特寵醫院</div>
                </div>
                <div class="scenario-hint">找尋全台特殊寵物就醫地點</div>
            </NuxtLink>
        </nav>

        <!-- Hot Picks Section -->
        <section class="home-section home-hot-picks" aria-labelledby="hot-picks-title">
            <div class="section-head hot-picks-head">
                <h2 id="hot-picks-title" class="sec-title">熱門精選</h2>
                <NuxtLink to="/shop" class="sec-more" style="text-decoration:none;" aria-label="查看更多熱門商品">查看更多 &rarr;</NuxtLink>
            </div>
            
            <div v-if="loading && hotList.length === 0" class="hot-skeleton-wrapper">
                <SkeletonCard v-for="n in 5" :key="n" style="width:220px; flex-shrink:0;" :img-height="180" />
            </div>

            <div
                v-else-if="hotList.length > 0"
                class="hot-marquee-mask"
                style="background: transparent; mask-image: none; -webkit-mask-image: none; backdrop-filter: none; -webkit-backdrop-filter: none;"
            >
                <div class="hot-marquee-rows" aria-label="熱門精選跑馬燈">
                    <AppMarquee :duration="48" :gap-px="14" seam-offset="calc(var(--hot-card-overlap, 44px) / 2)" aria-label="熱門精選跑馬燈第一行">
                        <template #default="{ groupIndex }">
                            <div
                                class="hot-card-wrap"
                                v-for="(i, idx) in [...hotList, hotList[0]]"
                                :key="'r1-' + (i?.ID ?? 'seam') + '-' + groupIndex + '-' + idx"
                                :style="{ '--hot-i': String(Number(idx) + (Number(groupIndex) * (hotList.length + 1))) }"
                            >
                                <div class="hot-card-back" aria-hidden="true"></div>
                                <div class="hot-card-item">
                                    <NuxtLink :to="i?.ID ? `/product/${i.ID}` : '/shop'" class="hot-card-link">
                                    <div class="hot-card-layer">
                                        <div class="hot-card-media">
                                            <img
                                                v-if="i.ImageURL && !isHotImgError(i.ID)"
                                                :src="getCleanUrl(i.ImageURL, 300)"
                                                :alt="i.Morph + ' 守宮'"
                                                class="hot-card-img"
                                                loading="lazy"
                                                decoding="async"
                                                @load="onHotImgLoad(i.ID)"
                                                @error="onHotImgError(i.ID)"
                                            />
                                            <div v-else class="hot-card-img hot-card-img--placeholder">🦎</div>
                                        </div>
                                        <div v-if="i.Status === 'Sold'" class="hot-stamp hot-stamp-sold">SOLD</div>
                                        <div v-else-if="i.Status === 'Auction' && auctionList.some(a => a.animal_id === i.ID)" class="hot-stamp hot-stamp-auction">🔨競標</div>
                                    </div>
                                    <div class="hot-card-body-overlay">
                                        <h3 class="hot-card-title">{{ i.Morph }}</h3>
                                    </div>
                                    </NuxtLink>
                                </div>
                            </div>
                        </template>
                    </AppMarquee>

                    <AppMarquee :duration="54" :gap-px="14" :reverse="true" seam-offset="calc(var(--hot-card-overlap, 44px) / 2)" aria-label="熱門精選跑馬燈第二行">
                        <template #default="{ groupIndex }">
                            <div
                                class="hot-card-wrap"
                                v-for="(i, idx) in [...hotList, hotList[0]]"
                                :key="'r2-' + (i?.ID ?? 'seam') + '-' + groupIndex + '-' + idx"
                                :style="{ '--hot-i': String(Number(idx) + (Number(groupIndex) * (hotList.length + 1))) }"
                            >
                                <div class="hot-card-back" aria-hidden="true"></div>
                                <div class="hot-card-item">
                                    <NuxtLink :to="i?.ID ? `/product/${i.ID}` : '/shop'" class="hot-card-link">
                                    <div class="hot-card-layer">
                                        <div class="hot-card-media">
                                            <img
                                                v-if="i.ImageURL && !isHotImgError(i.ID)"
                                                :src="getCleanUrl(i.ImageURL, 300)"
                                                :alt="i.Morph + ' 守宮'"
                                                class="hot-card-img"
                                                loading="lazy"
                                                decoding="async"
                                                @load="onHotImgLoad(i.ID)"
                                                @error="onHotImgError(i.ID)"
                                            />
                                            <div v-else class="hot-card-img hot-card-img--placeholder">🦎</div>
                                        </div>
                                        <div v-if="i.Status === 'Sold'" class="hot-stamp hot-stamp-sold">SOLD</div>
                                        <div v-else-if="i.Status === 'Auction' && auctionList.some(a => a.animal_id === i.ID)" class="hot-stamp hot-stamp-auction">🔨競標</div>
                                    </div>
                                    <div class="hot-card-body-overlay">
                                        <h3 class="hot-card-title">{{ i.Morph }}</h3>
                                    </div>
                                    </NuxtLink>
                                </div>
                            </div>
                        </template>
                    </AppMarquee>
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
                            <!-- 🌟 核心修正：NuxtImg 替換為原生 img -->
                            <img 
                                v-if="item.ImageURL" 
                                :src="getCleanUrl(item.ImageURL, 600)" 
                                :alt="item.Title" 
                                class="card-img" 
                                style="height:180px;" 
                                loading="lazy" 
                                decoding="async"
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

/* 熱門輪播狀態小 badge */
.hot-stamp {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 2px 7px;
    border-radius: 10px;
    font-size: 0.68rem;
    font-weight: bold;
    color: #fff;
    z-index: 10;
    pointer-events: none;
}
.hot-stamp-sold { background: #555; }
.hot-stamp-auction { background: var(--pri); box-shadow: 0 0 8px var(--pri-glow); }

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
    padding: 0 10px 12px 10px;
    text-align: center;
}

.hero-main-title {
    font-size: 2.5rem;
    font-weight: 900;
    margin-top: 0;
    margin-bottom: 10px;
    letter-spacing: 1px;
    text-shadow: 0 0 25px var(--pri-glow);
    color: var(--txt);
    line-height: 1.1;
    overflow: visible;
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

/* ── Hero 桌機並排 ── */
@media (min-width: 769px) {
    /* 解除全域 max-width: 700px 限制 */
    .hero-content { max-width: none; }
    .hero-content-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 32px;
        width: 100%;
        text-align: left;
    }
    .hero-main-title {
        margin-bottom: 0;
        flex: 1;
        font-size: clamp(2.5rem, 6.5vw, 6rem);
        line-height: 1;
        white-space: nowrap;
    }
    .hero-bento-gb { flex: 1; }
}

/* ── Scenario 卡片 ── */
.scenario-card {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    /* icon 改到文字左側後，整體高度同步縮減 */
    padding: 10px 10px;
    border-radius: 12px;
    text-align: center;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    position: relative;
    overflow: hidden;
    box-shadow: 4px 4px 0 var(--scenario-shadow);
}
.scenario-card:active {
    transform: translate(4px, 4px);
    box-shadow: 0 0 0 var(--scenario-shadow);
}
.scenario-body {
    transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}
.scenario-icon { font-size: 2rem; margin-bottom: 0; line-height: 1; }
.scenario-title {
    font-weight: bold;
    color: var(--pri);
    margin-bottom: 0;
    font-size: 0.95rem;
}

/* hint：僅桌機 hover 顯示 */
.scenario-hint { display: none; }

@media (hover: hover) and (pointer: fine) {
    .scenario-hint {
        display: block;
        position: absolute;
        bottom: 0; left: 0; right: 0;
        padding: 10px 8px 12px;
        font-size: 0.88rem;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(to top, rgba(232,80,10,0.95) 0%, rgba(232,80,10,0.6) 70%, transparent 100%);
        transform: translateY(100%);
        transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
        pointer-events: none;
        text-align: center;
        line-height: 1.3;
    }
    .scenario-card:hover .scenario-hint {
        transform: translateY(0);
    }
    /* hint 滑入時，body 同步往上推 ~20px */
    .scenario-card:hover .scenario-body {
        transform: translateY(-20px);
    }
    .scenario-card:hover {
        border-color: rgba(255, 110, 10, 0.6);
    }
}


/* 首頁區塊：桌機全透明，讓背景蜂巢紋路透出 */
.home-section {
    margin-bottom: 30px;
    background: transparent;
    padding: 20px 0;
    border-radius: 0;
    border: none;
    box-shadow: none;
}

.hot-picks-head {
    margin: 0;
    padding-bottom: 0;
    border-bottom: none;
}

/* ── Hero Bento 按鈕群 ── */
.hero-bento-gb {
    width: 100%;
}
.hero-bento {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    width: 100%;
}
.bento-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 14px 10px;
    border-radius: 0;
    background: transparent;
    border: none;
    color: var(--txt);
    font-weight: 700;
    font-size: 0.95rem;
    text-decoration: none;
    transition: background 0.2s, color 0.15s;
    text-align: center;
    white-space: nowrap;
}
/* 上排三格之間的灰色垂直分隔線 */
.hero-bento .bento-btn:nth-child(1),
.hero-bento .bento-btn:nth-child(2) {
    border-right: 1px solid var(--bd);
}
.bento-btn--wide {
    grid-column: 1 / -1;
    background: var(--pri);
    color: #fff;
    box-shadow: 0 4px 14px var(--pri-glow);
    font-size: 1rem;
}
@media (hover: hover) and (pointer: fine) {
    .bento-btn:not(.bento-btn--wide):hover { color: var(--pri); background: rgba(255, 110, 10, 0.08); }
    /* wide 只改背景，不用 translateY 避免底部露出 gb-inner 背景 */
    .bento-btn--wide:hover { background: var(--pri-light); }
}
.bento-btn:active { transform: scale(0.97); }

/* 熱門精選：區塊本體不要任何底色/陰影（避免看起來像卡片底部有一條灰色軌道） */
.home-section.home-hot-picks {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding-top: 4px;
    margin-bottom: 6px;
}

.home-section.articles-section {
    padding-top: 6px;
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
    /* 僅限手機：熱門精選移到最上方，取代 Hero 標題（Hero 主標隱藏、熱門精選標題隱藏） */
    .home-page-wrapper {
        display: flex;
        flex-direction: column;
        padding: 0;
    }

    .home-hot-picks {
        order: -10;
        /* 熱門精選、IG 按鈕、新手入門：區塊間距為 0 */
        margin-top: 0;
    }

    .home-hero {
        order: -9;
    }

    .home-header-wrap {
        padding-bottom: 0;
    }

    .hero-main-title {
        display: none;
    }

    /* 僅限手機：熱門精選 header 整排移除（不顯示標題/查看更多，也不佔高度） */
    .home-hot-picks .hot-picks-head {
        display: none;
    }

    /* 僅限手機：縮減（按鈕/內容）與熱門精選卡片的距離 */
    .hot-picks-head {
        margin-bottom: 0;
    }

    .home-hot-picks .hot-marquee-mask {
        padding-top: 0px !important;
        padding-bottom: 0px !important;
    }

    /* 僅限手機：熱門精選區塊最底層完全透明（移除任何底色/邊框造成的「灰色軌道」） */
    .home-section.home-hot-picks {
        background: transparent !important;
        box-shadow: none !important;
        border: none !important;
        border-bottom: none !important;
    }

    /* 僅限手機：縮小兩行外層容器間距 */
    .home-hot-picks .hot-marquee-rows {
        gap: 0px !important;
    }

    /* 既然主標已隱藏，就不需要再調整字級/間距 */

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

    /* 手機：桌機版 scenario grid 不顯示（改用獨立的 scenario bento） */
    .home-scenario-grid { display: none; }

    /* 手機：新手入門四顆（scenario bento）高度大幅縮減 */
    .home-scenario-bento-wrap {
        margin-top: 0;
    }
    
    .scenario-card { 
        padding: 5px 0px; 
        border-radius: 10px; 
    }
    
    .scenario-icon { 
        font-size: 1rem; 
        margin-bottom: 0; 
    }
    
    .scenario-title { 
        font-size: 0.9rem; 
        margin-bottom: 0px; 
    }
    
    .scenario-desc { 
        font-size: 0rem; 
        white-space: nowrap; 
        overflow: hidden; 
        text-overflow: ellipsis; 
    }

    .home-section {
        padding: 0px 0;
        margin-bottom: 0;
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
        /* 取消左右 padding，讓左右邊界陰影都覆蓋到卡片內容，視覺才會對稱 */
        padding-left: 0px;
        padding-right: 0px;
        padding-top: 16px;
        padding-bottom: 16px;
        overflow-x: hidden;
        overflow-y: visible;
        background: transparent !important;
        /* 外層容器全透明：關閉 mask 漸層，避免出現「上面較透明/下面較不透明」的灰色軌道視覺 */
        mask-image: none !important;
        -webkit-mask-image: none !important;
    }

    .hot-marquee-rows {
        display: grid;
        grid-template-rows: auto auto;
        gap: 22px;
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

@media (max-width: 768px) {
    /* 手機：IG 三顆按鈕高度大幅縮減（保留桌面版的貼齊/分隔線形式） */
    .hero-bento:not(.hero-bento--scenario) .bento-btn:not(.bento-btn--wide) {
        padding: 8px 0;
        font-size: 0.85rem;
    }

    /* 手機：加入社群按鈕也同步縮減 */
    .bento-btn--wide {
        grid-column: 1 / -1;
        padding: 9px 10px;
        font-size: 0.9rem;
    }

    /* 手機：快速導覽四個按鈕要四個並排，且間距為 0（同桌機 IG 三顆的貼齊感） */
    .hero-bento--scenario {
        grid-template-columns: repeat(4, 1fr);
        gap: 0;
    }

    /* 四顆之間的垂直分隔線（貼齊） */
    .hero-bento--scenario .bento-btn--scenario:nth-child(1),
    .hero-bento--scenario .bento-btn--scenario:nth-child(2),
    .hero-bento--scenario .bento-btn--scenario:nth-child(3) {
        border-right: 1px solid var(--bd);
    }

    /* 手機：新手入門四顆按鈕高度大幅縮減 */
    .hero-bento--scenario .bento-btn--scenario {
        padding: 8px 0;
        font-size: 0.82rem;
    }
}

.mobile-only { display: none; }
@media (max-width: 768px) {
    .mobile-only { display: block; }
    .home-scenario-bento-wrap { margin-top: 0; }
    .hero-bento--scenario { margin-top: 0; }
}

/* 手機：新手入門四顆按鈕外框改用陰影（移除 GradientButton 特效） */
.scenario-bento-box {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    background: var(--card-bg);
    border: 1px solid var(--bd);
    box-shadow: 4px 4px 0 var(--scenario-shadow);
}

/* 手機：讓「新手入門四顆」區塊寬度與上方 IG 三顆一致（同樣吃到 home-header-wrap 的左右 padding） */
@media (max-width: 768px) {
    .home-scenario-bento-wrap {
        padding: 0 10px;
        box-sizing: border-box;
    }
}

/* 熱門精選：卡片傾斜 + 重疊（桌機/手機一致），但 hover 回正只在桌機生效 */
/* 注意：scoped style 內的 `:root {}` 會被加上 scope attribute 而失效
   所以這些 CSS 變數改掛在熱門精選容器上，確保一定生效。 */
.hot-marquee-mask {
    /* 熱門精選卡片大小（桌機預設） */
    --hot-card-scale: 0.88;
    --hot-card-w: 200px;
    --hot-card-h: 170px;
    /* 左卡蓋住右卡 1/4（視覺上縮小後，重疊也要跟著縮小） */
    --hot-card-overlap: calc(var(--hot-card-w) * var(--hot-card-scale) * 0.25);
    /* 橘色背板偏移 */
    --hot-orange-x: 6px;
    --hot-orange-y: 5px;

    padding-block: 0;
    overflow-x: hidden;
    overflow-y: visible;
    background: transparent !important;
    mask-image: none !important;
    -webkit-mask-image: none !important;
}

/* 手機：縮小一點，但動畫/傾斜/重疊一致（不做 hover 回正） */
@media (max-width: 767px) {
    .hot-marquee-mask {
        --hot-card-scale: 0.88;
        --hot-card-w: 150px;
        --hot-card-h: 130px;
        --hot-card-overlap: calc(var(--hot-card-w) * var(--hot-card-scale) * 0.25);
        padding-block: 0px;
    }
}

:deep(.app-marquee) {
    overflow-x: hidden;
    overflow-y: visible;
    background: transparent !important;
}

/* 移除 track 在兩組內容之間的 gap，避免頭尾接縫出現空隙 */
:deep(.app-marquee__track) {
    gap: 0;
    background: transparent !important;
}

:deep(.app-marquee__group) {
    gap: 0;
    background: transparent !important;
}

/* 消除循環接縫：讓第二份內容的第一張卡也吃到「1/4 重疊」 */
:deep(.app-marquee__group + .app-marquee__group) {
    margin-left: calc(var(--hot-card-overlap, 44px) * -1);
}

:deep(.hot-card-wrap) {
    width: var(--hot-card-w, 200px);
    position: relative;
    transform-style: preserve-3d;
    transform-origin: 50% 50%;
    /* 預設就傾斜（桌機/手機一致） */
    transform: perspective(900px) rotateY(-26deg) scale(var(--hot-card-scale, 0.88)) !important;
    transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
    will-change: transform;
    /* 讓左邊卡片層級高於右邊（idx 越小，z-index 越大） */
    z-index: calc(1000 - (var(--hot-i, 0) * 2));
    /* 讓背板/陰影在卡片本體外也能正常呈現（避免被隔壁卡片或容器堆疊吃掉） */
    isolation: isolate;
    /* 陰影改掛在外層，避免白卡 box-shadow 在底部疊出「灰色軌道」 */
    /* 移除外層陰影（避免底部出現軌道感） */
    filter: none !important;
}

:deep(.hot-card-back) {
    position: absolute;
    /* 略縮小背板，避免光暈在白卡四周形成一圈「橘框」的錯覺 */
    inset: 2px;
    border-radius: calc(var(--radius-md) - 2px);
    /* 橘色背板：透明度 50% */
    background: rgba(255, 108, 0, 0.5);
    transform: translate(var(--hot-orange-x, 10px), var(--hot-orange-y, 8px));
    /* 只保留偏移光暈，不做 blur（blur 會向四周擴散，容易看起來像白卡有橘框） */
    filter: drop-shadow(6px 5px 12px rgba(255, 108, 0, 0.16));
    z-index: 0;
    pointer-events: none;
}

:deep(.home-hot-picks .hot-card-item) {
    position: relative;
    z-index: 1;
    width: 100%;
    height: var(--hot-card-h, 170px);
    background: var(--card-bg-solid);
    /* 白卡片：不要框線 */
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    filter: none !important;
    border-radius: var(--radius-md);
    overflow: hidden;
    /* 傾斜改由 .hot-card-wrap 負責，避免被全域 .hot-card-item:hover transform 影響 */
    transform: none !important;
    /* 卡片本體：黑陰影，增加立體感 */
    transition: box-shadow 220ms ease, border-color 220ms ease;
}

/* 舊的 .card-img 規則保留在全站，但熱門精選已改用 .hot-card-media/.hot-card-img */

/* 熱門精選：圖片完全貼合卡片的媒體區塊（不受全站 .card-img 固定高度影響） */
:deep(.hot-card-media) {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    /* 保持完全透明，避免形成「軌道底色」 */
    background: transparent !important;
}

:deep(.hot-card-link) {
    display: block;
    height: 100%;
    text-decoration: none;
    color: inherit;
    position: relative;
}

:deep(.hot-card-layer) {
    position: relative;
    height: 100%;
}

:deep(.hot-card-img) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

:deep(.hot-card-img--placeholder) {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    font-size: 2.6rem;
    background: transparent !important;
}

:deep(.hot-card-body-overlay) {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 10px 10px 10px 10px;
    text-align: center;
    /* 如果這段漸層被視覺誤認為「灰色軌道」，就讓它完全透明（文字仍靠 text-shadow 保持可讀） */
    background: transparent;
    pointer-events: none;
}

:deep(.hot-card-title) {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1.2;
    color: #fff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.55);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

:deep(.hot-card-wrap:not(:first-child)) {
    /* 左卡蓋右卡 1/4（以縮放後的可視寬度計算） */
    margin-left: calc(var(--hot-card-overlap, 44px) * -1);
}

/* 保險：把全域 .hot-card-item:hover 的 transform 強制歸零，避免覆蓋造成看起來「沒斜」 */
:deep(.hot-card-item:hover),
:deep(.hot-card-item:focus-within) {
    transform: none !important;
}

/* 桌機（有 hover 的裝置）才做 hover 回正 */
@media (hover: hover) and (pointer: fine) {
    :deep(.hot-card-wrap:hover) {
        z-index: 2000;
    }

    :deep(.hot-card-wrap:hover),
    :deep(.hot-card-wrap:focus-within) {
        transform: perspective(900px) rotateY(0deg) translateY(-6px) scale(var(--hot-card-scale, 0.88)) !important;
    }

    :deep(.hot-card-wrap:hover .hot-card-item),
    :deep(.hot-card-wrap:focus-within .hot-card-item) {
        /* hover 時再補一點本體陰影，提升立體感 */
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.26);
        border-color: rgba(0, 0, 0, 0.22);
    }
}
</style>
