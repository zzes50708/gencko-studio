<script setup>
import { serializeJsonLd } from '~/utils/structured-data'
import { ref, computed, nextTick, toRef, watch, onMounted } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
// HOSPITAL_REGIONS 仍從 js 讀（縣市區域分組是固定常數）；HOSPITAL_DATA 已搬到 Supabase
import { HOSPITAL_REGIONS as hospitalRegions } from '~/utils/hospitals'
import { hospitalPhone, hospitalPhoneE164 } from '~/utils/hospitalPhone'
import {
  hospitalHours,
  hospitalLoadedTime,
  hospitalGoogleMapUrl,
  hospitalSpecies,
  hospitalVerifiedDate,
  normalizeHospitalQuery,
  rankHospitalMatches
} from '~/utils/hospitalExperience'
import { preciseMapHospitals } from '~/utils/hospitalMap'

const store = useMainStore()

// SSR：從 Supabase 抓特寵醫院清單
const {
  data: hospitalsData,
  error: hospitalsError,
  status: hospitalsStatus,
  refresh: refreshHospitals
} = await useHospitalDirectoryData()

// 本次瀏覽期間保留最後成功名錄，避免重讀失敗後返回頁面遺失；成功空陣列仍以最新結果為準。
const lastAvailableHospitals = useState('hospital-last-available-directory', () => [])
const directoryLoadedAt = useState('hospital-directory-loaded-at', () => '')
watch(
  hospitalsData,
  (data) => {
    if (Array.isArray(data)) {
      if (lastAvailableHospitals.value !== data || !directoryLoadedAt.value)
        directoryLoadedAt.value = new Date().toISOString()
      lastAvailableHospitals.value = data
    }
  },
  { immediate: true }
)
const HOSPITAL_DATA = computed(() => hospitalsData.value || lastAvailableHospitals.value)

// 取最新驗證日（前台顯示「資料更新：YYYY-MM-DD」）
const hospitalsVerifiedDate = computed(() => {
  const list = HOSPITAL_DATA.value
  if (!list.length) return null
  const dates = list
    .map((h) => h.verifiedAt)
    .filter(Boolean)
    .sort()
  return dates[dates.length - 1] || null
})

const directoryContext = useState('hospital-directory-context', () => ({
  city: 'all',
  district: 'all',
  query: '',
  appliedQuery: '',
  savedOnly: false,
  searched: false,
  expanded: [],
  scrollY: 0
}))
const hospCity = toRef(directoryContext.value, 'city')
const hospDistrict = toRef(directoryContext.value, 'district')
const hospQuery = toRef(directoryContext.value, 'query')
if (directoryContext.value.appliedQuery === undefined)
  directoryContext.value.appliedQuery = directoryContext.value.query
const appliedQuery = toRef(directoryContext.value, 'appliedQuery')
const savedOnly = toRef(directoryContext.value, 'savedOnly')
const searchPerformed = toRef(directoryContext.value, 'searched')
let mapFitIntent = 0
const cancelPendingMapFit = () => {
  mapFitIntent++
}
const mapFitSequence = ref(
  appliedQuery.value || hospCity.value !== 'all' || savedOnly.value ? 1 : 0
)
const beginMapSearch = async () => {
  const intent = ++mapFitIntent
  appliedQuery.value = normalizeHospitalQuery(hospQuery.value)
  searchPerformed.value = true
  await nextTick()
  if (intent === mapFitIntent) mapFitSequence.value++
}
watch(
  () => (savedOnly.value ? store.hospWishlist.join(',') : ''),
  () => {
    if (savedOnly.value && searchPerformed.value) void beginMapSearch()
  }
)
const hospExpanded = ref(new Set(directoryContext.value.expanded))
watch(hospExpanded, (value) => {
  directoryContext.value.expanded = [...value]
})
onBeforeRouteLeave(() => {
  directoryContext.value.scrollY = window.scrollY
})
const isMobile = useMediaQuery('(max-width: 767px), (pointer: coarse)')
const viewportReady = ref(false)
const mapSession = useHospitalMapSession()
const mapResetSequence = ref(0)
onMounted(() => {
  viewportReady.value = true
})
const hospitalCards = ref([])
const clearFilters = async () => {
  mapSession.value = null
  mapResetSequence.value++
  hospCity.value = 'all'
  hospDistrict.value = 'all'
  hospQuery.value = ''
  appliedQuery.value = ''
  savedOnly.value = false
  focusedHospital.value = null
  await nextTick()
}
const scrollBehavior = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
const focusedHospital = ref(null)
const mapFocusSequence = ref(0)
const mapSection = ref(null)
const hospitalMap = ref(null)

const toggleHospExpand = (id) => {
  if (hospExpanded.value.has(id)) {
    hospExpanded.value.delete(id)
  } else {
    cancelPendingMapFit()
    hospExpanded.value.add(id)
    focusedHospital.value = HOSPITAL_DATA.value.find((h) => h.id === id) || null
    mapFocusSequence.value++
  }
  hospExpanded.value = new Set(hospExpanded.value)
}

const isHospExpanded = (id) => hospExpanded.value.has(id)

const hospAvailableCities = computed(() => new Set(HOSPITAL_DATA.value.map((h) => h.city)))

const hospDistricts = computed(() => {
  if (hospCity.value === 'all') return []
  const set = new Set(
    HOSPITAL_DATA.value.filter((h) => h.city === hospCity.value).map((h) => h.district)
  )
  return Array.from(set).sort()
})

