<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useHead } from '#imports'
import { QUIZ_DATA, QUIZ_DIMENSIONS, QUIZ_TRACKS } from '~/utils/quiz'

const qsUrl = 'https://www.genckobreeding.com/qs'
const qsImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'

const qsPublisher = {
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

// HowTo：如何完成飼養前評估
const qsHowToLd = {
  '@type': 'HowTo',
  '@id': `${qsUrl}#howto`,
  name: '如何完成 Gencko 守宮飼養前自我評估',
  description: '4 步驟完成 6 維度 18 題評估，看清自己是否準備好飼養守宮。',
  image: qsImg,
  totalTime: 'PT5M',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: '進入評估',
      text: '點擊「開始評估」進入問卷流程。本評估完全免費、不需註冊。'
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: '回答 18 題',
      text: '依序回答時間承諾、心理接受、環境設備、知識儲備、預算資源、飼養目標 6 大維度共 18 題。每題請依當下實際狀況誠實作答，不需想像理想狀態。'
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: '查看雷達圖與分析',
      text: '完成後系統會顯示 6 維度雷達圖與總分，並列出需要特別注意的面向（如環境設備不足、預算偏緊等風險點）。'
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: '依推薦路線補課',
      text: '依「飼養目標」維度推薦的學習路線（觀賞型 / 繁殖型 / 收藏型 / 嘗鮮型）連到對應的品系圖鑑、基因計算機或飼養教學文章。'
    }
  ]
}

// FAQPage：常見問題
const qsFaqLd = {
  '@type': 'FAQPage',
  '@id': `${qsUrl}#faq`,
  mainEntity: [
    {
      '@type': 'Question',
      name: '什麼樣的人適合養守宮？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '適合長期穩定的飼主：① 能持續 10–15 年負責照顧（豹紋守宮平均壽命）② 可接受餵食活餌或冷凍餌料 ③ 能維持穩定的溫濕度環境 ④ 有基本預算購買設備（約 3,000–8,000 元起跳）⑤ 願意持續學習飼養與健康知識。若以上任一項目猶豫，建議先完成本評估找出風險點再決定。'
      }
    },
    {
      '@type': 'Question',
      name: '評估完發現總分不高怎麼辦？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '分數不高並不代表「不能養」，而是顯示哪些面向需要先補強。建議：① 看「需要特別注意的面向」逐項改善 ② 依推薦學習路線補課 ③ 若是知識儲備不足，先讀 /care 與 /articles 累積知識 ④ 若是預算或環境不足，先準備好硬體再迎接個體 ⑤ 補強後再重新評估。'
      }
    },
    {
      '@type': 'Question',
      name: '本評估會儲存資料嗎？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '不會上傳到伺服器。所有作答進度與結果僅儲存在你瀏覽器的 localStorage（本機），清除瀏覽器資料或更換裝置時會消失。Gencko Breeding Studio 不會看到任何個人作答內容。'
      }
    },
    {
      '@type': 'Question',
      name: '為什麼有「時間承諾」與「心理接受」這兩個維度？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '因為這兩項是新手最常低估、也最常導致棄養的核心因素。「時間承諾」指長達 10–15 年的日常餵食、清理、健康觀察；「心理接受」則涵蓋對活餌（蟋蟀、杜比亞）的接受度，以及面對個體生病、斷尾、死亡的心理準備。設備可以買、知識可以學，但這兩項若無法承擔，後續其他面向再強也撐不起穩定的飼養關係。'
      }
    }
  ]
}

// BreadcrumbList
const qsBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/' },
    { '@type': 'ListItem', position: 2, name: '飼養前自我評估', item: qsUrl }
  ]
}

