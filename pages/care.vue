<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import {
  PERSONAS,
  ANCHORS,
  ENV_ITEMS,
  TEMP_GRADIENT,
  HUMIDITY_CONFIG,
  HUMIDITY_SEASONAL,
  HUMIDITY_RELATED,
  FEED_FREQ,
  FEEDERS,
  FEEDER_RELATED,
  SUPPLEMENTS,
  SUPPLEMENT_WARN,
  SUPPLEMENT_RELATED,
  BREEDING_NOTES,
  BREEDING_RELATED,
  DANGERS,
  FAQ
} from '~/utils/care'

const store = useMainStore()
const router = useRouter()
const supabase = useSupabaseClient()

// SSR：抓取 FAQ 對應文章的 summary，用於 FAQPage JSON-LD 答案
const faqArticleIds = FAQ.map((f) => f.article).filter(Boolean)
const { data: faqArticles } = await useAsyncData('care-faq-articles', async () => {
  if (!faqArticleIds.length) return {}
  try {
    const { data, error } = await supabase
      .from('articles')
      .select('id, summary, title')
      .in('id', faqArticleIds)
      .ilike('status', 'published')
    if (error || !data) return {}
    return Object.fromEntries(
      data.map((a) => [a.id, { summary: a.summary || '', title: a.title || '' }])
    )
  } catch (e) {
    console.warn('[care] FAQ 文章 summary 抓取失敗:', e?.message)
    return {}
  }
})

// JSON-LD：FAQPage（11 題，answer = 文章 summary，找不到時跳過）
const faqPageLd = computed(() => {
  const mainEntity = FAQ.map((item) => {
    const art = faqArticles.value?.[item.article]
    const answer = art?.summary?.trim()
    if (!answer) return null
    return {
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer + ` 完整內容請見《${art.title || ''}》（/articles/${item.article}）`
      }
    }
  }).filter(Boolean)
  if (!mainEntity.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://www.genckobreeding.com/care#faq',
    mainEntity: mainEntity
  }
})

// JSON-LD：HowTo①「如何設置守宮飼養環境」（步驟取自 ENV_ITEMS）
const howToEnvLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': 'https://www.genckobreeding.com/care#howto-env',
  name: '如何為守宮設置安全的飼養環境（新手 3 步驟）',
  description: '從飼養箱、底材到躲避處，依序設置出符合豹紋與肥尾守宮生理需求的環境。',
  image: [
    'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
  ],
  totalTime: 'PT30M',
  estimatedCost: { '@type': 'MonetaryAmount', currency: 'TWD', value: 2000 },
  supply: ENV_ITEMS.map((e) => ({ '@type': 'HowToSupply', name: e.title })),
  step: ENV_ITEMS.map((e, idx) => ({
    '@type': 'HowToStep',
    position: idx + 1,
    name: e.title,
    text: `規格：${e.spec}。${e.body}${e.warn ? ' ' + e.warn : ''}${e.note ? ' ' + e.note : ''}`,
    url: `https://www.genckobreeding.com/care#env-${e.id}`
  }))
}

// JSON-LD：HowTo②「依年齡的餵食頻率」（步驟取自 FEED_FREQ）
const howToFeedLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': 'https://www.genckobreeding.com/care#howto-feed',
  name: '豹紋守宮餵食頻率指南：依年齡階段調整',
  description: '幼體、亞成體、成體與孕母守宮各有不同的餵食頻率與份量需求。',
  image: [
    'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
  ],
  step: FEED_FREQ.map((row, idx) => ({
    '@type': 'HowToStep',
    position: idx + 1,
    name: row.age,
    text: `頻率：${row.freq}；份量：${row.qty}；主食：${row.menu}。餌料尺寸不可超過守宮頭部寬度。`
  }))
}

// JSON-LD：BreadcrumbList
const howToAppetiteLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': 'https://www.genckobreeding.com/care#howto-appetite',
  name: '守宮拒食時，怎麼判斷先觀察還是就醫',
  description:
    '用環境、體態、排泄與警訊四個層次，快速判斷守宮拒食時該先調整飼養條件，還是直接安排特寵醫院就診。',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: '先排查環境和近期變化',
      text: '先確認熱端、冷端、濕躲與補鈣節奏是否正常，再回想最近是否有換環境、換餌料、脫皮或搬家等壓力事件。'
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: '再看體態是否正在掉',
      text: '如果尾巴厚度、體重和精神都還穩定，短期拒食通常可以先觀察；如果尾巴明顯變瘦、眼神疲弱或活動力下降，就不是單純挑食。'
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: '把排泄和外觀一起看',
      text: '同時檢查是否仍有正常排便、腹部是否脹、嘴角眼鼻是否有分泌物，避免只看吃不吃而漏掉消化道或感染問題。'
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: '分辨何時該直接就醫',
      text: '幼體連續多日不吃、成體長時間拒食合併掉重、拉稀、嘔吐、呼吸異常或脫水時，不要再拖，直接找會看爬蟲的特寵醫院。'
    }
  ]
}

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    {
      '@type': 'ListItem',
      position: 2,
      name: '新手飼養教學',
      item: 'https://www.genckobreeding.com/care'
    }
  ]
}

// JSON-LD：Article（整頁視為長文教學，給 LLM 吃 articleBody）
const articleBodyText = [
  `守宮飼養指南完整收錄環境配置、溫度梯度、濕度配置、餵食與營養、補充品劑量、繁殖預備、照護警示與新手常見問題。`,
  `環境配置：${ENV_ITEMS.map((e) => `${e.title}（${e.spec}）`).join('；')}。`,
  `溫度梯度：冷區 ${TEMP_GRADIENT.cold.range}、過渡區 ${TEMP_GRADIENT.middle.range}、熱區 ${TEMP_GRADIENT.hot.range}；${TEMP_GRADIENT.nightMin}；${TEMP_GRADIENT.danger}。`,
  `濕度配置：${HUMIDITY_CONFIG.map((h) => `${h.zone} ${h.range}（${h.desc}）`).join('；')}。`,
  `餵食頻率：${FEED_FREQ.map((f) => `${f.age} - ${f.freq}，${f.qty}，主食 ${f.menu}`).join('；')}。`,
  `補充品：${SUPPLEMENTS.map((s) => `${s.name}（鈣粉 ${s.juvenile}／綜合維 ${s.adult}）`).join('；')}。${SUPPLEMENT_WARN}`,
  `致命地雷：${DANGERS.map((d) => `${d.title}（${d.consequence}）`).join('；')}。`
].join(' ')

// JSON-LD：WebPage 包覆（Article 為 mainEntity，FAQPage / HowTo 為 hasPart）
const webPageLd = computed(() => {
  const hasPart = [howToEnvLd, howToFeedLd, howToAppetiteLd]
  if (faqPageLd.value) hasPart.push(faqPageLd.value)
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://www.genckobreeding.com/care',
    url: 'https://www.genckobreeding.com/care',
    name: '豹紋與肥尾守宮飼養指南',
    inLanguage: 'zh-TW',
    isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: [
        '.care-hero-title',
        '.care-env-card',
        '.care-temp-bar',
        '.care-humidity-card',
        '.care-faq-q-text'
      ]
    },
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    },
    mainEntity: {
      '@type': 'Article',
      '@id': 'https://www.genckobreeding.com/care#article',
      headline: '豹紋與肥尾守宮飼養指南：環境、溫濕度、餵食、補充品、地雷、FAQ 全收錄',
      description:
        '豹紋守宮（Eublepharis macularius）與肥尾守宮（Hemitheconyx caudicinctus）完整新手飼養教學：飼養箱、底材、溫度梯度、濕度、餵食頻率、餌料對照、補充品劑量、致命地雷與新手常見問題。',
      image: [
        'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
      ],
      articleSection: '新手飼養教學',
      articleBody: articleBodyText,
      wordCount: articleBodyText.replace(/\s+/g, '').length,
      inLanguage: 'zh-TW',
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
      author: {
        '@type': 'Organization',
        name: 'Gencko Breeding Studio',
        alternateName: ['Gencko Studio', '捷客工作室'],
        url: 'https://www.genckobreeding.com'
      },
      publisher: {
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
    },
    hasPart: hasPart
  }
})

