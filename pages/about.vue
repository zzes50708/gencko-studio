<script setup>
import { useHead } from '#imports'
import BrandServiceScrollScene from '~/components/BrandServiceScrollScene.vue'
import { onBeforeUnmount, onMounted } from 'vue'

// ── 關閉頁面轉場：防止 page-enter-from { opacity:0 } 透出前一頁白色 ──
definePageMeta({ pageTransition: false, layoutTransition: false })

const aboutUrl = 'https://www.genckobreeding.com/about'
const aboutImg = 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%9C%AA%E5%91%BD%E5%90%8D%E8%A8%AD%E8%A8%88.png'

// Organization 完整定義（與全站 nuxt.config.ts 一致，AboutPage 為其主要描述頁）
const aboutOrganization = {
    "@type": "Organization",
    "@id": "https://www.genckobreeding.com/#organization",
    "name": "Gencko Breeding Studio",
    "alternateName": ["Gencko Studio", "捷客工作室"],
    "url": "https://www.genckobreeding.com",
    "logo": { "@type": "ImageObject", "url": "https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png", "width": 512, "height": 512 },
    "image": aboutImg,
    "description": "Gencko Breeding Studio 是台灣專業的豹紋守宮（Eublepharis macularius）繁育工作室，提供特殊基因品系個體選購、基因計算機、新手飼養教學、健康評估、特寵醫院查詢與線上競標。從基因到飼養的一站式服務。",
    "slogan": "Gencko 專業守宮選育：從特殊基因品系到新手飼養教學的一站式服務",
    "foundingDate": "2025",
    "foundingLocation": { "@type": "Place", "name": "三重, 台灣" },
    "founder": {
        "@type": "Person",
        "name": "Gino",
        "jobTitle": "創辦人 / 主理人",
        "worksFor": { "@id": "https://www.genckobreeding.com/#organization" }
    },
    "areaServed": { "@type": "Country", "name": "Taiwan" },
    "knowsAbout": [
        "豹紋守宮（Leopard Gecko）",
        "肥尾守宮（African Fat-Tail Gecko）",
        "爬蟲繁育",
        "守宮基因選育",
        "守宮品系",
        "守宮新手飼養",
        "Eublepharis macularius",
        "Hemitheconyx caudicinctus"
    ],
    "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Gencko 服務目錄",
        "itemListElement": [
            { "@type": "Offer", "name": "守宮個體選購", "url": "https://www.genckobreeding.com/shop" },
            { "@type": "Offer", "name": "基因計算機", "url": "https://www.genckobreeding.com/calculator" },
            { "@type": "Offer", "name": "守宮基因圖鑑", "url": "https://www.genckobreeding.com/genes" },
            { "@type": "Offer", "name": "新手飼養教學", "url": "https://www.genckobreeding.com/care" },
            { "@type": "Offer", "name": "飼養知識專欄", "url": "https://www.genckobreeding.com/articles" },
            { "@type": "Offer", "name": "線上競標", "url": "https://www.genckobreeding.com/auction" },
            { "@type": "Offer", "name": "健康評估", "url": "https://www.genckobreeding.com/health" },
            { "@type": "Offer", "name": "飼養前評估", "url": "https://www.genckobreeding.com/qs" },
            { "@type": "Offer", "name": "特寵醫院查詢", "url": "https://www.genckobreeding.com/hospital" }
        ]
    },
    "sameAs": [
        "https://www.instagram.com/gencko_breeding",
        "https://www.facebook.com/profile.php?id=61579393505049",
        "https://line.me/R/ti/p/@219abdzn"
    ],
    "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": ["Chinese", "zh-TW"]
    }
}

const aboutBreadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "首頁", "item": "https://www.genckobreeding.com/" },
        { "@type": "ListItem", "position": 2, "name": "關於我們", "item": aboutUrl }
    ]
}

const aboutPageLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": aboutUrl,
    "url": aboutUrl,
    "name": "關於 Gencko Breeding Studio｜台灣豹紋守宮專業繁育工作室",
    "description": "Gencko Breeding Studio（Gencko Studio / 捷客工作室）是台灣專業豹紋守宮繁育工作室。創立於 2025 年，由 Gino 創辦於三重，提供守宮選購、基因計算、飼養教學與健康評估的一站式服務。",
    "inLanguage": "zh-TW",
    "isPartOf": { "@type": "WebSite", "@id": "https://www.genckobreeding.com/#website" },
    "primaryImageOfPage": { "@type": "ImageObject", "url": aboutImg },
    "speakable": {
        "@type": "SpeakableSpecification",
        "cssSelector": [".scene-title", ".scene-desc"]
    },
    "about": aboutOrganization,
    "mainEntity": aboutOrganization,
    "mentions": [
        { "@type": "Taxon", "name": "Eublepharis macularius", "alternateName": "豹紋守宮", "sameAs": "https://www.wikidata.org/wiki/Q185061" },
        { "@type": "Taxon", "name": "Hemitheconyx caudicinctus", "alternateName": "肥尾守宮", "sameAs": "https://www.wikidata.org/wiki/Q913571" }
    ]
}

useHead({
  title: '關於我們｜Gencko Breeding Studio 台灣豹紋守宮專業繁育工作室',
  meta: [
    { name: 'description', content: 'Gencko Breeding Studio（Gencko Studio / 捷客工作室）是台灣專業豹紋守宮繁育工作室。創立於 2025 年，由 Gino 創辦於三重，提供守宮選購、基因計算機、新手飼養教學、健康評估、特寵醫院查詢與線上競標的一站式服務。' },
    { name: 'keywords', content: 'Gencko, Gencko Breeding Studio, 捷客工作室, 豹紋守宮工作室, 台灣守宮繁育, 三重守宮, Gino' },
    // Open Graph
    { property: 'og:title', content: '關於我們｜Gencko Breeding Studio 台灣豹紋守宮專業繁育工作室' },
    { property: 'og:description', content: '台灣專業豹紋守宮繁育工作室，創立於 2025 年。從基因到飼養的一站式服務。' },
    { property: 'og:image', content: aboutImg },
    { property: 'og:image:alt', content: 'Gencko Breeding Studio - 台灣豹紋守宮專業繁育工作室' },
    { property: 'og:url', content: aboutUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '關於我們｜Gencko Breeding Studio 台灣豹紋守宮專業繁育工作室' },
    { name: 'twitter:description', content: '台灣專業豹紋守宮繁育工作室，創立於 2025 年。從基因到飼養的一站式服務。' },
    { name: 'twitter:image', content: aboutImg }
  ],
  link: [ { rel: 'canonical', href: aboutUrl } ],
  script: [
    { type: 'application/ld+json', children: JSON.stringify(aboutPageLd) },
    { type: 'application/ld+json', children: JSON.stringify(aboutBreadcrumbLd) }
  ],
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
