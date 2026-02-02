<script>
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
    methods: {
        // 純顯示邏輯，保留在 View 層
        getMapLink(h) {
            if(h.mapUrl) return h.mapUrl;
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`;
        }
    }
}
</script>

<template>
    <div class="hosp-container">
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

            <div v-for="h in hospFiltered" :key="h.id" class="hosp-card">
                <div class="hosp-content-row">
                    <div class="hosp-info">
                        <h3 class="hosp-name">{{ h.name }}</h3>
                        
                        <a :href="getMapLink(h)" target="_blank" class="hosp-detail-row hosp-link">
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
            </div>
        </div>

        <footer class="hosp-footer">
            <span>EXOTIC_VET_MAP_TW</span>
            <div class="hosp-divider"></div>
            <span>V4.0 (PORTED)</span>
        </footer>
    </div>
</template>