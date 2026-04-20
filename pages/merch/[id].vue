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
const merchId = route.params.id

// [SEO] 為了在伺服器端渲染 (SSR) 期間就能拿到該商品資料以產生正確的 Meta
const { data: currentMerch, pending } = await useAsyncData(`merch-${merchId}`, async () => {
    // 若 Store 中已經有周邊商品列表，先試著從裡面找
    if (store.merchList && store.merchList.length > 0) {
        const found = store.merchList.find(m => String(m.ItemID) === String(merchId))
        if (found) return found
    }

    // 若無資料 (SSR 或直接進入內頁)，向 Supabase 查詢
    const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('item_id', merchId)
        .single()

    if (error || !data) return null

    return {
        ItemID: data.item_id,
        Name: data.name,
        Description: data.description,
        Price: data.price,
        ImageURL: data.image_url,
        Category: data.category,
        Available: data.available,
        ExternalLink: data.external_link
    }
})

// [SEO] 動態 Meta 與結構化資料
const siteData = computed(() => {
    if (currentMerch.value) {
        const m = currentMerch.value
        
        const imgUrl = m.ImageURL ? getCleanUrl(m.ImageURL) : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
        const itemUrl = `https://www.genckobreeding.com/merch/${m.ItemID}`
        const title = `${m.Name} - NT$${m.Price}`
        const desc = m.Description ? m.Description.slice(0, 150) + '...' : `Gencko 特選周邊：${m.Name}，售價 NT$${m.Price}。`
        const isAvailable = m.Available !== 'No'

        // Product Schema
        const jsonLd = {
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": m.Name,
            "image": [imgUrl],
            "description": m.Description || desc,
            "sku": m.ItemID,
            "brand": {
                "@type": "Brand",
                "name": "Gencko Studio"
            },
            "offers": {
                "@type": "Offer",
                "url": itemUrl,
                "priceCurrency": "TWD",
                "price": m.Price,
                "availability": isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition"
            }
        }

        return {
            title,
            desc,
            img: imgUrl,
            url: itemUrl,
            script:[{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
        }
    }
    
    return {
        title: '找不到此周邊商品',
        desc: '該周邊商品可能已下架或不存在。',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
        url: `https://www.genckobreeding.com/merch/${merchId}`,
        script:[ ]
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
        { property: 'og:type', content: 'product' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ],
    link:[
        { rel: 'canonical', href: computed(() => siteData.value.url) }
    ],
    script: computed(() => siteData.value.script)
})

const copyCurrentLink = async () => {
    try {
        await navigator.clipboard.writeText(window.location.href)
        store.triggerToast()
    } catch (err) {
        console.error('複製失敗:', err)
    }
}

const goBack = () => {
    router.push('/merch')
}
</script>

<template>
    <div>
        <!-- Loading State -->
        <div v-if="pending" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>正在載入周邊商品...</p>
        </div>

        <!-- Not Found State -->
        <div v-else-if="!currentMerch" style="text-align:center; padding:100px 0; color:#888;">
            <h2>找不到此周邊商品</h2>
            <p>該商品可能已下架或不存在。</p>
            <button class="btn-back" @click="goBack" style="margin-top:20px;">回周邊列表</button>
        </div>

        <!-- Detail View -->
        <div v-else class="prod-container">
            <button class="btn-back" @click="goBack">← 返回列表</button>
            <div class="prod-layout">
                <div class="prod-img-box">
                    <!-- 使用 NuxtImg -->
                    <NuxtImg 
                        v-if="currentMerch.ImageURL"
                        :src="getCleanUrl(currentMerch.ImageURL)" 
                        :alt="currentMerch.Name" 
                        class="prod-main-img" 
                        @click="store.openLightbox(currentMerch)" 
                        style="cursor: pointer;" 
                        title="點擊放大圖片"
                        width="600"
                        height="500"
                        fit="contain"
                        format="webp"
                    />
                    <div class="prod-hint">點擊放大圖片</div>
                </div>
                <div class="prod-info-box">
                    <h1 class="prod-title">{{ currentMerch.Name }}</h1>
                    <div class="merch-desc">{{ currentMerch.Description }}</div>
                    
                    <div class="prod-price-area">
                        <div class="price">NT$ {{ currentMerch.Price }}</div>
                    </div>
                    
                    <div class="prod-actions">
                        <a v-if="currentMerch.Available !== 'No'" 
                           :href="currentMerch.ExternalLink || store.lineLink" 
                           target="_blank" 
                           class="btn-buy-lg" 
                           rel="noopener noreferrer">
                           🛒 前往購買
                        </a>
                        <button class="btn-share" @click="copyCurrentLink">🔗 複製連結分享</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.prod-container { max-width: 1100px; margin: 0 auto; padding-top: 15px; }
.prod-layout { display: flex; gap: 30px; margin-top: 15px; align-items: flex-start; }
.prod-img-box { flex: 1; position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--bd); background: #000; }
.prod-main-img { width: 100%; height: auto; max-height: 500px; object-fit: contain; display: block; }
.prod-hint { text-align: center; color: #666; font-size: 0.75rem; padding: 4px; background: #111; }
.prod-info-box { flex: 1; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 10px; border: 1px solid var(--bd); }
.prod-title { font-size: 1.8rem; color: #fff; margin: 0 0 15px 0; line-height: 1.2; border-bottom: 1px solid var(--bd); padding-bottom: 10px; }
.merch-desc { color: #eee; font-size: 1rem; line-height: 1.6; margin-bottom: 25px; white-space: pre-wrap; }
.prod-price-area { margin-bottom: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); }
.price { font-size: 2.5rem; color: var(--pri); font-weight: 900; letter-spacing: 0.5px; white-space: nowrap; line-height: 1; text-shadow: 0 0 10px rgba(255,69,0,0.3); }

.prod-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px; }
.btn-buy-lg { flex: 2; background: linear-gradient(135deg, #FF4500 0%, #d84315 100%); color: #fff; text-align: center; padding: 12px; font-size: 1.1rem; font-weight: bold; border-radius: 25px; text-decoration: none; transition: 0.3s; box-shadow: 0 4px 10px rgba(255,69,0,0.3); display: flex; justify-content: center; align-items: center; white-space: nowrap; }
.btn-buy-lg:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(255,69,0,0.5); }
.btn-share { flex: 1; background: #333; color: #ccc; border: 1px solid #555; padding: 12px; border-radius: 25px; cursor: pointer; transition: 0.2s; font-weight: bold; font-size: 1rem; white-space: nowrap; }
.btn-share:hover { background: #444; color: #fff; }

.btn-back { background: transparent; border: 1px solid #555; color: #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; transition: 0.2s; display: inline-block; margin-bottom: 15px; font-size: 0.9rem; }
.btn-back:hover { border-color: var(--pri); color: var(--pri); }

:global(body.day-mode) .prod-title { color: #111; border-bottom-color: #ddd; }
:global(body.day-mode) .merch-desc { color: #333; }
:global(body.day-mode) .prod-hint { background: #f0f0f0; color: #888; }
:global(body.day-mode) .btn-share { background: #fff; color: #555; border-color: #ccc; }
:global(body.day-mode) .btn-share:hover { background: #f0f0f0; color: #000; }
:global(body.day-mode) .btn-back { color: #000; border-color: #999; }
:global(body.day-mode) .btn-back:hover { border-color: var(--pri); color: var(--pri); }
:global(body.day-mode) .prod-info-box { background: #fff; border-color: #ddd; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
:global(body.day-mode) .prod-price-area { border-top-color: #eee; }
:global(body.day-mode) .prod-img-box { background-color: #f4f4f4; border-color: #eee; }

@media (max-width: 768px) {
    .prod-layout { flex-direction: column; gap: 15px; }
    .prod-title { font-size: 1.5rem; }
    .btn-buy-lg { width: 100%; flex: auto; }
    .btn-share { width: 100%; flex: auto; }
    .prod-actions { flex-direction: column; }
}
</style>