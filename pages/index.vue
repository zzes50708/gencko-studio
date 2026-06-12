<script setup>
import { useHead } from '#imports'
import BrandServiceScrollScene from '~/components/BrandServiceScrollScene.vue'
import { onBeforeUnmount, onMounted } from 'vue'

// `/` 作為官網預設進入頁：顯示品牌服務動畫，但網址維持在 `/`（不做 redirect）
definePageMeta({ pageTransition: false, layoutTransition: false })

useHead({
  title: 'Gencko 守宮工作室｜專業選育 × 新手飼養教學',
  meta: [
    { name: 'description', content: 'Gencko Breeding Studio 台灣豹紋守宮專業繁育工作室，提供特殊基因品系個體選購、基因計算機、新手飼養教學、健康評估、特寵醫院查詢與線上競標。從基因到飼養的一站式服務。' },
    { property: 'og:title', content: 'Gencko 守宮工作室｜專業選育 × 新手飼養教學' },
    { property: 'og:description', content: '台灣豹紋守宮專業繁育工作室，特殊基因品系選購、基因計算機與新手飼養教學的一站式服務。' },
    { property: 'og:url', content: 'https://www.genckobreeding.com/' },
    { property: 'og:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' },
    { name: 'twitter:image', content: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png' },
  ],
  link: [
    { rel: 'canonical', href: 'https://www.genckobreeding.com/' },
  ],
  script: [
    // WebSite + SearchAction：依 Google 規範必須放在網站根目錄 `/`
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Gencko Breeding Studio",
        "alternateName": ["Gencko Studio", "捷客工作室"],
        "url": "https://www.genckobreeding.com/",
        "inLanguage": "zh-TW",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.genckobreeding.com/shop?kw={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      })
    }
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
