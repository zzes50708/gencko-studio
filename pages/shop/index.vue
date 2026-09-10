<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { GENES_DB } from '~/utils/genes-db'
import { getCleanUrl } from '~/utils/image'
import ShopFlipCard from '~/components/ShopFlipCard.vue'

const store = useMainStore()
const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

// SSR：抓取在售個體（給 schema 用，UI 仍使用 store.inv）
const { data: ssrForSale } = await useAsyncData('shop-forsale-seo-v1', async () => {
  try {
    const { data, error } = await supabase
      .from('animals')
      .select(
        'id, species, morph, genes, gender_type, gender_value, listing_price, image_url, status'
      )
      .eq('status', 'ForSale')
    if (error || !data) return []
    return data.map((a) => ({
      ID: a.id,
      Species: a.species,
      Morph: a.morph,
      Genes: Array.isArray(a.genes) ? a.genes : [],
      GenderType: a.gender_type,
      GenderValue: a.gender_value,
      ListingPrice: a.listing_price,
      ImageURL: a.image_url
    }))
  } catch (e) {
    console.error('[shop SSR] fetch failed:', e?.message)
    return []
  }
})

const sp = ref('豹紋守宮')
const kw = ref('')
const fil = ref({
  stock: true,
  sold: true,
  minP: '',
  maxP: '',
  sexM: true,
  sexF: true,
  years: [],
  genes: [],
  beginner: false
})
const showMobileFilter = ref(false)
const filterPanelEl = ref(null)
const filterTriggerEl = ref(null)
const openFCat = ref(null)
const sortOrder = ref('price_desc')
const showOnlyFav = ref(false)
const showOnlyHistory = ref(false)

const shopUrl = 'https://www.genckobreeding.com/shop'
const shopImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
const shopSeller = {
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

const itemListSchema = computed(() => {
  // SSR 優先用 supabase 直撈結果，CSR/水合後 store.inv 可能更完整
  const ssrList = (ssrForSale.value || []).filter((i) => i.Species === sp.value)
  const csrList = (store.inv || []).filter((i) => i.Status === 'ForSale' && i.Species === sp.value)
  const forSaleItems = csrList.length ? csrList : ssrList
  if (!forSaleItems.length) return null
  return {
    '@type': 'ItemList',
    '@id': `${shopUrl}#list`,
    name: `${sp.value} 在售個體列表`,
    description: `Gencko Breeding Studio 目前在售的 ${sp.value} 個體（${forSaleItems.length} 隻）`,
    url: shopUrl,
    numberOfItems: forSaleItems.length,
    itemListElement: forSaleItems.map((item, idx) => {
      const productUrl = `https://www.genckobreeding.com/product/${item.ID}`
      const geneStr = (item.Genes || []).join('、')
      const genderText =
        item.GenderType === '溫控'
          ? item.GenderValue
            ? `孵化溫度:${item.GenderValue}度（不保證性別）`
            : '孵化溫度（不保證性別）'
          : item.GenderType || ''
      return {
        '@type': 'ListItem',
        position: idx + 1,
        url: productUrl,
        item: {
          '@type': 'Product',
          '@id': `${productUrl}#product`,
          name: item.Morph,
          url: productUrl,
          image: item.ImageURL ? getCleanUrl(item.ImageURL) : shopImg,
          sku: item.ID,
          category: `寵物 > 爬蟲 > 守宮 > ${item.Species}`,
          description: `${item.Species || ''} ${item.Morph || ''}${genderText ? `（${genderText}）` : ''}${geneStr ? '，基因：' + geneStr : ''}`,
          brand: {
            '@type': 'Brand',
            name: 'Gencko Breeding Studio',
            alternateName: ['Gencko Studio', '捷客工作室']
          },
          additionalProperty: [
            ...(geneStr ? [{ '@type': 'PropertyValue', name: '基因組合', value: geneStr }] : []),
            ...(genderText ? [{ '@type': 'PropertyValue', name: '性別', value: genderText }] : []),
            ...(item.Species
              ? [{ '@type': 'PropertyValue', name: '物種', value: item.Species }]
              : [])
          ],
          offers: {
            '@type': 'Offer',
            url: productUrl,
            price: item.ListingPrice,
            priceCurrency: 'TWD',
            availability: 'https://schema.org/InStock',
            itemCondition: 'https://schema.org/NewCondition',
            areaServed: { '@type': 'Country', name: 'Taiwan' },
            seller: shopSeller
          }
        }
      }
    })
  }
})

const shopBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    { '@type': 'ListItem', position: 2, name: '線上選購', item: shopUrl }
  ]
}

const shopWebPageLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': shopUrl,
  url: shopUrl,
  name: `Gencko 守宮選購｜${sp.value} 在售個體`,
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: shopImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.shop-intro__title']
  },
  publisher: shopSeller,
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
  ...(itemListSchema.value ? { mainEntity: itemListSchema.value } : {})
}))

useHead({
  titleTemplate: '%s | Gencko Breeding Studio',
  title: '線上選購守宮｜豹紋與肥尾守宮個體',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Breeding Studio 線上選購頁，提供豹紋守宮與肥尾守宮在售個體，可依基因品系、性別、價格篩選。每隻個體均有健康保證，支援私訊購買。'
    },
    {
      name: 'keywords',
      content: '豹紋守宮購買, 肥尾守宮購買, 守宮購買, 守宮價格, 守宮品系, Gencko Studio'
    },
    // Open Graph
    { property: 'og:title', content: '線上選購守宮｜豹紋與肥尾守宮個體 Gencko Breeding Studio' },
    {
      property: 'og:description',
      content:
        '線上選購豹紋守宮與肥尾守宮在售個體，可依基因品系、性別、價格篩選，每隻個體均有健康保證。'
    },
    { property: 'og:image', content: shopImg },
    { property: 'og:image:alt', content: 'Gencko 守宮線上選購 豹紋守宮與肥尾守宮在售個體' },
    { property: 'og:url', content: shopUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '線上選購守宮｜豹紋與肥尾守宮個體' },
    {
      name: 'twitter:description',
      content: '線上選購豹紋守宮與肥尾守宮在售個體，可依基因品系、性別、價格篩選。'
    },
    { name: 'twitter:image', content: shopImg }
  ],
  link: [{ rel: 'canonical', href: shopUrl }],
  script: computed(() => [
    { type: 'application/ld+json', innerHTML: JSON.stringify(shopWebPageLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(shopBreadcrumbLd) }
  ])
})

const tags = {}