useHead({
  title: '豹紋與肥尾守宮飼養指南｜環境、溫濕度、餵食、地雷一次看',
  meta: [
    {
      name: 'description',
      content:
        '豹紋守宮（Eublepharis macularius）與肥尾守宮（Hemitheconyx caudicinctus）完整新手飼養教學：環境配置、溫度梯度、濕度配置、餵食頻率、餌料對照、補充品劑量、致命地雷與新手常見問題一站收錄。'
    },
    // Open Graph
    { property: 'og:title', content: '豹紋與肥尾守宮飼養指南｜環境、溫濕度、餵食、地雷一次看' },
    {
      property: 'og:description',
      content:
        '環境、溫濕度、餌料對照、補充品、致命地雷、FAQ 全收錄。新手飼養豹紋守宮與肥尾守宮的一站式指南。'
    },
    {
      property: 'og:image',
      content:
        'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    },
    { property: 'og:image:alt', content: '守宮飼養指南 - Gencko Breeding Studio' },
    { property: 'og:url', content: 'https://www.genckobreeding.com/care' },
    { property: 'og:type', content: 'article' },
    { property: 'article:section', content: '新手飼養教學' },
    {
      property: 'article:tag',
      content: '豹紋守宮, 肥尾守宮, 新手飼養, 守宮環境, 溫度梯度, 餵食頻率, 致命地雷'
    },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '豹紋與肥尾守宮飼養指南｜環境、溫濕度、餵食、地雷一次看' },
    {
      name: 'twitter:description',
      content: '環境、溫濕度、餌料對照、補充品、致命地雷、FAQ 全收錄。'
    },
    {
      name: 'twitter:image',
      content:
        'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    }
  ],
  link: [{ rel: 'canonical', href: 'https://www.genckobreeding.com/care' }],
  script: [
    { type: 'application/ld+json', children: computed(() => JSON.stringify(webPageLd.value)) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbLd) }
  ]
})

const articleById = (id) => store.articlesList?.find((a) => a.ID === id) || null

const goArticle = (id) => {
  const art = articleById(id)
  if (art) router.push(`/articles/${art.ID}`)
}

const relatedByCategory = computed(() => {
  const groups = { 環境佈置: [], 健康照護: [], 行為與互動: [], 餵食與營養: [] }
  ;(store.articlesList || []).forEach((a) => {
    if (groups[a.Category]) groups[a.Category].push(a)
  })
  return groups
})

const recommendedArticles = computed(() => {
  const list = [...(store.articlesList || [])]
  const seed = new Date().toISOString().slice(0, 10)
  return list
    .sort((a, b) => `${a.ID}-${seed}`.localeCompare(`${b.ID}-${seed}`))
    .sort((a, b) => {
      const ah = `${a.ID}-${seed}`.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
      const bh = `${b.ID}-${seed}`.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
      return ah - bh
    })
    .slice(0, 5)
})

const sidebarAnchors = computed(() => {
  const order = ['env', 'temp', 'humidity', 'food', 'breeding', 'faq']
  return [...ANCHORS].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
})

const environmentWarnings = DANGERS.filter((item) => item.id === 'cohab')
const temperatureWarnings = DANGERS.filter((item) => item.id === 'noTherm')
const feedingWarnings = DANGERS.filter((item) => item.id === 'monoDiet')
const environmentArticleIds = computed(() =>
  [
    ...ENV_ITEMS.flatMap((item) => item.related || []),
    ...TEMP_GRADIENT.related,
    ...HUMIDITY_RELATED,
    ...environmentWarnings.flatMap((item) => item.related || []),
    ...temperatureWarnings.flatMap((item) => item.related || [])
  ].filter((id, index, list) => list.indexOf(id) === index)
)
const feedingArticleIds = computed(() =>
  [
    ...FEEDER_RELATED,
    ...SUPPLEMENT_RELATED,
    ...feedingWarnings.flatMap((item) => item.related || [])
  ].filter((id, index, list) => list.indexOf(id) === index)
)

const scrollProgress = ref(0)

const handleScroll = () => {
  if (typeof window === 'undefined') return
  const doc = document.documentElement
  const total = doc.scrollHeight - doc.clientHeight
  scrollProgress.value = total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll()
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') window.removeEventListener('scroll', handleScroll)
})

