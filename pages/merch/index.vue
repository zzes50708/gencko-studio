<script setup>
import { computed } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

const store = useMainStore()
const supabase = useSupabaseClient()

// SSR：抓取所有周邊商品（給 schema 用）
const { data: ssrMerch } = await useAsyncData('merch-list-seo-v1', async () => {
  try {
    const { data, error } = await supabase
      .from('merchandise')
      .select('item_id, name, description, price, image_url, category, available')
    if (error || !data) return []
    return data.map((m) => ({
      ItemID: m.item_id,
      Name: m.name,
      Description: m.description,
      Price: m.price,
      ImageURL: m.image_url,
      Category: m.category,
      Available: m.available
    }))
  } catch (e) {
    console.error('[merch-list SSR] fetch failed:', e?.message)
    return []
  }
})

const merchList = computed(() => {
  const csr = store.merchList || []
  return csr.length ? csr : ssrMerch.value || []
})

const availableCount = computed(
  () => merchList.value.filter((item) => item.Available !== 'No').length
)

// 解析 "299 起" 等字串為純數字
const parsePrice = (val) => {
  if (val == null) return null
  const m = String(val).match(/\d+(\.\d+)?/)
  return m ? m[0] : null
}

const formatMerchPrice = (value) => {
  if (value == null || String(value).trim() === '') return '價格請洽'

  const raw = String(value).trim()
  const match = raw.match(/\d+(?:\.\d+)?/)
  if (!match) return `NT$ ${raw}`

  const formatted = Number(match[0]).toLocaleString('zh-TW')
  return `NT$ ${raw.replace(match[0], formatted)}`
}

const merchUrl = 'https://www.genckobreeding.com/merch'
const merchImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
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

const merchItemListLd = computed(() => {
  const list = merchList.value
  if (!list.length) return null
  return {
    '@type': 'ItemList',
    '@id': `${merchUrl}#list`,
    name: 'Gencko 守宮 / 爬蟲周邊商品列表',
    numberOfItems: list.length,
    itemListElement: list.map((m, idx) => {
      const itemUrl = `${merchUrl}/${m.ItemID}`
      const img = m.ImageURL ? getCleanUrl(m.ImageURL) : merchImg
      const price = parsePrice(m.Price)
      const isRange = /起|~|-/.test(String(m.Price ?? ''))
      const cat = m.Category || '周邊商品'
      const isAvailable = m.Available !== 'No'
      const offer = {
        '@type': 'Offer',
        url: itemUrl,
        priceCurrency: 'TWD',
        availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        areaServed: { '@type': 'Country', name: 'Taiwan' },
        seller: merchSeller
      }
      if (price) {
        offer.price = price
        if (isRange) {
          offer.priceSpecification = {
            '@type': 'PriceSpecification',
            priceCurrency: 'TWD',
            minPrice: Number(price)
          }
        }
      }
      return {
        '@type': 'ListItem',
        position: idx + 1,
        url: itemUrl,
        item: {
          '@type': 'Product',
          '@id': `${itemUrl}#product`,
          name: m.Name,
          url: itemUrl,
          image: img,
          sku: String(m.ItemID),
          category: `寵物用品 > ${cat}`,
          description: m.Description || `Gencko 周邊商品：${m.Name}`,
          brand: { '@type': 'Brand', name: 'Gencko Breeding Studio' },
          offers: offer
        }
      }
    })
  }
})

const merchBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    { '@type': 'ListItem', position: 2, name: '周邊商品', item: merchUrl }
  ]
}

const merchWebPageLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': merchUrl,
  url: merchUrl,
  name: 'Gencko 守宮周邊商品｜飼養器材、餌料、躲避屋',
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: merchImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.page-title', '.morph-title']
  },
  publisher: merchSeller,
  ...(merchItemListLd.value ? { mainEntity: merchItemListLd.value } : {})
}))