onMounted(() => {
  store.ensureInventoryLoaded()

  const q = route.query
  if (q.sp) sp.value = q.sp
  if (q.kw) kw.value = q.kw
  if (q.stock !== undefined) fil.value.stock = q.stock === 'true'
  if (q.sold !== undefined) fil.value.sold = q.sold === 'true'
  if (q.minP) fil.value.minP = q.minP
  if (q.maxP) fil.value.maxP = q.maxP
  if (q.sexM !== undefined) fil.value.sexM = q.sexM === 'true'
  if (q.sexF !== undefined) fil.value.sexF = q.sexF === 'true'
  if (q.beginner !== undefined) fil.value.beginner = q.beginner === 'true'
  if (q.years) fil.value.years = Array.isArray(q.years) ? q.years : q.years.split(',')
  if (q.genes) fil.value.genes = Array.isArray(q.genes) ? q.genes : q.genes.split(',')
  if (q.sort) sortOrder.value = q.sort

  if (q.beginner === 'true') {
    openMobileFilter()
  }
})

watch(
  [sp, kw, fil, sortOrder],
  () => {
    const query = {}
    if (sp.value !== '豹紋守宮') query.sp = sp.value
    if (kw.value) query.kw = kw.value
    if (!fil.value.stock) query.stock = 'false'
    if (!fil.value.sold) query.sold = 'false'
    if (fil.value.minP) query.minP = fil.value.minP
    if (fil.value.maxP) query.maxP = fil.value.maxP
    if (!fil.value.sexM) query.sexM = 'false'
    if (!fil.value.sexF) query.sexF = 'false'
    if (fil.value.beginner) query.beginner = 'true'
    if (fil.value.years.length) query.years = fil.value.years.join(',')
    if (fil.value.genes.length) query.genes = fil.value.genes.join(',')
    if (sortOrder.value !== 'price_desc') query.sort = sortOrder.value

    router.replace({ query }).catch(() => {})
  },
  { deep: true }
)

const availableSpecies = computed(() => {
  const set = new Set()
  for (const i of store.inv || []) {
    if (i?.Species) set.add(String(i.Species))
  }
  return Array.from(set)
})

watch(
  availableSpecies,
  (list) => {
    if (!list.length) return
    if (!list.includes(sp.value)) sp.value = list[0]
  },
  { immediate: true }
)

const getEffectiveStatus = (item) => {
  if (item.Status === 'Auction' && !(store.auctionList || []).some((a) => a.animal_id === item.ID))
    return 'ForSale'
  return item.Status
}

const maxPrice = computed(() => {
  const prices = (store.inv || [])
    .filter((i) => i.Species === sp.value && ['ForSale', 'Auction'].includes(getEffectiveStatus(i)))
    .map((i) => Number(i.ListingPrice) || 0)
  return prices.length ? Math.max(...prices) : 0
})

const availableGenes = computed(() => {
  const s = new Set()
  const targetStatus = fil.value.sold ? ['ForSale', 'Auction', 'Sold'] : ['ForSale', 'Auction']
  ;(store.inv || [])
    .filter((i) => i.Species === sp.value && targetStatus.includes(getEffectiveStatus(i)))
    .forEach((i) => {
      if (Array.isArray(i.Genes)) i.Genes.forEach((g) => s.add(g))
    })
  return Array.from(s)
})

const isGeneAvail = (g) => availableGenes.value.includes(g)

// 從 Birthday（日期字串）取出 4 位數年份，取不到則回傳空字串
const getItemYear = (item) => {
  const m = String(item?.Birthday || '').match(/\d{4}/)
  return m ? m[0] : ''
}

const availableYears = computed(() => {
  const s = new Set()
  const targetStatus = fil.value.sold ? ['ForSale', 'Auction', 'Sold'] : ['ForSale', 'Auction']
  ;(store.inv || [])
    .filter((i) => i.Species === sp.value && targetStatus.includes(getEffectiveStatus(i)))
    .forEach((i) => {
      const y = getItemYear(i)
      if (y) s.add(y)
    })
  return Array.from(s).sort((a, b) => Number(b) - Number(a))
})

const getSortedGenes = (list) => {
  return [...list].sort((a, b) => (isGeneAvail(b) ? 1 : 0) - (isGeneAvail(a) ? 1 : 0))
}

