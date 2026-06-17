<script setup>
import { computed, ref } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const supabase = useSupabaseClient()

// SSR：抓取自留種群（給 schema 用）
const { data: ssrBreeders } = await useAsyncData('breeders-list-seo-v1', async () => {
    try {
        const { data, error } = await supabase
            .from('animals')
            .select('id, species, morph, genes, gender_type, gender_value, birthday, image_url, status')
            .eq('status', 'SelfKeep')
        if (error || !data) return []
        return data.map(a => ({
            ID: a.id,
            Species: a.species,
            Morph: a.morph,
            Genes: Array.isArray(a.genes) ? a.genes : [],
            GenderType: a.gender_type,
            GenderValue: a.gender_value,
            Birthday: a.birthday,
            ImageURL: a.image_url
        }))
    } catch (e) {
        console.error('[breeders SSR] fetch failed:', e?.message)
        return []
    }
})

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

const breedersUrl = 'https://www.genckobreeding.com/breeders'
const breedersImg = 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
const breedersPublisher = {
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

const breedersListLd = computed(() => {
    const list = ssrBreeders.value || []
    if (!list.length) return null
    return {
        "@type": "ItemList",
        "@id": `${breedersUrl}#list`,
        "name": "Gencko Breeding Studio 自留種群",
        "numberOfItems": list.length,
        "itemListElement": list.map((a, idx) => {
            const geneStr = (a.Genes || []).join('、')
            return {
                "@type": "ListItem",
                "position": idx + 1,
                "item": {
                    "@type": "Thing",
                    "@id": `${breedersUrl}#breeder-${a.ID}`,
                    "name": a.Morph,
                    "description": `${a.Species} ${a.Morph}${a.GenderType ? '（' + a.GenderType + '）' : ''}${geneStr ? '，基因：' + geneStr : ''}`,
                    ...(a.ImageURL ? { "image": getCleanUrl(a.ImageURL) } : {}),
                    "additionalProperty": [
                        { "@type": "PropertyValue", "name": "物種", "value": a.Species },
                        ...(a.GenderType ? [{ "@type": "PropertyValue", "name": "性別", "value": a.GenderType }] : []),
                        ...(geneStr ? [{ "@type": "PropertyValue", "name": "基因組合", "value": geneStr }] : []),
                        ...(a.Birthday ? [{ "@type": "PropertyValue", "name": "出生日", "value": a.Birthday }] : [])
                    ]
                }
            }
        })
    }
})

const breedersBreadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://www.genckobreeding.com/" },
        { "@type": "ListItem", "position": 2, "name": "種群展示", "item": breedersUrl }
    ]
}

const breedersWebPageLd = computed(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": breedersUrl,
    "url": breedersUrl,
    "name": "Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母",
    "inLanguage": "zh-TW",
    "isPartOf": { "@type": "WebSite", "@id": "https://www.genckobreeding.com/#website" },
    "primaryImageOfPage": { "@type": "ImageObject", "url": breedersImg },
    "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".page-title", ".morph-title"]
    },
    "publisher": breedersPublisher,
    "about": breedersPublisher,
    "mentions": [
        { "@type": "Taxon", "name": "Eublepharis macularius", "alternateName": "豹紋守宮", "sameAs": "https://www.wikidata.org/wiki/Q185061" },
        { "@type": "Taxon", "name": "Hemitheconyx caudicinctus", "alternateName": "肥尾守宮", "sameAs": "https://www.wikidata.org/wiki/Q913571" }
    ],
    ...(breedersListLd.value ? { "mainEntity": breedersListLd.value } : {})
}))

useHead({
    title: 'Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母',
    meta:[
        { name: 'description', content: 'Gencko Breeding Studio 自留種群展示。完整收錄正在使用中的豹紋守宮與肥尾守宮繁育種公與種母，含基因組合、性別與孵化日，是了解 Gencko 選育血統與未來子代規劃的窗口。' },
        { name: 'keywords', content: '守宮種群, 豹紋守宮種公, 豹紋守宮種母, 肥尾守宮種公, 守宮繁育血統, Gencko 選育' },
        // Open Graph
        { property: 'og:title', content: 'Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母' },
        { property: 'og:description', content: 'Gencko Breeding Studio 自留種群展示，含基因組合、性別與孵化日。' },
        { property: 'og:image', content: breedersImg },
        { property: 'og:image:alt', content: 'Gencko 種群展示 - 豹紋守宮與肥尾守宮繁育種公種母' },
        { property: 'og:url', content: breedersUrl },
        { property: 'og:type', content: 'website' },
        // Twitter Card
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母' },
        { name: 'twitter:description', content: 'Gencko Breeding Studio 自留種群展示，含基因組合、性別與孵化日。' },
        { name: 'twitter:image', content: breedersImg }
    ],
    link:[ { rel: 'canonical', href: breedersUrl } ],
    script: computed(() => [
        { type: 'application/ld+json', children: JSON.stringify(breedersWebPageLd.value) },
        { type: 'application/ld+json', children: JSON.stringify(breedersBreadcrumbLd) }
    ])
})
</script>

<template>
    <div class="breeders-page-wrapper">
        <!-- SEO：頁面唯一 h1（sr-only 含完整關鍵字） -->
        <h1 class="sr-only">Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母</h1>
        <!-- 視覺主標保留為 div（桌機可見、手機隱藏） -->
        <div class="page-title dt-only" aria-hidden="true">種群展示</div>
        
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