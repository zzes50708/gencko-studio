<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useHead, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { HOSPITAL_DATA } from '~/utils/hospitals'
import { getCleanUrl } from '~/utils/image'

const store = useMainStore()
const router = useRouter()
const supabase = useSupabaseClient()

useHead({
  title: '我的專區',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Studio 個人專屬儀表板。管理您的守宮收藏清單、特寵醫院地圖書籤與即時競標紀錄。'
    },
    { name: 'robots', content: 'noindex, nofollow' },
    { property: 'og:title', content: '我的專區 | Gencko Studio' },
    { property: 'og:url', content: 'https://www.genckobreeding.com/profile' }
  ],
  link: [{ rel: 'canonical', href: 'https://www.genckobreeding.com/profile' }]
})

// 狀態管理
const activeTab = ref('wishlist')
const myBids = ref([])
const isLoadingBids = ref(false)

// 監聽 Store 中的 currentUser 變化，以載入或清除競標紀錄
watch(
  () => store.currentUser,
  (user) => {
    if (user?.type === 'google') {
      fetchMyBids()
    } else {
      myBids.value = []
    }
  },
  { immediate: true }
)

// 由伺服器端身份取得自己的競標紀錄，不讓瀏覽器以 phone/email 查詢。
const fetchMyBids = async () => {
  isLoadingBids.value = true
  try {
    const { data: bidsData, error: bidsError } = await supabase.rpc('get_my_auction_bids')

    if (bidsError) throw bidsError
    if (!bidsData || bidsData.length === 0) {
      myBids.value = []
      return
    }

    // Step 2：取出不重複的 auction_id，一次查詢對應拍賣資料
    const auctionIds = [...new Set(bidsData.map((b) => b.auction_id))]
    const { data: auctionsData } = await supabase
      .from('auctions')
      .select('id, morph, end_time, status, images')
      .in('id', auctionIds)

    const auctionsMap = {}
    ;(auctionsData || []).forEach((a) => {
      auctionsMap[a.id] = a
    })

    // Step 3：Grouping — 每場拍賣只保留最高出價與出價次數
    const grouped = {}
    bidsData.forEach((bid) => {
      const auction = auctionsMap[bid.auction_id]
      if (!grouped[bid.auction_id]) {
        grouped[bid.auction_id] = {
          auction_id: bid.auction_id,
          morph: auction?.morph || '未知品系',
          image: auction?.images?.[0] || '',
          end_time: auction?.end_time,
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
    myBids.value = Object.values(grouped)
  } catch (e) {
    console.error('讀取競標紀錄失敗:', e)
  } finally {
    isLoadingBids.value = false
  }
}

// --- LocalStorage 快取資料計算 ---

// 從 store 取得使用者的收藏清單
const wishlistItems = computed(() => {
  return store.inv.filter((item) => store.wishlist.includes(item.ID))
})

// 從 store 取得收藏的特寵醫院
const hospWishlistItems = computed(() => {
  return HOSPITAL_DATA.filter((h) => store.hospWishlist.includes(h.id))
})

// 從 store 取得最近瀏覽紀錄 (反轉陣列確保最新在最前)
const historyItems = computed(() => {
  return store.history
    .map((id) => store.inv.find((item) => item.ID === id))
    .filter(Boolean)
    .reverse()
})

// --- 收藏操作邏輯 ---
const toggleWishlist = (id) => {
  if (store.wishlist.includes(id)) {
    store.wishlist = store.wishlist.filter((x) => x !== id)
  } else {
    store.wishlist.push(id)
  }
  if (import.meta.client) localStorage.setItem('gencko_wishlist', JSON.stringify(store.wishlist))
}

const toggleHospWishlist = (id) => {
  if (store.hospWishlist.includes(id)) {
    store.hospWishlist = store.hospWishlist.filter((x) => x !== id)
  } else {
    store.hospWishlist.push(id)
  }
  if (import.meta.client)
    localStorage.setItem('gencko_hosp_wishlist', JSON.stringify(store.hospWishlist))
}

const getAuctionStatus = (endTime) => {
  const now = new Date().getTime()
  if (now >= new Date(endTime).getTime()) return { text: '已結標', class: 's-sold' }
  return { text: '競標中', class: 's-res' }
}

const getMapLink = (h) => {
  if (h.mapUrl) return h.mapUrl
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`
}
</script>

<template>
  <div class="profile-page-wrapper" data-testid="member-dashboard">
    <div class="profile-document-meta" aria-label="會員專區說明">
      <span>GENCKO MEMBER DESK</span>
      <span>SAVED / VIEWED / CONNECTED</span>
    </div>
    <header class="profile-heading">
      <div>
        <div class="profile-kicker">PERSONAL FIELD DESK</div>
        <h1>我的專區</h1>
      </div>
      <p>收藏、瀏覽、醫院與競標紀錄集中在同一處；登入後可查看帳號專屬資料。</p>
    </header>

    <!-- 🌟 App-like 使用者資訊卡片 (包含訪客狀態) -->
    <div class="user-card" :class="{ 'guest-card': !store.currentUser }">
      <div class="user-info">
        <template v-if="store.currentUser">
          <img
            v-if="store.currentUser.picture"
            :src="store.currentUser.picture"
            alt="Avatar"
            class="user-avatar"
            loading="lazy"
            decoding="async"
          />
          <!-- 🌟 修正 Bug：加入短路求值保護，避免 name 為空導致 charAt 報錯白畫面 -->
          <div v-else class="user-avatar-placeholder">
            {{ (store.currentUser.name || '?').charAt(0).toUpperCase() }}
          </div>
          <div class="user-text">
            <h2 class="user-name">{{ store.currentUser.name || 'User' }}</h2>
            <span class="user-type">
              {{ store.currentUser.type === 'line' ? 'LINE 登入' : 'Google 登入' }}
            </span>
          </div>
        </template>
        <template v-else>
          <div class="user-avatar-placeholder" style="background: var(--bd); color: var(--txt)">
            👤
          </div>
          <div class="user-text">
            <h2 class="user-name">訪客</h2>
            <span class="user-type">登入解鎖競標與雲端同步</span>
          </div>
        </template>
      </div>

      <div class="header-actions">
        <button v-if="store.currentUser" type="button" @click="store.logout" class="btn-logout">
          登出
        </button>
        <div v-else class="quick-login-row">
          <button
            type="button"
            @click="store.loginWithLine"
            class="btn-quick line"
            title="LINE 登入"
          >
            <img
              src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/line.png"
              alt="LINE"
              loading="lazy"
              decoding="async"
            />
          </button>
          <button
            type="button"
            @click="store.loginWithGoogle"
            class="btn-quick google"
            title="Google 登入"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 🌟 App-like 分段切換器 (新增歷史紀錄) -->
    <div class="segmented-tabs" role="tablist" aria-label="會員資料分類">
      <button
        type="button"
        class="seg-tab"
        :class="{ active: activeTab === 'wishlist' }"
        role="tab"
        :aria-selected="activeTab === 'wishlist'"
        @click="activeTab = 'wishlist'"
      >
        收藏
        <span>{{ wishlistItems.length }}</span>
      </button>
      <button
        type="button"
        class="seg-tab"
        :class="{ active: activeTab === 'history' }"
        role="tab"
        :aria-selected="activeTab === 'history'"
        @click="activeTab = 'history'"
      >
        瀏覽
        <span>{{ historyItems.length }}</span>
      </button>
      <button
        type="button"
        class="seg-tab"
        :class="{ active: activeTab === 'hospitals' }"
        role="tab"
        :aria-selected="activeTab === 'hospitals'"
        @click="activeTab = 'hospitals'"
      >
        醫院
        <span>{{ hospWishlistItems.length }}</span>
      </button>
      <button
        type="button"
        class="seg-tab"
        :class="{ active: activeTab === 'bids' }"
        role="tab"
        :aria-selected="activeTab === 'bids'"
        @click="activeTab = 'bids'"
      >
        競標
        <span v-if="store.currentUser">{{ myBids.length }}</span>
        <span v-else>🔒</span>
      </button>
    </div>

    <!-- 🌟 內容顯示區 -->
    <div class="tab-content-area">
      <!-- Tab 1: 商品收藏 (本機) -->
      <div v-show="activeTab === 'wishlist'">
        <div v-if="wishlistItems.length === 0" class="empty-state">
          <div class="empty-icon">❤</div>
          <p>您的收藏清單空空如也，趕快去商城逛逛吧！</p>
          <button
            type="button"
            class="btn-hero"
            @click="router.push('/shop')"
            style="margin-top: 15px"
          >
            前往商城
          </button>
        </div>

        <div v-else class="grid photo-grid">
          <NuxtLink
            no-prefetch
            :to="`/product/${i.ID}`"
            class="card slim-card"
            v-for="i in wishlistItems"
            :key="i.ID"
            style="text-decoration: none; color: inherit"
          >
            <div v-if="i.Status === 'Sold'" class="sold-stamp">SOLD</div>
            <div style="position: absolute; top: 5px; right: 5px; z-index: 10">
              <button
                type="button"
                class="fav-btn active"
                @click.stop.prevent="toggleWishlist(i.ID)"
                aria-label="取消收藏"
              >
                ❤
              </button>
            </div>
            <div style="position: relative">
              <!-- 🌟 核心修正：NuxtImg 替換為原生 img -->
              <img
                v-if="i.ImageURL"
                :src="getCleanUrl(i.ImageURL, 400)"
                :alt="i.Morph"
                class="card-img slim-img"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="card-img slim-img"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 2rem;
                  background: #000;
                "
              >
                🦎
              </div>
            </div>
            <div class="card-body slim-body">
              <h3 class="slim-title" style="margin: 0">{{ i.Morph }}</h3>
              <div class="slim-price-row" style="margin-top: 4px">
                <div v-if="i.Status !== 'ForSale'">
                  <span v-if="i.Status === 'Sold'" class="status-badge s-sold">已售出</span>
                  <span v-else-if="i.Status === 'SelfKeep'" class="status-badge s-nfs">非賣</span>
                </div>
                <div v-else class="price slim-price">${{ i.ListingPrice }}</div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Tab 2: 瀏覽紀錄 (本機 - 新增功能) -->
      <div v-show="activeTab === 'history'">
        <div v-if="historyItems.length === 0" class="empty-state">
          <div class="empty-icon">👀</div>
          <p>您還沒有看過任何守宮喔！</p>
          <button
            type="button"
            class="btn-hero"
            @click="router.push('/shop')"
            style="margin-top: 15px"
          >
            前往商城探索
          </button>
        </div>

        <div v-else class="grid photo-grid">
          <NuxtLink
            no-prefetch
            :to="`/product/${i.ID}`"
            class="card slim-card"
            v-for="i in historyItems"
            :key="`hist-${i.ID}`"
            style="text-decoration: none; color: inherit"
          >
            <div v-if="i.Status === 'Sold'" class="sold-stamp">SOLD</div>
            <div style="position: absolute; top: 5px; right: 5px; z-index: 10">
              <button
                type="button"
                class="fav-btn"
                :class="{ active: store.wishlist.includes(i.ID) }"
                @click.stop.prevent="toggleWishlist(i.ID)"
                :aria-label="store.wishlist.includes(i.ID) ? '取消收藏' : '加入收藏'"
              >
                ❤
              </button>
            </div>
            <div style="position: relative">
              <!-- 🌟 核心修正：NuxtImg 替換為原生 img -->
              <img
                v-if="i.ImageURL"
                :src="getCleanUrl(i.ImageURL, 400)"
                :alt="i.Morph"
                class="card-img slim-img"
                loading="lazy"
                decoding="async"
              />
              <div
                v-else
                class="card-img slim-img"
                style="
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 2rem;
                  background: #000;
                "
              >
                🦎
              </div>
            </div>
            <div class="card-body slim-body">
              <h3 class="slim-title" style="margin: 0">{{ i.Morph }}</h3>
              <div class="slim-price-row" style="margin-top: 4px">
                <div v-if="i.Status !== 'ForSale'">
                  <span v-if="i.Status === 'Sold'" class="status-badge s-sold">已售出</span>
                  <span v-else-if="i.Status === 'SelfKeep'" class="status-badge s-nfs">非賣</span>
                </div>
                <div v-else class="price slim-price">${{ i.ListingPrice }}</div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Tab 3: 收藏醫院 (本機) -->
      <div v-show="activeTab === 'hospitals'">
        <div v-if="hospWishlistItems.length === 0" class="empty-state">
          <div class="empty-icon">🏥</div>
          <p>您尚未收藏任何特寵醫院。</p>
          <button
            type="button"
            class="btn-hero"
            @click="router.push('/hospital')"
            style="margin-top: 15px"
          >
            前往醫院地圖
          </button>
        </div>

        <div v-else class="hosp-list">
          <article v-for="h in hospWishlistItems" :key="h.id" class="hosp-card">
            <div class="hosp-content-row">
              <div class="hosp-info">
                <h3 class="hosp-name">{{ h.name }}</h3>

                <a
                  :href="getMapLink(h)"
                  target="_blank"
                  class="hosp-detail-row hosp-link"
                  rel="noopener noreferrer"
                >
                  <svg
                    class="hosp-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{{ h.address }}</span>
                </a>

                <div class="hosp-detail-row">
                  <svg
                    class="hosp-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                    ></path>
                  </svg>
                  <span style="font-family: monospace">{{ h.phone }}</span>
                </div>
              </div>

              <div class="hosp-actions">
                <div style="display: flex; align-items: center; gap: 8px">
                  <span class="hosp-tag">{{ h.city }} {{ h.district }}</span>
                  <button
                    type="button"
                    class="fav-btn active"
                    :aria-label="`取消收藏 ${h.name}`"
                    @click.stop.prevent="toggleHospWishlist(h.id)"
                    style="
                      position: relative;
                      top: auto;
                      right: auto;
                      z-index: 10;
                      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
                    "
                  >
                    ❤
                  </button>
                </div>
                <a
                  :href="'tel:' + h.phone.replace(/[^\d]/g, '')"
                  class="hosp-call-btn"
                  style="width: 100%; text-align: center"
                >
                  Call Now
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- Tab 4: 競標紀錄 (雲端 - 需登入) -->
      <div v-show="activeTab === 'bids'">
        <!-- 🌟 將登入區塊移至此，保護雲端資料 -->
        <div v-if="!store.currentUser" class="login-prompt-box">
          <div class="empty-icon">🔐</div>
          <h3 style="margin-bottom: 10px; color: var(--txt)">登入解鎖競標紀錄</h3>
          <p style="color: #888; font-size: 0.9rem; margin-bottom: 25px">
            查看參與過的拍賣與出價進度。
          </p>

          <div class="login-buttons">
            <button type="button" @click="store.loginWithLine" class="btn-login line">
              <img
                src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/line.png"
                alt="LINE"
                style="width: 24px; height: 24px; object-fit: contain"
                loading="lazy"
                decoding="async"
              />
              使用 LINE 帳號登入
            </button>
            <button type="button" @click="store.loginWithGoogle" class="btn-login google">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              使用 Google 帳號登入
            </button>
          </div>
        </div>

        <div v-else-if="isLoadingBids" style="text-align: center; padding: 40px; color: #888">
          <div class="loader" style="margin: 0 auto 15px auto"></div>
          讀取中...
        </div>

        <div v-else-if="myBids.length === 0" class="empty-state">
          <div class="empty-icon">🔨</div>
          <p>您尚未參與任何競標活動。</p>
          <button
            type="button"
            class="btn-hero"
            @click="router.push('/auction')"
            style="margin-top: 15px"
          >
            去競標區看看
          </button>
        </div>

        <div v-else class="bid-list">
          <NuxtLink
            no-prefetch
            :to="`/auction/${bid.auction_id}`"
            class="bid-card"
            v-for="bid in myBids"
            :key="bid.auction_id"
          >
            <!-- 🌟 核心修正：NuxtImg 替換為原生 img -->
            <img
              :src="
                bid.image
                  ? getCleanUrl(bid.image)
                  : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/placeholder.jpg'
              "
              class="bid-img"
              loading="lazy"
              decoding="async"
            />
            <div class="bid-info">
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: flex-start;
                  margin-bottom: 8px;
                "
              >
                <h3 style="margin: 0; font-size: 1.1rem; color: var(--txt); line-height: 1.3">
                  {{ bid.morph }}
                </h3>
                <span class="status-badge" :class="getAuctionStatus(bid.end_time).class">
                  {{ getAuctionStatus(bid.end_time).text }}
                </span>
              </div>
              <div class="bid-detail-row">
                <span>最高出價</span>
                <strong style="color: var(--pri); font-size: 1.1rem">${{ bid.my_max_bid }}</strong>
              </div>
              <div style="font-size: 0.8rem; color: #888; margin-top: 8px">
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
/*[局部樣式修復] 
  已清除所有重複的宣告與不必要的 :global(body.day-mode) 覆寫。
*/
.profile-page-wrapper {
  max-width: 1080px;
  margin: 0 auto;
  padding: 8px 18px 48px;
  min-height: 70vh;
}

.profile-document-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 0 0 14px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.profile-document-meta span:first-child {
  color: var(--pri);
}

.profile-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.65fr);
  gap: 30px;
  align-items: end;
  margin-bottom: 16px;
  padding: clamp(24px, 5vw, 48px);
  border: 1px solid var(--bd);
  border-radius: calc(var(--radius-lg) + 8px);
  background:
    radial-gradient(circle at 90% 10%, var(--pri-glow-soft), transparent 35%), var(--card-bg);
  box-shadow: var(--shadow-card);
}

.profile-kicker {
  color: var(--pri);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.profile-heading h1 {
  margin: 8px 0 0;
  color: var(--txt);
  font-size: clamp(2.4rem, 6vw, 5rem);
  line-height: 0.96;
  letter-spacing: -0.055em;
}

.profile-heading p {
  margin: 0;
  color: var(--txt-muted);
  line-height: 1.75;
}
.dt-only {
  display: block;
}
.page-title span {
  font-size: 1rem;
  color: var(--txt);
  opacity: 0.5;
  font-weight: normal;
  margin-left: 10px;
}

/* App-like 使用者卡片 */
.user-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--pri);
  border-radius: var(--radius-lg);
  padding: 18px 20px;
  margin-bottom: 16px;
  box-shadow: 0 4px 15px rgba(255, 69, 0, 0.05);
}
.user-card.guest-card {
  border-color: var(--bd);
  box-shadow: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 15px;
}
.user-avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--pri);
}
.user-avatar-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--pri);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: bold;
}
.user-name {
  margin: 0;
  font-size: 1.2rem;
  color: var(--txt);
}
.user-type {
  font-size: 0.8rem;
  color: var(--txt);
  opacity: 0.6;
}

.header-actions {
  display: flex;
  align-items: center;
}
.btn-logout {
  min-height: var(--control-min-height);
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

.quick-login-row {
  display: flex;
  gap: 8px;
}
.btn-quick {
  width: 36px;
  min-width: var(--control-min-height);
  min-height: var(--control-min-height);
  height: var(--control-min-height);
  border-radius: 50%;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s;
}
.btn-quick.line {
  background: #06c755;
}
.btn-quick.line img {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.btn-quick.google {
  background: var(--card-bg);
  border: 1px solid var(--bd);
}

/* App-like 頁籤 (Segmented Control) */
.segmented-tabs {
  display: flex;
  background: rgba(128, 128, 128, 0.05);
  border: 1px solid var(--bd);
  border-radius: var(--radius-lg);
  padding: 4px;
  margin-bottom: 20px;
  overflow-x: auto;
  scrollbar-width: none;
}
.segmented-tabs::-webkit-scrollbar {
  display: none;
}

.seg-tab {
  flex: 1;
  min-height: var(--control-min-height);
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
  white-space: nowrap;
  min-width: 80px;
  background: transparent;
  border: none;
  font-family: inherit;
}
.seg-tab span {
  background: rgba(128, 128, 128, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--txt);
}
.seg-tab.active {
  background: var(--pri);
  color: #fff;
  opacity: 1;
  box-shadow: 0 4px 10px rgba(255, 69, 0, 0.2);
}
.seg-tab.active span {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* 狀態區塊 */
.empty-state {
  text-align: center;
  padding: 50px 20px;
  background: rgba(128, 128, 128, 0.05);
  border: 1px dashed var(--bd);
  border-radius: 12px;
  color: var(--txt);
  opacity: 0.8;
}
.empty-icon {
  font-size: 3rem;
  margin-bottom: 10px;
  opacity: 0.5;
}

/* 登入區塊 (移入內容區) */
.login-prompt-box {
  background: var(--card-bg);
  border: 1px dashed var(--bd);
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  max-width: 500px;
  margin: 20px auto;
}
.login-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.btn-login {
  min-height: var(--control-min-height);
  padding: 12px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: none;
  transition: 0.2s;
}
.btn-login.line {
  background: #06c755;
  color: #fff;
}
.btn-login.google {
  background: var(--card-bg);
  color: var(--txt);
  border: 1px solid var(--bd);
}

/* 競標列表 */
.bid-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.bid-card {
  display: flex;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 10px;
  overflow: hidden;
  text-decoration: none;
  transition: 0.2s;
}
.bid-img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-right: 1px solid var(--bd);
}
.bid-info {
  padding: 12px 15px;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.bid-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(128, 128, 128, 0.05);
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--bd);
  color: var(--txt);
}

/* 醫院卡片樣式 */
.hosp-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hosp-card {
  padding: 15px;
  border: 1px solid var(--bd);
  background: var(--card-bg);
  position: relative;
  transition: 0.3s;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}
.hosp-content-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.hosp-info {
  flex: 1;
}
.hosp-name {
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 8px;
  color: var(--txt);
}
.hosp-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--txt);
  opacity: 0.7;
  margin-bottom: 6px;
  line-height: 1.4;
}
.hosp-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--pri);
}
.hosp-link {
  text-decoration: none;
  color: inherit;
  transition: 0.2s;
  display: flex;
  align-items: center;
}
.hosp-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
  justify-content: center;
}
.hosp-tag {
  font-size: 0.65rem;
  font-weight: bold;
  padding: 3px 8px;
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  color: var(--pri);
  font-family: monospace;
  border-radius: 4px;
}
.hosp-call-btn {
  padding: 10px 14px;
  min-height: 44px;
  font-size: 0.82rem;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid var(--pri);
  color: var(--pri);
  text-decoration: none;
  transition: 0.2s;
  border-radius: 6px;
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.hosp-actions .fav-btn {
  min-width: var(--control-min-height);
  min-height: var(--control-min-height);
}
.btn-hero,
.fav-btn {
  min-height: var(--control-min-height);
}
.fav-btn {
  min-width: var(--control-min-height);
}

.btn-hero:focus-visible,
.btn-logout:focus-visible,
.btn-quick:focus-visible,
.seg-tab:focus-visible,
.fav-btn:focus-visible,
.btn-login:focus-visible,
.hosp-call-btn:focus-visible,
.bid-card:focus-visible,
.hosp-link:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 2px;
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }

  .profile-page-wrapper {
    padding: 4px 10px 32px;
  }

  .profile-heading {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 22px 16px;
  }

  .user-card {
    padding: 12px 15px;
    margin-bottom: 15px;
  }
  .user-avatar,
  .user-avatar-placeholder {
    width: 40px;
    height: 40px;
  }
  .user-name {
    font-size: 1rem;
  }
  .btn-logout {
    padding: 6px 10px;
    font-size: 0.8rem;
  }

  .segmented-tabs {
    margin-bottom: 15px;
  }
  .seg-tab {
    font-size: 0.85rem;
    padding: 8px 0;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .seg-tab span {
    padding: 1px 5px;
  }

  .bid-card {
    flex-direction: column;
  }
  .bid-img {
    width: 100%;
    height: 160px;
    border-right: none;
    border-bottom: 1px solid var(--bd);
  }
  .bid-detail-row {
    font-size: 0.9rem;
  }

  .hosp-content-row {
    flex-direction: column;
  }
  .hosp-actions {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-top: 10px;
    border-top: 1px solid var(--bd);
    padding-top: 10px;
  }

  .btn-hero {
    width: 100%;
    max-width: 280px;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .btn-logout:hover {
    border-color: #f44336;
    color: #f44336;
    background: rgba(244, 67, 54, 0.1);
    opacity: 1;
  }
  .btn-quick:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }
  .btn-login.line:hover {
    background: #05b04a;
    transform: translateY(-2px);
  }
  .btn-login.google:hover {
    background: rgba(128, 128, 128, 0.05);
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
  }
  .bid-card:hover {
    transform: translateY(-3px);
    border-color: var(--pri);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  .hosp-card:hover {
    border-color: var(--pri);
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  .hosp-link:hover {
    color: var(--pri);
  }
  .hosp-call-btn:hover {
    background: var(--pri);
    color: #fff;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-logout,
  .btn-quick,
  .seg-tab,
  .btn-hero,
  .fav-btn,
  .btn-login,
  .bid-card,
  .hosp-card,
  .hosp-link,
  .hosp-call-btn {
    transition: none !important;
    animation: none !important;
  }
}
/* 會員工具保留資料密度，改用規整面板與小圓角呈現。 */
.profile-page-wrapper,
.profile-heading,
.profile-panel,
.profile-card,
.profile-empty,
.profile-modal {
  border-radius: 0;
  box-shadow: none;
}

.profile-heading h1,
.profile-section-title {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.03em;
}

.profile-heading,
.profile-card {
  background-image: none;
}

.profile-tab,
.profile-action,
.profile-input,
.profile-select {
  border-radius: 2px;
  box-shadow: none;
}

.user-card,
.segmented-tabs,
.content-section,
.fav-card,
.profile-page-wrapper .card {
  border-radius: 0;
  box-shadow: none;
}

.seg-tab,
.btn-logout,
.profile-page-wrapper input,
.profile-page-wrapper select,
.profile-page-wrapper button:not(.btn-quick) {
  border-radius: 2px;
  box-shadow: none;
}

/* 帳戶頁以帳務清單取代 app 式浮卡，保留登入與操作控制的可辨識性。 */
.profile-heading {
  padding: 32px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.user-card,
.segmented-tabs,
.content-section,
.empty-state,
.login-prompt-box {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.user-card {
  padding: 18px 0;
  border-width: 1px 0;
}

.segmented-tabs {
  padding: 0;
  border-width: 0 0 1px;
}

.seg-tab {
  border-width: 0 0 2px;
  border-radius: 0;
  box-shadow: none;
  opacity: 1;
}

.seg-tab.active {
  border-color: var(--pri);
  background: transparent;
  color: var(--pri);
  box-shadow: none;
}

.seg-tab span,
.seg-tab.active span {
  border-radius: 0;
  background: transparent;
  color: inherit;
}

.bid-list,
.hosp-list {
  gap: 0;
  border-top: 1px solid var(--bd);
}

.bid-card,
.hosp-card {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.bid-detail-row,
.hosp-tag,
.hosp-call-btn,
.btn-logout,
.btn-login {
  border-radius: 0;
  box-shadow: none;
}

.bid-detail-row {
  padding-left: 0;
  padding-right: 0;
  border-width: 1px 0;
  background: transparent;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .bid-card:hover,
  .hosp-card:hover,
  .btn-login.line:hover,
  .btn-login.google:hover {
    transform: none;
    box-shadow: none;
  }
}
/* 帳戶頁依據動作與資料分層，不以大型空框包住全部內容。 */
.profile-page-wrapper {
  padding: 8px 18px 28px;
}
.profile-heading {
  padding: 20px 0;
  margin-bottom: 18px;
}
.profile-heading h1 {
  font-family: var(--font-heading-zh);
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.3;
}
.user-card {
  margin-bottom: 18px;
}
.login-prompt-box {
  padding: 22px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
}
.empty-state {
  padding: 28px 0;
  min-height: 0;
}
.btn-login,
.btn-quick,
.btn-logout,
.btn-hero,
.hosp-call-btn {
  min-height: 44px;
  border-radius: 2px;
  box-shadow: none;
}
.seg-tab {
  min-height: 44px;
  white-space: nowrap;
}
.segmented-tabs {
  overflow-x: auto;
}
.slim-title,
.hosp-name {
  font-family: var(--font-heading-zh);
  line-height: 1.5;
}
.slim-price {
  font-family: var(--font-body-zh);
  font-variant-numeric: tabular-nums;
}
.slim-card {
  border-radius: 0;
  box-shadow: none;
}
.hosp-link {
  text-decoration: underline;
  text-underline-offset: 4px;
}
/* 本頁返回與次要操作使用同一按鈕形式。 */
:deep(.app-back-btn),
.btn-app {
  border-radius: 2px;
  min-height: 44px;
  box-shadow: none;
  font-family: var(--font-body-zh);
}
:deep(.app-back-btn) {
  border: 1px solid var(--txt);
}
.empty-state { border: 0; border-bottom: 1px solid var(--bd); }
</style>