useHead({
  title: '守宮周邊商品｜飼養器材、餌料、躲避屋、營養品 - Gencko Breeding Studio',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Breeding Studio 精選守宮與爬蟲飼養周邊商品：飼養箱、加熱墊、躲避屋、餌料（杜比亞、麵包蟲）、鈣粉與綜合維生素，提供最適合豹紋守宮與肥尾守宮的專業器材。'
    },
    {
      name: 'keywords',
      content: '守宮周邊, 守宮飼養器材, 杜比亞, 加熱墊, 躲避屋, 鈣粉, 守宮營養品'
    },
    // Open Graph
    {
      property: 'og:title',
      content: '守宮周邊商品｜飼養器材、餌料、躲避屋 - Gencko Breeding Studio'
    },
    {
      property: 'og:description',
      content: '精選守宮飼養周邊：飼養箱、加熱墊、躲避屋、餌料、鈣粉與營養品。'
    },
    { property: 'og:image', content: merchImg },
    { property: 'og:image:alt', content: 'Gencko 守宮周邊商品' },
    { property: 'og:url', content: merchUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '守宮周邊商品｜飼養器材、餌料、躲避屋' },
    {
      name: 'twitter:description',
      content: '精選守宮飼養周邊：飼養箱、加熱墊、躲避屋、餌料、鈣粉與營養品。'
    },
    { name: 'twitter:image', content: merchImg }
  ],
  link: [{ rel: 'canonical', href: merchUrl }],
  script: computed(() => [
    { type: 'application/ld+json', innerHTML: JSON.stringify(merchWebPageLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(merchBreadcrumbLd) }
  ])
})
</script>

<template>
  <main class="merch-page-wrapper" data-phase3-surface="merch-index">
    <div class="common-document-meta" aria-label="周邊目錄說明">
      <span>GENCKO GOODS INDEX</span>
      <span>VIEW / REVIEW / ORDER</span>
    </div>
    <header class="merch-intro">
      <div>
        <p class="merch-eyebrow">Gencko supply archive</p>
        <h1 class="page-title">飼養用品與品牌周邊</h1>
        <p class="merch-lead">
          從日常照護到飼養環境，依目前供應狀態挑選適合的用品。商品規格與交付方式以購買前確認為準。
        </p>
      </div>
      <dl class="merch-summary" aria-label="商品供應摘要">
        <div>
          <dt>館藏</dt>
          <dd>目前共 {{ merchList.length }} 項</dd>
        </div>
        <div>
          <dt>供應中</dt>
          <dd>{{ availableCount }} 項</dd>
        </div>
      </dl>
    </header>

    <section class="merch-collection" role="region" aria-label="周邊商品清單">
      <div v-if="store.loading && merchList.length === 0" class="merch-grid" aria-busy="true">
        <span class="sr-only" role="status">正在載入周邊商品</span>
        <SkeletonCard v-for="n in 8" :key="n" square />
      </div>

      <div v-else-if="merchList.length === 0" class="merch-empty">
        <p class="merch-empty__index" aria-hidden="true">00</p>
        <h2>目前沒有可瀏覽的周邊商品</h2>
        <p>你仍可先查看在售個體，或稍後回來確認最新用品。</p>
        <NuxtLink no-prefetch to="/shop" class="btn-app btn-app--primary btn-app--md">
          前往選購守宮
        </NuxtLink>
      </div>

      <div v-else class="merch-grid">
        <article v-for="(m, index) in merchList" :key="m.ItemID" class="merch-card">
          <NuxtLink
            no-prefetch
            :to="`/merch/${m.ItemID}`"
            class="merch-card__link"
            :aria-label="`查看 ${m.Name} 商品詳情`"
          >
            <div class="merch-card__media">
              <img
                v-if="m.ImageURL"
                :src="getCleanUrl(m.ImageURL)"
                :alt="m.Name"
                class="card-img"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="card-img merch-card__placeholder" aria-hidden="true">用品</div>
              <span class="merch-card__number" aria-hidden="true">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
            </div>
            <div class="card-body merch-card__body">
              <div class="merch-card__meta">
                <span>{{ m.Category || '周邊商品' }}</span>
                <span
                  class="availability-badge"
                  :class="{ 'is-unavailable': m.Available === 'No' }"
                >
                  {{ m.Available === 'No' ? '暫停供應' : '供應中' }}
                </span>
              </div>
              <h2 class="morph-title">{{ m.Name }}</h2>
              <p v-if="m.Description" class="merch-card__description">{{ m.Description }}</p>
              <div class="merch-card__footer">
                <span class="price">{{ formatMerchPrice(m.Price) }}</span>
                <span class="merch-card__cta" aria-hidden="true">查看詳情 →</span>
              </div>
            </div>
          </NuxtLink>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.merch-page-wrapper {
  width: min(100%, 1240px);
  margin: 0 auto;
  padding: 1rem 1.25rem 5rem;
}

