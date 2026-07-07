<script setup>
import { useHead } from '#imports'
import { ref, defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'

// `/` 作為官網預設進入頁：顯示品牌服務動畫，但網址維持在 `/`（不做 redirect）
definePageMeta({ pageTransition: false, layoutTransition: false })

// ── LCP 優化：3D 場景改為 defineAsyncComponent（獨立 chunk，不阻擋首屏）──
const BrandServiceScrollScene = defineAsyncComponent(
  () => import('~/components/BrandServiceScrollScene.vue')
)

// 進場遮罩 logo：沿用 PWA manifest 同一顆 icon，經 wsrv 壓成小圖（原圖過大）
const splashLogo =
  'https://wsrv.nl/?url=cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png&w=360&output=webp&q=90'

const sceneReady = ref(false) // 是否掛載 3D 場景
const splashHidden = ref(false) // 進場遮罩是否已淡出

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
  link: [
    { rel: 'canonical', href: 'https://www.genckobreeding.com/' },
    // 進場遮罩 logo 走 wsrv，先建連線讓它盡快出現
    { rel: 'preconnect', href: 'https://wsrv.nl' }
  ],
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

// 捲動鎖（只在 3D 場景已載入時啟用）
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

// #U2：reduced-motion（無障礙）或低階裝置 → 不載入 3D 進場，直接導向官網首頁。
const shouldAutoLoadScene = () => {
  if (!import.meta.client) return false
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    return false
  const cores = navigator.hardwareConcurrency || 8
  const mem = navigator.deviceMemory || 8
  if (cores <= 4 || mem <= 4) return false
  return true
}

// 進場遮罩淡出時機：讓 3D 在遮罩底下完成進場，遮罩再淡出露出已就緒的畫面。
// 條件：3D 畫布已出現，且遮罩至少停留 HOLD_MS（遮住 3D 進場卡頓）。
const HOLD_MS = 1200
let revealTimer = null
const scheduleReveal = () => {
  if (!import.meta.client) return
  const start = performance.now()
  const tick = () => {
    const hasCanvas = !!document.querySelector('canvas')
    const elapsed = performance.now() - start
    // 畫布已就緒且達最短停留 → 淡出；5s 硬上限保險（避免極慢載入時卡住遮罩）
    if ((hasCanvas && elapsed >= HOLD_MS) || elapsed >= 5000) {
      splashHidden.value = true
      revealTimer = null
      return
    }
    revealTimer = setTimeout(tick, 120)
  }
  revealTimer = setTimeout(tick, 120)
}

const kickoffScene = () => {
  if (sceneReady.value) return
  sceneReady.value = true
  lockScroll()
  scheduleReveal()
}

onMounted(() => {
  if (!import.meta.client) return

  // reduced-motion / 低階裝置：不載入 3D，直接進官網首頁（無按鈕）
  if (!shouldAutoLoadScene()) {
    navigateTo('/home', { replace: true })
    return
  }

  // 一般裝置：立即在遮罩底下載入 3D，由遮罩遮住其進場卡頓
  kickoffScene()
})

onBeforeUnmount(() => {
  if (revealTimer) {
    clearTimeout(revealTimer)
    revealTimer = null
  }
  if (sceneReady.value) unlockScroll()
})
</script>

<template>
  <div class="about-anim-page full-bleed">
    <!-- ── 底層：真正的 3D 場景（在遮罩底下進場） ── -->
    <Transition name="fade-scene" appear>
      <BrandServiceScrollScene v-if="sceneReady" />
    </Transition>

    <!-- ── 上層：深色底 logo 淡入遮罩，遮住 3D 進場卡頓，就緒後淡出
         （z-index 高於跑馬燈 1001 / 導引欄 1000，蓋住所有全域元素）── -->
    <Transition name="splash-fade">
      <div v-if="!splashHidden" class="entry-splash">
        <!-- SEO：遮罩階段的唯一 h1（scene 載入後由 scene 內自己的 h1 接手） -->
        <h1 class="sr-only">Gencko Studio｜台灣豹紋守宮專業繁育工作室</h1>

        <img
          :src="splashLogo"
          alt="Gencko Studio"
          class="entry-splash__logo"
          width="220"
          height="220"
          fetchpriority="high"
        />
      </div>
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

/* ── 進場遮罩：純黑底（對齊 3D 第一幕），logo 淡入放大 ── */
.entry-splash {
  position: fixed;
  inset: 0;
  /* 高於跑馬燈(1001) / 導引欄(1000)，蓋住所有全域元素 */
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  background: #0d0b0a;
  overflow: hidden;
}

.entry-splash__logo {
  width: clamp(180px, 46vw, 280px);
  height: auto;
  filter: drop-shadow(0 12px 40px rgba(0, 0, 0, 0.55));
  /* logo 淡入 + 微放大浮現 */
  animation: splashLogoIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes splashLogoIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(6px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* ── 遮罩淡出（露出已就緒的 3D） ── */
.splash-fade-leave-active {
  transition: opacity 0.35s ease-out;
}
.splash-fade-leave-to {
  opacity: 0;
}

/* ── 場景淡入（在遮罩底下進行，保留原本自然浮現） ── */
.fade-scene-enter-active {
  transition: opacity 0.7s ease-in;
}
.fade-scene-enter-from {
  opacity: 0;
}

/* 尊重 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .entry-splash__logo {
    animation: none;
  }
  .splash-fade-leave-active,
  .fade-scene-enter-active {
    transition: none;
  }
}
</style>