const shopList = computed(() => {
  let l = (store.inv || []).filter((i) => {
    if (i.Species !== sp.value || i.Status === 'Trash' || i.Status === 'SelfKeep') return false
    const es = getEffectiveStatus(i)
    const isSold = es === 'Sold'
    const isStock = es === 'ForSale' || es === 'Reserved' || es === 'Auction'
    if (!fil.value.sold && isSold) return false
    if (!fil.value.stock && isStock) return false

    const p = Number(i.ListingPrice) || 0
    if (fil.value.minP && p < fil.value.minP) return false
    if (fil.value.maxP && p > fil.value.maxP) return false

    const sexText = String(i.GenderType || '')
    const isM = sexText.includes('Male') || sexText.includes('公')
    const isF = sexText.includes('Female') || sexText.includes('母')
    if (!fil.value.sexM && isM) return false
    if (!fil.value.sexF && isF) return false

    if (fil.value.years.length > 0 && !fil.value.years.includes(getItemYear(i))) return false

    if (fil.value.beginner && (!i.Note || !String(i.Note).includes('新手'))) return false

    if (fil.value.genes.length > 0) {
      const iGenes = Array.isArray(i.Genes) ? i.Genes : []
      if (
        !fil.value.genes.every((g) => {
          if (g === 'WY') return iGenes.includes('WY')
          return iGenes.includes(g)
        })
      )
        return false
    }
    return true
  })

  if (kw.value) {
    const query = kw.value.toLowerCase()
    l = l.filter((i) =>
      [i.ID, i.Morph, i.Species, ...(Array.isArray(i.Genes) ? i.Genes : [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }
  if (showOnlyFav.value) l = l.filter((i) => (store.wishlist || []).includes(i.ID))
  if (showOnlyHistory.value) l = l.filter((i) => (store.history || []).includes(i.ID))

  return l
    .sort((a, b) => {
      const imgA = a.ImageURL ? 1 : 0
      const imgB = b.ImageURL ? 1 : 0
      if (imgA !== imgB) return imgB - imgA

      const statA = a.Status === 'Sold' ? 1 : 0
      const statB = b.Status === 'Sold' ? 1 : 0
      if (statA !== statB) return statA - statB

      const priceA = Number(a.ListingPrice) || 0
      const priceB = Number(b.ListingPrice) || 0
      if (sortOrder.value === 'price_asc') return priceA - priceB
      if (sortOrder.value === 'price_desc') return priceB - priceA

      return priceB - priceA
    })
    .slice(0, store.displayLimit)
})

const toggleTag = (t) => {
  kw.value = kw.value === t ? '' : t
  store.displayLimit = 20
}

// 切換物種分頁（合併為方法，避免行內多語句被 prettier 拆掉分號而解析失敗）
const selectSpecies = (species) => {
  sp.value = species
  store.displayLimit = 20
}

let searchTimer = null
const onSearchInput = (e) => {
  const val = e.target.value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    kw.value = val
    store.displayLimit = 20
  }, 300)
}

const resetFilters = ({ closePanel = true, scrollTop = true } = {}) => {
  fil.value = {
    stock: true,
    sold: true,
    minP: '',
    maxP: '',
    sexM: true,
    sexF: true,
    years: [],
    genes: [],
    beginner: false
  }
  kw.value = ''
  sortOrder.value = 'price_desc'
  showOnlyFav.value = false
  showOnlyHistory.value = false
  store.displayLimit = 20
  if (closePanel) closeMobileFilter()

  router.replace({ query: {} }).catch(() => {})

  if (import.meta.client && scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const retryData = () => store.loadDataFromAPI()

const toggleWishlist = (id) => {
  if (!store.wishlist) store.wishlist = []
  if (store.wishlist.includes(id)) {
    store.wishlist = store.wishlist.filter((x) => x !== id)
  } else {
    store.wishlist.push(id)
  }
  if (import.meta.client) localStorage.setItem('gencko_wishlist', JSON.stringify(store.wishlist))
}

const compareItems = computed(() =>
  (store.compareList || []).map((id) => (store.inv || []).find((i) => i.ID === id)).filter(Boolean)
)

const activeFilterCount = computed(() => {
  let n = 0
  if (!fil.value.stock) n++
  if (!fil.value.sold) n++
  if (fil.value.minP) n++
  if (fil.value.maxP) n++
  if (!fil.value.sexM) n++
  if (!fil.value.sexF) n++
  if (fil.value.beginner) n++
  n += fil.value.years.length
  n += fil.value.genes.length
  return n
})

const setMobileFilterLock = (locked) => {
  if (!import.meta.client) return
  document.body.classList.toggle('shop-filter-open', locked)
}

const closeMobileFilter = () => {
  showMobileFilter.value = false
  if (import.meta.client) {
    nextTick(() => filterTriggerEl.value?.focus())
  }
}

const openMobileFilter = async () => {
  showMobileFilter.value = true
  await nextTick()
  filterPanelEl.value?.querySelector('button, input, select')?.focus()
}

const onFilterKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMobileFilter()
    return
  }

  if (event.key !== 'Tab' || !filterPanelEl.value) return
  const focusables = Array.from(
    filterPanelEl.value.querySelectorAll(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => {
    const style = window.getComputedStyle(element)
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getClientRects().length > 0
    )
  })
  if (!focusables.length) return

  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(showMobileFilter, setMobileFilterLock)

onBeforeUnmount(() => {
  setMobileFilterLock(false)
  if (searchTimer) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="shop-root-container">
    <div class="shop-page-wrapper">
      <div class="common-document-meta" aria-label="選購目錄說明">
        <span>SELECTED GECKOS</span>
        <span>VIEW / COMPARE / INQUIRE</span>
      </div>
      <header class="shop-intro">
        <div>
          <p class="shop-intro__eyebrow">AVAILABLE GECKOS</p>
          <h1 class="shop-intro__title">選購守宮</h1>
        </div>
        <p class="shop-intro__copy">每一隻守宮皆保證健康無疑才上架販售。</p>
      </header>

      <!-- 發色/照片時效警語（列表頁最上方，全裝置顯示） -->
      <div class="shop-photo-notice" role="note">
        <span class="notice-icon" aria-hidden="true">PHOTO NOTE</span>
        <span>
          守宮發色以當下狀態為主；個體數量眾多，線上照片無法隨時更新，購買前歡迎私訊索取最新影片。
        </span>
      </div>

      <section class="shop-catalog-stage" aria-labelledby="shop-catalog-stage-title">
        <header class="shop-stage-heading">
          <span>01</span>
          <div>
            <p>COLLECTION FILTER</p>
            <h2 id="shop-catalog-stage-title">設定條件</h2>
          </div>
        </header>
        <div class="shop-layout">
          <!-- 手機篩選遮罩 -->
          <div
            class="filter-backdrop m-only"
            :class="{ 'filter-backdrop--show': showMobileFilter }"
            @click="closeMobileFilter"
          />

          <div
            ref="filterPanelEl"
            id="shop-filter-panel"
            class="filter-panel"
            :class="{ 'm-show': showMobileFilter }"
            :role="showMobileFilter ? 'dialog' : 'region'"
            :aria-modal="showMobileFilter ? 'true' : undefined"
            aria-labelledby="shop-filter-title"
            @keydown="onFilterKeydown"
          >
            <div class="f-header m-only">
              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--md btn-back-arrow"
                @click="closeMobileFilter"
                aria-label="返回"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  stroke="currentColor"
                  stroke-width="2.5"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span id="shop-filter-title" class="f-header-title">
                篩選條件
                <span v-if="activeFilterCount > 0" class="f-active-badge">
                  {{ activeFilterCount }}
                </span>
              </span>
              <button
                v-if="activeFilterCount > 0"
                type="button"
                class="btn-app btn-app--ghost btn-app--sm btn-clear-inline"
                @click="resetFilters({ closePanel: false, scrollTop: false })"
              >
                清除全部
              </button>
              <div v-else class="f-header-spacer" />
            </div>

            <div class="f-group">
              <div class="f-label">快速篩選</div>
              <label class="f-check" style="color: var(--pri); font-weight: bold">
                <input type="checkbox" v-model="fil.beginner" />
                新手推薦
              </label>
            </div>
            <div class="f-group">
              <div class="f-label">狀態</div>
              <label class="f-check">
                <input type="checkbox" v-model="fil.stock" />
                販售中
              </label>
              <label class="f-check">
                <input type="checkbox" v-model="fil.sold" />
                已售出
              </label>
            </div>
            <div v-if="!store.isExhibitionMode" class="f-group">
              <div class="f-label">價格（最高 {{ maxPrice }}）</div>
              <div style="display: flex; gap: 5px">
                <input
                  type="number"
                  v-model="fil.minP"
                  class="f-inp"
                  placeholder="最低"
                  aria-label="最低價格"
                />
                <input
                  type="number"
                  v-model="fil.maxP"
                  class="f-inp"
                  placeholder="最高"
                  aria-label="最高價格"
                />
              </div>
            </div>
            <div class="f-group">
              <div class="f-label">性別</div>
              <label class="f-check">
                <input type="checkbox" v-model="fil.sexM" />
                公
              </label>
              <label class="f-check">
                <input type="checkbox" v-model="fil.sexF" />
                母
              </label>
            </div>
            <div v-if="availableYears.length" class="f-group">
              <div class="f-label">年份</div>
              <label v-for="y in availableYears" :key="y" class="f-check">
                <input type="checkbox" :value="y" v-model="fil.years" />
                {{ y }} 年
              </label>
            </div>
            <div class="f-group" style="padding-bottom: 30px">
              <div class="f-label">基因篩選</div>
              <div v-for="(list, cat) in GENES_DB[sp]" :key="cat">
                <button
                  type="button"
                  class="btn-app btn-app--ghost btn-app--md f-cat"
                  :aria-expanded="openFCat === cat"
                  @click="openFCat = openFCat === cat ? null : cat"
                >
                  <span>
                    {{ cat }}
                    <span v-if="fil.genes.some((g) => list.includes(g))" class="f-cat-count">
                      {{ fil.genes.filter((g) => list.includes(g)).length }}
                    </span>
                  </span>
                  <span class="f-cat-arrow" :class="{ 'f-cat-arrow--open': openFCat === cat }">
                    ›
                  </span>
                </button>
                <div v-show="openFCat === cat" style="padding-left: 10px">
                  <div v-for="g in getSortedGenes(list)" :key="g" style="margin: 2px 0">
                    <label class="f-check" :class="{ disabled: !isGeneAvail(g) }">
                      <input
                        type="checkbox"
                        :value="g"
                        v-model="fil.genes"
                        :disabled="!isGeneAvail(g)"
                      />
                      {{ g }}
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div class="m-filter-actions m-only">
              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--md btn-clear"
                @click="resetFilters({ closePanel: false, scrollTop: false })"
              >
                清除
              </button>
              <button
                type="button"
                class="btn-app btn-app--primary btn-app--md btn-apply"
                @click="closeMobileFilter"
              >
                套用
              </button>
            </div>

            <button
              type="button"
              class="btn-app btn-app--primary btn-app--md filter-reset-button dt-only"
              style="width: 100%; margin-top: 20px; font-size: 0.9rem; padding: 10px"
              @click="resetFilters"
            >
              重置全部篩選
            </button>
          </div>

          <div style="flex: 1; min-width: 0; display: flex; flex-direction: column">
            <header class="shop-results-heading">
              <span>02</span>
              <div>
                <p>AVAILABLE RECORDS</p>
                <h2>守宮清單</h2>
              </div>
            </header>
            <div class="search-filter-row">
              <div class="inp-wrap">
                <span class="search-icon" aria-hidden="true">搜尋</span>
                <input
                  type="search"
                  class="inp"
                  :value="kw"
                  @input="onSearchInput"
                  placeholder="搜尋關鍵字或 ID..."
                  aria-label="搜尋關鍵字或編號"
                  enterkeyhint="search"
                  autocomplete="off"
                />
              </div>
              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--md btn-filter-icon m-only"
                :class="{ active: activeFilterCount > 0 }"
                ref="filterTriggerEl"
                :aria-expanded="showMobileFilter"
                aria-controls="shop-filter-panel"
                @click="openMobileFilter"
                aria-label="篩選"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  stroke="currentColor"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <span v-if="activeFilterCount > 0" class="filter-count-badge">
                  {{ activeFilterCount }}
                </span>
              </button>
            </div>

            <div class="catalog-summary" aria-live="polite">
              <span>{{ sp }}</span>
              <span>{{ shopList.length }} 隻個體</span>
            </div>

            <!-- 物種分類：獨立一列（一列兩個按鈕） -->
            <div class="species-tabs-row">
              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--md chip-tab main-tab"
                :class="{ active: sp === '豹紋守宮' }"
                :aria-pressed="sp === '豹紋守宮'"
                @click="selectSpecies('豹紋守宮')"
              >
                豹紋守宮
              </button>
              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--md chip-tab main-tab"
                :class="{ active: sp === '肥尾守宮' }"
                :aria-pressed="sp === '肥尾守宮'"
                @click="selectSpecies('肥尾守宮')"
              >
                肥尾守宮
              </button>
            </div>

            <div class="scroll-chips-row">
              <select v-model="sortOrder" class="chip-select" aria-label="排序方式">
                <option value="price_desc">價格：高 → 低</option>
                <option value="price_asc">價格：低 → 高</option>
              </select>

              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--md chip-toggle chip-toggle--history"
                :class="{ active: showOnlyHistory }"
                :aria-pressed="showOnlyHistory"
                @click="showOnlyHistory = !showOnlyHistory"
              >
                歷史紀錄
              </button>
              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--md chip-toggle chip-toggle--fav"
                :class="{ active: showOnlyFav }"
                :aria-pressed="showOnlyFav"
                @click="showOnlyFav = !showOnlyFav"
              >
                只看收藏
              </button>

              <div class="chip-divider"></div>

              <button
                v-for="t in tags[sp] || []"
                :key="t"
                type="button"
                class="btn-app btn-app--ghost btn-app--md chip-tag"
                :class="{ sel: kw === t }"
                :aria-pressed="kw === t"
                @click="toggleTag(t)"
              >
                {{ t }}
              </button>
            </div>

            <h2 class="sr-only">{{ sp }} 商品列表</h2>
            <div v-if="store.loading && !shopList.length" class="grid photo-grid">
              <SkeletonCard v-for="n in 12" :key="n" :square="true" />
            </div>
            <Transition v-else name="sp-fade" mode="out-in">
              <div :key="sp">
                <transition-group tag="div" name="shoplist" class="grid photo-grid">
                  <div v-if="store.dataError" key="error-msg" class="shop-empty-state">
                    <div class="empty-icon">!</div>
                    <h3>商品資料載入失敗</h3>
                    <p>請檢查網路連線後再試一次。</p>
                    <button
                      type="button"
                      class="btn-app btn-app--primary btn-app--md empty-state-action"
                      @click="retryData"
                    >
                      重新載入
                    </button>
                  </div>
                  <div v-else-if="shopList.length === 0" key="empty-msg" class="shop-empty-state">
                    <div class="empty-icon">無</div>
                    <h3 style="color: var(--txt); margin-bottom: 10px">目前沒有符合條件的商品</h3>
                    <p style="font-size: 0.9rem">請調整篩選條件或清除篩選後再試一次。</p>
                    <button
                      type="button"
                      class="btn-app btn-app--primary btn-app--md empty-state-action"
                      @click="resetFilters"
                      style="margin-top: 20px"
                    >
                      重置篩選
                    </button>
                  </div>

                  <ShopFlipCard
                    v-for="(i, index) in shopList"
                    :key="i.ID"
                    :item="i"
                    :index="index"
                    :is-wishlisted="(store.wishlist || []).includes(i.ID)"
                    :is-compared="(store.compareList || []).includes(i.ID)"
                    :compare-disabled="
                      (store.compareList || []).length >= 3 &&
                      !(store.compareList || []).includes(i.ID)
                    "
                    :has-auction="(store.auctionList || []).some((a) => a.animal_id === i.ID)"
                    :show-mobile-meta="true"
                    :show-mobile-genes="false"
                    :show-interactive-grid="false"
                    :on-toggle-wishlist="toggleWishlist"
                    :on-toggle-compare="store.toggleCompare"
                  />
                </transition-group>
              </div>
            </Transition>
          </div>
        </div>
      </section>
    </div>

    <Teleport to="body">
      <Transition name="cmp-bar">
        <div v-if="(store.compareList || []).length > 0" class="compare-bar">
          <div class="cmp-bar-items">
            <div v-for="item in compareItems" :key="item.ID" class="cmp-bar-item">
              <img
                v-if="item.ImageURL"
                :src="getCleanUrl(item.ImageURL, 80)"
                :alt="item.Morph"
                loading="lazy"
                decoding="async"
              />
              <div v-else class="cmp-bar-placeholder">＋</div>
              <span class="cmp-bar-name">{{ item.Morph }}</span>
              <button
                type="button"
                class="btn-app btn-app--ghost btn-app--sm cmp-bar-remove"
                :aria-label="`移除 ${item.Morph} 比較項目`"
                @click="store.toggleCompare(item.ID)"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div
              v-for="n in 3 - (store.compareList || []).length"
              :key="'empty-' + n"
              class="cmp-bar-empty"
            >
              + 加入比較
            </div>
          </div>
          <div class="cmp-bar-actions">
            <NuxtLink
              no-prefetch
              :to="`/compare?ids=${(store.compareList || []).join(',')}`"
              class="btn-app btn-app--primary btn-app--sm btn-app--pill cmp-go-btn"
            >
              前往比較（{{ (store.compareList || []).length }}）
            </NuxtLink>
            <button
              type="button"
              class="btn-app btn-app--ghost btn-app--sm btn-app--pill cmp-clear-btn"
              @click="store.clearCompare()"
            >
              清空
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
:global(body.shop-filter-open) {
  overflow: hidden;
}

.shop-page-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 1300px;
  margin: 0 auto;
}
.shop-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.shop-photo-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid var(--bd);
  border-left: 3px solid var(--pri);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--txt);
  opacity: 0.9;
  font-size: 0.85rem;
  line-height: 1.5;
}
.shop-photo-notice .notice-icon {
  flex-shrink: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}
@media (max-width: 768px) {
  .shop-photo-notice {
    margin: 6px 0 12px;
    font-size: 0.78rem;
    padding: 9px 12px;
  }
}

.dt-only {
  display: block;
}
.m-only {
  display: none !important;
}

.search-filter-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  width: 100%;
}
.inp-wrap {
  position: relative;
  flex: 1;
  margin-bottom: 0;
}
.inp {
  width: 100%;
  padding: 10px 12px 10px 48px;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  color: var(--txt);
  border-radius: 8px;
  box-sizing: border-box;
  font-size: 0.95rem;
  font-weight: 500;
  transition: 0.3s;
}
.inp:focus {
  border-color: var(--pri);
  outline: none;
  box-shadow: 0 0 10px var(--pri-glow);
}
.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--txt);
  opacity: 0.5;
  font-size: 1rem;
  pointer-events: none;
  white-space: nowrap;
}