.merch-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3rem;
  align-items: end;
  padding: clamp(1.5rem, 4vw, 4rem) 0 clamp(2rem, 4vw, 3.5rem);
  border-bottom: 1px solid var(--bd);
}

.merch-eyebrow {
  margin: 0 0 0.75rem;
  color: var(--pri);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.page-title {
  max-width: 14ch;
  margin: 0;
  font-size: clamp(2.35rem, 6vw, 5.5rem);
  line-height: 0.98;
  text-wrap: balance;
}

.merch-lead {
  max-width: 60ch;
  margin: 1.25rem 0 0;
  color: var(--txt);
  font-size: clamp(0.95rem, 1.5vw, 1.1rem);
  line-height: 1.75;
  opacity: 0.72;
  text-wrap: pretty;
}

.merch-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(7rem, 1fr));
  margin: 0;
  border: 1px solid var(--bd);
  border-radius: 1rem;
  background: var(--card-bg);
  overflow: hidden;
}

.merch-summary > div {
  padding: 1rem 1.25rem;
}

.merch-summary > div + div {
  border-left: 1px solid var(--bd);
}

.merch-summary dt {
  margin-bottom: 0.3rem;
  color: var(--txt);
  font-size: 0.72rem;
  opacity: 0.55;
}

.merch-summary dd {
  margin: 0;
  color: var(--txt);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.merch-collection {
  padding-top: 2rem;
}

.merch-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(1rem, 2vw, 1.75rem);
}

.merch-card {
  min-width: 0;
}

.merch-card__link {
  display: flex;
  min-height: 100%;
  flex-direction: column;
  overflow: hidden;
  color: inherit;
  text-decoration: none;
  border: 1px solid var(--bd);
  border-radius: 1.25rem;
  background: var(--card-bg);
  transition:
    transform 180ms ease-out,
    border-color 180ms ease-out,
    box-shadow 180ms ease-out;
}

.merch-card__link:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

.merch-card__media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1 / 1;
  background: var(--bd);
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.merch-card__placeholder {
  display: grid;
  place-items: center;
  color: var(--txt);
  font-size: 1rem;
  font-weight: 800;
  opacity: 0.45;
}

.merch-card__number {
  position: absolute;
  right: 0.75rem;
  bottom: 0.65rem;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
}

.merch-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.15rem;
}

.merch-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
  color: var(--txt);
  font-size: 0.72rem;
  opacity: 0.72;
}

.availability-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--pri) 12%, transparent);
  color: var(--pri);
  font-weight: 800;
  opacity: 1;
}

.availability-badge.is-unavailable {
  background: var(--bd);
  color: var(--txt);
  opacity: 0.62;
}

.morph-title {
  margin: 0;
  color: var(--txt);
  font-size: clamp(1.05rem, 2vw, 1.25rem);
  font-weight: 850;
  line-height: 1.25;
  text-wrap: balance;
}

