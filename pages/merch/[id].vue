<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

const route = useRoute()
const store = useMainStore()
const supabase = useSupabaseClient()
const merchId = route.params.id
const isHydrated = ref(false)

onMounted(() => {
  isHydrated.value = true
})

const { data: currentMerch, pending } = await useAsyncData('merch-' + merchId, async () => {
  // ??Store 銝剖歇蝬??券????”嚗?閰西?敺ㄐ?Ｘ
  if (store.merchList && store.merchList.length > 0) {
    const found = store.merchList.find((m) => String(m.ItemID) === String(merchId))
    if (found) return found
  }

  // ?亦鞈? (SSR ??仿脣?折?)嚗? Supabase ?亥岷
  const { data, error } = await supabase
    .from('merchandise')
    .select('*')
    .eq('item_id', merchId)
    .maybeSingle()

  if (error || !data) return null

  return {
    ItemID: data.item_id,
    Name: data.name,
    Description: data.description,
    Price: data.price,
    ImageURL: data.image_url,
    Category: data.category,
    Available: data.available,
    ExternalLink: data.external_link
  }
})

//[SEO] ?? Meta ??瑽?鞈?
const siteData = computed(() => {
  if (currentMerch.value) {
    const m = currentMerch.value

    const imgUrl = m.ImageURL
      ? getCleanUrl(m.ImageURL)
      : 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    const itemUrl = 'https://www.genckobreeding.com/merch/' + m.ItemID
    const title = m.Name + ' - NT$' + m.Price
    const desc = m.Description
      ? m.Description.slice(0, 150) + '...'
      : 'Gencko 周邊商品：' + m.Name + '，價格 NT$' + m.Price
    const isAvailable = m.Available !== 'No'

    // Product Schema
    const priceNumber = (() => {
      const mt = String(m.Price ?? '').match(/\d+(\.\d+)?/)
      return mt ? mt[0] : ''
    })()
    const isPriceRange = /起|~|-/.test(String(m.Price ?? ''))
    const cat = m.Category || '周邊商品'
    const merchSeller = {
      '@type': 'Organization',
      name: 'Gencko Breeding Studio',
      alternateName: ['Gencko Studio', '捷客工作室'],
      url: 'https://www.genckobreeding.com',
      logo: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png',
      sameAs: [
        'https://www.instagram.com/gencko_breeding',
        'https://www.facebook.com/profile.php?id=61579393505049',
        'https://line.me/R/ti/p/@219abdzn'
      ]
    }
    const offer = {
      '@type': 'Offer',
      '@id': `${itemUrl}#offer`,
      url: itemUrl,
      priceCurrency: 'TWD',
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      businessFunction: 'http://purl.org/goodrelations/v1#Sell',
      areaServed: { '@type': 'Country', name: 'Taiwan' },
      seller: merchSeller
    }
    if (priceNumber) {
      offer.price = priceNumber
      if (isPriceRange) {
        offer.priceSpecification = {
          '@type': 'PriceSpecification',
          priceCurrency: 'TWD',
          minPrice: Number(priceNumber)
        }
      }
    }
    const product = {
      '@type': 'Product',
      '@id': `${itemUrl}#product`,
      name: m.Name,
      image: [imgUrl],
      description: m.Description || desc,
      sku: String(m.ItemID),
      productID: String(m.ItemID),
      mpn: String(m.ItemID),
      category: `寵物用品 > ${cat}`,
      brand: {
        '@type': 'Brand',
        name: 'Gencko Breeding Studio',
        alternateName: ['Gencko Studio', '捷客工作室']
      },
      manufacturer: merchSeller,
      ...(cat
        ? { additionalProperty: [{ '@type': 'PropertyValue', name: '分類', value: cat }] }
        : {}),
      offers: offer
    }

    // WebPage 包覆
    const webPageLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': itemUrl,
      url: itemUrl,
      name: title,
      inLanguage: 'zh-TW',
      isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
      primaryImageOfPage: { '@type': 'ImageObject', url: imgUrl },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.prod-title', '.merch-desc', '.price']
      },
      mainEntity: product
    }

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '首頁',
          item: 'https://www.genckobreeding.com/home'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '周邊商品',
          item: 'https://www.genckobreeding.com/merch'
        },
        { '@type': 'ListItem', position: 3, name: m.Name, item: itemUrl }
      ]
    }

    return {
      title,
      desc,
      img: imgUrl,
      url: itemUrl,
      isAvailable,
      priceNumber,
      price: m.Price,
      script: [
        { type: 'application/ld+json', innerHTML: JSON.stringify(webPageLd) },
        { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumb) }
      ]
    }
  }

  return {
    title: '找不到該商品',
    desc: '請確認網址是否正確，或稍後再試一次。',
    img: 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85',
    url: 'https://www.genckobreeding.com/merch/' + merchId,
    isAvailable: false,
    priceNumber: '',
    price: '',
    script: []
  }
})

