<script setup>
import { computed } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const supabase = useSupabaseClient()

// SSR：抓取所有周邊商品（給 schema 用）
const { data: ssrMerch } = await useAsyncData('merch-list-seo-v1', async () => {
    try {
        const { data, error } = await supabase
            .from('merchandise')
            .select('item_id, name, description, price, image_url, category, available')
        if (error || !data) return []
        return data.map(m => ({
            ItemID: m.item_id,
            Name: m.name,
            Description: m.description,
            Price: m.price,
            ImageURL: m.image_url,
            Category: m.category,
            Available: m.available
        }))
    } catch (e) {
        console.error('[merch-list SSR] fetch failed:', e?.message)
        return []
    }
})

const merchList = computed(() => {
    const csr = store.merchList || []
    return csr.length ? csr : (ssrMerch.value || [])
})

// 解析 "299 起" 等字串為純數字
const parsePrice = (val) => {
    if (val == null) return null
    const m = String(val).match(/\d+(\.\d+)?/)
    return m ? m[0] : null
}

const merchUrl = 'https://www.genckobreeding.com/merch'
const merchImg = 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
const merchSeller = {
    "@type": "Organization",
    "name": "Gencko Breeding Studio",
    "alternateName": ["Gencko Studio", "捷客工作室"],
    "url": "https://www.genckobreeding.com",
    "logo": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png",
    "sameAs": [
        "https://www.instagram.com/gencko_breeding",
        "https://www.facebook.com/profile.php?id=61579393505049",
        "https://line.me/R/ti/p/@219abdzn"
    ]
}

const merchItemListLd = computed(() => {
    const list = merchList.value
    if (!list.length) return null
    return {
        "@type": "ItemList",
        "@id": `${merchUrl}#list`,
        "name": "Gencko 守宮 / 爬蟲周邊商品列表",
        "numberOfItems": list.length,
        "itemListElement": list.map((m, idx) => {
            const itemUrl = `${merchUrl}/${m.ItemID}`
            const img = m.ImageURL ? getCleanUrl(m.ImageURL) : merchImg
            const price = parsePrice(m.Price)
            const isRange = /起|~|-/.test(String(m.Price ?? ''))
            const cat = m.Category || '周邊商品'
            const isAvailable = m.Available !== 'No'
            const offer = {
                "@type": "Offer",
                "url": itemUrl,
                "priceCurrency": "TWD",
                "availability": isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition",
                "areaServed": { "@type": "Country", "name": "Taiwan" },
                "seller": merchSeller
            }
            if (price) {
                offer.price = price
                if (isRange) {
                    offer.priceSpecification = { "@type": "PriceSpecification", "priceCurrency": "TWD", "minPrice": Number(price) }
                }
            }
            return {
                "@type": "ListItem",
                "position": idx + 1,
                "url": itemUrl,
                "item": {
                    "@type": "Product",
                    "@id": `${itemUrl}#product`,
                    "name": m.Name,
                    "url": itemUrl,
                    "image": img,
                    "sku": String(m.ItemID),
                    "category": `寵物用品 > ${cat}`,
                    "description": m.Description || `Gencko 周邊商品：${m.Name}`,
                    "brand": { "@type": "Brand", "name": "Gencko Breeding Studio" },
                    "offers": offer
                }
            }
        })
    }
})

const merchBreadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://www.genckobreeding.com/" },
        { "@type": "ListItem", "position": 2, "name": "周邊商品", "item": merchUrl }
    ]
}

const merchWebPageLd = computed(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": merchUrl,
    "url": merchUrl,
    "name": "Gencko 守宮周邊商品｜飼養器材、餌料、躲避屋",
    "inLanguage": "zh-TW",
    "isPartOf": { "@type": "WebSite", "@id": "https://www.genckobreeding.com/#website" },
    "primaryImageOfPage": { "@type": "ImageObject", "url": merchImg },
    "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".page-title", ".morph-title"]
    },
    "publisher": merchSeller,
    ...(merchItemListLd.value ? { "mainEntity": merchItemListLd.value } : {})
}))