// WebPage 包覆，mainEntity = Quiz，hasPart = [HowTo, FAQPage]
const qsWebPageLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': qsUrl,
  url: qsUrl,
  name: '守宮飼養前自我評估',
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: qsImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.page-title', '.qs-section-title']
  },
  publisher: qsPublisher,
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
  mainEntity: {
    '@type': 'Quiz',
    '@id': `${qsUrl}#quiz`,
    name: 'Gencko 守宮飼養前自我評估',
    description:
      '6 維度（時間承諾、心理接受、環境設備、知識儲備、預算資源、飼養目標）共 18 題，含風險分析、雷達圖與推薦學習路線。',
    educationalLevel: 'Beginner',
    learningResourceType: 'Self-Assessment',
    inLanguage: 'zh-TW',
    publisher: qsPublisher,
    numberOfQuestions: 18
  },
  hasPart: [qsHowToLd, qsFaqLd]
}

useHead({
  title: '飼養前自我評估｜6 維度 18 題守宮準備度測驗',
  meta: [
    {
      name: 'description',
      content:
        '飼養守宮前的自我評估問卷：時間承諾、心理接受、環境設備、知識儲備、預算資源、飼養目標 6 大維度共 18 題，含風險分析、雷達圖與個人化推薦學習路線。免費、不需註冊、不上傳資料。'
    },
    {
      name: 'keywords',
      content: '守宮飼養評估, 豹紋守宮新手, 守宮準備度, 守宮自我評估, 守宮入門測驗, 飼養前評估'
    },
    // Open Graph
    { property: 'og:title', content: '飼養前自我評估｜6 維度 18 題守宮準備度測驗' },
    {
      property: 'og:description',
      content: '6 維度 18 題守宮飼養準備度評估，含風險分析、雷達圖與個人化推薦學習路線。'
    },
    { property: 'og:image', content: qsImg },
    { property: 'og:image:alt', content: '守宮飼養前自我評估 - Gencko Breeding Studio' },
    { property: 'og:url', content: qsUrl },
    { property: 'og:type', content: 'article' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '飼養前自我評估｜6 維度 18 題守宮準備度測驗' },
    {
      name: 'twitter:description',
      content: '6 維度 18 題守宮飼養準備度評估，含風險分析、雷達圖與個人化推薦學習路線。'
    },
    { name: 'twitter:image', content: qsImg }
  ],
  link: [{ rel: 'canonical', href: qsUrl }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(qsWebPageLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(qsBreadcrumbLd) }
  ]
})

// ============ State ============
const STORAGE_KEY = 'gencko_qs_progress_v3'
const questions = QUIZ_DATA.questions
const results = QUIZ_DATA.results
const totalQs = questions.length

const step = ref(0)
const answers = ref({})
const finished = ref(false)
const sliding = ref(false)
const selectedOptionId = ref(null)
const hydrated = ref(false)

// ============ 容器寬度（用於 px 計算位移） ============
const carouselWidth = ref(0)
const measureCarousel = () => {
  const el = document.querySelector('.qs-carousel')
  if (el) carouselWidth.value = el.getBoundingClientRect().width
}
const cardWidth = computed(() => carouselWidth.value * 0.8)
const trackOffset = computed(() => {
  const peek = carouselWidth.value * 0.1
  const gap = 16
  return peek - step.value * (cardWidth.value + gap)
})

