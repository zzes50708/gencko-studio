<script setup>
import { computed, onMounted, onUnmounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useNuxtApp } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getRouteTab } from '~/utils/route-tab'
// #U6：Lenis / gsap 改為動態 import（見 initGlobalLenis），把 ~528KB 移出每頁初始關鍵路徑，
// 平滑捲動於 mount 後才啟用（漸進增強，不阻擋 LCP）。首頁（about）本就不啟用全域 Lenis。

const store = useMainStore()
const route = useRoute()
const router = useRouter()
const { $pwa } = useNuxtApp()
const nuxtApp = useNuxtApp()
const iosDialog = useNativeModal(() => store.showIOSGuide)
const isDevelopment = import.meta.dev

// ── 全域 Lenis Smooth Scroll（非自訂 scroll-driven 場景使用）────────────────
// /about 與 /hero-lab 都有自己的滾動/時間軸系統，此處必須讓路
let globalLenis = null
let globalLenisTicker = null
let gsapLib = null

const isCustomScrollPage = computed(
  () => route.path === '/' || route.path.startsWith('/about') || route.path.startsWith('/hero-lab')
)

const handleLenisScroll = ({ scroll }) => {
  const st = Math.max(0, scroll)
  const delta = st - store.lastScrollY
  if (st <= 100) {
    store.navHidden = false
  } else if (delta > 2) {
    store.navHidden = true
  } else if (delta < -2) {
    store.navHidden = false
  }
  if (st + window.innerHeight >= document.documentElement.scrollHeight - 300) {
    if (st > store.lastScrollY && store.displayLimit < 2000) store.displayLimit += 20
  }
  store.lastScrollY = st
  if (route.path.startsWith('/articles/') && store.readingArticle) {
    const docH = document.documentElement.scrollHeight
    const winH = window.innerHeight
    store.readingProgress = Math.min(100, Math.max(0, (st / (docH - winH)) * 100))
  }
}

const destroyGlobalLenis = () => {
  if (globalLenisTicker) {
    gsapLib?.ticker.remove(globalLenisTicker)
    globalLenisTicker = null
  }
  if (globalLenis) {
    try {
      globalLenis.off('scroll', handleLenisScroll)
    } catch (e) {}
    globalLenis.destroy()
    globalLenis = null
  }
  // 讓 router.options.ts 的 scrollBehavior 能取得（或得知已無）全域 Lenis
  if (import.meta.client) window.__lenis = null
}

const initGlobalLenis = async () => {
  if (!import.meta.client || isCustomScrollPage.value) return
  destroyGlobalLenis()
  // 動態載入，避免 ~528KB 進入初始關鍵路徑（#U6）
  const [{ default: Lenis }, gsapMod] = await Promise.all([import('lenis'), import('gsap')])
  gsapLib = gsapMod.gsap
  // 競態保護：載入期間若切到自訂 scroll 頁或已被銷毀，就不啟用
  if (isCustomScrollPage.value) return
  globalLenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 2.0,
    infinite: false
  })
  globalLenisTicker = (time) => globalLenis.raf(time * 1000)
  gsapLib.ticker.add(globalLenisTicker)
  gsapLib.ticker.lagSmoothing(0)
  globalLenis.on('scroll', handleLenisScroll)
  // 暴露給 router scrollBehavior：換頁歸零 / 返回還原捲動位置
  window.__lenis = globalLenis
}

// 自訂 scroll 頁 ↔ 其他頁切換時：啟停全域 Lenis
watch(isCustomScrollPage, (isCustomScrollPageNow) => {
  if (!import.meta.client) return
  if (isCustomScrollPageNow) destroyGlobalLenis()
  else initGlobalLenis()
})

// 收集 Vue / JS runtime error（用於除錯用的 overlay）
const lastRuntimeError = ref(null)
const clearRuntimeError = () => {
  lastRuntimeError.value = null
}

// 關閉錯誤提示並回首頁（合併為單一方法，避免行內 @click 多語句被 prettier 拆掉分號而解析失敗）
const goHomeFromError = () => {
  clearRuntimeError()
  router.push('/home')
}

