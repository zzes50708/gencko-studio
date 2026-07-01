<script setup>
import { useHead } from '#imports'
import { ref, defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'

// `/` 作為官網預設進入頁：顯示品牌服務動畫，但網址維持在 `/`（不做 redirect）
definePageMeta({ pageTransition: false, layoutTransition: false })

// ── LCP 優化：3D 場景改為 defineAsyncComponent ──
// 1. Vite 自動切分到獨立 chunk（GSAP + TresJS + Three.js 不再阻擋首屏）
// 2. 預設不立刻載入，由 onMounted 中的策略觸發
// 3. 載入策略（三者任一觸發即可，搶先生效）：
//    - requestIdleCallback（瀏覽器空閒時，最佳路徑）
//    - 1.5 秒 timeout（fallback，瀏覽器不支援 idle 時）
//    - 任何使用者互動（scroll / wheel / touchstart / keydown / pointerdown）
const BrandServiceScrollScene = defineAsyncComponent(
  () => import('~/components/BrandServiceScrollScene.vue')
)

const sceneReady = ref(false)

useHead({
  title: 'Gencko 守宮工作室｜專業選育 × 新手飼養教學',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Breeding Studio 台灣豹紋守宮專業繁育工作室，提供特殊基因品系個體選購、基因計算機、新手飼養教學、健康評估、特寵醫院查詢與線上競標。從基因到飼養的一站式服務。'
    },
    { property: 'og:title', content: 'Gencko 守宮工作室｜專業選育 × 新手飼養教學' },
    {
      property: 'og:description',
      content:
        '台灣豹紋守宮專業繁育工作室，特殊基因品系選購、基因計算機與新手飼養教學的一站式服務。'
    },
    { property: 'og:url', content: 'https://www.genckobreeding.com/' },
    {
      property: 'og:image',
      content:
        'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    },
    { property: 'og:image:alt', content: 'Gencko Breeding Studio - 台灣豹紋守宮專業繁育工作室' },
    { name: 'twitter:title', content: 'Gencko 守宮工作室｜專業選育 × 新手飼養教學' },
    {
      name: 'twitter:description',
      content:
        '台灣豹紋守宮專業繁育工作室，特殊基因品系選購、基因計算機與新手飼養教學的一站式服務。'
    },
    {
      name: 'twitter:image',
      content:
        'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    }
  ],
  link: [{ rel: 'canonical', href: 'https://www.genckobreeding.com/' }],
  script: [
    // WebSite + SearchAction：依 Google 規範必須放在網站根目錄 `/`
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'Gencko Breeding Studio',
        alternateName: ['Gencko Studio', '捷客工作室'],
        url: 'https://www.genckobreeding.com/',
        inLanguage: 'zh-TW',
        potentialAction: {
          '@type': 'SearchAction',
          target: 'https://www.genckobreeding.com/shop?kw={search_term_string}',
          'query-input': 'required name=search_term_string'
        }
      })
    }
  ],
  // 維持深色全螢幕背景
  bodyAttrs: { style: 'background-color: #0D0B0A !important;' },
  htmlAttrs: { style: 'background-color: #0D0B0A !important;' }
})

// 捲動鎖（只在 3D 場景已載入時啟用，避免 fallback 階段阻擋使用者上下捲動）
let prevHtmlOverflow = null
let prevBodyOverflow = null
const lockScroll = () => {
  if (!import.meta.client) return
  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}
const unlockScroll = () => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = prevHtmlOverflow ?? ''
  document.body.style.overflow = prevBodyOverflow ?? ''
}

let idleHandle = null
let timeoutHandle = null
let kickoffListeners = []

const cleanupKickoff = () => {
  if (idleHandle != null && 'cancelIdleCallback' in window) {
    cancelIdleCallback(idleHandle)
    idleHandle = null
  }
  if (timeoutHandle) {
    clearTimeout(timeoutHandle)
    timeoutHandle = null
  }
  kickoffListeners.forEach(([evt, fn]) => window.removeEventListener(evt, fn))
  kickoffListeners = []
}

const kickoffScene = () => {
  if (sceneReady.value) return
  sceneReady.value = true
  lockScroll()
  cleanupKickoff()
}

// #U2：是否自動載入 3D 場景。
// reduced-motion（無障礙）或真正低階裝置（核心/記憶體不足）→ 不自動載入，
// 改維持靜態 fallback 並提供「載入互動動畫」按鈕，兼顧無障礙與行動效能/LCP。
// 一般手機/桌機維持原本自動載入體驗。
const manualLoadOnly = ref(false)
const shouldAutoLoadScene = () => {
  if (!import.meta.client) return false
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return false
  const cores = navigator.hardwareConcurrency || 8
  const mem = navigator.deviceMemory || 8
  if (cores <= 4 || mem <= 4) return false
  return true
}

