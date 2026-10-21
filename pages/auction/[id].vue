<script setup>
import { computed, ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient, useState, setResponseStatus } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'
import { serializeJsonLd } from '~/utils/structured-data'
import {
  auctionState,
  auctionCountdown,
  hasBuyNowPrice,
  readAuctionBids
} from '~/utils/auction-presentation'
import {
  MAX_BID_AMOUNT,
  validBidAmount,
  validBidReceipt,
  restoreBidIntent,
  auctionBidIncrement,
  auctionMinimumBid
} from '~/utils/auction-bid-contract'
import {
  auctionPhotos,
  auctionShareDetails,
  sampleAuctionClock,
  auctionClockNow
} from '~/utils/auction-detail'
import { isAuctionMember, canPlaceAuctionBid, memberOwnerKeys } from '~/utils/member-auth'
import { loadPromoImage } from '~/utils/auction-promo'
import { getLineMessageLink } from '~/utils/animal-inquiry'

definePageMeta({ key: (route) => route.fullPath })

const route = useRoute()
const store = useMainStore()
const supabase = useSupabaseClient()
const auctionId = route.params.id
const lineContactVerified = ref(false)
watch(
  () => store.currentUser?.id,
  () => {
    lineContactVerified.value = false
  }
)

//[SEO] 為了在伺服器端渲染 (SSR) 期間就能拿到該商品資料以產生正確的 Meta
const {
  data: currentAuction,
  pending,
  error: auctionLoadError,
  refresh: retryAuction
} = await useAsyncData(`auction-${auctionId}`, async () => {
  if (store.auctionList && store.auctionList.length > 0) {
    const found = store.auctionList.find((a) => a.id === auctionId)
    if (found) return found
  }

  const { data, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return data
})

// SSR 直接讀取最高一筆公開出價，分享預覽不依賴瀏覽器再補讀。
const { data: initialBid, error: initialBidError } = await useAsyncData(
  `auction-highest-${auctionId}`,
  async () => {
    if (!currentAuction.value) return []
    const { data, error } = await supabase
      .from('auction_bids')
      .select('id, auction_id, user_name, amount, bid_time')
      .eq('auction_id', auctionId)
      .order('amount', { ascending: false })
      .limit(1)
    if (error) throw error
    return data || []
  }
)
if (import.meta.server)
  setResponseStatus(auctionLoadError.value ? 503 : currentAuction.value ? 200 : 404)
const photos = computed(() => auctionPhotos(currentAuction.value?.images))
const photoIndex = ref(0)
const photoEl = ref(null)
const photoRetry = ref(0)
const selectedPhoto = computed(() => photos.value[photoIndex.value] || '')
const photoUrl = computed(() =>
  selectedPhoto.value.startsWith('/') ? selectedPhoto.value : getCleanUrl(selectedPhoto.value)
)
const checkPhoto = () => {
  const image = photoEl.value
  if (image?.complete && !image.naturalWidth) photoFailed.value = true
}
const selectPhoto = async (index) => {
  photoIndex.value = index
  photoFailed.value = false
  await nextTick()
  checkPhoto()
}
const retryPhoto = async () => {
  photoFailed.value = false
  photoRetry.value++
  await nextTick()
  checkPhoto()
}
const photoTouch = ref(null)
const photoTouchStart = (event) => {
  if (event.touches.length !== 1) {
    photoTouch.value = null
    return
  }
  photoTouch.value = { x: event.touches[0].clientX, y: event.touches[0].clientY }
}
let photoSwipeUntil = 0
const photoTouchEnd = (event) => {
  const start = photoTouch.value
  photoTouch.value = null
  if (!start || !event.changedTouches[0] || photos.value.length < 2) return
  const dx = event.changedTouches[0].clientX - start.x
  const dy = event.changedTouches[0].clientY - start.y
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    photoSwipeUntil = performance.now() + 500
    void selectPhoto(
      (photoIndex.value + (dx < 0 ? 1 : -1) + photos.value.length) % photos.value.length
    )
  }
}
const openPhoto = () => {
  if (!selectedPhoto.value || photoFailed.value || performance.now() < photoSwipeUntil) return
  store.openLightbox({ ImageURL: selectedPhoto.value, Morph: currentAuction.value.morph })
}
watch(
  () => JSON.stringify(photos.value),
  () => {
    photoIndex.value = 0
    photoFailed.value = false
    void nextTick(checkPhoto)
  }
)
const realBids = ref([])
const photoFailed = ref(false)
let bidsRefreshTimer = null
let auctionChannel = null

const isPlacingBid = ref(false)
const bidsReady = ref(false)

const currentBids = computed(() => {
  return [...realBids.value].sort((a, b) => b.amount - a.amount)
})

const highestBidAmount = computed(() => {
  if (currentBids.value.length === 0)
    return (
      (!bidsReady.value ? initialBid.value?.[0]?.amount : null) ??
      currentAuction.value?.start_price ??
      0
    )
  return currentBids.value[0].amount
})

const bidIncrement = computed(() => auctionBidIncrement(currentAuction.value?.min_increment))
const minNextBid = computed(() => {
  if (!currentAuction.value) return 0
  const hasBids = currentBids.value.length > 0 || (!bidsReady.value && initialBid.value?.length > 0)
  return auctionMinimumBid(
    currentAuction.value.start_price,
    hasBids ? highestBidAmount.value : null,
    bidIncrement.value
  )
})

const myBidAmount = ref(0)
const bidAmountTouched = ref(false)
const needsLogin = ref(false)
const pendingBid = ref(null)
const bidNotice = ref('')
const requestStorageKey = () =>
  `auction-bid-request:${auctionId}:${encodeURIComponent(pendingBid.value?.owner || memberOwnerKeys(store.currentUser)[0] || '')}`
const persistPendingBid = () => {
  try {
    if (pendingBid.value)
      sessionStorage.setItem(requestStorageKey(), JSON.stringify(pendingBid.value))
    else sessionStorage.removeItem(requestStorageKey())
  } catch {
    /* 儲存空間受限時仍可在目前頁面安全重試。 */
  }
}
const clearPendingBid = (
  intent = pendingBid.value,
  owners = memberOwnerKeys(store.currentUser)
) => {
  try {
    // 同一會員可能有舊版 email 與新版會員編號暫存，確認後必須一起清除。
    const aliases = owners.includes(intent?.owner) ? owners : []
    for (const owner of new Set([intent?.owner, ...aliases].filter(Boolean)))
      sessionStorage.removeItem(`auction-bid-request:${auctionId}:${encodeURIComponent(owner)}`)
  } catch {
    /* 不影響本頁狀態清理。 */
  }
  if (pendingBid.value?.requestId === intent?.requestId) pendingBid.value = null
}
const restorePendingBid = () => {
  if (!import.meta.client || pendingBid.value || !canPlaceAuctionBid(store.currentUser)) return
  try {
    const saved = memberOwnerKeys(store.currentUser)
      .map((owner) => {
        try {
          return restoreBidIntent(
            sessionStorage.getItem(`auction-bid-request:${auctionId}:${encodeURIComponent(owner)}`),
            auctionId,
            memberOwnerKeys(store.currentUser)
          )
        } catch {
          return null
        }
      })
      .find(Boolean)
    if (saved) {
      pendingBid.value = saved
      myBidAmount.value = saved.amount
      bidAmountTouched.value = true
      customNickname.value = saved.nickname
      bidNotice.value = '上一筆出價結果待確認，請重試同一筆出價。'
    }
  } catch {
    /* 忽略無效的本機暫存。 */
  }
}
watch(
  () => [store.currentUser, memberOwnerKeys(store.currentUser).join('|')],
  () => {
    needsLogin.value = false
    if (pendingBid.value && !memberOwnerKeys(store.currentUser).includes(pendingBid.value.owner)) {
      // 保留原帳號的待確認暫存，但不可顯示在另一個帳號上。
      pendingBid.value = null
      bidNotice.value = ''
      bidAmountTouched.value = false
      myBidAmount.value = minNextBid.value
      customNickname.value = ''
    }
    restorePendingBid()
  }
)
const isBidsExpanded = ref(false)
const customNickname = ref('')

watch(
  minNextBid,
  (newVal) => {
    if (!bidAmountTouched.value && !pendingBid.value) {
      myBidAmount.value = newVal
    }
  },
  { immediate: true }
)

