<script setup>
import { ref, computed, onBeforeUnmount, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient, useState } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { GENES_DB } from '~/utils/genes-db'
import { getCleanUrl } from '~/utils/image'
import ShopFlipCard from '~/components/ShopFlipCard.vue'
import { useMediaQuery } from '@vueuse/core'
import {
  createShopFilters,
  cloneShopFilters,
  filterShopItems,
  getPriceRangeError,
  retainSpeciesGenes
} from '~/utils/shop-catalog'
import { getWishlistInquiryLink } from '~/utils/animal-inquiry'

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
  sold: false,
  minP: '',
  maxP: '',
  sexM: true,
  sexF: true,
  years: [],
  genes: [],
  beginner: false
})
const desktopFiltersExpanded = useState('shop-filter-expanded-v2', () => false)
const sortOrder = ref('price_desc')
const showOnlyFav = useState('shop-only-favorites', () => false)
const showOnlyHistory = useState('shop-only-history', () => false)

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

const mobile = useMediaQuery('(max-width: 767px)')
const filterModal = useHistoryModal('shop-filters', () => mobile.value)
const showMobileFilter = filterModal.isOpen
const filterDialog = filterModal.dialog
const selectionModal = useHistoryModal('shop-selection')
const selectionDialog = selectionModal.dialog
const editingFilters = ref(cloneShopFilters(fil.value))
const hydrated = ref(false)
const priceError = computed(() => getPriceRangeError(editingFilters.value))
const wishlistLink = computed(() => getWishlistInquiryLink(store.lineLink, store.wishlist || []))
const compareItems = computed(() =>
  (store.compareList || []).map((id) => store.inv.find((item) => item.ID === id)).filter(Boolean)
)
const availableSpecies = computed(() => [
  ...new Set(store.inv.map((item) => item.Species).filter(Boolean))
])
const catalogOptions = (filters) => ({
  species: sp.value,
  filters,
  keyword: kw.value,
  sort: sortOrder.value,
  favorites: store.wishlist || [],
  history: store.history || [],
  onlyFavorites: showOnlyFav.value,
  onlyHistory: showOnlyHistory.value,
  auctions: store.auctionList || []
})
const allMatches = computed(() => filterShopItems(store.inv || [], catalogOptions(fil.value)))
const shopList = computed(() => allMatches.value.slice(0, store.displayLimit))
const draftCount = computed(() =>
  priceError.value
    ? 0
    : filterShopItems(store.inv || [], catalogOptions(editingFilters.value)).length
)
const selectedConditions = computed(() => {
  const filters = fil.value,
    conditions = []
  const add = (key, label, value = null) => conditions.push({ key, label, value })
  if (!filters.stock) add('stock', '不含販售中')
  if (filters.sold) add('sold', '包含已售出')
  if (filters.minP !== '') add('minP', `最低 $${filters.minP}`)
  if (filters.maxP !== '') add('maxP', `最高 $${filters.maxP}`)
  if (!filters.sexM) add('sexM', '不含公')
  if (!filters.sexF) add('sexF', '不含母')
  if (filters.beginner) add('beginner', '新手推薦')
  filters.years.forEach((year) => add('years', `${year} 年`, year))
  filters.genes.forEach((gene) => add('genes', gene, gene))
  return conditions
})
const activeFilterCount = computed(() => selectedConditions.value.length)
const removeCondition = (condition) => {
  const next = cloneShopFilters(fil.value)
  if (condition.value !== null)
    next[condition.key] = next[condition.key].filter((value) => value !== condition.value)
  else next[condition.key] = createShopFilters()[condition.key]
  fil.value = next
  editingFilters.value = cloneShopFilters(next)
  store.displayLimit = 20
}
const updateFilters = (next) => {
  editingFilters.value = next
  if (!showMobileFilter.value && !getPriceRangeError(next)) {
    fil.value = cloneShopFilters(next)
    store.displayLimit = 20
  }
}
const closeMobileFilter = () => filterModal.close()
const openMobileFilter = () => {
  editingFilters.value = cloneShopFilters(fil.value)
  filterModal.open()
}
watch(showMobileFilter, (open) => {
  if (open) editingFilters.value = cloneShopFilters(fil.value)
})
const applyMobileFilters = async () => {
  if (priceError.value) return
  const committed = cloneShopFilters(editingFilters.value)
  await closeMobileFilter()
  fil.value = committed
  store.displayLimit = 20
}
const clearDraft = () => {
  editingFilters.value = createShopFilters()
  filterResetVersion.value += 1
}
const filterResetVersion = ref(0)
const resetFilters = async () => {
  clearTimeout(searchTimer)
  if (showMobileFilter.value) await closeMobileFilter()
  fil.value = createShopFilters()
  editingFilters.value = cloneShopFilters(fil.value)
  kw.value = ''
  searchText.value = ''
  filterResetVersion.value += 1
  sortOrder.value = 'price_desc'
  showOnlyFav.value = false
  showOnlyHistory.value = false
  store.displayLimit = 20
}
const selectSpecies = (species) => {
  sp.value = species
  fil.value = retainSpeciesGenes(fil.value, GENES_DB[species])
  editingFilters.value = cloneShopFilters(fil.value)
  store.displayLimit = 20
}
watch(availableSpecies, (list) => {
  if (list.length && !list.includes(sp.value)) selectSpecies(list[0])
})
watch(mobile, async (enabled) => {
  if (!enabled && showMobileFilter.value) await closeMobileFilter()
  if (!enabled && selectionModal.isOpen.value) await selectionModal.close()
})
onMounted(() => {
  store.ensureInventoryLoaded()
  const q = route.query
  sp.value = typeof q.sp === 'string' && GENES_DB[q.sp] ? q.sp : '豹紋守宮'
  kw.value = typeof q.kw === 'string' ? q.kw : ''
  searchText.value = kw.value
  const filters = createShopFilters()
  for (const key of ['stock', 'sold', 'sexM', 'sexF', 'beginner'])
    if (q[key] !== undefined) filters[key] = q[key] === 'true'
  for (const key of ['minP', 'maxP']) if (typeof q[key] === 'string') filters[key] = q[key]
  for (const key of ['years', 'genes'])
    if (q[key])
      filters[key] = Array.isArray(q[key]) ? q[key].filter(Boolean) : String(q[key]).split(',')
  editingFilters.value = retainSpeciesGenes(filters, GENES_DB[sp.value])
  if (!priceError.value) fil.value = cloneShopFilters(editingFilters.value)
  else {
    fil.value = { ...editingFilters.value, minP: '', maxP: '' }
    desktopFiltersExpanded.value = true
  }
  sortOrder.value = q.sort === 'price_asc' ? 'price_asc' : 'price_desc'
  hydrated.value = true
})
watch(
  [sp, kw, fil, sortOrder],
  () => {
    if (!hydrated.value) return
    const query = {}
    if (sp.value !== '豹紋守宮') query.sp = sp.value
    if (kw.value) query.kw = kw.value
    const defaults = createShopFilters()
    for (const key of ['stock', 'sold', 'sexM', 'sexF', 'beginner'])
      if (fil.value[key] !== defaults[key]) query[key] = String(fil.value[key])
    for (const key of ['minP', 'maxP'])
      if (fil.value[key] !== '') query[key] = String(fil.value[key])
    for (const key of ['years', 'genes'])
      if (fil.value[key].length) query[key] = fil.value[key].join(',')
    if (sortOrder.value !== 'price_desc') query.sort = sortOrder.value
    router.replace({ query }).catch(() => {})
  },
  { deep: true }
)
let searchTimer = null
const searchText = ref('')
watch(kw, (value) => {
  searchText.value = value
})
const onSearchInput = (event) => {
  clearTimeout(searchTimer)
  const value = event.target.value
  searchText.value = value
  searchTimer = setTimeout(() => {
    kw.value = value
    store.displayLimit = 20
  }, 250)
}
const toggleWishlist = (id) => {
  store.wishlist = store.wishlist.includes(id)
    ? store.wishlist.filter((value) => value !== id)
    : [...store.wishlist, id]
  try {
    localStorage.setItem('gencko_wishlist', JSON.stringify(store.wishlist))
  } catch {
    /* 隱私模式仍可在本次瀏覽使用收藏。 */
  }
}
const retryData = () => store.loadDataFromAPI()
const goCompare = async () => {
  if (selectionModal.isOpen.value) await selectionModal.close()
  router.push({ path: '/compare', query: { ids: store.compareList.join(',') } })
}
const showFavorites = async () => {
  await selectionModal.close()
  showOnlyFav.value = true
}
onBeforeUnmount(() => clearTimeout(searchTimer))
</script>
<template>
  <div
    class="site-document-page shop-root-container"
    data-scroll-page="/shop"
    :data-scroll-ready="!store.loading"
  >
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
      <p class="shop-photo-notice">
        <span class="notice-icon">PHOTO NOTE</span>
        守宮發色以當下狀態為主；線上照片無法隨時更新，購買前歡迎私訊索取最新影片。
      </p>
      <section class="shop-catalog-stage" aria-label="守宮清單">
        <div class="catalog-toolbar">
          <div class="species-tabs-row">
            <button
              v-for="species in ['豹紋守宮', '肥尾守宮']"
              :key="species"
              type="button"
              :aria-pressed="sp === species"
              :class="{ active: sp === species }"
              @click="selectSpecies(species)"
            >
              {{ species }}
            </button>
          </div>
          <div class="search-filter-row">
            <input
              type="search"
              class="catalog-search"
              :value="searchText"
              @input="onSearchInput"
              placeholder="搜尋品系、基因或 ID"
              aria-label="搜尋關鍵字或編號"
              enterkeyhint="search"
            />
            <button
              v-if="mobile"
              type="button"
              aria-label="篩選"
              :aria-expanded="showMobileFilter"
              @click="openMobileFilter"
            >
              篩選
              <span v-if="activeFilterCount">（{{ activeFilterCount }}）</span>
            </button>
            <button
              v-else
              type="button"
              :aria-expanded="desktopFiltersExpanded"
              aria-controls="desktop-shop-filters"
              @click="desktopFiltersExpanded = !desktopFiltersExpanded"
            >
              {{ desktopFiltersExpanded ? '收起篩選' : '展開篩選' }}
              <span v-if="activeFilterCount">（{{ activeFilterCount }}）</span>
            </button>
          </div>
          <div class="catalog-options">
            <select v-model="sortOrder" aria-label="排序方式">
              <option value="price_desc">價格高至低</option>
              <option value="price_asc">價格低至高</option>
            </select>
            <button
              type="button"
              :aria-pressed="showOnlyHistory"
              @click="showOnlyHistory = !showOnlyHistory"
            >
              歷史紀錄
            </button>
            <button type="button" :aria-pressed="showOnlyFav" @click="showOnlyFav = !showOnlyFav">
              只看收藏
            </button>
          </div>
        </div>
        <section
          v-if="!mobile && desktopFiltersExpanded"
          id="desktop-shop-filters"
          class="desktop-shop-filters"
          aria-label="設定篩選條件"
        >
          <ShopFilters
            :key="filterResetVersion"
            :model-value="editingFilters"
            :species="sp"
            :inventory="store.inv"
            @update:model-value="updateFilters"
          />
          <button type="button" class="filter-reset" @click="resetFilters">重置全部篩選</button>
        </section>
        <div v-if="selectedConditions.length" class="selected-conditions" aria-label="已套用條件">
          <button
            v-for="condition in selectedConditions"
            :key="condition.key + condition.label"
            type="button"
            :aria-label="`移除條件：${condition.label}`"
            @click="removeCondition(condition)"
          >
            {{ condition.label }} ×
          </button>
          <button type="button" @click="resetFilters">清除全部</button>
        </div>
        <div class="catalog-summary" aria-live="polite">
          <span>{{ sp }}</span>
          <span>共 {{ allMatches.length }} 隻・已顯示 {{ shopList.length }} 隻</span>
        </div>
        <div v-if="store.loading && !shopList.length" class="grid photo-grid">
          <SkeletonCard v-for="n in 8" :key="n" />
        </div>
        <div v-else-if="store.dataError" class="shop-empty-state">
          <h2>商品資料載入失敗</h2>
          <p>請檢查網路連線後再試一次。</p>
          <button type="button" @click="retryData">重新載入</button>
        </div>
        <div v-else-if="!shopList.length" class="shop-empty-state">
          <h2>目前沒有符合條件的商品</h2>
          <p>請調整或清除篩選條件後再試一次。</p>
          <button type="button" @click="resetFilters">重置篩選</button>
        </div>
        <div v-else class="grid photo-grid">
          <ShopFlipCard
            v-for="(item, index) in shopList"
            :key="item.ID"
            :item="item"
            :index="index"
            :is-wishlisted="store.wishlist.includes(item.ID)"
            :is-compared="store.compareList.includes(item.ID)"
            :compare-disabled="
              store.compareList.length >= 3 && !store.compareList.includes(item.ID)
            "
            :has-auction="store.auctionList.some((auction) => auction.animal_id === item.ID)"
            :show-mobile-meta="true"
            :show-mobile-genes="true"
            :show-interactive-grid="false"
            :on-toggle-wishlist="toggleWishlist"
            :on-toggle-compare="store.toggleCompare"
          />
        </div>
        <button
          v-if="shopList.length < allMatches.length"
          class="load-more"
          type="button"
          @click="store.displayLimit += 20"
        >
          顯示更多個體（還有 {{ allMatches.length - shopList.length }} 隻）
        </button>
      </section>
    </div>
    <Teleport to="body">
      <dialog
        ref="filterDialog"
        class="shop-modal filter-dialog"
        aria-label="篩選條件"
        @cancel.prevent="closeMobileFilter"
        @click.self="closeMobileFilter"
      >
        <section v-if="showMobileFilter" class="filter-dialog-shell">
          <header class="filter-dialog-header">
            <h2>篩選條件</h2>
            <button type="button" autofocus @click="closeMobileFilter">關閉</button>
          </header>
          <div class="filter-dialog-body">
            <ShopFilters
              :key="filterResetVersion"
              :model-value="editingFilters"
              :species="sp"
              :inventory="store.inv"
              @update:model-value="updateFilters"
            />
          </div>
          <footer class="filter-dialog-actions">
            <button type="button" @click="clearDraft">清除</button>
            <button
              type="button"
              class="primary"
              :disabled="!!priceError"
              @click="applyMobileFilters"
            >
              顯示 {{ draftCount }} 隻
            </button>
          </footer>
        </section>
      </dialog>
      <div
        v-if="store.compareList.length || store.wishlist.length"
        class="compare-bar"
        aria-label="收藏與比較工具列"
      >
        <a
          v-if="store.wishlist.length"
          :href="wishlistLink"
          target="_blank"
          rel="noopener"
          class="wishlist-inquire"
        >
          詢問收藏（{{ store.wishlist.length }}）
        </a>
        <button v-if="store.compareList.length" type="button" class="primary" @click="goCompare">
          比較 {{ store.compareList.length }} 隻
        </button>
        <button type="button" @click="selectionModal.open()">管理</button>
      </div>
      <dialog
        ref="selectionDialog"
        class="shop-modal selection-dialog"
        aria-label="管理收藏與比較"
        @cancel.prevent="selectionModal.close()"
        @click.self="selectionModal.close()"
      >
        <section v-if="selectionModal.isOpen.value" class="selection-shell">
          <header>
            <h2>收藏與比較</h2>
            <button type="button" autofocus @click="selectionModal.close()">關閉</button>
          </header>
          <div class="selection-body">
            <h3>比較（{{ store.compareList.length }} / 3）</h3>
            <div v-for="item in compareItems" :key="item.ID" class="selection-item">
              <span>
                {{ item.Morph }}
                <small>{{ item.ID }}</small>
              </span>
              <button
                type="button"
                :aria-label="`移除 ${item.Morph} 比較項目`"
                @click="store.toggleCompare(item.ID)"
              >
                移除
              </button>
            </div>
            <p v-if="!compareItems.length">尚未加入比較，最多可選三隻。</p>
            <button v-if="compareItems.length" type="button" @click="store.clearCompare">
              清空比較
            </button>
            <h3>收藏（{{ store.wishlist.length }}）</h3>
            <p>收藏可保留喜歡的個體，再一次詢問工作室。</p>
            <button type="button" @click="showFavorites">查看收藏</button>
          </div>
        </section>
      </dialog>
    </Teleport>
  </div>
