<script setup>
import { computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()

// 取出並綁定全域的 breeder_sp 狀態
const breederSp = computed({
    get: () => store.breeder_sp || '豹紋守宮',
    set: (val) => { store.breeder_sp = val }
})

// 計算種群展示列表
const breedersList = computed(() => {
    let list = store.inv.filter(i => i.Species === breederSp.value && i.Status === 'NotForSale' && i.Status !== 'Trash')
    return list.sort((a, b) => {
        const imgA = a.ImageURL ? 1 : 0
        const imgB = b.ImageURL ? 1 : 0
        if (imgA !== imgB) return imgB - imgA 
        return new Date(b.CreatedDate) - new Date(a.CreatedDate)
    })
})

useHead({
    title: '種群展示',
    meta:[
        { name: 'description', content: 'Gencko Studio 種群展示。看看我們培育出的優質豹紋守宮與肥尾守宮種公種母。' },
        { property: 'og:title', content: '種群展示 | Gencko Studio' },
        { property: 'og:description', content: 'Gencko Studio 種群展示。看看我們培育出的優質守宮種公種母。' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/breeders' }
    ]
})
</script>

<template>
    <div>
        <h1 class="page-title">種群展示</h1>
        <div class="tabs">
            <div class="tab" :class="{active: breederSp === '豹紋守宮'}" @click="breederSp = '豹紋守宮'">豹紋守宮</div>
            <div class="tab" :class="{active: breederSp === '肥尾守宮'}" @click="breederSp = '肥尾守宮'">肥尾守宮</div>
        </div>

        <div v-if="breedersList.length === 0" style="text-align:center; padding: 3rem; color: #888;">
            目前尚無可展示的種群資料。
        </div>

        <!-- Breeders Grid (Photo Grid) -->
        <div class="grid photo-grid" v-else>
            <div class="card" v-for="i in breedersList" :key="i.ID" @click="store.openLightbox(i)">
                <!-- 使用 NuxtImg -->
                <NuxtImg 
                    v-if="i.ImageURL"
                    :src="getCleanUrl(i.ImageURL)" 
                    :alt="i.Morph" 
                    class="card-img" 
                    loading="lazy"
                    width="300"
                    height="300"
                    fit="cover"
                    format="webp"
                />
                <div v-else class="card-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:2rem;background:#000;">🦎</div>
                
                <div class="card-body" style="padding:10px;">
                    <div class="morph-title" style="font-size:1rem;text-align:center;">{{ i.Morph }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tabs { display: flex; gap: 0; margin-bottom: 15px; background: #111; border-radius: 8px; overflow: hidden; border: 1px solid var(--bd); }
.tab { flex: 1; padding: 12px; text-align: center; cursor: pointer; color: #666; font-weight: 700; font-size: 1rem; transition: 0.3s; border-right: 1px solid #222; }
.tab:last-child { border-right: none; }
.tab.active { background: var(--pri); color: #000; box-shadow: inset 0 0 20px rgba(0,0,0,0.2); }

.photo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.photo-grid .card-img { width: 100%; height: auto; aspect-ratio: 1 / 1; object-fit: cover; cursor: pointer; background-color: #000; }
.morph-title { margin: 0; font-weight: bold; color: var(--txt); }

:global(body.day-mode) .tabs { background: #eee; border-color: #ccc; }
:global(body.day-mode) .tab { border-right-color: #ccc; color: #666; }
:global(body.day-mode) .tab.active { background: #ddd; color: #000; }
:global(body.day-mode) .morph-title { color: #111; }
:global(body.day-mode) .photo-grid .card-img { background-color: #f4f4f4; }

@media (max-width: 768px) {
    .grid.photo-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px; }
}
</style>