useHead({
  title: computed(() => siteData.value.title),
  meta: [
    { name: 'description', content: computed(() => siteData.value.desc) },
    // Open Graph
    { property: 'og:title', content: computed(() => siteData.value.title) },
    { property: 'og:description', content: computed(() => siteData.value.desc) },
    { property: 'og:image', content: computed(() => siteData.value.img) },
    {
      property: 'og:image:alt',
      content: computed(() => `${siteData.value.title} - Gencko 周邊商品`)
    },
    { property: 'og:url', content: computed(() => siteData.value.url) },
    { property: 'og:type', content: 'product' },
    { property: 'product:price:amount', content: computed(() => siteData.value.priceNumber) },
    { property: 'product:price:currency', content: 'TWD' },
    {
      property: 'product:availability',
      content: computed(() => (siteData.value.isAvailable ? 'in stock' : 'out of stock'))
    },
    { property: 'product:condition', content: 'new' },
    { property: 'product:brand', content: 'Gencko Breeding Studio' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: computed(() => siteData.value.title) },
    { name: 'twitter:description', content: computed(() => siteData.value.desc) },
    { name: 'twitter:image', content: computed(() => siteData.value.img) },
    { name: 'twitter:label1', content: '價格' },
    {
      name: 'twitter:data1',
      content: computed(() => (siteData.value.price ? `NT$ ${siteData.value.price}` : ''))
    },
    { name: 'twitter:label2', content: '庫存' },
    {
      name: 'twitter:data2',
      content: computed(() => (siteData.value.isAvailable ? '有庫存' : '缺貨'))
    }
  ],
  link: [{ rel: 'canonical', href: computed(() => siteData.value.url) }],
  script: computed(() => siteData.value.script)
})

const copyCurrentLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    store.triggerToast()
  } catch (err) {
    console.error('複製商品連結失敗:', err)
  }
}

const availabilityLabel = computed(() =>
  currentMerch.value?.Available === 'No' ? '暫停供應' : '供應中'
)

const categoryLabel = computed(() => currentMerch.value?.Category || '周邊商品')

const formattedPrice = computed(() => {
  const value = currentMerch.value?.Price
  if (value == null || String(value).trim() === '') return '價格請洽'

  const raw = String(value).trim()
  const match = raw.match(/\d+(?:\.\d+)?/)
  if (!match) return `NT$ ${raw}`

  return `NT$ ${raw.replace(match[0], Number(match[0]).toLocaleString('zh-TW'))}`
})
</script>

<template>
  <main class="merch-detail-wrapper">
    <div class="common-document-meta" aria-label="周邊詳情說明">
      <span>GENCKO GOODS RECORD</span>
      <span>DETAIL / REVIEW / ORDER</span>
    </div>
    <section v-if="isHydrated && pending" class="detail-state" aria-busy="true">
      <div class="loader" aria-hidden="true"></div>
      <h1>正在載入商品</h1>
      <p role="status">請稍候，我們正在取得最新商品資訊。</p>
      <TheBackButton fallback="/merch" text="返回周邊列表" />
    </section>

    <section v-else-if="!currentMerch" class="detail-state detail-state--empty">
      <p class="detail-state__code" aria-hidden="true">404</p>
      <h1>找不到該商品</h1>
      <p>商品可能已下架，請返回列表查看目前可瀏覽的品項。</p>
      <TheBackButton fallback="/merch" text="返回周邊列表" />
    </section>

    <article
      v-else
      class="prod-container"
      data-phase3-surface="merch-detail"
      aria-labelledby="merch-detail-title"
    >
      <div class="prod-navigation">
        <TheBackButton fallback="/merch" text="返回周邊列表" />
        <span class="prod-sku">商品編號 {{ currentMerch.ItemID }}</span>
      </div>

      <div class="prod-layout">
        <section class="prod-gallery" aria-label="商品圖片">
          <div class="prod-img-box">
            <button
              v-if="currentMerch.ImageURL"
              type="button"
              class="prod-img-button"
              :aria-label="`放大 ${currentMerch.Name} 圖片`"
              @click="store.openLightbox(currentMerch)"
            >
              <img
                :src="getCleanUrl(currentMerch.ImageURL)"
                :alt="currentMerch.Name"
                class="prod-main-img"
                loading="eager"
                decoding="async"
              />
            </button>
            <div v-else class="prod-img-placeholder" aria-hidden="true">Gencko supply</div>
          </div>
          <p v-if="currentMerch.ImageURL" class="prod-hint">點擊圖片可查看大圖</p>
        </section>

        <div class="prod-info-box">
          <header class="prod-heading">
            <div class="prod-meta">
              <span>{{ categoryLabel }}</span>
              <span
                class="availability-badge"
                :class="{ 'is-unavailable': currentMerch.Available === 'No' }"
              >
                {{ availabilityLabel }}
              </span>
            </div>
            <h1 id="merch-detail-title" class="prod-title">{{ currentMerch.Name }}</h1>
          </header>

          <p class="merch-desc">
            {{ currentMerch.Description || '商品細節請於購買前透過客服確認。' }}
          </p>

          <section class="purchase-panel" role="region" aria-label="購買資訊">
            <div class="prod-price-area">
              <span class="price-label">商品價格</span>
              <div class="price">{{ formattedPrice }}</div>
            </div>
            <div class="purchase-guidance">
              <strong>購買前請先確認商品規格與交付方式</strong>
              <span>點擊購買會開啟外部聯絡頁面，本頁不會直接完成付款。</span>
            </div>
            <p v-if="currentMerch.Available === 'No'" class="unavailable-notice" role="status">
              此商品目前暫停供應，你仍可複製連結保留商品資訊。
            </p>
            <div class="prod-actions">
              <a
                v-if="currentMerch.Available !== 'No'"
                :href="currentMerch.ExternalLink || store.lineLink"
                target="_blank"
                class="btn-app btn-app--primary btn-app--lg btn-buy-lg"
                rel="noopener noreferrer"
              >
                開啟聯絡頁面購買
              </a>
              <button
                type="button"
                class="btn-app btn-app--secondary btn-app--md btn-share"
                aria-label="複製商品連結"
                @click="copyCurrentLink"
              >
                複製連結
              </button>
            </div>
          </section>
        </div>
      </div>
    </article>
  </main>
