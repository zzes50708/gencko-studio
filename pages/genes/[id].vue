<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

definePageMeta({ key: (route) => route.fullPath })

const route = useRoute()
const store = useMainStore()
const supabase = useSupabaseClient()
const isHydrated = ref(false)

onMounted(() => {
  isHydrated.value = true
})

// 從路由參數取得要顯示的基因名稱，並進行解碼
const geneName = decodeURIComponent(route.params.id)
const zeroGeneNote = computed(() =>
  geneName === '零' ? '備註：零 = het 無紋；超級零 = 無紋。' : ''
)

// [SEO] 為了在 SSR 期間取得資料，我們使用 useAsyncData。
// 若 Store 中已經存在該筆資料，則直接拿來用；否則向資料庫查詢。
const { data: viewingGene, pending } = await useAsyncData(`gene-${geneName}`, async () => {
  if (store.genePages && store.genePages.length > 0) {
    const found = store.genePages.find((g) => g.Name === geneName)
    if (found) return found
  }

  const { data, error } = await supabase
    .from('genetic_pages')
    .select('*')
    .eq('name', geneName)
    .maybeSingle()

  if (error || !data) return null

  return {
    Name: data.name,
    ImageURL: data.image_url,
    Warning: data.warning,
    Brief: data.brief,
    Detail: data.detail,
    Source: data.source,
    // 🌟 新增欄位（後台未填則為 null，JSON-LD 會自動省略對應屬性）
    EnglishName: data.english_name || null,
    InheritanceMode: data.inheritance_mode || null,
    DiscoveryYear: data.discovery_year || null,
    OriginalBreeder: data.original_breeder || null
  }
})

// HTML/段落 → 純文字（給 articleBody / wordCount 用）
const toPlainText = (s) => {
  if (!s) return ''
  return String(s)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// 若是在客戶端且已取得資料，同步回 Store
if (viewingGene.value && import.meta.client) {
  store.viewingGene = viewingGene.value
}

const geneWarningText = computed(() => {
  const parts = [viewingGene.value?.Warning, zeroGeneNote.value].filter(Boolean)
  return parts.join('\n')
})

const siteData = computed(() => {
  if (viewingGene.value) {
    const g = viewingGene.value
    const img = getCleanUrl(g.ImageURL)
    const url = `https://www.genckobreeding.com/genes/${encodeURIComponent(g.Name)}`
    const desc = `${g.Name} 守宮基因介紹｜遺傳模式、外觀特徵與繁育注意事項。${g.Brief || ''}`.trim()
    const altNameArr = g.EnglishName ? [g.EnglishName] : []
    const plainDetail = toPlainText(g.Detail)
    const fullBody = [g.Brief, plainDetail].filter(Boolean).join(' ')
    const articleBody = fullBody.length > 5000 ? fullBody.slice(0, 5000) + '…' : fullBody
    const wordCount = fullBody ? fullBody.replace(/\s+/g, '').length : 0

    // 後台填了哪些屬性，就掛哪些 additionalProperty
    const additionalProperty = []
    if (g.InheritanceMode)
      additionalProperty.push({
        '@type': 'PropertyValue',
        name: '遺傳模式',
        value: g.InheritanceMode
      })
    if (g.DiscoveryYear)
      additionalProperty.push({
        '@type': 'PropertyValue',
        name: '首次發現年份',
        value: String(g.DiscoveryYear)
      })
    if (g.OriginalBreeder)
      additionalProperty.push({
        '@type': 'PropertyValue',
        name: '原始繁殖者',
        value: g.OriginalBreeder
      })

    // DefinedTerm 作為主要主體（基因 = 術語定義，是最精準的語意）
    const definedTerm = {
      '@type': 'DefinedTerm',
      '@id': `${url}#term`,
      name: g.Name,
      ...(altNameArr.length ? { alternateName: altNameArr } : {}),
      ...(g.EnglishName ? { termCode: g.EnglishName } : {}),
      description: g.Brief || `${g.Name} 守宮基因介紹`,
      url: url,
      ...(img ? { image: img } : {}),
      inLanguage: 'zh-TW',
      inDefinedTermSet: {
        '@type': 'DefinedTermSet',
        name: 'Gencko 守宮基因圖鑑',
        url: 'https://www.genckobreeding.com/genes'
      },
      ...(additionalProperty.length ? { additionalProperty: additionalProperty } : {}),
      subjectOf: { '@id': `${url}#article` }
    }

    // Article 作為輔助主體（百科條目，給 AI 引用內文用）
    const article = {
      '@type': 'Article',
      '@id': `${url}#article`,
      headline: `${g.Name}${g.EnglishName ? `（${g.EnglishName}）` : ''} - 豹紋守宮（Eublepharis macularius）基因圖鑑`,
      image: [img],
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
      },
      description: g.Brief || `${g.Name} 守宮基因介紹`,
      about: { '@id': `${url}#term` },
      mentions: [
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
      inLanguage: 'zh-TW',
      ...(articleBody ? { articleBody: articleBody } : {}),
      ...(wordCount ? { wordCount: wordCount } : {}),
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.brief-txt', '.detail-txt']
      },
      mainEntityOfPage: { '@id': url }
    }

    // WebPage 包覆兩個主體（DefinedTerm 為主體）
    const webPageLd = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': url,
      url: url,
      name: g.Name,
      inLanguage: 'zh-TW',
      isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
      primaryImageOfPage: img ? { '@type': 'ImageObject', url: img } : undefined,
      mainEntity: definedTerm,
      hasPart: article
    }

    const breadcrumb = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: '首頁',
          item: 'https://www.genckobreeding.com/home'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: '守宮基因圖鑑',
          item: 'https://www.genckobreeding.com/genes'
        },
        { '@type': 'ListItem', position: 3, name: g.Name, item: url }
      ]
    }

    return {
      title: g.Name,
      desc,
      img,
      url,
      type: 'article',
      script: [
        { type: 'application/ld+json', innerHTML: JSON.stringify(webPageLd) },
        { type: 'application/ld+json', innerHTML: JSON.stringify(breadcrumb) }
      ]
    }
  }

  return {
    title: '找不到此基因',
    desc: '資料庫中找不到該基因條目',
    img: 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85',
    url: `https://www.genckobreeding.com/genes/${encodeURIComponent(geneName)}`,
    type: 'website',
    script: []
  }
})

