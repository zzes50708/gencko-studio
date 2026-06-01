<script setup>
import { useHead } from '#imports'
import BrandServiceScrollScene from '~/components/BrandServiceScrollScene.vue'
import { onBeforeUnmount, onMounted } from 'vue'

// ── 關閉頁面轉場：防止 page-enter-from { opacity:0 } 透出前一頁白色 ──
definePageMeta({ pageTransition: false, layoutTransition: false })

const aboutSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: '品牌服務｜Gencko',
  description:
    'Gencko 致力於建立嚴謹的爬蟲繁殖標準，提供透明可信的資訊與完整售後支援。',
  url: 'https://www.genckobreeding.com/about',
}

useHead({
  title: '品牌服務',
  meta: [
    { name: 'description', content: aboutSchema.description },
    { property: 'og:title', content: aboutSchema.name },
    { property: 'og:description', content: aboutSchema.description },
    { property: 'og:url', content: aboutSchema.url },
  ],
  script: [{ type: 'application/ld+json', children: JSON.stringify(aboutSchema) }],
  // ── 強制 html/body 為深色，覆蓋全站 isDayMode 預設（day-mode 白底）──
  // 因為 /about 永遠是暗色（isDayMode = false），不受全站主題影響
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

/* ── 僅限 /about 頁面隱藏捲軸 ── */
/* 捲動鎖由上方 JS 控制，避免 :has 在行動裝置出現不一致行為 */
</style>