const favoriteStorageError = useState('hospital-favorite-storage-error', () => false)
const hasHospitalLocation = (hospital) => preciseMapHospitals([hospital]).length > 0
const regionHospitals = computed(() =>
  HOSPITAL_DATA.value.filter(
    (h) =>
      (hospCity.value === 'all' || h.city === hospCity.value) &&
      (hospDistrict.value === 'all' || h.district === hospDistrict.value) &&
      (!savedOnly.value || store.hospWishlist.includes(h.id))
  )
)
const hospFiltered = computed(() => rankHospitalMatches(regionHospitals.value, appliedQuery.value))
const searchSuggestions = computed(() =>
  hospQuery.value.trim()
    ? rankHospitalMatches(regionHospitals.value, hospQuery.value)
        .slice(0, 6)
        .map((h) => ({
          value: h.name,
          label: [h.city, h.district, h.address].filter(Boolean).join(' ')
        }))
    : []
)

const hospWishlist = computed(() => store.hospWishlist)
watch(hospFiltered, (hospitals) => {
  if (
    focusedHospital.value &&
    !hospitals.some((hospital) => hospital.id === focusedHospital.value.id)
  ) {
    focusedHospital.value = null
  }
})

const changeCity = (val) => {
  hospCity.value = val
  hospDistrict.value = 'all'
  focusedHospital.value = null
  void beginMapSearch()
}

const focusHospital = (hospital) => {
  cancelPendingMapFit()
  focusedHospital.value = hospital
  mapFocusSequence.value++
  hospExpanded.value = new Set([hospital.id])
}
const showHospitalDetails = async (hospital) => {
  searchPerformed.value = true
  focusHospital(hospital)
  await nextTick()
  const card = hospitalCards.value.find((el) => el.id === `hospital-${hospital.id}`)
  card?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
  card?.querySelector('.hosp-header-toggle')?.focus({ preventScroll: true })
}
const showHospitalOnMap = async (hospital) => {
  focusHospital(hospital)
  await nextTick()
  await hospitalMap.value?.focusMap()
}

const toggleHospWishlist = (id) => {
  if (store.hospWishlist.includes(id)) {
    store.hospWishlist = store.hospWishlist.filter((x) => x !== id)
  } else {
    store.hospWishlist.push(id)
  }
  if (import.meta.client) {
    try {
      localStorage.setItem('gencko_hosp_wishlist', JSON.stringify(store.hospWishlist))
      favoriteStorageError.value = false
    } catch {
      favoriteStorageError.value = true
    }
  }
}

const getMapLink = (h) => hospitalGoogleMapUrl(h)

const hospUrl = 'https://www.genckobreeding.com/hospital'
const hospImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'

const hospPublisher = {
  '@type': 'Organization',
  name: 'Gencko Breeding Studio',
  alternateName: ['Gencko Studio'],
  url: 'https://www.genckobreeding.com',
  logo: {
    '@type': 'ImageObject',
    url: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png',
    width: 512,
    height: 512
  },
  sameAs: [
    'https://www.instagram.com/gencko_breeding',
    'https://www.facebook.com/profile.php?id=61579393505049',
    'https://line.me/R/ti/p/@219abdzn'
  ]
}

const hospRegionOf = (city) => {
  for (const [region, cities] of Object.entries(hospitalRegions)) {
    if (cities.includes(city)) return region
  }
  return ''
}

const hospMapUrlOf = (h) =>
  h.mapUrl ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`

// BreadcrumbList
const hospBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    { '@type': 'ListItem', position: 2, name: '特寵醫院查詢', item: hospUrl }
  ]
}

// [SEO] 動態地圖 Meta 與結構化資料
const siteData = computed(() => {
  const city = hospCity.value === 'all' ? '' : hospCity.value
  const dist = hospDistrict.value === 'all' ? '' : hospDistrict.value
  const locationStr = city ? `${city}${dist}` : '全台'

  const title = `${locationStr}特寵醫院查詢｜爬蟲、守宮、兩棲動物獸醫地圖`
  const shareTitle = `${locationStr} 特寵醫院查詢｜爬蟲、守宮、兩棲動物獸醫地圖`
  const desc = `${locationStr}爬蟲、守宮、兩棲動物等特殊寵物醫院名單，提供電話、地址與 Google Maps 導航。Gencko Breeding Studio 整理之全台特寵獸醫資源，協助飼主在第一時間找到專業醫療協助。`

  // ItemList of VeterinaryCare：列出全部（不再 slice 20）
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${hospUrl}#hospitals`,
    name: `${locationStr}特寵醫院清單`,
    numberOfItems: hospFiltered.value.length,
    itemListElement: hospFiltered.value.map((h, index) => {
      const e164 = hospitalPhoneE164(h.phone)
      const mapUrl = hospMapUrlOf(h)
      const region = hospRegionOf(h.city)
      return {
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'VeterinaryCare',
          '@id': `${hospUrl}#hospital-${h.id}`,
          name: h.name,
          ...(e164 ? { telephone: e164 } : {}),
          address: {
            '@type': 'PostalAddress',
            streetAddress: h.address,
            addressLocality: h.district,
            addressRegion: h.city,
            addressCountry: 'TW'
          },
          areaServed: [
            { '@type': 'City', name: h.city },
            ...(region ? [{ '@type': 'AdministrativeArea', name: region }] : [])
          ],
          medicalSpecialty: 'ExoticPet',
          hasMap: mapUrl,
          url: mapUrl,
          image: hospImg
        }
      }
    })
  }

  // WebPage 包覆
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': hospUrl,
    url: hospUrl,
    name: title,
    inLanguage: 'zh-TW',
    isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
    primaryImageOfPage: { '@type': 'ImageObject', url: hospImg },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: ['h1', '.hosp-name', '.hosp-alert-box']
    },
    publisher: hospPublisher,
    about: [
      { '@type': 'Thing', name: '爬蟲特寵醫療' },
      { '@type': 'Taxon', name: 'Eublepharis macularius', alternateName: '豹紋守宮' },
      { '@type': 'Taxon', name: 'Hemitheconyx caudicinctus', alternateName: '肥尾守宮' }
    ],
    mainEntity: itemListLd
  }

  return {
    title,
    shareTitle,
    desc,
    script: [
      { type: 'application/ld+json', innerHTML: serializeJsonLd(webPageLd) },
      { type: 'application/ld+json', innerHTML: serializeJsonLd(hospBreadcrumbLd) }
    ]
  }
})

