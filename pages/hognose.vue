<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '#imports'
import { absUrl, DEFAULT_OG_IMAGE } from '~/utils/site-constants'
import {
  TAXON_HOGNOSE_SNAKE,
  getBreadcrumb,
  getBreadcrumbForPath,
  getSocialMeta,
  getWebPage
} from '~/utils/seo-schemas'

type FaqItem = {
  question: string
  answer: string
}

type SectionItem = {
  title: string
  body: string
}

const pageUrl = absUrl('/hognose')
const pageTitle = '豬鼻蛇飼養指南｜個性、環境設置與新手入門'
const pageDescription =
  '整理豬鼻蛇的基本介紹、個性、飼養環境、餵食節奏與新手注意事項，並串接 Gencko 基因計算機的豬鼻蛇模式，讓入門者能先建立正確觀念再開始規劃。'

const introPoints = [
  '豬鼻蛇是近年很受歡迎的特寵蛇種，外型辨識度高，個性表演感強。',
  '牠屬於偏乾燥環境的地棲蛇，日常飼養重點通常落在溫度梯度、躲避空間與穩定餵食。',
  '多數新手最容易卡在「適不適合自己」與「拒食是不是異常」，這頁先把決策前要知道的核心問題講清楚。'
]

const sections: SectionItem[] = [
  {
    title: '豬鼻蛇是什麼？',
    body: '豬鼻蛇常見指的是西部豬鼻蛇，學名 Heterodon nasicus。牠的吻端上翹、擅長翻土，受到驚擾時會有很強的防禦演出感，因此在特寵圈辨識度很高。對一般飼主來說，牠最大的特色不是難養，而是需要理解牠的行為模式，不要把正常的威嚇、拒食或鑽墊材行為誤判成嚴重問題。'
  },
  {
    title: '豬鼻蛇適合新手嗎？',
    body: '可以，但前提是你接受牠不是穩定互動型寵物。豬鼻蛇通常比守宮更依賴環境穩定度，對溫度、躲避與餵食節奏的管理不能太隨意。如果你想找的是高互動、容易上手、日常觀察門檻低的特寵，守宮往往更容易；如果你明確偏好蛇類、能接受牠的防禦行為與偶發拒食，那豬鼻蛇仍然可以是合理的新手選項。'
  },
  {
    title: '環境怎麼設置？',
    body: '飼養箱要提供清楚的冷熱區、乾燥通風的底材與至少兩個躲避點。重點不是設備堆很多，而是讓蛇能穩定選擇自己舒服的位置。你需要可持續監測的溫度來源、能翻動鑽掘的底材、乾淨飲水與低干擾空間。若環境長期過冷、過濕或頻繁被打擾，豬鼻蛇容易出現壓力性拒食。'
  },
  {
    title: '餵食與日常觀察',
    body: '豬鼻蛇的餵食節奏要看體型、年齡與個體狀態，不建議只憑社群片段資訊硬套。比起追求餵食頻率，應更重視體態、排便、活動力與拒食持續時間。短期拒食不一定等於生病，但若合併明顯消瘦、呼吸異常、口鼻分泌物或長時間無法恢復進食，就該準備就醫。'
  }
]

const faqItems: FaqItem[] = [
  {
    question: '豬鼻蛇會不會很兇？',
    answer:
      '多數飼主感受到的兇比較像是防禦表演。豬鼻蛇可能會哈氣、扁頸、假咬或翻肚裝死，但這不代表牠天生難照顧。理解這些行為是壓力反應，比單純追求溫馴更重要。'
  },
  {
    question: '豬鼻蛇適合完全沒有養過特寵的人嗎？',
    answer:
      '適合與否取決於你想要什麼體驗。如果你願意先建立飼養知識、能穩定管理環境，而且你本來就想養蛇，豬鼻蛇可以入門；如果你只是想找低門檻特寵，守宮通常更直覺。'
  },
  {
    question: '豬鼻蛇拒食多久需要注意？',
    answer:
      '短期拒食不一定是疾病，但若伴隨消瘦、脫水、呼吸異常、排便問題或環境已排查完仍持續惡化，就不該繼續觀望。先檢查溫度與干擾，再評估是否尋求特寵獸醫。'
  },
  {
    question: '可以用 Gencko 的基因計算機查豬鼻蛇嗎？',
    answer:
      '可以。Gencko 的基因計算機已提供豬鼻蛇模式，適合在規劃配對、理解顯隱性基因與預估後代組合時先做基礎演算，但仍應把計算結果與實際血統資料一起判讀。'
  }
]