.btn-filter-icon {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  color: var(--txt);
  border-radius: 8px;
  width: 44px;
  min-height: var(--control-min-height);
  height: var(--control-min-height);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: 0.2s;
}
.btn-filter-icon.active {
  background: var(--pri);
  color: #fff;
  border-color: var(--pri);
  box-shadow: 0 0 8px var(--pri-glow);
}
.filter-count-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  background: #e8440a;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  min-width: 17px;
  height: 17px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  border: 1.5px solid var(--bg, #111);
  line-height: 1;
}

.scroll-chips-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 10px;
  scrollbar-width: none;
  align-items: center;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  width: 100%;
}
.scroll-chips-row::-webkit-scrollbar {
  display: none;
}

/* 物種分類獨立一列：一列兩個按鈕、滿版置中 */
.species-tabs-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}
.species-tabs-row .chip-tab {
  width: 100%;
  text-align: center;
  flex-shrink: 1;
  padding: 8px 12px;
}

.chip-tab {
  min-height: var(--control-min-height);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  cursor: pointer;
  color: var(--txt);
  font: inherit;
  appearance: none;
  opacity: 0.7;
  transition: 0.2s;
  flex-shrink: 0;
}
.chip-tab.active {
  background: var(--pri);
  color: #fff;
  border-color: var(--pri);
  box-shadow: 0 0 8px var(--pri-glow);
  opacity: 1;
}

