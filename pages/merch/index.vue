<script setup>
import { computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()

// 取出全域周邊商品列表
const merchList = computed(() => store.merchList || [ ])

useHead({
    title: '周邊商品',
    meta:[
        { name: 'description', content: 'Gencko Studio 精選爬蟲飼養器材、加熱墊、躲避屋與營養品。提供最適合守宮與爬蟲的專業周邊。' },
        { property: 'og:title', content: '周邊商品 | Gencko Studio' },
        { property: 'og:description', content: 'Gencko Studio 精選爬蟲飼養器材、加熱墊、躲避屋與營養品。提供最適合守宮與爬蟲的專業周邊。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/merch' },
        { property: 'og:type', content: 'website' }
    ],
    link:[
        { rel: 'canonical', href: 'https://www.genckobreeding.com/merch' }
    ]
})
</script>

<template>
    <div class="merch-page-wrapper">
        <!-- 🌟 桌機版顯示標題，手機版隱藏 -->
        <h1 class="page-title dt-only">周邊商品</h1>

        <div v-if="store.loading && merchList.length === 0" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>商品載入中...</p>
        </div>

        <div class="grid" v-else>
            <!-- 點擊後跳轉到動態商品內頁 -->
            <NuxtLink v-for="m in merchList" :key="m.ItemID" :to="`/merch/${m.ItemID}`" class="card" style="text-decoration:none; color:inherit; display:flex; flex-direction:column;">
                <!-- 使用 NuxtImg -->
                <NuxtImg 
                    v-if="m.ImageURL"
                    :src="getCleanUrl(m.ImageURL)" 
                    :alt="m.Name" 
                    class="card-img" 
                    loading="lazy"
                    width="220"
                    height="180"
                    fit="cover"
                    format="webp"
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