// 隨機選項順序：對每題 shuffle 一次後固定（不會每次 re-render 重洗）
const shuffleArr = (arr) => {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const shuffledOptions = ref({})
const buildShuffledOptions = () => {
  const out = {}
  questions.forEach((q) => {
    out[q.id] = shuffleArr(q.options)
  })
  shuffledOptions.value = out
}
buildShuffledOptions()

const progress = computed(() => (Object.keys(answers.value).length / totalQs) * 100)
const findQuestionIdx = (qId) => questions.findIndex((q) => q.id === qId)

const currentQ = computed(() => questions[step.value])
const prevQ = computed(() => (step.value > 0 ? questions[step.value - 1] : null))
const nextQ = computed(() => (step.value < totalQs - 1 ? questions[step.value + 1] : null))
const currentOptions = computed(
  () => shuffledOptions.value[currentQ.value?.id] || currentQ.value?.options || []
)

// ============ 選項點擊 ============
const selectOption = (qId, opt) => {
  if (sliding.value) return
  const q = questions.find((x) => x.id === qId)
  selectedOptionId.value = opt.id
  answers.value[qId] = {
    qId,
    score: opt.score,
    dim: q.dim,
    optionId: opt.id,
    label: opt.label,
    question: q.text,
    risk: opt.risk,
    note: opt.note,
    trackTag: opt.trackTag
  }
  saveProgress()
  sliding.value = true
  setTimeout(() => {
    if (step.value < totalQs - 1) {
      step.value++
      selectedOptionId.value = null
    } else {
      finished.value = true
    }
    sliding.value = false
    saveProgress()
  }, 450)
}

const prevStep = () => {
  if (sliding.value || step.value === 0) return
  const prevId = questions[step.value - 1].id
  delete answers.value[prevId]
  step.value--
  selectedOptionId.value = null
  saveProgress()
}

const resetQuiz = () => {
  answers.value = {}
  step.value = 0
  finished.value = false
  selectedOptionId.value = null
  buildShuffledOptions() // 重置時重新洗牌
  clearProgress()
}

const jumpToQuestion = (idx) => {
  if (idx < 0) return
  finished.value = false
  step.value = idx
  const qId = questions[idx]?.id
  if (qId) delete answers.value[qId]
  selectedOptionId.value = null
  saveProgress()
  nextTick(() => {
    document.querySelector('.qs-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

// ============ localStorage ============
const saveProgress = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step: step.value,
        answers: answers.value,
        finished: finished.value,
        shuffled: shuffledOptions.value, // 連同隨機順序一起存，避免復原後順序變了
        ts: Date.now()
      })
    )
  } catch (e) {}
}
const loadProgress = () => {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const data = JSON.parse(raw)
    if (Date.now() - (data.ts || 0) > 7 * 24 * 3600 * 1000) {
      localStorage.removeItem(STORAGE_KEY)
      return
    }
    if (data.answers && typeof data.step === 'number') {
      answers.value = data.answers
      step.value = Math.min(data.step, totalQs - 1)
      finished.value = !!data.finished
      if (data.shuffled) shuffledOptions.value = data.shuffled
    }
  } catch (e) {}
}
const clearProgress = () => {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (e) {}
}

// ============ 計算結果 ============
const dimensionScores = computed(() => {
  const acc = {}
  Object.keys(QUIZ_DIMENSIONS).forEach((d) => {
    if (d === 'goal') return
    acc[d] = { sum: 0, count: 0 }
  })
  Object.values(answers.value).forEach((a) => {
    if (a.dim === 'goal' || !acc[a.dim]) return
    acc[a.dim].sum += a.score
    acc[a.dim].count++
  })
  const out = {}
  Object.keys(acc).forEach((d) => {
    out[d] = acc[d].count ? +(acc[d].sum / acc[d].count).toFixed(1) : 0
  })
  return out
})
const totalScore = computed(() => {
  let weighted = 0,
    totalW = 0
  Object.keys(dimensionScores.value).forEach((d) => {
    const w = QUIZ_DIMENSIONS[d].weight
    weighted += dimensionScores.value[d] * w
    totalW += w
  })
  return totalW ? Math.round((weighted / totalW) * 10) : 0
})
const result = computed(() => {
  const s = totalScore.value
  return results.find((r) => s >= r.min && s <= r.max) || results[results.length - 1]
})
const weakestDim = computed(() => {
  const entries = Object.entries(dimensionScores.value)
  if (!entries.length) return null
  entries.sort((a, b) => a[1] - b[1])
  return entries[0][0]
})
const recommendedTrack = computed(() => {
  const tally = {}
  Object.values(answers.value).forEach((a) => {
    if (a.dim !== 'goal' || !a.trackTag) return
    tally[a.trackTag] = (tally[a.trackTag] || 0) + 1
  })
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
  return sorted.length ? QUIZ_TRACKS[sorted[0][0]] : QUIZ_TRACKS.viewer
})
const warnings = computed(() => Object.values(answers.value).filter((a) => a.risk === 'warn'))
const criticals = computed(() => Object.values(answers.value).filter((a) => a.risk === 'critical'))