.chip-divider {
  width: 1px;
  height: 16px;
  background: var(--bd);
  flex-shrink: 0;
  margin: 0 2px;
  opacity: 0.5;
}

.chip-select {
  background-color: var(--card-bg);
  color: var(--txt);
  border: 1px solid var(--bd);
  padding: 6px 30px 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  outline: none;
  flex-shrink: 0;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  text-align: left;
  /* 自訂下拉箭頭（appearance:none 移除原生箭頭後補回，符合官網 pill 風格） */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23e8440a' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  transition: 0.2s;
}
.chip-select:focus {
  border-color: var(--pri);
  color: var(--pri);
}

.chip-toggle {
  min-height: var(--control-min-height);
  padding: 6px 10px;
  border-radius: 20px;
  border: 1px solid var(--bd);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--txt);
  opacity: 0.7;
  background: var(--card-bg);
  font: inherit;
  appearance: none;
  transition: 0.2s;
  flex-shrink: 0;
}
.chip-toggle--history.active {
  background: #2196f3;
  color: #fff;
  border-color: #2196f3;
  opacity: 1;
}
.chip-toggle--fav.active {
  background: #e91e63;
  color: #fff;
  border-color: #e91e63;
  opacity: 1;
}

.chip-tag {
  min-height: var(--control-min-height);
  font-size: 0.8rem;
  padding: 6px 10px;
  background: var(--card-bg);
  border: 1px dashed var(--bd);
  border-radius: 20px;
  color: var(--txt);
  opacity: 0.8;
  cursor: pointer;
  font: inherit;
  appearance: none;
  transition: 0.3s;
  flex-shrink: 0;
}
.chip-tag.sel {
  background: var(--pri);
  color: #fff;
  border: solid 1px var(--pri);
  font-weight: bold;
  opacity: 1;
}