const scrollTo = (id) => {
  if (typeof window === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  const offset = window.innerWidth <= 1024 ? 156 : 110
  const top = el.getBoundingClientRect().top + window.scrollY - offset
  window.scrollTo({ top, behavior: 'smooth' })
}

const handlePersona = (p) => {
  if (p.href) {
    router.push(p.href)
    return
  }
  scrollTo(p.target)
}

const openFaq = ref(null)
const toggleFaq = (i) => {
  openFaq.value = openFaq.value === i ? null : i
}
</script>

<template>
  <div class="care-page">
    <div class="care-progress-bar">
      <div class="care-progress-fill" :style="{ width: `${scrollProgress}%` }"></div>
    </div>

    <section class="care-hero">
      <div class="care-document-meta">
        <span>GENCKO FIELD MANUAL</span>
        <span>REV. 01 · 日常照護</span>
      </div>
      <div class="care-hero-copy">
        <div class="care-hero-kicker">CARE MANUAL · 日常照護手冊</div>
        <h1 class="care-hero-title">守宮飼養指南</h1>
        <p class="care-hero-lead">
          先把環境與日常照護做對；遇到異常時，再依狀況前往健康評估或特寵醫院。
        </p>
      </div>
    </section>

    <nav class="care-decision-map" data-testid="care-decision-map" aria-label="照護決策入口">
      <div class="care-map-label">依目前狀況前往</div>
      <NuxtLink no-prefetch to="/start-here">第一次飼養</NuxtLink>
      <NuxtLink no-prefetch to="/health">健康異常評估</NuxtLink>
      <NuxtLink no-prefetch to="/hospital">尋找特寵醫院</NuxtLink>
      <NuxtLink no-prefetch to="/articles">深入知識文章</NuxtLink>
    </nav>

    <div class="care-body">
      <main class="care-main">
        <section class="care-reading-index" aria-labelledby="care-reading-index-title">
          <div>
            <span>READING INDEX</span>
            <h2 id="care-reading-index-title">從環境開始，依序建立每日照護</h2>
          </div>
          <div class="care-reading-index-links">
            <button v-for="a in sidebarAnchors" :key="a.id" type="button" @click="scrollTo(a.id)">
              <span>{{ a.icon }}</span>
              {{ a.label }}
            </button>
          </div>
        </section>
        <section id="env" class="care-section">
          <h2 class="care-h">環境配置</h2>
          <div class="care-env-grid">
            <div v-for="e in ENV_ITEMS" :key="e.id" class="care-env-card">
              <div class="care-env-head">
                <span class="care-env-icon">{{ e.icon }}</span>
                <span class="care-env-title">{{ e.title }}</span>
              </div>
              <div class="care-env-spec">{{ e.spec }}</div>
              <div class="care-env-body">{{ e.body }}</div>
              <div v-if="e.warn" class="care-env-warn">{{ e.warn }}</div>
              <div v-if="e.note" class="care-env-note">💡 {{ e.note }}</div>
              <div v-if="e.comingArticle" class="care-coming">📝 完整對照文章敬請期待</div>
            </div>
          </div>
          <div class="care-subh">環境警示</div>
          <div class="care-danger-grid">
            <div v-for="d in environmentWarnings" :key="d.id" class="care-danger-card">
              <div class="care-danger-head">
                <span class="care-danger-title">{{ d.title }}</span>
              </div>
              <div class="care-danger-consequence">後果：{{ d.consequence }}</div>
              <div class="care-danger-why">{{ d.why }}</div>
            </div>
          </div>

          <div id="temp" class="care-subsection">
            <h3 class="care-subh">溫度梯度</h3>

            <div class="care-temp-bar">
              <div class="care-temp-zone" :style="{ background: TEMP_GRADIENT.cold.color }">
                <span class="care-temp-zone-range">{{ TEMP_GRADIENT.cold.range }}</span>
                <span class="care-temp-zone-label">{{ TEMP_GRADIENT.cold.label }}</span>
              </div>
              <div class="care-temp-zone" :style="{ background: TEMP_GRADIENT.middle.color }">
                <span class="care-temp-zone-range">{{ TEMP_GRADIENT.middle.range }}</span>
                <span class="care-temp-zone-label">{{ TEMP_GRADIENT.middle.label }}</span>
              </div>
              <div class="care-temp-zone" :style="{ background: TEMP_GRADIENT.hot.color }">
                <span class="care-temp-zone-range">{{ TEMP_GRADIENT.hot.range }}</span>
                <span class="care-temp-zone-label">{{ TEMP_GRADIENT.hot.label }}</span>
              </div>
            </div>

            <div class="care-temp-notes">
              <div class="care-temp-note">🌙 {{ TEMP_GRADIENT.nightMin }}</div>
              <div class="care-temp-warn">{{ TEMP_GRADIENT.danger }}</div>
            </div>

            <div class="care-subh">加溫安全</div>
            <div class="care-danger-grid">
              <div v-for="d in temperatureWarnings" :key="d.id" class="care-danger-card">
                <div class="care-danger-head">
                  <span class="care-danger-title">{{ d.title }}</span>
                </div>
                <div class="care-danger-consequence">後果：{{ d.consequence }}</div>
                <div class="care-danger-why">{{ d.why }}</div>
              </div>
            </div>
          </div>

          <div id="humidity" class="care-subsection">
            <h3 class="care-subh">濕度配置</h3>
            <div class="care-humidity-grid">
              <div
                v-for="h in HUMIDITY_CONFIG"
                :key="h.zone"
                class="care-humidity-card"
                :style="{ '--accent': h.color }"
              >
                <div class="care-humidity-zone">{{ h.zone }}</div>
                <div class="care-humidity-range">{{ h.range }}</div>
                <div class="care-humidity-desc">{{ h.desc }}</div>
              </div>
            </div>
          </div>

          <CareHabitatExplorer />

          <div class="care-subh">環境延伸閱讀</div>
          <div class="care-inline-chips">
            <button
              v-for="aid in environmentArticleIds"
              :key="aid"
              type="button"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
          </div>
        </section>

        <section id="food" class="care-section">
          <h2 class="care-h">餵食與營養</h2>
          <div class="care-subh">依年齡的餵食頻率</div>
          <div class="care-table care-table--feed">
            <div class="care-tr care-tr-head">
              <div>年齡</div>
              <div>頻率</div>
              <div>份量</div>
              <div>主食</div>
            </div>
            <div v-for="row in FEED_FREQ" :key="row.age" class="care-tr">
              <div>{{ row.age }}</div>
              <div>{{ row.freq }}</div>
              <div>{{ row.qty }}</div>
              <div>{{ row.menu }}</div>
            </div>
          </div>

          <div class="care-feed-rule">💡 餌料尺寸不超過守宮頭部寬度。</div>

          <div class="care-subh">主要餌料對照</div>
          <div class="care-feeder-grid">
            <div v-for="f in FEEDERS" :key="f.id" class="care-feeder-card">
              <div class="care-feeder-head">
                <span class="care-feeder-name">{{ f.name }}</span>
                <span class="care-feeder-tag" :class="f.tag.includes('✅') ? 'is-good' : 'is-warn'">
                  {{ f.tag }}
                </span>
              </div>
              <div class="care-feeder-stats">
                <span>蛋白 {{ f.protein }}</span>
                <span>脂肪 {{ f.fat }}</span>
                <span>鈣 {{ f.calcium }}</span>
              </div>
              <div class="care-feeder-row">
                <span>✓</span>
                {{ f.pros }}
              </div>
              <div class="care-feeder-row">
                <span>✗</span>
                {{ f.cons }}
              </div>
            </div>
          </div>

          <div class="care-subh">餵食警示</div>
          <div class="care-danger-grid">
            <div v-for="d in feedingWarnings" :key="d.id" class="care-danger-card">
              <div class="care-danger-head">
                <span class="care-danger-title">{{ d.title }}</span>
              </div>
              <div class="care-danger-consequence">後果：{{ d.consequence }}</div>
              <div class="care-danger-why">{{ d.why }}</div>
            </div>
          </div>

          <div class="care-subh">補充品劑量</div>
          <div class="care-table care-table--supp">
            <div class="care-tr care-tr-head">
              <div>守宮年齡階段</div>
              <div>鈣粉（含 D3）</div>
              <div>綜合維生素粉</div>
            </div>
            <div v-for="s in SUPPLEMENTS" :key="s.name" class="care-tr care-tr-3">
              <div>{{ s.name }}</div>
              <div>{{ s.juvenile }}</div>
              <div>{{ s.adult }}</div>
            </div>
          </div>

          <div class="care-supp-warn">{{ SUPPLEMENT_WARN }}</div>

          <div class="care-subh">拒食時先觀察還是就醫？</div>
          <section class="care-howto-card" aria-labelledby="care-appetite-title">
            <h3 id="care-appetite-title" class="care-howto-title">守宮拒食判讀四步驟</h3>
            <div class="care-howto-steps">
              <div class="care-howto-step">
                <div class="care-howto-no">01</div>
                <div>
                  <strong>先排查環境與近期變化</strong>
                  <p>先看溫度、濕躲、補鈣與最近是否有換環境、脫皮、搬動或突然換餌。</p>
                </div>
              </div>
              <div class="care-howto-step">
                <div class="care-howto-no">02</div>
                <div>
                  <strong>再看體態有沒有掉</strong>
                  <p>
                    尾巴厚度、精神、站姿都還穩，通常可短期觀察；如果正在變瘦，就不要只當成挑食。
                  </p>
                </div>
              </div>
              <div class="care-howto-step">
                <div class="care-howto-no">03</div>
                <div>
                  <strong>把排泄與外觀一起看</strong>
                  <p>確認有沒有正常排便、腹脹、流口水、眼鼻分泌物，避免漏看消化道或感染問題。</p>
                </div>
              </div>
              <div class="care-howto-step">
                <div class="care-howto-no">04</div>
                <div>
                  <strong>出現警訊就直接就醫</strong>
                  <p>
                    幼體多日不吃、成體拒食合併掉重、拉稀、嘔吐、脫水或呼吸異常時，直接找特寵醫院。
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div class="care-subh">餵食延伸閱讀</div>
          <div class="care-inline-chips">
            <button
              v-for="aid in feedingArticleIds"
              :key="aid"
              type="button"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
          </div>
        </section>

        <section id="breeding" class="care-section">
          <h2 class="care-h">繁殖預備</h2>
          <ul class="care-bullet-list">
            <li v-for="(b, i) in BREEDING_NOTES" :key="i">{{ b }}</li>
          </ul>

          <div class="care-inline-chips">
            <button
              v-for="aid in BREEDING_RELATED"
              :key="aid"
              type="button"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
          </div>
        </section>

        <section id="faq" class="care-section">
          <h2 class="care-h">常見問題</h2>
          <div class="care-faq-list">
            <div
              v-for="(item, i) in FAQ"
              :key="i"
              class="care-faq-item"
              :class="{ 'is-open': openFaq === i }"
            >
              <button
                type="button"
                class="care-faq-q"
                :aria-expanded="openFaq === i"
                :aria-controls="`care-faq-answer-${i}`"
                @click="toggleFaq(i)"
              >
                <span class="care-faq-q-text">{{ item.q }}</span>
                <span class="care-faq-q-icon">{{ openFaq === i ? '−' : '+' }}</span>
              </button>
              <div v-if="openFaq === i" :id="`care-faq-answer-${i}`" class="care-faq-a">
                <div class="care-faq-summary">
                  {{ articleById(item.article)?.Summary || '完整內容請參考下方文章' }}
                </div>
                <button type="button" class="care-chip" @click="goArticle(item.article)">
                  → 閱讀完整文章
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="related" class="care-section">
          <h2 class="care-h">完整知識庫</h2>
          <div
            v-for="(arts, cat) in relatedByCategory"
            v-show="arts.length"
            :key="cat"
            class="care-related-block"
          >
            <div class="care-related-cat">{{ cat }}</div>
            <div class="care-related-grid">
              <NuxtLink
                no-prefetch
                v-for="a in arts"
                :key="a.ID"
                :to="`/articles/${a.ID}`"
                class="care-related-card"
              >
                <div class="care-related-title">{{ a.Title }}</div>
                <div class="care-related-summary">{{ a.Summary }}</div>
              </NuxtLink>
            </div>
          </div>
        </section>

        <div class="care-quote">
          我們將守宮視為需被妥善照護的生命，而非一般商品。本指南旨在協助飼主以正確、全面的知識理解守宮的行為與需求，並依其生理特性提供安全、穩定且適宜的環境。每個個體性格、反應與適應能力皆有差異，照護方式並無絕對標準，請依個體狀況彈性調整。
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.care-page {
  margin: 0 auto;
  max-width: 1300px;
  padding: 0 20px 60px;
  position: relative;
}

.care-hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 14px;
  padding: clamp(24px, 4vw, 48px) !important;
  border: 1px solid var(--bd);
  border-radius: calc(var(--radius-lg) + 8px);
  background:
    radial-gradient(circle at 88% 14%, var(--pri-glow-soft), transparent 28%),
    repeating-linear-gradient(0deg, transparent 0 47px, var(--bd) 48px 49px), var(--card-bg);
  box-shadow: var(--shadow-card);
  text-align: left;
}

.care-hero-kicker {
  margin-bottom: 8px;
  color: var(--pri);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.care-hero-lead {
  max-width: 680px;
  margin: 12px 0 24px;
  color: var(--txt-muted);
  line-height: 1.75;
}

.care-decision-map {
  display: grid;
  grid-template-columns: minmax(180px, 1.1fr) repeat(4, minmax(140px, 0.75fr));
  gap: 1px;
  overflow: hidden;
  margin-bottom: 4px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-md);
  background: var(--bd);
}

.care-map-label,
.care-decision-map a {
  min-height: var(--control-min-height);
  padding: 12px 14px;
  background: var(--card-bg-solid);
}

