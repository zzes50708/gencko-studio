<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

const store = useMainStore()
const supabase = useSupabaseClient()

// SSR：抓取進行中的競標（給 schema 用）
const { data: ssrAuctions } = await useAsyncData('auction-list-seo-v1', async () => {
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select('id, morph, gender, start_price, buy_now_price, end_time, images, note, status')
    if (error || !data) return []
    // 過濾掉已結束的（schema 只放進行中以維持品質）
    const nowMs = Date.now()
    return data
      .filter((a) => a.end_time && new Date(a.end_time).getTime() > nowMs)
      .map((a) => ({
        id: a.id,
        morph: a.morph,
        gender: a.gender,
        start_price: a.start_price,
        buy_now_price: a.buy_now_price,
        end_time: a.end_time,
        images: a.images || [],
        note: a.note || ''
      }))
  } catch (e) {
    console.error('[auction-list SSR] fetch failed:', e?.message)
    return []
  }
})

const auctionUrl = 'https://www.genckobreeding.com/auction'
const auctionImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
const auctionSeller = {
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

const auctionItemListLd = computed(() => {
  const list = ssrAuctions.value || []
  if (!list.length) return null
  return {
    '@type': 'ItemList',
    '@id': `${auctionUrl}#list`,
    name: 'Gencko 進行中的守宮競標',
    numberOfItems: list.length,
    itemListElement: list.map((a, idx) => {
      const itemUrl = `https://www.genckobreeding.com/auction/${a.id}`
      const endIso = a.end_time ? new Date(a.end_time).toISOString() : null
      return {
        '@type': 'ListItem',
        position: idx + 1,
        url: itemUrl,
        item: {
          '@type': 'Product',
          '@id': `${itemUrl}#product`,
          name: a.morph,
          url: itemUrl,
          image: a.images && a.images.length ? getCleanUrl(a.images[0]) : auctionImg,
          sku: a.id,
          category: '寵物 > 爬蟲 > 守宮',
          description: `${a.morph}${a.gender && a.gender !== '未定' ? '（' + a.gender + '）' : ''} 線上競標進行中`,
          brand: { '@type': 'Brand', name: 'Gencko Breeding Studio' },
          offers: {
            '@type': 'Offer',
            url: itemUrl,
            priceCurrency: 'TWD',
            price: a.start_price || 0,
            availability: 'https://schema.org/LimitedAvailability',
            itemCondition: 'https://schema.org/NewCondition',
            ...(endIso ? { priceValidUntil: endIso.split('T')[0] } : {}),
            areaServed: { '@type': 'Country', name: 'Taiwan' },
            seller: auctionSeller,
            ...(a.buy_now_price
              ? {
                  priceSpecification: [
                    {
                      '@type': 'PriceSpecification',
                      name: '起標價',
                      price: a.start_price || 0,
                      priceCurrency: 'TWD'
                    },
                    {
                      '@type': 'PriceSpecification',
                      name: '直購價',
                      price: a.buy_now_price,
                      priceCurrency: 'TWD'
                    }
                  ]
                }
              : {})
          }
        }
      }
    })
  }
})

const auctionBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    { '@type': 'ListItem', position: 2, name: '守宮競標', item: auctionUrl }
  ]
}

const auctionFaqLd = {
  '@type': 'FAQPage',
  '@id': `${auctionUrl}#faq`,
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Gencko 守宮競標怎麼運作？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '每隻個體設有起標價與結標時間，會員可線上即時出價。系統會顯示目前最高出價與倒數計時。結標前 3 分鐘內若有人出價，結標時間將自動延長，避免最後一秒搶標。'
      }
    },
    {
      '@type': 'Question',
      name: '什麼是「直購價」？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '直購價（Buy Now）讓你以固定金額直接購買，不需參與競標。多數場次同時提供起標價與直購價，可依預算與心儀程度選擇。'
      }
    },
    {
      '@type': 'Question',
      name: '結標後如何取貨？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '結標後得標者會在 24 小時內收到 LINE 通知，依商品頁的「取貨注意事項」進行付款與配送（含全程錄影、48 小時健康保證等規範）。'
      }
    }
  ]
}

const auctionWebPageLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': auctionUrl,
  url: auctionUrl,
  name: 'Gencko 線上守宮競標｜限時拍賣專區',
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: auctionImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.page-title', '.morph-name']
  },
  publisher: auctionSeller,
  about: [
    {
      '@type': 'Taxon',
      name: 'Eublepharis macularius',
      alternateName: '豹紋守宮',
      sameAs: 'https://www.wikidata.org/wiki/Q185061'
    },
    {
      '@type': 'Taxon',
      name: 'Hemitheconyx caudicinctus',
      alternateName: '肥尾守宮',
      sameAs: 'https://www.wikidata.org/wiki/Q913571'
    }
  ],
  ...(auctionItemListLd.value ? { mainEntity: auctionItemListLd.value } : {}),
  hasPart: [auctionFaqLd]
}))

useHead({
  title: '線上守宮競標｜限時拍賣專區 - Gencko Breeding Studio',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Breeding Studio 線上守宮競標專區：豹紋守宮與肥尾守宮限時拍賣，含起標價、直購價、即時出價與倒數計時。結標前 3 分鐘出價自動延長，避免最後一秒搶標。'
    },
    { name: 'keywords', content: '守宮競標, 豹紋守宮拍賣, 線上拍賣, 守宮出價, Gencko Studio 競標' },
    // Open Graph
    { property: 'og:title', content: '線上守宮競標｜限時拍賣專區 - Gencko Breeding Studio' },
    {
      property: 'og:description',
      content:
        '豹紋守宮與肥尾守宮限時拍賣，含起標價、直購價、即時出價與倒數計時。結標前 3 分鐘出價自動延長。'
    },
    { property: 'og:image', content: auctionImg },
    { property: 'og:image:alt', content: 'Gencko 線上守宮競標' },
    { property: 'og:url', content: auctionUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '線上守宮競標｜限時拍賣專區' },
    {
      name: 'twitter:description',
      content: '豹紋守宮與肥尾守宮限時拍賣，含起標價、直購價與即時出價。'
    },
    { name: 'twitter:image', content: auctionImg }
  ],
  link: [{ rel: 'canonical', href: auctionUrl }],
  script: computed(() => [
    { type: 'application/ld+json', innerHTML: JSON.stringify(auctionWebPageLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(auctionBreadcrumbLd) }
  ])
})

const loading = computed(() => store.loading)
const displayAuctions = computed(() => store.auctionList || [])

const now = ref(new Date().getTime())
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date().getTime()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const getAuctionStatus = (item) => {
  if (!item) return { status: 'unknown', text: '未知', class: '' }
  if (now.value >= new Date(item.end_time).getTime())
    return { status: 'ended', text: '已結標', class: 'badge-ended' }
  return { status: 'active', text: '競標中', class: 'badge-active' }
}

const isEndingSoon = (item) => {
  if (!item) return false
  const diff = new Date(item.end_time).getTime() - now.value
  return diff > 0 && diff <= 180000 // 3 分鐘內
}

const getCountdownText = (item) => {
  if (!item) return ''
  const diff = new Date(item.end_time).getTime() - now.value
  if (diff <= 0) return '已結束'
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const m = Math.floor((diff / 1000 / 60) % 60)
  const s = Math.floor((diff / 1000) % 60)
  let res = ''
  if (d > 0) res += `${d}天 `
  res += `${h.toString().padStart(2, '0')}時 ${m.toString().padStart(2, '0')}分 ${s.toString().padStart(2, '0')}秒`
  return res
}

const formatPrice = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback
  const amount = Number(value)
  if (!Number.isFinite(amount)) return fallback
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}
</script>