.filter-panel {
  width: 240px;
  flex-shrink: 0;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 15px;
  height: fit-content;
}
.f-group {
  margin-bottom: 10px;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--bd);
}
.f-group:last-child {
  border-bottom: none;
}
.f-label {
  font-weight: bold;
  color: var(--pri);
  margin-bottom: 5px;
  font-size: 0.82rem;
}
.f-check {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  min-height: var(--control-min-height);
  padding: 5px 0;
  margin-bottom: 0;
  font-size: 0.8rem;
  color: var(--txt);
  opacity: 0.8;
}
.f-check input {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.f-check.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.f-cat {
  width: 100%;
  min-height: var(--control-min-height);
  cursor: pointer;
  padding: 10px 12px;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  margin-bottom: 6px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  font: inherit;
  color: var(--txt);
  text-align: left;
  appearance: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  transition:
    border-color 0.18s,
    background 0.18s;
}

@media (hover: hover) and (pointer: fine) {
  .f-check:hover {
    opacity: 1;
  }
  .f-cat:hover {
    border-color: var(--pri);
  }
}

.btn-filter-icon:focus-visible,
.chip-tab:focus-visible,
.chip-select:focus-visible,
.chip-toggle:focus-visible,
.chip-tag:focus-visible,
.f-cat:focus-visible,
.btn-clear-inline:focus-visible,
.btn-clear:focus-visible,
.btn-apply:focus-visible,
.cmp-bar-remove:focus-visible,
.cmp-clear-btn:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 2px;
}
.f-cat-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--pri);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  padding: 0 4px;
  margin-left: 4px;
  vertical-align: middle;
}
.f-cat-arrow {
  font-size: 1.2rem;
  line-height: 1;
  color: var(--txt);
  opacity: 0.45;
  transition: transform 0.2s ease;
  display: inline-block;
}
.f-cat-arrow--open {
  transform: rotate(90deg);
  opacity: 0.8;
}
.f-inp {
  width: 100%;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  color: var(--txt);
  padding: 8px;
  border-radius: 6px;
  font-size: 0.9rem;
}
.f-inp:focus {
  border-color: var(--pri);
  outline: none;
}

@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }
  .m-only {
    display: flex !important;
  }

  .shop-page-wrapper {
    padding: 5px 10px 15px 10px;
  }
  .shop-layout {
    flex-direction: column;
    align-items: stretch;
    gap: 0;
  }

  /* ── 遮罩 ── */
  .filter-backdrop {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 99999;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .filter-backdrop--show {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }

  /* ── 篩選面板 ── */
  .filter-panel {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 92dvh;
    z-index: 100000;
    background: var(--card-bg);
    overflow-y: auto;
    border-radius: 20px 20px 0 0;
    padding: 0 20px calc(90px + env(safe-area-inset-bottom, 0px)) 20px;
    margin: 0;
    flex-shrink: unset;
    box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.28);
    overscroll-behavior: contain;
  }
  .filter-panel.m-show {
    display: block;
    animation: filterSlideUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes filterSlideUp {
    from {
      transform: translateY(100%);
      opacity: 0.6;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* ── 面板頂部拖曳把手 ── */
  .filter-panel::before {
    content: '';
    display: block;
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--bd);
    margin: 12px auto 0;
    opacity: 0.6;
  }

  /* ── 篩選 Header ── */
  .f-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 14px 0 18px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--bd);
  }
  .btn-back-arrow {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    color: var(--txt);
    border-radius: 50%;
    width: 44px;
    min-height: var(--control-min-height);
    height: var(--control-min-height);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  .f-header-title {
    flex: 1;
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--txt);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .f-active-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--pri);
    color: #fff;
    font-size: 0.68rem;
    font-weight: 800;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    padding: 0 5px;
    line-height: 1;
  }
  .btn-clear-inline {
    background: transparent;
    border: none;
    color: var(--pri);
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    min-height: var(--control-min-height);
    padding: 4px 0;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .f-header-spacer {
    width: 56px;
    flex-shrink: 0;
  }

  /* ── 底部操作列 ── */
  .m-filter-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    gap: 10px;
    padding: 12px 20px calc(12px + env(safe-area-inset-bottom, 0px)) 20px;
    background: var(--card-bg);
    border-top: 1px solid var(--bd);
    z-index: 10;
    box-sizing: border-box;
  }
  .btn-clear {
    flex: 1;
    padding: 13px;
    min-height: var(--control-min-height);
    border-radius: 12px;
    background: transparent;
    border: 1px solid var(--bd);
    color: var(--txt);
    font-weight: 700;
    font-size: 0.95rem;
    cursor: pointer;
  }
  .btn-apply {
    flex: 2;
    padding: 13px;
    min-height: var(--control-min-height);
    border-radius: 12px;
    background: var(--pri);
    border: none;
    color: #fff;
    font-weight: 800;
    font-size: 0.95rem;
    box-shadow: 0 4px 14px var(--pri-glow);
    cursor: pointer;
  }

  .grid.photo-grid {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 10px !important;
  }

  /* 注意：卡片已改成元件（ShopFlipCard），scoped 樣式不會套用到子元件內部
       所以這裡用 :deep 確保圖片尺寸在切換物種時不會閃成大圖。 */
  :deep(.card-img.slim-img) {
    height: auto !important;
    aspect-ratio: 1 / 1 !important;
    display: block;
    width: 100%;
    object-fit: cover;
  }
  .slim-body {
    padding: 6px !important;
  }
  .slim-title {
    font-size: 0.85rem !important;
    margin-bottom: 2px !important;
  }
  /* 價格縮小並避免超出卡片（#手機修正 b）；ShopFlipCard 為子元件，需 :deep 才能套入 */
  :deep(.slim-price) {
    font-size: 0.88rem !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  :deep(.slim-price-row) {
    min-width: 0;
  }
  :deep(.slim-title) {
    font-size: 0.9rem !important;
  }

  .trust-badge {
    font-size: 0.5rem;
    padding: 2px 4px;
    bottom: 2px;
    left: 2px;
  }
  .card-action-stack {
    top: 3px;
    right: 3px;
    gap: 4px;
  }
  .card-action-btn {
    padding: 5px 8px;
    font-size: 0.78rem;
  }
  .sold-stamp {
    font-size: 0.55rem;
    padding: 2px 4px;
    top: 4px;
    left: 4px;
  }
  .status-badge {
    padding: 2px 6px !important;
    font-size: 0.75rem !important;
  }
  .shop-empty-state {
    grid-column: 1 / -1 !important;
  }
  .compare-bar {
    padding: 10px 12px;
    gap: 8px;
    flex-direction: column;
  }
  .cmp-bar-items {
    gap: 6px;
  }
  .cmp-bar-item {
    width: 70px;
  }
  .cmp-bar-item img {
    width: 40px;
    height: 40px;
  }
  .cmp-bar-name {
    font-size: 0.62rem;
  }
}