.care-map-label {
  display: flex;
  align-items: center;
  color: var(--pri);
  font-size: 0.75rem;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.care-decision-map a {
  display: flex;
  align-items: center;
  color: var(--txt);
  font-size: 0.8rem;
  font-weight: 800;
  text-decoration: none;
}

.m-only {
  display: none !important;
}

.care-progress-bar {
  background: rgba(128, 128, 128, 0.1);
  height: 3px;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 100;
}

.care-progress-fill {
  background: linear-gradient(90deg, var(--pri), #ff8c42);
  box-shadow: 0 0 8px var(--pri-glow);
  height: 100%;
  transition: width 0.1s;
}

.care-hero {
  padding: 0 0 0;
  text-align: center;
}

.care-anchor-nav {
  display: none;
}

.care-anchor-btn {
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 999px;
  color: var(--txt);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  gap: 5px;
  min-height: var(--control-min-height);
  padding: 6px 10px;
  white-space: nowrap;
}

.care-hero-title {
  color: var(--txt);
  font-size: clamp(2.3rem, 6vw, 5.5rem);
  font-weight: 900;
  letter-spacing: 1px;
  margin: 0;
  line-height: 0.98;
  letter-spacing: -0.05em;
}

.care-hero-stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 10px;
}

.care-stat-card {
  background: var(--card-bg);
  border: 1.5px solid var(--bd);
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
  color: var(--txt);
  cursor: pointer;
  font-family: inherit;
  overflow: hidden;
  min-height: var(--control-min-height);
  padding: 10px 12px;
  position: relative;
  text-align: center;
  transition: 0.25s;
}

.care-stat-card::before {
  background: var(--accent);
  content: '';
  height: 3px;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.care-stat-label {
  color: var(--txt);
  font-size: 0.7rem;
  letter-spacing: 1px;
  margin-bottom: 2px;
  opacity: 0.55;
}

.care-stat-value {
  color: var(--accent);
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 0;
}

.care-stat-sub {
  font-size: 0.68rem;
  opacity: 0.65;
}

.care-body {
  display: block;
  padding-top: 14px;
}

.care-main {
  min-width: 0;
}

@media (min-width: 1024px) {
  .care-hero {
    margin-right: 304px;
    margin-top: 0;
  }

  .care-body {
    display: grid;
    gap: 24px;
    grid-template-columns: 1fr 280px;
  }

  .care-main {
    min-width: 0;
  }

  .care-sidebar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: fixed;
    right: max(20px, calc((100vw - 1300px) / 2 + 20px));
    top: 108px;
    width: 264px;
    z-index: 40;
  }
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .care-decision-map a:hover {
    color: var(--pri);
    background: var(--pri-glow-soft);
  }
}

.care-sidebar-box {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 9px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.04);
  margin-bottom: 0;
  padding: 9px;
}

.care-sidebar-title {
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 5px;
  text-transform: uppercase;
}

.care-sidebar-link {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--txt);
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: 0.78rem;
  gap: 5px;
  min-height: var(--control-min-height);
  padding: 5px 7px;
  text-align: left;
  transition: 0.15s;
  width: 100%;
}

.care-sidebar-art {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid var(--bd);
  border-radius: 8px;
  color: var(--txt);
  display: block;
  min-height: var(--control-min-height);
  padding: 7px 8px;
  text-decoration: none;
  transition: 0.15s;
}

.care-sidebar-art-title {
  display: block;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.3;
}

.care-sidebar-art-cat {
  background: rgba(255, 69, 0, 0.1);
  border-radius: 4px;
  color: var(--pri);
  display: inline-block;
  font-size: 0.6rem;
  margin-bottom: 3px;
  padding: 2px 5px;
}

.care-section {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 12px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 12px;
  padding: 14px 16px;
  scroll-margin-top: 70px;
}

.care-h {
  border-bottom: 2px solid var(--pri);
  color: var(--txt);
  display: inline-block;
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0 0 10px;
  padding-bottom: 6px;
}

.care-subh {
  color: var(--pri);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  margin: 14px 0 8px;
  text-transform: uppercase;
}

.care-subh:first-of-type {
  margin-top: 0;
}

.care-howto-card {
  background: linear-gradient(180deg, rgba(255, 138, 76, 0.08), rgba(255, 138, 76, 0.02));
  border: 1px solid rgba(255, 138, 76, 0.2);
  border-radius: 16px;
  margin-top: 12px;
  padding: 16px;
}

.care-howto-title {
  color: var(--txt);
  font-size: 0.96rem;
  font-weight: 900;
  margin: 0 0 12px;
}

.care-howto-steps {
  display: grid;
  gap: 10px;
}

.care-howto-step {
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 138, 76, 0.16);
  border-radius: 12px;
  display: grid;
  gap: 10px;
  grid-template-columns: 52px minmax(0, 1fr);
  padding: 12px;
}

.care-howto-step strong {
  color: var(--txt);
  display: block;
  font-size: 0.88rem;
  margin-bottom: 4px;
}

.care-howto-step p {
  color: var(--txt);
  line-height: 1.65;
  margin: 0;
  opacity: 0.84;
}

.care-howto-no {
  align-items: center;
  background: linear-gradient(135deg, var(--pri), #ff8c42);
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: 0.9rem;
  height: 38px;
  justify-content: center;
  letter-spacing: 1px;
  width: 38px;
}

.care-inline-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.care-chip {
  align-items: center;
  background: rgba(255, 69, 0, 0.07);
  border: 1px solid rgba(255, 69, 0, 0.3);
  border-radius: 6px;
  color: var(--pri);
  cursor: pointer;
  display: inline-flex;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  min-height: var(--control-min-height);
  padding: 4px 10px;
  transition: 0.2s;
}

.care-chip.is-danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.care-env-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.care-env-card {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 12px;
}

.care-env-head {
  align-items: center;
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
}

.care-env-icon {
  font-size: 1.2rem;
}

.care-env-title {
  color: var(--txt);
  font-size: 0.95rem;
  font-weight: 800;
}

.care-env-spec {
  color: var(--pri);
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.care-env-body {
  color: var(--txt);
  font-size: 0.82rem;
  line-height: 1.5;
  opacity: 0.85;
}

.care-env-warn,
.care-env-note {
  border-radius: 5px;
  color: var(--txt);
  font-size: 0.78rem;
  line-height: 1.45;
  margin-top: 6px;
  padding: 6px 9px;
}

.care-env-warn {
  background: rgba(239, 68, 68, 0.08);
  border-left: 3px solid #ef4444;
}

.care-env-note {
  background: rgba(74, 222, 128, 0.07);
  border-left: 3px solid #4ade80;
}

.care-coming {
  color: var(--txt);
  font-size: 0.78rem;
  font-style: italic;
  margin-top: 8px;
  opacity: 0.55;
}

.care-temp-bar {
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  margin-bottom: 8px;
  overflow: hidden;
}

.care-temp-zone {
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 10px;
  text-align: center;
}

.care-temp-zone-range {
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: 1rem;
  font-weight: 900;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

.care-temp-zone-label {
  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0.95;
}

.care-temp-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 4px;
}

.care-temp-note,
.care-temp-warn {
  font-size: 0.8rem;
  padding: 6px 10px;
}

.care-temp-note {
  background: rgba(128, 128, 128, 0.05);
  border-radius: 6px;
}

.care-temp-warn {
  background: rgba(239, 68, 68, 0.08);
  border-left: 3px solid #ef4444;
  border-radius: 5px;
  color: var(--txt);
  font-weight: 600;
}

.care-humidity-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: 8px;
}

.care-humidity-card {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid var(--bd);
  border-left: 4px solid var(--accent);
  border-radius: 10px;
  padding: 10px 12px;
}

.care-humidity-zone {
  color: var(--txt);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  opacity: 0.7;
}

.care-humidity-range {
  color: var(--accent);
  font-family: 'Black Ops One', monospace, sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
  line-height: 1.1;
  margin: 2px 0;
}

.care-humidity-desc {
  color: var(--txt);
  font-size: 0.78rem;
  opacity: 0.8;
}

.care-season-tip {
  background: rgba(255, 69, 0, 0.05);
  border-left: 3px solid var(--pri);
  border-radius: 5px;
  padding: 7px 10px;
}

.care-season-tip-head {
  color: var(--pri);
  font-size: 0.82rem;
  font-weight: 800;
  margin-bottom: 2px;
}

.care-season-tip-body {
  color: var(--txt);
  font-size: 0.78rem;
  line-height: 1.5;
}

.care-table {
  border: 1px solid var(--bd);
  border-radius: 8px;
  margin-bottom: 6px;
  overflow: hidden;
}

.care-tr {
  border-bottom: 1px solid var(--bd);
  color: var(--txt);
  display: grid;
  font-size: 0.82rem;
  grid-template-columns: repeat(4, 1fr);
  padding: 7px 10px;
}

.care-tr-3 {
  grid-template-columns: repeat(3, 1fr);
}
.care-tr:last-child {
  border-bottom: none;
}

.care-tr-head {
  background: rgba(128, 128, 128, 0.08);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  opacity: 0.8;
  text-transform: uppercase;
}

.care-feed-rule {
  color: var(--txt);
  font-size: 0.78rem;
  margin-bottom: 4px;
  opacity: 0.7;
}

.care-feeder-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  margin-bottom: 6px;
}

.care-feeder-card {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 10px 12px;
}

.care-feeder-head {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: space-between;
  margin-bottom: 4px;
}

.care-feeder-name {
  color: var(--txt);
  font-size: 0.92rem;
  font-weight: 800;
}

.care-feeder-tag {
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
}

.care-feeder-tag.is-good {
  background: rgba(74, 222, 128, 0.15);
  color: #16a34a;
}