// ============ Chart.js 雷達圖 ============
const radarRef = ref(null)
let chartInstance = null

const ensureChart = async () => {
  if (typeof window === 'undefined') return
  await nextTick()
  if (!radarRef.value) return
  const {
    Chart,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    RadarController
  } = await import('chart.js')
  Chart.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    RadarController
  )

  const labels = []
  const data = []
  Object.keys(QUIZ_DIMENSIONS).forEach((d) => {
    if (d === 'goal') return
    labels.push(QUIZ_DIMENSIONS[d].icon + ' ' + QUIZ_DIMENSIONS[d].label)
    data.push(dimensionScores.value[d])
  })

  const rootStyles = getComputedStyle(document.documentElement)
  const pri = (rootStyles.getPropertyValue('--pri') || '#ff4500').trim()
  const txtColor = (rootStyles.getPropertyValue('--txt') || '#222').trim()

  const hexToRgba = (hex, a) => {
    const m = hex.replace('#', '')
    const bigint = parseInt(
      m.length === 3
        ? m
            .split('')
            .map((c) => c + c)
            .join('')
        : m,
      16
    )
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r},${g},${b},${a})`
  }

  if (chartInstance) chartInstance.destroy()
  chartInstance = new Chart(radarRef.value, {
    type: 'radar',
    data: {
      labels,
      datasets: [
        {
          label: '維度分數',
          data,
          backgroundColor: hexToRgba(pri, 0.25),
          borderColor: pri,
          borderWidth: 2,
          pointBackgroundColor: pri,
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: pri,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.parsed.r} / 10` } }
      },
      scales: {
        r: {
          angleLines: { color: hexToRgba(txtColor.startsWith('#') ? txtColor : '#888888', 0.15) },
          grid: { color: hexToRgba(txtColor.startsWith('#') ? txtColor : '#888888', 0.12) },
          pointLabels: { color: txtColor, font: { size: 13, weight: '600' } },
          ticks: { display: false, stepSize: 2 },
          suggestedMin: 0,
          suggestedMax: 10
        }
      }
    }
  })
}

watch(finished, async (v) => {
  if (v) {
    saveProgress()
    await ensureChart()
  } else if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})

// 主題切換 watch：只追蹤 day-mode 是否實際改變，避免其他 class 變動誤觸
let themeObserver = null
let lastDayMode = null
onMounted(() => {
  hydrated.value = true
  loadProgress()
  nextTick(() => {
    measureCarousel()
    window.addEventListener('resize', measureCarousel)
  })
  if (typeof MutationObserver !== 'undefined') {
    lastDayMode = document.documentElement.classList.contains('day-mode')
    themeObserver = new MutationObserver(() => {
      const now = document.documentElement.classList.contains('day-mode')
      if (now !== lastDayMode) {
        lastDayMode = now
        if (finished.value && chartInstance) ensureChart()
      }
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })
  }
})

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy()
  if (themeObserver) themeObserver.disconnect()
  if (typeof window !== 'undefined') window.removeEventListener('resize', measureCarousel)
})
</script>