useHead({
  title: computed(() => siteData.value.title),
  meta: [
    { name: 'description', content: computed(() => siteData.value.desc) },
    {
      name: 'keywords',
      content:
        '特寵醫院, 特殊寵物醫院, 爬蟲獸醫, 守宮獸醫, 兩棲動物醫院, 豹紋守宮醫院, 肥尾守宮醫院, 守宮急診'
    },
    // Open Graph
    { property: 'og:title', content: computed(() => siteData.value.shareTitle) },
    { property: 'og:description', content: computed(() => siteData.value.desc) },
    { property: 'og:image', content: hospImg },
    { property: 'og:image:alt', content: '全台特寵醫院查詢 - Gencko Breeding Studio' },
    { property: 'og:url', content: hospUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: computed(() => siteData.value.shareTitle) },
    { name: 'twitter:description', content: computed(() => siteData.value.desc) },
    { name: 'twitter:image', content: hospImg }
  ],
  link: [{ rel: 'canonical', href: hospUrl }],
  script: computed(() => siteData.value.script)
})
</script>

<template>
  <div
    class="site-document-page hosp-page-wrapper"
    data-scroll-page="/hospital"
    :data-scroll-ready="viewportReady && hospitalsStatus !== 'pending'"
  >
    <div class="hosp-intro">
      <header class="hosp-hero">
        <div class="hosp-document-meta" aria-label="醫院名錄說明">
          <span>GENCKO CARE DIRECTORY</span>
          <span>SEARCH / SAVE / CONTACT</span>
        </div>
        <span>EXOTIC CARE DIRECTORY / 全台資源</span>
        <h1>特寵醫院查詢</h1>
        <p>以縣市、行政區或關鍵字縮小既有名單；展開後可直接撥號或前往真實 Google Maps 連結。</p>
      </header>
    </div>

    <div
      v-if="viewportReady"
      ref="mapSection"
      tabindex="-1"
      class="hosp-map-section"
      id="hospital-mobile-map"
    >
      <LazyHospitalUnifiedMap
        ref="hospitalMap"
        :reset-sequence="mapResetSequence"
        :selection-scope="JSON.stringify([hospCity, hospDistrict, savedOnly, appliedQuery])"
        :hospitals="HOSPITAL_DATA"
        :wishlist="hospWishlist"
        :selected="hospCity"
        :region-label="[hospCity, hospDistrict].filter((value) => value !== 'all').join(' ')"
        :visible-hospitals="hospFiltered"
        :fit-sequence="mapFitSequence"
        :query="hospQuery"
        :search-suggestions="searchSuggestions"
        :search-performed="searchPerformed"
        @search="beginMapSearch"
        :focused-hospital="focusedHospital"
        :focus-sequence="mapFocusSequence"
        @select="changeCity"
        @select-hospital="focusHospital"
        @show-details="showHospitalDetails"
        @clear-hospital="focusedHospital = null"
        @toggle-favorite="toggleHospWishlist"
        @update-query="hospQuery = $event"
        @interact="cancelPendingMapFit"
      >
        <template #filters>
          <details class="hosp-sidebar-filter-details" :open="!isMobile">
            <summary>篩選條件</summary>
            <aside class="hosp-filter-panel hosp-sidebar-filters" aria-label="醫院篩選條件">
              <div class="hosp-alert-box">
                <span class="icon">i</span>
                <div class="text-content" role="status" aria-live="polite">
                  <strong>
                    {{ favoriteStorageError ? '暫時無法儲存收藏' : '收藏儲存在這台裝置' }}
                  </strong>
                  <span>
                    {{
                      favoriteStorageError
                        ? '目前收藏僅保留於本次瀏覽；重新整理後可能不會保留。'
                        : '清除瀏覽器資料或更換裝置後，收藏紀錄不會保留。'
                    }}
                  </span>
                </div>
              </div>

              <!-- Filter Section -->
              <div class="hosp-filter-row">
                <div class="hosp-select-group">
                  <label class="hosp-label">區域與縣市</label>
                  <select
                    class="hosp-select"
                    :value="hospCity"
                    @change="changeCity($event.target.value)"
                    aria-label="區域與縣市"
                  >
                    <option value="all">所有縣市</option>
                    <option
                      v-if="
                        hospCity !== 'all' &&
                        !Object.values(hospitalRegions).some((cities) => cities.includes(hospCity))
                      "
                      :value="hospCity"
                    >
                      {{ hospCity }}
                    </option>
                    <optgroup
                      v-for="(cities, region) in hospitalRegions"
                      :key="region"
                      :label="region"
                    >
                      <option
                        v-for="city in cities"
                        :key="city"
                        :value="city"
                        v-show="hospAvailableCities.has(city)"
                      >
                        {{ city }}
                      </option>
                    </optgroup>
                  </select>
                  <div class="hosp-select-icon">▼</div>
                </div>
                <div class="hosp-select-group">
                  <label class="hosp-label">行政區</label>
                  <select
                    class="hosp-select"
                    v-model="hospDistrict"
                    @change="beginMapSearch"
                    :disabled="hospCity === 'all'"
                    aria-label="行政區"
                  >
                    <option value="all">所有區域</option>
                    <option v-for="d in hospDistricts" :key="d" :value="d">{{ d }}</option>
                  </select>
                  <div class="hosp-select-icon">▼</div>
                </div>
              </div>

              <div class="hosp-filter-actions">
                <label>
                  <input type="checkbox" v-model="savedOnly" @change="beginMapSearch" />
                  只看收藏（{{ hospWishlist.length }}）
                </label>
                <button type="button" @click="clearFilters">清除篩選</button>
              </div>
              <div class="hosp-count-row" aria-live="polite">
                <span v-if="hospitalsVerifiedDate" class="hosp-verified">
                  最近一筆確認 {{ hospitalsVerifiedDate }}
                </span>
              </div>
              <button v-if="hospitalsError" type="button" @click="refreshHospitals()">
                重新載入院所
              </button>
            </aside>
          </details>
        </template>
        <template #results="{ hospitals: resultHospitals }">
          <div class="hosp-sidebar-directory">
            <section class="hosp-list-panel" aria-label="特寵醫院清單">
              <div class="hosp-list-heading">
                <span>DIRECTORY</span>
                <strong>點選醫院查看聯絡方式</strong>
              </div>

              <!-- Hospital List -->
              <div class="hosp-list">
                <div v-if="hospitalsStatus === 'pending'" class="hosp-empty" role="status">
                  {{ HOSPITAL_DATA.length ? '正在更新醫院名錄…' : '正在載入醫院名錄…' }}
                </div>
                <div v-else-if="hospitalsError" class="hosp-empty" role="alert">
                  <p>
                    {{
                      HOSPITAL_DATA.length
                        ? `名錄更新失敗，暫時顯示上次載入的資料（取得時間：${hospitalLoadedTime(directoryLoadedAt)}）。請稍後重試更新。`
                        : '醫院名錄暫時無法載入，請稍後重試。'
                    }}
                  </p>
                  <button type="button" @click="refreshHospitals()">重新載入</button>
                </div>
                <div v-else-if="!HOSPITAL_DATA.length" class="hosp-empty">目前尚未收錄院所。</div>
                <div v-else-if="resultHospitals.length === 0" class="hosp-empty">
                  <p>
                    {{
                      hospCity !== 'all'
                        ? `${[hospCity, hospDistrict].filter((value) => value !== 'all').join(' ')}內沒有符合目前條件的院所，可調整關鍵字或篩選。`
                        : !hospFiltered.length
                          ? '沒有符合目前條件的院所，可調整關鍵字或篩選。'
                          : '目前畫面內沒有符合的院所，可縮小地圖或調整篩選。'
                    }}
                  </p>
                  <button type="button" @click="clearFilters">清除篩選</button>
                </div>

                <article
                  v-for="h in resultHospitals"
                  :key="h.id"
                  :id="`hospital-${h.id}`"
                  ref="hospitalCards"
                  class="hosp-card"
                  :class="{
                    expanded: isHospExpanded(h.id),
                    selected: focusedHospital?.id === h.id
                  }"
                >
                  <div class="hosp-header">
                    <button
                      type="button"
                      class="hosp-header-toggle"
                      :aria-expanded="isHospExpanded(h.id)"
                      :aria-current="focusedHospital?.id === h.id ? 'true' : undefined"
                      :aria-controls="`hosp-details-${h.id}`"
                      @click="toggleHospExpand(h.id)"
                    >
                      <h3 class="hosp-name">{{ h.name }}</h3>
                      <div class="hosp-header-right">
                        <span class="hosp-tag">{{ h.city }} {{ h.district }}</span>
                        <span
                          class="hosp-toggle-icon"
                          :class="{ expanded: isHospExpanded(h.id) }"
                          aria-hidden="true"
                        >
                          ▼
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      class="fav-btn hosp-fav-btn"
                      :class="{ active: hospWishlist.includes(h.id) }"
                      :aria-pressed="hospWishlist.includes(h.id)"
                      :aria-label="
                        hospWishlist.includes(h.id) ? `取消收藏 ${h.name}` : `收藏 ${h.name}`
                      "
                      @click="toggleHospWishlist(h.id)"
                    >
                      ❤
                    </button>
                  </div>

                  <div
                    :id="`hosp-details-${h.id}`"
                    v-show="isHospExpanded(h.id)"
                    class="hosp-details"
                  >
                    <button
                      type="button"
                      class="hosp-map-focus"
                      @click="showHospitalOnMap(h, $event)"
                    >
                      在地圖上定位 ↗
                    </button>
                    <dl class="hosp-record-facts">
                      <template v-if="hospitalHours(h.hours)">
                        <dt>看診時間</dt>
                        <dd>{{ hospitalHours(h.hours) }}（請先致電確認）</dd>
                      </template>
                      <template v-if="!hospitalHours(h.hours)">
                        <dt>看診時間</dt>
                        <dd>尚未提供，請先致電確認</dd>
                      </template>
                      <template v-if="hospitalSpecies(h.acceptSpecies)">
                        <dt>收診物種</dt>
                        <dd>{{ hospitalSpecies(h.acceptSpecies) }}</dd>
                      </template>
                      <template v-if="h.hasEmergency === true">
                        <dt>急診資訊</dt>
                        <dd>有提供急診紀錄，出發前請致電確認</dd>
                      </template>
                      <template v-if="hospitalVerifiedDate(h.verifiedAt)">
                        <dt>資料確認</dt>
                        <dd>{{ hospitalVerifiedDate(h.verifiedAt) }}</dd>
                      </template>
                    </dl>
                    <p v-if="!hasHospitalLocation(h)" class="hosp-location-note">
                      此院所目前未顯示地圖定位點，請先致電確認地址與看診安排。
                    </p>
                    <a
                      :href="getMapLink(h)"
                      target="_blank"
                      class="hosp-detail-row hosp-link"
                      rel="noopener noreferrer"
                    >
                      <svg
                        class="hosp-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                      </svg>
                      <span>{{ h.address }}</span>
                    </a>

                    <div class="hosp-detail-row">
                      <span class="hosp-phone-label">TEL</span>
                      <span class="hosp-phone">
                        {{ hospitalPhone(h.phone).number || '尚未提供電話' }}
                      </span>
                      <span v-if="hospitalPhone(h.phone).extension" class="hosp-phone-extension">
                        分機 {{ hospitalPhone(h.phone).extension }}
                      </span>
                    </div>

                    <a
                      v-if="hospitalPhone(h.phone).href"
                      :href="hospitalPhone(h.phone).href"
                      class="hosp-call-btn"
                      @click.stop
                    >
                      撥打電話
                    </a>
                  </div>
                </article>
              </div>
            </section>
          </div>
        </template>
      </LazyHospitalUnifiedMap>
      <p v-if="hospitalsStatus === 'pending'" role="status">
        正在更新院所資料，地圖暫時保留目前位置。
      </p>
      <p v-else-if="hospitalsError" role="status">
        院所資料更新失敗，地圖暫時顯示先前資料，請稍後重試。
      </p>
    </div>
  </div>