.care-feeder-tag.is-warn {
  background: rgba(251, 146, 60, 0.15);
  color: #d97706;
}

.care-feeder-stats {
  border-bottom: 1px dashed var(--bd);
  color: var(--txt);
  display: flex;
  font-size: 0.7rem;
  gap: 8px;
  margin-bottom: 5px;
  opacity: 0.7;
  padding-bottom: 5px;
}

.care-feeder-row {
  color: var(--txt);
  display: flex;
  font-size: 0.76rem;
  gap: 5px;
  line-height: 1.4;
  margin-bottom: 2px;
}

.care-feeder-row span {
  flex-shrink: 0;
  font-weight: 700;
}

.care-feeder-row:nth-of-type(odd) span {
  color: #16a34a;
}
.care-feeder-row:nth-of-type(even) span {
  color: #ef4444;
}

.care-supp-warn {
  background: rgba(239, 68, 68, 0.06);
  border-left: 3px solid #ef4444;
  border-radius: 5px;
  color: var(--txt);
  font-size: 0.78rem;
  line-height: 1.45;
  margin-top: 4px;
  padding: 6px 10px;
}

.care-bullet-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.care-bullet-list li {
  background: rgba(128, 128, 128, 0.04);
  border-left: 3px solid var(--pri);
  border-radius: 5px;
  color: var(--txt);
  font-size: 0.82rem;
  line-height: 1.45;
  margin-bottom: 5px;
  padding: 7px 11px;
}

.care-danger-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr;
}

@media (min-width: 1200px) {
  .care-danger-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.care-danger-card {
  background: rgba(239, 68, 68, 0.04);
  border: 1.5px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
}

.care-danger-head {
  align-items: center;
  display: flex;
  gap: 6px;
  margin-bottom: 5px;
}

.care-danger-icon {
  font-size: 1.05rem;
}

.care-danger-title {
  color: #ef4444;
  font-size: 0.92rem;
  font-weight: 800;
}

.care-danger-consequence {
  color: var(--txt);
  font-size: 0.8rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.care-danger-why {
  color: var(--txt);
  font-size: 0.76rem;
  line-height: 1.5;
  opacity: 0.8;
}

.care-toggle-btn {
  background: transparent;
  border: 1px dashed var(--bd);
  border-radius: 6px;
  color: var(--pri);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  min-height: var(--control-min-height);
  margin-bottom: 8px;
  padding: 7px;
  transition: 0.2s;
  width: 100%;
}

.care-species-table .care-tr div:first-child {
  font-weight: 700;
  opacity: 0.7;
}

.care-faq-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.care-faq-item {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid var(--bd);
  border-radius: 8px;
  overflow: hidden;
  transition: 0.2s;
}

.care-faq-item.is-open {
  border-color: var(--pri);
}

.care-faq-q {
  align-items: center;
  background: transparent;
  border: none;
  color: var(--txt);
  cursor: pointer;
  display: flex;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  justify-content: space-between;
  min-height: var(--control-min-height);
  padding: 9px 12px;
  text-align: left;
  width: 100%;
}

.care-faq-q-icon {
  align-items: center;
  color: var(--pri);
  display: flex;
  flex-shrink: 0;
  font-size: 1.1rem;
  font-weight: 400;
  height: 20px;
  justify-content: center;
  width: 20px;
}

.care-faq-a {
  border-top: 1px dashed var(--bd);
  padding: 8px 12px 10px;
}

.care-faq-summary {
  color: var(--txt);
  font-size: 0.8rem;
  line-height: 1.5;
  margin-bottom: 6px;
  opacity: 0.85;
}

.care-related-block {
  margin-bottom: 12px;
}
.care-related-block:last-child {
  margin-bottom: 0;
}

.care-related-cat {
  background: rgba(255, 69, 0, 0.08);
  border-radius: 5px;
  color: var(--pri);
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 6px;
  padding: 3px 9px;
}

.care-related-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.care-related-card {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid var(--bd);
  border-radius: 8px;
  color: var(--txt);
  padding: 8px 10px;
  text-decoration: none;
  transition: 0.2s;
}

.care-related-title {
  color: var(--txt);
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 2px;
}

.care-related-summary {
  color: var(--txt);
  display: -webkit-box;
  font-size: 0.72rem;
  -webkit-line-clamp: 2;
  line-height: 1.4;
  opacity: 0.7;
  overflow: hidden;
  -webkit-box-orient: vertical;
}

.care-stat-card:focus-visible,
.care-anchor-btn:focus-visible,
.care-sidebar-link:focus-visible,
.care-sidebar-art:focus-visible,
.care-chip:focus-visible,
.care-toggle-btn:focus-visible,
.care-faq-q:focus-visible,
.care-related-card:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .care-stat-card:hover {
    border-color: var(--accent);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
    transform: translateY(-3px);
  }

  .care-sidebar-link:hover {
    background: rgba(255, 69, 0, 0.06);
    color: var(--pri);
  }

  .care-sidebar-art:hover {
    background: rgba(255, 69, 0, 0.04);
    border-color: var(--pri);
    color: var(--pri);
  }

  .care-chip:hover {
    background: var(--pri);
    color: #fff;
  }

  .care-chip.is-danger:hover {
    background: #ef4444;
    color: #fff;
  }

  .care-toggle-btn:hover {
    background: rgba(255, 69, 0, 0.05);
    border-color: var(--pri);
  }

  .care-related-card:hover {
    background: rgba(255, 69, 0, 0.04);
    border-color: var(--pri);
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .care-stat-card,
  .care-sidebar-link,
  .care-sidebar-art,
  .care-chip,
  .care-toggle-btn,
  .care-faq-item,
  .care-related-card {
    transition: none;
  }

  .care-stat-card:hover,
  .care-related-card:hover {
    transform: none;
  }
}

.care-quote {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-left: 4px solid var(--pri);
  border-radius: 10px;
  color: var(--txt);
  font-size: 0.82rem;
  line-height: 1.55;
  margin-top: 12px;
  padding: 12px 16px;
}

.dt-only {
  display: block;
}

@media (max-width: 1024px) {
  .dt-only {
    display: none !important;
  }
  .m-only {
    display: block !important;
  }
  .care-anchor-nav {
    display: flex;
    gap: 6px;
    position: fixed;
    top: calc(40px + env(safe-area-inset-top, 0px) + 50px);
    left: 0;
    right: 0;
    overflow-x: auto;
    padding: 8px 20px 8px;
    margin: 0;
    background: var(--card-bg);
    border-bottom: 1px solid var(--bd);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.08);
    z-index: 998;
    scrollbar-width: none;
    transition: transform 0.3s ease;
  }
  .care-anchor-nav--nav-hidden {
    transform: translateY(-50px);
  }
  .care-anchor-nav::-webkit-scrollbar {
    display: none;
  }
  .care-page {
    padding-top: 48px;
  }
  .care-decision-map {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .care-map-label {
    grid-column: 1 / -1;
  }
  .care-section {
    scroll-margin-top: 156px;
  }
}

@media (max-width: 768px) {
  .care-page {
    padding: 48px 10px 24px;
  }
  .care-hero {
    padding: 22px 16px !important;
  }
  .care-hero-title {
    font-size: clamp(2.2rem, 12vw, 3.5rem);
  }
  .care-hero-lead {
    margin: 10px 0 18px;
    font-size: 0.86rem;
  }
  .care-decision-map {
    margin-bottom: 10px;
  }
  .care-map-label,
  .care-decision-map a {
    min-height: var(--control-min-height);
    padding: 10px;
  }
  .care-hero-stats {
    gap: 6px;
    margin-bottom: 8px;
  }
  .care-stat-card {
    padding: 8px 6px;
  }
  .care-stat-value {
    font-size: 0.9rem;
  }
  .care-stat-sub {
    font-size: 0.62rem;
  }
  .care-anchor-nav {
    padding: 7px 10px 8px;
  }
  .care-anchor-btn {
    font-size: 0.7rem;
    padding: 5px 8px;
  }
  .care-section {
    margin-bottom: 8px;
    padding: 10px 12px;
  }
  .care-howto-card {
    border-radius: 14px;
    padding: 12px;
  }
  .care-howto-step {
    gap: 8px;
    grid-template-columns: 42px minmax(0, 1fr);
    padding: 10px;
  }
  .care-howto-no {
    font-size: 0.78rem;
    height: 32px;
    width: 32px;
  }
  .care-howto-step strong {
    font-size: 0.82rem;
  }
  .care-howto-step p {
    font-size: 0.78rem;
    line-height: 1.6;
  }
  .care-h {
    font-size: 0.92rem;
    margin-bottom: 8px;
    padding-bottom: 4px;
  }
  .care-env-grid,
  .care-humidity-grid {
    grid-template-columns: 1fr;
  }
  .care-temp-zone {
    padding: 8px 6px;
  }
  .care-temp-zone-range {
    font-size: 0.85rem;
  }
  .care-temp-zone-label {
    font-size: 0.62rem;
  }
  .care-tr,
  .care-tr-3 {
    grid-template-columns: 1fr 1fr;
  }
  .care-tr {
    font-size: 0.75rem;
    gap: 4px;
    padding: 5px 8px;
  }
  .care-tr-head {
    display: none;
  }
  .care-table--feed,
  .care-table--supp,
  .care-table--species {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .care-table--feed .care-tr {
    gap: 8px;
    grid-template-columns: minmax(112px, 1.1fr) minmax(60px, 0.7fr) minmax(56px, 0.6fr) minmax(
        150px,
        1.5fr
      );
    min-width: 410px;
    white-space: nowrap;
  }
  .care-table--supp .care-tr,
  .care-table--species .care-tr {
    gap: 8px;
    grid-template-columns: minmax(110px, 0.95fr) minmax(170px, 1fr) minmax(170px, 1fr);
    min-width: 470px;
  }
  .care-table--feed .care-tr-head,
  .care-table--supp .care-tr-head,
  .care-table--species .care-tr-head {
    display: grid;
  }
  .care-danger-grid,
  .care-feeder-grid,
  .care-related-grid {
    grid-template-columns: 1fr;
  }
  .care-quote {
    font-size: 0.75rem;
    padding: 10px 12px;
  }
}
/* 照護手冊採取紙本閱讀感；警示與溫度色帶仍為資訊的一部分。 */
.care-page,
.care-hero,
.care-decision-map,
.care-section,
.care-env-card,
.care-humidity-card,
.care-feeder-card,
.care-danger-card,
.care-howto-card,
.care-sidebar-box {
  border-radius: 0;
  box-shadow: none;
}

.care-hero-title,
.care-h,
.care-howto-title,
.care-sidebar-title {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.03em;
}

.care-env-card,
.care-humidity-card,
.care-feeder-card,
.care-howto-card {
  background-image: none;
}

.care-chip,
.care-toggle-btn,
.care-anchor-btn,
.care-faq-q {
  border-radius: 2px;
  box-shadow: none;
}

/* 完整手冊重構：文件抬頭、目錄與章節使用同一套閱讀節奏。 */
.care-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 0.8fr);
  gap: 32px;
  padding: clamp(32px, 6vw, 88px) 0 !important;
  border-width: 1px 0;
  background: transparent;
}

.care-document-meta {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  color: var(--txt-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.13em;
}

.care-hero-copy {
  max-width: 680px;
}

.care-hero-stats {
  align-self: end;
  margin: 0;
}

.care-reading-index {
  display: grid;
  grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.25fr);
  gap: 24px;
  padding: 32px 0;
  border-bottom: 1px solid var(--bd);
}

.care-reading-index > div:first-child > span {
  color: var(--pri);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.14em;
}

.care-reading-index h2 {
  margin: 8px 0 0;
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  line-height: 1.2;
}

.care-reading-index-links {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--bd);
  border-left: 1px solid var(--bd);
}

