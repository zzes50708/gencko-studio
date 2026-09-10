<script setup>
import { computed, onMounted, ref } from 'vue'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

const store = useMainStore()
const supabase = useSupabaseClient()

// SSR：抓取自留種群（給 schema 用）
const { data: ssrBreeders } = await useAsyncData('breeders-list-seo-v1', async () => {
  try {
    const { data, error } = await supabase
      .from('animals')
      .select('id, species, morph, genes, gender_type, gender_value, birthday, image_url, status')
      .eq('status', 'SelfKeep')
    if (error || !data) return []
    return data.map((a) => ({
      ID: a.id,
      Species: a.species,
      Morph: a.morph,
      Genes: Array.isArray(a.genes) ? a.genes : [],
      GenderType: a.gender_type,
      GenderValue: a.gender_value,
      Birthday: a.birthday,
      ImageURL: a.image_url
    }))
  } catch (e) {
    console.error('[breeders SSR] fetch failed:', e?.message)
    return []
  }
})

// 物種切換（使用本地 ref，store 中未定義 breeder_sp，直接寫入 store 不具響應性）
const breederSp = ref('豹紋守宮')

onMounted(() => {
  store.ensureInventoryLoaded()
})

// 切換物種
const selectBreederSp = (species) => {
  breederSp.value = species
}

// 種群展示列表：不分種公種母；依「熱門 → 售價高到低」排序（不顯示排序 UI）
const breedersList = computed(() => {
  return store.inv
    .filter((i) => i.Species === breederSp.value && i.Status === 'SelfKeep')
    .slice()
    .sort((a, b) => {
      const hotA = a.IsHot ? 1 : 0
      const hotB = b.IsHot ? 1 : 0
      if (hotA !== hotB) return hotB - hotA
      const priceA = Number(a.ListingPrice) || 0
      const priceB = Number(b.ListingPrice) || 0
      if (priceA !== priceB) return priceB - priceA
      const imgA = a.ImageURL ? 1 : 0
      const imgB = b.ImageURL ? 1 : 0
      return imgB - imgA
    })
})

const breedersUrl = 'https://www.genckobreeding.com/breeders'
const breedersImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
const breedersPublisher = {
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

const breedersListLd = computed(() => {
  const list = ssrBreeders.value || []
  if (!list.length) return null
  return {
    '@type': 'ItemList',
    '@id': `${breedersUrl}#list`,
    name: 'Gencko Breeding Studio 自留種群',
    numberOfItems: list.length,
    itemListElement: list.map((a, idx) => {
      const geneStr = (a.Genes || []).join('、')
      return {
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'Thing',
          '@id': `${breedersUrl}#breeder-${a.ID}`,
          name: a.Morph,
          description: `${a.Species} ${a.Morph}${a.GenderType ? '（' + a.GenderType + '）' : ''}${geneStr ? '，基因：' + geneStr : ''}`,
          ...(a.ImageURL ? { image: getCleanUrl(a.ImageURL) } : {}),
          additionalProperty: [
            { '@type': 'PropertyValue', name: '物種', value: a.Species },
            ...(a.GenderType
              ? [{ '@type': 'PropertyValue', name: '性別', value: a.GenderType }]
              : []),
            ...(geneStr ? [{ '@type': 'PropertyValue', name: '基因組合', value: geneStr }] : []),
            ...(a.Birthday ? [{ '@type': 'PropertyValue', name: '出生日', value: a.Birthday }] : [])
          ]
        }
      }
    })
  }
})

const breedersBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    { '@type': 'ListItem', position: 2, name: '種群展示', item: breedersUrl }
  ]
}

const breedersWebPageLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': breedersUrl,
  url: breedersUrl,
  name: 'Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母',
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: breedersImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.page-title', '.morph-title']
  },
  publisher: breedersPublisher,
  about: breedersPublisher,
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
  ...(breedersListLd.value ? { mainEntity: breedersListLd.value } : {})
}))

