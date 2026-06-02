<script setup>
import { computed, ref } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()

// 物種切換（使用本地 ref，store 中未定義 breeder_sp，直接寫入 store 不具響應性）
const breederSp = ref('豹紋守宮')

// 性別篩選
const breederGender = ref('全部')

// 計算種群展示列表（加入性別篩選）
const breedersList = computed(() => {
    let list = store.inv.filter(i => {
        if (i.Species !== breederSp.value || i.Status !== 'SelfKeep') return false
        if (breederGender.value === '公') {
            return i.GenderType === '公' || (i.GenderType === '溫控' && Number(i.GenderValue) >= 30)
        }
        if (breederGender.value === '母') {
            return i.GenderType === '母' || (i.GenderType === '溫控' && Number(i.GenderValue) <= 27)
        }
        return true
    })
    return list.sort((a, b) => {
        const imgA = a.ImageURL ? 1 : 0
        const imgB = b.ImageURL ? 1 : 0
        if (imgA !== imgB) return imgB - imgA
        return new Date(b.CreatedDate) - new Date(a.CreatedDate)
    })
})

// 各性別數量統計
const genderCount = computed(() => {
    const all = store.inv.filter(i => i.Species === breederSp.value && i.Status === 'SelfKeep')
    const male = all.filter(i => i.GenderType === '公' || (i.GenderType === '溫控' && Number(i.GenderValue) >= 30)).length
    const female = all.filter(i => i.GenderType === '母' || (i.GenderType === '溫控' && Number(i.GenderValue) <= 27)).length
    return { all: all.length, male, female }
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
    <div class="breeders-page-wrapper">
        <!-- 🌟 桌機版顯示標題，手機版隱藏 -->
        <h1 class="page-title dt-only">種群展示</h1>
        
        <div class="tabs">
            <button type="button" class="tab" :class="{active: breederSp === '豹紋守宮'}" @click="breederSp = '豹紋守宮'; breederGender = '全部'">豹紋守宮</button>
            <button type="button" class="tab" :class="{active: breederSp === '肥尾守宮'}" @click="breederSp = '肥尾守宮'; breederGender = '全部'">肥尾守宮</button>
        </div>

        <!-- 性別篩選 -->
        <div class="gender-filter-row">
            <button class="g-btn" :class="{active: breederGender === '全部'}" @click="breederGender = '全部'">
                全部 <span class="g-count">{{ genderCount.all }}</span>
            </button>
            <button class="g-btn male" :class="{active: breederGender === '公'}" @click="breederGender = '公'">
                ♂ 種公 <span class="g-count">{{ genderCount.male }}</span>
            </button>
            <button class="g-btn female" :class="{active: breederGender === '母'}" @click="breederGender = '母'">
                ♀ 種母 <span class="g-count">{{ genderCount.female }}</span>
            </button>
        </div>

        <div v-if="breedersList.length === 0" style="text-align:center; padding: 3rem; color: #888;">
            目前尚無可展示的種群資料。
        </div>

        <!-- Breeders Grid (Photo Grid) -->
        <div class="grid photo-grid" v-else>
            <div class="card" v-for="i in breedersList" :key="i.ID" role="button" tabindex="0" :aria-label="`查看 ${i.Morph} 大圖`" @click="store.openLightbox(i)" @keydown.enter.space.prevent="store.openLightbox(i)">
                <!-- 🌟 核心修正：將 NuxtImg 替換為原生 img -->
                <img 
                    v-if="i.ImageURL"
                    :src="getCleanUrl(i.ImageURL, 400)" 
                    :alt="i.Morph" 
                    class="card-img" 
                    loading="lazy"
                    decoding="async"
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
/* 
  [局部樣式修復] 
  已清除錯誤貼上的 .calc-warn 樣式與多餘的 .card 全域定義。
  全面導入 CSS 變數重構 .tabs，並移除所有 :global(body.day-mode) 的強制色彩覆寫。
*/
.breeders-page-wrapper { 
    max-width: 1200px; 
    margin: 0 auto; 
}

/* 🌟 Responsive Utilities */
.dt-only { display: block; }

/* 頁籤切換 (變數化) */
.tabs { 
    display: flex; 
    gap: 0; 
    margin-bottom: 15px; 
    background: var(--card-bg); 
    border-radius: 8px; 
    overflow: hidden; 
    border: 1px solid var(--bd); 
}
.tab {
    flex: 1;
    padding: 12px;
    text-align: center;
    cursor: pointer;
    color: var(--txt);
    opacity: 0.6;
    font-weight: 700;
    font-size: 1rem;
    transition: 0.3s;
    border-right: 1px solid var(--bd);
    background: transparent;
    border-top: none;
    border-bottom: none;
    border-left: none;
    font-family: inherit;
}
.tab:last-child { 
    border-right: none; 
}
.tab.active { 
    background: var(--pri); 
    color: #fff; 
    opacity: 1;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.1); 
}

/* 性別篩選列 */
.gender-filter-row {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
}
.g-btn {
    flex: 1;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--bd);
    background: var(--card-bg);
    color: var(--txt);
    font-size: 0.9rem;
    font-weight: bold;
    cursor: pointer;
    transition: 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    opacity: 0.7;
}
.g-btn:hover { opacity: 1; border-color: var(--bd-hover); }
.g-btn.active { opacity: 1; background: var(--pri); color: #fff; border-color: var(--pri); box-shadow: 0 2px 8px var(--pri-glow); }
.g-btn.male.active  { background: #3498db; border-color: #3498db; box-shadow: 0 2px 8px rgba(52,152,219,0.4); }
.g-btn.female.active { background: #e91e63; border-color: #e91e63; box-shadow: 0 2px 8px rgba(233,30,99,0.4); }
.g-count { font-size: 0.75rem; background: rgba(255,255,255,0.25); padding: 1px 6px; border-radius: 10px; }

/* 🌟 種群專屬的 3 欄排版微調 */
.photo-grid { 
    display: grid; 
    grid-template-columns: repeat(3, 1fr); 
    gap: 15px; 
}
.photo-grid .card-img { 
    width: 100%; 
    height: auto; 
    aspect-ratio: 1 / 1; 
    object-fit: cover; 
    cursor: pointer; 
    background-color: var(--card-bg); 
    border-bottom: 1px solid var(--bd); 
    transition: filter 0.3s; 
}
.morph-title { 
    margin: 0; 
    font-weight: bold; 
    color: var(--txt); 
    white-space: nowrap; 
    overflow: hidden; 
    text-overflow: ellipsis; 
}

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .breeders-page-wrapper { padding-top: 0; }
    .tabs { margin-bottom: 15px; }
    .tab { padding: 10px; font-size: 0.95rem; }

    /* 改為 3 欄並縮小間距 */
    .grid.photo-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 6px; }
    .morph-title { font-size: 0.8rem !important; }
}
</style>