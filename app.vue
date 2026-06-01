<script setup>
import { computed, onMounted, onUnmounted, onBeforeUnmount, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useNuxtApp } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import Lenis from 'lenis'
import { gsap } from 'gsap'

const store = useMainStore()
const route = useRoute()
const router = useRouter()
const { $pwa } = useNuxtApp()
const nuxtApp = useNuxtApp()

// ── 全域 Lenis Smooth Scroll（非 /about 頁使用）────────────────────────────
// /about 頁由 BrandServiceScrollScene 自帶私有 Lenis，此處必須讓路
let globalLenis = null
let globalLenisTicker = null

// `/` 現在也是 about 動畫頁（不改網址），因此也要視為 about，避免全域 Lenis 介入造成導覽列閃動/版面跳動
const isAboutPage = computed(() => route.path === '/' || route.path.startsWith('/about'))

const handleLenisScroll = ({ scroll }) => {
  const st = Math.max(0, scroll)
  if (st > 100 && st > store.lastScrollY) store.navHidden = true
  else store.navHidden = false
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
  if (globalLenisTicker) { gsap.ticker.remove(globalLenisTicker); globalLenisTicker = null }
  if (globalLenis) { try { globalLenis.off('scroll', handleLenisScroll) } catch (e) {} globalLenis.destroy(); globalLenis = null }
}

const initGlobalLenis = () => {
  if (!import.meta.client || isAboutPage.value) return
  destroyGlobalLenis()
  globalLenis = new Lenis({
    duration:           1.2,
    easing:             t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // expo ease-out
    orientation:        'vertical',
    gestureOrientation: 'vertical',
    smoothWheel:        true,
    wheelMultiplier:    1.0,
    touchMultiplier:    2.0,
    infinite:           false,
  })
  globalLenisTicker = time => globalLenis.raf(time * 1000)
  gsap.ticker.add(globalLenisTicker)
  gsap.ticker.lagSmoothing(0)
  globalLenis.on('scroll', handleLenisScroll)
}

// /about ↔ 其他頁切換時：啟停全域 Lenis
watch(isAboutPage, (isAbout) => {
  if (!import.meta.client) return
  if (isAbout) destroyGlobalLenis()
  else initGlobalLenis()
})

// 收集 Vue / JS runtime error（用於除錯用的 overlay）
const lastRuntimeError = ref(null)
const clearRuntimeError = () => { lastRuntimeError.value = null }

// PWA ?湔??恣??
const isUpdating = ref(false)

// ?? 靽格迤?⊥香 Bug嚗???await嚗??亦?撠蝺撥?園???
const handlePwaUpdate = () => {
  if (!$pwa) return
  isUpdating.value = true 
  
  // 1. ??唳?隞支?蝯?Service Worker (銝蝙??await 蝑?)
  try {
    $pwa.updateServiceWorker(true) 
  } catch (err) {
    console.error('PWA ?湔?誘?潮仃??', err)
  }
  
  // 2. 蝯??脩?嚗策鈭?300 瘥怎?霈?Service Worker ?交?誘嚗????啜璇辣?撥?園??唳??
  setTimeout(() => {
    window.location.reload()
  }, 300)
}

// 靽格迤 FOUC ????
useHead({
  script:[
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

watch(() => route.path, (newPath) => {
  // ?ａ????折???甇賊?脣漲璇??血?銝活?脣隞???Navbar ?脣漲璇??銝活霈?啁?雿蔭嚗?
  if (!newPath.startsWith('/articles/')) {
    store.readingProgress = 0
    store.readingArticle = null
  }

  // 隞亥楝敺?startsWith ?Ⅱ??嚗??鞈?route.name ?芸??賢?銝帘摰???
  if (newPath === '/') store.curTab = 'home'
  else if (newPath.startsWith('/articles'))  store.curTab = 'articles'
  else if (newPath.startsWith('/shop') || newPath.startsWith('/product') || newPath.startsWith('/identity')) store.curTab = 'shop'
  else if (newPath.startsWith('/auction'))   store.curTab = 'auction'
  else if (newPath.startsWith('/breeders'))  store.curTab = 'breeders'
  else if (newPath.startsWith('/merch'))     store.curTab = 'merch'
  else if (newPath.startsWith('/genes'))     store.curTab = 'genes'
  else if (newPath.startsWith('/calculator')) store.curTab = 'calculator'
  else if (newPath.startsWith('/health'))    store.curTab = 'health'
  else if (newPath.startsWith('/hospital'))  store.curTab = 'hospital'
  else if (newPath.startsWith('/qs'))        store.curTab = 'qs'
  else if (newPath.startsWith('/about'))     store.curTab = 'about'
  else if (newPath.startsWith('/care'))      store.curTab = 'care'
  else if (newPath.startsWith('/faq'))       store.curTab = 'faq'
  else if (newPath.startsWith('/profile'))   store.curTab = 'profile'
  else store.curTab = 'home'
})

const scrollToTop = () => {
  if (globalLenis) globalLenis.scrollTo(0, { duration: 1.0 })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  store.initTheme()
  store.loadDataFromAPI()
  store.loadAuctions()
  store.initLiff()
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
      const err = reason instanceof Error ? reason : new Error(String(reason || 'Unhandled rejection'))
      lastRuntimeError.value = err
    })
  }

  try {
    const savedWish = localStorage.getItem('gencko_wishlist')
    if (savedWish) store.wishlist = JSON.parse(savedWish)
  } catch (e) { localStorage.removeItem('gencko_wishlist') }

  try {
    const savedHospWish = localStorage.getItem('gencko_hosp_wishlist')
    if (savedHospWish) store.hospWishlist = JSON.parse(savedHospWish)
  } catch (e) { localStorage.removeItem('gencko_hosp_wishlist') }

  try {
    const savedHist = localStorage.getItem('gencko_history')
    if (savedHist) store.history = JSON.parse(savedHist)
  } catch (e) { localStorage.removeItem('gencko_history') }

  // 啟動全域 Lenis（/about 頁有自己的 Lenis，非 about 頁由此接管）
  initGlobalLenis()
})