<template>
  <div class="auction-page">
    <div class="common-document-meta" aria-label="競標目錄說明">
      <span>GENCKO AUCTION DESK</span>
      <span>WATCH / BID / REVIEW</span>
    </div>
    <TheBackButton wrapper-class="m-only" fallback="/" text="返回" />

    <div class="auction-container">
      <header class="auction-intro">
        <div>
          <p class="auction-eyebrow">LIVE AUCTIONS</p>
          <h1 class="auction-mobile-heading"><span>線上競標</span></h1>
        </div>
        <p class="auction-mobile-desc">限時競標，結標前 3 分鐘出價自動延長。</p>
      </header>

      <section class="auction-catalog-stage" aria-labelledby="auction-live-catalog-title">
        <header class="auction-stage-heading">
          <span>01</span>
          <div>
            <p>LIVE AUCTION RECORDS</p>
            <h2 id="auction-live-catalog-title">目前可參與的競標</h2>
          </div>
        </header>
        <div v-if="loading && displayAuctions.length === 0" class="auction-grid" aria-busy="true">
          <div v-for="n in 6" :key="n" class="auction-card auction-card--loading">
            <SkeletonCard :square="true" />
          </div>
        </div>

        <div v-else-if="displayAuctions.length" class="auction-grid">
          <NuxtLink
            v-for="item in displayAuctions"
            :key="item.id"
            no-prefetch
            :to="`/auction/${item.id}`"
            class="auction-card"
            :aria-label="`查看 ${item.morph} 競標詳情`"
          >
            <div class="card-img-box">
              <img
                :src="
                  item.images && item.images.length
                    ? getCleanUrl(item.images[0], 400)
                    : 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/placeholder.jpg'
                "
                :alt="item.morph"
                loading="lazy"
                decoding="async"
              />
              <ClientOnly>
                <div
                  class="status-badge"
                  role="status"
                  :aria-label="`競標狀態：${getAuctionStatus(item).text}`"
                  :class="getAuctionStatus(item).class"
                >
                  {{ getAuctionStatus(item).text }}
                </div>
                <template #fallback>
                  <div class="status-badge badge-active" role="status">計算中</div>
                </template>
              </ClientOnly>
            </div>
            <div class="card-info">
              <h3 class="morph-name">
                {{ item.morph }}
                <span class="gender-tag" v-if="item.gender && item.gender !== '未定'">
                  ({{ item.gender }})
                </span>
              </h3>
              <p class="morph-desc" v-if="item.note">
                {{ item.note.substring(0, 20) }}{{ item.note.length > 20 ? '...' : '' }}
              </p>
              <div class="price-info">
                <div class="price-col">
                  <span class="price-label">起標價</span>
                  <strong class="price-val">{{ formatPrice(item.start_price, '尚未設定') }}</strong>
                </div>
                <div class="price-divider"></div>
                <div class="price-col">
                  <span class="price-label">直購價</span>
                  <strong class="price-val">
                    {{ formatPrice(item.buy_now_price, '未提供直購') }}
                  </strong>
                </div>
              </div>

              <ClientOnly>
                <div
                  class="countdown"
                  role="timer"
                  aria-label="競標剩餘時間"
                  :class="{ 'ending-soon': isEndingSoon(item) }"
                >
                  <span>剩餘</span>
                  <strong>{{ getCountdownText(item) }}</strong>
                </div>
                <template #fallback>
                  <div class="countdown" role="timer" aria-label="競標剩餘時間">
                    <span>剩餘</span>
                    <strong>時間計算中</strong>
                  </div>
                </template>
              </ClientOnly>
            </div>
          </NuxtLink>
        </div>

        <div v-else class="empty-state">
          <p class="empty-state__eyebrow">NO LIVE AUCTIONS</p>
          <h3>目前沒有進行中的競標</h3>
          <p>新場次開放後會在此顯示；你可以先瀏覽目前在售的守宮個體。</p>
          <NuxtLink no-prefetch to="/shop" class="btn-app btn-app--primary btn-app--md">
            瀏覽在售個體
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.auction-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  color: var(--txt);
}

.dt-only {
  display: block;
}
.m-only {
  display: none !important;
}

.page-title {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: baseline;
  gap: 1rem;
  color: var(--txt);
}
.page-title span {
  font-size: 1rem;
  color: var(--txt);
  opacity: 0.5;
}
.page-desc {
  color: var(--txt);
  opacity: 0.7;
  margin-bottom: 2rem;
}

.auction-mobile-heading,
.auction-mobile-desc {
  display: none !important;
}
.auction-mobile-heading {
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.75rem 0 0.25rem;
  color: var(--txt);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.02em;
}
.auction-mobile-heading small {
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.5;
}
.auction-mobile-desc {
  color: var(--txt);
  opacity: 0.65;
  margin: 0 0 1rem;
  font-size: 0.8rem;
}

.auction-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.auction-catalog-stage {
  margin-top: clamp(28px, 5vw, 56px);
  padding-top: 20px;
  border-top: 1px solid var(--bd);
}

.auction-stage-heading {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-bottom: 22px;
}

.auction-stage-heading > span {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 28px;
  border: 1px solid var(--pri);
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.auction-stage-heading p {
  margin: 0 0 4px;
  color: var(--txt-muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.auction-stage-heading h2 {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  letter-spacing: -0.04em;
}
.auction-card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}
.auction-card:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

.card-img-box {
  width: 100%;
  aspect-ratio: 4 / 3;
  background-color: var(--card-bg);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--bd);
}
.card-img-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.status-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #fff;
  z-index: 10;
  width: max-content;
  white-space: nowrap;
  line-height: 1.2;
}
.badge-active {
  background: var(--pri);
  box-shadow: 0 0 10px rgba(255, 69, 0, 0.5);
}
.badge-ended {
  background: #666;
}