</template>

<style scoped>
.merch-detail-wrapper {
  width: 100%;
  padding: 1rem 1.25rem 5rem;
}

.detail-state {
  display: grid;
  justify-items: center;
  width: min(100%, 42rem);
  margin: 0 auto;
  padding: clamp(4rem, 12vw, 8rem) 1rem;
  color: var(--txt);
  text-align: center;
}

.detail-state h1 {
  margin: 0;
  font-size: clamp(1.8rem, 5vw, 3rem);
  text-wrap: balance;
}

.detail-state p:not(.detail-state__code) {
  margin: 0.75rem 0 1.5rem;
  line-height: 1.7;
  opacity: 0.68;
}

.detail-state__code {
  margin: 0 0 1rem;
  color: var(--pri);
  font-size: 3rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.loader {
  width: 2.75rem;
  height: 2.75rem;
  margin-bottom: 1.5rem;
  border: 3px solid var(--bd);
  border-top-color: var(--pri);
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.prod-container {
  width: min(100%, 1160px);
  margin: 0 auto;
}

.prod-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.prod-sku {
  color: var(--txt);
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.5;
}

.prod-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(22rem, 0.92fr);
  gap: clamp(1.5rem, 4vw, 4rem);
  align-items: start;
}

.prod-gallery {
  min-width: 0;
}

.prod-img-box {
  overflow: hidden;
  position: relative;
  border: 1px solid var(--bd);
  border-radius: 1.25rem;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--bd));
}

.prod-main-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  display: block;
}

.prod-img-button {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: zoom-in;
  transition: opacity 180ms ease-out;
}

.prod-img-button:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: -3px;
}

.prod-img-placeholder {
  display: grid;
  aspect-ratio: 1 / 1;
  place-items: center;
  color: var(--txt);
  font-size: 0.8rem;
  font-weight: 800;
  opacity: 0.45;
}

.prod-hint {
  margin: 0.65rem 0 0;
  color: var(--txt);
  font-size: 0.75rem;
  text-align: center;
  opacity: 0.52;
}

.prod-info-box {
  min-width: 0;
  padding-top: clamp(0.25rem, 2vw, 1.5rem);
}

.prod-heading {
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--bd);
}

.prod-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  color: var(--txt);
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.68;
}

.availability-badge {
  padding: 0.3rem 0.6rem;
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--pri) 12%, transparent);
  color: var(--pri);
  opacity: 1;
}

.availability-badge.is-unavailable {
  background: var(--bd);
  color: var(--txt);
  opacity: 0.72;
}

.prod-title {
  margin: 0;
  color: var(--txt);
  font-size: clamp(2rem, 5vw, 4.25rem);
  line-height: 1.02;
  text-wrap: balance;
}

.merch-desc {
  max-width: 60ch;
  margin: 1.5rem 0 2rem;
  color: var(--txt);
  font-size: 1rem;
  line-height: 1.75;
  opacity: 0.72;
  white-space: pre-wrap;
  text-wrap: pretty;
}

.purchase-panel {
  padding: 1.25rem;
  border: 1px solid var(--bd);
  border-radius: 1rem;
  background: var(--card-bg);
}

.prod-price-area {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--bd);
}