useHead({
  title: computed(() => siteData.value.title),
  meta: [
    { name: 'description', content: computed(() => siteData.value.desc) },
    // Open Graph
    { property: 'og:title', content: computed(() => siteData.value.title) },
    { property: 'og:description', content: computed(() => siteData.value.desc) },
    { property: 'og:image', content: computed(() => siteData.value.img) },
    { property: 'og:url', content: computed(() => siteData.value.url) },
    { property: 'og:type', content: computed(() => siteData.value.type) },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: computed(() => siteData.value.title) },
    { name: 'twitter:description', content: computed(() => siteData.value.desc) },
    { name: 'twitter:image', content: computed(() => siteData.value.img) }
  ],
  link: [{ rel: 'canonical', href: computed(() => siteData.value.url) }],
  script: computed(() => siteData.value.script)
})
</script>

<template>
  <div class="gene-detail-wrapper">
    <div class="common-document-meta gene-document-meta" aria-label="基因詞條說明">
      <span>GENCKO GENE RECORD</span>
      <span>TRAIT / INHERITANCE / NOTES</span>
    </div>
    <div
      v-if="isHydrated && pending"
      style="text-align: center; padding: 100px 0; color: var(--txt); opacity: 0.6"
    >
      <div class="loader" style="margin: 0 auto 20px auto"></div>
      <p>基因資料載入中...</p>
    </div>

    <div
      v-else-if="!viewingGene"
      style="text-align: center; padding: 100px 0; color: var(--txt); opacity: 0.6"
    >
      <h2>找不到「{{ geneName }}」的資料</h2>
      <p>可能該基因條目尚未建立或已被移除。</p>
      <TheBackButton
        fallback="/genes"
        text="返回圖鑑列表"
        style="justify-content: center; margin-top: 20px"
      />
    </div>

    <div v-else class="gene-container">
      <TheBackButton fallback="/genes" text="返回圖鑑" style="margin-bottom: 10px" />

      <nav class="gene-tool-nav" aria-label="基因詞條工具">
        <div>
          <span>GENE WORKFLOW</span>
          <strong>查完詞條，接著模擬配對</strong>
        </div>
        <NuxtLink no-prefetch to="/calculator" class="gene-tool-link">前往基因計算機</NuxtLink>
      </nav>

      <div class="content-card">
        <header class="gene-title-row">
          <div>
            <span class="gene-kicker">GENETIC PROFILE</span>
            <h1 class="gene-title">{{ viewingGene.Name }}</h1>
          </div>
          <dl class="gene-facts">
            <div v-if="viewingGene.InheritanceMode">
              <dt>遺傳模式</dt>
              <dd>{{ viewingGene.InheritanceMode }}</dd>
            </div>
            <div v-if="viewingGene.DiscoveryYear">
              <dt>發現年份</dt>
              <dd>{{ viewingGene.DiscoveryYear }}</dd>
            </div>
          </dl>
        </header>

        <div v-if="geneWarningText" class="warn-box">
          <span style="font-size: 1.2rem; margin-right: 5px">⚠️</span>
          {{ geneWarningText }}
        </div>

        <div class="gene-layout">
          <!-- 🌟 核心修正：將 NuxtImg 替換為原生 img -->
          <img
            v-if="viewingGene.ImageURL"
            :src="getCleanUrl(viewingGene.ImageURL)"
            :alt="`${viewingGene.Name} 守宮基因外觀範例｜豹紋守宮 Eublepharis macularius`"
            class="gene-img"
            loading="eager"
            decoding="async"
          />

          <div class="gene-text-content">
            <h2 class="gene-section-title">📖 基因簡介</h2>
            <p class="brief-txt">{{ viewingGene.Brief }}</p>

            <div v-if="viewingGene.Detail" class="detail-section">
              <h2 class="gene-section-title">🔍 詳細敘述</h2>
              <p class="detail-txt">{{ viewingGene.Detail }}</p>
            </div>

            <div class="source-text">資料來源：{{ viewingGene.Source || '尚待資料庫補充' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gene-detail-wrapper {
  max-width: 1080px;
  margin: 0 auto;
  padding-top: 5px;
  padding-bottom: 20px;
}

.gene-tool-nav {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: center;
  margin-bottom: 16px;
  padding: 14px 16px;
  border: 1px solid var(--bd);
  border-radius: var(--radius-md);
  background: var(--card-bg);
}
.gene-tool-nav > div {
  display: grid;
  gap: 3px;
  color: var(--txt);
}
.gene-tool-nav span,
.gene-kicker {
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.14em;
}
.gene-tool-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--control-min-height);
  padding: 0 16px;
  border-radius: var(--radius-sm);
  background: var(--pri-btn);
  color: #fff;
  font-weight: 850;
  text-decoration: none;
}
.gene-tool-link:focus-visible {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}

