<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useHead, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { HOSPITAL_DATA } from '~/utils/hospitals.js'
import { getCleanUrl } from '~/utils/image.js' // 🌟 引入新的圖片處理函數

const store = useMainStore()
const router = useRouter()
const supabase = useSupabaseClient()

useHead({
    title: '我的專區',
    meta:[
        { name: 'description', content: 'Gencko Studio 個人專屬儀表板。管理您的守宮收藏清單、特寵醫院地圖書籤與即時競標紀錄。' },
        { property: 'og:title', content: '我的專區 | Gencko Studio' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/profile' }
    ]
})

// 狀態管理
const currentUser = ref(null)
const activeTab = ref('wishlist')
const myBids = ref([])
const isLoadingBids = ref(false)

// 檢查登入狀態 (Google + LINE)
const checkAuth = async () => {
    if (!import.meta.client) return

    // 檢查 Supabase (Google)
    const { data } = await supabase.auth.getSession()
    if (data.session?.user) {
        currentUser.value = { 
            type: 'google', 
            email: data.session.user.email, 
            name: data.session.user.email.split('@')[0] 
        }
        fetchMyBids(currentUser.value.email)
        return
    }
    
    // 檢查 LINE LIFF
    if (window.liff && window.liff.isLoggedIn()) {
        const profile = await window.liff.getProfile()
        const idToken = window.liff.getDecodedIDToken()
        const emailOrId = (idToken && idToken.email) ? idToken.email : profile.userId
        currentUser.value = { 
            type: 'line', 
            name: profile.displayName, 
            email: emailOrId,
            picture: profile.pictureUrl
        }
        fetchMyBids(currentUser.value.email)
    }
}

onMounted(() => {
    // 延遲一點執行確保 LIFF 已載入完畢
    setTimeout(() => {
        checkAuth()
    }, 500)
})

// 抓取使用者的競標紀錄
const fetchMyBids = async (emailOrId) => {
    isLoadingBids.value = true
    try {
        const { data, error } = await supabase
            .from('auction_bids')
            .select('auction_id, amount, bid_time, auctions(morph, end_time, status, images)')
            .eq('phone', emailOrId) 
            .order('bid_time', { ascending: false })

        if (error) throw error

        const grouped = {}
        if (data) {
            data.forEach(bid => {
                if (!grouped[bid.auction_id]) {
                    grouped[bid.auction_id] = {
                        auction_id: bid.auction_id,
                        morph: bid.auctions?.morph || '未知品系',
                        image: bid.auctions?.images?.[0] || '',
                        end_time: bid.auctions?.end_time,
                        my_max_bid: bid.amount,
                        bid_count: 1
                    }
                } else {
                    grouped[bid.auction_id].bid_count++
                    if (bid.amount > grouped[bid.auction_id].my_max_bid) {
                        grouped[bid.auction_id].my_max_bid = bid.amount
                    }
                }
            })
        }
        myBids.value = Object.values(grouped)
    } catch(e) {
        console.error("讀取競標紀錄失敗:", e)
    } finally {
        isLoadingBids.value = false
    }
}

// 從 store 取得使用者的收藏清單
const wishlistItems = computed(() => {
    return store.inv.filter(item => store.wishlist.includes(item.ID))
})

// 從 store 取得收藏的特寵醫院
const hospWishlistItems = computed(() => {
    return HOSPITAL_DATA.filter(h => store.hospWishlist.includes(h.id))
})

// 登入與登出邏輯
const loginWithLine = () => {
    if (window.liff && !window.liff.isLoggedIn()) {
        localStorage.setItem('gencko_line_redirect', window.location.href)
        window.liff.login({ redirectUri: window.location.href })
    }
}

const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.href } })
}

const logout = async () => {
    if (currentUser.value?.type === 'line' && window.liff) window.liff.logout()
    else await supabase.auth.signOut()
    currentUser.value = null
    myBids.value =[]
}

