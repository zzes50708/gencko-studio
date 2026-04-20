<script setup>
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { HOSPITAL_REGIONS, HOSPITAL_DATA } from '~/utils/hospitals.js'

const store = useMainStore()

const hospCity = ref('all')
const hospDistrict = ref('all')

const hospAvailableCities = computed(() => new Set(HOSPITAL_DATA.map(h => h.city)))

const hospDistricts = computed(() => {
    if (hospCity.value === 'all') return[]
    const set = new Set(HOSPITAL_DATA.filter(h => h.city === hospCity.value).map(h => h.district))
    return Array.from(set).sort()
})

const hospFiltered = computed(() => {
    return HOSPITAL_DATA.filter(h => {
        const cityMatch = hospCity.value === 'all' || h.city === hospCity.value
        const districtMatch = hospDistrict.value === 'all' || h.district === hospDistrict.value
        return cityMatch && districtMatch
    })
})

const hospWishlist = computed(() => store.hospWishlist)

const changeCity = (val) => {
    hospCity.value = val
    hospDistrict.value = 'all'
}

const toggleHospWishlist = (id) => {
    if (store.hospWishlist.includes(id)) {
        store.hospWishlist = store.hospWishlist.filter(x => x !== id)
    } else {
        store.hospWishlist.push(id)
    }
    if (import.meta.client) {
        localStorage.setItem('gencko_hosp_wishlist', JSON.stringify(store.hospWishlist))
    }
}

