<script setup>
import { ref, computed } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
// HOSPITAL_REGIONS 仍從 js 讀（縣市區域分組是固定常數）；HOSPITAL_DATA 已搬到 Supabase
import { HOSPITAL_REGIONS } from '~/utils/hospitals'

const store = useMainStore()
const supabase = useSupabaseClient()

// SSR：從 Supabase 抓特寵醫院清單
const { data: hospitalsData } = await useAsyncData('hospitals-v1', async () => {
  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select(
        'id, name, address, city, district, phone, map_url, region, hours, has_emergency, accept_species, verified_at'
      )
      .eq('status', 'active')
      .order('id', { ascending: true })
    if (error || !data) return []
    return data.map((h) => ({
      id: String(h.id),
      name: h.name,
      address: h.address,
      city: h.city,
      district: h.district,
      phone: h.phone,
      mapUrl: h.map_url || null,
      region: h.region,
      hours: h.hours,
      hasEmergency: h.has_emergency,
      acceptSpecies: h.accept_species || [],
      verifiedAt: h.verified_at
    }))
  } catch (e) {
    console.error('[hospitals SSR] fetch failed:', e?.message)
    return []
  }
})

// 對外暴露給原本邏輯用
const HOSPITAL_DATA = computed(() => hospitalsData.value || [])

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

const hospCity = ref('all')
const hospDistrict = ref('all')
const hospExpanded = ref(new Set())

const toggleHospExpand = (id) => {
  if (hospExpanded.value.has(id)) {
    hospExpanded.value.delete(id)
  } else {
    hospExpanded.value.add(id)
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

const hospFiltered = computed(() => {
  return HOSPITAL_DATA.value.filter((h) => {
    const cityMatch = hospCity.value === 'all' || h.city === hospCity.value
    const districtMatch = hospDistrict.value === 'all' || h.district === hospDistrict.value
    return cityMatch && districtMatch
  })
})

const hospWishlist = computed(() => store.hospWishlist)

const changeCity = (val) => {
  hospCity.value = val
  hospDistrict.value = 'all'
}

const toggleHospWishlist = (id) => {
  if (store.hospWishlist.includes(id)) {
    store.hospWishlist = store.hospWishlist.filter((x) => x !== id)
  } else {
    store.hospWishlist.push(id)
  }
  if (import.meta.client) {
    localStorage.setItem('gencko_hosp_wishlist', JSON.stringify(store.hospWishlist))
  }
}

const getMapLink = (h) => {
  if (h.mapUrl) return h.mapUrl
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`
}

const hospUrl = 'https://www.genckobreeding.com/hospital'
const hospImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'

const hospPublisher = {
  '@type': 'Organization',
  name: 'Gencko Breeding Studio',
  alternateName: ['Gencko Studio', '捷客工作室'],
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

// 國碼正規化：02-2599-3907 → +886225993907
const toE164 = (phone) => {
  if (!phone) return null
  const digits = String(phone).replace(/[^\d]/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) return '+886' + digits.slice(1)
  return '+886' + digits
}

const hospRegionOf = (city) => {
  for (const [region, cities] of Object.entries(HOSPITAL_REGIONS)) {
    if (cities.includes(city)) return region
  }
  return ''
}

const hospMapUrlOf = (h) =>
  h.mapUrl ||
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`

// FAQ：5 題（草稿已與使用者確認）
const hospFaqLd = {
  '@type': 'FAQPage',
  '@id': `${hospUrl}#faq`,
  mainEntity: [
    {
      '@type': 'Question',
      name: '什麼是特寵醫院？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '特寵醫院是指能診療特殊寵物的醫療院所，常見對象包含守宮、蛇、龜、兩棲類、鳥類與其他非犬貓動物。這類醫院通常較熟悉不同物種的保溫需求、麻醉與用藥劑量，也比較有處理爬蟲與兩棲動物常見疾病的經驗。'
      }
    },
    {
      '@type': 'Question',
      name: '看守宮要找哪種醫院？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '看守宮時，優先找有收治爬蟲或特殊寵物經驗的特寵醫院，而不是只看離家最近的一般犬貓醫院。掛號前建議先電話確認院方是否有看守宮、是否能處理急診或住院，以及是否熟悉守宮常見的拒食、代謝性骨病、脫皮異常與外傷問題。'
      }
    },
    {
      '@type': 'Question',
      name: '特寵醫院一定有夜間急診嗎？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '不一定。特寵醫院代表院方有看特殊寵物的能力，但不代表每一間都有 24 小時急診、夜診或假日門診。帶守宮就醫前，最好先確認該院平日門診時段、夜間是否有人值班，以及遇到突發狀況時是否需要先電話聯繫。'
      }
    },
    {
      '@type': 'Question',
      name: '爬蟲獸醫和特寵醫院是一樣的意思嗎？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '不完全一樣。爬蟲獸醫通常是指對守宮、蛇、龜等爬蟲類有診療經驗的醫師；特寵醫院則是較廣義的名稱，可能同時收治爬蟲、鳥類、兔子、鼠類與其他特殊寵物。對守宮飼主來說，重點不是名稱本身，而是院方是否真的有看爬蟲與守宮的臨床經驗。'
      }
    },
    {
      '@type': 'Question',
      name: '找不到我附近的特寵醫院怎麼辦？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '本頁名單為持續更新的版本，若你的縣市或行政區未列入，可能是該地區尚無收治爬蟲、守宮、兩棲類等特殊寵物的專業獸醫。建議先以「所有縣市」搜尋鄰近區域的醫院，並提前以電話確認該院是否診療你的物種；若知道遺漏的醫院，歡迎透過 LINE @219abdzn 回報，我們會更新清單。'
      }
    },
    {
      '@type': 'Question',
      name: '守宮急診時要怎麼判斷該不該帶去醫院？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '建議出現下列任一情況就立即就醫：超過 14 天完全拒食且體重明顯下降、斷尾流血止不住、嘔吐或腹瀉持續超過 24 小時、無法正常翻身或站立、神經症狀（轉圈、頭傾斜、抽搐）、明顯外傷或紅腫。其他輕微狀況可先參考 /health 健康評估，但若不確定請以就醫為優先。'
      }
    },
    {
      '@type': 'Question',
      name: '特寵醫院和一般動物醫院有什麼差異？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '一般動物醫院多以犬貓為主，對爬蟲、兩棲、鳥類的解剖學、麻醉劑量、常見疾病的處置經驗有限。特寵醫院（或稱特殊寵物專科醫院）有專門的設備（保溫箱、爬蟲適用 X 光與超音波）、知道守宮 / 蛇 / 龜等動物的劑量計算，能更精準診斷與用藥。'
      }
    },
    {
      '@type': 'Question',
      name: '掛號前要準備什麼？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '建議準備：① 個體基本資訊（物種、年齡、性別、體重）② 飼養環境照片或數值（溫度、濕度、底材、燈具）③ 近期飲食與排便狀況紀錄 ④ 症狀出現的時間軸 ⑤ 若有可疑食物或藥品請一併帶去 ⑥ 用通風的保溫盒運送（冬天加暖暖包但隔絕直接接觸）。'
      }
    },
    {
      '@type': 'Question',
      name: '夜間或假日守宮突發狀況怎麼辦？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '請先撥打名單中標示有夜間或 24 小時的醫院確認當天有醫師值班；多數特寵醫院門診時段固定，無夜間急診。緊急情況下可先進行基礎穩定：保持環境溫度 28–30°C、避免進一步刺激、止血（如有外傷）、並盡快聯絡有經驗的飼主或醫院。建議平時就記下 1–2 間最近的特寵醫院電話。'
      }
    }
  ]
}