.card-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}
.morph-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: var(--txt);
  line-height: 1.3;
}
.gender-tag {
  font-size: 0.9rem;
  color: var(--txt);
  opacity: 0.6;
}
.morph-desc {
  color: var(--txt);
  opacity: 0.7;
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.price-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  background: var(--card-bg);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--bd);
}
.price-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}
.price-col:last-child {
  align-items: flex-end;
}
.price-label {
  font-size: 0.75rem;
  color: var(--txt);
  opacity: 0.6;
  margin-bottom: 2px;
}
.price-val {
  font-size: 1.1rem;
  color: var(--pri);
  font-weight: bold;
}
.price-divider {
  width: 1px;
  height: 25px;
  background: var(--bd);
  margin: 0 10px;
}

.countdown {
  margin-top: auto;
  font-weight: bold;
  color: var(--txt);
  text-align: center;
  padding: 8px;
  border-radius: 6px;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  font-size: 0.95rem;
}
.countdown.ending-soon {
  color: #fff;
  background: #e74c3c;
  border-color: #c0392b;
  animation: pulse 1.5s infinite;
}
.empty-state {
  text-align: center;
  padding: 3rem;
  color: var(--txt);
  opacity: 0.6;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }
  .m-only {
    display: flex !important;
  }

  .auction-page {
    padding: 5px 10px 15px 10px;
  }
  .auction-mobile-heading {
    display: flex !important;
  }
  .auction-mobile-desc {
    display: block !important;
  }
  .auction-grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }
  .auction-card {
    border-radius: 8px;
  }
  .card-img-box {
    aspect-ratio: 1 / 1;
  }
  .card-info {
    padding: 6px 8px;
  }
  .status-badge {
    padding: 2px 6px;
    font-size: 0.65rem;
    top: 4px;
    left: 4px;
  }
  .morph-name {
    font-size: 0.85rem;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .gender-tag {
    font-size: 0.75rem;
  }
  .morph-desc {
    display: none;
  }

  .price-info {
    padding: 4px 6px;
    margin-bottom: 6px;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .price-divider {
    display: none;
  }
  .price-col,
  .price-col:last-child {
    align-items: flex-start;
    width: 100%;
  }
  .price-label {
    font-size: 0.65rem;
  }
  .price-val {
    font-size: 0.95rem;
  }

  .countdown {
    padding: 4px;
    font-size: 0.75rem;
  }
}

@media (hover: hover) and (pointer: fine) {
  .auction-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    border-color: var(--pri);
  }
}

@media (prefers-reduced-motion: reduce) {
  .auction-card {
    transition: none;
  }
  .countdown.ending-soon {
    animation: none;
  }
}

.auction-page {
  max-width: 1440px;
  padding: clamp(38px, 6vw, 88px) clamp(20px, 5vw, 76px) 100px;
}

.auction-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 460px);
  align-items: end;
  gap: 40px;
  margin-bottom: 36px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--bd);
}

.auction-eyebrow {
  margin: 0 0 12px;
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.auction-mobile-heading {
  display: block !important;
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(2.7rem, 6vw, 5.8rem);
  line-height: 0.96;
  letter-spacing: -0.06em;
}

.auction-mobile-desc {
  display: block !important;
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.94rem;
  line-height: 1.9;
  opacity: 1;
}

.auction-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(24px, 3vw, 44px) clamp(14px, 2vw, 28px);
}

.auction-card {
  border: 0;
  border-radius: 0;
  background: transparent;
}

.card-img-box {
  aspect-ratio: 1 / 1;
  border: 0;
  border-radius: 0;
}

.card-info {
  padding: 14px 0 0;
}

.morph-name {
  font-family: 'Noto Serif TC', serif;
}