</template>

<style scoped>
.hosp-map-empty-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--bd);
  font-size: 14px;
}
.hosp-map-empty-state button {
  min-height: 40px;
  padding: 6px 12px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  color: var(--txt);
  cursor: pointer;
}
.hosp-phone-extension {
  font-size: 12px;
  color: var(--txt-muted);
}
.hosp-map-section {
  scroll-margin-top: 110px;
}
.hosp-map-focus {
  padding: 8px 12px;
  margin-bottom: 10px;
  min-height: 40px;
  border: 1px solid var(--pri);
  color: var(--pri);
  background: transparent;
  cursor: pointer;
  font: inherit;
}
/*
  [局部樣式修復] 
  已清除所有寫死深淺色的背景與文字色碼。
  全面導入 CSS 變數，徹底移除所有不必要的 :global(body.day-mode) 覆寫。
*/
.hosp-page-wrapper {
  max-width: 1180px;
  margin: 0 auto;
  padding-top: 15px;
}

.hosp-document-meta {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.1em;
}

.hosp-document-meta span:first-child {
  color: var(--pri);
}

.hosp-hero {
  max-width: 760px;
  margin-bottom: 24px;
}
.hosp-hero > span,
.hosp-list-heading > span {
  color: var(--pri);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}
.hosp-hero h1 {
  margin: 8px 0;
  color: var(--txt);
  font-size: clamp(2.1rem, 5vw, 4rem);
  line-height: 1;
  letter-spacing: -0.055em;
}
.hosp-hero p {
  max-width: 64ch;
  margin: 0;
  color: var(--txt-muted);
  line-height: 1.65;
}
.hosp-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 330px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.hosp-filter-panel {
  position: sticky;
  top: 84px;
  padding: 16px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-lg);
  background: var(--card-bg);
  box-shadow: var(--shadow-card);
}
.hosp-list-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  padding: 0 4px 12px;
  border-bottom: 1px solid var(--bd);
  color: var(--txt);
}
.hosp-search-group {
  display: grid;
  gap: 6px;
  margin-bottom: 14px;
}
.hosp-search {
  width: 100%;
  min-height: var(--control-min-height);
  padding: 0 12px;
  border: 1px solid var(--bd-solid);
  border-radius: var(--radius-sm);
  background: var(--gb-inner-bg);
  color: var(--txt);
  font: inherit;
}
.hosp-search:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}
.hosp-phone-label {
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.12em;
}
.hosp-phone {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-variant-numeric: tabular-nums;
}

