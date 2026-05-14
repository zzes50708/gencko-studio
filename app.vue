<script setup>
import { onMounted, onUnmounted, watch, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useNuxtApp } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

const store = useMainStore()
const route = useRoute()
const router = useRouter()
const { $pwa } = useNuxtApp() 

// PWA 更新狀態管理
const isUpdating = ref(false)

// 🌟 修正不順暢感：移除人工延遲，並強制立刻重新整理
const handlePwaUpdate = async () => {
  if (!$pwa) return
  isUpdating.value = true // 按鈕瞬間切換狀態
  
  try {
    // 傳入 false 關閉套件自帶的緩慢重整機制
    await $pwa.updateServiceWorker(false) 
  } catch (err) {
    console.error('PWA 更新失敗:', err)
  } finally {
    // 無論成功或失敗，指令發出後強制「立刻」重新整理畫面
    window.location.reload()
  }
}

// 修正 FOUC 閃屏問題
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
  store.mobileMenuOpen = false
  if (newPath.startsWith('/articles')) store.curTab = 'articles'
  else store.curTab = route.name || 'home'
})

// 滾動節流與效能優化
let isScrolling = false
const handleScroll = () => {
  if (isScrolling) return
  isScrolling = true

  window.requestAnimationFrame(() => {
    const st = Math.max(0, window.scrollY)
    
    if (st > 100 && st > store.lastScrollY) store.navHidden = true
    else store.navHidden = false

    if (st + window.innerHeight >= document.documentElement.scrollHeight - 300) {
      if (st > store.lastScrollY && store.displayLimit < 2000) {
        store.displayLimit += 20
      }
    }

    store.lastScrollY = st

    if (route.path.startsWith('/articles/') && store.readingArticle) {
      const docH = document.documentElement.scrollHeight
      const winH = window.innerHeight
      const progress = (st / (docH - winH)) * 100
      store.readingProgress = Math.min(100, Math.max(0, progress))
    }
    
    isScrolling = false
  })
}

const scrollToTop = () => window.scrollTo(0, 0)

onMounted(() => {
  store.initTheme()
  store.loadDataFromAPI()
  store.loadAuctions()
  store.initLiff()
  store.initPWAInstallPrompt()

  const savedWish = localStorage.getItem('gencko_wishlist')
  if (savedWish) store.wishlist = JSON.parse(savedWish)
  
  const savedHospWish = localStorage.getItem('gencko_hosp_wishlist')
  if (savedHospWish) store.hospWishlist = JSON.parse(savedHospWish)
  
  const savedHist = localStorage.getItem('gencko_history')
  if (savedHist) store.history = JSON.parse(savedHist)

  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="cont">
    <VitePwaManifest /> 

    <!-- 🌟 加入 Transition 動畫，讓 PWA 更新氣泡進退場更滑順 -->
    <Transition name="pwa-toast-anim">
      <div v-if="$pwa?.needRefresh" class="pwa-update-toast">
        <span style="font-weight: bold;">🚀 發現新版本！請更新以獲得最佳體驗</span>
        <div class="pwa-update-actions">
          <button class="pwa-btn-update" :disabled="isUpdating" @click="handlePwaUpdate">
            {{ isUpdating ? '🔄 更新中...' : '立即更新' }}
          </button>
          <button class="pwa-btn-cancel" :disabled="isUpdating" @click="$pwa?.cancelPrompt()">稍後</button>
        </div>
      </div>
    </Transition>

    <!-- iOS 下載安裝教學彈窗 -->
    <div v-if="store.showIOSGuide" class="ios-install-guide-overlay" @click="store.showIOSGuide = false">
      <div class="ios-guide-box" @click.stop>
        <button class="btn-close-guide" @click="store.showIOSGuide = false">✕</button>
        <h3>如何安裝 Gencko App？</h3>
        <p>因為 Apple 系統限制，請跟著以下兩個步驟輕鬆安裝：</p>
        <ol class="ios-steps">
          <li>1. 點擊 Safari 瀏覽器正下方的 <strong>「分享 ⍐」</strong> 圖示。</li>
          <li>2. 往下滑，選擇 <strong>「➕ 加入主畫面」</strong>，然後按右上角的「新增」。</li>
        </ol>
        <p style="font-size:0.85rem; color:#888; margin-top:10px; text-align:center;">安裝後即可獲得全螢幕無廣告的最佳體驗！</p>
        <div class="ios-arrow-down">⬇</div>
      </div>
    </div>

    <TheLightbox :item="store.lightboxItem" :line-link="store.lineLink" @close="store.closeLightbox" />
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
    <TheBottomNav />
  </div>
</template>

<style scoped>
/* 🌟 新增的 PWA 提示氣泡滑順進退場動畫 */
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

/* iOS 教學彈窗樣式保持不變 */
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
/* 全站路由過場動畫 */
.page-enter-active, .page-leave-active { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.page-enter-from { opacity: 0; transform: translateY(15px) scale(0.98); filter: blur(2px); }
.page-leave-to { opacity: 0; transform: translateY(-15px) scale(0.98); filter: blur(2px); }
</style>