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
</script>

<template>
    <div class="auction-page">
        <div v-if="loading && displayAuctions.length === 0" class="loading-state" style="text-align:center; padding:100px 0; color:#888;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>載入競標資料中...</p>
        </div>

        <div v-else class="auction-container">
            <h1 class="page-title">線上競標 <span>Live Auctions</span></h1>
            <p class="page-desc">限時競標，結標前 3 分鐘出價自動延長。</p>
            
            <div class="auction-grid">
                <div v-for="item in displayAuctions" :key="item.id" class="auction-card" @click="goToDetail(item.id)">
                    <div class="card-img-box">
                        <!-- 使用 NuxtImg -->
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
                        <h3>{{ item.morph }} <span v-if="item.gender && item.gender !== '未定'">({{ item.gender }})</span></h3>
                        <p class="morph" v-if="item.note">{{ item.note.substring(0, 30) }}{{ item.note.length > 30 ? '...' : '' }}</p>
                        <div class="price-info">
                            <div class="price-col">
                                <span>起標價</span>
                                <strong>${{ item.start_price }}</strong>
                            </div>
                            <div class="price-col">
                                <span>直購價</span>
                                <strong>${{ item.buy_now_price }}</strong>
                            </div>
                        </div>
                        <div class="countdown" :class="{ 'ending-soon': isEndingSoon(item) }">
                            ⏳ {{ getCountdownText(item) }}
                        </div>
                    </div>
                </div>
            </div>
            
            <div v-if="displayAuctions.length === 0" style="text-align:center; padding: 3rem; color: #888;">
                目前尚無開放中的競標商品。
            </div>
        </div>
    </div>
</template>

<style scoped>
.auction-page { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; color: var(--txt); }
.page-title { font-size: 2rem; margin-bottom: 0.5rem; display: flex; align-items: baseline; gap: 1rem; }
.page-title span { font-size: 1rem; color: #888; }
.page-desc { color: #666; margin-bottom: 2rem; }

.auction-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem; }
.auction-card { display: flex; flex-direction: column; background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; overflow: hidden; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
.auction-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0,0,0,0.3); border-color: var(--pri); }

.card-img-box { width: 100%; aspect-ratio: 4 / 3; background-color: #000; position: relative; overflow: hidden; border-bottom: 1px solid var(--bd); }
.card-img-box img { width: 100%; height: 100%; object-fit: cover; display: block; }

.status-badge { position: absolute !important; top: 10px !important; left: 10px !important; padding: 4px 12px !important; border-radius: 20px !important; font-size: 0.85rem !important; font-weight: bold !important; color: #fff !important; z-index: 10 !important; }
.badge-active { background: var(--pri) !important; box-shadow: 0 0 10px rgba(255, 69, 0, 0.5); }
.badge-ended { background: #666 !important; }

.card-info { padding: 1rem; display: flex; flex-direction: column; flex-grow: 1; }
.card-info h3 { margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--txt); }
.morph { color: #aaa; font-size: 0.9rem; margin-bottom: 1rem; }
.price-info { display: flex; justify-content: space-between; margin-bottom: 1rem; background: rgba(255,255,255,0.03); padding: 0.5rem; border-radius: 8px; border: 1px solid var(--bd); }
.price-col { display: flex; flex-direction: column; }
.price-col span { font-size: 0.8rem; color: #888; }
.price-col strong { font-size: 1.1rem; color: var(--pri); }
.countdown { margin-top: auto; font-weight: bold; color: #ddd; text-align: center; padding: 0.5rem; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--bd); }
.countdown.ending-soon { color: #fff; background: #e74c3c; border-color: #c0392b; animation: pulse 1.5s infinite; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.8; } 100% { opacity: 1; } }

/* Day Mode */
:global(body.day-mode) .auction-page { color: #333; }
:global(body.day-mode) .auction-card { background: #fff; border-color: #ddd; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
:global(body.day-mode) .auction-card:hover { box-shadow: 0 8px 25px rgba(0,0,0,0.1); border-color: var(--pri); }
:global(body.day-mode) .card-img-box { background-color: #f4f4f4; border-bottom-color: #eee; }
:global(body.day-mode) .card-info h3 { color: #111; }
:global(body.day-mode) .morph { color: #666; }
:global(body.day-mode) .price-info { background: #f9f9f9; border-color: #eee; }
:global(body.day-mode) .countdown { background: #eee; color: #444; border-color: #ddd; }
:global(body.day-mode) .countdown.ending-soon { background: #e74c3c; color: #fff; border-color: #c0392b; }
</style>