const bidsLoading = ref(false)
const bidsError = ref('')
const metadataError = ref('')
let bidsController = null
let metadataBusy = false
let metadataController = null
let readRevision = 0
const invalidateReads = () => {
  readRevision++
  bidsController?.abort()
  metadataController?.abort()
  bidsLoading.value = false
  metadataBusy = false
}
let disposed = false
let bidsRefreshPending = false
let metadataRefreshPending = false
const loadBids = async (id = auctionId) => {
  if (disposed) return
  if (bidsLoading.value || isPlacingBid.value) {
    bidsRefreshPending = true
    return
  }
  bidsRefreshPending = false
  const revision = readRevision
  bidsLoading.value = true
  const controller = new AbortController()
  bidsController = controller
  try {
    const rows = await readAuctionBids(
      supabase,
      [id],
      'id, auction_id, user_name, amount, bid_time',
      controller.signal
    )
    if (disposed || controller.signal.aborted || revision !== readRevision) return
    realBids.value = rows
    bidsReady.value = true
    bidsError.value = ''
  } catch {
    if (!disposed && !controller.signal.aborted && revision === readRevision)
      bidsError.value = '出價紀錄無法更新，請重試；目前顯示的資料可能不是最新。'
  } finally {
    if (bidsController === controller) {
      bidsLoading.value = false
      // 讀取期間收到的新事件合併補讀，不等待下一輪定時更新。
      if (bidsRefreshPending && !disposed && !isPlacingBid.value) void loadBids(id)
    }
  }
}
const refreshMetadata = async () => {
  if (disposed) return
  if (metadataBusy || isPlacingBid.value) {
    metadataRefreshPending = true
    return
  }
  metadataRefreshPending = false
  const revision = readRevision
  const controller = new AbortController()
  metadataController = controller
  metadataBusy = true
  try {
    const { data, error } = await supabase
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .abortSignal(controller.signal)
      .maybeSingle()
    if (error) throw error
    if (disposed || controller.signal.aborted || revision !== readRevision) return
    currentAuction.value = data
    metadataError.value = ''
  } catch {
    if (!disposed && !controller.signal.aborted && revision === readRevision)
      metadataError.value = '場次資料無法更新，請重試。'
  } finally {
    if (metadataController === controller) {
      metadataBusy = false
      if (metadataRefreshPending && !disposed && !isPlacingBid.value) void refreshMetadata()
    }
  }
}
const refreshAuction = async () => {
  await Promise.all([loadBids(), refreshMetadata(), syncClock()])
}
const resumeRefresh = () => {
  if (!document.hidden) void refreshAuction()
}
watch(
  () => store.auctionList.find((a) => a.id === auctionId),
  (item, old) => {
    if ((item || old) && import.meta.client) void refreshMetadata()
  },
  { deep: true }
)

const serverEpoch = useState(`auction-time-${auctionId}`, () =>
  import.meta.server ? Date.now() : null
)
let clockAnchor = {
  epoch: serverEpoch.value || 0,
  monotonic: import.meta.client ? performance.now() : 0
}
const now = ref(clockAnchor.epoch)
const clockReady = ref(serverEpoch.value !== null)
let clockBusy = false
const syncClock = async () => {
  if (clockBusy || disposed) return
  clockBusy = true
  const sentAt = performance.now()
  try {
    const result = await $fetch('/api/server-time', { retry: 0, timeout: 4000, cache: 'no-store' })
    if (disposed) return
    const anchor = sampleAuctionClock(result.serverTime, sentAt, performance.now())
    if (anchor) {
      clockAnchor = anchor
      now.value = anchor.epoch
      clockReady.value = true
    }
  } catch {
    /* 使用最近一次伺服器時間繼續推進，下次恢復連線時重試。 */
  } finally {
    clockBusy = false
  }
}
let timer = null

onMounted(() => {
  if (import.meta.client) {
    restorePendingBid()
    checkPhoto()
    void refreshAuction()
    // 即時通知只觸發重新讀取公開資料，不能直接把事件中的舊快照覆寫到畫面。
    auctionChannel = supabase
      .channel(`auction-detail-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids',
          filter: `auction_id=eq.${auctionId}`
        },
        resumeRefresh
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        resumeRefresh
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') resumeRefresh()
      })
    bidsRefreshTimer = setInterval(resumeRefresh, 15000)
    document.addEventListener('visibilitychange', resumeRefresh)
    window.addEventListener('online', resumeRefresh)
    timer = setInterval(() => {
      now.value = auctionClockNow(clockAnchor, performance.now())
    }, 1000)
  }
})

onUnmounted(() => {
  disposed = true
  invalidateReads()
  promoController?.abort()
  if (import.meta.client) {
    if (auctionChannel) void supabase.removeChannel(auctionChannel)
    document.removeEventListener('visibilitychange', resumeRefresh)
    window.removeEventListener('online', resumeRefresh)
  }
  if (import.meta.client) {
    if (timer) clearInterval(timer)
    if (bidsRefreshTimer) clearInterval(bidsRefreshTimer)
  }
})

const getAuctionStatus = (item) => auctionState(item, now.value)

const isEndingSoon = (item) => {
  if (!item) return false
  if (getAuctionStatus(item).status !== 'active') return false
  const diff = new Date(item.end_time).getTime() - now.value
  return diff > 0 && diff <= 180000
}

const getCountdownText = (item) =>
  clockReady.value ? auctionCountdown(item, now.value) : '時間同步中'

const formatTime = (isoString) => {
  if (!isoString) return ''
  const d = new Date(isoString)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

const formatPrice = (value) => {
  const amount = Number(value)
  if (value == null || value === '' || !Number.isFinite(amount)) return 'NT$ —'
  return `NT$ ${amount.toLocaleString('zh-TW')}`
}

const auctionPublisher = {
  '@type': 'Organization',
  name: 'Gencko Breeding Studio',
  alternateName: ['Gencko Studio'],
  url: 'https://www.genckobreeding.com',
  logo: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png',
  sameAs: [
    'https://www.instagram.com/gencko_breeding',
    'https://www.facebook.com/profile.php?id=61579393505049',
    'https://line.me/R/ti/p/@219abdzn'
  ]
}

// 動態生成 SEO 與社群分享卡片 (Open Graph) 資料
const siteData = computed(() => {
  if (currentAuction.value) {
    const a = currentAuction.value
    const summary = auctionShareDetails(a, {
      known: bidsReady.value || !initialBidError.value,
      highest: bidsReady.value
        ? (currentBids.value[0]?.amount ?? null)
        : (initialBid.value?.[0]?.amount ?? null),
      now: now.value
    })
    const isEnded = summary.status === 'ended'
    const sexSym = a.gender === '公' ? '♂' : a.gender === '母' ? '♀' : ''
    const baseTitle = `${a.morph}${sexSym ? ' ' + sexSym : ''}`
    const title = summary.title
    const desc = summary.desc
    const img = photos.value.length
      ? getCleanUrl(photos.value[0])
      : 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    const url = `https://www.genckobreeding.com/auction/${a.id}`
    const endIso = Number.isFinite(Date.parse(a.end_time))
      ? new Date(a.end_time).toISOString()
      : null

    // Product + Offer schema
    const product = {
      '@type': 'Product',
      '@id': `${url}#product`,
      name: `${a.morph}${sexSym ? ' ' + sexSym : ''} - ${a.id}`,
      image: [img],
      description: desc,
      sku: a.id,
      productID: a.id,
      category: '寵物 > 爬蟲 > 守宮',
      brand: { '@type': 'Brand', name: 'Gencko Breeding Studio' },
      additionalProperty: [
        ...(a.gender ? [{ '@type': 'PropertyValue', name: '性別', value: a.gender }] : []),
        ...(a.birth_year
          ? [{ '@type': 'PropertyValue', name: '孵化日', value: a.birth_year }]
          : []),
        ...(a.diet ? [{ '@type': 'PropertyValue', name: '飲食', value: a.diet }] : []),
        ...(a.feeding_freq
          ? [{ '@type': 'PropertyValue', name: '餵食頻率', value: a.feeding_freq }]
          : []),
        ...(a.tongs_fed ? [{ '@type': 'PropertyValue', name: '夾食訓練', value: a.tongs_fed }] : [])
      ],
      offers: {
        '@type': 'Offer',
        '@id': `${url}#offer`,
        url: url,
        priceCurrency: 'TWD',
        ...(summary.currentPrice !== null ? { price: summary.currentPrice } : {}),
        ...(endIso ? { priceValidUntil: endIso.split('T')[0] } : {}),
        availability:
          summary.status === 'active'
            ? 'https://schema.org/LimitedAvailability'
            : summary.status === 'ended'
              ? 'https://schema.org/SoldOut'
              : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        businessFunction: 'http://purl.org/goodrelations/v1#Sell',
        areaServed: { '@type': 'Country', name: 'Taiwan' },
        seller: auctionPublisher,
        ...(a.buy_now_price && summary.currentPrice !== null
          ? {
              priceSpecification: [
                {
                  '@type': 'PriceSpecification',
                  name: '目前出價',
                  price: summary.currentPrice,
                  priceCurrency: 'TWD',
                  ...(endIso ? { validThrough: endIso } : {})
                },
                {
                  '@type': 'PriceSpecification',
                  name: '直購價（Buy Now）',
                  price: a.buy_now_price,
                  priceCurrency: 'TWD',
                  ...(endIso ? { validThrough: endIso } : {})
                }
              ]
            }
          : {})
      }
    }

    // WebPage 包覆
    const webPageLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': url,
      url: url,
      name: title,
      inLanguage: 'zh-TW',
      isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
      primaryImageOfPage: { '@type': 'ImageObject', url: img },
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['.m-gender', '.bid-amount']
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
          name: '守宮競標',
          item: 'https://www.genckobreeding.com/auction'
        },
        { '@type': 'ListItem', position: 3, name: baseTitle, item: url }
      ]
    }

    return {
      ...summary,
      title,
      desc,
      img,
      url,
      isEnded,
      currentPrice: summary.currentPrice,
      buyNowPrice: a.buy_now_price || null,
      endIso,
      script: [
        { type: 'application/ld+json', innerHTML: serializeJsonLd(webPageLd) },
        { type: 'application/ld+json', innerHTML: serializeJsonLd(breadcrumb) }
      ]
    }
  }
  return {
    ...auctionShareDetails(null, { error: !!auctionLoadError.value }),
    img: 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85',
    url: `https://www.genckobreeding.com/auction/${auctionId}`,
    isEnded: false,
    currentPrice: null,
    buyNowPrice: null,
    endIso: null,
    script: []
  }
})