<template>
  <div class="qs-container">
    <!-- ============ 問卷階段 ============ -->
    <div v-if="!finished">
      <h1 class="page-title">飼養前自我評估</h1>

      <div class="qs-progress-area">
        <div class="qs-progress-labels">
          <span>Step {{ step + 1 }} of {{ totalQs }}</span>
          <span>{{ Math.round(progress) }}%</span>
        </div>
        <div class="qs-progress-track">
          <div class="qs-progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <!-- 卡片輪播：上一題在左淡出、當前題置中、下一題在右淡出 -->
      <ClientOnly>
        <div class="qs-carousel">
          <div class="qs-carousel-track" :style="{ transform: `translateX(${trackOffset}px)` }">
            <div
              v-for="(q, idx) in questions"
              :key="q.id"
              class="qs-card"
              :style="{ flex: `0 0 ${cardWidth}px` }"
              :class="{
                'is-current': idx === step,
                'is-prev': idx === step - 1,
                'is-next': idx === step + 1,
                'is-far': Math.abs(idx - step) > 1
              }"
            >
              <div class="qs-dim-tag">
                {{ QUIZ_DIMENSIONS[q.dim].icon }} {{ QUIZ_DIMENSIONS[q.dim].label }}
              </div>
              <div class="qs-question-text">{{ q.text }}</div>
              <div v-if="idx === step" class="qs-options-grid">
                <button
                  type="button"
                  v-for="opt in currentOptions"
                  :key="opt.id"
                  class="qs-option-btn"
                  :class="{ 'is-selected': selectedOptionId === opt.id }"
                  @click="selectOption(q.id, opt)"
                >
                  <span class="qs-option-label">{{ opt.label }}</span>
                  <div class="qs-check-circle">
                    <span v-if="selectedOptionId === opt.id" class="qs-check-mark">✓</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
        <template #fallback>
          <div class="qs-carousel-fallback">載入中…</div>
        </template>
      </ClientOnly>

      <button v-if="step > 0" @click="prevStep" class="qs-nav-btn">
        <span>← 返回上一題</span>
      </button>
    </div>

    <!-- ============ 結果階段 ============ -->
    <div v-else class="qs-result-wrap">
      <!-- 總分卡 -->
      <div class="qs-result-box">
        <span class="qs-badge">Evaluation Complete</span>
        <div class="qs-grade-row">
          <div class="qs-grade-letter" :data-grade="result.grade">{{ result.grade }}</div>
          <div class="qs-grade-meta">
            <div class="qs-res-title">{{ result.title }}</div>
            <div class="qs-score-display">
              {{ totalScore }}
              <span class="qs-score-unit">/ 100</span>
            </div>
          </div>
        </div>
        <div class="qs-res-desc">{{ result.desc }}</div>
      </div>

      <!-- 維度雷達 -->
      <div class="qs-section">
        <h2 class="qs-section-title">📊 維度分析</h2>
        <div class="qs-radar-wrap">
          <canvas ref="radarRef"></canvas>
        </div>
        <div class="qs-dim-grid">
          <div
            v-for="(d, key) in dimensionScores"
            :key="key"
            class="qs-dim-item"
            :class="{ 'is-weakest': key === weakestDim }"
          >
            <div class="qs-dim-name">
              {{ QUIZ_DIMENSIONS[key].icon }} {{ QUIZ_DIMENSIONS[key].label }}
            </div>
            <div class="qs-dim-score">
              {{ d }}
              <span class="qs-dim-unit">/10</span>
            </div>
            <div class="qs-dim-bar">
              <div class="qs-dim-fill" :style="{ width: d * 10 + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 推薦路線 -->
      <div class="qs-section">
        <h2 class="qs-section-title">
          {{ recommendedTrack.icon }} 推薦學習路線：{{ recommendedTrack.label }}
        </h2>
        <div class="qs-track-desc">{{ recommendedTrack.desc }}</div>
        <div class="qs-track-links">
          <NuxtLink
            v-for="l in recommendedTrack.links"
            :key="l.href"
            :to="l.href"
            class="qs-track-link"
          >
            {{ l.text }} →
          </NuxtLink>
        </div>
      </div>

      <!-- 風險警示 -->
      <div v-if="criticals.length || warnings.length" class="qs-section qs-risk-section">
        <h2 class="qs-section-title">⚠️ 需要特別注意的面向</h2>
        <p class="qs-risk-intro">
          以下是根據您的答案，建議您在飼養前優先處理的議題。這些獨立於等級之外，無論您拿幾分都值得認真看待。
        </p>

        <div v-if="criticals.length" class="qs-risk-group">
          <div class="qs-risk-header qs-risk-critical">🔴 嚴重問題（{{ criticals.length }}）</div>
          <div
            v-for="(c, i) in criticals"
            :key="'c' + i"
            class="qs-risk-card qs-risk-card-critical"
          >
            <div class="qs-risk-q">{{ QUIZ_DIMENSIONS[c.dim].icon }} {{ c.question }}</div>
            <div class="qs-risk-a">您的選擇：「{{ c.label }}」</div>
            <div class="qs-risk-note">{{ c.note }}</div>
            <button class="qs-modify-btn" @click="jumpToQuestion(findQuestionIdx(c.qId))">
              ✏️ 修改這題
            </button>
          </div>
        </div>

        <div v-if="warnings.length" class="qs-risk-group">
          <div class="qs-risk-header qs-risk-warn">🟡 建議補強（{{ warnings.length }}）</div>
          <div v-for="(w, i) in warnings" :key="'w' + i" class="qs-risk-card qs-risk-card-warn">
            <div class="qs-risk-q">{{ QUIZ_DIMENSIONS[w.dim].icon }} {{ w.question }}</div>
            <div class="qs-risk-a">您的選擇：「{{ w.label }}」</div>
            <div class="qs-risk-note">{{ w.note }}</div>
            <button class="qs-modify-btn" @click="jumpToQuestion(findQuestionIdx(w.qId))">
              ✏️ 修改這題
            </button>
          </div>
        </div>
      </div>

      <div class="qs-hint-box">
        💡 溫馨提示：新手飼養前建議多尋求專業玩家或專科醫師的建議，確保環境與設備完全就緒。
      </div>

      <button @click="resetQuiz" class="qs-reset-btn">🔄 重新評估</button>
    </div>
  </div>
