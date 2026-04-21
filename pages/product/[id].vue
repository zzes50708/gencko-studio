<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const supabase = useSupabaseClient()
const productId = route.params.id

// [SEO] 透過 SSR 抓取單筆商品資料
const { data: currentProduct, pending } = await useAsyncData(`product-${productId}`, async () => {
    if (store.inv && store.inv.length > 0) {
        const found = store.inv.find(i => i.ID === productId)
        if (found) return found
    }

    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', productId)
        .single()

    if (error || !data) return null

    return {
        ID: String(data.id || '').trim(),
        Species: data.species,
        Morph: data.morph,
        Genes: data.genes ? JSON.parse(data.genes) : [ ],
        GenderType: data.gender_type,
        GenderValue: data.gender_value,
        Birthday: data.birthday,
        ListingPrice: data.listing_price,
        Status: data.status,
        Note: data.note,
        ImageURL: data.image_url
    }
})

const productModules = computed(() => {
    const p = currentProduct.value
    if (!p) return null
    let geneArray = Array.isArray(p.Genes) ? p.Genes : (typeof p.Genes === 'string' ? [p.Genes] : [ ])
    return {
        identity: { 
            id: p.ID, 
            morph: p.Morph, 
            genes: geneArray, 
            gender: p.GenderType, 
            genderValue: p.GenderValue, 
            birth: p.Birthday || '未登錄', 
            note: p.Note || '' 
        },
        visuals: { 
            list: p.ImageURL ? [p.ImageURL] :[ ] 
        },
        health: { 
            statement: '本工作室嚴格把關，所有上架個體均確認進食與排泄正常，無健康隱憂始開放選購。' 
        },
        expectations: { 
            notice: '基因表現受環境與成長過程影響，圖片僅供當下參考。' 
        },
        transaction: { 
            price: p.ListingPrice, 
            status: p.Status 
        }
    }
})

//[SEO] 動態 Meta 與結構化資料
const siteData = computed(() => {
    if (currentProduct.value) {
        const p = currentProduct.value
        const title = `${p.Morph} ${p.GenderType === '公' ? '♂' : p.GenderType === '母' ? '♀' : ''}`
        const desc = `ID:${p.ID}。${p.Morph} (${p.GenderType})，售價 NT$${p.ListingPrice}。Gencko Studio 專業繁育，100% 健康保證。`
        const img = getCleanUrl(p.ImageURL)
        const url = `https://www.genckobreeding.com/product/${p.ID}`
        
        const jsonLd = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": p.Morph,
            "image": img ? [img] : [ ],
            "description": desc,
            "sku": p.ID,
            "brand": {
                "@type": "Brand",
                "name": "Gencko Studio"
            },
            "offers": {
                "@type": "Offer",
                "url": url,
                "priceCurrency": "TWD",
                "price": p.ListingPrice,
                "availability": p.Status === 'ForSale' ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
                "itemCondition": "https://schema.org/NewCondition"
            }
        }

        return { title, desc, img, url, script:[{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }] }
    }
    
    return {
        title: '找不到此商品',
        desc: '該商品可能已下架或不存在。',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
        url: `https://www.genckobreeding.com/product/${productId}`,
        script: [ ]
    }
})