useHead({
  title: computed(() => siteData.value.title),
  meta: [
    { name: 'description', content: computed(() => siteData.value.desc) },
    // 已結標的競標 → noindex（避免過期內容污染索引）
    {
      name: 'robots',
      content: computed(() =>
        siteData.value.indexable ? 'index, follow, max-image-preview:large' : 'noindex, follow'
      )
    },
    // Open Graph
    { property: 'og:title', content: computed(() => siteData.value.title) },
    { property: 'og:description', content: computed(() => siteData.value.desc) },
    { property: 'og:image', content: computed(() => siteData.value.img) },
    { property: 'og:image:alt', content: computed(() => `${siteData.value.title} - 守宮競標`) },
    { property: 'og:url', content: computed(() => siteData.value.url) },
    { property: 'og:type', content: 'product' },
    {
      property: 'product:price:amount',
      content: computed(() => String(siteData.value.currentPrice ?? ''))
    },
    { property: 'product:price:currency', content: 'TWD' },
    {
      property: 'product:availability',
      content: computed(() => siteData.value.availability)
    },
    { property: 'product:condition', content: 'new' },
    { property: 'product:brand', content: 'Gencko Breeding Studio' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: computed(() => siteData.value.title) },
    { name: 'twitter:description', content: computed(() => siteData.value.desc) },
    { name: 'twitter:image', content: computed(() => siteData.value.img) },
    { name: 'twitter:label1', content: computed(() => siteData.value.priceLabel) },
    {
      name: 'twitter:data1',
      content: computed(() =>
        siteData.value.currentPrice !== null ? `NT$ ${siteData.value.currentPrice}` : '資料更新中'
      )
    },
    {
      name: 'twitter:label2',
      content: computed(() => (siteData.value.status === 'active' ? '結標時間' : '狀態'))
    },
    {
      name: 'twitter:data2',
      content: computed(() =>
        siteData.value.status !== 'active'
          ? currentAuction.value
            ? getAuctionStatus(currentAuction.value).text
            : '資料待確認'
          : siteData.value.endIso
            ? new Date(siteData.value.endIso).toLocaleString('zh-TW', { hour12: false })
            : ''
      )
    }
  ],
  link: [{ rel: 'canonical', href: computed(() => siteData.value.url) }],
  script: computed(() => siteData.value.script || [])
})

const placeBid = async () => {
  if (isPlacingBid.value || disposed) return
  if (!canPlaceAuctionBid(store.currentUser) || needsLogin.value) {
    alert('請先使用 LINE 登入後再出價。')
    return
  }
  const owner = memberOwnerKeys(store.currentUser)[0]
  if (!pendingBid.value && !lineContactVerified.value) {
    bidNotice.value = '請先完成官方 LINE 聯絡驗證後再出價'
    return
  }
  if (pendingBid.value && !memberOwnerKeys(store.currentUser).includes(pendingBid.value.owner)) {
    alert('請使用原出價帳號登入，確認上一筆出價結果。')
    return
  }
  const retrying = !!pendingBid.value
  if (!pendingBid.value) {
    if (!bidsReady.value || bidsError.value || metadataError.value) return
    if (!clockReady.value) {
      alert('正在同步競標時間，請稍候再試。')
      return
    }
    if (!currentAuction.value || getAuctionStatus(currentAuction.value).status !== 'active') {
      alert('此競標已結束，無法再出價。')
      return
    }
    const amount = Number(myBidAmount.value)
    if (!validBidAmount(amount)) {
      alert('請輸入有效的正整數金額。')
      return
    }
    if (amount < minNextBid.value) {
      alert(`目前最低出價為 ${formatPrice(minNextBid.value)}，請自行調整金額。`)
      return
    }
    const nickname = customNickname.value.trim()
    if ([...nickname].length > 15) {
      alert('暱稱不可超過 15 個字。')
      return
    }
    if (
      !confirm(
        `確認出價 ${formatPrice(amount)}？\n${currentAuction.value.morph}（${auctionId}）\n公開名稱：${nickname || '系統匿名'}${nickname ? '（完整顯示，不遮蔽）' : ''}\n送出後無法自行撤回。`
      )
    )
      return
    pendingBid.value = { requestId: crypto.randomUUID(), auctionId, amount, nickname, owner }
    persistPendingBid()
  }
  const intent = { ...pendingBid.value }
  const intentOwners = memberOwnerKeys(store.currentUser)
  bidAmountTouched.value = true
  isPlacingBid.value = true
  bidNotice.value = ''
  invalidateReads()
  try {
    const result = await $fetch(`/api/auctions/${encodeURIComponent(auctionId)}/bid`, {
      method: 'POST',
      retry: 0,
      timeout: 15000,
      body: { amount: intent.amount, nickname: intent.nickname, requestId: intent.requestId }
    })
    if (!validBidReceipt(result, auctionId, intent.amount)) throw new Error('回執不完整')
    clearPendingBid(intent, intentOwners)
    if (disposed || !memberOwnerKeys(store.currentUser).includes(intent.owner)) return
    if (!realBids.value.some((bid) => bid.id === result.bid.id)) realBids.value.push(result.bid)
    currentAuction.value = { ...currentAuction.value, end_time: result.auction.end_time }
    isBidsExpanded.value = true
    bidNotice.value = `已確認出價 ${formatPrice(intent.amount)}。`
    alert(result.extended ? '出價成功！結標時間已自動延長 3 分鐘。' : '出價成功！')
  } catch (err) {
    const detail = err?.data?.data
    const status = err?.statusCode || err?.response?.status
    // 明確拒絕才解除待確認；連線中斷可能已成立，必須保留原請求編號。
    const rejected =
      detail?.outcome === 'rejected' ||
      (detail?.outcome === 'not_submitted' && !retrying && status !== 401)
    if (rejected) clearPendingBid(intent, intentOwners)
    if (disposed || !memberOwnerKeys(store.currentUser).includes(intent.owner)) return
    if (rejected || status === 401) {
      if (status === 401) needsLogin.value = true
      bidNotice.value = err?.data?.message || '此筆出價未成立，請確認最新資料。'
    } else {
      bidNotice.value = `出價 ${formatPrice(intent.amount)} 的結果待確認，請重試同一筆出價；不會重複成立。`
    }
    alert(bidNotice.value)
  } finally {
    invalidateReads()
    isPlacingBid.value = false
    if (!disposed) void refreshAuction()
  }
}

const mayInquireBuyNow = computed(
  () =>
    hasBuyNowPrice(currentAuction.value) &&
    getAuctionStatus(currentAuction.value).status === 'active' &&
    bidsReady.value &&
    !bidsError.value &&
    !metadataError.value &&
    !pendingBid.value &&
    !isPlacingBid.value &&
    (currentBids.value.length === 0 ||
      highestBidAmount.value < Number(currentAuction.value.buy_now_price))
)
const buyNow = () => {
  if (!mayInquireBuyNow.value) return
  if (
    confirm(
      `前往官方 LINE 詢問直購（${formatPrice(currentAuction.value.buy_now_price)}）？\n此操作不會保留個體或結束競標，請以工作室確認為準。`
    )
  ) {
    window.open(
      getLineMessageLink(
        'https://line.me/R/ti/p/@219abdzn',
        `Hi Gencko，我想詢問直購競標個體 ${currentAuction.value.morph}\n編號：${currentAuction.value.id}\n頁面直購價：${formatPrice(currentAuction.value.buy_now_price)}\n請協助確認是否仍可直購。\nhttps://www.genckobreeding.com/auction/${encodeURIComponent(currentAuction.value.id)}`
      ),
      '_blank'
    )
  }
}