.merch-card__description {
  display: -webkit-box;
  margin: 0.7rem 0 1.25rem;
  overflow: hidden;
  color: var(--txt);
  font-size: 0.88rem;
  line-height: 1.6;
  opacity: 0.66;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.merch-card__footer {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--bd);
}

.price {
  color: var(--pri);
  font-size: 1.2rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.merch-card__cta {
  color: var(--txt);
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.58;
}

.merch-empty {
  display: grid;
  justify-items: start;
  max-width: 38rem;
  padding: clamp(2rem, 8vw, 5rem) 0;
}

.merch-empty__index {
  margin: 0 0 1rem;
  color: var(--pri);
  font-size: 3rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.merch-empty h2 {
  margin: 0;
  color: var(--txt);
  font-size: clamp(1.6rem, 4vw, 2.4rem);
  text-wrap: balance;
}

.merch-empty p:not(.merch-empty__index) {
  margin: 0.8rem 0 1.5rem;
  color: var(--txt);
  line-height: 1.7;
  opacity: 0.68;
}

@media (hover: hover) and (pointer: fine) {
  .merch-card__link:hover {
    transform: translateY(-3px);
    border-color: var(--bd-hover);
    box-shadow: 0 16px 32px rgba(30, 24, 20, 0.1);
  }
}

@media (max-width: 900px) {
  .merch-page-wrapper {
    padding-inline: 1rem;
  }

  .merch-intro {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .merch-summary {
    width: 100%;
  }

  .merch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 540px) {
  .merch-page-wrapper {
    padding-inline: 0.75rem;
  }

  .merch-intro {
    padding-top: 0.75rem;
  }

  .page-title {
    font-size: clamp(2.25rem, 12vw, 3.4rem);
  }

  .merch-summary > div {
    padding: 0.85rem;
  }

  .merch-grid {
    grid-template-columns: 1fr;
  }

  .merch-card__media {
    aspect-ratio: 1 / 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .merch-card__link {
    transition: none !important;
  }

  .merch-card__link:hover {
    transform: none;
  }
}

/* Boutique catalog alignment */
.merch-page-wrapper {
  width: min(100%, 1440px);
  padding: clamp(22px, 3vw, 44px) clamp(20px, 5vw, 76px) clamp(44px, 6vw, 72px);
}

.merch-intro {
  gap: clamp(24px, 4vw, 48px);
  padding: 0 0 clamp(28px, 4vw, 48px);
}

.merch-eyebrow {
  letter-spacing: 0.18em;
}

.page-title {
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(2.6rem, 5vw, 4.75rem);
  font-weight: 700;
  letter-spacing: -0.06em;
}

.merch-summary {
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}

.merch-card__link {
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.merch-card__media {
  border-radius: 0;
}

.merch-card__body {
  min-height: 190px;
  padding: 14px 0 0;
}

.availability-badge {
  border: 1px solid color-mix(in srgb, var(--pri) 32%, transparent);
  border-radius: 2px;
  white-space: nowrap;
}

@media (hover: hover) and (pointer: fine) {
  .merch-card__link:hover {
    transform: none;
    border-color: transparent;
    box-shadow: none;
  }

  .merch-card__link:hover .card-img {
    opacity: 0.92;
  }
}

@media (max-width: 540px) {
  .merch-page-wrapper {
    padding: 20px 16px 52px;
  }

  .merch-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 28px 10px;
  }

  .merch-card__description {
    display: none;
  }

  .merch-card__body {
    min-height: 116px;
    padding-top: 10px;
  }

  .merch-card__meta {
    gap: 0.4rem;
    margin-bottom: 0.55rem;
    font-size: 0.66rem;
  }

  .morph-title {
    font-size: 0.9rem;
  }

  .merch-card__footer {
    gap: 0.35rem;
    padding-top: 0.7rem;
  }

  .price {
    font-size: 0.82rem;
  }

  .merch-card__cta {
    display: inline;
    font-size: 0.68rem;
    white-space: nowrap;
  }
}
</style>