.price-label {
  color: var(--txt);
  font-size: 0.75rem;
  opacity: 0.56;
}

.price {
  color: var(--pri);
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  white-space: nowrap;
}

.purchase-guidance {
  display: grid;
  gap: 0.35rem;
  padding: 1rem 0;
  color: var(--txt);
}

.purchase-guidance strong {
  font-size: 0.9rem;
}

.purchase-guidance span {
  font-size: 0.78rem;
  line-height: 1.55;
  opacity: 0.6;
}

.unavailable-notice {
  margin: 0 0 1rem;
  padding: 0.8rem;
  border-left: 3px solid var(--pri);
  background: color-mix(in srgb, var(--pri) 8%, transparent);
  color: var(--txt);
  font-size: 0.85rem;
  line-height: 1.55;
}

.prod-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.75rem;
}

.btn-buy-lg {
  min-height: var(--control-min-height);
  box-shadow: 0 4px 10px var(--pri-glow);
  display: flex;
  gap: 0.45rem;
  justify-content: center;
  align-items: center;
  transition:
    transform 180ms ease-out,
    box-shadow 180ms ease-out;
}

.btn-share {
  min-height: var(--control-min-height);
  padding: 0.75rem 1rem;
  border: 1px solid var(--bd);
  border-radius: 0.75rem;
  background: transparent;
  color: var(--txt);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 700;
  white-space: nowrap;
  transition:
    border-color 180ms ease-out,
    color 180ms ease-out;
}

.btn-buy-lg:focus-visible,
.btn-share:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

@media (hover: hover) and (pointer: fine) {
  .prod-img-button:hover {
    opacity: 0.9;
  }

  .btn-buy-lg:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 15px var(--pri-glow);
  }
  .btn-share:hover {
    border-color: var(--pri);
    color: var(--pri);
  }
}

@media (prefers-reduced-motion: reduce) {
  .loader,
  .prod-img-button,
  .btn-buy-lg,
  .btn-share {
    transition: none !important;
    animation: none !important;
  }
}

@media (max-width: 760px) {
  .merch-detail-wrapper {
    padding: 0.5rem 0.75rem 4rem;
  }

  .prod-navigation {
    margin-bottom: 0.75rem;
  }

  .prod-layout {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }

  .prod-img-box {
    border-radius: 1rem;
  }

  .prod-main-img {
    aspect-ratio: 1 / 1;
  }

  .prod-hint {
    margin-top: 0.5rem;
  }

  .prod-info-box {
    padding-top: 0;
  }

  .prod-title {
    font-size: clamp(2rem, 10vw, 3rem);
  }

  .merch-desc {
    margin: 1rem 0 1.5rem;
  }

  .prod-actions {
    grid-template-columns: 1fr;
  }
}

/* Boutique detail alignment */
.merch-detail-wrapper {
  width: min(100%, 1280px);
  padding: clamp(22px, 3vw, 44px) clamp(16px, 4vw, 56px) clamp(44px, 6vw, 72px);
}

.prod-img-box,
.prod-info-box {
  border-radius: 0;
  box-shadow: none;
}

.prod-img-box {
  border: 0;
  background: color-mix(in srgb, var(--card-bg) 92%, var(--bd));
}

.prod-main-img {
  height: auto;
  max-height: none;
}

.prod-navigation {
  margin-bottom: clamp(12px, 2vw, 20px);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bd);
}

.prod-layout {
  gap: clamp(24px, 4vw, 56px);
}

.prod-heading h1 {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.04em;
}

.availability-badge {
  border: 1px solid color-mix(in srgb, var(--pri) 32%, transparent);
  border-radius: 2px;
  background: transparent;
  white-space: nowrap;
}

.availability-badge.is-unavailable {
  border-color: var(--bd);
  background: transparent;
}

.purchase-panel {
  padding: 20px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.btn-buy-lg {
  border-radius: 3px;
  box-shadow: none;
}

.btn-share {
  border-radius: 3px;
}

.prod-navigation :deep(.nav-action-row),
.detail-state :deep(.nav-action-row) {
  margin-bottom: 0;
}

.prod-navigation :deep(.app-back-btn),
.detail-state :deep(.app-back-btn) {
  border-radius: 3px;
}

@media (hover: hover) and (pointer: fine) {
  .btn-buy-lg:hover {
    transform: none;
    box-shadow: none;
  }
}

@media (max-width: 420px) {
  .prod-sku {
    display: none;
  }

  .purchase-panel {
    padding: 16px 0;
  }

  .prod-price-area {
    align-items: start;
    flex-direction: column;
    gap: 0.5rem;
  }
}

.purchase-panel,
.prod-price-area,
.purchase-guidance {
  border-radius: 0;
  box-shadow: none;
}

.prod-info-box,
.purchase-panel {
  border-width: 1px 0;
  background-image: none;
}
</style>
