<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import {
  PERSONAS,
  ANCHORS,
  HERO_STATS,
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
  FAQ,
  SPECIES_COMPARE
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
const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/' },
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
  `守宮飼養指南完整收錄環境配置、溫度梯度、濕度配置、餵食與營養、補充品劑量、繁殖預備、致命地雷、豹紋 vs 肥尾物種對照與新手常見問題。`,
  `環境配置：${ENV_ITEMS.map((e) => `${e.title}（${e.spec}）`).join('；')}。`,
  `溫度梯度：冷區 ${TEMP_GRADIENT.cold.range}、過渡區 ${TEMP_GRADIENT.middle.range}、熱區 ${TEMP_GRADIENT.hot.range}；${TEMP_GRADIENT.nightMin}；${TEMP_GRADIENT.danger}。`,
  `濕度配置：${HUMIDITY_CONFIG.map((h) => `${h.zone} ${h.range}（${h.desc}）`).join('；')}。`,
  `餵食頻率：${FEED_FREQ.map((f) => `${f.age} - ${f.freq}，${f.qty}，主食 ${f.menu}`).join('；')}。`,
  `補充品：${SUPPLEMENTS.map((s) => `${s.name}（鈣粉 ${s.juvenile}／綜合維 ${s.adult}）`).join('；')}。${SUPPLEMENT_WARN}`,
  `致命地雷：${DANGERS.map((d) => `${d.title}（${d.consequence}）`).join('；')}。`
].join(' ')

// JSON-LD：WebPage 包覆（Article 為 mainEntity，FAQPage / HowTo 為 hasPart）
const webPageLd = computed(() => {
  const hasPart = [howToEnvLd, howToFeedLd]
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
    { type: 'application/ld+json', children: JSON.stringify(breadcrumbLd) }
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
  const order = ['env', 'temp', 'humidity', 'food', 'breeding', 'danger', 'species', 'faq']
  return [...ANCHORS].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
})

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

const showSpeciesCompare = ref(false)
</script>