useHead({
  title: 'Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母',
  meta: [
    {
      name: 'description',
      content:
        'Gencko Breeding Studio 自留種群展示。完整收錄正在使用中的豹紋守宮與肥尾守宮繁育種公與種母，含基因組合、性別與孵化日，是了解 Gencko 選育血統與未來子代規劃的窗口。'
    },
    {
      name: 'keywords',
      content: '守宮種群, 豹紋守宮種公, 豹紋守宮種母, 肥尾守宮種公, 守宮繁育血統, Gencko 選育'
    },
    // Open Graph
    { property: 'og:title', content: 'Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母' },
    {
      property: 'og:description',
      content: 'Gencko Breeding Studio 自留種群展示，含基因組合、性別與孵化日。'
    },
    { property: 'og:image', content: breedersImg },
    { property: 'og:image:alt', content: 'Gencko 種群展示 - 豹紋守宮與肥尾守宮繁育種公種母' },
    { property: 'og:url', content: breedersUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Gencko 種群展示｜豹紋守宮與肥尾守宮繁育種公種母' },
    {
      name: 'twitter:description',
      content: 'Gencko Breeding Studio 自留種群展示，含基因組合、性別與孵化日。'
    },
    { name: 'twitter:image', content: breedersImg }
  ],
  link: [{ rel: 'canonical', href: breedersUrl }],
  script: computed(() => [
    { type: 'application/ld+json', innerHTML: JSON.stringify(breedersWebPageLd.value) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(breedersBreadcrumbLd) }
  ])
})
</script>

<template>
  <div class="breeders-page-wrapper">
    <div class="common-document-meta" aria-label="種群展示說明">
      <span>GENCKO BREEDING ARCHIVE</span>
      <span>LINEAGE / GENETICS / SELECTION</span>
    </div>
    <header class="breeders-intro">
      <p class="breeders-eyebrow">SELECTED BREEDERS</p>
      <h1 class="breeders-mobile-heading">核心種群</h1>
      <p>精選 Gencko 自留繁育個體，從品系與基因看見每一代的選育方向。</p>
    </header>

    <div class="tabs" role="group" aria-label="選擇展示物種">
      <button
        type="button"
        class="tab"
        :class="{ active: breederSp === '豹紋守宮' }"
        :aria-pressed="breederSp === '豹紋守宮'"
        @click="selectBreederSp('豹紋守宮')"
      >
        豹紋守宮
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: breederSp === '肥尾守宮' }"
        :aria-pressed="breederSp === '肥尾守宮'"
        @click="selectBreederSp('肥尾守宮')"
      >
        肥尾守宮
      </button>
    </div>

    <section class="breeders-directory-stage" aria-labelledby="breeders-directory-title">
      <header class="breeders-stage-heading">
        <span>01</span>
        <div>
          <p>BREEDING COLLECTION</p>
          <h2 id="breeders-directory-title">{{ breederSp }}精選種群</h2>
        </div>
      </header>

      <div
        v-if="store.loading && !store.inventoryLoaded && breedersList.length === 0"
        class="breeders-empty-state"
      >
        <span>LOADING COLLECTION</span>
        <h3>正在載入種群資料</h3>
        <p>正在取得最新個體資料，請稍候。</p>
      </div>

      <div v-else-if="store.dataError && breedersList.length === 0" class="breeders-empty-state">
        <span>CONNECTION INTERRUPTED</span>
        <h3>種群資料載入失敗</h3>
        <p>連線暫時中斷，請重新載入資料。</p>
        <div>
          <button
            type="button"
            class="btn-app btn-app--primary btn-app--md"
            @click="store.loadDataFromAPI"
          >
            重新載入
          </button>
        </div>
      </div>

      <div v-else-if="breedersList.length === 0" class="breeders-empty-state">
        <span>ARCHIVE UPDATING</span>
        <h3>此物種目前尚無公開種群。</h3>
        <p>完成個體資料整理後會陸續更新；你可以先瀏覽在售個體或探索基因圖鑑。</p>
        <div>
          <NuxtLink no-prefetch to="/shop">瀏覽在售個體</NuxtLink>
          <NuxtLink no-prefetch to="/genes">探索基因圖鑑</NuxtLink>
        </div>
      </div>

      <div class="grid photo-grid" v-else>
        <article v-for="(i, index) in breedersList" :key="i.ID" class="breeder-photo-card">
          <img
            v-if="i.ImageURL"
            :src="getCleanUrl(i.ImageURL, 600)"
            :alt="`${i.Morph} 種群`"
            class="breeder-photo"
            :loading="index < 8 ? 'eager' : 'lazy'"
            :fetchpriority="index < 8 ? 'high' : 'auto'"
            decoding="async"
          />
          <div
            v-else
            class="breeder-photo breeder-photo--empty"
            role="img"
            :aria-label="`${i.Morph} 無圖片`"
          >
            <span>無圖片</span>
          </div>
          <h3 class="breeder-morph">{{ i.Morph }}</h3>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 
  [局部樣式修復] 
  已清除錯誤貼上的 .calc-warn 樣式與多餘的 .card 全域定義。
  全面導入 CSS 變數重構 .tabs，並移除所有 :global(body.day-mode) 的強制色彩覆寫。