// NuxtErrorBoundary slot 內的 clearError 為 slot-scoped，透過 helper 接收後再導頁（同樣避免行內多語句問題）
const clearAndGoHome = (clearErr) => {
  clearErr()
  router.push('/home')
}
const clearAndReload = (clearErr) => {
  clearErr()
  router.go(0)
}

// PWA：registerType 改為 'autoUpdate'，Service Worker 背景靜默更新，無提示
// isUpdating ref 與 handlePwaUpdate 已移除

// 避免主題切換時出現 FOUC（樣式閃爍）
useHead({
  script: [
    {
      children: `
        (function() {
          try {
            var theme = localStorage.getItem('gencko_theme');
            if (theme === 'dark') {
              document.documentElement.classList.remove('day-mode');
            } else {
              document.documentElement.classList.add('day-mode');
            }
          } catch (e) {}
        })();
      `
    }
  ]
})

watch(
  () => route.path,
  (newPath) => {
    if (!newPath.startsWith('/articles/')) {
      store.readingProgress = 0
      store.readingArticle = null
    }

    // 依路由前綴同步目前分頁，分類規則集中於 route-tab module
    store.curTab = getRouteTab(newPath)
  }
)

const scrollToTop = () => {
  if (globalLenis) globalLenis.scrollTo(0, { duration: 1.0 })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  store.initTheme()
  store.loadDataFromAPI()
  store.loadAuctions()
  // 先還原上次 LINE 登入（即時顯示已登入狀態，修：登入後跨頁顯示未登入）
  const hadLineSession = store.restoreLineUser()
  // LINE SDK 載入時機：OAuth callback 流程中，或先前已 LINE 登入（重新驗證 session）。
  // 平常未登入使用者進站不載入，等點「LINE 登入」按鈕才會載。
  if (store.hasPendingLineAuth() || hadLineSession) store.initLiff()
  store.initPWAInstallPrompt()

  // 收集 Vue / JS 執行階段錯誤，方便在開發環境定位問題
  if (import.meta.client) {
    try {
      nuxtApp.vueApp.config.errorHandler = (err) => {
        lastRuntimeError.value = err instanceof Error ? err : new Error(String(err))
        console.error('[runtime error]', err)
      }
    } catch (e) {}

    window.addEventListener('error', (event) => {
      const err = event?.error || new Error(event?.message || 'Unknown error')
      lastRuntimeError.value = err
    })

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason
      const err =
        reason instanceof Error ? reason : new Error(String(reason || 'Unhandled rejection'))
      lastRuntimeError.value = err
    })
  }

  try {
    const savedWish = localStorage.getItem('gencko_wishlist')
    if (savedWish) store.wishlist = JSON.parse(savedWish)
  } catch (e) {
    localStorage.removeItem('gencko_wishlist')
  }

  try {
    const savedHospWish = localStorage.getItem('gencko_hosp_wishlist')
    if (savedHospWish) store.hospWishlist = JSON.parse(savedHospWish)
  } catch (e) {
    localStorage.removeItem('gencko_hosp_wishlist')
  }

  try {
    const savedHist = localStorage.getItem('gencko_history')
    if (savedHist) store.history = JSON.parse(savedHist)
  } catch (e) {
    localStorage.removeItem('gencko_history')
  }

  // 啟動全域 Lenis（/about 頁有自己的 Lenis，非 about 頁由此接管）
  initGlobalLenis()
})

onBeforeUnmount(() => {
  destroyGlobalLenis()
})
</script>