const articleBody = computed(() =>
  [
    ...introPoints,
    ...sections.map((section) => `${section.title}：${section.body}`),
    ...faqItems.map((item) => `${item.question}：${item.answer}`)
  ].join('\n')
)

const faqPageLd = {
  '@type': 'FAQPage',
  '@id': `${pageUrl}#faq`,
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer
    }
  }))
}

const articleLd = computed(() => ({
  '@type': 'Article',
  '@id': `${pageUrl}#article`,
  headline: pageTitle,
  description: pageDescription,
  inLanguage: 'zh-TW',
  author: {
    '@type': 'Organization',
    name: 'Gencko Breeding Studio'
  },
  publisher: {
    '@type': 'Organization',
    name: 'Gencko Breeding Studio'
  },
  mainEntityOfPage: pageUrl,
  about: [TAXON_HOGNOSE_SNAKE],
  articleSection: '豬鼻蛇飼養',
  articleBody: articleBody.value
}))

const breadcrumbLd = getBreadcrumb(getBreadcrumbForPath('/hognose', '豬鼻蛇'))

const webPageLd = computed(() =>
  getWebPage({
    url: pageUrl,
    name: pageTitle,
    type: 'Article',
    image: DEFAULT_OG_IMAGE,
    speakable: ['.page-title', '.hero-lead', '.section-title', '.faq-question'],
    about: [TAXON_HOGNOSE_SNAKE],
    mainEntity: articleLd.value,
    hasPart: [faqPageLd]
  })
)

useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    {
      name: 'keywords',
      content:
        '豬鼻蛇, 豬鼻蛇飼養, 豬鼻蛇新手, 西部豬鼻蛇, Heterodon nasicus, 豬鼻蛇基因, 豬鼻蛇計算機'
    },
    ...getSocialMeta({
      title: pageTitle,
      description: pageDescription,
      image: DEFAULT_OG_IMAGE,
      imageAlt: '豬鼻蛇飼養指南 - Gencko Breeding Studio',
      url: pageUrl,
      type: 'article'
    })
  ],
  link: [{ rel: 'canonical', href: pageUrl }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(articleLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(faqPageLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(webPageLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumbLd) }
  ]
})
</script>

<template>
  <div class="hognose-page">
    <TheBackButton wrapper-class="m-only" fallback="/" />

    <section class="hero-card">
      <h1 class="page-title">豬鼻蛇飼養指南</h1>
      <p class="hero-lead">
        從物種認識、個性判斷、環境設置到拒食觀察，先把豬鼻蛇的核心飼養觀念整理清楚，再決定牠是不是適合你的特寵。
      </p>

      <div class="hero-tags" aria-label="重點摘要">
        <span class="hero-tag">Heterodon nasicus</span>
        <span class="hero-tag">新手評估</span>
        <span class="hero-tag">環境設置</span>
        <span class="hero-tag">拒食觀察</span>
      </div>

      <ul class="intro-list">
        <li v-for="point in introPoints" :key="point">{{ point }}</li>
      </ul>

      <div class="hero-actions">
        <NuxtLink class="primary-link" to="/calculator?species=hognose">
          前往豬鼻蛇基因計算機
        </NuxtLink>
        <NuxtLink class="secondary-link" to="/faq">先看常見飼養問題</NuxtLink>
      </div>
    </section>

    <section class="content-grid">
      <article class="content-card">
        <div v-for="section in sections" :key="section.title" class="content-block">
          <h2 class="section-title">{{ section.title }}</h2>
          <p class="section-body">{{ section.body }}</p>
        </div>
      </article>

      <aside class="side-card">
        <h2 class="section-title">入門前先確認</h2>
        <ol class="checklist">
          <li>你是否能穩定提供冷熱區與低干擾環境。</li>
          <li>你是否接受蛇類的防禦行為與偶發拒食。</li>
          <li>你是否已先查好附近可看的特寵醫院。</li>
        </ol>

        <NuxtLink class="side-link" to="/hospital">查看特寵醫院地圖</NuxtLink>
      </aside>
    </section>

    <section class="faq-card">
      <h2 class="section-title">豬鼻蛇 FAQ</h2>
      <div class="faq-list">
        <article v-for="item in faqItems" :key="item.question" class="faq-item">
          <h3 class="faq-question">{{ item.question }}</h3>
          <p class="faq-answer">{{ item.answer }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.hognose-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 18px 16px 36px;
}