.care-reading-index-links button {
  min-height: 48px;
  padding: 8px 0;
  border: 0;
  border-right: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
  background: transparent;
  color: var(--txt);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 750;
  text-align: left;
  cursor: pointer;
}

.care-reading-index-links button span {
  color: var(--pri);
  margin-right: 8px;
}

.care-section {
  margin: 0;
  padding: clamp(28px, 5vw, 56px) 0;
  border-width: 0 0 1px;
  background: transparent;
}

.care-main {
  counter-reset: care-chapter;
}

.care-main > .care-section {
  position: relative;
  display: grid;
  grid-template-columns: minmax(132px, 0.22fr) minmax(0, 1fr);
  column-gap: clamp(20px, 4vw, 64px);
}

.care-main > .care-section::before {
  content: 'CHAPTER ' counter(care-chapter, decimal-leading-zero);
  counter-increment: care-chapter;
  grid-column: 1;
  grid-row: 1;
  color: var(--pri);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.13em;
  padding-top: 8px;
}

.care-main > .care-section > * {
  grid-column: 2;
}

.care-main > .care-section > .care-h {
  grid-column: 2;
}

.care-env-grid,
.care-humidity-grid,
.care-feeder-grid,
.care-danger-grid,
.care-related-grid {
  grid-column: 2;
}

.care-table,
.care-temp-bar,
.care-howto-card,
.care-faq-list,
.care-bullet-list {
  grid-column: 2;
}

.care-inline-chips,
.care-temp-notes,
.care-feed-rule,
.care-supp-warn,
.care-quote {
  grid-column: 2;
}

.care-h {
  display: block;
  width: 100%;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--bd);
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1.5rem, 3vw, 2.4rem);
}

@media (max-width: 768px) {
  .care-hero,
  .care-reading-index {
    grid-template-columns: 1fr;
    gap: 22px;
  }

  .care-document-meta {
    font-size: 0.58rem;
  }

  .care-reading-index-links {
    grid-template-columns: 1fr;
  }

  .care-main > .care-section {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .care-main > .care-section::before,
  .care-main > .care-section > *,
  .care-main > .care-section > .care-h {
    grid-column: 1;
  }
}

/* 照護內容採紙本手冊的章節節奏，不以浮起卡片切碎閱讀流程。 */
.care-hero,
.care-section,
.care-sidebar-box,
.care-howto-card,
.care-env-card,
.care-humidity-card,
.care-feeder-card,
.care-danger-card,
.care-faq-item,
.care-related-card,
.care-quote {
  border-radius: 0;
  background-image: none;
  box-shadow: none;
}

.care-hero {
  padding: 32px 0;
  border-width: 1px 0;
  background: transparent;
}

.care-decision-map {
  gap: 0;
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
}

.care-map-label,
.care-decision-map a {
  min-height: 68px;
  border: 0;
  border-right: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}

.care-decision-map > :last-child {
  border-right: 0;
}

.care-hero-stats {
  gap: 0;
  border-top: 1px solid var(--bd);
}

.care-stat-card {
  border: 0;
  border-right: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.care-stat-card:last-child {
  border-right: 0;
}

.care-stat-card::before {
  display: none;
}

.care-section {
  padding: 28px 0;
  border-width: 1px 0 0;
}

.care-howto-steps,
.care-env-grid,
.care-humidity-grid,
.care-feeder-grid,
.care-danger-grid,
.care-related-grid {
  gap: 0;
  border-top: 1px solid var(--bd);
  border-left: 1px solid var(--bd);
}

.care-howto-step,
.care-env-card,
.care-humidity-card,
.care-feeder-card,
.care-danger-card,
.care-related-card {
  border-width: 0 1px 1px 0;
  border-radius: 0;
  background: transparent;
}

.care-howto-no,
.care-related-cat,
.care-feeder-tag {
  border-radius: 0;
  background: transparent;
}

.care-howto-no {
  background: var(--pri);
  color: #fff;
}

.care-chip,
.care-toggle-btn,
.care-anchor-btn,
.care-faq-q {
  border-radius: 0;
  box-shadow: none;
}

@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .care-stat-card:hover,
  .care-related-card:hover {
    transform: none;
    box-shadow: none;
    background: color-mix(in srgb, var(--pri) 4%, transparent);
  }
}

@media (max-width: 768px) {
  .care-hero,
  .care-section {
    padding: 20px 0;
  }

  .care-decision-map,
  .care-hero-stats,
  .care-howto-steps,
  .care-env-grid,
  .care-humidity-grid,
  .care-feeder-grid,
  .care-danger-grid,
  .care-related-grid {
    gap: 0;
  }

  .care-map-label,
  .care-decision-map a,
  .care-stat-card {
    border-right: 0;
    border-bottom: 1px solid var(--bd);
  }
}

/* 12 /care：單欄編輯式手冊，移除浮動導覽與卡片牆。 */
.care-page {
  max-width: 1180px;
  padding: 0 clamp(18px, 4vw, 56px) clamp(28px, 5vw, 56px);
}

.care-progress-bar {
  height: 2px;
  background: transparent;
}

.care-progress-fill {
  background: var(--pri);
  box-shadow: none;
}

.care-hero {
  grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr);
  gap: clamp(24px, 5vw, 72px);
  margin: 0;
  padding: clamp(18px, 3vw, 38px) 0 clamp(24px, 4vw, 46px) !important;
  text-align: left;
}

.care-document-meta {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--bd);
}

.care-hero-kicker {
  margin-bottom: 14px;
  font-size: 0.68rem;
}

.care-hero-title {
  max-width: 8em;
  font-size: clamp(2.8rem, 6vw, 5.4rem);
  font-weight: 700;
  line-height: 1.05;
}

.care-hero-lead {
  max-width: 560px;
  margin: 18px 0 0;
  font-size: clamp(0.94rem, 1.2vw, 1.05rem);
  line-height: 1.85;
}

.care-hero-media {
  display: grid;
  min-height: 150px;
  place-content: center;
  gap: 8px;
  margin: 26px 0 0;
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
  color: var(--txt-muted);
  text-align: center;
}

