<script setup>
import { useHead } from '#imports'
import BrandServiceScrollScene from '~/components/BrandServiceScrollScene.vue'

// `/` 作為官網預設進入頁：顯示品牌服務動畫，但網址維持在 `/`（不做 redirect）
definePageMeta({ pageTransition: false, layoutTransition: false })

useHead({
  title: '品牌服務',
  meta: [
    { name: 'description', content: 'Gencko Studio 品牌服務與核心能力介紹。' },
    { property: 'og:title', content: '品牌服務｜Gencko Studio' },
    { property: 'og:description', content: 'Gencko Studio 品牌服務與核心能力介紹。' },
    { property: 'og:url', content: 'https://www.genckobreeding.com/' },
  ],
  // 維持 /about 的深色全螢幕背景與禁止捲動效果
  bodyAttrs: { style: 'background-color: #0D0B0A !important;' },
  htmlAttrs: { style: 'background-color: #0D0B0A !important;' },
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

:global(html):has(.about-anim-page),
:global(body):has(.about-anim-page) {
  overflow: hidden;
  scrollbar-width: none;
}
:global(html:has(.about-anim-page)::-webkit-scrollbar),
:global(body:has(.about-anim-page)::-webkit-scrollbar) {
  display: none;
}
</style>

