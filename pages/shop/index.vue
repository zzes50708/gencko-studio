<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { GENES_DB } from '~/utils/genes-db.js'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const route = useRoute()
const router = useRouter()

useHead({
    title: '線上選購守宮',
    meta:[
        { name: 'description', content: 'Gencko Studio 提供多樣化的豹紋守宮與肥尾守宮選購。透過進階篩選功能，依據基因、性別、價格找到您的夢幻守宮。' },
        { property: 'og:title', content: '線上選購守宮 | Gencko Studio' },
        { property: 'og:description', content: 'Gencko Studio 提供多樣化的豹紋守宮與肥尾守宮選購。透過進階篩選功能，依據基因、性別、價格找到您的夢幻守宮。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/shop' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link:[
        { rel: 'canonical', href: 'https://www.genckobreeding.com/shop' }
    ]
})

// --- 狀態管理 ---
const sp = ref('豹紋守宮')
const kw = ref('')
const fil = ref({ stock: true, sold: false, minP: '', maxP: '', sexM: true, sexF: true, genes: [ ], beginner: false })
const showMobileFilter = ref(false)
const openFCat = ref(null)
const sortOrder = ref('default')
const showOnlyFav = ref(false)
const showOnlyHistory = ref(false)

const tags = {
    '豹紋守宮':[ '黑夜', '蜜橘', '紅鑽石', '土匪' ],
    '肥尾守宮':[ '幽靈', '橘白', '無紋', '立可白' ]
}

// 處理首頁傳過來的新手推薦參數
onMounted(() => {
    if (route.query.beginner === 'true') {
        fil.value.beginner = true
        showMobileFilter.value = true
        router.replace({ path: '/shop' }) 
    }
})

// --- 計算屬性 ---
const maxPrice = computed(() => {
    const prices = store.inv.filter(i => i.Species === sp.value && i.Status === 'ForSale').map(i => Number(i.ListingPrice) || 0)
    return prices.length ? Math.max(...prices) : 0
})

const availableGenes = computed(() => {
    const s = new Set()
    const targetStatus = fil.value.sold ?[ 'ForSale', 'Sold', 'Reserved' ] :[ 'ForSale', 'Reserved' ]
    store.inv.filter(i => i.Species === sp.value && targetStatus.includes(i.Status)).forEach(i => {
        if (Array.isArray(i.Genes)) i.Genes.forEach(g => s.add(g === '白黃' ? 'WY' : g))
    })
    return Array.from(s)
})

const isGeneAvail = (g) => availableGenes.value.includes(g)

const getSortedGenes = (list) => {
    return [ ...list ].sort((a, b) => (isGeneAvail(b) ? 1 : 0) - (isGeneAvail(a) ? 1 : 0))
}

const shopList = computed(() => {
    let l = store.inv.filter(i => {
        if (i.Species !== sp.value || i.Status === 'Trash' || i.Status === 'NotForSale') return false
        const isSold = i.Status === 'Sold'
        const isStock = i.Status === 'ForSale' || i.Status === 'Reserved'
        if (!fil.value.sold && isSold) return false
        if (!fil.value.stock && isStock) return false
        
        const p = Number(i.ListingPrice) || 0
        if (fil.value.minP && p < fil.value.minP) return false
        if (fil.value.maxP && p > fil.value.maxP) return false

        const sex = i.GenderType
        const isM = sex === '公' || (sex === '溫度' && Number(i.GenderValue) >= 30)
        const isF = sex === '母' || (sex === '溫度' && Number(i.GenderValue) <= 27)
        if (!fil.value.sexM && isM) return false
        if (!fil.value.sexF && isF) return false

        if (fil.value.beginner && (!i.Note || !i.Note.includes('新手推薦'))) return false

        if (fil.value.genes.length > 0) {
            const iGenes = Array.isArray(i.Genes) ? i.Genes : [ ]
            if (!fil.value.genes.every(g => iGenes.includes(g))) return false
        }
        return true
    })

    if (kw.value) l = l.filter(i => JSON.stringify(i).toLowerCase().includes(kw.value.toLowerCase()))
    if (showOnlyFav.value) l = l.filter(i => store.wishlist.includes(i.ID))
    if (showOnlyHistory.value) l = l.filter(i => store.history.includes(i.ID))
    
    return l.sort((a, b) => {
        const imgA = a.ImageURL ? 1 : 0
        const imgB = b.ImageURL ? 1 : 0
        if (imgA !== imgB) return imgB - imgA

        const statA = a.Status === 'Sold' ? 1 : 0
        const statB = b.Status === 'Sold' ? 1 : 0
        if (statA !== statB) return statA - statB
        
        const priceA = Number(a.ListingPrice) || 0
        const priceB = Number(b.ListingPrice) || 0
        if (sortOrder.value === 'price_asc') return priceA - priceB
        if (sortOrder.value === 'price_desc') return priceB - priceA
        
        return priceB - priceA
    }).slice(0, store.displayLimit)
})

// --- 方法 ---
const toggleTag = (t) => { 
    kw.value = (kw.value === t) ? '' : t
    store.displayLimit = 20 
}

let searchTimer = null
const onSearchInput = (e) => {
    const val = e.target.value
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => { 
        kw.value = val
        store.displayLimit = 20 
    }, 300)
}

const resetFilters = () => {
    fil.value = { stock: true, sold: false, minP: '', maxP: '', sexM: true, sexF: true, genes: [ ], beginner: false }
    kw.value = ''
    store.displayLimit = 20
    showMobileFilter.value = false
    if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const toggleWishlist = (id) => {
    if (store.wishlist.includes(id)) {
        store.wishlist = store.wishlist.filter(x => x !== id)
    } else {
        store.wishlist.push(id)
    }
    if (import.meta.client) localStorage.setItem('gencko_wishlist', JSON.stringify(store.wishlist))
}
</script>

<template>
    <div class="shop-page-wrapper">
        <!-- 桌機版保留的標題，手機版隱藏以節省空間 -->
        <h1 class="page-title dt-only">線上選購守宮</h1>

        <div class="shop-layout">
            <!-- 🌟 Left Filter Panel (Desktop View & Mobile Modal View) -->
            <div class="filter-panel" :class="{ 'm-show': showMobileFilter }">
                <div class="f-header m-only">
                    <span>進階篩選</span>
                    <button class="btn-close" @click="showMobileFilter = false">✕</button>
                </div>
                
                <div class="f-group">
                    <div class="f-label">精選標籤</div>
                    <label class="f-check" style="color:var(--pri); font-weight:bold;">
                        <input type="checkbox" v-model="fil.beginner"> 🌱 新手推薦
                    </label>
                </div>
                <div class="f-group">
                    <div class="f-label">庫存狀態</div>
                    <label class="f-check"><input type="checkbox" v-model="fil.stock"> 有庫存</label>
                    <label class="f-check"><input type="checkbox" v-model="fil.sold"> 已售出</label>
                </div>
                <div class="f-group">
                    <div class="f-label">價格 (最高: {{ maxPrice }})</div>
                    <div style="display:flex;gap:5px;">
                        <input type="number" v-model="fil.minP" class="f-inp" placeholder="Min">
                        <input type="number" v-model="fil.maxP" class="f-inp" placeholder="Max">
                    </div>
                </div>
                <div class="f-group">
                    <div class="f-label">性別</div>
                    <label class="f-check"><input type="checkbox" v-model="fil.sexM"> 公 (含公溫)</label>
                    <label class="f-check"><input type="checkbox" v-model="fil.sexF"> 母 (含母溫)</label>
                </div>
                <div class="f-group" style="padding-bottom: 30px;">
                    <div class="f-label">基因篩選</div>
                    <div v-for="(list, cat) in GENES_DB[sp]" :key="cat">
                        <div class="f-cat" @click="openFCat = (openFCat === cat) ? null : cat">{{ cat }} <small>{{ openFCat === cat ? '▲' : '▼' }}</small></div>
                        <div v-show="openFCat === cat" style="padding-left:10px;">
                            <div v-for="g in getSortedGenes(list)" :key="g" style="margin:2px 0;">
                                <label class="f-check" :class="{disabled: !isGeneAvail(g)}">
                                    <input type="checkbox" :value="g" v-model="fil.genes" :disabled="!isGeneAvail(g)"> 
                                    {{ g }}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="m-filter-actions m-only">
                    <button class="btn-clear" @click="resetFilters">清除條件</button>
                    <button class="btn-apply" @click="showMobileFilter = false">套用設定</button>
                </div>

                <button class="btn-hero dt-only" style="width:100%;margin-top:20px;font-size:0.9rem;padding:10px;" @click="resetFilters">清除所有條件</button>
            </div>

            <!-- 🌟 Right Content (Search, Chips, Grid) -->
            <div style="flex:1; min-width:0; display: flex; flex-direction: column;">
                
                <!-- 🌟 App-like 控制列：合併搜尋框與篩選按鈕 -->
                <div class="search-filter-row">
                    <div class="inp-wrap">
                        <span class="search-icon">🔍</span>
                        <input class="inp" :value="kw" @input="onSearchInput" placeholder="搜尋品系、基因、ID...">
                    </div>
                    <button class="btn-filter-icon m-only" :class="{active: fil.genes.length > 0 || fil.beginner}" @click="showMobileFilter = true" aria-label="進階篩選">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                    </button>
                </div>
                
                <!-- 🌟 App-like 水平捲動 Chips -->
                <div class="scroll-chips-row">
                    <div class="chip-tab main-tab" :class="{active: sp === '豹紋守宮'}" @click="sp = '豹紋守宮'; store.displayLimit = 20">豹紋守宮</div>
                    <div class="chip-tab main-tab" :class="{active: sp === '肥尾守宮'}" @click="sp = '肥尾守宮'; store.displayLimit = 20">肥尾守宮</div>

                    <div class="chip-divider"></div>

                    <select v-model="sortOrder" class="chip-select">
                        <option value="default">預設排序</option>
                        <option value="price_asc">價格由低到高</option>
                        <option value="price_desc">價格由高到低</option>
                    </select>
                    
                    <div class="chip-toggle" :class="{active: showOnlyHistory}" @click="showOnlyHistory = !showOnlyHistory">🕒 瀏覽</div>
                    <div class="chip-toggle" :class="{active: showOnlyFav}" @click="showOnlyFav = !showOnlyFav">❤ 收藏</div>

                    <div class="chip-divider"></div>

                    <span v-for="t in tags[sp]" :key="t" class="chip-tag" :class="{sel: kw === t}" @click="toggleTag(t)">{{ t }}</span>
                </div>

                <!-- Shop Grid (Photo Grid) -->
                <transition-group tag="div" name="list" class="grid photo-grid">
                    <div v-if="shopList.length === 0" key="empty-msg" class="shop-empty-state">
                        <div class="empty-icon">🦎💤</div>
                        <h3 style="color:var(--txt); margin-bottom:10px;">找不到符合的守宮</h3>
                        <p style="font-size:0.9rem;">牠們可能躲起來睡覺了，或是被買光囉！<br>試著調整篩選條件，或直接私訊我們許願吧。</p>
                        <button class="btn-hero" @click="resetFilters" style="margin-top:20px;">🔄 清除篩選條件</button>
                    </div>
                    
                    <!-- 1. v-for 增加 index -->
                    <NuxtLink :to="`/product/${i.ID}`" class="card slim-card" v-for="(i, index) in shopList" :key="i.ID" style="text-decoration:none; color:inherit;">
                        <div v-if="i.Status === 'Sold'" class="sold-stamp">SOLD</div>
                        <div style="position:absolute;top:5px;right:5px;z-index:10;">
                            <span class="fav-btn" :class="{active: store.wishlist.includes(i.ID)}" @click.stop.prevent="toggleWishlist(i.ID)">❤</span>
                        </div>
                        <div style="position:relative;">
                            <NuxtImg 
                             v-if="i.ImageURL" 
                             :src="getCleanUrl(i.ImageURL)" 
                             :alt="i.Morph" 
                             class="card-img slim-img" 
                             :loading="index < 6 ? 'eager' : 'lazy'" 
                             :fetchpriority="index < 6 ? 'high' : 'auto'" 
                              width="220"
                              height="220"
                              fit="cover"
                              format="webp"
                               />
                            <div v-else class="card-img slim-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:2rem;background:#000;">🦎</div>
                            <div v-if="i.Status === 'ForSale'" class="trust-badge">🛡️ 100% HEALTH</div>
                        </div>
                        <div class="card-body slim-body">
                            <h3 class="slim-title" style="margin:0;">{{ i.Morph }}</h3>
                            <div class="slim-price-row" style="margin-top:4px;">
                                <div v-if="i.Status !== 'ForSale'">
                                    <span v-if="i.Status === 'Sold'" class="status-badge s-sold">已售出</span>
                                    <span v-else-if="i.Status === 'Reserved'" class="status-badge s-res">預訂</span>
                                    <span v-else-if="i.Status === 'NotForSale'" class="status-badge s-nfs">非賣</span>
                                </div>
                                <div v-else class="price slim-price">${{ i.ListingPrice }}</div>
                            </div>
                        </div>
                    </NuxtLink>
                </transition-group>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 
  [局部樣式修復] 
  已清除與 assets/css/style.css 重複的宣告與寫死色碼。
  全面導入 CSS 變數，移除所有不必要的 :global(body.day-mode) 覆寫。
*/

.shop-page-wrapper { 
    display: flex; 
    flex-direction: column; 
    width: 100%; 
    max-width: 1300px; 
    margin: 0 auto; 
}
.shop-layout { 
    display: flex; 
    gap: 20px; 
    align-items: flex-start; 
}

/* 🌟 Responsive Utilities */
.dt-only { display: block; }
.m-only { display: none !important; }

/* 🌟 App-like Search Row */
.search-filter-row { 
    display: flex; 
    gap: 10px; 
    align-items: center; 
    margin-bottom: 12px; 
    width: 100%; 
}
.inp-wrap { 
    position: relative; 
    flex: 1; 
    margin-bottom: 0; 
}
.inp { 
    width: 100%; 
    padding: 10px 12px 10px 35px; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    color: var(--txt); 
    border-radius: 8px; 
    box-sizing: border-box; 
    font-size: 0.95rem; 
    font-weight: 500; 
    transition: 0.3s; 
}
.inp:focus { 
    border-color: var(--pri); 
    outline: none; 
    box-shadow: 0 0 10px var(--pri-glow); 
}
.search-icon { 
    position: absolute; 
    left: 10px; 
    top: 50%; 
    transform: translateY(-50%); 
    color: var(--txt); 
    opacity: 0.5;
    font-size: 1rem; 
    pointer-events: none; 
}

.btn-filter-icon { 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    color: var(--txt); 
    border-radius: 8px; 
    width: 40px; 
    height: 40px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    cursor: pointer; 
    flex-shrink: 0; 
    transition: 0.2s; 
}
.btn-filter-icon.active { 
    background: var(--pri); 
    color: #fff; 
    border-color: var(--pri); 
    box-shadow: 0 0 8px var(--pri-glow); 
}

/* 🌟 Horizontal Scrolling Chips */
.scroll-chips-row { 
    display: flex; 
    gap: 6px; 
    overflow-x: auto; 
    padding-bottom: 8px; 
    margin-bottom: 10px; 
    scrollbar-width: none; 
    align-items: center; 
    white-space: nowrap; 
    -webkit-overflow-scrolling: touch; 
    width: 100%; 
}
.scroll-chips-row::-webkit-scrollbar { display: none; }

.chip-tab { 
    padding: 6px 12px; 
    border-radius: 20px; 
    font-size: 0.85rem; 
    font-weight: bold; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    cursor: pointer; 
    color: var(--txt); 
    opacity: 0.7;
    transition: 0.2s; 
    flex-shrink: 0; 
}
.chip-tab.active { 
    background: var(--pri); 
    color: #fff; 
    border-color: var(--pri); 
    box-shadow: 0 0 8px var(--pri-glow); 
    opacity: 1;
}

.chip-divider { 
    width: 1px; 
    height: 16px; 
    background: var(--bd); 
    flex-shrink: 0; 
    margin: 0 2px; 
    opacity: 0.5; 
}

.chip-select { 
    background: var(--card-bg); 
    color: var(--txt); 
    border: 1px solid var(--bd); 
    padding: 6px 10px; 
    border-radius: 20px; 
    font-size: 0.85rem; 
    font-weight: bold; 
    outline: none; 
    flex-shrink: 0; 
    cursor: pointer; 
    appearance: none; 
    text-align: center; 
}
.chip-select:focus { 
    border-color: var(--pri); 
}

.chip-toggle { 
    padding: 6px 10px; 
    border-radius: 20px; 
    border: 1px solid var(--bd); 
    cursor: pointer; 
    font-size: 0.8rem; 
    font-weight: bold; 
    color: var(--txt); 
    opacity: 0.7;
    background: var(--card-bg); 
    transition: 0.2s; 
    flex-shrink: 0; 
}
.chip-toggle.active { 
    background: #e91e63; 
    color: #fff; 
    border-color: #e91e63; 
    opacity: 1;
}
.chip-toggle.active:nth-child(5) { 
    background: #2196F3; 
    border-color: #2196F3; 
}

.chip-tag { 
    font-size: 0.8rem; 
    padding: 6px 10px; 
    background: var(--card-bg); 
    border: 1px dashed var(--bd); 
    border-radius: 20px; 
    color: var(--txt); 
    opacity: 0.8;
    cursor: pointer; 
    transition: 0.3s; 
    flex-shrink: 0; 
}
.chip-tag.sel { 
    background: var(--pri); 
    color: #fff; 
    border: solid 1px var(--pri); 
    font-weight: bold; 
    opacity: 1;
}

/* Desktop Filter Panel */
.filter-panel { 
    width: 240px; 
    flex-shrink: 0; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    border-radius: 10px; 
    padding: 15px; 
    height: fit-content; 
}
.f-group { 
    margin-bottom: 15px; 
    padding-bottom: 10px; 
    border-bottom: 1px solid var(--bd); 
}
.f-group:last-child { border-bottom: none; }
.f-label { 
    font-weight: bold; 
    color: var(--pri); 
    margin-bottom: 8px; 
    font-size: 0.95rem; 
}
.f-check { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    cursor: pointer; 
    padding: 6px 0; 
    margin-bottom: 2px; 
    font-size: 0.9rem; 
    color: var(--txt); 
    opacity: 0.8;
}
.f-check:hover { opacity: 1; }
.f-check.disabled { opacity: 0.3; cursor: not-allowed; }

.f-cat { 
    cursor: pointer; 
    padding: 10px; 
    background: var(--card-bg); 
    border: 1px solid var(--bd);
    margin-bottom: 6px; 
    border-radius: 6px; 
    font-size: 0.9rem; 
    font-weight: bold; 
    display: flex; 
    justify-content: space-between; 
}
.f-inp { 
    width: 100%; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    color: var(--txt); 
    padding: 8px; 
    border-radius: 6px; 
    font-size: 0.9rem; 
}
.f-inp:focus { border-color: var(--pri); outline: none; }

/* 🌟 Mobile View 核心覆寫 (強制雙欄 2-columns) */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .m-only { display: flex !important; }
    
    .shop-page-wrapper { padding: 5px 10px 15px 10px; }
    .shop-layout { flex-direction: column; align-items: stretch; gap: 0; }
    
    /* Mobile App-like Modal for Filters */
    .filter-panel { 
        display: none; 
        position: fixed; 
        top: 0; left: 0; 
        width: 100vw; height: 100vh; 
        z-index: 100000; 
        background: var(--card-bg); 
        overflow-y: auto; 
        border-radius: 0; 
        padding: calc(20px + env(safe-area-inset-top, 0px)) 20px 100px 20px; 
        margin: 0; 
        flex-shrink: unset; 
    }
    .filter-panel.m-show { 
        display: block; 
        animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
    }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

    .f-header { 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        font-size: 1.2rem; 
        font-weight: bold; 
        margin-bottom: 20px; 
        padding-bottom: 15px; 
        border-bottom: 1px solid var(--bd); 
        color: var(--txt); 
    }
    .btn-close { 
        background: var(--bd); 
        border: none; 
        color: var(--txt); 
        font-size: 1.2rem; 
        cursor: pointer; 
        width: 36px; 
        height: 36px; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
    }

    .m-filter-actions { 
        position: fixed; 
        bottom: 0; left: 0; 
        width: 100%; 
        display: flex; 
        gap: 10px; 
        padding: 15px 20px calc(15px + env(safe-area-inset-bottom, 0px)) 20px; 
        background: var(--card-bg); 
        border-top: 1px solid var(--bd); 
        z-index: 10; 
    }
    .btn-clear { 
        flex: 1; 
        padding: 12px; 
        border-radius: 8px; 
        background: transparent; 
        border: 1px solid var(--bd); 
        color: var(--txt); 
        font-weight: bold; 
        font-size: 1rem; 
    }
    .btn-apply { 
        flex: 2; 
        padding: 12px; 
        border-radius: 8px; 
        background: var(--pri); 
        border: none; 
        color: #fff; 
        font-weight: bold; 
        font-size: 1rem; 
        box-shadow: 0 4px 10px var(--pri-glow); 
    }

    /* 🌟 強制完美的雙欄配置 */
    .grid.photo-grid { 
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important; 
        gap: 8px !important; 
    }
    
    .card-img.slim-img {
        height: auto !important;
        aspect-ratio: 1 / 1 !important; /* 確保圖片絕對正方形 */
    }
    
    .slim-body { padding: 6px !important; }
    .slim-title { font-size: 0.85rem !important; margin-bottom: 2px !important; }
    .slim-price { font-size: 1rem !important; }
    
    /* 縮小標籤避免在雙欄模式下擠壓版面 */
    .trust-badge { font-size: 0.5rem; padding: 2px 4px; bottom: 2px; left: 2px; }
    .fav-btn { font-size: 1rem; width: 26px; height: 26px; top: 3px; right: 3px; }
    .sold-stamp { font-size: 0.55rem; padding: 2px 4px; top: 4px; left: 4px; }
    .status-badge { padding: 2px 6px !important; font-size: 0.75rem !important; }
    
    .shop-empty-state { grid-column: 1 / -1 !important; }
}
</style>