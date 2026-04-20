<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const supabase = useSupabaseClient()
const productId = route.params.id

//[SEO] 透過 SSR 抓取單筆商品資料
const { data: currentProduct, pending } = await useAsyncData(`product-${productId}`, async () => {
    // 若 Store 已經有資料，直接使用
    if (store.inv && store.inv.length > 0) {
        const found = store.inv.find(i => i.ID === productId)
        if (found) return found
    }

    // 若無資料 (SSR 或直接進內頁)，向 Supabase 查詢
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

// 處理商品展示模組的資料對應
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
            list: p.ImageURL ? [p.ImageURL] : [ ] 
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

// [SEO] 動態 Meta 與結構化資料
const siteData = computed(() => {
    if (currentProduct.value) {
        const p = currentProduct.value
        const title = `${p.Morph} ${p.GenderType === '公' ? '♂' : p.GenderType === '母' ? '♀' : ''}`
        const desc = `ID:${p.ID}。${p.Morph} (${p.GenderType})，售價 NT$${p.ListingPrice}。Gencko Studio 專業繁育，100% 健康保證。`
        const img = p.ImageURL ? `https://wsrv.nl/?url=${encodeURIComponent(p.ImageURL)}&w=1200&output=webp` : ''
        const url = `https://www.genckobreeding.com/product/${p.ID}`
        
        // Google Product Schema
        const jsonLd = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": p.Morph,
            "image": img ? [img] :[ ],
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

        return {
            title,
            desc,
            img,
            url,
            script:[{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
        }
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

// --- 輔助方法 ---
const convertLink = (url) => {
    if (!url) return ''
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    let target = url
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`
}

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

const goBack = () => {
    router.push('/shop')
}
</script>

<template>
    <div>
        <div v-if="pending" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>正在尋找這隻守宮的資料...</p>
            <button class="btn-back" @click="goBack" style="margin-top:20px;">回商城列表</button>
        </div>

        <div v-else-if="!currentProduct" style="text-align:center; padding:100px 0; color:#888;">
            <h2>找不到此守宮</h2>
            <p>該商品可能已下架或不存在。</p>
            <button class="btn-back" @click="goBack" style="margin-top:20px;">回商城列表</button>
        </div>

        <div v-else class="prod-container">
            <button class="btn-back" @click="goBack">← 返回列表</button>
            <div class="prod-layout">
                <div class="prod-img-box">
                    <div v-if="productModules.transaction.status === 'Sold'" class="sold-stamp" style="font-size:3rem;border-width:6px;">SOLD OUT</div>
                    <img v-for="(img, idx) in productModules.visuals.list" :key="idx" :src="convertLink(img)" class="prod-main-img" @click="router.push(`/identity/${productModules.identity.id}`)" style="cursor: pointer;" title="查看專屬電子身分證">
                    <div class="prod-hint">點擊圖片可查看專屬電子身分證</div>
                </div>
                <div class="prod-info-box">
                    <div class="prod-header">
                        <span class="prod-id">ID: {{ productModules.identity.id }}</span>
                        <h1 class="prod-title">{{ productModules.identity.morph }}</h1>
                        <div class="gene-tag-row">
                            <span v-for="g in productModules.identity.genes" :key="g" class="gene-pill">{{ g }}</span>
                        </div>
                        <div v-if="productModules.identity.note" style="margin-bottom:15px; color:#aaa; font-size:0.95rem; background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border:1px solid var(--bd); white-space: pre-wrap;">
                            📝 備註：{{ productModules.identity.note }}
                        </div>
                        <div class="spec-row" style="border:none; padding:5px 0 0 0;">
                            <span :class="getSexCls(currentProduct)" style="font-size:1.1rem; margin-right:15px;">{{ fmtSex(currentProduct) }}</span>
                            <span style="color:#888;">{{ productModules.identity.birth }} 出生</span>
                        </div>
                    </div>
                    <div class="prod-price-area">
                        <div v-if="productModules.transaction.status !== 'ForSale'">
                            <span v-if="productModules.transaction.status === 'Sold'" class="status-badge s-sold" style="font-size:1.2rem;padding:10px 20px;">已售出</span>
                            <span v-else class="status-badge s-nfs" style="font-size:1.2rem;padding:10px 20px;">非賣/預訂</span>
                        </div>
                        <div v-else class="price" style="font-size:2.5rem;">NT$ {{ productModules.transaction.price }}</div>
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

                    <div class="prod-actions" style="margin-top:20px;">
                        <a v-if="productModules.transaction.status === 'ForSale'" :href="store.lineLink" target="_blank" class="btn-buy-lg">💬 私訊購買 (Line)</a>
                        <button class="btn-share" @click="copyCurrentLink">🔗 複製連結分享</button>
                    </div>
                    <div style="font-size:0.8rem; color:#666; margin-top:10px;">⚠️ {{ productModules.expectations.notice }}</div>
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
/* Product Detail Styles */
.prod-container { max-width: 1100px; margin: 0 auto; padding-top: 15px; }
.prod-layout { display: flex; gap: 30px; margin-top: 15px; align-items: flex-start; }
.prod-img-box { flex: 1; position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--bd); background: #000; }
.prod-main-img { width: 100%; height: auto; max-height: 500px; object-fit: contain; cursor: zoom-in; display: block; }
.prod-hint { text-align: center; color: #666; font-size: 0.75rem; padding: 4px; background: #111; }
.prod-info-box { flex: 1; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 10px; }
.prod-header { border-bottom: 1px solid var(--bd); padding-bottom: 15px; margin-bottom: 15px; }
.prod-id { color: #666; font-family: monospace; font-size: 0.85rem; margin-bottom: 4px; display: block; }
.prod-title { font-size: 1.8rem; color: #fff; margin: 0 0 8px; line-height: 1.2; }
.prod-price-area { margin-bottom: 20px; }
.spec-row { display: flex; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.gene-tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.gene-pill { background: rgba(255,69,0,0.15); color: var(--pri); padding: 3px 10px; border-radius: 15px; font-size: 0.85rem; font-weight: bold; border: 1px solid rgba(255,69,0,0.3); }

.prod-guarantee { background: rgba(40, 167, 69, 0.1); color: #81c784; padding: 12px; border-radius: 6px; border-left: 3px solid #4caf50; display: flex; align-items: flex-start; line-height: 1.5; margin-bottom: 15px; font-size: 0.9rem; }

.guarantee-icons-row { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
.g-icon-pill { display: flex; align-items: center; gap: 5px; font-size: 0.85rem; padding: 5px 10px; border-radius: 20px; font-weight: bold; }
.g-pill-green { color: #4caf50; background: rgba(76,175,80,0.1); }
.g-pill-blue { color: #2196F3; background: rgba(33,150,243,0.1); }
.g-pill-orange { color: #ff9800; background: rgba(255,152,0,0.1); }

.prod-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; }
.btn-buy-lg { flex: 2; background: linear-gradient(135deg, #FF4500 0%, #d84315 100%); color: #fff; text-align: center; padding: 12px; font-size: 1.1rem; font-weight: bold; border-radius: 25px; text-decoration: none; transition: 0.3s; box-shadow: 0 4px 10px rgba(255,69,0,0.3); display: flex; align-items: center; justify-content: center; }
.btn-buy-lg:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(255,69,0,0.5); }
.btn-share { flex: 1; background: #333; color: #ccc; border: 1px solid #555; padding: 12px; border-radius: 25px; cursor: pointer; transition: 0.2s; font-weight: bold; font-size: 1rem; }
.btn-share:hover { background: #444; color: #fff; }

.prod-terms-box { margin-top: 30px; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 10px; border: 1px solid var(--bd); }
.terms-title { text-align: center; color: var(--pri); font-weight: 900; font-size: 1.1rem; margin-bottom: 15px; letter-spacing: 1px; }
.terms-list { list-style: none; padding: 0; margin: 0; color: #bbb; line-height: 1.6; font-size: 0.9rem; }
.terms-list li { margin-bottom: 6px; padding-left: 12px; position: relative; }
.terms-list li::before { content: "•"; position: absolute; left: 0; color: #666; }

.sold-stamp { position: absolute; top: 15px; left: 15px; transform: none; border: 6px solid #f44336; color: #f44336; font-size: 3rem; font-weight: 900; padding: 5px 15px; border-radius: 8px; background: rgba(0,0,0,0.5); opacity: 1; pointer-events: none; z-index: 10; font-family: 'Black Ops One', sans-serif; letter-spacing: 2px; text-transform: uppercase; text-shadow: 2px 2px 5px rgba(0,0,0,1); }
.price { font-size: 2.5rem; color: var(--pri); font-weight: 900; letter-spacing: 0.5px; white-space: nowrap; line-height: 1; }

.status-badge { padding: 4px 8px; font-size: 0.8rem; font-weight: bold; border-radius: 4px; white-space: nowrap; }
.s-sold { background: #333; color: #fff; border: 1px solid #666; }
.s-res { background: #FFC107; color: #000; }
.s-nfs { background: #9C27B0; color: #fff; box-shadow: 0 0 10px rgba(156, 39, 176, 0.4); }

.btn-back { background: transparent; border: 1px solid #555; color: #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; transition: 0.2s; display: inline-block; margin-bottom: 15px; font-size: 0.9rem; }
.btn-back:hover { border-color: var(--pri); color: var(--pri); }

.male { color: #2196F3; font-weight: bold; }
.female { color: #E91E63; font-weight: bold; }
.mix { color: #9C27B0; font-weight: bold; }

:global(body.day-mode) .prod-title { color: #111; }
:global(body.day-mode) .prod-hint { background: #f0f0f0; color: #888; }
:global(body.day-mode) .btn-share { background: #fff; color: #555; border-color: #ccc; }
:global(body.day-mode) .btn-share:hover { background: #f0f0f0; color: #000; }
:global(body.day-mode) .prod-guarantee { background: #e8f5e9; color: #2e7d32; border-color: #2e7d32; }
:global(body.day-mode) .prod-terms-box { background: #fff; border-color: #ddd; color: #333; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
:global(body.day-mode) .terms-list { color: #444; }
:global(body.day-mode) .gene-pill { background: #fff3e0; color: #e65100; border-color: #ffb74d; }
:global(body.day-mode) .btn-back { color: #000; border-color: #999; }
:global(body.day-mode) .btn-back:hover { border-color: var(--pri); color: var(--pri); }
:global(body.day-mode) .g-pill-green { background: #e8f5e9; color: #2e7d32; }
:global(body.day-mode) .g-pill-blue { background: #e3f2fd; color: #1565c0; }
:global(body.day-mode) .g-pill-orange { background: #fff3e0; color: #ef6c00; }

@media (max-width: 768px) {
    .prod-layout { flex-direction: column; gap: 15px; }
    .prod-title { font-size: 1.5rem; }
    .btn-buy-lg { width: 100%; }
    .btn-share { width: 100%; }
}
</style>