/* Responsive Utilities */
.dt-only {
  display: block;
}
@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }
}

/* Alert Box */
.hosp-alert-box {
  background: rgba(128, 128, 128, 0.05);
  border: 1px dashed var(--pri);
  color: var(--txt);
  padding: 12px 15px;
  border-radius: 8px;
  font-size: 0.85rem;
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.hosp-alert-box .icon {
  font-size: 1.2rem;
  line-height: 1.2;
}
.hosp-alert-box .text-content {
  display: flex;
  flex-direction: column;
}
.hosp-alert-box strong {
  color: var(--pri);
  margin-bottom: 4px;
}
.hosp-alert-box span {
  opacity: 0.8;
}

/* Filter Section */
.hosp-filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 14px;
}
.hosp-select-group {
  position: relative;
}
.hosp-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--txt);
  opacity: 0.6;
}
.hosp-select {
  width: 100%;
  padding: 12px;
  min-height: var(--control-min-height);
  background: var(--card-bg);
  border: 1px solid var(--bd);
  color: var(--txt);
  border-radius: 8px;
  font-weight: bold;
  font-size: 0.95rem;
  outline: none;
  appearance: none;
  cursor: pointer;
  transition: 0.2s;
}
.hosp-select:focus {
  border-color: var(--pri);
}
.hosp-select:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.hosp-select-icon {
  position: absolute;
  right: 12px;
  bottom: 12px;
  pointer-events: none;
  opacity: 0.4;
  color: var(--txt);
  font-size: 0.8rem;
}

/* Results Info */
.hosp-count-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding-top: 12px;
  gap: 12px;
  border-top: 1px solid var(--bd);
}
.hosp-verified {
  font-size: 0.72rem;
  color: var(--txt);
  opacity: 0.55;
  white-space: nowrap;
}
.hosp-count {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--pri);
  white-space: nowrap;
}
.hosp-divider {
  height: 1px;
  flex: 1;
  background: var(--bd);
  margin: 0 15px;
  opacity: 0.3;
}

/* Hospital List */
.hosp-list {
  counter-reset: hospital;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 20px;
}
.hosp-empty {
  text-align: center;
  padding: 40px 0;
  border: 1px dashed var(--bd);
  opacity: 0.5;
  color: var(--txt);
  font-weight: bold;
  font-size: 0.9rem;
  border-radius: 8px;
}

.hosp-card {
  padding: 0;
  border: 1px solid var(--bd);
  background: var(--card-bg);
  position: relative;
  transition:
    border-color 0.25s,
    box-shadow 0.25s;
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.hosp-card.expanded {
  border-color: var(--pri);
  box-shadow: 0 6px 18px rgba(255, 69, 0, 0.12);
}

.hosp-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  user-select: none;
}
.hosp-header-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex: 1;
  min-width: 0;
  min-height: var(--control-min-height);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.hosp-header-toggle:focus-visible,
