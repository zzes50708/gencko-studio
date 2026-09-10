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
const hospQuery = ref('')
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
  const query = hospQuery.value.trim().toLocaleLowerCase('zh-TW')
  return HOSPITAL_DATA.value.filter((h) => {
    const cityMatch = hospCity.value === 'all' || h.city === hospCity.value
    const districtMatch = hospDistrict.value === 'all' || h.district === hospDistrict.value
    const keywordMatch =
      !query ||
      [h.name, h.address, h.city, h.district].some((value) =>
        String(value || '')
          .toLocaleLowerCase('zh-TW')
          .includes(query)
      )
    return cityMatch && districtMatch && keywordMatch
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
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
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
    <header class="hosp-hero">
      <div class="hosp-document-meta" aria-label="醫院名錄說明">
        <span>GENCKO CARE DIRECTORY</span>
        <span>SEARCH / SAVE / CONTACT</span>
      </div>
      <span>EXOTIC CARE DIRECTORY / 全台資源</span>
      <h1>特寵醫院查詢</h1>
      <p>以縣市、行政區或關鍵字縮小既有名單；展開後可直接撥號或前往真實 Google Maps 連結。</p>
    </header>

    <div class="hosp-workspace">
      <aside class="hosp-filter-panel" aria-label="醫院篩選條件">
        <div class="hosp-alert-box">
          <span class="icon">i</span>
          <div class="text-content">
            <strong>收藏儲存在這台裝置</strong>
            <span>清除瀏覽器資料或更換裝置後，收藏紀錄不會保留。</span>
          </div>
        </div>

        <label class="hosp-search-group">
          <span class="hosp-label">名稱或地址</span>
          <input
            v-model="hospQuery"
            type="search"
            class="hosp-search"
            aria-label="搜尋醫院名稱或地址"
            placeholder="輸入醫院、路名或行政區"
          />
        </label>

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

        <div class="hosp-count-row" aria-live="polite">
          <span class="hosp-count">{{ hospFiltered.length }} 間符合條件</span>
          <span v-if="hospitalsVerifiedDate" class="hosp-verified">
            更新 {{ hospitalsVerifiedDate }}
          </span>
        </div>
      </aside>

      <section class="hosp-list-panel" aria-label="特寵醫院清單">
        <div class="hosp-list-heading">
          <span>DIRECTORY</span>
          <strong>點選醫院查看聯絡方式</strong>
        </div>

        <!-- Hospital List -->
        <div class="hosp-list">
          <div v-if="hospFiltered.length === 0" class="hosp-empty">
            沒有找到符合的醫院，請放寬縣市或關鍵字條件。
          </div>

          <article
            v-for="h in hospFiltered"
            :key="h.id"
            class="hosp-card"
            :class="{ expanded: isHospExpanded(h.id) }"
          >
            <div class="hosp-header">
              <button
                type="button"
                class="hosp-header-toggle"
                :aria-expanded="isHospExpanded(h.id)"
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
                :aria-label="hospWishlist.includes(h.id) ? `取消收藏 ${h.name}` : `收藏 ${h.name}`"
                @click="toggleHospWishlist(h.id)"
              >
                ❤
              </button>
            </div>

            <div :id="`hosp-details-${h.id}`" v-show="isHospExpanded(h.id)" class="hosp-details">
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
                <span class="hosp-phone">{{ h.phone }}</span>
              </div>

              <a :href="'tel:' + h.phone.replace(/[^\d]/g, '')" class="hosp-call-btn" @click.stop>
                撥打電話
              </a>
            </div>
          </article>
        </div>
      </section>
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
  padding: 8px 18px 28px;
}
.hosp-hero {
  padding-block: 22px;
  margin-bottom: 20px;
}
.hosp-hero h1 {
  font-family: var(--font-heading-zh);
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.3;
}
.hosp-workspace {
  gap: 24px;
}
.hosp-alert-box {
  padding: 14px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
}
.hosp-filter-panel {
  border-radius: 0;
  box-shadow: none;
}
.hosp-search,
.hosp-select {
  border: 1px solid var(--bd);
  border-radius: 2px;
  min-height: 44px;
}
.hosp-header {
  padding-block: 14px;
}
.hosp-header-toggle,
.hosp-fav-btn {
  min-height: 44px;
}
.hosp-fav-btn {
  min-width: 44px;
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
</style>
