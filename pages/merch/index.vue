<script setup>
import { computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

const store = useMainStore()

// 取出全域周邊商品列表
const merchList = computed(() => store.merchList ||[])

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

const convertLink = (url) => {
    if (!url) return ''
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    let target = url
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`
}
</script>

<template>
    <div>
        <h1 class="page-title">周邊商品</h1>

        <div v-if="store.loading && merchList.length === 0" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>商品載入中...</p>
        </div>

        <div class="grid" v-else>
            <!-- 點擊後跳轉到動態商品內頁 -->
            <NuxtLink v-for="m in merchList" :key="m.ItemID" :to="`/merch/${m.ItemID}`" class="card" style="text-decoration:none; color:inherit; display:block;">
                <img :src="convertLink(m.ImageURL)" :alt="m.Name" class="card-img" loading="lazy">
                <div class="card-body">
                    <h2 class="morph-title" style="font-size: 1.1rem; margin-bottom: 8px;">{{ m.Name }}</h2>
                    <div class="price" style="font-size: 1.2rem; font-weight: bold; color: var(--pri);">NT$ {{ m.Price }}</div>
                </div>
            </NuxtLink>
        </div>
    </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; }

.card { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 10px; overflow: hidden; position: relative; transition: 0.3s; cursor: pointer; }
.card:hover { transform: translateY(-3px); border-color: rgba(255, 87, 34, 0.8); box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

.card-img { width: 100%; height: 180px; object-fit: cover; background: #000; border-bottom: 1px solid var(--bd); transition: filter 0.3s; }
.card-body { padding: 12px; position: relative; }

.morph-title { margin: 0; font-weight: bold; color: var(--txt); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

:global(body.day-mode) .card { background: #fff; border-color: #ddd; }
:global(body.day-mode) .card:hover { border-color: var(--pri); box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
:global(body.day-mode) .card-img { background: #f4f4f4; border-bottom-color: #eee; }
:global(body.day-mode) .morph-title { color: #111; }

@media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; gap: 15px; }
    .card-img { height: 200px; aspect-ratio: auto; }
}
</style>