// BreadcrumbList
const hospBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/' },
    { '@type': 'ListItem', position: 2, name: '特寵醫院查詢', item: hospUrl }
  ]
}

// [SEO] 動態地圖 Meta 與結構化資料
const siteData = computed(() => {
  const city = hospCity.value === 'all' ? '' : hospCity.value
  const dist = hospDistrict.value === 'all' ? '' : hospDistrict.value
  const locationStr = city ? `${city}${dist}` : '全台'

  const title = `${locationStr} 特寵醫院查詢｜爬蟲、守宮、兩棲動物獸醫地圖`
  const desc = `${locationStr}爬蟲、守宮、兩棲動物等特殊寵物醫院名單（共 ${hospFiltered.value.length} 間），提供電話、地址與 Google Maps 導航。Gencko Breeding Studio 整理之全台特寵獸醫資源，協助飼主在第一時間找到專業醫療協助。`

  // ItemList of VeterinaryCare：列出全部（不再 slice 20）
  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${hospUrl}#hospitals`,
    name: `${locationStr}特寵醫院清單`,
    numberOfItems: hospFiltered.value.length,
    itemListElement: hospFiltered.value.map((h, index) => {
      const e164 = toE164(h.phone)
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
      cssSelector: ['.page-title', '.hosp-name', '.hosp-alert-box']
    },
    publisher: hospPublisher,
    about: [
      { '@type': 'Thing', name: '爬蟲特寵醫療' },
      { '@type': 'Taxon', name: 'Eublepharis macularius', alternateName: '豹紋守宮' },
      { '@type': 'Taxon', name: 'Hemitheconyx caudicinctus', alternateName: '肥尾守宮' }
    ],
    mainEntity: itemListLd,
    hasPart: [hospFaqLd]
  }

  return {
    title,
    desc,
    script: [
      { type: 'application/ld+json', innerHTML: JSON.stringify(webPageLd) },
      { type: 'application/ld+json', innerHTML: JSON.stringify(hospBreadcrumbLd) }
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
    { property: 'og:title', content: computed(() => siteData.value.title) },
    { property: 'og:description', content: computed(() => siteData.value.desc) },
    { property: 'og:image', content: hospImg },
    { property: 'og:image:alt', content: '全台特寵醫院查詢 - Gencko Breeding Studio' },
    { property: 'og:url', content: hospUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: computed(() => siteData.value.title) },
    { name: 'twitter:description', content: computed(() => siteData.value.desc) },
    { name: 'twitter:image', content: hospImg }
  ],
  link: [{ rel: 'canonical', href: hospUrl }],
  script: computed(() => siteData.value.script)
})
</script>

<template>
  <div class="hosp-page-wrapper">
    <h1 class="sr-only">全台特寵醫院查詢｜爬蟲、守宮、兩棲動物獸醫地圖</h1>

    <div class="hosp-alert-box">
      <span class="icon">💡</span>
      <div class="text-content">
        <strong>收藏清單儲存於本機瀏覽器</strong>
        <span>若清除瀏覽器快取或更換手機/電腦，收藏紀錄將會消失喔！</span>
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
          <optgroup v-for="(cities, region) in HOSPITAL_REGIONS" :key="region" :label="region">
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
          :disabled="hospCity === 'all'"
          aria-label="行政區"
        >
          <option value="all">所有區域</option>
          <option v-for="d in hospDistricts" :key="d" :value="d">{{ d }}</option>
        </select>
        <div class="hosp-select-icon">▼</div>
      </div>
    </div>

    <!-- Results Info -->
    <div class="hosp-count-row">
      <span class="hosp-count">搜尋結果: {{ hospFiltered.length }} 間</span>
      <div class="hosp-divider"></div>
      <span v-if="hospitalsVerifiedDate" class="hosp-verified" :title="`本清單最後驗證日`">
        資料更新：{{ hospitalsVerifiedDate }}
      </span>
    </div>

    <!-- Hospital List -->
    <div class="hosp-list">
      <div v-if="hospFiltered.length === 0" class="hosp-empty">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          style="display: block; margin: 0 auto 10px auto"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        沒有找到符合的醫院
      </div>

      <article
        v-for="h in hospFiltered"
        :key="h.id"
        class="hosp-card"
        :class="{ expanded: isHospExpanded(h.id) }"
      >
        <div class="hosp-header" @click="toggleHospExpand(h.id)">
          <h3 class="hosp-name">{{ h.name }}</h3>
          <div class="hosp-header-right">
            <span class="hosp-tag">{{ h.city }} {{ h.district }}</span>
            <span
              class="fav-btn"
              :class="{ active: hospWishlist.includes(h.id) }"
              @click.stop.prevent="toggleHospWishlist(h.id)"
              style="
                position: relative;
                top: auto;
                right: auto;
                z-index: 10;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
              "
            >
              ❤
            </span>
            <span
              class="hosp-toggle-icon"
              :class="{ expanded: isHospExpanded(h.id) }"
              aria-hidden="true"
            >
              ▼
            </span>
          </div>
        </div>

        <div v-show="isHospExpanded(h.id)" class="hosp-details">
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
            <svg
              class="hosp-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
              ></path>
            </svg>
            <span style="font-family: monospace">{{ h.phone }}</span>
          </div>

          <a :href="'tel:' + h.phone.replace(/[^\d]/g, '')" class="hosp-call-btn" @click.stop>
            撥打電話
          </a>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
/*
  [局部樣式修復] 
  已清除所有寫死深淺色的背景與文字色碼。
  全面導入 CSS 變數，徹底移除所有不必要的 :global(body.day-mode) 覆寫。
*/
.hosp-page-wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding-top: 15px;
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
  margin-bottom: 20px;
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
  margin-bottom: 12px;
  padding: 0 5px;
  gap: 0;
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
.hosp-card:hover {
  border-color: var(--pri);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}
.hosp-card.expanded {
  border-color: var(--pri);
  box-shadow: 0 6px 18px rgba(255, 69, 0, 0.12);
}

.hosp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.hosp-header:hover {
  background: rgba(255, 69, 0, 0.03);
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
}
.hosp-link:hover {
  color: var(--pri);
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
}
.hosp-call-btn:hover {
  background: var(--pri);
  color: #fff;
}

@media (max-width: 768px) {
  /* 🌟 Mobile Optimizations for App-like feel */
  .hosp-page-wrapper {
    padding-top: 0;
  }

  .hosp-alert-box {
    padding: 10px 12px; /* #16: 確保提示訊息可見 */
    margin-bottom: 10px;
    font-size: 0.8rem;
  }

  .hosp-filter-row {
    /* 🌟 保持並排，減少垂直高度佔用 */
    grid-template-columns: 1fr 1fr;
    gap: 15px; /* 縮減間距 */
    margin-bottom: 0px;
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
    padding: 12px 14px;
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
</style>
