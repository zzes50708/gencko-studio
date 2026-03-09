<script>
import { computed } from 'vue';
import { useHead } from '@vueuse/head';

export default {
    name: 'HospitalView',
    props: {
        hospCity: { type: String, required: true },
        hospDistrict: { type: String, required: true },
        hospRegions: { type: Object, default: () => ({}) },
        hospAvailableCities: { type: Set, default: () => new Set() },
        hospDistricts: { type: Array, default: () => [] },
        hospFiltered: { type: Array, default: () => [] }
    },
    emits: ['change-city', 'update:hospDistrict'],
    setup(props) {
        // [SEO] 動態地圖 Meta 與結構化資料
        const siteData = computed(() => {
            const city = props.hospCity === 'all' ? '' : props.hospCity;
            const dist = props.hospDistrict === 'all' ? '' : props.hospDistrict;
            const locationStr = city ? `${city}${dist}` : '全台';
            
            const title = `${locationStr} 特寵醫院地圖`;
            const desc = `Gencko Studio 整理之${locationStr}爬蟲、守宮、特寵動物醫院名單 (${props.hospFiltered.length}間)。提供電話、地址與導航資訊，讓您的寵物獲得最即時的醫療協助。`;

            // ItemList Schema (針對 Local SEO 優化)
            const jsonLd = {
                "@context": "https://schema.org",
                "@type": "ItemList",
                "itemListElement": props.hospFiltered.slice(0, 20).map((h, index) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                        "@type": "VeterinaryCare",
                        "name": h.name,
                        "telephone": h.phone,
                        "address": h.address,
                        "image": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/hospital-icon.png" // 通用圖標
                    }
                }))
            };

            return {
                title,
                desc,
                script: [{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
            };
        });

        useHead({
            title: computed(() => siteData.value.title),
            meta: [
                { name: 'description', content: computed(() => siteData.value.desc) },
                { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
                { property: 'og:description', content: computed(() => siteData.value.desc) },
                { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%AE%98%E7%B6%B2%E8%83%8C%E6%99%AF.png' },
                { property: 'og:url', content: 'https://www.genckobreeding.com/hospital' }
            ],
            script: computed(() => siteData.value.script)
        });
    },
    methods: {
        getMapLink(h) {
            if(h.mapUrl) return h.mapUrl;
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`;
        }
    }
}
</script>

<template>
    <div class="hosp-container">
        <h1 class="page-title">特寵醫院搜尋地圖</h1>
        
        <!-- Filter Section -->
        <div class="hosp-filter-row">
            <div class="hosp-select-group">
                <label class="hosp-label">Region & City / 區域與縣市</label>
                <select class="hosp-select" :value="hospCity" @change="$emit('change-city', $event.target.value)">
                    <option value="all">所有縣市 (ALL CITIES)</option>
                    <optgroup v-for="(cities, region) in hospRegions" :key="region" :label="region">
                        <option v-for="city in cities" :key="city" :value="city" v-show="hospAvailableCities.has(city)">
                            {{ city }}
                        </option>
                    </optgroup>
                </select>
                <div class="hosp-select-icon">➜</div>
            </div>
            <div class="hosp-select-group">
                <label class="hosp-label">District / 行政區</label>
                <select class="hosp-select" :value="hospDistrict" @change="$emit('update:hospDistrict', $event.target.value)" :disabled="hospCity === 'all'">
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
                        <span class="hosp-tag">{{ h.city }} {{ h.district }}</span>
                        <a :href="'tel:' + h.phone.replace(/[^\d]/g, '')" class="hosp-call-btn">Call Now</a>
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