</template>

<style scoped>
.qs-container {
  max-width: 800px;
  margin: 0 auto;
  padding-top: 15px;
  min-height: 60vh;
}

/* ============ 進度條 ============ */
.qs-progress-area {
  margin-bottom: 30px;
}
.qs-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--pri);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.qs-progress-track {
  width: 100%;
  height: 5px;
  background: rgba(128, 128, 128, 0.2);
  border-radius: 3px;
  overflow: hidden;
}
.qs-progress-fill {
  height: 100%;
  background: var(--pri);
  transition: width 0.5s ease;
  box-shadow: 0 0 10px var(--pri-glow);
}

/* ============ 卡片輪播：橫向滾動式 ============ */
.qs-carousel {
  position: relative;
  overflow: hidden;
  margin: 0 0 20px;
  padding: 10px 0 20px;
}
.qs-carousel-track {
  display: flex;
  gap: 16px;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}
.qs-card {
  padding: 24px 22px;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 16px;
  box-sizing: border-box;
  transition:
    transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.5s,
    filter 0.5s;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.06);
  pointer-events: none;
}
.qs-card.is-current {
  pointer-events: auto;
}
.qs-card.is-current {
  opacity: 1;
  filter: none;
  transform: scale(1);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
  z-index: 3;
}
.qs-card.is-prev,
.qs-card.is-next {
  opacity: 0.35;
  filter: blur(1px) saturate(0.7);
  transform: scale(0.92);
  z-index: 1;
}
.qs-card.is-far {
  opacity: 0;
  visibility: hidden;
}
.qs-carousel-fallback {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--txt);
  opacity: 0.4;
  font-size: 0.9rem;
}

.qs-dim-tag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--pri);
  background: rgba(255, 69, 0, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 14px;
  letter-spacing: 0.5px;
}
.qs-question-text {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 20px;
  line-height: 1.5;
  color: var(--txt);
}

