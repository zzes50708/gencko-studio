<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const router = useRouter()

useHead({
    title: '線上競標',
    meta:[
        { name: 'description', content: 'Gencko Studio 限時競標專區，參與拍賣把心儀的守宮帶回家！結標前 3 分鐘出價自動延長。' },
        { property: 'og:title', content: '線上競標 | Gencko Studio' },
        { property: 'og:description', content: 'Gencko Studio 限時競標專區，參與拍賣把心儀的守宮帶回家！' },
        { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/auction' },
        { property: 'og:type', content: 'website' }
    ]
})

const loading = computed(() => store.loading)
const displayAuctions = computed(() => store.auctionList || [ ])

const now = ref(new Date().getTime())
let timer = null

onMounted(() => {
    timer = setInterval(() => { now.value = new Date().getTime() }, 1000)
})

onUnmounted(() => {
    if (timer) clearInterval(timer)
})

const getAuctionStatus = (item) => {
    if (!item) return { status: 'unknown', text: '未知', class: '' }
    if (now.value >= new Date(item.end_time).getTime()) return { status: 'ended', text: '已結標', class: 'badge-ended' }
    return { status: 'active', text: '競標中', class: 'badge-active' }
}

const isEndingSoon = (item) => {
    if (!item) return false
    const diff = new Date(item.end_time).getTime() - now.value
    return diff > 0 && diff <= 180000 // 3 分鐘內
}

const getCountdownText = (item) => {
    if (!item) return ''
    const diff = new Date(item.end_time).getTime() - now.value
    if (diff <= 0) return '已結束'
    const d = Math.floor(diff / (1000 * 60 * 60 * 24))
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
    const m = Math.floor((diff / 1000 / 60) % 60)
    const s = Math.floor((diff / 1000) % 60)
    let res = ''
    if (d > 0) res += `${d}天 `
    res += `${h.toString().padStart(2, '0')}時 ${m.toString().padStart(2, '0')}分 ${s.toString().padStart(2, '0')}秒`
    return res
}

const goToDetail = (id) => {
    router.push(`/auction/${id}`)
}

const goBack = () => {
    if (window.history.state && window.history.state.back) {
        router.back()
    } else {
        router.push('/')
    }
}
</script>

<template>
    <div class="auction-page">
        <div class="nav-action-row m-only">
            <button class="app-back-btn" @click="goBack">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                返回
            </button>
        </div>

        <div v-if="loading && displayAuctions.length === 0" class="loading-state" style="text-align:center; padding:100px 0;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p style="color: var(--txt); opacity: 0.7;">載入競標資料中...</p>
        </div>

        <div v-else class="auction-container">
            <h1 class="page-title dt-only">線上競標 <span>Live Auctions</span></h1>
            <p class="page-desc dt-only">限時競標，結標前 3 分鐘出價自動延長。</p>
            
            <div class="auction-grid">
                <div v-for="item in displayAuctions" :key="item.id" class="auction-card" @click="goToDetail(item.id)">
                    <div class="card-img-box">
                        <NuxtImg 
                            :src="item.images && item.images.length ? getCleanUrl(item.images[0]) : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/placeholder.jpg'" 
                            :alt="item.morph" 
                            loading="lazy"
                            width="280"
                            height="210"
                            fit="cover"
                            format="webp"
                        />
                        <div class="status-badge" :class="getAuctionStatus(item).class">
                            {{ getAuctionStatus(item).text }}
                        </div>
                    </div>
                    <div class="card-info">
                        <h3 class="morph-name">{{ item.morph }} <span class="gender-tag" v-if="item.gender && item.gender !== '未定'">({{ item.gender }})</span></h3>
                        <p class="morph-desc" v-if="item.note">{{ item.note.substring(0, 20) }}{{ item.note.length > 20 ? '...' : '' }}</p>
                        <div class="price-info">
                            <div class="price-col">
                                <span class="price-label">起標價</span>
                                <strong class="price-val">${{ item.start_price }}</strong>
                            </div>
                            <div class="price-divider"></div>
                            <div class="price-col">
                                <span class="price-label">直購價</span>
                                <strong class="price-val">${{ item.buy_now_price }}</strong>
                            </div>
                        </div>
                        <div class="countdown" :class="{ 'ending-soon': isEndingSoon(item) }">
                            ⏳ {{ getCountdownText(item) }}
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-if="displayAuctions.length === 0" class="empty-state">
                目前尚無開放中的競標商品。
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 徹底移除寫死的顏色，使用 CSS 變數自動適配日夜模式 */
.auction-page { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; color: var(--txt); }

.dt-only { display: block; }
.m-only { display: none !important; }

.nav-action-row {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    margin-bottom: 10px;
}

.app-back-btn {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    color: var(--txt);
    font-size: 0.95rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 30px;
    transition: 0.2s;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
}

.app-back-btn:active {
    transform: scale(0.95);
}

.page-title { font-size: 2rem; margin-bottom: 0.5rem; display: flex; align-items: baseline; gap: 1rem; color: var(--txt); }
.page-title span { font-size: 1rem; color: var(--txt); opacity: 0.5; }
.page-desc { color: var(--txt); opacity: 0.7; margin-bottom: 2rem; }

.auction-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.auction-card { display: flex; flex-direction: column; background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.auction-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.15); border-color: var(--pri); }