<template>
  <!-- Skip to content：鍵盤 Tab 第一站即可跳過全站 nav 直達主內容（WCAG 2.4.1） -->
  <a href="#main-content" class="skip-to-content">跳至主要內容</a>

  <div class="cont">
    <VitePwaManifest />

    <!-- 除錯 overlay：顯示執行階段錯誤的詳細內容，方便定位問題 -->
    <div
      v-if="lastRuntimeError"
      style="
        position: fixed;
        inset: 12px 12px auto 12px;
        z-index: 1000000;
        max-width: 980px;
        margin: 0 auto;
        left: 0;
        right: 0;
        pointer-events: none;
      "
    >
      <div
        style="
          background: var(--card-bg-solid);
          color: var(--txt);
          border: 1px solid var(--bd);
          border-radius: 2px;
          padding: 12px 12px 10px 12px;
          box-shadow: none;
          pointer-events: auto;
        "
      >
        <div role="alert" style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap">
          <strong style="font-size: 0.95rem">{{ isDevelopment ? '執行階段錯誤，請檢查下方資訊' : '頁面發生錯誤' }}</strong>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end">
            <button
              class="btn-app btn-app--ghost"
              style="padding: 6px 10px; font-size: 0.85rem"
              @click="clearRuntimeError()"
            >
              關閉
            </button>
            <button
              class="btn-app btn-app--primary"
              style="padding: 6px 10px; font-size: 0.85rem; opacity: 0.9"
              @click="goHomeFromError()"
            >
              回到首頁
            </button>
          </div>
        </div>
        <pre
          v-if="isDevelopment"
          style="
            margin: 10px 0 0 0;
            white-space: pre-wrap;
            font-size: 0.85rem;
            line-height: 1.25;
            max-height: 40vh;
            overflow: auto;
          "
          >{{
            lastRuntimeError?.stack || lastRuntimeError?.message || String(lastRuntimeError)
          }}</pre
        >
      </div>
    </div>

    <!-- iOS 安裝提示視窗 -->
    <dialog
      v-if="store.showIOSGuide"
      ref="iosDialog"
      class="ios-install-guide-overlay"
      aria-labelledby="ios-guide-title"
      @cancel.prevent="store.showIOSGuide = false"
      @click.self="store.showIOSGuide = false"
    >
      <div class="ios-guide-box" @click.stop>
        <button class="btn-close-guide" @click="store.showIOSGuide = false">關閉</button>
        <h3 id="ios-guide-title">安裝 Gencko App（iOS）</h3>
        <p>iOS 需要手動將網站加入主畫面，以下為操作步驟：</p>
        <ol class="ios-steps">
          <li>1. 使用 Safari 開啟網站，點右下角「分享」按鈕</li>
          <li>2. 選擇「加入主畫面」，完成安裝</li>
        </ol>
        <p style="font-size: 0.85rem; color: #888; margin-top: 10px; text-align: center">
          若找不到選項，請先向上滑動清單。
        </p>
        <div class="ios-arrow-down">↓</div>
      </div>
    </dialog>

    <TheLightbox
      :item="store.lightboxItem"
      :line-link="store.lineLink"
      @close="store.closeLightbox"
    />
    <TheToast :show="store.showToast" />
    <TheNavbar
      :nav-hidden="store.navHidden"
      :is-day-mode="store.isDayMode"
      :cur-tab="store.curTab"
      :reading-article="store.readingArticle"
      :reading-progress="store.readingProgress"
      @toggle-theme="store.toggleTheme"
      @scroll-top="scrollToTop"
    />

    <main id="main-content" style="padding-top: 0">
      <!--
        1) NuxtPage 以 fullPath 作為 key，query 變動時仍可保留頁面狀態。
        2) NuxtErrorBoundary 捕捉頁面 runtime error，避免整個應用程式直接中斷。
      -->
      <NuxtErrorBoundary>
        <!-- 避免 query 變動（例如選購切換物種/篩選）就整頁卸載重掛，造成「噸級閃爍」 -->
        <NuxtPage :page-key="route.path" />

        <template #error="{ error, clearError }">
          <div
            style="
              max-width: 920px;
              margin: 0 auto;
              padding: 32px 16px;
              text-align: left;
              color: var(--txt);
            "
          >
            <h2 style="margin: 0 0 10px 0">頁面發生錯誤</h2>
            <p style="opacity: 0.8; margin: 0 0 18px 0">
              載入頁面時發生問題，請返回首頁或重新整理後再試。
            </p>
            <pre
              v-if="isDevelopment"
              style="
                white-space: pre-wrap;
                text-align: left;
                background: var(--card-bg);
                border: 1px solid var(--bd);
                border-radius: 2px;
                padding: 12px;
                max-height: 220px;
                overflow: auto;
                margin: 0 auto 16px auto;
              "
              >{{ error?.message || String(error) }}</pre
            >
            <div style="display: flex; gap: 10px; justify-content: flex-start; flex-wrap: wrap">
              <button class="btn-app btn-app--primary" style="min-width: 140px" @click="clearAndGoHome(clearError)">
                回到首頁
              </button>
              <button
                class="btn-app btn-app--ghost"
                style="min-width: 140px; opacity: 0.85"
                @click="clearAndReload(clearError)"
              >
                重新整理
              </button>
            </div>
          </div>
        </template>
      </NuxtErrorBoundary>
    </main>

    <a
      v-if="store.wishlist.length > 0"
      :href="
        'https://line.me/R/ti/p/@219abdzn?text=' +
        encodeURIComponent(
          'Hi Gencko，我想詢問我收藏的守宮個體（共 ' +
            store.wishlist.length +
            ' 隻，ID：\n' +
            store.wishlist.join(', ')
        )
      "
      target="_blank"
      class="btn-app btn-app--primary btn-app--md btn-app--pill floating-inquire-btn"
      :class="{ 'floating-inquire-btn--with-compare': route.path === '/shop' && store.compareList.length > 0 }"
    >
      <span>已選 {{ store.wishlist.length }} 隻｜一次詢問</span>
    </a>

    <TheFooter />
    <TheBottomNav />
  </div>