useHead({
    title: computed(() => siteData.value.title),
    meta:[
        { name: 'description', content: computed(() => siteData.value.desc) },
        { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
        { property: 'og:description', content: computed(() => siteData.value.desc) },
        { property: 'og:image', content: computed(() => siteData.value.img) },
        { property: 'og:url', content: computed(() => siteData.value.url) },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link:[
        { rel: 'canonical', href: computed(() => siteData.value.url) }
    ],
    script: computed(() => siteData.value.script)
})

const fmtSex = (i) => {
    if (!i) return ''
    if (i.GenderType === '溫度') {
        let t = +i.GenderValue
        if (t >= 31) return t + '°C (90%公)'
        if (t >= 30) return t + '°C (75%公)'
        if (t >= 28) return t + '°C (均)'
        if (t >= 27) return t + '°C (75%母)'
        return t + '°C (90%母)'
    }
    return i.GenderType
}

const getSexCls = (i) => {
    if (!i) return ''
    if (i.GenderType === '公' || (i.GenderType === '溫度' && +i.GenderValue >= 30)) return 'male'
    if (i.GenderType === '母' || (i.GenderType === '溫度' && +i.GenderValue <= 27)) return 'female'
    return 'mix'
}

const copyCurrentLink = async () => {
    try {
        await navigator.clipboard.writeText(window.location.href)
        store.triggerToast()
    } catch (err) {
        console.error('複製失敗:', err)
    }
}

// 🌟 返回邏輯優化：如果是從商城點進來的就回上一頁，否則預設回 /shop
const goBack = () => {
    if (window.history.state && window.history.state.back) {
        router.back()
    } else {
        router.push('/shop')
    }
}
</script>

<template>
    <div class="product-page-wrapper">
        <div v-if="pending" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>正在尋找這隻守宮的資料...</p>
            <button class="app-back-btn" @click="goBack" style="margin: 20px auto; justify-content: center;">返回商城列表</button>
        </div>

        <div v-else-if="!currentProduct" style="text-align:center; padding:100px 0; color:#888;">
            <h2>找不到此守宮</h2>
            <p>該商品可能已下架或不存在。</p>
            <button class="app-back-btn" @click="goBack" style="margin: 20px auto; justify-content: center;">返回商城列表</button>
        </div>

        <div v-else class="prod-container">
            <!-- 🌟 App-like 膠囊返回按鈕 -->
            <div class="nav-action-row">
                <button class="app-back-btn" @click="goBack">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    返回列表
                </button>
            </div>

            <div class="prod-layout">
                <div class="prod-img-box">
                    <div v-if="productModules.transaction.status === 'Sold'" class="sold-stamp">SOLD OUT</div>
                    <!-- 使用 NuxtImg -->
                    <NuxtImg 
                        v-for="(img, idx) in productModules.visuals.list" 
                        :key="idx" 
                        :src="getCleanUrl(img)" 
                        class="prod-main-img" 
                        @click="router.push(`/identity/${productModules.identity.id}`)" 
                        style="cursor: pointer;" 
                        title="查看專屬電子身分證"
                        width="600"
                        height="500"
                        fit="contain"
                        format="webp"
                    />
                    <div class="prod-hint">點擊圖片可查看專屬電子身分證</div>
                </div>
                <div class="prod-info-box">
                    <div class="prod-header">
                        <span class="prod-id">ID: {{ productModules.identity.id }}</span>
                        <h1 class="prod-title">{{ productModules.identity.morph }}</h1>
                        <div class="gene-tag-row">
                            <span v-for="g in productModules.identity.genes" :key="g" class="gene-pill">{{ g }}</span>
                        </div>
                        <div v-if="productModules.identity.note" class="prod-note">
                            📝 備註：{{ productModules.identity.note }}
                        </div>
                        <div class="spec-row">
                            <span :class="getSexCls(currentProduct)" class="sex-val">{{ fmtSex(currentProduct) }}</span>
                            <span class="birth-val">{{ productModules.identity.birth }} 出生</span>
                        </div>
                    </div>
                    <div class="prod-price-area">
                        <div v-if="productModules.transaction.status !== 'ForSale'">
                            <span v-if="productModules.transaction.status === 'Sold'" class="status-badge s-sold">已售出</span>
                            <span v-else class="status-badge s-nfs">非賣/預訂</span>
                        </div>
                        <div v-else class="price">NT$ {{ productModules.transaction.price }}</div>
                    </div>

                    <div class="guarantee-icons-row">
                        <div class="g-icon-pill g-pill-green"><span>🛡️</span> 100% 健康</div>
                        <div class="g-icon-pill g-pill-blue"><span>🧬</span> 基因正確</div>
                        <div class="g-icon-pill g-pill-orange"><span>🚚</span> 運輸賠償</div>
                    </div>

                    <div class="prod-guarantee">
                        <span style="font-size:1.2rem; margin-right:10px;">🛡️</span>
                        <span>{{ productModules.health.statement }}</span>
                    </div>

                    <div class="prod-actions">
                        <a v-if="productModules.transaction.status === 'ForSale'" :href="store.lineLink" target="_blank" class="btn-buy-lg">💬 私訊購買 (Line)</a>
                        <button class="btn-share" @click="copyCurrentLink">🔗 複製連結分享</button>
                    </div>
                    <div class="prod-expect-notice">⚠️ {{ productModules.expectations.notice }}</div>
                </div>
            </div>
            <div class="prod-terms-box">
                <div class="terms-title">⚠️ 取貨注意事項 & 購買須知 ⚠️</div>
                <ul class="terms-list">
                    <li>Gencko工作室出貨前皆確認個體100%健康，所有個體皆為負責人親自餵食，確保進食穩定且無隱憂才會上架販售。</li>
                    <li>開箱請全程錄影，以利於後續爭議處理。</li>
                    <li>有任何問題請於48小時內提出，逾期不候。</li>
                    <li>請提前準備好守宮之飼養環境。</li>
                    <li>守宮會因飼主飼養方式不當而造成問題，本工作室將不予退換貨。</li>
                    <li>個體有缺陷且本工作室無事先告知，本方無條件退款 (需提供錄影確保個體無調包嫌疑)。</li>
                    <li>運送過程死亡，本工作室全額退款；運送過程斷尾，本工作室退還50%款項 (需提供錄影確保個體無調包嫌疑)。</li>
                    <li>購買前請做足功課，本社群、官方皆可無償教學，請做好準備再進行購買。</li>
                    <li style="color:var(--pri); font-weight:bold; margin-top:10px;">購買視同同意以上須知事項。</li>
                </ul>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 
  [局部樣式修復] 
  已清除與 assets/css/style.css 重複的宣告 (如 .price, .status-badge 等)。
  全面導入 CSS 變數，移除所有不必要的 :global(body.day-mode) 覆寫。
*/
.product-page-wrapper { width: 100%; }

/* 🌟 App-like 膠囊狀返回按鈕 */
.nav-action-row {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    margin-bottom: 10px;
}

.app-back-btn {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    color: var(--txt);
    font-size: 0.95rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 30px;
    transition: 0.2s;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.app-back-btn:active {
    transform: scale(0.95);
    background: var(--bd);
}

/* Product Detail Styles */
.prod-container { max-width: 1100px; margin: 0 auto; padding-top: 15px; }
.prod-layout { display: flex; gap: 30px; margin-top: 10px; align-items: flex-start; }

.prod-img-box { 
    flex: 1; 
    position: relative; 
    border-radius: 10px; 
    overflow: hidden; 
    border: 1px solid var(--bd); 
    background: var(--card-bg); 
}
.prod-main-img { 
    width: 100%; 
    height: auto; 
    max-height: 500px; 
    object-fit: contain; 
    cursor: zoom-in; 
    display: block; 
}
.prod-hint { 
    text-align: center; 
    color: var(--txt); 
    opacity: 0.6;
    font-size: 0.75rem; 
    padding: 8px; 
    background: var(--card-bg); 
    border-top: 1px solid var(--bd);
}

.prod-info-box { 
    flex: 1; 
    padding: 20px; 
    background: var(--card-bg); 
    border-radius: 12px; 
    border: 1px solid var(--bd); 
    box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
}
.prod-header { 
    border-bottom: 1px solid var(--bd); 
    padding-bottom: 15px; 
    margin-bottom: 15px; 
}
.prod-id { 
    color: var(--txt); 
    opacity: 0.6;
    font-family: monospace; 
    font-size: 0.85rem; 
    margin-bottom: 4px; 
    display: block; 
}
.prod-title { 
    font-size: 1.8rem; 
    color: var(--txt); 
    margin: 0 0 8px; 
    line-height: 1.2; 
}
.prod-note { 
    margin-bottom: 15px; 
    color: var(--txt); 
    opacity: 0.8;
    font-size: 0.95rem; 
    background: var(--card-bg); 
    padding: 10px; 
    border-radius: 6px; 
    border: 1px dashed var(--bd); 
    white-space: pre-wrap; 
}
.prod-price-area { margin-bottom: 20px; }

.spec-row { display: flex; padding: 5px 0 0 0; border: none; align-items: center; }
.sex-val { font-size: 1.1rem; margin-right: 15px; }
.birth-val { color: var(--txt); opacity: 0.6; font-size: 1rem; }

.gene-tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.gene-pill { 
    background: transparent; 
    color: var(--pri); 
    padding: 4px 12px; 
    border-radius: 15px; 
    font-size: 0.85rem; 
    font-weight: bold; 
    border: 1px solid var(--pri); 
}

.prod-guarantee { 
    background: transparent; 
    color: var(--txt); 
    border: 1px solid var(--bd);
    padding: 12px; 
    border-radius: 8px; 
    border-left: 4px solid #4caf50; 
    display: flex; 
    align-items: flex-start; 
    line-height: 1.5; 
    margin-bottom: 15px; 
    font-size: 0.9rem; 
}

.guarantee-icons-row { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
.g-icon-pill { 
    display: flex; 
    align-items: center; 
    gap: 5px; 
    font-size: 0.85rem; 
    padding: 5px 10px; 
    border-radius: 20px; 
    font-weight: bold; 
    background: transparent;
    border: 1px solid var(--bd);
}
.g-pill-green { color: #4caf50; border-color: #4caf50; }
.g-pill-blue { color: #2196F3; border-color: #2196F3; }
.g-pill-orange { color: #ff9800; border-color: #ff9800; }

.prod-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; margin-top: 20px; }
.btn-buy-lg { 
    flex: 2; 
    background: var(--pri); 
    color: #fff; 
    text-align: center; 
    padding: 12px; 
    font-size: 1.1rem; 
    font-weight: bold; 
    border-radius: 25px; 
    text-decoration: none; 
    transition: 0.3s; 
    box-shadow: 0 4px 10px var(--pri-glow); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
}
.btn-buy-lg:hover { transform: translateY(-2px); box-shadow: 0 6px 15px var(--pri-glow); }
.btn-share { 
    flex: 1; 
    background: var(--card-bg); 
    color: var(--txt); 
    border: 1px solid var(--bd); 
    padding: 12px; 
    border-radius: 25px; 
    cursor: pointer; 
    transition: 0.2s; 
    font-weight: bold; 
    font-size: 1rem; 
}
.btn-share:hover { border-color: var(--pri); color: var(--pri); }

.prod-expect-notice { font-size: 0.8rem; color: var(--txt); opacity: 0.6; margin-top: 10px; }

.prod-terms-box { 
    margin-top: 30px; 
    background: var(--card-bg); 
    padding: 25px; 
    border-radius: 12px; 
    border: 1px solid var(--bd); 
    box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
}
.terms-title { 
    text-align: center; 
    color: var(--pri); 
    font-weight: 900; 
    font-size: 1.1rem; 
    margin-bottom: 15px; 
    letter-spacing: 1px; 
}
.terms-list { list-style: none; padding: 0; margin: 0; color: var(--txt); opacity: 0.8; line-height: 1.6; font-size: 0.9rem; }
.terms-list li { margin-bottom: 8px; padding-left: 12px; position: relative; }
.terms-list li::before { content: "•"; position: absolute; left: 0; color: var(--pri); }

/* 只覆寫此頁專屬的 sold-stamp (字體超大版本) */
.sold-stamp { 
    position: absolute; 
    top: 15px; 
    left: 15px; 
    transform: none; 
    border: 6px solid #f44336; 
    color: #f44336; 
    font-size: 3rem; 
    font-weight: 900; 
    padding: 5px 15px; 
    border-radius: 8px; 
    background: var(--card-bg); 
    opacity: 0.9; 
    pointer-events: none; 
    z-index: 10; 
    font-family: 'Black Ops One', sans-serif; 
    letter-spacing: 2px; 
    text-transform: uppercase; 
    text-shadow: 2px 2px 5px rgba(0,0,0,0.2); 
}

/* 🌟 Mobile Optimizations (照片與資訊欄並排雙欄) */
@media (max-width: 768px) {
    .product-page-wrapper { padding-top: 0; padding-bottom: 15px; }
    
    .nav-action-row { margin-bottom: 5px; }
    .app-back-btn { padding: 6px 12px; font-size: 0.9rem; }
    
    /* 🌟 雙欄 Grid */
    .prod-layout { 
        display: grid; 
        grid-template-columns: 140px 1fr; 
        gap: 12px; 
        align-items: start;
        margin-top: 5px;
    }
    
    .prod-img-box { 
        border-radius: 8px; 
    }
    
    .prod-main-img { 
        width: 100%; 
        aspect-ratio: 1 / 1; 
        object-fit: cover; 
        max-height: none; 
    }
    
    .prod-hint { display: none; }
    
    .sold-stamp {
        font-size: 1.2rem;
        border-width: 3px;
        padding: 4px 8px;
        top: 8px; 
        left: 8px;
    }
    
    .prod-info-box { 
        padding: 10px; 
        border-radius: 8px; 
    }
    
    .prod-header { 
        padding-bottom: 8px; 
        margin-bottom: 8px; 
    }
    
    .prod-id { font-size: 0.7rem; margin-bottom: 2px; }
    .prod-title { font-size: 1.15rem; margin-bottom: 6px; padding-bottom: 0; border-bottom: none; }
    
    .gene-pill { padding: 2px 6px; font-size: 0.7rem; }
    .prod-note { font-size: 0.8rem; padding: 8px; margin-bottom: 8px; }
    
    .spec-row { font-size: 0.85rem; }
    .sex-val { font-size: 0.9rem; margin-right: 8px; }
    .birth-val { font-size: 0.8rem; }
    
    .prod-price-area { margin-bottom: 10px; }
    
    .g-icon-pill { font-size: 0.65rem; padding: 4px 6px; }
    .prod-guarantee { font-size: 0.75rem; padding: 8px; margin-bottom: 10px; }
    
    .prod-actions { flex-direction: column; gap: 6px; margin-top: 10px; }
    .btn-buy-lg { width: 100%; padding: 8px; font-size: 0.95rem; }
    .btn-share { width: 100%; padding: 8px; font-size: 0.85rem; }
    
    .prod-expect-notice { font-size: 0.7rem; }
    
    /* 購買須知放置於雙欄下方滿版顯示 */
    .prod-terms-box { 
        grid-column: 1 / -1;
        padding: 15px; 
        margin-top: 5px; 
    }
}
</style>