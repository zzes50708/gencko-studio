<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { GENES_DB } from '~/utils/genes-db.js'
import { getCleanUrl } from '~/utils/image.js'
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
      .select('id, species, morph, genes, gender_type, listing_price, image_url, status')
      .eq('status', 'ForSale')
    if (error || !data) return []
    return data.map((a) => ({
      ID: a.id,
      Species: a.species,
      Morph: a.morph,
      Genes: Array.isArray(a.genes) ? a.genes : [],
      GenderType: a.gender_type,
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
  genes: [],
  beginner: false
})
const showMobileFilter = ref(false)
const openFCat = ref(null)
const sortOrder = ref('default')
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
          description: `${item.Species || ''} ${item.Morph || ''}（${item.GenderType || ''}）${geneStr ? '，基因：' + geneStr : ''}`,
          brand: {
            '@type': 'Brand',
            name: 'Gencko Breeding Studio',
            alternateName: ['Gencko Studio', '捷客工作室']
          },
          additionalProperty: [
            ...(geneStr ? [{ '@type': 'PropertyValue', name: '基因組合', value: geneStr }] : []),
            ...(item.GenderType
              ? [{ '@type': 'PropertyValue', name: '性別', value: item.GenderType }]
              : []),
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
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/' },
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
    cssSelector: ['.page-title']
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
  title: '線上選購守宮｜豹紋與肥尾守宮個體 - Gencko Breeding Studio',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Breeding Studio 線上選購頁，提供豹紋守宮與肥尾守宮在售個體，可依基因品系、性別、價格篩選。每隻個體均有完整基因紀錄與健康保證，支援私訊購買與配送。'
    },
    {
      name: 'keywords',
      content: '豹紋守宮選購, 肥尾守宮選購, 守宮販售, 守宮價格, 特殊基因品系, Gencko Studio'
    },
    // Open Graph
    { property: 'og:title', content: '線上選購守宮｜豹紋與肥尾守宮個體 - Gencko Breeding Studio' },
    {
      property: 'og:description',
      content:
        '線上選購豹紋守宮與肥尾守宮在售個體，可依基因品系、性別、價格篩選，每隻附完整基因紀錄與健康保證。'
    },
    { property: 'og:image', content: shopImg },
    { property: 'og:image:alt', content: 'Gencko 守宮線上選購 - 豹紋守宮與肥尾守宮在售個體' },
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
    { type: 'application/ld+json', children: JSON.stringify(shopWebPageLd.value) },
    { type: 'application/ld+json', children: JSON.stringify(shopBreadcrumbLd) }
  ])
})

const tags = {}

onMounted(() => {
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
  if (q.genes) fil.value.genes = Array.isArray(q.genes) ? q.genes : q.genes.split(',')
  if (q.sort) sortOrder.value = q.sort

  if (q.beginner === 'true') {
    showMobileFilter.value = true
  }
})