// 🌟 方案一：原生系統分享
const shareMessage = ref('')
const manualShareUrl = ref('')
const shareLink = async () => {
  shareMessage.value = ''
  manualShareUrl.value = ''
  if (navigator.share) {
    try {
      await navigator.share({
        title: siteData.value.title,
        text: siteData.value.desc,
        url: window.location.href
      })
      return
    } catch (err) {
      if (err?.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(window.location.href)
    shareMessage.value = '連結已複製'
  } catch {
    shareMessage.value = '無法自動複製，請選取下方連結手動複製。'
    manualShareUrl.value = window.location.href
  }
}

// 🌟 方案二：生成正方形 IG 宣傳圖卡 (Canvas 升級版)
const generatedImage = ref(null)
const isGenerating = ref(false)
let promoController = null
const promoPagePath = route.path
const promoTriggerEl = ref(null)
const promoModal = useHistoryModal('auction-promo')
const promoDialogEl = promoModal.dialog

const generatePromo = async () => {
  if (!currentAuction.value || isGenerating.value || route.path !== promoPagePath) return
  isGenerating.value = true
  const controller = new AbortController()
  promoController = controller

  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1080
    canvas.height = 1080
    const ctx = canvas.getContext('2d')

    if (!ctx) throw new Error('此瀏覽器無法產生圖片，請改用分享連結。')
    const targetUrl = photoUrl.value
    const img = targetUrl ? await loadPromoImage(targetUrl, { signal: controller.signal }) : null
    if (disposed || route.path !== promoPagePath || controller.signal.aborted) return
    const imgAreaHeight = 820
    if (img) {
      ctx.filter = 'blur(40px)'
      const bgScale = Math.max(1080 / img.width, imgAreaHeight / img.height)
      const bgW = img.width * bgScale
      const bgH = img.height * bgScale
      ctx.drawImage(img, (1080 - bgW) / 2, (imgAreaHeight - bgH) / 2, bgW, bgH)
      ctx.filter = 'none'
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
      ctx.fillRect(0, 0, 1080, imgAreaHeight)
      const scale = Math.min(1080 / img.width, imgAreaHeight / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (1080 - w) / 2, (imgAreaHeight - h) / 2, w, h)
    } else {
      ctx.fillStyle = '#f4f1eb'
      ctx.fillRect(0, 0, 1080, imgAreaHeight)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#27251f'
      ctx.font = '900 110px Arial, sans-serif'
      ctx.fillText('GENCKO', 540, 380)
      ctx.fillStyle = '#77736b'
      ctx.font = '32px sans-serif'
      ctx.fillText('照片尚未提供', 540, 470)
    }

    // 底部資訊背景
    ctx.fillStyle = '#FF4500'
    ctx.fillRect(0, imgAreaHeight, 1080, 1080 - imgAreaHeight)

    // 繪製文字
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'left'

    ctx.font = 'bold 75px sans-serif'
    ctx.fillText(currentAuction.value.morph.substring(0, 16), 50, 930)

    // 不顯示價格，顯示狀態與性別
    ctx.font = 'bold 45px sans-serif'
    const statusTxt = getAuctionStatus(currentAuction.value).text
    const genderTxt =
      currentAuction.value.gender && currentAuction.value.gender !== '未定'
        ? `(${currentAuction.value.gender})`
        : ''
    ctx.fillText(`${statusTxt}   ${genderTxt}`, 50, 1010)

    // 品牌 Logo 文字
    ctx.textAlign = 'right'
    ctx.font = '900 65px Arial, sans-serif'
    ctx.fillText('GENCKO', 1030, 930)
    ctx.font = 'bold 35px Arial, sans-serif'
    ctx.fillText('STUDIO', 1030, 1000)

    generatedImage.value = canvas.toDataURL('image/jpeg', 0.9)
    promoModal.open()
  } catch (err) {
    if (disposed || route.path !== promoPagePath || err?.name === 'AbortError') return
    alert(
      err?.name === 'SecurityError'
        ? '圖片無法匯出，請改用分享連結。'
        : err?.message || '圖卡生成失敗，請稍後重試。'
    )
  } finally {
    isGenerating.value = false
  }
}

const closePromo = () => promoModal.close()
</script>

<template>
  <div class="site-document-page auction-page-wrapper">
    <div class="common-document-meta" aria-label="競標詳情說明">
      <span>GENCKO AUCTION RECORD</span>
      <span>DETAIL / STATUS / ACTION</span>
    </div>
    <!-- SEO：sr-only h1（爬蟲可讀、視覺隱藏；視覺主標題用 h2 維持原版面） -->
    <h1 v-if="currentAuction" class="sr-only">
      {{ currentAuction.morph }}
      <template v-if="currentAuction.gender && currentAuction.gender !== '未定'">
        （{{ currentAuction.gender }}）
      </template>
      守宮競標｜Gencko Breeding Studio
    </h1>
    <TheBackButton fallback="/auction" text="返回列表" />

    <div v-if="pending" class="loading-state">
      <div class="loader"></div>
      <p>載入競標資料中...</p>
    </div>

    <div v-else-if="auctionLoadError" class="not-found" role="alert">
      <h2>競標資料載入失敗</h2>
      <button type="button" class="btn-app" @click="retryAuction">重試</button>
      <TheBackButton fallback="/auction" text="返回競標列表" wrapper-class="not-found__action" />
    </div>
    <div v-else-if="currentAuction" class="detail-layout">
      <div class="left-col">
        <div
          class="auction-gallery"
          @touchstart.passive="photoTouchStart"
          @touchend.passive="photoTouchEnd"
          @touchcancel="photoTouch = null"
        >
          <button
            type="button"
            v-if="selectedPhoto && !photoFailed"
            class="main-img"
            aria-label="放大競標商品圖片"
            @click="openPhoto"
            @keydown.right.prevent="selectPhoto((photoIndex + 1) % photos.length)"
            @keydown.left.prevent="selectPhoto((photoIndex - 1 + photos.length) % photos.length)"
          >
            <img
              ref="photoEl"
              :key="`${selectedPhoto}:${photoRetry}`"
              :src="photoUrl"
              :alt="`${currentAuction.morph}，照片 ${photoIndex + 1}`"
              @error="photoFailed = true"
              loading="eager"
              decoding="async"
            />
            <div class="zoom-hint">點擊放大圖片</div>
          </button>
          <div v-else class="auction-photo-error" role="status">
            <span>{{ selectedPhoto ? '照片載入失敗' : '照片尚未提供' }}</span>
            <button
              v-if="selectedPhoto"
              type="button"
              class="btn-app btn-app--ghost btn-app--sm"
              @click="retryPhoto"
            >
              重新載入照片
            </button>
          </div>
          <div
            v-if="photos.length > 1"
            class="auction-photo-controls"
            role="group"
            aria-label="競標照片切換"
          >
            <button
              v-for="(_, index) in photos"
              :key="index"
              type="button"
              class="btn-app btn-app--ghost btn-app--sm photo-number"
              :aria-label="`查看第 ${index + 1} 張照片`"
              :aria-pressed="photoIndex === index"
              @click="selectPhoto(index)"
            >
              {{ index + 1 }}
            </button>
            <button
              type="button"
              class="btn-app btn-app--ghost btn-app--sm photo-arrow"
              aria-label="上一張照片"
              @click="selectPhoto((photoIndex - 1 + photos.length) % photos.length)"
            >
              ←
            </button>
            <button
              type="button"
              class="btn-app btn-app--ghost btn-app--sm photo-arrow"
              aria-label="下一張照片"
              @click="selectPhoto((photoIndex + 1) % photos.length)"
            >
              →
            </button>
          </div>
          <span v-if="photos.length > 1" class="photo-page-count" aria-hidden="true">
            {{ photoIndex + 1 }} / {{ photos.length }}
          </span>
          <span v-if="photos.length > 1" class="sr-only" aria-live="polite">
            目前顯示第 {{ photoIndex + 1 }} 張，共 {{ photos.length }} 張
          </span>
        </div>
        <div class="bid-history">
          <div class="history-header">
            <h3>出價紀錄 ({{ currentBids.length }})</h3>
            <button
              type="button"
              v-if="currentBids.length > 1"
              @click="isBidsExpanded = !isBidsExpanded"
              class="btn-app btn-app--ghost btn-app--sm btn-toggle"
            >
              {{ isBidsExpanded ? '收起' : '展開全部' }}
            </button>
          </div>

          <p v-if="bidsError" role="alert">
            {{ bidsError }}
            <button type="button" :disabled="bidsLoading" @click="loadBids()">重試</button>
          </p>
          <p v-if="!bidsReady && bidsLoading" role="status">載入出價紀錄中…</p>
          <div v-if="bidsReady && !bidsError && currentBids.length === 0" class="empty-history">
            <p>目前尚無出價，搶先成為第一位！</p>
            <div class="bid-example">
              <span class="bid-example__label">顯示範例</span>
              <br />
              <strong>使用者***（未填暱稱）</strong>
              出價
              <span>{{ formatPrice(minNextBid) }}</span>
            </div>
          </div>
          <ul v-if="currentBids.length" class="history-list">
            <template v-if="isBidsExpanded">
              <li
                v-for="(bid, index) in currentBids"
                :key="bid.id || bid.bid_time"
                :class="{ 'highest-bid': index === 0 }"
              >
                <span class="bidder">{{ bid.user_name }}</span>
                <span class="bid-amount">{{ formatPrice(bid.amount) }}</span>
                <span class="bid-time">{{ formatTime(bid.bid_time) }}</span>
              </li>
            </template>
            <template v-else>
              <li class="highest-bid">
                <span class="bidder">{{ currentBids[0].user_name }}</span>
                <span class="bid-amount">{{ formatPrice(currentBids[0].amount) }}</span>
                <span class="bid-time">{{ formatTime(currentBids[0].bid_time) }}</span>
              </li>
            </template>
          </ul>
        </div>
      </div>

      <div class="right-col">
        <div class="header-info">
          <ClientOnly>
            <div
              class="status-badge"
              role="status"
              :aria-label="`競標狀態：${getAuctionStatus(currentAuction).text}`"
              :class="getAuctionStatus(currentAuction).class"
            >
              {{ getAuctionStatus(currentAuction).text }}
            </div>
            <template #fallback>
              <div class="status-badge badge-active">計算中</div>
            </template>
          </ClientOnly>
          <h2 class="page-title">
            {{ currentAuction.morph }}
            <span class="m-gender" v-if="currentAuction.gender && currentAuction.gender !== '未定'">
              ({{ currentAuction.gender }})
            </span>
          </h2>
        </div>

        <div class="action-sub-buttons">
          <button
            type="button"
            class="btn-app btn-app--ghost btn-app--md btn-share"
            @click="shareLink"
          >
            分享連結
          </button>
          <button
            ref="promoTriggerEl"
            type="button"
            class="btn-app btn-app--ghost btn-app--md btn-promo"
            @click="generatePromo"
            :disabled="isGenerating"
          >
            {{ isGenerating ? '生成中...' : '產生圖卡' }}
          </button>
        </div>

        <p v-if="shareMessage" role="status">{{ shareMessage }}</p>
        <input
          v-if="manualShareUrl"
          class="manual-share-url"
          :value="manualShareUrl"
          readonly
          aria-label="手動複製競標連結"
          @focus="$event.target.select()"
        />
        <p v-if="metadataError" role="alert">
          {{ metadataError }}
          <button type="button" @click="refreshAuction">重試</button>
        </p>
        <div class="price-dashboard">
          <div class="price-row">
            <span class="p-lbl">
              {{ bidsReady && !currentBids.length ? '起標價：' : '最高出價：' }}
            </span>
            <span class="highest-price">
              {{ bidsReady || !initialBidError ? formatPrice(highestBidAmount) : '等待出價資料' }}
            </span>
          </div>
          <div class="price-row sub">
            <span>最低增額：{{ formatPrice(bidIncrement) }}</span>
            <span v-if="hasBuyNowPrice(currentAuction)">
              直購價：{{ formatPrice(currentAuction.buy_now_price) }}
            </span>
          </div>
        </div>

        <ClientOnly>
          <div
            class="timer-box"
            role="timer"
            aria-label="競標剩餘時間"
            :class="{ 'ending-soon': isEndingSoon(currentAuction) }"
          >
            <div class="timer-title">剩餘時間</div>
            <div class="timer-value">{{ getCountdownText(currentAuction) }}</div>
            <div class="timer-note">結標前3分鐘喊標自動延長。</div>
          </div>
          <template #fallback>
            <div class="timer-box" role="timer" aria-label="競標剩餘時間">
              <div class="timer-title">剩餘時間</div>
              <div class="timer-value">時間計算中</div>
            </div>
          </template>
        </ClientOnly>

        <ClientOnly>
          <p v-if="bidNotice" role="status" class="bid-hint">{{ bidNotice }}</p>
          <div
            class="action-box"
            v-if="getAuctionStatus(currentAuction).status === 'active' || pendingBid"
          >
            <template v-if="canPlaceAuctionBid(store.currentUser) && !needsLogin">
              <div class="user-info-box">
                <span v-if="store.currentUser.type === 'line'" class="u-name">
                  LINE：{{ store.currentUser.name }}
                </span>
                <span v-else class="u-name">Google：{{ store.currentUser.email }}</span>
                <button
                  type="button"
                  @click="store.logout"
                  class="btn-app btn-app--ghost btn-app--xs btn-logout"
                >
                  登出
                </button>
              </div>
              <div class="nick-input-wrap">
                <AuctionLineContact
                  :auction-id="auctionId"
                  :member-id="store.currentUser.id"
                  @verified="lineContactVerified = $event"
                />
                <input
                  type="text"
                  v-model="customNickname"
                  placeholder="選填暱稱（填寫內容會完整公開）"
                  class="nick-input"
                  aria-label="自訂顯示暱稱"
                  aria-describedby="nickname-public-notice"
                />
                <p id="nickname-public-notice" class="bid-hint">
                  未填時由系統匿名顯示；填寫後會完整公開你輸入的文字，不會再遮蔽。請勿填本名、電話等個人資料。
                </p>
              </div>
              <div class="input-group">
                <span class="currency">NT$</span>
                <input
                  type="number"
                  v-model="myBidAmount"
                  @input="bidAmountTouched = true"
                  :disabled="isPlacingBid || !!pendingBid"
                  :max="MAX_BID_AMOUNT"
                  :min="minNextBid"
                  :step="bidIncrement"
                  aria-label="出價金額"
                />
              </div>
              <div class="action-buttons">
                <button
                  type="button"
                  class="btn-app btn-app--primary btn-app--md btn-bid"
                  @click="placeBid"
                  :disabled="
                    isPlacingBid ||
                    (!pendingBid &&
                      (!bidsReady || !!bidsError || !!metadataError || !lineContactVerified))
                  "
                >
                  {{ isPlacingBid ? '處理中...' : pendingBid ? '重試同一筆出價' : '確認出價' }}
                </button>
                <button
                  type="button"
                  v-if="hasBuyNowPrice(currentAuction)"
                  class="btn-app btn-app--secondary btn-app--md btn-buy-now"
                  :disabled="!mayInquireBuyNow"
                  @click="buyNow"
                >
                  詢問直購（{{ formatPrice(currentAuction.buy_now_price) }}）
                </button>
              </div>
              <p
                v-if="
                  hasBuyNowPrice(currentAuction) &&
                  currentBids.length &&
                  highestBidAmount >= Number(currentAuction.buy_now_price)
                "
                class="bid-hint"
              >
                目前出價已達直購價，請依競標出價。
              </p>
              <div class="bid-hint">您的出價必須 ≥ {{ formatPrice(minNextBid) }}</div>
              <p v-if="currentAuction.workflow_enabled" class="bid-hint">
                得標後請在本頁複製訊息至官方 LINE 領標，並於結標後 24
                小時內付款；逾期會限制網站出價。
              </p>
            </template>

            <template v-else>
              <div class="login-prompt">
                <p>競標出價請使用 LINE 登入；Google 僅供管理與查閱歷史紀錄。</p>
                <button type="button" @click="store.loginWithLine" class="btn-login-line">
                  LINE 登入
                </button>
              </div>
            </template>
          </div>
          <div class="action-box ended" v-else>
            {{ getAuctionStatus(currentAuction).text }}
            <template v-if="getAuctionStatus(currentAuction).status === 'ended'">
              <br />
              <span v-if="!bidsReady || bidsError">得標結果待確認</span>
              <span v-else class="winner-name">
                {{
                  currentBids.length
                    ? `最高出價者：${currentBids[0].user_name}（結果以工作室確認為準）`
                    : '無出價紀錄'
                }}
              </span>
            </template>
            <div
              v-if="
                !isAuctionMember(store.currentUser) &&
                getAuctionStatus(currentAuction).status === 'ended'
              "
              class="login-prompt"
            >
              <p>得標者請使用出價時的帳號登入，複製確認訊息至官方 LINE 領標。</p>
              <button type="button" class="btn-login-line" @click="store.loginWithLine">
                LINE 登入
              </button>
              <button type="button" class="btn-login-google" @click="store.loginWithGoogle">
                Google 登入
              </button>
            </div>
          </div>
          <AuctionWinnerClaim
            v-if="
              getAuctionStatus(currentAuction).status === 'ended' &&
              isAuctionMember(store.currentUser)
            "
            :auction-id="auctionId"
            :member-id="store.currentUser.id"
            :key="store.currentUser.id"
          />
        </ClientOnly>

        <div class="info-section">
          <ul class="specs-list">
            <li>
              <strong>品系：</strong>
              {{ currentAuction.morph }}
            </li>
            <li>
              <strong>性別：</strong>
              {{ currentAuction.gender || '-' }}
            </li>
            <li>
              <strong>生日：</strong>
              {{ currentAuction.birth_year || '-' }}
            </li>
            <li>
              <strong>夾餵：</strong>
              {{ currentAuction.tongs_fed || '-' }}
            </li>
            <li>
              <strong>餌料：</strong>
              {{ currentAuction.diet || '-' }}
            </li>
            <li>
              <strong>餵食頻率：</strong>
              {{ currentAuction.feeding_freq || '-' }}
            </li>
            <li>
              <strong>運送／面交：</strong>
              {{ currentAuction.shipping_info || '-' }}
            </li>
          </ul>
          <div class="note-box" v-if="currentAuction.note">
            <strong>個體注意事項：</strong>
            <span class="note-content">{{ currentAuction.note }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="not-found">
      <h2>找不到此競標商品</h2>
      <p>這筆競標可能已下架，或網址不正確。</p>
      <TheBackButton fallback="/auction" text="返回列表" wrapper-class="not-found__action" />
    </div>

    <Teleport to="body">
      <dialog
        ref="promoDialogEl"
        class="promo-modal-overlay"
        aria-labelledby="promo-dialog-title"
        @cancel.prevent="closePromo"
        @click.self="closePromo"
      >
        <div v-if="generatedImage" class="promo-modal-content" tabindex="-1" @click.stop>
          <button
            type="button"
            class="btn-app btn-app--ghost btn-app--xs btn-close-promo"
            autofocus
            aria-label="關閉宣傳圖卡"
            @click="closePromo"
          >
            關閉
          </button>
          <p class="promo-modal-eyebrow">SHARE CARD</p>
          <h3 id="promo-dialog-title">宣傳圖卡已生成</h3>
          <p class="promo-modal-desc">長按圖片儲存，或在桌機點擊右鍵另存，即可分享至社群。</p>
          <img
            :src="generatedImage"
            :alt="`${currentAuction?.morph || 'Gencko'} 競標宣傳圖卡`"
            class="promo-result-img"
            loading="lazy"
            decoding="async"
          />
        </div>
      </dialog>
    </Teleport>
  </div>
</template>

<style scoped>
.auction-page-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 15px;
  color: var(--txt);
}

/* 🌟 Desktop Layout */
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  margin-top: 10px;
}
.left-col .main-img {
  display: block;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: zoom-in;
  margin-bottom: 2rem;
  width: 100%;
  aspect-ratio: 4 / 3;
  background-color: var(--card-bg);
  border: 1px solid var(--bd);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  appearance: none;
  padding: 0;
  color: inherit;
  font: inherit;
  text-align: inherit;
}
.main-img:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}
.main-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.zoom-hint {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  text-align: center;
  padding: 0.5rem;
  font-size: 0.9rem;
}

