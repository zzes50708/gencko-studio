<script setup>
import { computed, onMounted, onUnmounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useNuxtApp } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
// #U6：Lenis / gsap 改為動態 import（見 initGlobalLenis），把 ~528KB 移出每頁初始關鍵路徑，
// 平滑捲動於 mount 後才啟用（漸進增強，不阻擋 LCP）。首頁（about）本就不啟用全域 Lenis。

const store = useMainStore()
const route = useRoute()
const router = useRouter()
const { $pwa } = useNuxtApp()
const nuxtApp = useNuxtApp()

// ── 全域 Lenis Smooth Scroll（非 /about 頁使用）────────────────────────────
// /about 頁由 BrandServiceScrollScene 自帶私有 Lenis，此處必須讓路
let globalLenis = null
let globalLenisTicker = null
let gsapLib = null

// `/` 現在也是 about 動畫頁（不改網址），因此也要視為 about，避免全域 Lenis 介入造成導覽列閃動/版面跳動
const isAboutPage = computed(() => route.path === '/' || route.path.startsWith('/about'))

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
  if (!import.meta.client || isAboutPage.value) return
  destroyGlobalLenis()
  // 動態載入，避免 ~528KB 進入初始關鍵路徑（#U6）
  const [{ default: Lenis }, gsapMod] = await Promise.all([import('lenis'), import('gsap')])
  gsapLib = gsapMod.gsap
  // 競態保護：載入期間若切到 about 頁或已被銷毀，就不啟用
  if (isAboutPage.value) return
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