.hosp-fav-btn:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}
.hosp-fav-btn {
  position: relative;
  z-index: 1;
  min-width: var(--control-min-height);
  min-height: var(--control-min-height);
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--txt);
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}
.hosp-fav-btn.active {
  transform: scale(1.05);
}
.hosp-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.hosp-toggle-icon {
  color: var(--pri);
  font-size: 0.75rem;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(255, 69, 0, 0.08);
}
.hosp-toggle-icon.expanded {
  transform: rotate(180deg);
}

.hosp-details {
  padding: 0 16px 14px 16px;
  border-top: 1px solid var(--bd);
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  animation: hospDetailsFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes hospDetailsFadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.hosp-name {
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0;
  color: var(--txt);
  flex: 1;
  min-width: 0;
}
.hosp-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--txt);
  opacity: 0.7;
  line-height: 1.4;
  margin: 0;
}
.hosp-location-note {
  margin: 0 0 10px;
  padding-left: 10px;
  border-left: 2px solid var(--pri);
  color: var(--txt-muted);
  font-size: 0.82rem;
  line-height: 1.65;
}
.hosp-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--pri);
}
.hosp-link {
  text-decoration: none;
  color: inherit;
  transition: 0.2s;
  display: flex;
  align-items: center;
  min-height: var(--control-min-height);
}

.hosp-tag {
  font-size: 0.75rem;
  font-weight: bold;
  padding: 4px 8px;
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
  color: var(--pri);
  border-radius: 6px;
  white-space: nowrap;
}
.hosp-call-btn {
  padding: 10px 15px;
  font-size: 0.9rem;
  font-weight: bold;
  border: 1px solid var(--pri);
  color: var(--pri);
  text-decoration: none;
  transition: 0.2s;
  border-radius: 8px;
  background: transparent;
  text-align: center;
  margin-top: 6px;
  display: block;
  min-height: var(--control-min-height);
}

@media (max-width: 768px) {
  /* 🌟 Mobile Optimizations for App-like feel */
  .hosp-page-wrapper {
    padding-top: 0;
  }

  .hosp-hero h1 {
    font-size: 2.35rem;
  }

  .hosp-workspace {
    grid-template-columns: 1fr;
  }

  .hosp-filter-panel {
    position: static;
    padding: 12px;
  }

  .hosp-alert-box {
    padding: 10px 12px; /* #16: 確保提示訊息可見 */
    margin-bottom: 10px;
    font-size: 0.8rem;
  }

  .hosp-filter-row {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 12px;
  }

  .hosp-select {
    padding: 6px 10px; /* 縮小輸入框高度 */
    font-size: 0.9rem;
  }

  .hosp-label {
    margin-bottom: 0px;
  }

  .hosp-card {
    padding: 0;
    border-radius: 12px;
  }

  .hosp-header {
    padding: 8px 14px;
    gap: 8px;
  }

  .hosp-header-toggle {
    gap: 8px;
  }

  .hosp-header-right {
    gap: 6px;
  }

  .hosp-name {
    font-size: 0.95rem;
  }

  .hosp-details {
    padding: 10px 14px 12px 14px;
    gap: 6px;
  }

  .hosp-detail-row {
    font-size: 0.8rem;
  }

  .hosp-icon {
    width: 12px;
    height: 12px;
    margin-top: 1px;
  }

  /* #2: 撥打電話按鈕 touch target ≥ 44px（WCAG 建議） */
  .hosp-call-btn {
    width: 100%;
    padding: 10px 16px;
    min-height: 44px;
    font-size: 0.85rem;
    margin-top: 4px;
  }

  .hosp-tag {
    font-size: 0.7rem;
    padding: 2px 6px;
  }

  .hosp-toggle-icon {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
  }
}

