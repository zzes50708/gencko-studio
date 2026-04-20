<script setup>
import { onMounted, onUnmounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

const store = useMainStore()
const route = useRoute()
const router = useRouter()

// 綁定全域 body class，處理日夜間模式的 CSS 變數切換
useHead({
  bodyAttrs: {
    class: computed(() => store.isDayMode ? 'day-mode' : '')
  }
})

// 監聽路由變化，自動收起手機版選單並同步目前單元狀態
watch(() => route.path, (newPath) => {
  store.mobileMenuOpen = false
  if (newPath.startsWith('/articles')) {
    store.curTab = 'articles'
  } else {
    store.curTab = route.name || 'home'
  }
})

// 全域滾動監聽 (用於隱藏導覽列、無限滾動與文章閱讀進度)
const handleScroll = () => {
  const st = Math.max(0, window.scrollY)
  if (st > 100 && st > store.lastScrollY) {
    store.navHidden = true
  } else {
    store.navHidden = false
  }
  store.lastScrollY = st

  // 觸發無限滾動載入
  if (st + window.innerHeight >= document.documentElement.scrollHeight - 300) {
    store.displayLimit += 20
  }

  // 計算文章閱讀進度條
  if (route.path.startsWith('/articles/') && store.readingArticle) {
    const docH = document.documentElement.scrollHeight
    const winH = window.innerHeight
    const progress = (st / (docH - winH)) * 100
    store.readingProgress = Math.min(100, Math.max(0, progress))
  }
}

const scrollToTop = () => {
  window.scrollTo(0, 0)
}

onMounted(() => {
  // 初始化主題與載入 Supabase 資料
  store.initTheme()
  store.loadDataFromAPI()
  store.loadAuctions()

  // LINE LIFF 全域初始化
  const script = document.createElement('script')
  script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
  script.onload = async () => {
    try {
      await window.liff.init({ liffId: '2009804483-8KRouTSr' })
      if (window.liff.isLoggedIn()) {
        const redirectUrl = localStorage.getItem('gencko_line_redirect')
        if (redirectUrl) {
          localStorage.removeItem('gencko_line_redirect')
          const urlObj = new URL(redirectUrl)
          if (urlObj.pathname !== route.path) {
            router.push(urlObj.pathname + urlObj.search + urlObj.hash)
          }
        }
      }
    } catch (err) {
      console.error('LIFF 全域初始化失敗', err)
    }
  }
  document.head.appendChild(script)

  // 復原本地端暫存資料 (收藏清單、歷史紀錄等)
  const savedWish = localStorage.getItem('gencko_wishlist')
  if (savedWish) store.wishlist = JSON.parse(savedWish)
  
  const savedHospWish = localStorage.getItem('gencko_hosp_wishlist')
  if (savedHospWish) store.hospWishlist = JSON.parse(savedHospWish)
  
  const savedHist = localStorage.getItem('gencko_history')
  if (savedHist) store.history = JSON.parse(savedHist)

  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="cont">
    <!-- 全域共用元件 (Nuxt 會自動從 components/ 引入) -->
    <TheLightbox 
      :item="store.lightboxItem" 
      :line-link="store.lineLink"
      @close="store.closeLightbox" 
    />
    
    <TheToast :show="store.showToast" />
    <TheMarquee :list="store.marqueeList" />
    
    <TheNavbar
      :nav-hidden="store.navHidden"
      :is-day-mode="store.isDayMode"
      v-model:mobile-menu-open="store.mobileMenuOpen"
      :logo-url="store.logoUrl"
      :cur-tab="store.curTab"
      :reading-article="store.readingArticle"
      :reading-progress="store.readingProgress"
      @toggle-theme="store.toggleTheme"
      @scroll-top="scrollToTop"
    />

    <main style="padding-top: 0; min-height: 80vh;">
      <!-- Nuxt 3 自動路由出口，取代舊版 <router-view> -->
      <NuxtPage />
    </main>

    <a v-if="store.wishlist.length > 0" 
       :href="'https://line.me/R/ti/p/@219abdzn?text=' + encodeURIComponent('Hi Gencko, 我有興趣詢問收藏清單中的守宮 (' + store.wishlist.length + '隻) ID：\n' + store.wishlist.join(', '))" 
       target="_blank"
       class="floating-inquire-btn">
       <span>❤ 已選 {{ store.wishlist.length }} 隻｜一次詢問</span>
       <span>➜</span>
    </a>
    
    <TheFooter />
  </div>
</template>