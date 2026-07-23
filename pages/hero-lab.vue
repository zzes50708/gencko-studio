<script setup lang="ts">
import { useHead } from '#imports'
import { onBeforeUnmount, onMounted } from 'vue'

let prevHtmlOverflow = ''
let prevBodyOverflow = ''
let prevHtmlHeight = ''
let prevBodyHeight = ''
let prevHtmlOverscroll = ''
let prevBodyOverscroll = ''

useHead({
  title: 'Hero Lab',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
})

onMounted(() => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  prevHtmlHeight = document.documentElement.style.height
  prevBodyHeight = document.body.style.height
  prevHtmlOverscroll = document.documentElement.style.overscrollBehavior
  prevBodyOverscroll = document.body.style.overscrollBehavior

  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
  document.documentElement.style.height = '100vh'
  document.body.style.height = '100vh'
  document.documentElement.style.overscrollBehavior = 'none'
  document.body.style.overscrollBehavior = 'none'
})

onBeforeUnmount(() => {
  document.documentElement.style.overflow = prevHtmlOverflow
  document.body.style.overflow = prevBodyOverflow
  document.documentElement.style.height = prevHtmlHeight
  document.body.style.height = prevBodyHeight
  document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
  document.body.style.overscrollBehavior = prevBodyOverscroll
})
</script>

<template>
  <div class="hero-lab full-bleed">
    <ClientOnly>
      <HeroDnaGecko />
    </ClientOnly>
  </div>
</template>

<style scoped>
.hero-lab {
  position: fixed;
  inset: 0;
  z-index: 3000;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: #07080a;
  overflow: hidden;
}

.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

:global(footer),
:global(.marquee-container),
:global(.sticky-nav),
:global(.reading-progress-bar),
:global(.bottom-nav) {
  display: none !important;
}

:global(html),
:global(body) {
  overflow: hidden !important;
  height: 100vh !important;
  overscroll-behavior: none !important;
}
</style>