.shop-empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 50px 20px;
  color: var(--txt);
  opacity: 0.6;
}

.card-action-stack {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* 物種切換：整個 grid 淡出再淡入，避免大量卡片同時 enter/leave 造成版面崩塌 */
.sp-fade-enter-active,
.sp-fade-leave-active {
  transition: opacity 0.18s ease;
}
.sp-fade-enter-from,
.sp-fade-leave-to {
  opacity: 0;
}

/* 個別卡片篩選/排序：純淡入淡出，不做 transform 也不做 FLIP move，
   避免大量卡片同時跑 GPU 合成層造成卡頓 */
:deep(.shoplist-enter-active),
:deep(.shoplist-leave-active) {
  transition: opacity 0.15s ease;
}
:deep(.shoplist-enter-from),
:deep(.shoplist-leave-to) {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sp-fade-enter-active,
  .sp-fade-leave-active {
    transition: none !important;
  }
  .sp-fade-enter-from,
  .sp-fade-leave-to {
    opacity: 1 !important;
  }

  :deep(.shoplist-enter-active),
  :deep(.shoplist-leave-active) {
    transition: none !important;
  }
  :deep(.shoplist-enter-from),
  :deep(.shoplist-leave-to) {
    opacity: 1 !important;
  }
}

.card-action-btn {
  white-space: nowrap;
  padding: 6px 10px;
  /* 疊在圖片上時，避免「只有文字沒有形式」 */
  background: var(--card-bg-solid);
  border-color: var(--bd-solid);
  color: #fff;
}

.card-action-btn--active {
  border-color: var(--pri) !important;
  color: var(--pri) !important;
  opacity: 1 !important;
}

.compare-bar {
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 9000;
  background: var(--card-bg);
  border: 1px solid var(--bd-hover);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    0 0 0 1px var(--pri-glow-soft);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 340px;
  max-width: 90vw;
  backdrop-filter: blur(12px);
}
.cmp-bar-items {
  display: flex;
  gap: 10px;
  flex: 1;
  align-items: center;
}
.cmp-bar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  width: 80px;
  position: relative;
}
.cmp-bar-item img {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--bd);
}
.cmp-bar-placeholder {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  background: var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.cmp-bar-name {
  font-size: 0.68rem;
  font-weight: bold;
  color: var(--txt);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
  text-align: center;
}
.cmp-bar-remove {
  position: absolute;
  top: -8px;
  right: -8px;
  width: var(--control-min-height);
  min-height: var(--control-min-height);
  height: var(--control-min-height);
  border-radius: 50%;
  background: #e74c3c;
  border: none;
  color: #fff;
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  /* 擴大觸控區域 */
  padding: 0;
  touch-action: manipulation;
}
.cmp-bar-empty {
  width: 80px;
  height: 50px;
  border-radius: 8px;
  border: 2px dashed var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--txt);
  opacity: 0.4;
}
.cmp-bar-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cmp-go-btn {
  text-align: center;
  width: 100%;
}
.cmp-clear-btn {
  white-space: nowrap;
  width: 100%;
  min-height: var(--control-min-height);
}

.cmp-bar-enter-active,
.cmp-bar-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.cmp-bar-enter-from,
.cmp-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (prefers-reduced-motion: reduce) {
  .btn-filter-icon,
  .chip-tab,
  .chip-select,
  .chip-toggle,
  .chip-tag,
  .f-cat,
  .f-cat-arrow,
  .filter-backdrop,
  .cmp-bar-enter-active,
  .cmp-bar-leave-active {
    transition: none !important;
    animation: none !important;
  }
  .filter-panel.m-show {
    animation: none !important;
  }
}

/* Boutique catalog shell */
.shop-root-container {
  min-height: 100vh;
  background: var(--bg);
}

.shop-page-wrapper {
  max-width: 1440px;
  padding: clamp(38px, 6vw, 88px) clamp(20px, 5vw, 76px) 100px;
}

.shop-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 460px);
  align-items: end;
  gap: 40px;
  margin-bottom: 38px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--bd);
}