const getMapLink = (h) => {
    if (h.mapUrl) return h.mapUrl
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`
}

// [SEO] 動態地圖 Meta 與結構化資料
const siteData = computed(() => {
    const city = hospCity.value === 'all' ? '' : hospCity.value
    const dist = hospDistrict.value === 'all' ? '' : hospDistrict.value
    const locationStr = city ? `${city}${dist}` : '全台'
    
    const title = `${locationStr} 特寵醫院地圖`
    const desc = `Gencko Studio 整理之${locationStr}爬蟲、守宮、特寵動物醫院名單 (${hospFiltered.value.length}間)。提供電話、地址與導航資訊，讓您的寵物獲得最即時的醫療協助。`

    // ItemList Schema (針對 Local SEO 優化)
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": hospFiltered.value.slice(0, 20).map((h, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "item": {
                "@type": "VeterinaryCare",
                "name": h.name,
                "telephone": h.phone,
                "address": h.address,
                "image": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/hospital-icon.png"
            }
        }))
    }

    return {
        title,
        desc,
        script:[{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
    }
})

useHead({
    title: computed(() => siteData.value.title),
    meta:[
        { name: 'description', content: computed(() => siteData.value.desc) },
        { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
        { property: 'og:description', content: computed(() => siteData.value.desc) },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/hospital' }
    ],
    script: computed(() => siteData.value.script)
})
</script>

<template>
    <div class="hosp-container">
        <h1 class="page-title">特寵醫院搜尋地圖</h1>
        
        <div style="background: rgba(255, 69, 0, 0.05); border: 1px dashed var(--pri); color: var(--txt); padding: 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 1.2rem; line-height: 1.2;">💡</span> 
            <div>
                <strong style="color: var(--pri);">收藏清單儲存於本機瀏覽器</strong><br>
                <span style="opacity: 0.8;">若清除瀏覽器快取或更換手機/電腦，收藏紀錄將會消失喔！</span>
            </div>
        </div>

        <!-- Filter Section -->
        <div class="hosp-filter-row">
            <div class="hosp-select-group">
                <label class="hosp-label">Region & City / 區域與縣市</label>
                <select class="hosp-select" :value="hospCity" @change="changeCity($event.target.value)">
                    <option value="all">所有縣市 (ALL CITIES)</option>
                    <optgroup v-for="(cities, region) in HOSPITAL_REGIONS" :key="region" :label="region">
                        <option v-for="city in cities" :key="city" :value="city" v-show="hospAvailableCities.has(city)">
                            {{ city }}
                        </option>
                    </optgroup>
                </select>
                <div class="hosp-select-icon">➜</div>
            </div>
            <div class="hosp-select-group">
                <label class="hosp-label">District / 行政區</label>
                <select class="hosp-select" v-model="hospDistrict" :disabled="hospCity === 'all'">
                    <option value="all">所有區域 (ALL DISTRICTS)</option>
                    <option v-for="d in hospDistricts" :key="d" :value="d">{{ d }}</option>
                </select>
                <div class="hosp-select-icon">➜</div>
            </div>
        </div>

        <!-- Results Info -->
        <div class="hosp-count-row">
            <span class="hosp-count">RECORDS: {{ hospFiltered.length }}</span>
            <div class="hosp-divider"></div>
        </div>

        <!-- Hospital List -->
        <div class="hosp-list">
            <div v-if="hospFiltered.length === 0" class="hosp-empty">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin:0 auto 10px auto;">
                    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                NO RESULTS FOUND
            </div>

            <article v-for="h in hospFiltered" :key="h.id" class="hosp-card">
                <div class="hosp-content-row">
                    <div class="hosp-info">
                        <h3 class="hosp-name">{{ h.name }}</h3>
                        
                        <a :href="getMapLink(h)" target="_blank" class="hosp-detail-row hosp-link" rel="noopener noreferrer">
                            <svg class="hosp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                            <span>{{ h.address }}</span>
                        </a>

                        <div class="hosp-detail-row">
                            <svg class="hosp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                            <span style="font-family:monospace">{{ h.phone }}</span>
                        </div>
                    </div>

                    <div class="hosp-actions">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="hosp-tag">{{ h.city }} {{ h.district }}</span>
                            <span class="fav-btn" :class="{active: hospWishlist.includes(h.id)}" @click.stop.prevent="toggleHospWishlist(h.id)" style="position: relative; top: auto; right: auto; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">❤</span>
                        </div>
                        <a :href="'tel:' + h.phone.replace(/[^\d]/g, '')" class="hosp-call-btn" style="width: 100%; text-align: center;">Call Now</a>
                    </div>
                </div>
            </article>
        </div>

        <footer class="hosp-footer">
            <span>EXOTIC_VET_MAP_TW</span>
            <div class="hosp-divider"></div>
            <span>V4.0 (PORTED)</span>
        </footer>
    </div>
</template>

<style scoped>
.hosp-container { max-width: 900px; margin: 0 auto; padding-top: 15px; }
.hosp-filter-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.hosp-select-group { position: relative; }
.hosp-label { display: block; font-size: 0.7rem; font-weight: 700; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
.hosp-select { width: 100%; padding: 10px; background: var(--card-bg); border: 1px solid var(--bd); color: var(--txt); border-radius: 0; font-weight: bold; font-size: 0.9rem; outline: none; appearance: none; cursor: pointer; transition: 0.2s; }
.hosp-select:focus { border-color: var(--pri); }
.hosp-select:disabled { opacity: 0.3; cursor: not-allowed; }
.hosp-select-icon { position: absolute; right: 10px; bottom: 10px; pointer-events: none; opacity: 0.4; transform: rotate(90deg); color: var(--txt); }
.hosp-count-row { display: flex; align-items: center; margin-bottom: 10px; padding: 0 5px; }
.hosp-count { font-size: 0.7rem; font-family: monospace; opacity: 0.5; letter-spacing: 2px; text-transform: uppercase; white-space: nowrap; }
.hosp-divider { height: 1px; flex: 1; background: var(--bd); margin: 0 15px; opacity: 0.3; }
.hosp-list { display: flex; flex-direction: column; gap: 8px; }
.hosp-card { padding: 14px; border: 1px solid var(--bd); background: var(--card-bg); position: relative; transition: 0.3s; display: flex; flex-direction: column; }
.hosp-card:hover { border-color: rgba(255, 69, 0, 0.4); transform: translateY(-2px); }
.hosp-card::after { content: ''; position: absolute; top: 0; right: 0; width: 16px; height: 16px; border-right: 1px solid rgba(255,255,255,0.1); border-top: 1px solid rgba(255,255,255,0.1); }
.hosp-card:hover::after { border-color: var(--pri); }
.hosp-content-row { display: flex; justify-content: space-between; gap: 12px; }
.hosp-info { flex: 1; }
.hosp-name { font-size: 1rem; font-weight: bold; margin-bottom: 6px; color: var(--txt); }
.hosp-detail-row { display: flex; align-items: flex-start; gap: 6px; font-size: 0.8rem; color: #aaa; margin-bottom: 4px; line-height: 1.4; }
.hosp-icon { width: 12px; height: 12px; flex-shrink: 0; margin-top: 2px; color: var(--pri); }
.hosp-link { text-decoration: none; color: inherit; transition: 0.2s; display: flex; align-items: center; }
.hosp-link:hover { color: var(--pri); }
.hosp-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.hosp-tag { font-size: 0.6rem; font-weight: bold; padding: 2px 5px; border: 1px solid var(--bd); background: var(--card-bg); color: var(--pri); font-family: monospace; }
.hosp-call-btn { padding: 5px 10px; font-size: 0.6rem; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border: 1px solid var(--pri); color: var(--pri); text-decoration: none; transition: 0.2s; }
.hosp-call-btn:hover { background: var(--pri); color: #000; }
.hosp-empty { text-align: center; padding: 40px 0; border: 1px dashed var(--bd); opacity: 0.5; font-family: monospace; letter-spacing: 2px; font-size: 0.8rem; }
.hosp-footer { margin-top: 30px; padding-bottom: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 0.6rem; font-family: monospace; opacity: 0.3; text-transform: uppercase; letter-spacing: 3px; }

@media (max-width: 768px) {
    .hosp-filter-row { grid-template-columns: 1fr; gap: 8px; }
    .hosp-content-row { flex-direction: column; }
    .hosp-actions { flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; }
}
</style>