.card-img-box { width: 100%; aspect-ratio: 4 / 3; background-color: var(--card-bg); position: relative; overflow: hidden; border-bottom: 1px solid var(--bd); }
.card-img-box img { width: 100%; height: 100%; object-fit: cover; display: block; }

.status-badge { 
    position: absolute; 
    top: 10px; 
    left: 10px; 
    padding: 4px 12px; 
    border-radius: 20px; 
    font-size: 0.85rem; 
    font-weight: bold; 
    color: #fff; 
    z-index: 10;
    width: max-content;
    white-space: nowrap;
    line-height: 1.2;
}
.badge-active { background: var(--pri); box-shadow: 0 0 10px rgba(255, 69, 0, 0.5); }
.badge-ended { background: #666; }

.card-info { padding: 1rem; display: flex; flex-direction: column; flex-grow: 1; }
.morph-name { margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--txt); line-height: 1.3; }
.gender-tag { font-size: 0.9rem; color: var(--txt); opacity: 0.6; }
.morph-desc { color: var(--txt); opacity: 0.7; font-size: 0.9rem; margin-bottom: 1rem; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 價格區域使用變數適配 */
.price-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: var(--card-bg); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--bd); }
.price-col { display: flex; flex-direction: column; align-items: flex-start; flex: 1; }
.price-col:last-child { align-items: flex-end; }
.price-label { font-size: 0.75rem; color: var(--txt); opacity: 0.6; margin-bottom: 2px; }
.price-val { font-size: 1.1rem; color: var(--pri); font-weight: bold; }
.price-divider { width: 1px; height: 25px; background: var(--bd); margin: 0 10px; }

/* 倒數計時區塊使用變數適配 */
.countdown { margin-top: auto; font-weight: bold; color: var(--txt); text-align: center; padding: 8px; border-radius: 6px; background: var(--card-bg); border: 1px solid var(--bd); font-size: 0.95rem; }
.countdown.ending-soon { color: #fff; background: #e74c3c; border-color: #c0392b; animation: pulse 1.5s infinite; }
.empty-state { text-align:center; padding: 3rem; color: var(--txt); opacity: 0.6; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.8; } 100% { opacity: 1; } }

@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .m-only { display: flex !important; }
    
    .auction-page { padding: 5px 10px 15px 10px; }
    .auction-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px; }
    .auction-card { border-radius: 8px; }
    .card-img-box { aspect-ratio: 1 / 1; }
    .card-info { padding: 6px 8px; }
    .status-badge { padding: 2px 6px; font-size: 0.65rem; top: 4px; left: 4px; }
    .morph-name { font-size: 0.85rem; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gender-tag { font-size: 0.75rem; }
    .morph-desc { display: none; }
    
    .price-info { padding: 4px 6px; margin-bottom: 6px; flex-direction: column; align-items: flex-start; gap: 4px; }
    .price-divider { display: none; }
    .price-col, .price-col:last-child { align-items: flex-start; width: 100%; }
    .price-label { font-size: 0.65rem; }
    .price-val { font-size: 0.95rem; }
    
    .countdown { padding: 4px; font-size: 0.75rem; }
}
</style>