// /about ↔ 其他頁切換時：啟停全域 Lenis
watch(isAboutPage, (isAbout) => {
  if (!import.meta.client) return
  if (isAbout) destroyGlobalLenis()
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

// 靽格迤 FOUC ????
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

    // 隞亥楝敺?startsWith ?Ⅱ??嚗??鞈?route.name ?芸??賢?銝帘摰???
    if (newPath === '/') store.curTab = 'home'
    else if (newPath.startsWith('/articles')) store.curTab = 'articles'
    else if (newPath.startsWith('/start-here')) store.curTab = 'care'
    else if (
      newPath.startsWith('/shop') ||
      newPath.startsWith('/product') ||
      newPath.startsWith('/identity') ||
      newPath.startsWith('/buying-guide') ||
      newPath.startsWith('/why-gencko') ||
      newPath.startsWith('/stories')
    )
      store.curTab = 'shop'
    else if (newPath.startsWith('/auction')) store.curTab = 'auction'
    else if (newPath.startsWith('/breeders')) store.curTab = 'breeders'
    else if (newPath.startsWith('/merch')) store.curTab = 'merch'
    else if (newPath.startsWith('/genes')) store.curTab = 'genes'
    else if (newPath.startsWith('/calculator')) store.curTab = 'calculator'
    else if (newPath.startsWith('/health')) store.curTab = 'health'
    else if (newPath.startsWith('/hospital')) store.curTab = 'hospital'
    else if (newPath.startsWith('/qs')) store.curTab = 'qs'
    else if (newPath.startsWith('/about')) store.curTab = 'about'
    else if (newPath.startsWith('/care')) store.curTab = 'care'
    else if (newPath.startsWith('/guide')) store.curTab = 'guide'
    else if (newPath.startsWith('/faq')) store.curTab = 'faq'
    else if (newPath.startsWith('/profile')) store.curTab = 'profile'
    else store.curTab = 'home'
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

  // ?? Vue / JS runtime error嚗?蝡撅??⊥??斗?孵?
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
  <BackgroundInteractiveGrid />

  <!-- Skip to content：鍵盤 Tab 第一站即可跳過全站 nav 直達主內容（WCAG 2.4.1） -->
  <a href="#main-content" class="skip-to-content">跳至主要內容</a>

  <div class="cont">
    <VitePwaManifest />

    <!-- Debug overlay嚗??runtime error ??閮憿舐內?箔?嚗靘踹???-->
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
          background: rgba(20, 20, 20, 0.96);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 12px;
          padding: 12px 12px 10px 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
        "
      >
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px">
          <strong style="font-size: 0.95rem">Runtime error嚗?銝?批捆鞎潛策??</strong>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end">
            <button
              class="btn-hero"
              style="padding: 6px 10px; font-size: 0.85rem"
              @click="clearRuntimeError()"
            >
              關閉
            </button>
            <button
              class="btn-hero"
              style="padding: 6px 10px; font-size: 0.85rem; opacity: 0.9"
              @click="goHomeFromError()"
            >
              回到首頁
            </button>
          </div>
        </div>
        <pre
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

    <!-- iOS 銝?摰??飛敶? -->
    <div
      v-if="store.showIOSGuide"
      class="ios-install-guide-overlay"
      @click="store.showIOSGuide = false"
    >
      <div class="ios-guide-box" @click.stop>
        <button class="btn-close-guide" @click="store.showIOSGuide = false">關閉</button>
        <h3>安裝 Gencko App（iOS）</h3>
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
    </div>

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
      :cur-tab="store.curTab"
      :reading-article="store.readingArticle"
      :reading-progress="store.readingProgress"
      @toggle-theme="store.toggleTheme"
      @scroll-top="scrollToTop"
    />

    <main id="main-content" style="padding-top: 0; min-height: 80vh">
      <!--
        1) 撘瑕 NuxtPage 靘?fullPath ???嚗??CSR 撠???Ｗ祕靘??典??渲????恍?⊥香
        2) NuxtErrorBoundary嚗?銝? runtime error ??敺??渡?撠?賢?抵??航?撠?甈?      -->
      <NuxtErrorBoundary>
        <!-- 避免 query 變動（例如選購切換物種/篩選）就整頁卸載重掛，造成「噸級閃爍」 -->
        <NuxtPage :page-key="route.path" />

        <template #error="{ error, clearError }">
          <div
            style="
              max-width: 920px;
              margin: 0 auto;
              padding: 80px 16px;
              text-align: center;
              color: var(--txt);
            "
          >
            <h2 style="margin: 0 0 10px 0">?頛?潛??航炊</h2>
            <p style="opacity: 0.8; margin: 0 0 18px 0">
              ?虜?航楝?勗????????辣???嚗??臭誑??擐?嚗???脣閰脤???
            </p>
            <pre
              style="
                white-space: pre-wrap;
                text-align: left;
                background: var(--card-bg);
                border: 1px solid var(--bd);
                border-radius: 12px;
                padding: 12px;
                max-height: 220px;
                overflow: auto;
                margin: 0 auto 16px auto;
              "
              >{{ error?.message || String(error) }}</pre
            >
            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap">
              <button class="btn-hero" style="min-width: 140px" @click="clearAndGoHome(clearError)">
                回到首頁
              </button>
              <button
                class="btn-hero"
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
    >
      <span>已選 {{ store.wishlist.length }} 隻｜一次詢問</span>
    </a>

    <TheFooter />
    <TheBottomNav />
  </div>
</template>

<style scoped>
/* Skip to content：預設離屏，鍵盤聚焦時才顯示 */
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
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(5px);
  z-index: 999999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.ios-guide-box {
  background: var(--card-bg);
  border: 1px solid var(--pri);
  border-radius: 20px 20px 0 0;
  padding: 30px 20px 40px 20px;
  width: 100%;
  max-width: 500px;
  color: var(--txt);
  position: relative;
  animation: slideUp 0.3s ease-out;
  box-shadow: 0 -10px 30px rgba(255, 69, 0, 0.2);
}
.btn-close-guide {
  position: absolute;
  top: 15px;
  right: 15px;
  background: transparent;
  border: none;
  color: var(--txt);
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.6;
}
.ios-guide-box h3 {
  margin: 0 0 10px 0;
  color: var(--pri);
  text-align: center;
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
  background: rgba(128, 128, 128, 0.1);
  border-radius: 12px;
  padding: 15px;
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
  animation: bounce 1s infinite;
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
/* ?函?頝舐?? */
.page-enter-active,
.page-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.page-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
  filter: blur(2px);
}
.page-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.98);
  filter: blur(2px);
}
</style>
