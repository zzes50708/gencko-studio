<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const route = useRoute()
const store = useMainStore()
const supabase = useSupabaseClient()
const auctionId = route.params.id

//[SEO] 為了在伺服器端渲染 (SSR) 期間就能拿到該商品資料以產生正確的 Meta
const { data: currentAuction, pending } = await useAsyncData(`auction-${auctionId}`, async () => {
    if (store.auctionList && store.auctionList.length > 0) {
        const found = store.auctionList.find(a => a.id === auctionId)
        if (found) return found
    }

    const { data, error } = await supabase
        .from('auctions')
        .select('*')
        .eq('id', auctionId)
        .single()

    if (error || !data) return null

    return data
})

const realBids = ref([ ])
let bidsSubscription = null

const isPlacingBid = ref(false) 

const currentBids = computed(() => {
    return[ ...realBids.value ].sort((a, b) => b.amount - a.amount)
})

const highestBidAmount = computed(() => {
    if (currentBids.value.length === 0) return currentAuction.value?.start_price || 0
    return currentBids.value[0].amount
})

const minNextBid = computed(() => {
    if (!currentAuction.value) return 0
    return highestBidAmount.value === 0 && currentAuction.value.start_price === 0 
        ? currentAuction.value.min_increment 
        : highestBidAmount.value + currentAuction.value.min_increment
})

const myBidAmount = ref(0)
const isBidsExpanded = ref(false) 
const customNickname = ref('')

watch(minNextBid, (newVal) => {
    if (myBidAmount.value < newVal) {
        myBidAmount.value = newVal
    }
}, { immediate: true })

const loadBids = async (id) => {
    try {
        const { data, error } = await supabase
            .from('auction_bids')
            .select('*')
            .eq('auction_id', id)
        if (error) throw error
        realBids.value = data || [ ]
    } catch (err) {
        console.error("載入出價紀錄失敗:", err)
    }
}

const subscribeToBids = (id) => {
    if (!import.meta.client) return
    if (bidsSubscription) supabase.removeChannel(bidsSubscription)
    bidsSubscription = supabase.channel(`public:auction_bids:${id}`)
        .on('postgres_changes', { 
            event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `auction_id=eq.${id}`
        }, payload => {
            realBids.value.push(payload.new)
        }).subscribe()
}

watch(() => route.params.id, async (newId) => {
    if (newId) {
        if (import.meta.client) {
            await loadBids(newId)
            subscribeToBids(newId)
        }
    } else {
        realBids.value = [ ]
        if (import.meta.client && bidsSubscription) {
            supabase.removeChannel(bidsSubscription)
            bidsSubscription = null
        }
    }
}, { immediate: true })

const now = ref(new Date().getTime())
let timer = null

onMounted(() => {
    if (import.meta.client) {
        timer = setInterval(() => { now.value = new Date().getTime() }, 1000)
    }
})

onUnmounted(() => {
    if (import.meta.client) {
        if (timer) clearInterval(timer)
        if (bidsSubscription) supabase.removeChannel(bidsSubscription)
    }
})

const getAuctionStatus = (item) => {
    if (!item) return { status: 'unknown', text: '未知', class: '' }
    if (now.value >= new Date(item.end_time).getTime()) return { status: 'ended', text: '已結標', class: 'badge-ended' }
    return { status: 'active', text: '競標中', class: 'badge-active' }
}

