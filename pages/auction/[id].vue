<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const route = useRoute()
const router = useRouter()
const store = useMainStore()
const supabase = useSupabaseClient()
const auctionId = route.params.id

// [SEO] 為了在伺服器端渲染 (SSR) 期間就能拿到該商品資料以產生正確的 Meta
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

// 存放當前登入使用者狀態 (Google 或 LINE 統一格式)
const currentUser = ref(null)
const isPlacingBid = ref(false) 

// 1. 檢查 Google 登入狀態 (Supabase原生)
if (import.meta.client) {
    supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user) {
            currentUser.value = { type: 'google', email: data.session.user.email }
        }
    })
    supabase.auth.onAuthStateChange((_, session) => {
        if (session?.user) {
            currentUser.value = { type: 'google', email: session.user.email }
        } else if (currentUser.value?.type === 'google') {
            currentUser.value = null
        }
    })
}

// 2. 檢查並初始化 LINE 登入狀態 (動態引入 LIFF)
onMounted(() => {
    if (import.meta.client) {
        const script = document.createElement('script')
        script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
        script.onload = async () => {
            try {
                await window.liff.init({ liffId: '2009804483-8KRouTSr' })
                if (window.liff.isLoggedIn()) {
                    const profile = await window.liff.getProfile()
                    const idToken = window.liff.getDecodedIDToken()
                    const emailOrId = (idToken && idToken.email) ? idToken.email : profile.userId
                    currentUser.value = { type: 'line', name: profile.displayName, email: emailOrId }
                }
            } catch (err) {
                console.error('LIFF 初始化失敗', err)
            }
        }
        document.head.appendChild(script)
    }
})

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

// 🌟 App-like 返回邏輯
const goBack = () => {
    if (window.history.state && window.history.state.back) {
        router.back()
    } else {
        router.push('/auction')
    }
}

const loginWithGoogle = async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.href }
        })
        if (error) throw error
    } catch (err) {
        alert('登入失敗，請稍後再試！')
        console.error(err)
    }
}

const loginWithLine = () => {
    if (window.liff && !window.liff.isLoggedIn()) {
        localStorage.setItem('gencko_line_redirect', window.location.href)
        window.liff.login({ redirectUri: window.location.href })
    }
}

const logout = async () => {
    if (currentUser.value?.type === 'line' && window.liff) {
        window.liff.logout()
    } else {
        await supabase.auth.signOut()
    }
    currentUser.value = null
    alert('您已成功登出！')
    window.location.reload() 
}