</template>

<style scoped>
/* Skip to content：預設離屏，鍵盤聚焦時才顯示 */
.floating-inquire-btn.floating-inquire-btn--with-compare {
  top: calc(76px + env(safe-area-inset-top, 0px));
  bottom: auto !important;
  max-width: calc(100vw - 32px);
}

.skip-to-content {
  position: fixed;
  top: -100px;
  left: 12px;
  z-index: 1000001;
  padding: 10px 18px;
  background: var(--pri);
  color: #fff;
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.95rem;
  text-decoration: none;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  transition: top 0.18s ease;
}
.skip-to-content:focus,
.skip-to-content:focus-visible {
  top: 12px;
  outline: 2px solid #fff;
  outline-offset: 2px;
}

.ios-install-guide-overlay {
  margin: 0;
  border: 0;
  padding: 0;
  max-width: none;
  max-height: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: none;
  z-index: 999999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.ios-guide-box {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 2px 2px 0 0;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  max-height: 90dvh;
  overflow-y: auto;
  width: 100%;
  max-width: 500px;
  color: var(--txt);
  position: relative;
  animation: slideUp 0.3s ease-out;
  box-shadow: none;
}
.btn-close-guide {
  display: block;
  margin: 0 0 16px auto;
  min-height: 44px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid var(--txt);
  border-radius: 2px;
  font-family: var(--font-body-zh);
  color: var(--txt);
  font-size: 0.9rem;
  cursor: pointer;
  opacity: 1;
}
.ios-guide-box h3 {
  margin: 0 0 10px 0;
  color: var(--pri);
  text-align: left;
  font-family: var(--font-heading-zh);
}
.ios-guide-box p {
  margin: 0 0 15px 0;
  line-height: 1.5;
  font-size: 0.95rem;
}
.ios-steps {
  list-style: none;
  padding: 0;
  margin: 0;
  background: transparent;
  border-radius: 0;
}
.ios-steps li {
  margin-bottom: 12px;
  font-size: 1rem;
  line-height: 1.5;
}
.ios-steps li:last-child {
  margin-bottom: 0;
}
.ios-arrow-down {
  text-align: center;
  font-size: 2rem;
  color: var(--pri);
  margin-top: 15px;
  display: none;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(10px);
  }
}

@media (max-width: 768px) {
  .floating-inquire-btn {
    bottom: calc(85px + env(safe-area-inset-bottom, 0px)) !important;
  }
}
</style>

<style>
/* 頁面轉場效果 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease-out;
}
.page-enter-from {
  opacity: 0;
}
.page-leave-to {
  opacity: 0;
}
</style>