onMounted(() => {
  if (!import.meta.client) return

  // reduced-motion / 低階裝置：不自動載入，顯示手動載入入口
  if (!shouldAutoLoadScene()) {
    manualLoadOnly.value = true
    return
  }

  // 路徑 A：瀏覽器 idle（最佳，行動裝置常見 100–800ms）
  if ('requestIdleCallback' in window) {
    idleHandle = requestIdleCallback(() => kickoffScene(), { timeout: 2500 })
  } else {
    // 路徑 B：fallback 1.5s timeout（Safari < 17 / 部分舊版瀏覽器）
    timeoutHandle = setTimeout(kickoffScene, 1500)
  }

  // 路徑 C：使用者互動瞬間觸發（不等 idle）
  const events = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointerdown']
  events.forEach((evt) => {
    const fn = () => kickoffScene()
    window.addEventListener(evt, fn, { once: true, passive: true })
    kickoffListeners.push([evt, fn])
  })
})

onBeforeUnmount(() => {
  cleanupKickoff()
  if (sceneReady.value) unlockScroll()
})
</script>

<template>
  <div class="about-anim-page full-bleed">
    <!-- ── Fallback：輕量 LCP 元素，淡出時 cross-fade 至 3D 場景 ── -->
    <Transition name="fade-fallback">
      <div v-if="!sceneReady" class="anim-fallback">
        <!-- SEO：fallback 階段的唯一 h1（scene 載入後 unmount，由 scene 內自己的 h1 接手） -->
        <h1 class="sr-only">Gencko Studio｜台灣豹紋守宮專業繁育工作室</h1>
        <div class="fallback-content">
          <div class="fallback-title" aria-hidden="true">Gencko Studio</div>
          <div class="fallback-subtitle" aria-hidden="true">品牌服務</div>
          <div class="fallback-actions">
            <NuxtLink to="/home" class="fallback-skip" aria-label="直接進入官網">
              直接進入官網 →
            </NuxtLink>
            <!-- #U2：reduced-motion / 低階裝置不自動載入 3D，改由使用者自願載入 -->
            <button
              v-if="manualLoadOnly"
              type="button"
              class="fallback-skip fallback-load-btn"
              @click="kickoffScene"
            >
              載入互動動畫
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── 真正的 3D 場景：idle / 任何互動後才掛載，淡入呈現 ── -->
    <Transition name="fade-scene" appear>
      <BrandServiceScrollScene v-if="sceneReady" />
    </Transition>
  </div>
</template>

<style scoped>
.about-anim-page {
  padding: 0;
  background: #0d0b0a;
  min-height: 100vh;
}

.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

/* ── Fallback：視覺對齊 3D 場景第一幕（純黑底，文字陰影與 scene h1 一致） ── */
/* 移除橘色 radial glow 與橘色 text-shadow，避免「亮 → 暗」閃爍 */
.anim-fallback {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0b0a;
  z-index: 2;
  overflow: hidden;
}

.fallback-content {
  position: relative;
  text-align: center;
  color: #fff;
  padding: 0 24px;
  /* 內容自身淡入，給使用者「品牌字慢慢浮現」感覺，不會突兀 */
  animation: fallbackContentIn 0.6s ease-out both;
}

.fallback-title {
  /* LCP 優化：字級對齊 scene 內 .scene-title--hero（clamp(3.2rem, 8.5vw, 9rem)） */
  font-size: clamp(3.2rem, 8.5vw, 9rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.08;
  /* 對齊 scene h1 text-shadow（黑色而非橘色），避免明亮閃爍 */
  text-shadow: 0 6px 34px rgba(0, 0, 0, 0.55);
}

.fallback-subtitle {
  margin-top: 0.8rem;
  font-size: clamp(0.95rem, 2.2vw, 1.35rem);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  opacity: 0.55;
}

.fallback-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
}

.fallback-skip {
  display: inline-block;
  padding: 10px 24px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 700;
  transition:
    border-color 0.25s,
    background 0.25s,
    color 0.25s;
  pointer-events: auto;
}

.fallback-skip:hover,
.fallback-skip:focus {
  border-color: #e8440a;
  background: rgba(232, 68, 10, 0.12);
  color: #fff;
}

/* #U2：手動載入 3D 動畫按鈕（reduced-motion / 低階裝置時顯示），填色以示主要動作 */
.fallback-load-btn {
  cursor: pointer;
  background: #cc3b08;
  border-color: #cc3b08;
  font-family: inherit;
}
.fallback-load-btn:hover,
.fallback-load-btn:focus {
  background: #e8440a;
  border-color: #e8440a;
}

/* ── Cross-fade 入場動畫：fallback 與 scene 重疊淡出/淡入 ── */
/* fallback 淡出（500ms） */
.fade-fallback-leave-active {
  transition: opacity 0.5s ease-out;
}
.fade-fallback-leave-to {
  opacity: 0;
}

/* scene 淡入（700ms，比 fallback 慢 200ms，營造「自然浮現」感） */
.fade-scene-enter-active {
  transition: opacity 0.7s ease-in;
}
.fade-scene-enter-from {
  opacity: 0;
}

/* fallback 內容浮現（避免 SSR 第一幀就是滿亮文字） */
@keyframes fallbackContentIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 尊重 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .fallback-content {
    animation: none;
  }
  .fade-fallback-leave-active,
  .fade-scene-enter-active {
    transition: none;
  }
}

/* 行動裝置：縮小邊距 */
@media (max-width: 768px) {
  .fallback-skip {
    margin-top: 24px;
    padding: 8px 20px;
    font-size: 0.82rem;
  }
}
</style>