onBeforeUnmount(() => {
  destroyGlobalLenis()
})
</script>

<template>
  <BackgroundInteractiveGrid />

  <div class="cont">
    <VitePwaManifest />

    <!-- Debug overlay嚗??runtime error ??閮憿舐內?箔?嚗靘踹???-->
    <div
      v-if="lastRuntimeError"
      style="position: fixed; inset: 12px 12px auto 12px; z-index: 1000000; max-width: 980px; margin: 0 auto; left: 0; right: 0; pointer-events: none;"
    >
      <div style="background: rgba(20,20,20,0.96); color: #fff; border: 1px solid rgba(255,255,255,0.18); border-radius: 12px; padding: 12px 12px 10px 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5); pointer-events: auto;">
        <div style="display:flex; align-items:center; justify-content: space-between; gap: 10px;">
          <strong style="font-size: 0.95rem;">Runtime error嚗?銝?批捆鞎潛策??</strong>
          <div style="display:flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end;">
            <button class="btn-hero" style="padding: 6px 10px; font-size: 0.85rem;" @click="clearRuntimeError()">關閉</button>
            <button class="btn-hero" style="padding: 6px 10px; font-size: 0.85rem; opacity: 0.9;" @click="clearRuntimeError(); router.push('/home')">回到首頁</button>
          </div>
        </div>
        <pre style="margin: 10px 0 0 0; white-space: pre-wrap; font-size: 0.85rem; line-height: 1.25; max-height: 40vh; overflow: auto;">{{ lastRuntimeError?.stack || lastRuntimeError?.message || String(lastRuntimeError) }}</pre>
      </div>
    </div>

    <!-- ?? ? Transition ?嚗? PWA ?湔瘞?部?脤?湔皛? -->
    <Transition name="pwa-toast-anim">
      <div v-if="$pwa?.needRefresh" class="pwa-update-toast">
        <span style="font-weight: bold;">偵測到新版本，可立即更新</span>
        <div class="pwa-update-actions">
          <button class="pwa-btn-update" :disabled="isUpdating" @click="handlePwaUpdate">
            {{ isUpdating ? '更新中...' : '立即更新' }}
          </button>
          <button class="pwa-btn-cancel" :disabled="isUpdating" @click="$pwa?.cancelPrompt()">稍後</button>
        </div>
      </div>
    </Transition>

    <!-- iOS 銝?摰??飛敶? -->
    <div v-if="store.showIOSGuide" class="ios-install-guide-overlay" @click="store.showIOSGuide = false">
      <div class="ios-guide-box" @click.stop>
        <button class="btn-close-guide" @click="store.showIOSGuide = false">關閉</button>
        <h3>安裝 Gencko App（iOS）</h3>
<p>iOS 需要手動將網站加入主畫面，以下為操作步驟：</p>
<ol class="ios-steps">
  <li>1. 使用 Safari 開啟網站，點右下角「分享」按鈕</li>
  <li>2. 選擇「加入主畫面」，完成安裝</li>