/* 🌟 卡片化內容 (適配日夜變數) */
.content-card {
  background: var(--card-bg);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.gene-title {
  font-size: 2.2rem;
  margin: 0 0 20px 0;
  color: var(--txt);
  line-height: 1.2;
  padding: 0;
}
.gene-title-row {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: end;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--bd);
}
.gene-title-row .gene-title {
  margin: 6px 0 0;
}
.gene-facts {
  display: flex;
  gap: 18px;
  margin: 0;
}
.gene-facts div {
  display: grid;
  gap: 3px;
}
.gene-facts dt {
  color: var(--txt-muted);
  font-size: 0.7rem;
}
.gene-facts dd {
  margin: 0;
  color: var(--txt);
  font-weight: 800;
}

.warn-box {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid #f44336;
  color: var(--txt);
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 25px;
  font-weight: bold;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  line-height: 1.5;
}

.gene-layout {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

.gene-img {
  width: 45%;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--bd);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
}

.gene-text-content {
  flex: 1;
  min-width: 0; /* 🌟 解決手機版 Flex 容器被文字撐破的黑魔法 */
  width: 100%;
}

h3,
.gene-section-title {
  color: var(--pri);
  font-size: 1.25rem;
  margin: 0 0 10px 0;
  font-weight: bold;
  line-height: 1.4;
}

