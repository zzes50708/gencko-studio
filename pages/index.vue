<script setup>
import { useHead } from '#imports'
import BrandServiceScrollScene from '~/components/BrandServiceScrollScene.vue'
import { onBeforeUnmount, onMounted } from 'vue'

// `/` 作為官網預設進入頁：顯示品牌服務動畫，但網址維持在 `/`（不做 redirect）
definePageMeta({ pageTransition: false, layoutTransition: false })

useHead({
  title: 'Gencko Studio — 豹紋守宮繁育工作室',
  meta: [
    { name: 'description', content: 'Gencko Studio 豹紋守宮專業繁育工作室，提供基因知識、在售個體與飼養資訊。' },
    { property: 'og:title', content: 'Gencko Studio — 豹紋守宮繁育工作室' },
    { property: 'og:description', content: 'Gencko Studio 豹紋守宮專業繁育工作室，提供基因知識、在售個體與飼養資訊。' },
    { property: 'og:url', content: 'https://www.genckobreeding.com/' },
  ],
  // 維持 /about 的深色全螢幕背景與禁止捲動效果
  bodyAttrs: { style: 'background-color: #0D0B0A !important;' },
  htmlAttrs: { style: 'background-color: #0D0B0A !important;' },
})

// about 動畫頁需要鎖住頁面捲動（避免 iOS Safari 造成 layout 跳動）
let prevHtmlOverflow = null
let prevBodyOverflow = null
onMounted(() => {
  if (!import.meta.client) return
  prevHtmlOverflow = document.documentElement.style.overflow
  prevBodyOverflow = document.body.style.overflow
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
})
onBeforeUnmount(() => {
  if (!import.meta.client) return
  document.documentElement.style.overflow = prevHtmlOverflow ?? ''
  document.body.style.overflow = prevBodyOverflow ?? ''
})
</script>

<template>
  <div class="about-anim-page full-bleed">
    <BrandServiceScrollScene />
  </div>
</template>

<style scoped>
.about-anim-page {
  padding: 0;
  background: #0D0B0A;
}

.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

/* 捲動鎖由上方 JS 控制，避免 :has 在行動裝置出現不一致行為 */
</style>