</ol>
<p style="font-size:0.85rem; color:#888; margin-top:10px; text-align:center;">若找不到選項，請先向上滑動清單。</p>
<div class="ios-arrow-down">↓</div>
    </div>
    </div>

    <TheLightbox :item="store.lightboxItem" :line-link="store.lineLink" @close="store.closeLightbox" />
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

    <main style="padding-top: 0; min-height: 80vh;">
      <!--
        1) 撘瑕 NuxtPage 靘?fullPath ???嚗??CSR 撠???Ｗ祕靘??典??渲????恍?⊥香
        2) NuxtErrorBoundary嚗?銝? runtime error ??敺??渡?撠?賢?抵??航?撠?甈?      -->
      <NuxtErrorBoundary>
        <!-- 避免 query 變動（例如選購切換物種/篩選）就整頁卸載重掛，造成「噸級閃爍」 -->
        <NuxtPage :page-key="route.path" />

        <template #error="{ error, clearError }">
          <div style="max-width: 920px; margin: 0 auto; padding: 80px 16px; text-align: center; color: var(--txt);">
            <h2 style="margin: 0 0 10px 0;">?頛?潛??航炊</h2>
            <p style="opacity: 0.8; margin: 0 0 18px 0;">
              ?虜?航楝?勗????????辣???嚗??臭誑??擐?嚗???脣閰脤???            </p>
            <pre style="white-space: pre-wrap; text-align: left; background: var(--card-bg); border: 1px solid var(--bd); border-radius: 12px; padding: 12px; max-height: 220px; overflow: auto; margin: 0 auto 16px auto;">{{ error?.message || String(error) }}</pre>
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap: wrap;">
              <button
                class="btn-hero"
                style="min-width: 140px;"
                @click="clearError(); router.push('/home')"
              >回到首頁</button>
              <button
                class="btn-hero"
                style="min-width: 140px; opacity: 0.85;"
                @click="clearError(); router.go(0)"
              >重新整理</button>
            </div>
          </div>
        </template>
      </NuxtErrorBoundary>
    </main>

    <a v-if="store.wishlist.length > 0" 
       :href="'https://line.me/R/ti/p/@219abdzn?text=' + encodeURIComponent('Hi Gencko, ???閎閰Ｗ??嗉?皜銝剔?摰悅 (' + store.wishlist.length + '?? ID嚗n' + store.wishlist.join(', '))" 
       target="_blank"
       class="btn-app btn-app--primary btn-app--md btn-app--pill floating-inquire-btn">
       <span>已選 {{ store.wishlist.length }} 隻｜一次詢問</span>
    </a>
    
    <TheFooter />
    <TheBottomNav />
  </div>
</template>

<style scoped>
/* ?? ?啣???PWA ?內瘞?部皛??脤?游???*/
.pwa-toast-anim-enter-active,
.pwa-toast-anim-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.pwa-toast-anim-enter-from,
.pwa-toast-anim-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) !important;
}

.pwa-update-toast {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: var(--card-bg); backdrop-filter: blur(10px); border: 1px solid var(--pri);
  color: var(--txt); padding: 15px 20px; border-radius: 12px; z-index: 100000;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column;
  align-items: center; gap: 12px; width: 90%; max-width: 350px; text-align: center;
}
.pwa-update-actions { display: flex; gap: 10px; width: 100%; }
.pwa-btn-update { flex: 1; background: var(--pri); color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px var(--pri-glow); transition: 0.2s; }
.pwa-btn-update:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }
.pwa-btn-cancel { flex: 1; background: transparent; color: var(--txt); opacity: 0.8; border: 1px solid var(--bd); padding: 10px; border-radius: 8px; cursor: pointer; transition: 0.2s; }
.pwa-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

/* iOS ?飛敶?璅??靽?銝? */
.ios-install-guide-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100vh;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(5px);
  z-index: 999999; display: flex; align-items: flex-end; justify-content: center;
}
.ios-guide-box {
  background: var(--card-bg); border: 1px solid var(--pri);
  border-radius: 20px 20px 0 0; padding: 30px 20px 40px 20px;
  width: 100%; max-width: 500px; color: var(--txt);
  position: relative; animation: slideUp 0.3s ease-out;
  box-shadow: 0 -10px 30px rgba(255, 69, 0, 0.2);
}
.btn-close-guide {
  position: absolute; top: 15px; right: 15px;
  background: transparent; border: none; color: var(--txt);
  font-size: 1.2rem; cursor: pointer; opacity: 0.6;
}
.ios-guide-box h3 { margin: 0 0 10px 0; color: var(--pri); text-align: center; }
.ios-guide-box p { margin: 0 0 15px 0; line-height: 1.5; font-size: 0.95rem; }
.ios-steps { list-style: none; padding: 0; margin: 0; background: rgba(128,128,128,0.1); border-radius: 12px; padding: 15px; }
.ios-steps li { margin-bottom: 12px; font-size: 1rem; line-height: 1.5; }
.ios-steps li:last-child { margin-bottom: 0; }
.ios-arrow-down { text-align: center; font-size: 2rem; color: var(--pri); margin-top: 15px; animation: bounce 1s infinite; }

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(10px); } }

@media (max-width: 768px) {
  .floating-inquire-btn { bottom: calc(85px + env(safe-area-inset-bottom, 0px)) !important; }
  .pwa-update-toast { bottom: calc(85px + env(safe-area-inset-bottom, 0px)) !important; }
}
</style>

<style>
/* ?函?頝舐?? */
.page-enter-active, .page-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.page-enter-from { opacity: 0; transform: translateY(15px) scale(0.98); filter: blur(2px); }
.page-leave-to { opacity: 0; transform: translateY(-15px) scale(0.98); filter: blur(2px); }

</style>