const placeBid = async () => {
    if (!currentUser.value) {
        alert('請先點擊按鈕登入後，再進行出價！')
        return
    }

    if (myBidAmount.value < minNextBid.value) {
        alert(`出價金額必須大於等於 ${minNextBid.value}`)
        return
    }

    isPlacingBid.value = true 
    const emailOrId = currentUser.value.email

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
            if (currentUser.value.type === 'line') {
                const name = currentUser.value.name
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
</script>

<template>
    <div class="auction-page-wrapper">
        <!-- 🌟 App-like 返回按鈕 -->
        <div class="nav-action-row">
            <button class="app-back-btn" @click="goBack">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                返回列表
            </button>
        </div>

        <div v-if="pending" class="loading-state" style="text-align:center; padding:100px 0; color:var(--txt); opacity:0.6;">
            <div class="loader" style="margin:0 auto 20px auto;"></div>
            <p>載入競標資料中...</p>
        </div>

        <!-- 🌟 重構的 HTML 結構：讓 Mobile Grid 能完美拆分左右 -->
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
                <!-- 歷史出價在桌機放左邊，手機會被排到最下面 -->
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
                    <div class="status-badge" :class="getAuctionStatus(currentAuction).class">
                        {{ getAuctionStatus(currentAuction).text }}
                    </div>
                    <h2>{{ currentAuction.morph }} <span class="m-gender" v-if="currentAuction.gender && currentAuction.gender !== '未定'">({{ currentAuction.gender }})</span></h2>
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

                <div class="timer-box" :class="{ 'ending-soon': isEndingSoon(currentAuction) }">
                    <div class="timer-title">剩餘時間</div>
                    <div class="timer-value">{{ getCountdownText(currentAuction) }}</div>
                    <div class="timer-note">結標前3分鐘喊標自動延長。</div>
                </div>

                <div class="action-box" v-if="getAuctionStatus(currentAuction).status === 'active'">
                    <template v-if="currentUser">
                        <div class="user-info-box">
                            <span v-if="currentUser.type === 'line'" class="u-name">✅ LINE：{{ currentUser.name }}</span>
                            <span v-else class="u-name">✅ Google：{{ currentUser.email }}</span>
                            <button @click="logout" class="btn-logout">登出</button>
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
                            <button @click="loginWithLine" class="btn-login-line">
                                <img src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/line.png" alt="LINE" />
                                LINE 登入
                            </button>
                            <button @click="loginWithGoogle" class="btn-login-google">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                Google 登入
                            </button>
                        </div>
                    </template>
                </div>
                <div class="action-box ended" v-else>
                    競標已結束，得標者為：<br><span style="color:var(--pri); font-size:1.2rem; display:block; margin-top:5px;">{{ highestBidAmount > 0 && currentBids.length > 0 ? currentBids[0].user_name : '流標' }}</span>
                </div>

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
            <button @click="goBack" class="app-back-btn" style="margin: 20px auto;">回列表</button>
        </div>
    </div>
</template>

<style scoped>
.auction-page-wrapper { max-width: 1200px; margin: 0 auto; padding: 15px; color: var(--txt); }

/* 🌟 App-like 膠囊返回按鈕 (全面使用變數) */
.nav-action-row { width: 100%; display: flex; justify-content: flex-start; margin-bottom: 15px; }
.app-back-btn { background: var(--card-bg); border: 1px solid var(--bd); color: var(--txt); font-size: 0.95rem; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 30px; transition: 0.2s; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
.app-back-btn:active { transform: scale(0.95); background: var(--bd); }

/* 🌟 Desktop Layout */
.detail-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
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

.price-dashboard { margin-bottom: 1.5rem; background: var(--card-bg); border: 1px solid var(--bd); padding: 15px; border-radius: 12px; }
.price-row { display: flex; justify-content: space-between; align-items: center; font-size: 1.1rem; }
.p-lbl { color: var(--txt); opacity: 0.6; }
.price-row .highest-price { font-size: 2rem; font-weight: bold; color: var(--pri); text-shadow: 0 0 10px rgba(255,69,0,0.2); }
.price-row.sub { font-size: 0.9rem; color: var(--txt); opacity: 0.6; border-top: 1px dashed var(--bd); margin-top: 10px; padding-top: 10px; }

.timer-box { background: var(--card-bg); border: 1px solid var(--bd); padding: 1.5rem; border-radius: 12px; text-align: center; margin-bottom: 1.5rem; }
.timer-title { font-size: 0.9rem; color: var(--txt); opacity: 0.6; margin-bottom: 0.5rem; }
.timer-value { font-size: 2rem; font-weight: bold; letter-spacing: 2px; font-family: monospace; color: var(--txt); }
.timer-note { font-size: 0.8rem; color: var(--txt); opacity: 0.6; margin-top: 0.5rem; }

/* 倒數快結束時維持紅底白字 (此為警告狀態不吃日夜變數) */
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

/* 🌟 Mobile UI (The 2-Column Grid Layout) */
@media (max-width: 768px) {
    .auction-page-wrapper { padding: 0 10px 15px 10px; }
    .nav-action-row { margin-bottom: 8px; }
    .app-back-btn { padding: 6px 12px; font-size: 0.9rem; }
    
    .detail-layout {
        display: grid;
        /* 圖片固定寬度 110px，其餘空間給文字與價格 */
        grid-template-columns: 110px 1fr;
        gap: 10px;
        align-items: start;
    }
    
    .left-col, .right-col { display: contents; } /* 解除 DOM 限制，讓子元素直接參與 Grid */

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

    .price-dashboard {
        grid-column: 2 / 3;
        grid-row: 2 / 3;
        margin-bottom: 0;
        padding: 0;
        background: transparent;
        border: none;
    }
    .price-row { font-size: 0.9rem; flex-direction: column; align-items: flex-start; gap: 2px; }
    .p-lbl { font-size: 0.75rem; }
    .price-row .highest-price { font-size: 1.35rem; line-height: 1; }
    .price-row.sub { display: none; /* 手機版隱藏次要價格以節省高度 */ }

    /* 滿版區塊 */
    .timer-box { grid-column: 1 / -1; grid-row: 3 / 4; margin: 10px 0; padding: 10px; border-radius: 8px; }
    .timer-title { font-size: 0.8rem; margin-bottom: 2px; }
    .timer-value { font-size: 1.5rem; }
    .timer-note { font-size: 0.7rem; }

    .action-box { grid-column: 1 / -1; grid-row: 4 / 5; padding: 12px; border-radius: 10px; margin-bottom: 10px; }
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

    .info-section { grid-column: 1 / -1; grid-row: 5 / 6; margin-bottom: 10px; }
    .specs-list { grid-template-columns: 1fr 1fr; gap: 6px; }
    .specs-list li { padding: 8px; font-size: 0.85rem; border-radius: 6px; }
    .note-box { padding: 10px; font-size: 0.85rem; margin-top: 10px; }

    .bid-history { grid-column: 1 / -1; grid-row: 6 / 7; padding: 12px; border-radius: 10px; }
    .history-header h3 { font-size: 1rem; }
    .btn-toggle { font-size: 0.75rem; padding: 3px 8px; }
    .history-list li { padding: 8px 0; font-size: 0.85rem; }
}
</style>