*/
.breeders-page-wrapper {
  max-width: 1200px;
  margin: 0 auto;
}

/* 🌟 Responsive Utilities */
.dt-only {
  display: block;
}
.m-only {
  display: none;
}

.breeders-mobile-heading {
  color: var(--txt);
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: 0.5px;
  margin-bottom: 14px;
  border-left: 3px solid var(--pri);
  padding-left: 12px;
}

.breeders-directory-stage {
  margin-top: clamp(28px, 5vw, 56px);
  padding-top: 20px;
  border-top: 1px solid var(--bd);
}

.breeders-stage-heading {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  margin-bottom: 22px;
}

.breeders-stage-heading > span {
  display: inline-grid;
  place-items: center;
  width: 34px;
  height: 28px;
  border: 1px solid var(--pri);
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.breeders-stage-heading p,
.breeders-empty-state > span {
  margin: 0 0 4px;
  color: var(--txt-muted);
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.breeders-stage-heading h2,
.breeders-empty-state h3 {
  margin: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.04em;
}

.breeders-stage-heading h2 {
  font-size: clamp(1.25rem, 2vw, 1.75rem);
}

.breeders-empty-state {
  padding: clamp(28px, 5vw, 56px) 0;
  border-block: 1px solid var(--bd);
}

.breeders-empty-state h3 {
  margin-top: 8px;
  font-size: clamp(1.35rem, 3vw, 2rem);
}

.breeders-empty-state p {
  max-width: 56ch;
  margin: 12px 0 20px;
  color: var(--txt-muted);
  line-height: 1.7;
}

.breeders-empty-state div {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.breeders-empty-state a {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--pri);
  color: var(--pri);
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
}

/* 頁籤切換 (變數化) */
.tabs {
  display: flex;
  gap: 0;
  margin-bottom: 15px;
  background: var(--card-bg);
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--bd);
}
.tab {
  flex: 1;
  padding: 12px;
  min-height: var(--control-min-height);
  text-align: center;
  cursor: pointer;
  color: var(--txt);
  opacity: 0.6;
  font-weight: 700;
  font-size: 1rem;
  transition: 0.3s;
  border-right: 1px solid var(--bd);
  background: transparent;
  border-top: none;
  border-bottom: none;
  border-left: none;
  font-family: inherit;
}
.tab:last-child {
  border-right: none;
}
.tab.active {
  background: var(--pri);
  color: #fff;
  opacity: 1;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
}
.tab:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 2px;
  position: relative;
  z-index: 1;
}

/* 性別篩選列 */
.gender-filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}
.g-btn {
  flex: 1;
  padding: 8px 10px;
  min-height: var(--control-min-height);
  border-radius: 8px;
  border: 1px solid var(--bd);
  background: var(--card-bg);
  color: var(--txt);
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  opacity: 0.7;
}
.g-btn.active {
  opacity: 1;
  background: var(--pri);
  color: #fff;
  border-color: var(--pri);
  box-shadow: 0 2px 8px var(--pri-glow);
}
.g-btn.male.active {
  background: #3498db;
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.4);
}
.g-btn.female.active {
  background: #e91e63;
  border-color: #e91e63;
  box-shadow: 0 2px 8px rgba(233, 30, 99, 0.4);
}
.g-count {
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.25);
  padding: 1px 6px;
  border-radius: 10px;
}

/* 🌟 種群專屬的 3 欄排版微調 */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}
.photo-grid .card-img {
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  cursor: pointer;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--bd);
  transition: filter 0.3s;
}
.morph-title {
  margin: 0;
  font-weight: bold;
  color: var(--txt);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
  .dt-only {
    display: none !important;
  }
  .m-only {
    display: block;
  }
  .breeders-page-wrapper {
    padding-top: 0;
  }
  .tabs {
    margin-bottom: 15px;
  }
  .tab {
    padding: 10px;
    font-size: 0.95rem;
  }

  /* 手機改為雙欄，保留卡片標題與 metadata 的可讀寬度 */
  .grid.photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 10px;
  }
  .morph-title {
    font-size: 0.8rem !important;
  }
}