.bid-history {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 1.5rem;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--bd);
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}
.history-header h3 {
  margin: 0;
  color: var(--txt);
}
.btn-toggle {
  background: transparent;
  border: 1px solid var(--pri);
  color: var(--pri);
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: 0.2s;
  min-height: var(--control-min-height);
}
.btn-toggle:hover {
  background: var(--pri);
  color: #fff;
}
.history-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 250px;
  overflow-y: auto;
}
.history-list li {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 0;
  border-bottom: 1px dashed var(--bd);
  font-size: 0.95rem;
  color: var(--txt);
  opacity: 0.85;
}
.history-list li.highest-bid {
  color: var(--pri);
  font-weight: bold;
  opacity: 1;
}
.bid-time {
  color: var(--txt);
  opacity: 0.6;
  font-size: 0.8rem;
}

.right-col .header-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}
.right-col h2 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--txt);
}
.m-gender {
  font-size: 1.2rem;
  color: var(--txt);
  opacity: 0.6;
}

.status-badge {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  color: #fff;
  width: max-content;
  white-space: nowrap;
  line-height: 1.2;
}
.badge-active {
  background: var(--pri);
  box-shadow: 0 0 10px rgba(255, 69, 0, 0.4);
}
.badge-ended {
  background: #666;
}

/* 🌟 行銷操作按鈕 (與商品頁一致) */
.action-sub-buttons {
  display: flex;
  gap: 10px;
  width: 100%;
}
.btn-share,
.btn-promo {
  flex: 1;
  background: var(--card-bg);
  color: var(--txt);
  border: 1px solid var(--bd);
  padding: 12px;
  border-radius: 25px;
  cursor: pointer;
  transition: 0.2s;
  font-weight: bold;
  font-size: 0.95rem;
  white-space: nowrap;
  min-height: var(--control-min-height);
}
.btn-share:hover,
.btn-promo:hover {
  border-color: var(--pri);
  color: var(--pri);
}
.btn-promo:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.price-dashboard {
  margin-bottom: 1.5rem;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  padding: 15px;
  border-radius: 12px;
}
.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 1.1rem;
}
.p-lbl {
  color: var(--txt);
  opacity: 0.6;
}
.price-row .highest-price {
  font-size: 2rem;
  font-weight: bold;
  color: var(--pri);
  text-shadow: 0 0 10px rgba(255, 69, 0, 0.2);
}
.price-row.sub {
  font-size: 0.9rem;
  color: var(--txt);
  opacity: 0.6;
  border-top: 1px dashed var(--bd);
  margin-top: 10px;
  padding-top: 10px;
}