@media (hover: hover) and (pointer: fine) {
  .hosp-card:hover {
    border-color: var(--pri);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  }
  .hosp-header-toggle:hover {
    background: rgba(255, 69, 0, 0.03);
  }
  .hosp-link:hover {
    color: var(--pri);
  }
  .hosp-call-btn:hover {
    background: var(--pri);
    color: #fff;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hosp-card,
  .hosp-select,
  .hosp-header-toggle,
  .hosp-toggle-icon,
  .hosp-link,
  .hosp-call-btn,
  .hosp-fav-btn,
  .hosp-details {
    transition: none;
    animation: none;
  }
  .hosp-fav-btn.active {
    transform: none;
  }
}
/* 醫療資訊維持嚴謹可掃讀的清單感，地圖與聯絡資料不受影響。 */
.hosp-page-wrapper,
.hosp-filter-panel,
.hosp-alert-box,
.hosp-card,
.hosp-empty {
  border-radius: 0;
  box-shadow: none;
}

.hosp-hero h1,
.hosp-list-heading h2,
.hosp-card h2 {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.03em;
}

.hosp-filter-panel,
.hosp-card {
  background-image: none;
}

.hosp-search,
.hosp-select,
.hosp-filter-panel button,
.hosp-card a {
  border-radius: 2px;
  box-shadow: none;
}

/* 醫院名單採可掃讀的服務清單，篩選與展開資訊不再被卡片框切碎。 */
.hosp-hero {
  padding: 32px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.hosp-workspace {
  gap: 32px;
}

.hosp-filter-panel {
  padding: 18px 0;
  border-width: 1px 0;
  background: transparent;
}

.hosp-search,
.hosp-select {
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
}

.hosp-alert-box,
.hosp-empty {
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.hosp-list {
  gap: 0;
  border-top: 1px solid var(--bd);
}

.hosp-card,
.hosp-card.expanded {
  counter-increment: hospital;
  border-width: 0 0 1px;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.hosp-header::before {
  content: counter(hospital, decimal-leading-zero);
  align-self: center;
  margin-right: 12px;
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.hosp-card.expanded {
  border-color: var(--pri);
}

.hosp-header {
  padding: 18px 0;
}

.hosp-header-toggle {
  min-height: 36px;
}

.hosp-fav-btn,
.hosp-toggle-icon,
.hosp-tag,
.hosp-call-btn {
  border-radius: 0;
  box-shadow: none;
}

.hosp-toggle-icon {
  background: transparent;
  border: 1px solid var(--bd);
}

.hosp-details {
  padding: 14px 0 20px;
  background: transparent;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .hosp-card:hover,
  .hosp-card.expanded:hover {
    border-color: var(--pri);
    box-shadow: none;
  }

  .hosp-header-toggle:hover {
    background: transparent;
    color: var(--pri);
  }
}

@media (max-width: 768px) {
  .hosp-hero,
  .hosp-filter-panel {
    padding: 20px 0;
  }

  .hosp-card {
    border-radius: 0;
  }

  .hosp-header,
  .hosp-details {
    padding-left: 0;
    padding-right: 0;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .hosp-card:hover {
    transform: none;
    box-shadow: none;
  }
}
/* 醫療名錄保留篩選、展開與電話的清楚操作層級。 */
.hosp-page-wrapper {
  padding: 0 18px 18px;
}
.hosp-hero {
  padding-block: 12px 14px;
  margin-bottom: 12px;
}
.hosp-hero h1 {
  font-family: var(--font-heading-zh);
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.3;
}
.hosp-workspace {
  gap: 18px;
}
.hosp-alert-box {
  padding: 10px 0;
  margin-bottom: 12px;
  border: 0;
  border-bottom: 1px solid var(--bd);
}
.hosp-filter-panel {
  padding-block: 12px;
  border-radius: 0;
  box-shadow: none;
}
.hosp-document-meta {
  margin-bottom: 10px;
  padding-bottom: 10px;
}
.hosp-search-group,
.hosp-filter-row {
  margin-bottom: 10px;
}
.hosp-count-row {
  padding-top: 9px;
}
.hosp-list-heading {
  margin-bottom: 8px;
  padding-bottom: 8px;
}
.hosp-search,
.hosp-select {
  border: 1px solid var(--bd);
  border-radius: 2px;
  min-height: 44px;
}
.hosp-header {
  padding-block: 10px;
}
.hosp-header-toggle,
.hosp-fav-btn {
  min-height: 44px;
}
.hosp-fav-btn {
  min-width: 44px;
  border: 1px solid transparent;
  color: var(--txt);
  transition:
    color 0.16s ease-out,
    background-color 0.16s ease-out,
    border-color 0.16s ease-out,
    transform 0.16s ease-out;
}
.hosp-fav-btn.active {
  border-color: #e91e63;
  background: rgba(233, 30, 99, 0.08);
  color: #e91e63;
  box-shadow: none;
}
.hosp-name {
  font-family: var(--font-heading-zh);
  line-height: 1.5;
}
.hosp-call-btn {
  border: 1px solid var(--txt);
  border-radius: 2px;
  min-height: 44px;
  padding: 10px 14px;
}
.hosp-link {
  text-decoration: underline;
  text-underline-offset: 4px;
}
/* 本頁返回與次要操作使用同一按鈕形式。 */
:deep(.app-back-btn),
.btn-app {
  border-radius: 2px;
  min-height: 44px;
  box-shadow: none;
  font-family: var(--font-body-zh);
}
:deep(.app-back-btn) {
  border: 1px solid var(--txt);
}

@media (max-width: 768px) {
  .hosp-page-wrapper {
    padding: 0 14px 12px;
  }

  .hosp-document-meta {
    margin-bottom: 8px;
    padding-bottom: 8px;
  }

  .hosp-hero,
  .hosp-filter-panel {
    padding-block: 10px;
  }

  .hosp-hero {
    margin-bottom: 8px;
  }

  .hosp-workspace {
    gap: 12px;
  }

  .hosp-alert-box {
    padding-block: 8px;
    margin-bottom: 8px;
  }

  .hosp-search-group,
  .hosp-filter-row {
    margin-bottom: 8px;
  }

  .hosp-filter-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .hosp-count-row {
    padding-top: 8px;
  }

  .hosp-list-heading {
    margin-bottom: 4px;
    padding-bottom: 7px;
  }

  .hosp-header {
    padding-block: 8px;
  }

  .hosp-details {
    padding-top: 8px;
    padding-bottom: 10px;
  }
}
/* 共用一組搜尋與篩選，接續地圖工具列，避免同頁重複展示。 */
.hosp-intro {
  display: block;
  margin-bottom: 8px;
}
.hosp-intro .hosp-hero {
  margin: 0;
  max-width: none;
}
.hosp-intro .hosp-hero p {
  max-width: none;
}
:global(#main-content .hosp-page-wrapper .hosp-intro .hosp-hero) {
  padding-bottom: 0 !important;
}
.hosp-intro .hosp-filter-panel {
  position: static;
  min-width: 0;
}
.hosp-workspace {
  display: block;
}
.hosp-list-panel {
  min-width: 0;
}
@media (max-width: 767px) {
  .hosp-intro {
    grid-template-columns: minmax(0, 1fr);
    gap: 6px;
    margin-bottom: 8px;
  }
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .hosp-intro .hosp-filter-panel {
    display: grid;
    grid-template-columns: minmax(180px, 1.4fr) minmax(260px, 1.2fr) auto;
    gap: 8px 12px;
    padding: 8px 0;
    border-width: 1px 0;
  }
  .hosp-filter-panel .hosp-alert-box,
  .hosp-filter-panel .hosp-count-row {
    grid-column: 1 / -1;
  }
  .hosp-filter-panel .hosp-alert-box {
    margin: 0;
    padding: 4px 0;
    border: 0;
    font-size: 12px;
  }
  .hosp-alert-box .text-content {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: baseline;
  }
  .hosp-alert-box strong {
    margin: 0;
  }
  .hosp-filter-panel .hosp-search-group,
  .hosp-filter-panel .hosp-filter-row {
    margin: 0;
  }
  .hosp-filter-panel .hosp-filter-actions {
    align-self: end;
    margin: 0;
  }
  .hosp-filter-panel .hosp-count-row {
    padding-top: 4px;
  }
}
@media (min-width: 768px) and (max-width: 1099px) and (hover: hover) and (pointer: fine) {
  .hosp-intro .hosp-filter-panel {
    grid-template-columns: minmax(180px, 1fr) minmax(260px, 1fr);
  }
  .hosp-filter-panel .hosp-filter-actions {
    grid-column: 1 / -1;
  }
}
@media (max-width: 767px), (pointer: coarse) {
  .hosp-header-toggle {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .hosp-header-right {
    justify-content: space-between;
  }
  .hosp-name {
    width: 100%;
  }
}
</style>

<style scoped>
.hosp-sidebar-filter-details > summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  border-bottom: 1px solid var(--bd);
}
.hosp-sidebar-filters {
  position: static !important;
  display: block !important;
  padding: 0 !important;
  border: 0 !important;
  background: transparent;
}
.hosp-sidebar-filters .hosp-alert-box {
  padding: 8px 0;
  margin: 0 0 10px;
  border: 0;
  font-size: 11px;
  line-height: 1.55;
}
.hosp-sidebar-filters .hosp-alert-box .text-content {
  display: block;
}
.hosp-sidebar-filters .hosp-alert-box .text-content > span {
  display: block;
}
.hosp-sidebar-filters .hosp-filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 10px;
}
.hosp-sidebar-filters .hosp-select {
  font-size: 14px;
  padding: 8px 26px 8px 8px;
  min-height: 44px;
}
.hosp-sidebar-filters .hosp-filter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0;
}
.hosp-sidebar-filters .hosp-filter-actions label {
  font-size: 13px;
}
.hosp-sidebar-filters .hosp-filter-actions button {
  min-height: 44px;
  padding: 6px 10px;
  font-size: 13px;
}
.hosp-sidebar-filters .hosp-count-row {
  padding-top: 6px;
  margin-bottom: 0;
}
.hosp-sidebar-directory .hosp-list-heading {
  padding: 0;
  margin-bottom: 8px;
  font-size: 12px;
  gap: 8px;
}
.hosp-sidebar-directory .hosp-header {
  padding: 10px 0;
  gap: 6px;
}
.hosp-sidebar-directory .hosp-header::before {
  display: none;
}
.hosp-sidebar-directory .hosp-header-toggle {
  display: grid;
  gap: 6px;
  min-width: 0;
}
.hosp-sidebar-directory .hosp-name {
  font-size: 14px;
  white-space: normal;
  overflow-wrap: anywhere;
}
.hosp-sidebar-directory .hosp-header-right {
  justify-content: flex-start;
  gap: 6px;
}
.hosp-sidebar-directory .hosp-tag {
  font-size: 11px;
}
.hosp-sidebar-directory .hosp-fav-btn {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  background: transparent;
  border: 0;
  color: var(--txt-muted);
  text-shadow: none;
  filter: none;
}
.hosp-sidebar-directory .hosp-fav-btn.active {
  color: var(--pri);
}
.hosp-sidebar-directory .hosp-details {
  padding: 8px 0 12px;
  font-size: 13px;
}
.hosp-sidebar-directory .hosp-empty {
  padding: 14px 0;
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .hosp-sidebar-filter-details > summary {
    display: none;
  }
}
</style>

<style scoped>
.hosp-filter-actions,
.hosp-mobile-map-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.hosp-mobile-map-actions {
  margin-top: 0;
  gap: 6px;
}
.hosp-mobile-map-actions strong {
  margin-right: auto;
  font-size: 13px;
}
.hosp-map-picker {
  display: grid;
  gap: 4px;
  margin-top: 8px;
  font-size: 12px;
}
.hosp-map-picker select,
.hosp-map-picker input {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 6px 10px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  color: var(--txt);
  font: inherit;
}
.hosp-map-empty {
  padding: 16px 0;
}
.hosp-filter-actions label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
}
.hosp-filter-actions button,
.hosp-mobile-map-actions button,
.hosp-empty button {
  min-height: 44px;
  padding: 6px 10px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  color: var(--txt);
  font: inherit;
  cursor: pointer;
}
.hosp-mobile-map iframe {
  width: 100%;
  height: clamp(220px, 60vw, 270px);
  border: 0;
  pointer-events: none;
}
.hosp-mobile-map iframe.interactive {
  pointer-events: auto;
}
.hosp-mobile-map p {
  font-size: 12px;
  margin: 8px 0;
}
.hosp-map-section {
  scroll-margin-top: 80px;
}
@media (max-width: 767px), (pointer: coarse) {
  .hosp-filter-actions {
    font-size: 13px;
  }
  .hosp-map-section {
    scroll-margin-top: 12px;
  }
}
</style>

<style scoped>
.hosp-record-facts {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px 10px;
  margin: 6px 0 12px;
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.hosp-record-facts:empty {
  display: none;
}
.hosp-record-facts dt {
  color: var(--txt-muted);
}
.hosp-record-facts dd {
  margin: 0;
  white-space: pre-line;
}
.hosp-map-focus {
  min-height: 44px;
}
.hosp-name,
.hosp-link {
  overflow-wrap: anywhere;
}
</style>

<style scoped>
.hosp-sidebar-directory .hosp-card.selected {
  box-shadow: inset 3px 0 var(--pri);
}
</style>