.price-info,
.countdown {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

@media (hover: hover) and (pointer: fine) {
  .auction-card:hover {
    transform: none;
    border-color: transparent;
    box-shadow: none;
  }

  .auction-card:hover .card-img-box img {
    opacity: 0.92;
  }
}

@media (max-width: 768px) {
  .auction-page {
    padding: 16px 16px 48px;
  }

  .auction-intro {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 22px;
    padding-bottom: 22px;
  }

  .auction-mobile-heading {
    margin: 0;
    font-size: clamp(2.5rem, 14vw, 4rem);
  }

  .auction-mobile-desc {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.7;
  }

  .auction-grid {
    gap: 28px 10px !important;
  }
}

/* 頁面驗收：與選購鏈共用白底、品牌橘、細線及直角語彙。 */
.auction-page {
  padding-top: clamp(18px, 2.5vw, 34px);
  padding-bottom: clamp(44px, 6vw, 72px);
}

.auction-page > .common-document-meta {
  margin-bottom: clamp(12px, 2vw, 20px);
  padding-bottom: 8px;
}

.auction-page :deep(.app-back-btn) {
  border-radius: var(--radius-sm);
}

.auction-intro {
  gap: clamp(20px, 4vw, 40px);
  margin-bottom: 0;
  padding-bottom: clamp(18px, 2.4vw, 28px);
}

.auction-catalog-stage {
  margin-top: 0;
  padding-top: clamp(16px, 2.5vw, 24px);
  border-top: 0;
}

.auction-stage-heading {
  margin-bottom: clamp(16px, 2.5vw, 24px);
}

.auction-card {
  color: inherit;
  text-decoration: none;
}

.auction-card--loading {
  pointer-events: none;
}

.status-badge {
  top: 8px;
  left: 8px;
  padding: 5px 9px;
  border: 1px solid currentColor;
  border-radius: 0;
  box-shadow: none;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.badge-active {
  color: #fff;
  background: var(--pri);
  box-shadow: none;
}

.badge-ended {
  color: #fff;
  background: #595959;
}

.morph-name {
  min-width: 0;
  margin-bottom: 6px;
  font-size: clamp(1.05rem, 1.7vw, 1.3rem);
  line-height: 1.35;
}

.morph-desc {
  margin: 0 0 12px;
  color: var(--txt-muted);
  opacity: 1;
}

.price-info {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
  margin: auto 0 8px;
  padding: 10px 0;
  border-width: 1px 0;
}

.price-col,
.price-col:last-child {
  min-width: 0;
  align-items: flex-start;
}

.price-label {
  margin-bottom: 3px;
  color: var(--txt-muted);
  opacity: 1;
}

.price-val {
  max-width: 100%;
  color: var(--pri);
  font-size: clamp(0.95rem, 1.5vw, 1.12rem);
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.price-divider {
  width: 1px;
  height: auto;
  margin: 0;
}

.countdown {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-width: 0 0 1px;
  color: var(--txt);
  text-align: left;
  font-size: 0.78rem;
  font-weight: 700;
}

.countdown span {
  flex: 0 0 auto;
  color: var(--txt-muted);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.countdown strong {
  min-width: 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.countdown.ending-soon {
  color: #b42318;
  background: transparent;
  border-color: #b42318;
  animation: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 0;
  padding: clamp(30px, 5vw, 56px) 0 0;
  border-top: 1px solid var(--bd);
  color: var(--txt);
  text-align: left;
  opacity: 1;
}

.empty-state__eyebrow {
  margin: 0 0 8px;
  color: var(--pri);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.empty-state h3 {
  margin: 0;
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1.45rem, 3vw, 2.2rem);
  line-height: 1.35;
}

.empty-state > p:not(.empty-state__eyebrow) {
  max-width: 580px;
  margin: 10px 0 18px;
  color: var(--txt-muted);
  line-height: 1.75;
}

.empty-state .btn-app {
  border-radius: var(--radius-sm);
}

@media (max-width: 768px) {
  .auction-page {
    padding-top: 10px;
    padding-bottom: 44px;
  }

  .auction-page > .common-document-meta {
    margin-bottom: 8px;
  }

  .auction-intro {
    gap: 10px;
    margin-bottom: 0;
    padding-bottom: 16px;
  }

  .auction-catalog-stage {
    padding-top: 14px;
  }

  .auction-stage-heading {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    margin-bottom: 14px;
  }

  .auction-stage-heading > span {
    width: 30px;
    height: 26px;
  }

  .status-badge {
    top: 5px;
    left: 5px;
    padding: 3px 5px;
    border-radius: 0;
  }

  .card-info {
    padding: 9px 0 0;
  }

  .morph-name {
    margin-bottom: 4px;
    font-size: 0.9rem;
  }

  .price-info {
    grid-template-columns: 1fr;
    gap: 6px;
    padding: 8px 0;
  }

  .price-divider {
    display: none;
  }

  .price-val {
    font-size: 0.88rem;
    overflow-wrap: normal;
    white-space: nowrap;
  }

  .countdown {
    display: block;
    padding: 7px 0;
    font-size: 0.7rem;
  }

  .countdown span {
    display: block;
    margin-bottom: 2px;
  }

  .countdown strong {
    display: block;
    text-align: left;
    white-space: nowrap;
  }

  .empty-state {
    padding-top: 28px;
  }

  .empty-state .btn-app {
    width: 100%;
  }
}
</style>