.shop-intro__eyebrow {
  margin: 0 0 12px;
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.shop-intro__title {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(2.7rem, 6vw, 5.8rem);
  font-weight: 700;
  line-height: 0.96;
  letter-spacing: -0.06em;
}

.shop-intro__copy {
  max-width: 32em;
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.94rem;
  line-height: 1.9;
}

.shop-catalog-stage {
  margin-top: clamp(28px, 5vw, 58px);
  padding-top: 20px;
  border-top: 1px solid var(--bd);
}

.shop-stage-heading,
.shop-results-heading {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-bottom: 22px;
}

.shop-stage-heading > span,
.shop-results-heading > span {
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

.shop-stage-heading p,
.shop-results-heading p {
  margin: 0 0 4px;
  color: var(--txt-muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.shop-stage-heading h2,
.shop-results-heading h2 {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1.25rem, 2vw, 1.75rem);
  letter-spacing: -0.04em;
}

.shop-results-heading {
  margin-bottom: 16px;
}

.shop-photo-notice {
  align-items: center;
  gap: 18px;
  margin-bottom: 36px;
  padding: 15px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  color: var(--txt-muted);
  font-size: 0.78rem;
}

.shop-photo-notice .notice-icon {
  color: var(--pri);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.shop-layout {
  gap: clamp(28px, 4vw, 56px);
}

.filter-panel {
  width: 220px;
  padding: 0 24px 0 0;
  border: 0;
  border-right: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}

.f-group {
  margin-bottom: 20px;
  padding-bottom: 16px;
}

.f-label {
  margin-bottom: 8px;
  color: var(--txt);
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.f-check {
  padding: 3px 0;
  font-size: 0.78rem;
}

.f-check input {
  accent-color: var(--pri);
}

.f-cat {
  padding: 7px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  font-size: 0.78rem;
}

.f-inp,
.inp {
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.f-inp:focus,
.inp:focus {
  border-color: var(--pri);
  box-shadow: none;
}

.inp {
  min-height: 50px;
  padding: 10px 14px 10px 54px;
  font-size: 0.86rem;
}

.search-icon {
  left: 0;
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  opacity: 1;
}

.species-tabs-row {
  gap: 0;
  margin: 12px 0 0;
  border-bottom: 1px solid var(--bd);
}

.chip-tab,
.chip-toggle,
.chip-tag,
.chip-select {
  border: 0;
  border-radius: 0;
  background-color: transparent;
  box-shadow: none;
}

.species-tabs-row .chip-tab {
  border-bottom: 2px solid transparent;
  color: var(--txt-muted);
}

.species-tabs-row .chip-tab.active {
  border-color: var(--pri);
  background: transparent;
  box-shadow: none;
  color: var(--pri);
}

.scroll-chips-row {
  gap: 8px;
  margin: 0 0 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--bd);
}

.chip-select,
.chip-toggle,
.chip-tag {
  min-height: 38px;
  padding-top: 6px;
  padding-bottom: 6px;
  font-size: 0.72rem;
}

.chip-toggle.active,
.chip-tag.sel {
  border-bottom: 1px solid var(--pri);
  background: transparent;
  color: var(--pri);
}

.catalog-summary {
  display: flex;
  justify-content: space-between;
  margin: 4px 0 20px;
  color: var(--txt-muted);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.photo-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(24px, 3vw, 44px) clamp(14px, 2vw, 28px);
}

:deep(.photo-grid .card-img),
:deep(.photo-grid .slim-img) {
  aspect-ratio: 1 / 1;
}

/* 選購型錄統一為直角展示，保留翻面與卡片內操作。 */
:deep(.photo-grid .flip-card),
:deep(.photo-grid .flip-face),
:deep(.photo-grid .flip-back-inner),
:deep(.photo-grid .card-img.slim-img),
:deep(.photo-grid .slim-body) {
  border-radius: 0 !important;
}

.compare-bar {
  border: 1px solid var(--bd);
  border-radius: 3px;
  background: var(--card-bg-solid);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.16);
  backdrop-filter: none;
}

@media (max-width: 768px) {
  .shop-page-wrapper {
    padding: 30px 16px 96px;
  }

  .shop-intro {
    grid-template-columns: 1fr;
    gap: 18px;
    margin-bottom: 22px;
    padding-bottom: 22px;
  }

  .shop-intro__title {
    font-size: clamp(2.5rem, 14vw, 4rem);
  }

  .shop-intro__copy {
    font-size: 0.84rem;
    line-height: 1.7;
  }

  .shop-photo-notice {
    align-items: flex-start;
    margin: 0 0 22px;
    padding: 12px 0;
    font-size: 0.72rem;
  }

  .filter-panel {
    padding: 0 18px calc(90px + env(safe-area-inset-bottom, 0px));
    border: 0;
    border-radius: 0;
    background: var(--card-bg-solid);
    box-shadow: 0 -12px 60px rgba(0, 0, 0, 0.16);
  }

  .filter-panel::before {
    border-radius: 0;
  }

  .btn-back-arrow,
  .btn-clear,
  .btn-apply,
  .btn-filter-icon {
    border-radius: 2px;
    box-shadow: none;
  }

  .grid.photo-grid {
    gap: 28px 10px !important;
  }

  :deep(.card-img.slim-img) {
    aspect-ratio: 1 / 1 !important;
  }

  .compare-bar {
    width: calc(100vw - 24px);
    min-width: 0;
  }
}

/* 本頁驗收調整：緊縮頁首，並讓桌機篩選與結果共用同一條水平基準。 */
.shop-page-wrapper {
  padding-top: clamp(16px, 2vw, 28px);
}

.common-document-meta {
  max-width: none;
  margin-bottom: 10px;
  padding-bottom: 8px;
}

.shop-intro {
  gap: clamp(20px, 3vw, 36px);
  margin-bottom: 12px;
  padding-bottom: 16px;
}

.shop-intro__eyebrow {
  margin-bottom: 8px;
}

.shop-photo-notice {
  margin-bottom: 10px;
  padding-block: 9px;
}

.shop-catalog-stage {
  margin-top: 0;
  padding-top: 12px;
}

.shop-stage-heading,
.shop-results-heading {
  margin-bottom: 14px;
}

.shop-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

.filter-reset-button {
  width: auto !important;
  margin-top: 0 !important;
  justify-self: end;
  padding-inline: 20px !important;
  border-radius: 2px;
}

.empty-state-action {
  margin-top: 20px;
  border-radius: 2px;
}

.shop-empty-state h3 {
  margin-bottom: 10px;
  color: var(--txt);
}

.shop-empty-state p {
  font-size: 0.9rem;
}

.cmp-bar-empty {
  min-height: var(--control-min-height);
  border-width: 1px;
  border-radius: 2px;
  background: transparent;
  color: var(--txt-muted);
  opacity: 1;
}

@media (min-width: 769px) {
  .filter-panel {
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 20px;
    width: 100%;
    padding: 0 0 20px;
    border-right: 0;
    border-bottom: 1px solid var(--bd);
  }

  .filter-panel > .f-group {
    min-width: 0;
    margin: 0;
    padding: 0 18px 0 0;
    border-right: 1px solid var(--bd);
    border-bottom: 0;
  }

  .filter-panel > .f-group:last-of-type {
    padding-right: 0;
    border-right: 0;
  }

  .filter-panel .f-check {
    min-height: 38px;
  }

  .filter-reset-button {
    grid-column: 1 / -1;
  }
}

@media (min-width: 769px) and (max-width: 1100px) {
  .filter-panel {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filter-panel > .f-group:nth-of-type(4) {
    padding-right: 0;
    border-right: 0;
  }
}

@media (max-width: 768px) {
  .shop-page-wrapper {
    padding-top: 14px;
  }

  .common-document-meta {
    gap: 4px;
    margin-bottom: 8px;
    padding-bottom: 8px;
  }

  .shop-intro {
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 12px;
  }

  .shop-intro__eyebrow {
    margin-bottom: 6px;
  }

  .shop-photo-notice {
    margin-bottom: 8px;
    padding-block: 8px;
  }

  .shop-catalog-stage {
    padding-top: 8px;
  }

  .shop-stage-heading,
  .shop-results-heading {
    margin-bottom: 12px;
  }

  .filter-panel .f-group {
    overflow: visible;
  }

  .filter-panel .f-check {
    width: 100%;
  }

  .btn-clear,
  .btn-apply,
  .btn-back-arrow,
  .btn-filter-icon,
  .empty-state-action {
    border-radius: 2px;
  }
}
</style>
