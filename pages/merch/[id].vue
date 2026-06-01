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

//[SEO] ?箔??其撩?蝡舀葡??(SSR) ??撠梯?踹閰脣????誑?Ｙ?甇?Ⅱ??Meta
const { data: currentMerch, pending } = await useAsyncData('merch-' + merchId, async () => {
    // ??Store 銝剖歇蝬??券????”嚗?閰西?敺ㄐ?Ｘ
    if (store.merchList && store.merchList.length > 0) {
        const found = store.merchList.find(m => String(m.ItemID) === String(merchId))
        if (found) return found
    }

    // ?亦鞈? (SSR ??仿脣?折?)嚗? Supabase ?亥岷
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
});

//[SEO] ?? Meta ??瑽?鞈?
const siteData = computed(() => {
    if (currentMerch.value) {
        const m = currentMerch.value
        
        const imgUrl = m.ImageURL ? getCleanUrl(m.ImageURL) : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
        const itemUrl = 'https://www.genckobreeding.com/merch/' + m.ItemID
        const title = m.Name + ' - NT$' + m.Price
        const desc = m.Description ? (m.Description.slice(0, 150) + '...') : ('Gencko 周邊商品：' + m.Name + '，價格 NT$' + m.Price)
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

        const breadcrumb = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "擐?", "item": "https://www.genckobreeding.com/" },
                { "@type": "ListItem", "position": 2, "name": "周邊商品", "item": "https://www.genckobreeding.com/merch" },
                { "@type": "ListItem", "position": 3, "name": m.Name, "item": itemUrl }
            ]
        }

        return {
            title,
            desc,
            img: imgUrl,
            url: itemUrl,
            script:[
                { type: 'application/ld+json', children: JSON.stringify(jsonLd) },
                { type: 'application/ld+json', children: JSON.stringify(breadcrumb) }
            ]
        }
    }
    
    return {
        title: '找不到該商品',
        desc: '請確認網址是否正確，或稍後再試一次。',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
        url: 'https://www.genckobreeding.com/merch/' + merchId,
        script:[ ]
    }
})

useHead({
    title: computed(() => siteData.value.title),
    meta:[
        { name: 'description', content: computed(() => siteData.value.desc) },
        { property: 'og:title', content: computed(() => siteData.value.title + ' | Gencko Studio') },
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
        console.error('銴ˊ憭望?:', err)
    }
}
</script>

<template>
    <div class="merch-detail-wrapper">
        <!-- Loading State -->
        <div v-if="pending" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>載入商品中...</p>
            <TheBackButton fallback="/merch" text="返回周邊列表" style="justify-content: center; margin-top: 20px;" />
        </div>

        <!-- Not Found State -->
        <div v-else-if="!currentMerch" style="text-align:center; padding:100px 0; color:#888;">
            <h2>找不到該商品</h2>
            <p>請確認網址是否正確，或稍後再試一次。</p>
            <TheBackButton fallback="/merch" text="返回周邊列表" style="justify-content: center; margin-top: 20px;" />
        </div>

        <!-- Detail View -->
        <div v-else class="prod-container">
            <!-- ?? 撘?典??梁??App-like 餈??? -->
            <TheBackButton fallback="/merch" text="返回列表" />

            <div class="prod-layout">
                <div class="prod-img-box">
                    <!-- ?? ?詨?靽格迤嚗? NuxtImg ?寧?? img嚗蒂閮剔 eager ?芸?頛 -->
                    <img 
                        v-if="currentMerch.ImageURL"
                        :src="getCleanUrl(currentMerch.ImageURL)" 
                        :alt="currentMerch.Name" 
                        class="prod-main-img" 
                        @click="store.openLightbox(currentMerch)" 
                        style="cursor: pointer;" 
                        title="暺??曉之??"
                        loading="eager"
                        decoding="async"
                    />
                    <div class="prod-hint">點擊圖片可放大</div>
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
                           class="btn-app btn-app--primary btn-app--lg btn-app--pill btn-buy-lg" 
                           rel="noopener noreferrer">
                           立即私訊購買
                        </a>
                        <button class="btn-share" @click="copyCurrentLink">複製連結</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 
  [撅?冽見撘耨敺夜 
  撌脫??文神甇餌?瘛梯??滓?脣?擃蝣潦?
  ?券撠 CSS 霈嚗宏?斗???敹???:global(body.day-mode) 閬神??
  撌脣?日?銴? app-back-btn ?賊?璅????
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

/* ?? Mobile Optimizations (撌血??單???) */
@media (max-width: 768px) {
    .merch-detail-wrapper { padding: 0 10px 15px 10px; }
    
    /* ?寧銝行??? Grid嚗椰?游摰祝摨行?抒? */
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
    
    .prod-hint { display: none; } /* ???蒂???梯???隞亦?蝛粹? */
    
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