</template>
<style scoped>
.shop-page-wrapper {
  width: 100%;
  margin: auto;
  padding-bottom: 100px;
}
.shop-intro {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 12px;
  border-bottom: 1px solid var(--bd);
  padding-bottom: 10px;
  margin-bottom: 8px;
}
.shop-intro__eyebrow {
  font-size: 11px;
  color: var(--pri);
  font-weight: 700;
  margin: 0 0 4px;
}
.shop-intro__title {
  margin: 0;
  font-family: var(--font-heading-zh), 'Noto Serif TC', serif;
}
.shop-intro__copy {
  font-size: 14px;
  color: var(--txt-muted);
  margin: 0;
}
.shop-photo-notice {
  font-size: 12px;
  color: var(--txt-muted);
  display: flex;
  gap: 12px;
  margin: 8px 0;
}
.notice-icon {
  white-space: nowrap;
  font-size: 10px;
  color: var(--pri);
  font-weight: 700;
}
.shop-catalog-stage {
  margin: 8px 0;
  padding: 8px 0;
}
.catalog-toolbar {
  display: grid;
  grid-template-columns: auto minmax(220px, 1fr) auto;
  gap: 10px;
  align-items: center;
}
.species-tabs-row {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--bd);
}
.species-tabs-row button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  white-space: nowrap;
}
.species-tabs-row .active {
  color: var(--pri);
  border-bottom-color: var(--pri);
}
.search-filter-row {
  display: flex;
  gap: 8px;
  min-width: 0;
}
.catalog-search {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border: 1px solid var(--bd);
  border-radius: 2px;
  background: var(--card-bg-solid);
  color: var(--txt);
  font-size: 16px;
}
.catalog-options {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.catalog-toolbar button,
.catalog-options select,
.filter-reset,
.shop-empty-state button,
.load-more {
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid var(--bd);
  border-radius: 2px;
  background: var(--card-bg-solid);
  color: var(--txt);
  font-size: 13px;
  cursor: pointer;
}
.catalog-toolbar button[aria-pressed='true'] {
  color: var(--pri);
  border-color: var(--pri);
}
.desktop-shop-filters {
  padding: 16px 0;
  border-block: 1px solid var(--bd);
  margin: 10px 0;
}
.filter-reset {
  margin-top: 10px;
}
.catalog-summary {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: var(--txt-muted);
  margin: 10px 0;
}
.selected-conditions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}
.selected-conditions button {
  min-height: 32px;
  padding: 4px 8px;
  color: var(--pri);
  background: var(--card-bg-solid);
  border: 1px solid var(--bd);
  font-size: 12px;
  border-radius: 2px;
  cursor: pointer;
}
.grid.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.load-more {
  display: block;
  margin: 16px auto;
}
.shop-empty-state {
  text-align: center;
  padding: 24px 12px;
}
.shop-empty-state h2 {
  font-size: 20px;
}
.shop-empty-state p {
  font-size: 14px;
}
.shop-modal {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100dvh;
  max-height: none;
  padding: 0;
  border: 0;
  margin: 0;
  background: transparent;
  color: var(--txt);
}
.shop-modal::backdrop {
  background: rgba(10, 12, 12, 0.55);
}
.filter-dialog-shell,
.selection-shell {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 90dvh;
  max-height: calc(100dvh - env(safe-area-inset-top, 0px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: var(--card-bg-solid);
  border-top: 1px solid var(--bd);
}
.filter-dialog-header,
.selection-shell > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--bd);
}
.filter-dialog-header h2,
.selection-shell h2 {
  font-size: 18px;
  margin: 0;
}
.filter-dialog-body,
.selection-body {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 16px;
}
.filter-dialog-actions {
  display: flex;
  gap: 10px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  background: var(--card-bg-solid);
  border-top: 1px solid var(--bd);
}
.shop-modal button,
.compare-bar button,
.compare-bar a {
  min-height: 40px;
  border: 1px solid var(--bd);
  padding: 6px 12px;
  background: var(--card-bg-solid);
  color: var(--txt);
  border-radius: 2px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
}
.filter-dialog-actions button {
  flex: 1;
}
.filter-dialog-actions .primary {
  flex: 2;
}
.shop-modal .primary,
.compare-bar .primary,
.compare-bar .wishlist-inquire {
  background: var(--pri-btn);
  color: white;
  border-color: var(--pri-btn);
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.compare-bar {
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px;
  max-width: calc(100% - 24px);
  background: var(--card-bg-solid);
  border: 1px solid var(--bd);
  z-index: 9999;
}
.selection-shell {
  height: auto;
  max-height: 80dvh;
  grid-template-rows: auto minmax(0, 1fr);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.selection-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.selection-item small {
  display: block;
  color: var(--txt-muted);
  font-size: 12px;
}
.selection-body h3 {
  font-size: 15px;
}
.selection-body p {
  font-size: 14px;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
@media (min-width: 1200px) {
  .grid.photo-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (max-width: 1099px) {
  .catalog-toolbar {
    grid-template-columns: 1fr 1fr;
  }
  .catalog-options {
    grid-column: 1/-1;
  }
}
@media (max-width: 767px) {
  .shop-intro {
    display: block;
  }
  .shop-intro__copy {
    margin-top: 6px;
    font-size: 12px;
  }
  .shop-photo-notice {
    font-size: 11px;
    gap: 8px;
  }
  .catalog-toolbar {
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .species-tabs-row {
    justify-content: stretch;
  }
  .species-tabs-row button {
    flex: 1;
  }
  .catalog-options {
    flex-wrap: nowrap;
    justify-content: space-between;
  }
  .catalog-options button,
  .catalog-options select {
    padding: 5px 7px;
    font-size: 12px;
    min-width: 0;
  }
  .grid.photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .compare-bar {
    bottom: calc(var(--mobile-nav-height, 62px) + 8px);
    width: max-content;
    padding: 6px;
    gap: 6px;
  }
  .compare-bar button,
  .compare-bar a {
    min-height: 40px;
    font-size: 12px;
    padding: 6px 8px;
  }
  .catalog-summary {
    font-size: 11px;
  }
  .shop-page-wrapper {
    padding-bottom: 140px;
  }
}
</style>