watch(
  [sp, kw, fil, sortOrder],
  () => {
    const query = {}
    if (sp.value !== '豹紋守宮') query.sp = sp.value
    if (kw.value) query.kw = kw.value
    if (!fil.value.stock) query.stock = 'false'
    if (fil.value.sold) query.sold = 'true'
    if (fil.value.minP) query.minP = fil.value.minP
    if (fil.value.maxP) query.maxP = fil.value.maxP
    if (!fil.value.sexM) query.sexM = 'false'
    if (!fil.value.sexF) query.sexF = 'false'
    if (fil.value.beginner) query.beginner = 'true'
    if (fil.value.genes.length) query.genes = fil.value.genes.join(',')
    if (sortOrder.value !== 'default') query.sort = sortOrder.value

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

  if (kw.value)
    l = l.filter((i) => JSON.stringify(i).toLowerCase().includes(kw.value.toLowerCase()))
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

const resetFilters = () => {
  fil.value = {
    stock: true,
    sold: true,
    minP: '',
    maxP: '',
    sexM: true,
    sexF: true,
    genes: [],
    beginner: false
  }
  kw.value = ''
  sortOrder.value = 'default'
  showOnlyFav.value = false
  showOnlyHistory.value = false
  store.displayLimit = 20
  showMobileFilter.value = false

  router.replace({ query: {} }).catch(() => {})

  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

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
  if (fil.value.sold) n++
  if (fil.value.minP) n++
  if (fil.value.maxP) n++
  if (!fil.value.sexM) n++
  if (!fil.value.sexF) n++
  if (fil.value.beginner) n++
  n += fil.value.genes.length
  return n
})
</script>

<template>
  <div class="shop-root-container">
    <div class="shop-page-wrapper">
      <!-- SEO：頁面唯一 h1（sr-only 含完整關鍵字，全裝置都讓爬蟲讀到） -->
      <h1 class="sr-only">線上選購守宮｜豹紋與肥尾守宮在售個體 - Gencko Breeding Studio</h1>
      <!-- 視覺主標保留為 div（桌機可見、手機隱藏） -->
      <div class="page-title dt-only" aria-hidden="true">選購守宮</div>

      <div class="shop-layout">
        <!-- 手機篩選遮罩 -->
        <div
          class="filter-backdrop m-only"
          :class="{ 'filter-backdrop--show': showMobileFilter }"
          @click="showMobileFilter = false"
        />

        <div class="filter-panel" :class="{ 'm-show': showMobileFilter }">
          <div class="f-header m-only">
            <button class="btn-back-arrow" @click="showMobileFilter = false" aria-label="返回">
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
            <span class="f-header-title">
              篩選條件
              <span v-if="activeFilterCount > 0" class="f-active-badge">
                {{ activeFilterCount }}
              </span>
            </span>
            <button v-if="activeFilterCount > 0" class="btn-clear-inline" @click="resetFilters">
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
          <div class="f-group" style="padding-bottom: 30px">
            <div class="f-label">基因篩選</div>
            <div v-for="(list, cat) in GENES_DB[sp]" :key="cat">
              <div class="f-cat" @click="openFCat = openFCat === cat ? null : cat">
                <span>
                  {{ cat }}
                  <span v-if="fil.genes.some((g) => list.includes(g))" class="f-cat-count">
                    {{ fil.genes.filter((g) => list.includes(g)).length }}
                  </span>
                </span>
                <span class="f-cat-arrow" :class="{ 'f-cat-arrow--open': openFCat === cat }">
                  ›
                </span>
              </div>
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
            <button class="btn-clear" @click="resetFilters">清除</button>
            <button class="btn-apply" @click="showMobileFilter = false">套用篩選</button>
          </div>

          <button
            class="btn-hero dt-only"
            style="width: 100%; margin-top: 20px; font-size: 0.9rem; padding: 10px"
            @click="resetFilters"
          >
            重置全部篩選
          </button>
        </div>

        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column">
          <div class="search-filter-row">
            <div class="inp-wrap">
              <span class="search-icon">搜尋</span>
              <input
                class="inp"
                :value="kw"
                @input="onSearchInput"
                placeholder="搜尋關鍵字或 ID..."
                aria-label="搜尋關鍵字或編號"
              />
            </div>
            <button
              class="btn-filter-icon m-only"
              :class="{ active: activeFilterCount > 0 }"
              @click="showMobileFilter = true"
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

          <div class="scroll-chips-row">
            <div
              class="chip-tab main-tab"
              :class="{ active: sp === '豹紋守宮' }"
              role="button"
              tabindex="0"
              @click="selectSpecies('豹紋守宮')"
              @keydown.enter.space.prevent="selectSpecies('豹紋守宮')"
            >
              豹紋守宮
            </div>
            <div
              class="chip-tab main-tab"
              :class="{ active: sp === '肥尾守宮' }"
              role="button"
              tabindex="0"
              @click="selectSpecies('肥尾守宮')"
              @keydown.enter.space.prevent="selectSpecies('肥尾守宮')"
            >
              肥尾守宮
            </div>

            <div class="chip-divider"></div>

            <select v-model="sortOrder" class="chip-select" aria-label="排序方式">
              <option value="default">預設排序</option>
              <option value="price_asc">價格：低 → 高</option>
              <option value="price_desc">價格：高 → 低</option>
            </select>

            <div
              class="chip-toggle chip-toggle--history"
              :class="{ active: showOnlyHistory }"
              @click="showOnlyHistory = !showOnlyHistory"
            >
              歷史紀錄
            </div>
            <div
              class="chip-toggle chip-toggle--fav"
              :class="{ active: showOnlyFav }"
              @click="showOnlyFav = !showOnlyFav"
            >
              只看收藏
            </div>

            <div class="chip-divider"></div>

            <span
              v-for="t in tags[sp] || []"
              :key="t"
              class="chip-tag"
              :class="{ sel: kw === t }"
              @click="toggleTag(t)"
            >
              {{ t }}
            </span>
          </div>

          <h2 class="sr-only">{{ sp }} 商品列表</h2>
          <div v-if="store.loading && !shopList.length" class="grid photo-grid">
            <SkeletonCard v-for="n in 12" :key="n" :square="true" />
          </div>
          <Transition v-else name="sp-fade" mode="out-in">
            <div :key="sp">
              <transition-group tag="div" name="shoplist" class="grid photo-grid">
                <div v-if="shopList.length === 0" key="empty-msg" class="shop-empty-state">
                  <div class="empty-icon">無</div>
                  <h3 style="color: var(--txt); margin-bottom: 10px">目前沒有符合條件的商品</h3>
                  <p style="font-size: 0.9rem">請調整篩選條件或清除篩選後再試一次。</p>
                  <button class="btn-hero" @click="resetFilters" style="margin-top: 20px">
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
                  :on-toggle-wishlist="toggleWishlist"
                  :on-toggle-compare="store.toggleCompare"
                />
              </transition-group>
            </div>
          </Transition>
        </div>
      </div>
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
              <button class="cmp-bar-remove" @click="store.toggleCompare(item.ID)"></button>
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
              :to="`/compare?ids=${(store.compareList || []).join(',')}`"
              class="btn-app btn-app--primary btn-app--sm btn-app--pill cmp-go-btn"
            >
              前往比較（{{ (store.compareList || []).length }}）
            </NuxtLink>
            <button
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
  width: 40px;
  height: 40px;
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

.chip-tab {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  cursor: pointer;
  color: var(--txt);
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
  background: var(--card-bg);
  color: var(--txt);
  border: 1px solid var(--bd);
  padding: 6px 10px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: bold;
  outline: none;
  flex-shrink: 0;
  cursor: pointer;
  appearance: none;
  text-align: center;
}
.chip-select:focus {
  border-color: var(--pri);
}

.chip-toggle {
  padding: 6px 10px;
  border-radius: 20px;
  border: 1px solid var(--bd);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: bold;
  color: var(--txt);
  opacity: 0.7;
  background: var(--card-bg);
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
  font-size: 0.8rem;
  padding: 6px 10px;
  background: var(--card-bg);
  border: 1px dashed var(--bd);
  border-radius: 20px;
  color: var(--txt);
  opacity: 0.8;
  cursor: pointer;
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
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--bd);
}
.f-group:last-child {
  border-bottom: none;
}
.f-label {
  font-weight: bold;
  color: var(--pri);
  margin-bottom: 8px;
  font-size: 0.95rem;
}
.f-check {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 0;
  margin-bottom: 2px;
  font-size: 0.9rem;
  color: var(--txt);
  opacity: 0.8;
}
.f-check:hover {
  opacity: 1;
}
.f-check.disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.f-cat {
  cursor: pointer;
  padding: 10px 12px;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  margin-bottom: 6px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  transition:
    border-color 0.18s,
    background 0.18s;
}
.f-cat:hover {
  border-color: var(--pri);
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
    width: 34px;
    height: 34px;
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
    padding: 4px 0;
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
  width: 24px;
  height: 24px;
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
</style>