.care-hero-media div {
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.care-hero-media figcaption {
  font-size: 0.76rem;
}

.care-hero-stats {
  align-self: end;
  grid-template-columns: 1fr;
  border-top: 1px solid var(--bd);
}

.care-stat-card {
  display: grid;
  grid-template-columns: 4.5em minmax(0, 1fr) auto;
  gap: 14px;
  align-items: baseline;
  min-height: 0;
  padding: 13px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  color: var(--txt);
  text-align: left;
}

.care-stat-label,
.care-stat-sub {
  margin: 0;
  font-size: 0.68rem;
}

.care-stat-value {
  margin: 0;
  color: var(--txt);
  font-family: var(--font-body-zh);
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.care-decision-map {
  grid-template-columns: minmax(160px, 1fr) repeat(4, minmax(0, 1fr));
  margin: 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  background: transparent;
}

.care-map-label,
.care-decision-map a {
  min-height: 50px;
  padding: 13px 14px;
  border-right: 1px solid var(--bd);
  background: transparent;
}

.care-map-label {
  padding-left: 0;
}

.care-body {
  display: block;
  padding-top: 0;
}

.care-reading-index {
  grid-template-columns: minmax(230px, 0.7fr) minmax(0, 1.3fr);
  gap: clamp(24px, 5vw, 64px);
  padding: clamp(24px, 4vw, 46px) 0;
}

.care-reading-index-links {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 0;
  border-top: 1px solid var(--bd);
}

.care-reading-index-links button {
  min-height: 46px;
  padding: 10px 8px;
  border-right: 0;
  text-align: center;
  white-space: nowrap;
}

.care-main > .care-section {
  grid-template-columns: minmax(118px, 0.18fr) minmax(0, 1fr);
  column-gap: clamp(24px, 5vw, 70px);
  padding: clamp(30px, 5vw, 58px) 0;
}

.care-h {
  margin-bottom: clamp(18px, 3vw, 30px);
  padding: 0;
  border: 0;
  font-size: clamp(1.7rem, 3.1vw, 2.7rem);
  font-weight: 650;
}

.care-habitat-figure {
  margin: 0 0 clamp(24px, 4vw, 40px);
}

.care-habitat-stage {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-height: 190px;
  border: 1px solid var(--bd);
}

.care-habitat-zone {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  border-right: 1px solid rgba(23, 23, 20, 0.16);
}

.care-habitat-zone:last-child {
  border-right: 0;
}

.care-habitat-zone span,
.care-habitat-zone small {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.care-habitat-zone strong {
  font-size: clamp(1.05rem, 2vw, 1.4rem);
  font-variant-numeric: tabular-nums;
}

.care-habitat-zone--warm {
  background: color-mix(in srgb, #fb923c 17%, transparent);
}

.care-habitat-zone--middle {
  background: color-mix(in srgb, #facc15 10%, transparent);
}

.care-habitat-zone--cold {
  background: color-mix(in srgb, #3b82f6 11%, transparent);
}

.care-habitat-figure figcaption {
  margin-top: 9px;
  color: var(--txt-muted);
  font-size: 0.72rem;
}

.care-subsection {
  margin-top: clamp(28px, 5vw, 52px);
  scroll-margin-top: 90px;
}

.care-subsection > .care-subh:first-child {
  margin-top: 0;
  font-family: var(--font-heading-zh);
  font-size: clamp(1.25rem, 2vw, 1.65rem);
}

.care-env-grid,
.care-humidity-grid,
.care-feeder-grid,
.care-danger-grid,
.care-related-grid,
.care-howto-steps {
  display: block;
  border: 0;
  border-top: 1px solid var(--bd);
}

.care-env-card,
.care-humidity-card,
.care-feeder-card,
.care-danger-card,
.care-related-card,
.care-howto-step {
  display: grid;
  grid-template-columns: minmax(150px, 0.28fr) minmax(0, 1fr);
  gap: 10px clamp(22px, 4vw, 54px);
  padding: 20px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  background: transparent;
}

.care-env-head,
.care-feeder-head,
.care-danger-head {
  grid-column: 1;
  grid-row: 1 / span 5;
  align-self: start;
}

.care-env-icon,
.care-danger-icon {
  display: none;
}

.care-env-title,
.care-feeder-name,
.care-danger-title,
.care-humidity-zone,
.care-related-title {
  font-family: var(--font-heading-zh);
  font-size: 1.08rem;
  font-weight: 650;
}

.care-env-spec,
.care-env-body,
.care-env-warn,
.care-env-note,
.care-coming,
.care-inline-chips,
.care-feeder-stats,
.care-feeder-row,
.care-danger-consequence,
.care-danger-why,
.care-related-summary {
  grid-column: 2;
}

.care-env-warn,
.care-env-note,
.care-coming,
.care-feed-rule,
.care-supp-warn,
.care-danger-consequence {
  border-radius: 0;
  background: transparent;
}

.care-env-warn,
.care-danger-consequence {
  padding: 10px 0 10px 14px;
  border-left: 2px solid #dc2626;
}

.care-env-note,
.care-coming,
.care-feed-rule,
.care-supp-warn {
  padding: 8px 0;
  border: 0;
}

.care-humidity-card {
  grid-template-columns: minmax(150px, 0.28fr) minmax(110px, 0.2fr) minmax(0, 1fr);
  align-items: baseline;
}

.care-humidity-range {
  color: var(--txt);
  font-family: var(--font-body-zh);
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.care-feeder-stats {
  display: flex;
  gap: 20px;
  padding: 0;
  border: 0;
}

.care-feeder-tag {
  display: inline-block;
  margin-top: 8px;
  padding: 0;
  border: 0;
}

.care-howto-card {
  padding: 0;
  border: 0;
  background: transparent;
}

.care-howto-title {
  margin-bottom: 16px;
  font-size: 1.25rem;
}

.care-howto-step {
  grid-template-columns: 52px minmax(0, 1fr);
}

.care-howto-no {
  width: auto;
  height: auto;
  color: var(--pri);
  background: transparent;
  font-size: 0.72rem;
}

.care-table {
  border: 0;
  border-top: 1px solid var(--bd);
}

.care-tr {
  padding: 13px 0;
}

.care-toggle-btn {
  width: auto;
  padding: 10px 0;
  border: 0;
  border-bottom: 1px solid var(--txt);
  background: transparent;
}

.care-faq-item {
  border: 0;
  border-bottom: 1px solid var(--bd);
  background: transparent;
}

.care-faq-q {
  min-height: 58px;
  padding: 14px 0;
  border: 0;
  background: transparent;
}

.care-faq-a {
  padding: 0 0 18px;
}

.care-related-card {
  color: inherit;
  text-decoration: none;
}

.care-related-cat {
  margin-top: 24px;
  padding: 0 0 10px;
  border: 0;
  border-bottom: 1px solid var(--txt);
  background: transparent;
}

.care-quote {
  max-width: 760px;
  margin: clamp(28px, 5vw, 56px) 0 0 auto;
  padding: 0 0 0 20px;
  border: 0;
  border-left: 2px solid var(--pri);
  background: transparent;
  font-size: 0.88rem;
  line-height: 1.8;
}

@media (hover: hover) and (pointer: fine) {
  .care-stat-card:hover,
  .care-decision-map a:hover,
  .care-related-card:hover {
    color: var(--pri);
    background: transparent;
  }
}

@media (max-width: 768px) {
  .care-page {
    padding: 0 18px 28px;
  }

  .care-hero {
    display: block;
    padding: 12px 0 24px !important;
  }

  .care-document-meta {
    gap: 6px;
    margin-bottom: 24px;
  }

  .care-hero-title {
    font-size: clamp(2.45rem, 12vw, 3.6rem);
  }

  .care-hero-media {
    min-height: 120px;
    margin-top: 22px;
  }

  .care-hero-stats {
    margin-top: 24px;
  }

  .care-stat-card {
    grid-template-columns: 3.5em minmax(0, 1fr) auto;
  }

  .care-decision-map {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .care-map-label {
    grid-column: 1 / -1;
    padding-left: 0;
  }

  .care-decision-map a:nth-child(odd) {
    border-right: 0;
  }

  .care-reading-index {
    display: block;
    padding: 24px 0;
  }

  .care-reading-index-links {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 20px;
  }

  .care-main > .care-section {
    display: block;
    padding: 30px 0;
    scroll-margin-top: 78px;
  }

  .care-main > .care-section::before {
    display: block;
    margin-bottom: 9px;
    padding: 0;
  }

  .care-h {
    font-size: clamp(1.55rem, 7vw, 2rem);
  }

  .care-habitat-stage {
    min-height: 150px;
  }

  .care-habitat-zone {
    padding: 12px 8px;
  }

  .care-habitat-zone span,
  .care-habitat-zone small {
    font-size: 0.6rem;
  }

  .care-env-card,
  .care-humidity-card,
  .care-feeder-card,
  .care-danger-card,
  .care-related-card {
    display: block;
    padding: 18px 0;
  }

  .care-env-head,
  .care-feeder-head,
  .care-danger-head {
    margin-bottom: 10px;
  }

  .care-env-spec,
  .care-env-body,
  .care-env-warn,
  .care-env-note,
  .care-coming,
  .care-inline-chips,
  .care-feeder-stats,
  .care-feeder-row,
  .care-danger-consequence,
  .care-danger-why,
  .care-related-summary {
    margin-top: 8px;
  }

  .care-feeder-stats {
    flex-wrap: wrap;
    gap: 8px 16px;
  }

  .care-table--feed .care-tr,
  .care-table--supp .care-tr,
  .care-table--species .care-tr {
    min-width: 0;
    white-space: normal;
  }

  .care-table--feed .care-tr {
    grid-template-columns: minmax(90px, 1fr) minmax(70px, 0.7fr) minmax(56px, 0.55fr) minmax(
        140px,
        1.4fr
      );
    min-width: 430px;
  }

  .care-table--supp .care-tr,
  .care-table--species .care-tr {
    grid-template-columns: minmax(90px, 0.7fr) repeat(2, minmax(155px, 1fr));
    min-width: 420px;
  }

  .care-quote {
    margin-top: 28px;
    font-size: 0.82rem;
  }
}

/* 使用者檢視修正：取消剩餘卡片感、色塊與過量留白。 */
.care-hero {
  column-gap: clamp(24px, 5vw, 72px);
  row-gap: 22px;
  padding-bottom: 26px !important;
}

.care-reading-index {
  padding: 24px 0;
}

.care-reading-index-links button span {
  display: none;
}

.care-main > .care-section {
  display: block;
  padding: clamp(24px, 3.5vw, 40px) 0;
}

.care-main > .care-section::before {
  display: block;
  margin-bottom: 7px;
  padding: 0;
}

.care-main > .care-section > *,
.care-main > .care-section > .care-h,
.care-env-grid,
.care-humidity-grid,
.care-feeder-grid,
.care-danger-grid,
.care-related-grid,
.care-table,
.care-temp-bar,
.care-howto-card,
.care-faq-list,
.care-bullet-list,
.care-inline-chips,
.care-temp-notes,
.care-feed-rule,
.care-supp-warn,
.care-quote {
  grid-column: auto;
}

.care-h {
  margin-bottom: 18px;
}

.care-subsection {
  margin-top: 30px;
}

.care-subh {
  margin-top: 24px;
  margin-bottom: 10px;
}

.care-temp-bar {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: visible;
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  box-shadow: none;
}

.care-temp-zone {
  min-height: 88px;
  justify-content: center;
  padding: 14px 16px;
  color: var(--txt) !important;
  background: transparent !important;
  border-right: 1px solid var(--bd);
  text-shadow: none;
}

.care-temp-zone:last-child {
  border-right: 0;
}

.care-temp-zone-range {
  color: var(--txt);
  font-family: var(--font-body-zh);
  font-size: 1.05rem;
  text-shadow: none;
}

.care-temp-zone-label {
  color: var(--txt-muted);
  text-shadow: none;
}

.care-temp-notes {
  display: block;
  margin-top: 8px;
}

.care-temp-note,
.care-temp-warn {
  padding: 9px 0;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent !important;
}

.care-env-card,
.care-humidity-card,
.care-feeder-card,
.care-danger-card,
.care-related-card,
.care-howto-step,
.care-howto-card,
.care-faq-item,
.care-quote,
.care-feed-rule,
.care-supp-warn,
.care-env-warn,
.care-env-note,
.care-coming {
  background: transparent !important;
  box-shadow: none !important;
}

.care-env-card,
.care-feeder-card,
.care-danger-card,
.care-related-card {
  row-gap: 5px;
  padding: 14px 0;
}

.care-env-spec,
.care-env-body,
.care-env-warn,
.care-env-note,
.care-coming,
.care-feeder-stats,
.care-feeder-row,
.care-danger-consequence,
.care-danger-why,
.care-related-summary {
  margin-top: 0;
}

.care-quote {
  max-width: 100%;
  margin-top: 24px;
  padding: 14px 0 0;
  border: 0;
  border-top: 1px solid var(--bd);
  color: var(--txt-muted);
}

.care-environment-image {
  margin: 22px 0 0;
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
}

.care-environment-image > div {
  display: flex;
  min-height: 72px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.care-environment-image span {
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.care-environment-image strong {
  font-family: var(--font-heading-zh);
  font-size: 1rem;
  font-weight: 650;
}

.care-environment-image figcaption {
  padding: 7px 0;
  border-top: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 0.72rem;
}

.care-hero {
  display: block;
  padding: 12px 0 22px !important;
}

.care-hero-copy {
  max-width: 760px;
  padding-top: 22px;
}

.care-reading-index {
  padding: 16px 0;
}

.care-main > .care-section {
  width: 100%;
  margin: 0 !important;
  padding: clamp(18px, 2.5vw, 28px) 0;
  border: 0 !important;
  border-bottom: 1px solid var(--bd) !important;
  background: transparent !important;
  box-shadow: none !important;
  filter: none !important;
}

.care-main,
.care-body,
.care-reading-index,
.care-faq-list,
.care-related-block,
.care-related-grid {
  background: transparent !important;
  box-shadow: none !important;
  filter: none !important;
}

.care-reading-index {
  border: 0;
  border-bottom: 1px solid var(--bd);
}

.care-decision-map {
  display: flex;
  align-items: center;
  gap: clamp(16px, 3vw, 34px);
  border: 0;
  border-bottom: 1px solid var(--bd);
}

.care-map-label,
.care-decision-map a {
  min-height: 44px;
  padding: 10px 0;
  border: 0;
  background: transparent !important;
  white-space: nowrap;
}

.care-subsection {
  margin-top: 20px;
}

.care-subh {
  margin-top: 18px;
}

/* /care 第四版：互動層級與資訊列統一。 */
.care-bullet-list {
  margin: 0;
  padding: 0;
  border-top: 1px solid var(--bd);
  list-style: none;
}

.care-bullet-list li {
  position: relative;
  margin: 0;
  padding: 13px 0 13px 24px;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent !important;
  box-shadow: none !important;
}

.care-bullet-list li::before {
  position: absolute;
  top: 19px;
  left: 2px;
  width: 8px;
  height: 2px;
  background: var(--pri);
  content: '';
}

.care-chip {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 10px 14px;
  border: 1px solid var(--txt);
  border-radius: 2px;
  background: transparent;
  color: var(--txt);
  font-weight: 750;
  line-height: 1.3;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
}

.care-inline-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.care-decision-map a,
.care-reading-index-links button {
  position: relative;
  color: var(--txt);
  font-weight: 750;
  text-decoration: none;
  cursor: pointer;
}

.care-decision-map a::after,
.care-reading-index-links button::after {
  margin-left: 8px;
  color: var(--pri);
  content: '→';
}

.care-decision-map a {
  border-bottom: 2px solid transparent;
}

.care-reading-index-links button {
  border-bottom: 2px solid var(--bd);
}

.care-related-card {
  position: relative;
  padding-right: 42px;
  cursor: pointer;
}

.care-related-card::after {
  position: absolute;
  top: 50%;
  right: 4px;
  color: var(--pri);
  content: '→';
  transform: translateY(-50%);
}

.care-faq-q {
  cursor: pointer;
}

.care-environment-image {
  display: grid;
  min-height: 0;
  place-content: center;
  margin-top: 22px;
  padding: 14px 0;
  border: 0;
  border-block: 1px solid var(--bd);
  background: transparent;
  text-align: center;
}

.care-environment-image > div {
  display: grid;
  min-height: 0;
  place-items: center;
  gap: 10px;
  padding: 18px 24px;
  background: var(--bg);
}

.care-environment-image figcaption {
  max-width: 520px;
  margin-top: 12px;
  padding: 0;
  border: 0;
}

@media (hover: hover) and (pointer: fine) {
  .care-chip:hover {
    border-color: var(--pri);
    background: var(--pri) !important;
    color: #fff;
  }

  .care-decision-map a:hover,
  .care-reading-index-links button:hover {
    border-bottom-color: var(--pri);
    color: var(--pri);
  }

  .care-related-card:hover .care-related-title {
    color: var(--pri);
  }
}

.care-chip:focus-visible,
.care-decision-map a:focus-visible,
.care-reading-index-links button:focus-visible,
.care-related-card:focus-visible,
.care-faq-q:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}

@media (max-width: 768px) {
  .care-hero,
  .care-main > .care-section {
    padding-block: 15px !important;
  }

  .care-reading-index {
    padding: 14px 0;
  }

  .care-temp-zone {
    min-height: 78px;
    padding: 11px 7px;
  }

  .care-temp-zone-range {
    font-size: 0.86rem;
  }

  .care-temp-zone-label {
    font-size: 0.58rem;
  }

  .care-environment-image > div {
    min-height: 0;
  }

  .care-environment-image {
    min-height: 0;
    padding: 12px 0;
  }

  .care-decision-map {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 14px;
  }

  .care-map-label {
    grid-column: 1 / -1;
  }

  .care-inline-chips {
    display: grid;
    grid-template-columns: 1fr;
  }

  .care-chip {
    width: 100%;
  }
}
</style>