.qs-options-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.qs-option-btn {
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  background: var(--card-bg);
  border: 1.5px solid var(--bd);
  border-radius: 12px;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--txt);
  font-family: inherit;
  font-size: inherit;
}
.qs-option-btn:hover {
  border-color: var(--pri);
  background: rgba(128, 128, 128, 0.05);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}
.qs-option-btn.is-selected {
  border-color: var(--pri);
  background: rgba(255, 69, 0, 0.08);
  box-shadow: 0 0 0 3px var(--pri-glow);
}
.qs-option-label {
  font-size: 0.95rem;
  font-weight: 500;
  flex: 1;
  padding-right: 12px;
}
.qs-check-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
  flex-shrink: 0;
}
.qs-option-btn:hover .qs-check-circle {
  border-color: var(--pri);
}
.qs-option-btn.is-selected .qs-check-circle {
  border-color: var(--pri);
  background: var(--pri);
}
.qs-check-mark {
  color: #fff;
  font-size: 0.85rem;
  font-weight: bold;
  line-height: 1;
}

.qs-nav-btn {
  margin-top: 10px;
  background: transparent;
  border: none;
  color: var(--txt);
  opacity: 0.6;
  cursor: pointer;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  transition: 0.2s;
}
.qs-nav-btn:hover {
  color: var(--pri);
  opacity: 1;
}

/* ============ 結果頁 ============ */
.qs-result-wrap {
  animation: slideUp 0.6s ease;
}
.qs-result-box {
  text-align: center;
  padding: 28px 22px;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
}
.qs-badge {
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--pri);
  background: rgba(255, 69, 0, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 18px;
  display: inline-block;
}
.qs-grade-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin: 12px 0 20px;
}
.qs-grade-letter {
  font-family: 'Black Ops One', cursive;
  font-size: 5rem;
  line-height: 1;
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 0 30px var(--pri-glow);
}
.qs-grade-letter[data-grade='S'] {
  background: linear-gradient(135deg, #ff8c00, #ff4500);
}
.qs-grade-letter[data-grade='A'] {
  background: linear-gradient(135deg, #ff4500, #d63b00);
}
.qs-grade-letter[data-grade='B'] {
  background: linear-gradient(135deg, #f5a623, #e6911a);
}
.qs-grade-letter[data-grade='C'] {
  background: linear-gradient(135deg, #9b9b9b, #707070);
}
.qs-grade-letter[data-grade='D'] {
  background: linear-gradient(135deg, #6e6e6e, #4a4a4a);
}
.qs-grade-meta {
  text-align: left;
}
.qs-res-title {
  font-size: 1.4rem;
  font-weight: bold;
  color: var(--txt);
  margin-bottom: 4px;
}
.qs-score-display {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--pri);
  font-family: 'Black Ops One', cursive;
  text-shadow: 0 0 15px var(--pri-glow);
  line-height: 1;
}
.qs-score-unit {
  font-size: 0.9rem;
  font-weight: normal;
  opacity: 0.5;
}
.qs-res-desc {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--txt);
  opacity: 0.85;
}

/* 區段 */
.qs-section {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 22px;
  margin-bottom: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}
.qs-section-title {
  font-size: 1.15rem;
  font-weight: bold;
  color: var(--txt);
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--bd);
}

/* 雷達圖 */
.qs-radar-wrap {
  position: relative;
  height: 320px;
  margin-bottom: 18px;
}

/* 維度卡 */
.qs-dim-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
}
.qs-dim-item {
  background: rgba(128, 128, 128, 0.05);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 10px 12px;
  transition: 0.2s;
}
.qs-dim-item.is-weakest {
  border-color: var(--pri);
  background: rgba(255, 69, 0, 0.08);
  box-shadow: 0 0 0 2px var(--pri-glow);
}
.qs-dim-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--txt);
  margin-bottom: 4px;
}
.qs-dim-score {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--pri);
  line-height: 1;
}
.qs-dim-unit {
  font-size: 0.75rem;
  opacity: 0.5;
  font-weight: normal;
}
.qs-dim-bar {
  height: 4px;
  background: rgba(128, 128, 128, 0.15);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
}
.qs-dim-fill {
  height: 100%;
  background: var(--pri);
  transition: width 0.8s ease;
}