@media (hover: hover) and (pointer: fine) {
  .g-btn:hover {
    opacity: 1;
    border-color: var(--bd-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab,
  .g-btn {
    transition: none;
  }
}

.breeders-page-wrapper {
  max-width: 1440px;
  padding: clamp(38px, 6vw, 88px) clamp(20px, 5vw, 76px) 100px;
}

.breeders-intro {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 460px);
  align-items: end;
  gap: 40px;
  margin-bottom: 32px;
  padding-bottom: 30px;
  border-bottom: 1px solid var(--bd);
}

.breeders-eyebrow {
  grid-column: 1 / -1;
  margin: 0 0 -28px;
  color: var(--pri);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.breeders-mobile-heading {
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  color: var(--txt);
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(2.7rem, 6vw, 5.8rem);
  line-height: 0.96;
  letter-spacing: -0.06em;
}

.breeders-intro > p:last-child {
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.94rem;
  line-height: 1.9;
}

.tabs {
  margin-bottom: 28px;
  border: 0;
  border-bottom: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
}

.tab {
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--txt-muted);
}

.tab.active {
  border-color: var(--pri);
  background: transparent;
  box-shadow: none;
  color: var(--pri);
}

.photo-grid {
  gap: clamp(18px, 2vw, 30px);
}

/* 種群型錄與選購頁一致：商品卡、方形照片與翻面背板全部採直角。 */
:deep(.photo-grid .flip-card),
:deep(.photo-grid .flip-face),
:deep(.photo-grid .flip-back-inner),
:deep(.photo-grid .card-img.slim-img),
:deep(.photo-grid .slim-body) {
  border-radius: 0 !important;
}

@media (max-width: 768px) {
  .breeders-page-wrapper {
    padding: 30px 16px 96px;
  }

  .breeders-intro {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 22px;
    padding-bottom: 22px;
  }

  .breeders-eyebrow {
    grid-column: auto;
    margin: 0;
  }

  .breeders-mobile-heading {
    display: block !important;
    font-size: clamp(2.5rem, 14vw, 4rem);
  }

  .breeders-intro > p:last-child {
    font-size: 0.84rem;
    line-height: 1.7;
  }
}

/* 純圖片種群型錄 */
.breeders-page-wrapper {
  padding: 12px clamp(20px, 5vw, 76px) clamp(36px, 5vw, 64px);
}

.common-document-meta {
  margin-bottom: clamp(12px, 2vw, 20px);
}

.breeders-intro {
  gap: 24px;
  margin-bottom: 16px;
  padding-bottom: 18px;
}

.breeders-eyebrow {
  margin-bottom: -16px;
}

.tabs {
  margin-bottom: 14px;
}

.breeders-directory-stage {
  margin-top: 14px;
  padding-top: 14px;
}

.breeders-stage-heading {
  margin-bottom: 14px;
}

.photo-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(10px, 1.4vw, 18px);
}

.breeder-photo-card {
  position: relative;
  min-width: 0;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: var(--card-bg-solid);
}

.breeder-photo {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.breeder-photo--empty {
  display: grid;
  place-items: center;
  color: var(--txt-muted);
  font-size: 0.78rem;
  border: 1px solid var(--bd);
}

.breeder-morph {
  position: absolute;
  right: clamp(8px, 1.2vw, 14px);
  bottom: clamp(8px, 1.2vw, 14px);
  left: clamp(8px, 1.2vw, 14px);
  z-index: 1;
  margin: 0;
  overflow: hidden;
  color: #fff;
  font-family: 'Noto Serif TC', serif;
  font-size: clamp(1rem, 1.55vw, 1.4rem);
  font-weight: 900;
  line-height: 1.2;
  text-align: right;
  text-overflow: ellipsis;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.96),
    0 3px 12px rgba(0, 0, 0, 0.88);
  white-space: nowrap;
}

@media (max-width: 768px) {
  .breeders-page-wrapper {
    padding: 8px 10px 72px;
  }

  .common-document-meta {
    margin-bottom: 10px;
  }

  .breeders-intro {
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 14px;
  }

  .breeders-eyebrow {
    margin: 0;
  }

  .breeders-mobile-heading {
    font-size: clamp(2.2rem, 12vw, 3.5rem);
  }

  .tabs {
    margin-bottom: 10px;
  }

  .breeders-directory-stage {
    margin-top: 10px;
    padding-top: 10px;
  }

  .breeders-stage-heading {
    margin-bottom: 10px;
  }

  .grid.photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 6px;
  }

  .breeder-morph {
    right: 6px;
    bottom: 6px;
    left: 6px;
    font-size: clamp(0.76rem, 3.4vw, 0.95rem);
  }
}
</style>