<template>
  <div class="care-page">
    <div class="care-progress-bar">
      <div class="care-progress-fill" :style="{ width: `${scrollProgress}%` }"></div>
    </div>

    <section class="care-hero">
      <h1 class="care-hero-title">守宮飼養指南</h1>

      <div class="care-hero-stats">
        <button
          v-for="s in HERO_STATS"
          :key="s.label"
          class="care-stat-card"
          :style="{ '--accent': s.color }"
          @click="scrollTo(s.target)"
        >
          <div class="care-stat-label">{{ s.label }}</div>
          <div class="care-stat-value">{{ s.value }}</div>
          <div class="care-stat-sub">{{ s.sub }}</div>
        </button>
      </div>
    </section>

    <section
      class="care-anchor-nav m-only"
      :class="{ 'care-anchor-nav--nav-hidden': store.navHidden }"
    >
      <button
        v-for="a in sidebarAnchors"
        :key="a.id"
        class="care-anchor-btn"
        @click="scrollTo(a.id)"
      >
        <span>{{ a.icon }}</span>
        <span>{{ a.label }}</span>
      </button>
    </section>

    <div class="care-body">
      <main class="care-main">
        <section id="env" class="care-section">
          <h2 class="care-h">🏠 環境配置</h2>
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
              <div v-if="e.related?.length" class="care-inline-chips">
                <button
                  v-for="aid in e.related"
                  :key="aid"
                  class="care-chip"
                  @click="goArticle(aid)"
                >
                  → {{ articleById(aid)?.Title || '相關閱讀' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="temp" class="care-section">
          <h2 class="care-h">🌡 溫度梯度</h2>

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

          <div class="care-inline-chips">
            <button
              v-for="aid in TEMP_GRADIENT.related"
              :key="aid"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
          </div>
        </section>

        <section id="humidity" class="care-section">
          <h2 class="care-h">💧 濕度配置</h2>
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

          <div class="care-inline-chips">
            <button
              v-for="aid in HUMIDITY_RELATED"
              :key="aid"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
          </div>
        </section>

        <section id="food" class="care-section">
          <h2 class="care-h">🍴 餵食與營養</h2>
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

          <div class="care-inline-chips">
            <button
              v-for="aid in FEEDER_RELATED"
              :key="aid"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
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

          <div class="care-inline-chips">
            <button
              v-for="aid in SUPPLEMENT_RELATED"
              :key="aid"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
          </div>
        </section>

        <section id="breeding" class="care-section">
          <h2 class="care-h">🧬 繁殖預備</h2>
          <ul class="care-bullet-list">
            <li v-for="(b, i) in BREEDING_NOTES" :key="i">{{ b }}</li>
          </ul>

          <div class="care-inline-chips">
            <button
              v-for="aid in BREEDING_RELATED"
              :key="aid"
              class="care-chip"
              @click="goArticle(aid)"
            >
              → {{ articleById(aid)?.Title || '相關閱讀' }}
            </button>
          </div>
        </section>

        <section id="danger" class="care-section">
          <h2 class="care-h">⚠️ 致命地雷</h2>
          <div class="care-danger-grid">
            <div v-for="d in DANGERS" :key="d.id" class="care-danger-card">
              <div class="care-danger-head">
                <span class="care-danger-icon">{{ d.icon }}</span>
                <span class="care-danger-title">{{ d.title }}</span>
              </div>
              <div class="care-danger-consequence">後果：{{ d.consequence }}</div>
              <div class="care-danger-why">{{ d.why }}</div>
              <div v-if="d.related?.length" class="care-inline-chips">
                <button
                  v-for="aid in d.related"
                  :key="aid"
                  class="care-chip is-danger"
                  @click="goArticle(aid)"
                >
                  → {{ articleById(aid)?.Title || '相關閱讀' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="species" class="care-section">
          <h2 class="care-h">🦎 豹紋 vs 肥尾</h2>
          <button class="care-toggle-btn" @click="showSpeciesCompare = !showSpeciesCompare">
            {{ showSpeciesCompare ? '▲ 收合對照表' : '▼ 展開差異對照' }}
          </button>

          <div v-if="showSpeciesCompare" class="care-table care-table--species care-species-table">
            <div class="care-tr care-tr-head care-tr-3">
              <div>項目</div>
              <div>豹紋</div>
              <div>肥尾</div>
            </div>
            <div v-for="row in SPECIES_COMPARE" :key="row.feature" class="care-tr care-tr-3">
              <div>{{ row.feature }}</div>
              <div>{{ row.leopard }}</div>
              <div>{{ row.fattail }}</div>
            </div>
          </div>
        </section>

        <section id="faq" class="care-section">
          <h2 class="care-h">❓ 常見問題</h2>
          <div class="care-faq-list">
            <div
              v-for="(item, i) in FAQ"
              :key="i"
              class="care-faq-item"
              :class="{ 'is-open': openFaq === i }"
            >
              <button class="care-faq-q" @click="toggleFaq(i)">
                <span class="care-faq-q-text">{{ item.q }}</span>
                <span class="care-faq-q-icon">{{ openFaq === i ? '−' : '+' }}</span>
              </button>
              <div v-if="openFaq === i" class="care-faq-a">
                <div class="care-faq-summary">
                  {{ articleById(item.article)?.Summary || '完整內容請參考下方文章' }}
                </div>
                <button class="care-chip" @click="goArticle(item.article)">→ 閱讀完整文章</button>
              </div>
            </div>
          </div>
        </section>

        <section id="related" class="care-section">
          <h2 class="care-h">📚 完整知識庫</h2>
          <div
            v-for="(arts, cat) in relatedByCategory"
            v-show="arts.length"
            :key="cat"
            class="care-related-block"
          >
            <div class="care-related-cat">{{ cat }}</div>
            <div class="care-related-grid">
              <NuxtLink
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

      <aside class="care-sidebar dt-only">
        <div class="care-sidebar-box">
          <div class="care-sidebar-title">快速跳轉</div>
          <button
            v-for="a in sidebarAnchors"
            :key="a.id"
            class="care-sidebar-link"
            @click="scrollTo(a.id)"
          >
            <span>{{ a.icon }}</span>
            {{ a.label }}
          </button>
        </div>

        <div class="care-sidebar-box">
          <div class="care-sidebar-title">推薦文章</div>
          <NuxtLink
            v-for="a in recommendedArticles"
            :key="a.ID"
            :to="`/articles/${a.ID}`"
            class="care-sidebar-art"
          >
            <span class="care-sidebar-art-cat">{{ a.Category }}</span>
            <span class="care-sidebar-art-title">{{ a.Title }}</span>
          </NuxtLink>
        </div>
      </aside>
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
  padding: 6px 10px;
  white-space: nowrap;
}

.care-hero-title {
  color: var(--txt);
  font-size: 1.8rem;
  font-weight: 900;
  letter-spacing: 1px;
  margin-bottom: 8px;
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

.care-stat-card:hover {
  border-color: var(--accent);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.1);
  transform: translateY(-3px);
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
    margin-top: -6px;
    padding-bottom: 0;
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
  padding: 5px 7px;
  text-align: left;
  transition: 0.15s;
  width: 100%;
}

.care-sidebar-link:hover {
  background: rgba(255, 69, 0, 0.06);
  color: var(--pri);
}

.care-sidebar-art {
  background: rgba(128, 128, 128, 0.04);
  border: 1px solid var(--bd);
  border-radius: 8px;
  color: var(--txt);
  display: block;
  padding: 7px 8px;
  text-decoration: none;
  transition: 0.15s;
}

.care-sidebar-art:hover {
  background: rgba(255, 69, 0, 0.04);
  border-color: var(--pri);
  color: var(--pri);
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
  padding: 4px 10px;
  transition: 0.2s;
}

.care-chip:hover {
  background: var(--pri);
  color: #fff;
}

.care-chip.is-danger {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
}

.care-chip.is-danger:hover {
  background: #ef4444;
  color: #fff;
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
  margin-bottom: 8px;
  padding: 7px;
  transition: 0.2s;
  width: 100%;
}

.care-toggle-btn:hover {
  background: rgba(255, 69, 0, 0.05);
  border-color: var(--pri);
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

.care-related-card:hover {
  background: rgba(255, 69, 0, 0.04);
  border-color: var(--pri);
  transform: translateY(-2px);
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
  .care-section {
    scroll-margin-top: 156px;
  }
}

@media (max-width: 768px) {
  .care-page {
    padding: 48px 10px 24px;
  }
  .care-hero {
    padding: 0;
  }
  .care-hero-title {
    font-size: 1.35rem;
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
</style>