p {
  color: var(--txt);
  opacity: 0.9;
  line-height: 1.7;
  font-size: 1.05rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-wrap: break-word;
  word-break: normal;
  text-align: justify;
}

.detail-section {
  margin-top: 25px;
}

.source-text {
  margin-top: 30px;
  font-size: 0.85rem;
  color: var(--txt);
  opacity: 0.6;
  border-top: 1px dashed var(--bd);
  padding-top: 15px;
}

/* 🌟 Mobile Responsive */
@media (max-width: 768px) {
  .gene-detail-wrapper {
    padding-top: 0;
  }

  .content-card {
    padding: 20px;
    border-radius: 12px;
  }

  .gene-tool-nav,
  .gene-title-row {
    align-items: stretch;
    flex-direction: column;
  }

  .gene-tool-link {
    width: 100%;
  }

  .gene-facts {
    flex-wrap: wrap;
  }

  .gene-title {
    font-size: 1.8rem;
    margin-bottom: 15px;
    padding-bottom: 10px;
  }

  .gene-layout {
    flex-direction: column;
    gap: 20px;
  }

  .gene-img {
    width: 100%;
    max-height: 350px;
  }

  p {
    font-size: 1rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loader {
    animation: none;
  }
}
/* 詞條頁維持閱讀節奏，不以浮誇容器搶走基因內容。 */
.gene-container,
.gene-tool-nav,
.gene-img,
.gene-text-content {
  border-radius: 0;
  box-shadow: none;
}

.gene-title,
.gene-section-title {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.035em;
}

.gene-img {
  aspect-ratio: 1;
  object-fit: cover;
}

.gene-tool-link {
  border-radius: 2px;
}

/* 基因詞條採單篇閱讀版，讓來源、遺傳模式與影像成為同一份資料頁。 */
.gene-tool-nav,
.content-card,
.warn-box,
.gene-img {
  border-radius: 0;
  box-shadow: none;
}

.gene-tool-nav {
  margin-bottom: 28px;
  padding: 16px 0;
  border-width: 1px 0;
  background: transparent;
}

.content-card {
  padding: 0;
  border-width: 1px 0;
  background: transparent;
}

.gene-title-row {
  padding: 26px 0 18px;
}

.warn-box {
  padding: 14px 0 14px 14px;
  border-width: 1px 0 1px 3px;
  background: transparent;
}

.gene-layout {
  padding: 26px 0;
}

.gene-img {
  width: 45%;
}

@media (max-width: 768px) {
  .content-card,
  .gene-title-row,
  .gene-layout {
    padding-left: 0;
    padding-right: 0;
  }
}
/* 詞條以圖文與資料列呈現。 */
.gene-detail-wrapper {
  padding: 8px 18px 28px;
}
.content-card {
  border: 0;
  border-radius: 0;
  padding: 18px 0;
  background: transparent;
  box-shadow: none;
}
.gene-title {
  font-family: var(--font-heading-zh);
  font-size: clamp(2rem, 4.5vw, 3.5rem);
  line-height: 1.3;
}
.gene-title-row {
  margin-bottom: 18px;
  gap: 20px;
}
.gene-tool-nav {
  padding: 12px 0;
  margin-block: 12px;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
}
.gene-tool-link {
  min-height: 44px;
  border: 1px solid var(--txt);
  border-radius: 2px;
  padding: 10px 14px;
  white-space: nowrap;
}
.gene-img {
  border-radius: 0;
  box-shadow: none;
  object-fit: contain;
}
.warn-box {
  border-radius: 0;
  box-shadow: none;
}
.detail-section {
  margin-top: 20px;
  padding-top: 16px;
}
.brief-txt,
.detail-txt {
  font-family: var(--font-body-zh);
  line-height: 1.85;
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