useHead({
    title: '守宮周邊商品｜飼養器材、餌料、躲避屋、營養品 - Gencko Breeding Studio',
    meta:[
        { name: 'description', content: 'Gencko Breeding Studio 精選守宮與爬蟲飼養周邊商品：飼養箱、加熱墊、躲避屋、餌料（杜比亞、麵包蟲）、鈣粉與綜合維生素，提供最適合豹紋守宮與肥尾守宮的專業器材。' },
        { name: 'keywords', content: '守宮周邊, 守宮飼養器材, 杜比亞, 加熱墊, 躲避屋, 鈣粉, 守宮營養品' },
        // Open Graph
        { property: 'og:title', content: '守宮周邊商品｜飼養器材、餌料、躲避屋 - Gencko Breeding Studio' },
        { property: 'og:description', content: '精選守宮飼養周邊：飼養箱、加熱墊、躲避屋、餌料、鈣粉與營養品。' },
        { property: 'og:image', content: merchImg },
        { property: 'og:image:alt', content: 'Gencko 守宮周邊商品' },
        { property: 'og:url', content: merchUrl },
        { property: 'og:type', content: 'website' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: '守宮周邊商品｜飼養器材、餌料、躲避屋' },
        { name: 'twitter:description', content: '精選守宮飼養周邊：飼養箱、加熱墊、躲避屋、餌料、鈣粉與營養品。' },
        { name: 'twitter:image', content: merchImg }
    ],
    link:[
        { rel: 'canonical', href: merchUrl }
    ],
    script: computed(() => [
        { type: 'application/ld+json', children: JSON.stringify(merchWebPageLd.value) },
        { type: 'application/ld+json', children: JSON.stringify(merchBreadcrumbLd) }
    ])
})
</script>

<template>
    <div class="merch-page-wrapper">
        <!-- SEO：頁面唯一 h1（sr-only 含完整關鍵字） -->
        <h1 class="sr-only">守宮周邊商品｜飼養器材、餌料、躲避屋、營養品 - Gencko Breeding Studio</h1>
        <!-- 視覺主標保留為 div（桌機可見、手機隱藏） -->
        <div class="page-title dt-only" aria-hidden="true">周邊商品</div>

        <div v-if="store.loading && merchList.length === 0" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>商品載入中...</p>
        </div>

        <div class="grid" v-else>
            <!-- 點擊後跳轉到動態商品內頁 -->
            <NuxtLink v-for="m in merchList" :key="m.ItemID" :to="`/merch/${m.ItemID}`" class="card" style="text-decoration:none; color:inherit; display:flex; flex-direction:column;">
                <!-- 🌟 核心修正：將 NuxtImg 替換為原生 img -->
                <img 
                    v-if="m.ImageURL"
                    :src="getCleanUrl(m.ImageURL)" 
                    :alt="m.Name" 
                    class="card-img" 
                    loading="lazy"
                    decoding="async"
                />
                <div v-else class="card-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:3rem;background:#1a1a1a;">🛍️</div>
                <div class="card-body">
                    <h2 class="morph-title">{{ m.Name }}</h2>
                    <div class="price">NT$ {{ m.Price }}</div>
                </div>
            </NuxtLink>
        </div>
    </div>
</template>

<style scoped>
/* 
  [局部樣式修復] 
  此頁面原本重複宣告了全域已存在的 .card, .grid, .card-img 等類別，
  且寫死了卡片底色與 hover 效果，導致必須依賴 :global(body.day-mode) 來強行蓋過。
  現已移除重複宣告，將基礎樣式權重與日夜模式變數切換完美還給全域 style.css。
*/
.merch-page-wrapper { 
    max-width: 1200px; 
    margin: 0 auto; 
}

/* 🌟 Responsive Utilities */
.dt-only { display: block; }

/* 針對周邊商品卡片的專屬文字排版微調 */
.morph-title { 
    font-size: 1.1rem; 
    margin: 0 0 8px 0; 
    font-weight: bold; 
    color: var(--txt); 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
    line-height: 1.3; 
}

.price { 
    font-size: 1.2rem; 
    font-weight: bold; 
    color: var(--pri); 
    margin-top: auto; 
}

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    
    .merch-page-wrapper {
        padding-top: 0;
    }
    
    .grid { 
        grid-template-columns: repeat(3, 1fr) !important; 
        gap: 8px; 
    }
    
    .card-img { 
        height: 160px; 
        aspect-ratio: auto; 
    }
    
    .card-body {
        padding: 8px;
    }
    
    .morph-title {
        font-size: 0.95rem;
        margin-bottom: 6px;
    }
    
    .price {
        font-size: 1.05rem;
    }
}
</style>