// 收藏操作
const toggleWishlist = (id) => {
    if (store.wishlist.includes(id)) {
        store.wishlist = store.wishlist.filter(x => x !== id)
    } else {
        store.wishlist.push(id)
    }
    if (import.meta.client) localStorage.setItem('gencko_wishlist', JSON.stringify(store.wishlist))
}

const toggleHospWishlist = (id) => {
    if (store.hospWishlist.includes(id)) {
        store.hospWishlist = store.hospWishlist.filter(x => x !== id)
    } else {
        store.hospWishlist.push(id)
    }
    if (import.meta.client) localStorage.setItem('gencko_hosp_wishlist', JSON.stringify(store.hospWishlist))
}

const getAuctionStatus = (endTime) => {
    const now = new Date().getTime()
    if (now >= new Date(endTime).getTime()) return { text: '已結標', class: 's-sold' }
    return { text: '競標中', class: 's-res' }
}

const getMapLink = (h) => {
    if(h.mapUrl) return h.mapUrl
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`
}
</script>

<template>
    <div class="profile-page-wrapper">
        <!-- 🌟 手機版隱藏大標題 -->
        <h1 class="page-title dt-only">我的專區 <span>Personal Dashboard</span></h1>
        
        <!-- 未登入畫面 -->
        <div v-if="!currentUser" class="login-prompt-box">
            <div class="empty-icon">🔐</div>
            <h3 style="margin-bottom: 10px; color: var(--txt);">登入解鎖專屬功能</h3>
            <p style="color: #888; font-size: 0.9rem; margin-bottom: 25px;">請先登入以查看您的收藏清單與競標紀錄。</p>
            
            <div class="login-buttons">
                <button @click="loginWithLine" class="btn-login line">
                    <img src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/line.png" alt="LINE" style="width: 24px; height: 24px; object-fit: contain;">
                    使用 LINE 帳號登入
                </button>
                <button @click="loginWithGoogle" class="btn-login google">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    使用 Google 帳號登入
                </button>
            </div>
        </div>

        <!-- 已登入畫面 -->
        <div v-else>
            <!-- 🌟 App-like 使用者資訊卡片 -->
            <div class="user-card">
                <div class="user-info">
                    <img v-if="currentUser.picture" :src="currentUser.picture" alt="Avatar" class="user-avatar">
                    <div v-else class="user-avatar-placeholder">{{ currentUser.name.charAt(0).toUpperCase() }}</div>
                    <div class="user-text">
                        <h2 class="user-name">{{ currentUser.name }}</h2>
                        <span class="user-type">{{ currentUser.type === 'line' ? 'LINE 登入' : 'Google 登入' }}</span>
                    </div>
                </div>
                <button @click="logout" class="btn-logout">登出</button>
            </div>

            <!-- 🌟 App-like 分段切換器 (Segmented Control) -->
            <div class="segmented-tabs">
                <div class="seg-tab" :class="{active: activeTab === 'wishlist'}" @click="activeTab = 'wishlist'">
                    商品收藏 <span>{{ wishlistItems.length }}</span>
                </div>
                <div class="seg-tab" :class="{active: activeTab === 'hospitals'}" @click="activeTab = 'hospitals'">
                    醫院名單 <span>{{ hospWishlistItems.length }}</span>
                </div>
                <div class="seg-tab" :class="{active: activeTab === 'bids'}" @click="activeTab = 'bids'">
                    競標紀錄 <span>{{ myBids.length }}</span>
                </div>
            </div>

            <!-- Tab 1: 收藏清單 -->
            <div v-show="activeTab === 'wishlist'">
                <div v-if="wishlistItems.length === 0" class="empty-state">
                    <div class="empty-icon">❤</div>
                    <p>您的收藏清單空空如也，趕快去商城逛逛吧！</p>
                    <button class="btn-hero" @click="router.push('/shop')" style="margin-top: 15px;">前往商城</button>
                </div>
                
                <div v-else class="grid photo-grid">
                    <NuxtLink :to="`/product/${i.ID}`" class="card slim-card" v-for="i in wishlistItems" :key="i.ID" style="text-decoration:none; color:inherit;">
                        <div v-if="i.Status === 'Sold'" class="sold-stamp">SOLD</div>
                        <div style="position:absolute;top:5px;right:5px;z-index:10;">
                            <span class="fav-btn active" @click.stop.prevent="toggleWishlist(i.ID)">❤</span>
                        </div>
                        <div style="position:relative;">
                            <!-- 🌟 使用 NuxtImg 進行圖片最佳化 -->
                            <NuxtImg 
                                v-if="i.ImageURL" 
                                :src="getCleanUrl(i.ImageURL)" 
                                :alt="i.Morph" 
                                class="card-img slim-img" 
                                loading="lazy"
                                width="220"
                                height="220"
                                fit="cover"
                                format="webp"
                            />
                            <div v-else class="card-img slim-img" style="display:flex;align-items:center;justify-content:center;font-size:2rem;background:#000;">🦎</div>
                        </div>
                        <div class="card-body slim-body">
                            <h3 class="slim-title" style="margin:0;">{{ i.Morph }}</h3>
                            <div class="slim-price-row" style="margin-top:4px;">
                                <div v-if="i.Status !== 'ForSale'">
                                    <span v-if="i.Status === 'Sold'" class="status-badge s-sold">已售出</span>
                                    <span v-else-if="i.Status === 'Reserved'" class="status-badge s-res">預訂</span>
                                    <span v-else-if="i.Status === 'NotForSale'" class="status-badge s-nfs">非賣</span>
                                </div>
                                <div v-else class="price slim-price">${{ i.ListingPrice }}</div>
                            </div>
                        </div>
                    </NuxtLink>
                </div>
            </div>

            <!-- Tab 2: 收藏醫院 -->
            <div v-show="activeTab === 'hospitals'">
                <div v-if="hospWishlistItems.length === 0" class="empty-state">
                    <div class="empty-icon">🏥</div>
                    <p>您尚未收藏任何特寵醫院。</p>
                    <button class="btn-hero" @click="router.push('/hospital')" style="margin-top: 15px;">前往醫院地圖</button>
                </div>
                
                <div v-else class="hosp-list">
                    <article v-for="h in hospWishlistItems" :key="h.id" class="hosp-card">
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
                                    <span class="fav-btn active" @click.stop.prevent="toggleHospWishlist(h.id)" style="position: relative; top: auto; right: auto; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">❤</span>
                                </div>
                                <a :href="'tel:' + h.phone.replace(/[^\d]/g, '')" class="hosp-call-btn" style="width: 100%; text-align: center;">Call Now</a>
                            </div>
                        </div>
                    </article>
                </div>
            </div>

            <!-- Tab 3: 競標紀錄 -->
            <div v-show="activeTab === 'bids'">
                <div v-if="isLoadingBids" style="text-align: center; padding: 40px; color: #888;">
                    <div class="loader" style="margin: 0 auto 15px auto;"></div>
                    讀取中...
                </div>
                
                <div v-else-if="myBids.length === 0" class="empty-state">
                    <div class="empty-icon">🔨</div>
                    <p>您尚未參與任何競標活動。</p>
                    <button class="btn-hero" @click="router.push('/auction')" style="margin-top: 15px;">去競標區看看</button>
                </div>
                
                <div v-else class="bid-list">
                    <NuxtLink :to="`/auction/${bid.auction_id}`" class="bid-card" v-for="bid in myBids" :key="bid.auction_id">
                        <!-- 🌟 使用 NuxtImg 進行圖片最佳化 -->
                        <NuxtImg 
                            :src="bid.image ? getCleanUrl(bid.image) : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/placeholder.jpg'" 
                            class="bid-img"
                            loading="lazy"
                            width="120"
                            height="120"
                            fit="cover"
                            format="webp"
                        />
                        <div class="bid-info">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                <h3 style="margin: 0; font-size: 1.1rem; color: var(--txt); line-height: 1.3;">{{ bid.morph }}</h3>
                                <span class="status-badge" :class="getAuctionStatus(bid.end_time).class">{{ getAuctionStatus(bid.end_time).text }}</span>
                            </div>
                            <div class="bid-detail-row">
                                <span>最高出價</span>
                                <strong style="color: var(--pri); font-size: 1.1rem;">${{ bid.my_max_bid }}</strong>
                            </div>
                            <div style="font-size: 0.8rem; color: #888; margin-top: 8px;">
                                您共出價了 {{ bid.bid_count }} 次
                            </div>
                        </div>
                    </NuxtLink>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/*
  [局部樣式修復] 
  已清除與 assets/css/style.css 重複的宣告 (如 .grid, .card, .status-badge, .fav-btn 等)。
  全面導入 CSS 變數，徹底移除所有不必要的 :global(body.day-mode) 覆寫。
*/
.profile-page-wrapper { max-width: 900px; margin: 0 auto; padding: 20px 15px; }
.dt-only { display: block; }
.page-title span { font-size: 1rem; color: var(--txt); opacity: 0.5; font-weight: normal; margin-left: 10px; }

/* 登入區塊 */
.login-prompt-box { 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    border-radius: 12px; 
    padding: 40px 20px; 
    text-align: center; 
    max-width: 500px; 
    margin: 40px auto; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
}
.login-buttons { display: flex; flex-direction: column; gap: 15px; }
.btn-login { padding: 12px; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; border: none; transition: 0.2s; }
.btn-login.line { background: #06C755; color: #fff; }
.btn-login.line:hover { background: #05b04a; transform: translateY(-2px); }
.btn-login.google { background: var(--card-bg); color: var(--txt); border: 1px solid var(--bd); }
.btn-login.google:hover { background: rgba(128,128,128,0.05); transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.05); }

/* 🌟 App-like 使用者卡片 */
.user-card { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: var(--card-bg); 
    border: 1px solid var(--pri); 
    border-radius: 12px; 
    padding: 15px 20px; 
    margin-bottom: 25px; 
    box-shadow: 0 4px 15px rgba(255, 69, 0, 0.05); 
}
.user-info { display: flex; align-items: center; gap: 15px; }
.user-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid var(--pri); }
.user-avatar-placeholder { width: 50px; height: 50px; border-radius: 50%; background: var(--pri); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; }
.user-name { margin: 0; font-size: 1.2rem; color: var(--txt); }
.user-type { font-size: 0.8rem; color: var(--txt); opacity: 0.6; }
.btn-logout { 
    background: transparent; 
    border: 1px solid var(--bd); 
    color: var(--txt); 
    opacity: 0.8;
    padding: 6px 12px; 
    border-radius: 6px; 
    cursor: pointer; 
    font-size: 0.85rem; 
    font-weight: bold; 
    transition: 0.2s; 
}
.btn-logout:hover { border-color: #f44336; color: #f44336; background: rgba(244,67,54,0.1); opacity: 1; }

/* 🌟 App-like 頁籤 (Segmented Control) */
.segmented-tabs { 
    display: flex; 
    background: rgba(128, 128, 128, 0.05); 
    border: 1px solid var(--bd); 
    border-radius: 30px; 
    padding: 4px; 
    margin-bottom: 20px; 
}
.seg-tab { 
    flex: 1; 
    text-align: center; 
    padding: 10px 0; 
    border-radius: 25px; 
    font-size: 0.9rem; 
    font-weight: bold; 
    color: var(--txt); 
    opacity: 0.6;
    cursor: pointer; 
    transition: all 0.3s ease; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 6px; 
}
.seg-tab span { background: rgba(128,128,128,0.2); padding: 2px 6px; border-radius: 10px; font-size: 0.75rem; color: var(--txt); }
.seg-tab.active { background: var(--pri); color: #fff; opacity: 1; box-shadow: 0 4px 10px rgba(255, 69, 0, 0.2); }
.seg-tab.active span { background: rgba(255,255,255,0.2); color: #fff; }

/* 狀態區塊 */
.empty-state { 
    text-align: center; 
    padding: 50px 20px; 
    background: rgba(128,128,128,0.05); 
    border: 1px dashed var(--bd); 
    border-radius: 12px; 
    color: var(--txt); 
    opacity: 0.8;
}
.empty-icon { font-size: 3rem; margin-bottom: 10px; opacity: 0.5; }

/* 競標列表 */
.bid-list { display: flex; flex-direction: column; gap: 15px; }
.bid-card { 
    display: flex; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    border-radius: 10px; 
    overflow: hidden; 
    text-decoration: none; 
    transition: 0.2s; 
}
.bid-card:hover { transform: translateY(-3px); border-color: var(--pri); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
.bid-img { width: 120px; height: 120px; object-fit: cover; border-right: 1px solid var(--bd); }
.bid-info { padding: 12px 15px; flex: 1; display: flex; flex-direction: column; justify-content: center; }
.bid-detail-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: rgba(128,128,128,0.05); 
    padding: 8px 10px; 
    border-radius: 6px; 
    border: 1px solid var(--bd); 
    color: var(--txt);
}

/* 醫院卡片樣式 */
.hosp-list { display: flex; flex-direction: column; gap: 12px; }
.hosp-card { 
    padding: 15px; 
    border: 1px solid var(--bd); 
    background: var(--card-bg); 
    position: relative; 
    transition: 0.3s; 
    display: flex; 
    flex-direction: column; 
    border-radius: 10px; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}
.hosp-card:hover { border-color: var(--pri); transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
.hosp-content-row { display: flex; justify-content: space-between; gap: 12px; }
.hosp-info { flex: 1; }
.hosp-name { font-size: 1.1rem; font-weight: bold; margin-bottom: 8px; color: var(--txt); }
.hosp-detail-row { display: flex; align-items: flex-start; gap: 6px; font-size: 0.85rem; color: var(--txt); opacity: 0.7; margin-bottom: 6px; line-height: 1.4; }
.hosp-icon { width: 14px; height: 14px; flex-shrink: 0; margin-top: 2px; color: var(--pri); }
.hosp-link { text-decoration: none; color: inherit; transition: 0.2s; display: flex; align-items: center; }
.hosp-link:hover { color: var(--pri); }
.hosp-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; justify-content: center; }
.hosp-tag { 
    font-size: 0.65rem; 
    font-weight: bold; 
    padding: 3px 8px; 
    border: 1px solid var(--bd); 
    background: rgba(128,128,128,0.05); 
    color: var(--pri); 
    font-family: monospace; 
    border-radius: 4px; 
}
.hosp-call-btn { 
    padding: 6px 12px; 
    font-size: 0.7rem; 
    font-weight: bold; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
    border: 1px solid var(--pri); 
    color: var(--pri); 
    text-decoration: none; 
    transition: 0.2s; 
    border-radius: 4px; 
    background: transparent;
}
.hosp-call-btn:hover { background: var(--pri); color: #fff; }

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    
    .profile-page-wrapper {
        padding-top: 5px; /* 移除頂部多餘空間 */
    }
    
    .user-card { padding: 12px 15px; margin-bottom: 15px; }
    .user-avatar, .user-avatar-placeholder { width: 40px; height: 40px; }
    .user-name { font-size: 1rem; }
    .btn-logout { padding: 6px 10px; font-size: 0.8rem; }
    
    .segmented-tabs { margin-bottom: 15px; }
    .seg-tab { font-size: 0.85rem; padding: 8px 0; flex-direction: column; gap: 2px; }
    .seg-tab span { padding: 1px 5px; }

    .bid-card { flex-direction: column; }
    .bid-img { width: 100%; height: 160px; border-right: none; border-bottom: 1px solid var(--bd); }
    .bid-detail-row { font-size: 0.9rem; }
    
    .hosp-content-row { flex-direction: column; }
    .hosp-actions { 
        flex-direction: row; 
        justify-content: space-between; 
        align-items: center; 
        width: 100%; 
        margin-top: 10px; 
        border-top: 1px solid var(--bd); 
        padding-top: 10px; 
    }
    
    .btn-hero { width: 100%; }
}
</style>