/* 推薦路線 */
.qs-track-desc {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--txt);
  opacity: 0.85;
  margin-bottom: 14px;
}
.qs-track-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.qs-track-link {
  display: inline-block;
  padding: 10px 18px;
  background: var(--pri);
  color: #fff;
  text-decoration: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  transition: 0.2s;
  box-shadow: 0 3px 10px var(--pri-glow);
}
.qs-track-link:hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
}

/* 風險區 */
.qs-risk-section {
  border-color: rgba(220, 60, 0, 0.3);
}
.qs-risk-intro {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--txt);
  opacity: 0.75;
  margin: 0 0 16px;
}
.qs-risk-group {
  margin-bottom: 18px;
}
.qs-risk-group:last-child {
  margin-bottom: 0;
}
.qs-risk-header {
  font-size: 0.95rem;
  font-weight: bold;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 10px;
}
.qs-risk-critical {
  background: rgba(220, 50, 50, 0.12);
  color: #c92626;
}
.qs-risk-warn {
  background: rgba(245, 166, 35, 0.15);
  color: #b87100;
}
.qs-risk-card {
  padding: 14px 16px;
  border-radius: 10px;
  margin-bottom: 8px;
  border-left: 4px solid;
}
.qs-risk-card-critical {
  background: rgba(220, 50, 50, 0.06);
  border-color: #d63333;
}
.qs-risk-card-warn {
  background: rgba(245, 166, 35, 0.07);
  border-color: #f5a623;
}
.qs-risk-q {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--txt);
  margin-bottom: 4px;
  opacity: 0.9;
}
.qs-risk-a {
  font-size: 0.85rem;
  color: var(--pri);
  margin-bottom: 8px;
  font-weight: 500;
}
.qs-risk-note {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--txt);
  opacity: 0.85;
}

/* 修改題按鈕 */
.qs-modify-btn {
  margin-top: 10px;
  background: transparent;
  border: 1px solid var(--bd);
  color: var(--pri);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: 0.2s;
}
.qs-modify-btn:hover {
  background: var(--pri);
  color: #fff;
  border-color: var(--pri);
}

/* 提示 + 重置 */
.qs-hint-box {
  background: rgba(128, 128, 128, 0.05);
  border: 1px dashed var(--bd);
  padding: 15px;
  border-radius: 8px;
  color: var(--txt);
  opacity: 0.75;
  font-size: 0.85rem;
  margin-bottom: 16px;
  line-height: 1.5;
}
.qs-reset-btn {
  width: 100%;
  padding: 14px;
  background: var(--pri);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  font-weight: bold;
  font-size: 1.05rem;
  cursor: pointer;
  transition: 0.3s;
  box-shadow: 0 5px 15px var(--pri-glow);
}
.qs-reset-btn:hover {
  transform: translateY(-3px);
  filter: brightness(1.1);
}

/* RWD */
@media (max-width: 540px) {
  .qs-card {
    padding: 20px 18px;
  }
  .qs-question-text {
    font-size: 1.05rem;
  }
  .qs-grade-row {
    gap: 16px;
  }
  .qs-grade-letter {
    width: 90px;
    height: 90px;
    font-size: 4rem;
  }
  .qs-res-title {
    font-size: 1.15rem;
  }
  .qs-score-display {
    font-size: 1.8rem;
  }
  .qs-radar-wrap {
    height: 280px;
  }
  .qs-carousel {
    margin: 0 -20px 20px;
    padding: 10px 20px 20px;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