.timer-box {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 1.5rem;
}
.timer-title {
  font-size: 0.9rem;
  color: var(--txt);
  opacity: 0.6;
  margin-bottom: 0.5rem;
}
.timer-value {
  font-size: 2rem;
  font-weight: bold;
  letter-spacing: 2px;
  font-family: monospace;
  color: var(--txt);
}
.timer-note {
  font-size: 0.8rem;
  color: var(--txt);
  opacity: 0.6;
  margin-top: 0.5rem;
}

.timer-box.ending-soon {
  color: #fff;
  background: #e74c3c;
  border-color: #c0392b;
  animation: pulse 1.5s infinite;
}
.timer-box.ending-soon .timer-title,
.timer-box.ending-soon .timer-value,
.timer-box.ending-soon .timer-note {
  color: #fff !important;
  opacity: 1;
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

.action-box {
  background: var(--card-bg);
  border: 2px solid var(--pri);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  width: 100%;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}
.action-box.ended {
  border-color: var(--bd);
  background: var(--card-bg);
  text-align: center;
  font-weight: bold;
  color: var(--txt);
  opacity: 0.7;
}

.user-info-box {
  margin-bottom: 1rem;
  padding: 10px;
  background: var(--card-bg);
  border-radius: 8px;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--bd);
}
.u-name {
  color: var(--txt);
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.btn-logout {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  color: var(--txt);
  opacity: 0.7;
  padding: 4px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
  min-height: var(--control-min-height);
}
.btn-logout:hover {
  opacity: 1;
  border-color: var(--txt);
}

.nick-input-wrap {
  margin-bottom: 15px;
}
.nick-input {
  width: 100%;
  padding: 12px;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  color: var(--txt);
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}
.nick-input:focus {
  border-color: var(--pri);
  outline: none;
}

.input-group {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  border: 1px solid var(--bd);
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
}
.input-group .currency {
  padding: 12px 15px;
  background: rgba(128, 128, 128, 0.1);
  color: var(--txt);
  font-weight: bold;
  border-right: 1px solid var(--bd);
}
.input-group input {
  flex: 1;
  min-width: 0;
  border: none;
  padding: 12px;
  font-size: 1.3rem;
  outline: none;
  background: var(--card-bg);
  color: var(--txt);
  font-weight: bold;
}

.action-buttons {
  display: flex;
  gap: 10px;
}
.btn-bid {
  flex: 2;
  background: var(--pri);
  color: #fff;
  border: none;
  padding: 14px;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 10px var(--pri-glow);
  transition: 0.2s;
  min-height: var(--control-min-height);
}
.btn-bid:hover {
  transform: translateY(-2px);
}
.btn-bid:disabled {
  background: #666;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}
.btn-buy-now {
  flex: 1;
  background: var(--card-bg);
  color: var(--txt);
  border: 1px solid var(--bd);
  padding: 14px;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: bold;
  transition: 0.2s;
  min-height: var(--control-min-height);
}
.btn-buy-now:hover {
  background: rgba(128, 128, 128, 0.1);
}

.bid-hint {
  font-size: 0.85rem;
  color: var(--txt);
  opacity: 0.6;
  margin-top: 10px;
  text-align: center;
}

.login-prompt {
  text-align: center;
  padding: 10px 0;
}
.login-prompt p {
  margin-bottom: 15px;
  color: #d9534f;
  font-weight: bold;
}
.btn-login-line {
  background: #06c755;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 10px;
  margin-bottom: 10px;
  min-height: var(--control-min-height);
}
.btn-login-line img {
  width: 24px;
  height: 24px;
}
.btn-login-google {
  background: var(--card-bg);
  color: var(--txt);
  border: 1px solid var(--bd);
  border-radius: 8px;
  padding: 12px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  gap: 10px;
  transition: 0.2s;
  min-height: var(--control-min-height);
}
.btn-login-google:hover {
  background: rgba(128, 128, 128, 0.1);
}

.info-section {
  margin-bottom: 20px;
}
.specs-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.specs-list li {
  background: var(--card-bg);
  padding: 12px;
  border-radius: 8px;
  font-size: 0.95rem;
  border: 1px solid var(--bd);
  color: var(--txt);
}
.note-box {
  margin-top: 15px;
  padding: 12px 15px;
  background: var(--card-bg);
  border-radius: 8px;
  font-size: 0.95rem;
  line-height: 1.5;
  border: 1px solid var(--bd);
  border-left: 4px solid var(--pri);
  color: var(--txt);
}

/* 🌟 圖卡彈窗 Modal 樣式 */
.promo-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 999999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}
.promo-modal-content {
  background: var(--card-bg);
  border: 1px solid var(--pri);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 400px;
  text-align: center;
  position: relative;
  box-shadow: 0 10px 40px rgba(255, 69, 0, 0.2);
  animation: zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.btn-close-promo {
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--txt);
  font-size: 1.4rem;
  cursor: pointer;
  opacity: 0.6;
  min-width: var(--control-min-height);
  min-height: var(--control-min-height);
}
.promo-result-img {
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-top: 15px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--bd);
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 768px) {
  .auction-page-wrapper {
    padding: 0 10px 15px 10px;
  }

  .detail-layout {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 10px;
    align-items: start;
    margin-top: 5px;
  }

  .left-col,
  .right-col {
    display: contents;
  }

  .main-img {
    grid-column: 1 / 2;
    grid-row: 1 / 3;
    width: 100%;
    aspect-ratio: 1 / 1;
    margin-bottom: 0;
    border-radius: 8px;
  }
  .zoom-hint {
    display: none;
  }

  .header-info {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    margin-bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .status-badge {
    padding: 2px 8px;
    font-size: 0.75rem;
  }
  .right-col h2 {
    font-size: 1.1rem;
    line-height: 1.2;
  }
  .m-gender {
    font-size: 0.85rem;
  }

  .action-sub-buttons {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    margin-bottom: 0 !important;
    gap: 6px;
  }
  .btn-share,
  .btn-promo {
    padding: 8px 5px;
    font-size: 0.8rem;
  }

  .price-dashboard {
    grid-column: 1 / -1;
    grid-row: 3 / 4;
    margin-bottom: 0;
    margin-top: 5px;
    padding: 10px;
    background: var(--card-bg);
    border: 1px solid var(--bd);
  }
  .price-row {
    font-size: 0.9rem;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
  .p-lbl {
    font-size: 0.85rem;
  }
  .price-row .highest-price {
    font-size: 1.35rem;
    line-height: 1;
  }
  .price-row.sub {
    display: none;
  }

  .timer-box {
    grid-column: 1 / -1;
    grid-row: 4 / 5;
    margin: 10px 0;
    padding: 10px;
    border-radius: 8px;
  }
  .timer-title {
    font-size: 0.8rem;
    margin-bottom: 2px;
  }
  .timer-value {
    font-size: 1.5rem;
  }
  .timer-note {
    font-size: 0.7rem;
  }

  .action-box {
    grid-column: 1 / -1;
    grid-row: 5 / 6;
    padding: 12px;
    border-radius: 10px;
    margin-bottom: 10px;
  }
  .user-info-box {
    padding: 8px;
    font-size: 0.85rem;
    margin-bottom: 10px;
  }
  .nick-input-wrap {
    margin-bottom: 10px;
  }
  .nick-input {
    min-height: 44px;
    padding: 8px 12px;
    font-size: 16px;
  }
  .input-group {
    margin-bottom: 10px;
  }
  .input-group .currency {
    padding: 8px 12px;
    font-size: 1rem;
  }
  .input-group input {
    padding: 8px;
    font-size: 1.1rem;
  }

  .action-buttons {
    flex-direction: row;
    gap: 8px;
  }
  .btn-bid {
    padding: 12px;
    font-size: 1rem;
  }
  .btn-buy-now {
    padding: 12px;
    font-size: 0.85rem;
    flex: 1;
  }
  .bid-hint {
    font-size: 0.75rem;
    margin-top: 6px;
  }

  .info-section {
    grid-column: 1 / -1;
    grid-row: 6 / 7;
    margin-bottom: 10px;
  }
  .specs-list {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .specs-list li {
    padding: 8px;
    font-size: 0.85rem;
    border-radius: 6px;
  }
  .note-box {
    padding: 10px;
    font-size: 0.85rem;
    margin-top: 10px;
  }

  .bid-history {
    grid-column: 1 / -1;
    grid-row: 7 / 8;
    padding: 12px;
    border-radius: 10px;
  }
  .history-header h3 {
    font-size: 1rem;
  }
  .btn-toggle {
    font-size: 0.75rem;
    padding: 3px 8px;
  }
  .history-list li {
    padding: 8px 0;
    font-size: 0.85rem;
  }
}

@media (hover: none), (pointer: coarse), (max-width: 768px) {
  .btn-bid:hover,
  .btn-buy-now:hover,
  .btn-toggle:hover,
  .btn-login-google:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .auction-page,
  .btn-toggle,
  .btn-share,
  .btn-promo,
  .btn-logout,
  .btn-bid,
  .btn-buy-now,
  .btn-login-line,
  .btn-login-google,
  .btn-close-promo,
  .timer-box,
  .promo-modal-content {
    transition: none;
    animation: none;
  }
  .btn-bid:hover,
  .btn-buy-now:hover,
  .btn-toggle:hover {
    transform: none;
  }
  .promo-modal-content {
    transform: none;
  }
}

/* 競標詳情以交易單據層級呈現，保留倒數與安全出價的狀態語意。 */
.auction-page-wrapper,
.main-img,
.price-dashboard,
.timer-box,
.action-box,
.info-section,
.bid-history,
.note-box,
.promo-modal-content,
.promo-result-img {
  border-radius: 0;
  box-shadow: none;
}

.main-img,
.price-dashboard,
.timer-box,
.action-box,
.info-section,
.bid-history {
  background-image: none;
}

.price-dashboard,
.timer-box,
.action-box,
.info-section,
.bid-history {
  border-width: 1px 0;
}

.price-row,
.specs-list li,
.note-box {
  border-radius: 0;
  box-shadow: none;
}

.price-row {
  padding-left: 0;
  padding-right: 0;
  background: transparent;
}

.specs-list {
  gap: 0;
  border-top: 1px solid var(--bd);
  border-left: 1px solid var(--bd);
}

.specs-list li {
  border-width: 0 1px 1px 0;
  background: transparent;
}

.btn-share,
.btn-promo,
.btn-bid,
.btn-buy-now,
.btn-toggle,
.nick-input,
.input-group,
.input-group input {
  border-radius: 0;
  box-shadow: none;
}

/* 與競標清單共用白底、品牌橘、細線及直角語彙。 */
.auction-page-wrapper {
  max-width: 1440px;
  padding: clamp(18px, 2.5vw, 34px) clamp(20px, 5vw, 76px) clamp(44px, 6vw, 72px);
}

.auction-page-wrapper > .common-document-meta {
  margin-bottom: 10px;
  padding-bottom: 8px;
}

.auction-page-wrapper > :deep(.back-btn-wrap) {
  margin-bottom: 10px;
}

.auction-page-wrapper :deep(.app-back-btn),
.auction-page-wrapper .btn-app,
.btn-login-line,
.btn-login-google {
  border-radius: var(--radius-sm);
}

.detail-layout {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(24px, 4vw, 56px);
  margin-top: 0;
}

.left-col .main-img {
  aspect-ratio: 1 / 1;
  margin-bottom: 18px;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.zoom-hint {
  padding: 9px 12px;
  background: rgba(18, 15, 13, 0.76);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.bid-history,
.price-dashboard,
.timer-box,
.action-box,
.user-info-box,
.specs-list li,
.note-box {
  border-radius: 0;
  box-shadow: none;
}

.bid-history {
  padding: clamp(16px, 2vw, 22px) 0 0;
  border-width: 1px 0 0;
  background: transparent;
}

.history-header {
  padding-bottom: 10px;
  margin-bottom: 0;
}

.history-header h3 {
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1.15rem, 2vw, 1.4rem);
}

.btn-toggle {
  flex: 0 0 auto;
  padding-inline: 14px;
}

.history-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content max-content;
  gap: 14px;
  align-items: baseline;
  padding: 12px 0;
  border-bottom-style: solid;
}

.bid-amount,
.bid-time {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.empty-history {
  padding: 20px 0 0;
  color: var(--txt-muted);
  text-align: left;
}

.empty-history > p {
  margin: 0 0 12px;
}

.bid-example {
  display: inline-block;
  padding: 12px 14px;
  border: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.85rem;
  line-height: 1.7;
}

.bid-example__label {
  color: var(--pri);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.bid-example strong {
  color: var(--txt);
}

.bid-example > span:last-child {
  color: var(--pri);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.right-col .header-info {
  align-items: baseline;
  gap: 10px 14px;
  margin-bottom: 14px;
}

.right-col h2 {
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1.15;
  letter-spacing: -0.05em;
}

.m-gender {
  color: var(--txt-muted);
  font-size: 0.55em;
  opacity: 1;
  white-space: nowrap;
}

.status-badge {
  padding: 5px 9px;
  border: 1px solid currentColor;
  border-radius: 0;
  box-shadow: none;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
}

.badge-active {
  box-shadow: none;
}

.action-sub-buttons {
  gap: 8px;
  margin-bottom: 18px;
}

.btn-share,
.btn-promo {
  padding: 10px 14px;
  font-size: 0.9rem;
}

.price-dashboard {
  margin-bottom: 12px;
  padding: 16px 0;
  border-width: 1px 0;
  background: transparent;
}

.price-row .highest-price {
  color: var(--pri);
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-variant-numeric: tabular-nums;
  line-height: 1;
  text-shadow: none;
  white-space: nowrap;
}

.price-row.sub {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding-top: 10px;
  border-top-style: solid;
  color: var(--txt-muted);
  opacity: 1;
}

.price-row.sub span:last-child {
  text-align: right;
}

.timer-box {
  margin-bottom: 12px;
  padding: 16px 0;
  border-width: 0 0 1px;
  background: transparent;
  text-align: left;
}

.timer-title,
.timer-note {
  color: var(--txt-muted);
  opacity: 1;
}

.timer-value {
  color: var(--txt);
  font-family: inherit;
  font-size: clamp(1.55rem, 3vw, 2.25rem);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}

.timer-box.ending-soon {
  padding-inline: 14px;
  border: 1px solid #b42318;
  color: #b42318;
  background: transparent;
  animation: none;
}

.timer-box.ending-soon .timer-title,
.timer-box.ending-soon .timer-value,
.timer-box.ending-soon .timer-note {
  color: #b42318 !important;
}

.action-box {
  margin-bottom: 18px;
  padding: clamp(16px, 2vw, 22px);
  border: 1px solid var(--pri);
  background: transparent;
}

.action-box.ended {
  padding: 18px 0;
  border-width: 1px 0;
  background: transparent;
  text-align: left;
  opacity: 1;
}

.winner-name {
  display: block;
  margin-top: 5px;
  color: var(--pri);
  font-family: 'Noto Serif TC', serif;
  font-size: 1.35rem;
}

.user-info-box {
  padding: 10px 0;
  border-width: 0 0 1px;
  background: transparent;
}

.nick-input,
.input-group,
.input-group .currency,
.input-group input {
  background: transparent;
}

.input-group .currency {
  font-size: 0.78rem;
  white-space: nowrap;
}

.action-buttons {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1.25fr);
  gap: 8px;
}

.btn-bid,
.btn-buy-now {
  width: 100%;
  min-width: 0;
  padding: 12px 10px;
  box-shadow: none;
  white-space: nowrap;
}

.btn-bid:hover {
  transform: none;
}

.login-prompt {
  padding: 0;
  text-align: left;
}

.login-prompt p {
  margin: 0 0 14px;
  color: var(--txt);
}

.btn-login-line,
.btn-login-google {
  box-shadow: none;
}

.info-section {
  margin-bottom: 0;
  padding-top: 2px;
}

.specs-list {
  gap: 0;
  border-top: 1px solid var(--bd);
}

.specs-list li {
  padding: 12px 0;
  border-width: 0 0 1px;
  background: transparent;
}

.specs-list li:nth-child(odd) {
  padding-right: 12px;
}

.specs-list li:nth-child(even) {
  padding-left: 12px;
}

.note-box {
  margin-top: 14px;
  padding: 12px 0 12px 14px;
  border-width: 0 0 0 2px;
  background: transparent;
}

.note-content {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.loading-state,
.not-found {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-height: 280px;
  padding: clamp(40px, 7vw, 80px) 0;
  border-top: 1px solid var(--bd);
  color: var(--txt);
  text-align: left;
}

.loading-state .loader {
  margin: 0 0 16px;
}

.loading-state p,
.not-found p {
  margin: 0;
  color: var(--txt-muted);
}

.not-found h2 {
  margin: 0 0 8px;
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1.65rem, 3vw, 2.4rem);
}

.not-found > :deep(.not-found__action) {
  justify-content: flex-start;
  margin-top: 18px;
}

.promo-modal-overlay {
  background: rgba(18, 15, 13, 0.72);
  backdrop-filter: none;
}

.promo-modal-content {
  max-width: 420px;
  padding: 24px;
  border: 1px solid var(--bd);
  border-radius: 0;
  box-shadow: none;
  text-align: left;
}

.btn-close-promo {
  top: 14px;
  right: 14px;
  width: auto;
  padding-inline: 12px;
  border: 1px solid var(--bd);
  font-size: 0.78rem;
  opacity: 1;
}

.promo-modal-eyebrow {
  margin: 0 0 8px;
  color: var(--pri);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.promo-modal-content h3 {
  margin: 0;
  padding-right: 64px;
  color: var(--txt);
  font-family: 'Noto Serif TC', serif;
  font-size: 1.55rem;
}

.promo-modal-desc {
  margin: 10px 0 0;
  color: var(--txt-muted);
  font-size: 0.9rem;
  line-height: 1.7;
}

.promo-result-img {
  margin-top: 16px;
  border-radius: 0;
  box-shadow: none;
}

@media (hover: hover) and (pointer: fine) {
  .btn-share:hover,
  .btn-promo:hover,
  .btn-toggle:hover,
  .btn-logout:hover,
  .btn-buy-now:hover,
  .btn-login-google:hover {
    border-color: var(--pri);
    color: var(--pri);
    background: transparent;
  }
}

@media (max-width: 768px) {
  .auction-page-wrapper {
    padding: 10px 16px 44px;
  }

  .auction-page-wrapper > .common-document-meta {
    margin-bottom: 8px;
  }

  .auction-page-wrapper > :deep(.back-btn-wrap) {
    margin-bottom: 8px;
  }

  .detail-layout {
    grid-template-columns: minmax(104px, 34%) minmax(0, 1fr);
    gap: 10px;
  }

  .main-img,
  .status-badge,
  .action-box,
  .timer-box,
  .bid-history,
  .specs-list li {
    border-radius: 0;
  }

  .right-col h2 {
    font-size: clamp(1.1rem, 5.5vw, 1.4rem);
  }

  .status-badge {
    padding: 3px 6px;
  }

  .action-sub-buttons {
    gap: 5px;
  }

  .btn-share,
  .btn-promo {
    min-width: 0;
    padding: 8px 5px;
    font-size: 0.76rem;
    white-space: nowrap;
  }

  .price-dashboard {
    margin-top: 4px;
    padding: 12px 0;
  }

  .price-row .highest-price {
    font-size: 1.55rem;
  }

  .price-row.sub {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    font-size: 0.74rem;
  }

  .timer-box {
    margin: 6px 0;
    padding: 12px 0;
  }

  .timer-value {
    font-size: clamp(1.25rem, 6vw, 1.55rem);
    white-space: nowrap;
  }

  .action-box {
    padding: 12px 0;
    border-width: 1px 0;
  }

  .action-buttons {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .btn-bid,
  .btn-buy-now {
    padding-inline: 6px;
    font-size: 0.78rem;
  }

  .bid-history {
    padding: 14px 0 0;
  }

  .history-list li {
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: 6px 10px;
  }

  .bid-time {
    grid-column: 1 / -1;
  }

  .promo-modal-content {
    padding: 20px;
  }

  .loading-state,
  .not-found {
    min-height: 220px;
    padding: 36px 0;
  }
}

.auction-photo-error {
  min-height: 160px;
  display: grid;
  place-items: center;
  border: 1px solid var(--bd);
}
.manual-share-url {
  width: 100%;
  min-height: 40px;
  font-size: 16px;
}
dialog.promo-modal-overlay {
  margin: auto;
  border: 0;
  padding: 16px;
  width: min(560px, calc(100vw - 24px));
  height: auto;
  max-height: calc(100dvh - 24px);
  overflow: auto;
  background: var(--bg);
  color: var(--txt);
}
dialog.promo-modal-overlay:not([open]) {
  display: none;
}
dialog.promo-modal-overlay[open] {
  display: block;
}
dialog.promo-modal-overlay::backdrop {
  background: rgba(0, 0, 0, 0.65);
}
@media (max-width: 767px) {
  /* 相鄰資訊區共用緊湊節奏，保留登入及出價的觸控尺寸。 */
  .price-dashboard {
    padding-block: 8px;
    margin-bottom: 6px;
  }
  .timer-box {
    padding-block: 8px;
    margin-block: 4px;
  }
  .action-box {
    padding-block: 8px;
    margin-bottom: 10px;
  }
  .login-prompt {
    padding-block: 4px;
  }
  .login-prompt p {
    margin-bottom: 8px;
  }
  .bid-history {
    padding-top: 10px;
  }
}
.auction-photo-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 12px;
}
.auction-gallery {
  position: relative;
  min-width: 0;
}
.auction-photo-controls .photo-arrow {
  display: none;
}
.photo-page-count {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.72);
  color: white;
  font-size: 12px;
  pointer-events: none;
}
.auction-photo-controls button {
  min-width: 44px;
  min-height: 44px;
}
.auction-photo-controls button[aria-pressed='true'] {
  color: var(--pri);
  border-color: var(--pri);
}
.auction-gallery .auction-photo-error {
  aspect-ratio: 4 / 3;
  gap: 8px;
  padding: 12px;
  align-content: center;
}
.auction-gallery .main-img {
  margin-bottom: 8px;
}
.auction-gallery .btn-app {
  min-height: 44px;
}
@media (max-width: 768px) {
  .auction-gallery {
    grid-column: 1 / 2;
    grid-row: 1 / 3;
  }
  .auction-gallery .auction-photo-error {
    min-height: 0;
    width: 100%;
    aspect-ratio: 1;
    box-sizing: border-box;
    font-size: 0.78rem;
    text-align: center;
  }
  .auction-gallery .auction-photo-error .btn-app {
    max-width: 100%;
    padding-inline: 3px;
    white-space: normal;
    font-size: 12px;
  }
  .auction-photo-controls .photo-number {
    display: none;
  }
  .auction-photo-controls .photo-arrow {
    display: inline-flex;
    flex: 1;
    padding-inline: 4px;
  }
  .auction-photo-controls {
    margin-bottom: 0;
  }
}
</style>
