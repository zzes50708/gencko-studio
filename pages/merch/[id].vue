<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const route = useRoute()
const store = useMainStore()
const supabase = useSupabaseClient()
const merchId = route.params.id

//[SEO] 為了在伺服器端渲染 (SSR) 期間就能拿到該商品資料以產生正確的 Meta
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

//[SEO] 動態 Meta 與結構化資料
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
</script>

<template>
    <div class="merch-detail-wrapper">
        <!-- Loading State -->
        <div v-if="pending" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>正在載入周邊商品...</p>
            <TheBackButton fallback="/merch" text="返回周邊列表" style="justify-content: center; margin-top: 20px;" />
        </div>

        <!-- Not Found State -->
        <div v-else-if="!currentMerch" style="text-align:center; padding:100px 0; color:#888;">
            <h2>找不到此周邊商品</h2>
            <p>該商品可能已下架或不存在。</p>
            <TheBackButton fallback="/merch" text="返回周邊列表" style="justify-content: center; margin-top: 20px;" />
        </div>

        <!-- Detail View -->
        <div v-else class="prod-container">
            <!-- 🌟 引入全域共用的 App-like 返回按鈕 -->
            <TheBackButton fallback="/merch" text="返回列表" />

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
                    <div class="prod-hint">🔍 點擊放大圖片</div>
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
                           🛒 立即購買
                        </a>
                        <button class="btn-share" @click="copyCurrentLink">🔗 複製連結分享</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 
  [局部樣式修復] 
  已清除寫死的深色背景與淺色字體色碼。
  全面導入 CSS 變數，移除所有不必要的 :global(body.day-mode) 覆寫。
  已刪除重複的 app-back-btn 相關樣式。
*/
.merch-detail-wrapper { width: 100%; }

/* Container & Layout */
.prod-container { max-width: 1100px; margin: 0 auto; padding-top: 15px; }
.prod-layout { display: flex; gap: 30px; margin-top: 10px; align-items: flex-start; }

.prod-img-box { 
    flex: 1; 
    position: relative; 
    border-radius: 12px; 
    overflow: hidden; 
    border: 1px solid var(--bd); 
    background: var(--card-bg); 
    box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
}

.prod-main-img { 
    width: 100%; 
    height: auto; 
    max-height: 500px; 
    object-fit: contain; 
    display: block; 
    cursor: zoom-in; 
}

.prod-hint { 
    text-align: center; 
    color: var(--txt); 
    opacity: 0.6;
    font-size: 0.8rem; 
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

.prod-title { 
    font-size: 1.8rem; 
    color: var(--txt); 
    margin: 0 0 15px 0; 
    line-height: 1.3; 
    border-bottom: 1px solid var(--bd); 
    padding-bottom: 15px; 
}

.merch-desc { 
    color: var(--txt); 
    opacity: 0.9;
    font-size: 1.05rem; 
    line-height: 1.7; 
    margin-bottom: 25px; 
    white-space: pre-wrap; 
}

.prod-price-area { 
    margin-bottom: 25px; 
    padding-top: 15px; 
    border-top: 1px dashed var(--bd); 
}

.price { 
    font-size: 2.5rem; 
    color: var(--pri); 
    font-weight: 900; 
    letter-spacing: 0.5px; 
    white-space: nowrap; 
    line-height: 1; 
    text-shadow: 0 0 10px var(--pri-glow); 
}

/* Buttons */
.prod-actions { 
    display: flex; 
    gap: 12px; 
    flex-wrap: wrap; 
    margin-bottom: 5px; 
}

.btn-buy-lg { 
    flex: 2; 
    background: var(--pri); 
    color: #fff; 
    text-align: center; 
    padding: 14px; 
    font-size: 1.1rem; 
    font-weight: bold; 
    border-radius: 8px; 
    text-decoration: none; 
    transition: 0.3s; 
    box-shadow: 0 4px 10px var(--pri-glow); 
    display: flex; 
    justify-content: center; 
    align-items: center; 
    white-space: nowrap; 
}

.btn-buy-lg:hover { 
    transform: translateY(-2px); 
    box-shadow: 0 6px 15px var(--pri-glow); 
}

.btn-share { 
    flex: 1; 
    background: var(--card-bg); 
    color: var(--txt); 
    border: 1px solid var(--bd); 
    padding: 14px; 
    border-radius: 8px; 
    cursor: pointer; 
    transition: 0.2s; 
    font-weight: bold; 
    font-size: 1rem; 
    white-space: nowrap; 
}

.btn-share:hover { 
    border-color: var(--pri); 
    color: var(--pri); 
}

/* 🌟 Mobile Optimizations (左圖右文雙欄) */
@media (max-width: 768px) {
    .merch-detail-wrapper { padding: 0 10px 15px 10px; }
    
    /* 改為並排雙欄 Grid，左側固定寬度放照片 */
    .prod-layout { 
        display: grid; 
        grid-template-columns: 200px 1fr; 
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
    
    .prod-hint { display: none; } /* 手機版並排時隱藏文字以省空間 */
    
    .prod-info-box { 
        padding: 10px; 
        border-radius: 8px; 
    }
    
    .prod-title { 
        font-size: 1.15rem; 
        margin-bottom: 6px; 
        padding-bottom: 6px; 
    }
    
    .merch-desc { 
        font-size: 0.85rem; 
        margin-bottom: 10px; 
        line-height: 1.4;
    }
    
    .prod-price-area { 
        margin-bottom: 10px; 
        padding-top: 8px; 
        white-space: pre-wrap;
    }
    .price { font-size: 1.4rem; }
    
    .prod-actions { flex-direction: column; gap: 6px; }
    .btn-buy-lg { width: 100%; flex: auto; padding: 8px; font-size: 0.95rem; }
    .btn-share { width: 100%; flex: auto; padding: 8px; font-size: 0.85rem; }
}
</style>