const isEndingSoon = (item) => {
    if (!item) return false
    const diff = new Date(item.end_time).getTime() - now.value
    return diff > 0 && diff <= 180000
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

const formatTime = (isoString) => {
    if(!isoString) return ''
    const d = new Date(isoString)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

// 動態生成 SEO 與社群分享卡片 (Open Graph) 資料
const siteData = computed(() => {
    if (currentAuction.value) {
        const a = currentAuction.value
        const title = `限時競標：${a.morph} ${a.gender && a.gender !== '未定' ? '('+a.gender+')' : ''}`
        const desc = `目前最高出價 NT$${highestBidAmount.value}。${a.note ? a.note.substring(0, 40) + '...' : 'Gencko Studio 嚴選守宮，點擊參與競標！'}`
        const img = a.images && a.images.length ? getCleanUrl(a.images[0]) : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
        const url = `https://www.genckobreeding.com/auction/${a.id}`
        return { title, desc, img, url }
    }
    return {
        title: '找不到此競標商品',
        desc: '該商品可能已下架或不存在。',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
        url: `https://www.genckobreeding.com/auction/${auctionId}`
    }
})

useHead({
    title: computed(() => siteData.value.title),
    meta:[
        { name: 'description', content: computed(() => siteData.value.desc) },
        { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
        { property: 'og:description', content: computed(() => siteData.value.desc) },
        { property: 'og:image', content: computed(() => siteData.value.img) },
        { property: 'og:url', content: computed(() => siteData.value.url) },
        { property: 'og:type', content: 'website' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ]
})

const placeBid = async () => {
    if (!store.currentUser) {
        alert('請先點擊按鈕登入後，再進行出價！')
        return
    }

    if (myBidAmount.value < minNextBid.value) {
        alert(`出價金額必須大於等於 ${minNextBid.value}`)
        return
    }

    isPlacingBid.value = true 
    const emailOrId = store.currentUser.email

    try {
        const { data: blacklistData, error: blacklistError } = await supabase
            .from('blacklist')
            .select('email')
            .eq('email', emailOrId)

        if (blacklistError) throw blacklistError

        if (blacklistData && blacklistData.length > 0) {
            alert('⚠️ 您的帳號已被限制出價功能。若有疑問請聯絡官方管理員。')
            isPlacingBid.value = false
            return 
        }

        let finalName = ''
        if (customNickname.value && customNickname.value.trim() !== '') {
            finalName = customNickname.value.trim()
        } else {
            if (store.currentUser.type === 'line') {
                const name = store.currentUser.name
                if (name.length <= 1) finalName = name + '***'
                else if (name.length === 2) finalName = name.charAt(0) + '*'
                else finalName = name.charAt(0) + 'O' + name.charAt(name.length - 1)
            } else {
                const emailPrefix = emailOrId.split('@')[0]
                finalName = emailPrefix.length > 3 ? `${emailPrefix.substring(0, 3)}***` : `${emailPrefix}***`
            }
        }

        const { error: bidError } = await supabase.from('auction_bids').insert([
            { 
                auction_id: currentAuction.value.id, 
                user_name: finalName, 
                amount: myBidAmount.value, 
                phone: emailOrId 
            }
        ])
        if (bidError) throw bidError

        const end_time = new Date(currentAuction.value.end_time).getTime()
        if (end_time - new Date().getTime() <= 180000) {
            const newEndTime = new Date(end_time + 180000).toISOString()
            await supabase.from('auctions').update({ end_time: newEndTime }).eq('id', currentAuction.value.id)
            alert('因在結標前三分鐘內出價，結標時間已自動延長 3 分鐘！')
        } else {
            alert('出價成功！')
        }
        
        isBidsExpanded.value = true
        myBidAmount.value = myBidAmount.value + currentAuction.value.min_increment
    } catch (err) {
        alert('出價失敗，請稍後再試！')
        console.error(err)
    } finally {
        isPlacingBid.value = false 
    }
}

const buyNow = () => {
    if (confirm(`確定要以直購價 $${currentAuction.value.buy_now_price} 直接購買嗎？\n點選「確定」將為您開啟官方 LINE。`)) {
        window.open(`https://line.me/R/ti/p/@219abdzn?text=${encodeURIComponent(`Hi, 我要直購競標個體！\n編號：${currentAuction.value.id}`)}`, '_blank')
    }
}

// 🌟 方案一：原生系統分享
const shareLink = async () => {
    if (navigator.share) {
        try {
            await navigator.share({
                title: siteData.value.title,
                text: siteData.value.desc,
                url: window.location.href,
            })
        } catch (err) {
            console.log('分享已取消或失敗', err)
        }
    } else {
        try {
            await navigator.clipboard.writeText(window.location.href)
            store.triggerToast()
        } catch (err) {
            console.error('複製失敗:', err)
        }
    }
}

// 🌟 方案二：生成正方形 IG 宣傳圖卡 (Canvas 升級版)
const generatedImage = ref(null)
const isGenerating = ref(false)

const generatePromo = async () => {
    if (!currentAuction.value) return
    isGenerating.value = true
    
    try {
        const canvas = document.createElement('canvas')
        canvas.width = 1080
        canvas.height = 1080
        const ctx = canvas.getContext('2d')

        const img = new Image()
        img.crossOrigin = "Anonymous"
        const targetUrl = currentAuction.value.images && currentAuction.value.images.length > 0
            ? getCleanUrl(currentAuction.value.images[0]) 
            : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/placeholder.jpg'

        img.src = targetUrl

        await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
        })

        const imgAreaHeight = 820

        // 背景高斯模糊
        ctx.filter = 'blur(40px)'
        const bgScale = Math.max(1080 / img.width, imgAreaHeight / img.height)
        const bgW = img.width * bgScale
        const bgH = img.height * bgScale
        ctx.drawImage(img, (1080 - bgW) / 2, (imgAreaHeight - bgH) / 2, bgW, bgH)
        
        ctx.filter = 'none'
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
        ctx.fillRect(0, 0, 1080, imgAreaHeight)

        // 完整呈現主圖
        const scale = Math.min(1080 / img.width, imgAreaHeight / img.height)
        const w = img.width * scale
        const h = img.height * scale
        const x = (1080 - w) / 2
        const y = (imgAreaHeight - h) / 2
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
        ctx.shadowBlur = 20
        ctx.shadowOffsetY = 10
        ctx.drawImage(img, x, y, w, h)
        ctx.shadowColor = 'transparent'

        // 底部資訊背景
        ctx.fillStyle = '#FF4500'
        ctx.fillRect(0, imgAreaHeight, 1080, 1080 - imgAreaHeight)

        // 繪製文字
        ctx.fillStyle = '#FFFFFF'
        ctx.textAlign = 'left'
        
        ctx.font = 'bold 75px sans-serif'
        ctx.fillText(currentAuction.value.morph.substring(0, 16), 50, 930)

        // 不顯示價格，顯示狀態與性別
        ctx.font = 'bold 45px sans-serif'
        const statusTxt = getAuctionStatus(currentAuction.value).status === 'active' ? '🔥 競標中' : '🚫 已結標'
        const genderTxt = currentAuction.value.gender && currentAuction.value.gender !== '未定' ? `(${currentAuction.value.gender})` : ''
        ctx.fillText(`${statusTxt}   ${genderTxt}`, 50, 1010)

        // 品牌 Logo 文字
        ctx.textAlign = 'right'
        ctx.font = '900 65px Arial, sans-serif'
        ctx.fillText('GENCKO', 1030, 930)
        ctx.font = 'bold 35px Arial, sans-serif'
        ctx.fillText('STUDIO', 1030, 1000)

        generatedImage.value = canvas.toDataURL('image/jpeg', 0.9)
    } catch (err) {
        console.error('圖卡生成失敗', err)
        alert('圖片生成失敗，可能是因為網路跨域限制。')
    } finally {
        isGenerating.value = false
    }
}
</script>

<template>
    <div class="auction-page-wrapper">
        <TheBackButton fallback="/auction" text="返回列表" />

        <div v-if="pending" class="loading-state" style="text-align:center; padding:100px 0; color:var(--txt); opacity:0.6;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>載入競標資料中...</p>
        </div>

        <div v-else-if="currentAuction" class="detail-layout">
            
            <div class="left-col">
                <div class="main-img" @click="store.openLightbox(currentAuction.images && currentAuction.images.length ? { ImageURL: currentAuction.images[0] } : { ImageURL: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/placeholder.jpg' })">
                    <NuxtImg 
                        :src="currentAuction.images && currentAuction.images.length ? getCleanUrl(currentAuction.images[0]) : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/placeholder.jpg'" 
                        :alt="currentAuction.morph" 
                        width="600"
                        height="450"
                        fit="cover"
                        format="webp"
                    />
                    <div class="zoom-hint">🔍 點擊放大圖片</div>
                </div>
                <div class="bid-history">
                    <div class="history-header">
                        <h3>出價紀錄 ({{ currentBids.length }})</h3>
                        <button v-if="currentBids.length > 1" @click="isBidsExpanded = !isBidsExpanded" class="btn-toggle">
                            {{ isBidsExpanded ? '收起' : '展開全部' }}
                        </button>
                    </div>
                    
                    <div v-if="currentBids.length === 0" class="empty-history" style="text-align: center; padding: 1.5rem 0; color: var(--txt); opacity: 0.6;">
                        <div style="margin-bottom: 12px;">目前尚無出價，搶先成為第一位！</div>
                        <div style="font-size: 0.85rem; background: rgba(128,128,128,0.1); padding: 12px; border-radius: 8px; border: 1px dashed var(--bd); display: inline-block;">
                            💡 顯示範例：<br>
                            <span style="color: var(--txt); font-weight: bold; opacity: 1;">王O明 (或自訂暱稱)</span> 
                            出價 <span style="color: var(--pri); font-weight: bold;">${{ minNextBid }}</span>
                        </div>
                    </div>
                    <ul v-else class="history-list">
                        <template v-if="isBidsExpanded">
                            <li v-for="(bid, index) in currentBids" :key="index" :class="{ 'highest-bid': index === 0 }">
                                <span class="bidder">{{ bid.user_name }}</span>
                                <span class="bid-amount">${{ bid.amount }}</span>
                                <span class="bid-time">{{ formatTime(bid.bid_time) }}</span>
                            </li>
                        </template>
                        <template v-else>
                            <li class="highest-bid">
                                <span class="bidder">{{ currentBids[0].user_name }}</span>
                                <span class="bid-amount">${{ currentBids[0].amount }}</span>
                                <span class="bid-time">{{ formatTime(currentBids[0].bid_time) }}</span>
                            </li>
                        </template>
                    </ul>
                </div>
            </div>

            <div class="right-col">
                <div class="header-info">
                    <ClientOnly>
                        <div class="status-badge" :class="getAuctionStatus(currentAuction).class">
                            {{ getAuctionStatus(currentAuction).text }}
                        </div>
                        <template #fallback>
                            <div class="status-badge badge-active">計算中</div>
                        </template>
                    </ClientOnly>
                    <h2>{{ currentAuction.morph }} <span class="m-gender" v-if="currentAuction.gender && currentAuction.gender !== '未定'">({{ currentAuction.gender }})</span></h2>
                </div>

                <!-- 🌟 行銷操作按鈕 (分享與產生圖卡) -->
                <div class="action-sub-buttons" style="margin-bottom: 1.5rem;">
                    <button class="btn-share" @click="shareLink">分享連結</button>
                    <button class="btn-promo" @click="generatePromo" :disabled="isGenerating">
                        {{ isGenerating ? '⏳ 生成中...' : '產生圖卡' }}
                    </button>
                </div>

                <div class="price-dashboard">
                    <div class="price-row">
                        <span class="p-lbl">最高出價：</span>
                        <span class="highest-price">${{ highestBidAmount }}</span>
                    </div>
                    <div class="price-row sub">
                        <span>最低增額：${{ currentAuction.min_increment }}</span>
                        <span>直購價：${{ currentAuction.buy_now_price }}</span>
                    </div>
                </div>

                <ClientOnly>
                    <div class="timer-box" :class="{ 'ending-soon': isEndingSoon(currentAuction) }">
                        <div class="timer-title">剩餘時間</div>
                        <div class="timer-value">{{ getCountdownText(currentAuction) }}</div>
                        <div class="timer-note">結標前3分鐘喊標自動延長。</div>
                    </div>
                    <template #fallback>
                        <div class="timer-box">
                            <div class="timer-title">剩餘時間</div>
                            <div class="timer-value">⏳ 計算中...</div>
                        </div>
                    </template>
                </ClientOnly>

                <ClientOnly>
                    <div class="action-box" v-if="getAuctionStatus(currentAuction).status === 'active'">
                        <template v-if="store.currentUser">
                            <div class="user-info-box">
                                <span v-if="store.currentUser.type === 'line'" class="u-name">✅ LINE：{{ store.currentUser.name }}</span>
                                <span v-else class="u-name">✅ Google：{{ store.currentUser.email }}</span>
                                <button @click="store.logout" class="btn-logout">登出</button>
                            </div>
                            <div class="nick-input-wrap">
                                <input type="text" v-model="customNickname" placeholder="自訂顯示暱稱 (未填則遮蔽本名)" class="nick-input" maxlength="15" />
                            </div>
                            <div class="input-group">
                                <span class="currency">$</span>
                                <input type="number" v-model="myBidAmount" :min="minNextBid" :step="currentAuction.min_increment" />
                            </div>
                            <div class="action-buttons">
                                <button class="btn-bid" @click="placeBid" :disabled="isPlacingBid">
                                    {{ isPlacingBid ? '處理中...' : '確認出價' }}
                                </button>
                                <button class="btn-buy-now" @click="buyNow">直購 (${{ currentAuction.buy_now_price }})</button>
                            </div>
                            <div class="bid-hint">您的出價必須 ≥ ${{ minNextBid }}</div>
                        </template>
                        
                        <template v-else>
                            <div class="login-prompt">
                                <p>⚠️ 為遏止惡意棄標，請先登入</p>
                                <button @click="store.loginWithLine" class="btn-login-line">
                                    <img src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/line.png" alt="LINE" />
                                    LINE 登入
                                </button>
                                <button @click="store.loginWithGoogle" class="btn-login-google">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                    Google 登入
                                </button>
                            </div>
                        </template>
                    </div>
                    <div class="action-box ended" v-else>
                        競標已結束，得標者為：<br><span style="color:var(--pri); font-size:1.2rem; display:block; margin-top:5px;">{{ highestBidAmount > 0 && currentBids.length > 0 ? currentBids[0].user_name : '流標' }}</span>
                    </div>
                </ClientOnly>

                <div class="info-section">
                    <ul class="specs-list">
                        <li><strong>品系：</strong>{{ currentAuction.morph }}</li>
                        <li><strong>性別：</strong>{{ currentAuction.gender || '-' }}</li>
                        <li><strong>生日：</strong>{{ currentAuction.birth_year || '-' }}</li>
                        <li><strong>夾餵：</strong>{{ currentAuction.tongs_fed || '-' }}</li>
                        <li><strong>餌料：</strong>{{ currentAuction.diet || '-' }}</li>
                        <li><strong>運費：</strong>{{ currentAuction.shipping_info || '-' }}</li>
                    </ul>
                    <div class="note-box" v-if="currentAuction.note">
                        <strong>📝 備註：</strong>{{ currentAuction.note }}
                    </div>
                </div>
            </div>
        </div>

        <div v-else class="not-found" style="text-align:center; padding:100px 0; color:var(--txt); opacity:0.6;">
            <h2>找不到此競標商品</h2>
            <TheBackButton fallback="/auction" text="返回列表" style="margin-top: 20px; justify-content: center;" />
        </div>

        <!-- 🌟 宣傳圖卡彈窗 Modal -->
        <div v-if="generatedImage" class="promo-modal-overlay" @click="generatedImage = null">
            <div class="promo-modal-content" @click.stop>
                <button class="btn-close-promo" @click="generatedImage = null">✕</button>
                <h3 style="color: var(--txt); margin-top: 10px;">📸 宣傳圖卡已生成</h3>
                <p style="color: var(--txt); opacity: 0.8; font-size: 0.9rem;">請長按圖片儲存（或點擊右鍵另存），<br>即可完美分享至 IG 限時動態！</p>
                <img :src="generatedImage" alt="Promo Result" class="promo-result-img" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.auction-page-wrapper { max-width: 1200px; margin: 0 auto; padding: 15px; color: var(--txt); }

/* 🌟 Desktop Layout */
.detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 10px; }
.left-col .main-img { position: relative; border-radius: 12px; overflow: hidden; cursor: zoom-in; margin-bottom: 2rem; width: 100%; aspect-ratio: 4 / 3; background-color: var(--card-bg); border: 1px solid var(--bd); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
.main-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.zoom-hint { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.5); color: #fff; text-align: center; padding: 0.5rem; font-size: 0.9rem; }

.bid-history { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; padding: 1.5rem; }
.history-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--bd); padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
.history-header h3 { margin: 0; color: var(--txt); }
.btn-toggle { background: transparent; border: 1px solid var(--pri); color: var(--pri); padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; transition: 0.2s; }
.btn-toggle:hover { background: var(--pri); color: #fff; }
.history-list { list-style: none; padding: 0; margin: 0; max-height: 250px; overflow-y: auto; }
.history-list li { display: flex; justify-content: space-between; padding: 0.8rem 0; border-bottom: 1px dashed var(--bd); font-size: 0.95rem; color: var(--txt); opacity: 0.85; }
.history-list li.highest-bid { color: var(--pri); font-weight: bold; opacity: 1; }
.bid-time { color: var(--txt); opacity: 0.6; font-size: 0.8rem; }

.right-col .header-info { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.right-col h2 { margin: 0; font-size: 1.8rem; color: var(--txt); }
.m-gender { font-size: 1.2rem; color: var(--txt); opacity: 0.6; }

.status-badge { padding: 6px 14px; border-radius: 20px; font-size: 0.9rem; font-weight: bold; color: #fff; width: max-content; white-space: nowrap; line-height: 1.2; }
.badge-active { background: var(--pri); box-shadow: 0 0 10px rgba(255, 69, 0, 0.4); }
.badge-ended { background: #666; }

/* 🌟 行銷操作按鈕 (與商品頁一致) */
.action-sub-buttons { display: flex; gap: 10px; width: 100%; }
.btn-share, .btn-promo { flex: 1; background: var(--card-bg); color: var(--txt); border: 1px solid var(--bd); padding: 12px; border-radius: 25px; cursor: pointer; transition: 0.2s; font-weight: bold; font-size: 0.95rem; white-space: nowrap; }
.btn-share:hover, .btn-promo:hover { border-color: var(--pri); color: var(--pri); }
.btn-promo:disabled { opacity: 0.5; cursor: not-allowed; }

.price-dashboard { margin-bottom: 1.5rem; background: var(--card-bg); border: 1px solid var(--bd); padding: 15px; border-radius: 12px; }
.price-row { display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; }
.p-lbl { color: var(--txt); opacity: 0.6; }
.price-row .highest-price { font-size: 2rem; font-weight: bold; color: var(--pri); text-shadow: 0 0 10px rgba(255,69,0,0.2); }
.price-row.sub { font-size: 0.9rem; color: var(--txt); opacity: 0.6; border-top: 1px dashed var(--bd); margin-top: 10px; padding-top: 10px; }

.timer-box { background: var(--card-bg); border: 1px solid var(--bd); padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem; }
.timer-title { font-size: 0.9rem; color: var(--txt); opacity: 0.6; margin-bottom: 0.5rem; }
.timer-value { font-size: 2rem; font-weight: bold; letter-spacing: 2px; font-family: monospace; color: var(--txt); }
.timer-note { font-size: 0.8rem; color: var(--txt); opacity: 0.6; margin-top: 0.5rem; }

.timer-box.ending-soon { color: #fff; background: #e74c3c; border-color: #c0392b; animation: pulse 1.5s infinite; }
.timer-box.ending-soon .timer-title, 
.timer-box.ending-soon .timer-value, 
.timer-box.ending-soon .timer-note { color: #fff !important; opacity: 1; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.8; } 100% { opacity: 1; } }

.action-box { background: var(--card-bg); border: 2px solid var(--pri); border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; width: 100%; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
.action-box.ended { border-color: var(--bd); background: var(--card-bg); text-align: center; font-weight: bold; color: var(--txt); opacity: 0.7; }

.user-info-box { margin-bottom: 1rem; padding: 10px; background: var(--card-bg); border-radius: 8px; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--bd); }
.u-name { color: var(--txt); opacity: 0.9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-logout { background: var(--card-bg); border: 1px solid var(--bd); color: var(--txt); opacity: 0.7; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
.btn-logout:hover { opacity: 1; border-color: var(--txt); }

.nick-input-wrap { margin-bottom: 15px; }
.nick-input { width: 100%; padding: 12px; background: var(--card-bg); border: 1px solid var(--bd); color: var(--txt); border-radius: 8px; font-size: 0.95rem; box-sizing: border-box; }
.nick-input:focus { border-color: var(--pri); outline: none; }

.input-group { display: flex; align-items: center; margin-bottom: 1rem; border: 1px solid var(--bd); border-radius: 8px; overflow: hidden; width: 100%; }
.input-group .currency { padding: 12px 15px; background: rgba(128,128,128,0.1); color: var(--txt); font-weight: bold; border-right: 1px solid var(--bd); }
.input-group input { flex: 1; min-width: 0; border: none; padding: 12px; font-size: 1.3rem; outline: none; background: var(--card-bg); color: var(--txt); font-weight: bold; }

.action-buttons { display: flex; gap: 10px; }
.btn-bid { flex: 2; background: var(--pri); color: #fff; border: none; padding: 14px; border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px var(--pri-glow); transition: 0.2s; }
.btn-bid:hover { transform: translateY(-2px); }
.btn-bid:disabled { background: #666; cursor: not-allowed; box-shadow: none; transform: none; }
.btn-buy-now { flex: 1; background: var(--card-bg); color: var(--txt); border: 1px solid var(--bd); padding: 14px; border-radius: 8px; font-size: 0.9rem; cursor: pointer; font-weight: bold; transition: 0.2s; }
.btn-buy-now:hover { background: rgba(128,128,128,0.1); }

.bid-hint { font-size: 0.85rem; color: var(--txt); opacity: 0.6; margin-top: 10px; text-align: center; }

.login-prompt { text-align: center; padding: 10px 0; }
.login-prompt p { margin-bottom: 15px; color: #d9534f; font-weight: bold; }
.btn-login-line { background: #06C755; color: #fff; border: none; border-radius: 8px; padding: 12px; font-size: 1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 100%; gap: 10px; margin-bottom: 10px; }
.btn-login-line img { width: 24px; height: 24px; }
.btn-login-google { background: var(--card-bg); color: var(--txt); border: 1px solid var(--bd); border-radius: 8px; padding: 12px; font-size: 1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 100%; gap: 10px; transition: 0.2s; }
.btn-login-google:hover { background: rgba(128,128,128,0.1); }

.info-section { margin-bottom: 20px; }
.specs-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.specs-list li { background: var(--card-bg); padding: 12px; border-radius: 8px; font-size: 0.95rem; border: 1px solid var(--bd); color: var(--txt); }
.note-box { margin-top: 15px; padding: 12px 15px; background: var(--card-bg); border-radius: 8px; font-size: 0.95rem; line-height: 1.5; border: 1px solid var(--bd); border-left: 4px solid var(--pri); color: var(--txt); }

/* 🌟 圖卡彈窗 Modal 樣式 */
.promo-modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
    background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
    z-index: 999999; display: flex; justify-content: center; align-items: center;
    padding: 20px;
}
.promo-modal-content {
    background: var(--card-bg); border: 1px solid var(--pri);
    border-radius: 16px; padding: 20px; width: 100%; max-width: 400px;
    text-align: center; position: relative;
    box-shadow: 0 10px 40px rgba(255, 69, 0, 0.2);
    animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.btn-close-promo {
    position: absolute; top: 10px; right: 10px;
    background: transparent; border: none; color: var(--txt);
    font-size: 1.4rem; cursor: pointer; opacity: 0.6;
}
.promo-result-img {
    width: 100%; height: auto; border-radius: 8px; margin-top: 15px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.3); border: 1px solid var(--bd);
}

@keyframes zoomIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
}

@media (max-width: 768px) {
    .auction-page-wrapper { padding: 0 10px 15px 10px; }
    
    .detail-layout {
        display: grid;
        grid-template-columns: 110px 1fr;
        gap: 10px;
        align-items: start;
        margin-top: 5px;
    }
    
    .left-col, .right-col { display: contents; }

    .main-img {
        grid-column: 1 / 2;
        grid-row: 1 / 3;
        width: 100%;
        aspect-ratio: 1 / 1;
        margin-bottom: 0;
        border-radius: 8px;
    }
    .zoom-hint { display: none; }

    .header-info {
        grid-column: 2 / 3;
        grid-row: 1 / 2;
        margin-bottom: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }
    
    .status-badge { padding: 2px 8px; font-size: 0.75rem; }
    .right-col h2 { font-size: 1.1rem; line-height: 1.2; }
    .m-gender { font-size: 0.85rem; }

    .action-sub-buttons { 
        grid-column: 2 / 3;
        grid-row: 2 / 3;
        margin-bottom: 0 !important;
        gap: 6px; 
    }
    .btn-share, .btn-promo { padding: 8px 5px; font-size: 0.8rem; }

    .price-dashboard {
        grid-column: 1 / -1;
        grid-row: 3 / 4;
        margin-bottom: 0;
        margin-top: 5px;
        padding: 10px;
        background: var(--card-bg);
        border: 1px solid var(--bd);
    }
    .price-row { font-size: 0.9rem; flex-direction: row; align-items: center; justify-content: space-between; }
    .p-lbl { font-size: 0.85rem; }
    .price-row .highest-price { font-size: 1.35rem; line-height: 1; }
    .price-row.sub { display: none; }

    .timer-box { grid-column: 1 / -1; grid-row: 4 / 5; margin: 10px 0; padding: 10px; border-radius: 8px; }
    .timer-title { font-size: 0.8rem; margin-bottom: 2px; }
    .timer-value { font-size: 1.5rem; }
    .timer-note { font-size: 0.7rem; }

    .action-box { grid-column: 1 / -1; grid-row: 5 / 6; padding: 12px; border-radius: 10px; margin-bottom: 10px; }
    .user-info-box { padding: 8px; font-size: 0.85rem; margin-bottom: 10px; }
    .nick-input-wrap { margin-bottom: 10px; }
    .nick-input { padding: 8px 12px; font-size: 0.9rem; }
    .input-group { margin-bottom: 10px; }
    .input-group .currency { padding: 8px 12px; font-size: 1rem; }
    .input-group input { padding: 8px; font-size: 1.1rem; }
    
    .action-buttons { flex-direction: row; gap: 8px; }
    .btn-bid { padding: 12px; font-size: 1rem; }
    .btn-buy-now { padding: 12px; font-size: 0.85rem; flex: 1; }
    .bid-hint { font-size: 0.75rem; margin-top: 6px; }

    .info-section { grid-column: 1 / -1; grid-row: 6 / 7; margin-bottom: 10px; }
    .specs-list { grid-template-columns: 1fr 1fr; gap: 6px; }
    .specs-list li { padding: 8px; font-size: 0.85rem; border-radius: 6px; }
    .note-box { padding: 10px; font-size: 0.85rem; margin-top: 10px; }

    .bid-history { grid-column: 1 / -1; grid-row: 7 / 8; padding: 12px; border-radius: 10px; }
    .history-header h3 { font-size: 1rem; }
    .btn-toggle { font-size: 0.75rem; padding: 3px 8px; }
    .history-list li { padding: 8px 0; font-size: 0.85rem; }
}
</style>