.m-only {
  display: none !important;
}

.hero-card,
.content-card,
.side-card,
.faq-card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 244, 236, 0.96)), var(--card-bg);
  border: 1px solid rgba(117, 72, 34, 0.14);
  border-radius: 24px;
  box-shadow: 0 16px 50px rgba(86, 52, 24, 0.08);
}

.hero-card {
  padding: 32px;
  position: relative;
  overflow: hidden;
}

.hero-card::after {
  content: '';
  position: absolute;
  inset: auto -80px -110px auto;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgba(232, 126, 35, 0.18), rgba(232, 126, 35, 0));
  pointer-events: none;
}

.page-title {
  margin: 0;
  font-size: clamp(2rem, 4vw, 3.2rem);
  line-height: 1.08;
  letter-spacing: 0.02em;
  color: #4b2d14;
}

.hero-lead,
.section-body,
.faq-answer,
.intro-list,
.checklist {
  color: #5c4534;
  line-height: 1.9;
}

.hero-lead {
  max-width: 760px;
  margin: 16px 0 0;
  font-size: 1.05rem;
}

.hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 20px;
}

.hero-tag {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(116, 73, 36, 0.08);
  color: #744924;
  font-size: 0.9rem;
  letter-spacing: 0.04em;
}

.intro-list,
.checklist {
  margin: 22px 0 0;
  padding-left: 1.25rem;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 26px;
}

.primary-link,
.secondary-link,
.side-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.primary-link {
  background: linear-gradient(135deg, #7d4d1f, #d36a1d);
  color: #fff8f1;
  box-shadow: 0 14px 28px rgba(125, 77, 31, 0.22);
}

.secondary-link,
.side-link {
  background: rgba(116, 73, 36, 0.08);
  color: #6f411f;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.9fr);
  gap: 20px;
  margin-top: 20px;
}

.content-card,
.side-card,
.faq-card {
  padding: 28px;
}

.content-block + .content-block,
.faq-item + .faq-item {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(117, 72, 34, 0.12);
}

.section-title,
.faq-question {
  margin: 0;
  color: #4f2f17;
}

.section-title {
  font-size: 1.3rem;
}

.section-body,
.faq-answer {
  margin: 12px 0 0;
}

.faq-card {
  margin-top: 20px;
}

@media (hover: hover) and (pointer: fine) {
  .primary-link:hover,
  .secondary-link:hover,
  .side-link:hover {
    transform: translateY(-1px);
  }

  .primary-link:hover {
    box-shadow: 0 18px 34px rgba(125, 77, 31, 0.26);
  }

  .secondary-link:hover,
  .side-link:hover {
    background: rgba(116, 73, 36, 0.14);
  }
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hognose-page {
    padding: 12px 12px 28px;
  }

  .m-only {
    display: block !important;
  }

  .hero-card,
  .content-card,
  .side-card,
  .faq-card {
    padding: 20px;
    border-radius: 18px;
  }

  .hero-card::after {
    display: none;
  }
}
</style>
