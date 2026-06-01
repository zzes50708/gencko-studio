<script setup>
import { useHead } from '#imports'
import BrandServiceScrollScene from '~/components/BrandServiceScrollScene.vue'

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
  background: #0D0B0A;  /* 與 .stage 蜂巢底色一致，消除白色閃爍 */
}

/* /about 需要滿版，讓 Stage/FXScroll 對齊視窗 */
.full-bleed {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
}

/* ── 僅限 /about 頁面隱藏捲軸 ──────────────────────────────────────────────
   .stage 已是 position:fixed;overflow:hidden，頁面本身不需捲軸。
   隱藏以防捲軸空間與 GSAP Observer 動畫衝突。
   scoped style 的 :global() 只在 about.vue 活躍期間注入，離開後自動移除。 */
:global(html):has(.about-anim-page),
:global(body):has(.about-anim-page) {
  overflow: hidden;
  scrollbar-width: none;       /* Firefox */
}
:global(html:has(.about-anim-page)::-webkit-scrollbar),
:global(body:has(.about-anim-page)::-webkit-scrollbar) {
  display: none;               /* Chrome / Safari / Edge */
}
</style>
