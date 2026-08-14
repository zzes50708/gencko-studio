<script setup lang="ts">
import { useHead } from '#imports'
import { onBeforeUnmount, onMounted } from 'vue'

let prevScrollRestoration: ScrollRestoration | '' = ''
let prevHtmlOverflow = ''
let prevBodyOverflow = ''
let prevHtmlHeight = ''
let prevBodyHeight = ''
let prevHtmlOverscroll = ''
let prevBodyOverscroll = ''
let prevScrollbarWidthVar = ''
let resetScrollFrame = 0
let resetScrollTimers: number[] = []
let resetScrollUntil = 0

const HERO_FORCE_START_EVENT = 'hero-lab:force-start'

function resetScrollTop(notifyScene = false) {
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  if (notifyScene) window.dispatchEvent(new CustomEvent(HERO_FORCE_START_EVENT))
}

function clearScheduledScrollResets() {
  resetScrollUntil = 0
  if (resetScrollFrame) {
    window.cancelAnimationFrame(resetScrollFrame)
    resetScrollFrame = 0
  }
  for (const timer of resetScrollTimers) window.clearTimeout(timer)
  resetScrollTimers = []
}

function scheduleInitialScrollReset() {
  clearScheduledScrollResets()
  resetScrollUntil = performance.now() + 760
  resetScrollTop(true)

  let frames = 0
  const clampForInitialFrames = () => {
    if (performance.now() > resetScrollUntil) {
      resetScrollFrame = 0
      return
    }
    resetScrollTop()
    frames += 1
    if (frames < 10) {
      resetScrollFrame = window.requestAnimationFrame(clampForInitialFrames)
    } else {
      resetScrollFrame = 0
    }
  }
  resetScrollFrame = window.requestAnimationFrame(clampForInitialFrames)

  // Chrome 可能在 layout / bfcache / 圖片解碼後才套回前次 scroll，這裡補延遲夾制。
  for (const delay of [80, 180, 360, 700]) {
    resetScrollTimers.push(window.setTimeout(resetScrollTop, delay))
  }
}

useHead({
  title: 'Hero Lab',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

onMounted(() => {
  prevScrollRestoration = window.history.scrollRestoration
  window.history.scrollRestoration = 'manual'

  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  prevHtmlHeight = document.documentElement.style.height
  prevBodyHeight = document.body.style.height
  prevHtmlOverscroll = document.documentElement.style.overscrollBehavior
  prevBodyOverscroll = document.body.style.overscrollBehavior
  prevScrollbarWidthVar = document.documentElement.style.getPropertyValue(
    '--hero-native-scrollbar-width'
  )

  document.body.classList.add('hero-lab-active')
  document.documentElement.classList.add('hero-lab-active-root')
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'auto'
  document.documentElement.style.height = 'auto'
  document.body.style.height = 'auto'
  document.documentElement.style.overscrollBehavior = 'none'
  document.body.style.overscrollBehavior = 'none'
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
  document.documentElement.style.setProperty('--hero-native-scrollbar-width', `${scrollbarWidth}px`)
  scheduleInitialScrollReset()
  window.addEventListener('pageshow', scheduleInitialScrollReset)
})

onBeforeUnmount(() => {
  clearScheduledScrollResets()
  window.removeEventListener('pageshow', scheduleInitialScrollReset)
  if (prevScrollRestoration) window.history.scrollRestoration = prevScrollRestoration
  document.body.classList.remove('hero-lab-active')
  document.documentElement.classList.remove('hero-lab-active-root')
  document.documentElement.style.overflow = prevHtmlOverflow
  document.body.style.overflow = prevBodyOverflow
  document.documentElement.style.height = prevHtmlHeight
  document.body.style.height = prevBodyHeight
  document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
  document.body.style.overscrollBehavior = prevBodyOverscroll
  document.documentElement.style.setProperty('--hero-native-scrollbar-width', prevScrollbarWidthVar)
})
</script>

<template>
  <div class="hero-lab full-bleed">
    <ClientOnly>
      <HeroDnaGecko />
    </ClientOnly>
  </div>
  <div class="hero-lab-scroll-space" aria-hidden="true" />
</template>

<style scoped>
.hero-lab {
  position: fixed;
  inset: 0 var(--hero-native-scrollbar-width, 0px) 0 0;
  z-index: 3000;
  width: auto;
  height: 100vh;
  height: 100dvh;
  background: #07080a;
  overflow: hidden;
}

.full-bleed {
  width: 100%;
  margin-left: 0;
  margin-right: 0;
}

.hero-lab-scroll-space {
  /* 拉長原生捲動旅程，讓同一格滾輪帶來更細的場景位移。 */
  height: 2160vh;
  pointer-events: none;
}

:global(html.hero-lab-active-root),
:global(body.hero-lab-active) {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

:global(html.hero-lab-active-root::-webkit-scrollbar),
:global(body.hero-lab-active::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}

:global(body.hero-lab-active footer),
:global(body.hero-lab-active .marquee-container),
:global(body.hero-lab-active .sticky-nav),
:global(body.hero-lab-active .reading-progress-bar),
:global(body.hero-lab-active .bottom-nav) {
  display: none !important;
}

:global(body.hero-lab-active::before) {
  content: none !important;
  background: none !important;
}
</style>
