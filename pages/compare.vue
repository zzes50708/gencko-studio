<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

const store = useMainStore()
const route = useRoute()
const router = useRouter()

// 清空比較並回選購（合併為方法，避免行內多語句被 prettier 拆掉分號而解析失敗）
const clearAndGoShop = () => {
  store.clearCompare()
  router.push('/shop')
}

const cmpUrl = 'https://www.genckobreeding.com/compare'
const cmpImg =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
const cmpPublisher = {
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

const cmpHowToLd = {
  '@type': 'HowTo',
  '@id': `${cmpUrl}#howto`,
  name: '如何使用 Gencko 個體比較工具',
  description: '3 步驟並排比較多隻在售守宮的基因、性別、價格與其他細節，幫助你快速做出選購決策。',
  image: cmpImg,
  totalTime: 'PT2M',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: '在商城選擇個體',
      text: '到 /shop 商城瀏覽守宮，點擊每張卡片右上角的「加入比較」按鈕，最多可選擇 3 隻。'
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: '進入比較頁',
      text: '選擇完成後點擊浮動按鈕進入 /compare，系統會以並排表格列出所有屬性。'
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: '比對基因與價格',
      text: '頁面會自動標示「共有基因」與「獨有基因」，並列出性別、孵化日、狀態與價格，協助快速判讀差異。'
    }
  ]
}

const cmpFaqLd = {
  '@type': 'FAQPage',
  '@id': `${cmpUrl}#faq`,
  mainEntity: [
    {
      '@type': 'Question',
      name: '可以同時比較幾隻守宮？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '目前最多支援 3 隻並排比較，避免行動裝置上欄位過窄造成可讀性下降。若想比較更多隻，建議先用基因條件在 /shop 商城篩選。'
      }
    },
    {
      '@type': 'Question',
      name: '比較清單會儲存嗎？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '會。比較清單儲存在瀏覽器本機（localStorage），清除瀏覽器資料或更換裝置時會消失。也可以將比較結果以 URL（含 ?ids= 參數）分享給朋友。'
      }
    },
    {
      '@type': 'Question',
      name: '「共有基因」與「獨有基因」是怎麼判斷的？',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '系統比對所選個體的基因陣列（animals.genes 欄位）：所有個體都包含的基因會標為「共有」，僅部分個體擁有的標為「獨有」，並依擁有者數量排序。'
      }
    }
  ]
}

const cmpBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首頁', item: 'https://www.genckobreeding.com/home' },
    {
      '@type': 'ListItem',
      position: 2,
      name: '線上選購',
      item: 'https://www.genckobreeding.com/shop'
    },
    { '@type': 'ListItem', position: 3, name: '個體比較', item: cmpUrl }
  ]
}

const cmpWebPageLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': cmpUrl,
  url: cmpUrl,
  name: '守宮個體並排比較工具',
  inLanguage: 'zh-TW',
  isPartOf: { '@type': 'WebSite', '@id': 'https://www.genckobreeding.com/#website' },
  primaryImageOfPage: { '@type': 'ImageObject', url: cmpImg },
  speakable: {
    '@type': 'SpeakableSpecification',
    cssSelector: ['.page-title']
  },
  publisher: cmpPublisher,
  mainEntity: {
    '@type': ['WebApplication', 'SoftwareApplication'],
    '@id': `${cmpUrl}#app`,
    name: 'Gencko 守宮個體比較工具',
    url: cmpUrl,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'All',
    browserRequirements: 'Requires JavaScript',
    inLanguage: 'zh-TW',
    description: '並排比較多隻守宮個體的基因、性別、孵化日、狀態與價格，最多 3 隻同時對照。',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
    featureList: [
      '最多 3 隻並排比較',
      '共有 / 獨有基因自動標示',
      '可分享比較結果 URL（含 ?ids= 參數）',
      '本地儲存比較清單'
    ]
  },
  hasPart: [cmpHowToLd, cmpFaqLd]
}

useHead({
  title: '守宮個體並排比較｜基因 × 性別 × 價格 一次看',
  meta: [
    {
      name: 'description',
      content:
        'Gencko 線上個體比較工具：最多 3 隻守宮並排對照，自動標示共有與獨有基因、性別、孵化日、狀態與價格，幫助你快速判讀差異做出選購決策。'
    },
    { name: 'robots', content: 'noindex, follow' },
    { name: 'keywords', content: '守宮比較, 豹紋守宮比較, 基因比對, 守宮選購, 個體並排' },
    // Open Graph
    { property: 'og:title', content: '守宮個體並排比較｜基因 × 性別 × 價格 一次看' },
    {
      property: 'og:description',
      content: '最多 3 隻守宮並排對照，自動標示共有與獨有基因，幫助快速判讀差異。'
    },
    { property: 'og:image', content: cmpImg },
    { property: 'og:image:alt', content: '守宮個體比較工具 - Gencko Breeding Studio' },
    { property: 'og:url', content: cmpUrl },
    { property: 'og:type', content: 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: '守宮個體並排比較｜基因 × 性別 × 價格 一次看' },
    { name: 'twitter:description', content: '最多 3 隻守宮並排對照，自動標示共有與獨有基因。' },
    { name: 'twitter:image', content: cmpImg }
  ],
  link: [{ rel: 'canonical', href: cmpUrl }],
  script: [
    { type: 'application/ld+json', innerHTML: JSON.stringify(cmpWebPageLd) },
    { type: 'application/ld+json', innerHTML: JSON.stringify(cmpBreadcrumbLd) }
  ]
})

// 🌟 加入 (store.compareList || []) 保護
const ids = computed(() => {
  if (route.query.ids) return String(route.query.ids).split(',').filter(Boolean).slice(0, 3)
  return (store.compareList || []).slice(0, 3)
})

// 🌟 加入 (store.inv || []) 保護
const items = computed(() =>
  ids.value.map((id) => (store.inv || []).find((i) => i.ID === id)).filter(Boolean)
)

const allGenes = computed(() => {
  const sets = items.value.map((i) => new Set(Array.isArray(i.Genes) ? i.Genes : []))
  const allSet = new Set(sets.flatMap((s) => [...s]))
  return [...allSet]
    .map((g) => ({
      gene: g,
      shared: sets.every((s) => s.has(g)),
      owners: items.value.filter((_, idx) => sets[idx].has(g)).length
    }))
    .sort((a, b) => b.owners - a.owners)
})

const fmtSex = (i) => {
  if (!i) return '-'
  if (i.GenderType === '溫控') {
    const t = +i.GenderValue
    if (t >= 31) return `孵化溫度:${t}度（90% 公）`
    if (t >= 30) return `孵化溫度:${t}度（75% 公）`
    if (t >= 28) return `孵化溫度:${t}度（均等）`
    if (t >= 27) return `孵化溫度:${t}度（75% 母）`
    return `孵化溫度:${t}度（90% 母）`
  }
  return i.GenderType || '-'
}

const fmtStatus = (i) => {
  if (!i) return '-'
  if (i.Status === 'ForSale') return '出售中'
  if (i.Status === 'Auction') return '競標中'
  if (i.Status === 'Sold') return '已售出'
  return i.Status
}

const fmtPrice = (i) => {
  if (!i) return '-'
  if (i.Status === 'Sold') return `已售 $${i.SoldPrice || '?'}`
  if (i.ListingPrice) return `NT$ ${i.ListingPrice}`
  return '-'
}

// 🌟 加入 (store.auctionList || []) 保護
const hasActiveAuction = (id) => (store.auctionList || []).some((a) => a.animal_id === id)

const getAuctionLink = (id) => {
  const auction = (store.auctionList || []).find((a) => a.animal_id === id)
  return auction ? `/auction/${auction.id}` : '/auction'
}

const removeItem = (id) => {
  store.toggleCompare(id)
  if ((store.compareList || []).length === 0) router.push('/shop')
}
</script>

<template>
  <main class="compare-page" data-phase3-surface="compare">
    <div class="common-document-meta" aria-label="比較工作台說明">
      <span>GENCKO COMPARISON DESK</span>
      <span>SELECT / REVIEW / DECIDE</span>
    </div>
    <header class="compare-header">
      <div class="compare-header__copy">
        <p class="compare-eyebrow">Decision table</p>
        <h1 class="page-title">個體比較</h1>
        <p>相似個體挑選，看看喜歡哪個。</p>
      </div>
      <div class="compare-header__actions">
        <span class="compare-count">已選擇 {{ items.length }} / 3 隻</span>
        <NuxtLink no-prefetch to="/shop" class="btn-app btn-app--ghost btn-app--sm back-btn">
          返回商城
        </NuxtLink>
        <button
          v-if="items.length > 0"
          type="button"
          class="btn-app btn-app--secondary btn-app--sm clear-all-btn"
          @click="clearAndGoShop()"
        >
          清空並重選
        </button>
      </div>
    </header>

    <section v-if="items.length === 0" class="empty-compare" aria-labelledby="empty-title">
      <p class="empty-compare__index" aria-hidden="true">00 / 03</p>
      <h2 id="empty-title">尚未選擇任何個體</h2>
      <p>回到商城加入最多三隻個體，就能在這裡直接比較基因與價格。</p>
      <NuxtLink no-prefetch to="/shop" class="btn-app btn-app--primary btn-app--md">
        前往選購
      </NuxtLink>
    </section>

    <template v-else>
      <div class="compare-toolbar">
        <div class="gene-legend" aria-label="基因標記說明">
          <span>
            <i class="legend-dot shared" aria-hidden="true"></i>
            所有個體共有
          </span>
          <span>
            <i class="legend-dot unique" aria-hidden="true"></i>
            單一個體獨有
          </span>
        </div>
        <p class="compare-scroll-hint">可左右滑動查看完整比較</p>
      </div>

      <section class="compare-scroll" role="region" aria-label="個體比較表" tabindex="0">
        <table class="compare-table" :class="`cols-${items.length}`">
          <caption class="sr-only">
            所選守宮個體的物種、性別、出生日期、基因、狀態與售價比較
          </caption>
          <thead>
            <tr>
              <th scope="col" class="row-label row-label--corner">比較欄位</th>
              <th v-for="item in items" :key="item.ID" scope="col" class="item-heading">
                <button
                  type="button"
                  class="btn-app btn-app--ghost btn-app--xs remove-btn"
                  @click="removeItem(item.ID)"
                  :aria-label="`移除 ${item.Morph} 比較項目`"
                >
                  <span aria-hidden="true">✕</span>
                </button>
                <NuxtLink
                  no-prefetch
                  :to="`/product/${item.ID}`"
                  class="item-link"
                  :aria-label="`查看 ${item.Morph} 詳細資料`"
                >
                  <img
                    v-if="item.ImageURL"
                    :src="getCleanUrl(item.ImageURL, 400)"
                    :alt="item.Morph"
                    class="compare-img"
                    loading="lazy"
                    decoding="async"
                  />
                  <div v-else class="compare-img-placeholder" aria-hidden="true">無圖片</div>
                  <span class="item-morph">{{ item.Morph }}</span>
                  <span class="item-id">ID {{ item.ID }}</span>
                </NuxtLink>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" class="row-label">物種</th>
              <td v-for="item in items" :key="item.ID">{{ item.Species || '未登錄' }}</td>
            </tr>
            <tr>
              <th scope="row" class="row-label">性別</th>
              <td v-for="item in items" :key="item.ID">{{ fmtSex(item) }}</td>
            </tr>
            <tr>
              <th scope="row" class="row-label">出生日期</th>
              <td v-for="item in items" :key="item.ID" class="numeric-cell">
                {{ item.Birthday || '未登錄' }}
              </td>
            </tr>
            <tr>
              <th scope="row" class="row-label">基因</th>
              <td v-for="item in items" :key="item.ID">
                <div class="gene-cell">
                  <span
                    v-for="g in Array.isArray(item.Genes) ? item.Genes : []"
                    :key="g"
                    class="gene-tag"
                    :class="{
                      shared: allGenes.find((gene) => gene.gene === g)?.shared,
                      unique: allGenes.find((gene) => gene.gene === g)?.owners === 1
                    }"
                  >
                    {{ g }}
                  </span>
                  <span v-if="!item.Genes || item.Genes.length === 0" class="empty-value">
                    未登錄
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <th scope="row" class="row-label">狀態</th>
              <td v-for="item in items" :key="item.ID">
                <span
                  class="status-badge"
                  :class="{
                    's-for-sale': item.Status === 'ForSale',
                    's-auction': item.Status === 'Auction' && hasActiveAuction(item.ID),
                    's-sold': item.Status === 'Sold'
                  }"
                >
                  {{ fmtStatus(item) }}
                </span>
              </td>
            </tr>
            <tr class="compare-price-row">
              <th scope="row" class="row-label">售價</th>
              <td v-for="item in items" :key="item.ID" class="price-cell">
                {{ fmtPrice(item) }}
              </td>
            </tr>
            <tr class="action-row">
              <th scope="row" class="row-label">下一步</th>
              <td v-for="item in items" :key="item.ID">
                <div class="action-stack">
                  <NuxtLink
                    no-prefetch
                    v-if="item.Status === 'ForSale'"
                    :href="store.lineLink"
                    target="_blank"
                    class="btn-app btn-app--primary btn-app--sm btn-action"
                  >
                    私訊購買
                  </NuxtLink>
                  <NuxtLink
                    no-prefetch
                    v-else-if="item.Status === 'Auction' && hasActiveAuction(item.ID)"
                    :to="getAuctionLink(item.ID)"
                    class="btn-app btn-app--primary btn-app--sm btn-action btn-auction"
                  >
                    前往競標
                  </NuxtLink>
                  <NuxtLink
                    no-prefetch
                    :to="`/product/${item.ID}`"
                    class="btn-app btn-app--secondary btn-app--sm btn-action btn-detail"
                  >
                    查看詳頁
                  </NuxtLink>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </main>
</template>

<style scoped>
.compare-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 15px 40px;
}

.compare-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--bd);
  flex-wrap: wrap;
}
.back-btn {
  color: var(--txt);
  opacity: 0.6;
  text-decoration: none;
  font-size: 0.9rem;
  white-space: nowrap;
  transition: 0.2s;
}
.clear-all-btn {
  margin-left: auto;
  min-height: var(--control-min-height);
  background: transparent;
  border: 1px solid var(--bd);
  color: var(--txt);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  cursor: pointer;
  opacity: 0.7;
  transition: 0.2s;
  white-space: nowrap;
}

.empty-compare {
  text-align: center;
  padding: 60px 0;
  color: var(--txt);
  opacity: 0.6;
}

/* 比較表格 */
.compare-layout {
  display: grid;
  gap: 0;
}
.cols-1 {
  grid-template-columns: 140px 1fr;
}
.cols-2 {
  grid-template-columns: 140px 1fr 1fr;
}
.cols-3 {
  grid-template-columns: 140px 1fr 1fr 1fr;
}

.compare-row {
  display: contents;
}
.compare-row > * {
  padding: 14px 12px;
  border-bottom: 1px solid var(--bd);
  display: flex;
  align-items: center;
}
.compare-row:last-child > * {
  border-bottom: none;
}
.compare-row:nth-child(even) > * {
  background: rgba(128, 128, 128, 0.03);
}

.row-label {
  font-size: 0.82rem;
  font-weight: bold;
  color: var(--txt);
  opacity: 0.55;
  white-space: nowrap;
  background: transparent !important;
  padding-right: 8px;
  position: sticky;
  left: 0;
  z-index: 1;
}

.col-cell {
  font-size: 0.9rem;
  color: var(--txt);
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

/* 圖片列 */
.header-row > * {
  padding-top: 0 !important;
}
.img-cell {
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  padding-top: 16px !important;
}
.remove-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: var(--control-min-height);
  min-height: var(--control-min-height);
  height: var(--control-min-height);
  border-radius: 50%;
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #e74c3c;
  font-size: 0.7rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
  z-index: 10;
}
.compare-img {
  width: 100%;
  max-width: 200px;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--bd);
  display: block;
  margin: 0 auto 8px;
}
.compare-img-placeholder {
  width: 100%;
  max-width: 200px;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  background: var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  margin: 0 auto 8px;
}
.item-morph {
  font-size: 1rem;
  font-weight: 900;
  color: var(--txt);
  margin-bottom: 2px;
}
.item-id {
  font-size: 0.72rem;
  color: var(--txt);
  opacity: 0.4;
}

/* 基因標籤 */
.gene-cell {
  flex-wrap: wrap;
  flex-direction: row;
}
.gene-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: bold;
  background: var(--bd);
  color: var(--txt);
  border: 1px solid transparent;
}
.gene-tag.shared {
  background: rgba(232, 68, 10, 0.12);
  color: var(--pri);
  border-color: var(--pri-glow);
}
.gene-tag.unique {
  background: rgba(52, 152, 219, 0.12);
  color: #3498db;
  border-color: rgba(52, 152, 219, 0.3);
}

/* 狀態/價格 */
.s-for-sale {
  background: rgba(46, 204, 113, 0.15);
  color: #27ae60;
  border: 1px solid rgba(46, 204, 113, 0.3);
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: bold;
}
.s-auction {
  background: rgba(232, 68, 10, 0.15);
  color: var(--pri);
  border: 1px solid var(--pri-glow);
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.82rem;
  font-weight: bold;
}
.s-sold {
  background: rgba(128, 128, 128, 0.15);
  color: #888;
  border: 1px solid rgba(128, 128, 128, 0.2);
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.82rem;
}

.compare-price-row .price-cell {
  font-size: 1.1rem;
  font-weight: 900;
  color: var(--pri);
}

/* 操作按鈕 */
.action-row .col-cell {
  flex-direction: column;
  gap: 8px;
  align-items: stretch;
}
.btn-action {
  display: block;
  min-height: var(--control-min-height);
  text-align: center;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
  text-decoration: none;
  background: var(--pri);
  color: #fff;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 8px var(--pri-glow);
  transition: 0.2s;
}
.btn-auction {
  background: #e67e22;
  box-shadow: 0 2px 8px rgba(230, 126, 34, 0.4);
}
.btn-detail {
  background: transparent;
  color: var(--txt);
  border: 1px solid var(--bd);
  box-shadow: none;
  opacity: 0.7;
}

.clear-all-btn:focus-visible,
.remove-btn:focus-visible,
.btn-action:focus-visible,
.back-btn:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 2px;
}
/* Mobile */
@media (max-width: 768px) {
  .compare-page {
    padding: 0 8px 40px;
    overflow-x: auto;
  }
  .cols-1 {
    grid-template-columns: 80px 1fr;
  }
  .cols-2 {
    grid-template-columns: 80px 1fr 1fr;
  }
  .cols-3 {
    grid-template-columns: 80px minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr);
  }
  .compare-layout {
    min-width: 340px;
  }
  .row-label {
    font-size: 0.72rem;
    padding: 10px 6px;
  }
  .col-cell {
    font-size: 0.82rem;
    padding: 10px 8px;
  }
  .compare-img {
    max-width: 120px;
  }
  .item-morph {
    font-size: 0.88rem;
  }
  .btn-action {
    padding: 7px 8px;
    font-size: 0.78rem;
  }
  .compare-header {
    margin-bottom: 14px;
  }
  .gene-tag {
    font-size: 0.68rem;
    padding: 1px 5px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .back-btn:hover {
    opacity: 1;
    color: var(--pri);
  }
  .clear-all-btn:hover {
    opacity: 1;
    border-color: #e74c3c;
    color: #e74c3c;
  }
  .remove-btn:hover {
    background: #e74c3c;
    color: #fff;
  }
  .btn-action:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 14px var(--pri-glow);
  }
  .btn-detail:hover {
    opacity: 1;
    border-color: var(--bd-hover);
  }
}

@media (prefers-reduced-motion: reduce) {
  .back-btn,
  .clear-all-btn,
  .remove-btn,
  .btn-action {
    transition: none !important;
    animation: none !important;
  }
}

/* Phase 3 focused redesign：保留比較規則，改以語意表格呈現。 */
.compare-page {
  width: min(100%, 1180px);
  padding: 1rem 1.25rem 5rem;
  overflow: visible;
}

.compare-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2rem;
  align-items: end;
  margin-bottom: 0;
  padding: clamp(1.5rem, 4vw, 3.5rem) 0 2rem;
}

.compare-header__copy {
  max-width: 48rem;
}

.compare-eyebrow {
  margin: 0 0 0.75rem;
  color: var(--pri);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.compare-header .page-title {
  margin: 0;
  font-size: clamp(2.3rem, 6vw, 5.25rem);
  line-height: 1;
  text-wrap: balance;
}

.compare-header__copy > p:last-child {
  max-width: 60ch;
  margin: 1rem 0 0;
  color: var(--txt);
  line-height: 1.7;
  opacity: 0.68;
  text-wrap: pretty;
}

.compare-header__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6rem;
  max-width: 20rem;
}

.compare-count {
  flex-basis: 100%;
  color: var(--txt);
  font-size: 0.82rem;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.compare-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0;
}

.gene-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  color: var(--txt);
  font-size: 0.75rem;
  opacity: 0.7;
}

.gene-legend > span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--bd);
}

.legend-dot.shared {
  background: var(--pri);
}

.legend-dot.unique {
  background: #2f7da1;
}

.compare-scroll-hint {
  margin: 0;
  color: var(--txt);
  font-size: 0.75rem;
  opacity: 0.52;
}

.compare-scroll {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--bd);
  border-radius: 1rem;
  background: var(--card-bg);
  overscroll-behavior-inline: contain;
  scrollbar-gutter: stable;
}

.compare-scroll:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

.compare-table {
  width: 100%;
  min-width: 42rem;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  color: var(--txt);
}

.compare-table.cols-1 {
  min-width: 28rem;
}

.compare-table.cols-3 {
  min-width: 58rem;
}

.compare-table th,
.compare-table td {
  padding: 0.7rem 0.75rem;
  border: 0;
  border-bottom: 1px solid var(--bd);
  vertical-align: top;
  text-align: left;
}

.compare-table tbody tr:last-child > * {
  border-bottom: 0;
}

.compare-table tbody tr:nth-child(even) > * {
  background: color-mix(in srgb, var(--bd) 22%, transparent);
}

.compare-table .row-label {
  position: sticky;
  left: 0;
  z-index: 2;
  width: 8rem;
  padding: 0.7rem 0.75rem;
  background: var(--card-bg) !important;
  color: var(--txt);
  font-size: 0.75rem;
  font-weight: 800;
  opacity: 1;
}

.compare-table .row-label--corner {
  z-index: 3;
  vertical-align: bottom;
  opacity: 0.52;
}

.item-heading {
  position: relative;
  min-width: 13rem;
  background: color-mix(in srgb, var(--card-bg) 92%, var(--bd));
}

.item-link {
  display: grid;
  gap: 0.35rem;
  color: inherit;
  text-decoration: none;
}

.item-link:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

.compare-table .remove-btn {
  top: 0.5rem;
  right: 0.5rem;
  z-index: 1;
  width: var(--control-min-height);
  height: var(--control-min-height);
  min-height: var(--control-min-height);
  padding: 0;
  border-radius: 2px;
  background: var(--card-bg-solid);
  border-color: var(--bd-solid);
  color: var(--txt);
  opacity: 0.72;
  box-shadow: none;
}

.compare-table .compare-img,
.compare-table .compare-img-placeholder {
  width: 100%;
  max-width: none;
  margin: 0 0 0.6rem;
  aspect-ratio: 1 / 1;
  border-radius: 0;
}

.compare-header .page-title {
  font-family: 'Noto Serif TC', serif;
  font-weight: 700;
  letter-spacing: -0.06em;
}

.compare-scroll {
  border-radius: 0;
  box-shadow: none;
}

.gene-tag,
.compare-table .status-badge,
.btn-action,
.clear-all-btn {
  border-radius: 2px;
}

.compare-table .compare-img-placeholder {
  display: grid;
  place-items: center;
  color: var(--txt);
  font-size: 0.72rem;
  opacity: 0.45;
}

.compare-table .item-morph {
  margin: 0;
  padding-right: 2rem;
  font-size: 1rem;
  line-height: 1.3;
  text-wrap: balance;
}

.compare-table .item-id {
  font-variant-numeric: tabular-nums;
}

.compare-table td {
  font-size: 0.88rem;
  line-height: 1.55;
}

.numeric-cell,
.price-cell {
  font-variant-numeric: tabular-nums;
}

.gene-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.gene-tag {
  border-radius: 0.45rem;
}

.gene-tag.unique {
  color: #2f7da1;
  border-color: color-mix(in srgb, #2f7da1 36%, transparent);
  background: color-mix(in srgb, #2f7da1 12%, transparent);
}

.empty-value {
  opacity: 0.45;
}

.compare-table .status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  border-radius: 0.45rem;
}

.compare-table .price-cell {
  color: var(--pri);
  font-size: 1.1rem;
  font-weight: 900;
  line-height: 1.25;
  white-space: nowrap;
}

.compare-table .compare-price-row > * {
  vertical-align: middle;
}

.action-stack {
  display: grid;
  gap: 0.5rem;
}

.compare-table .btn-action {
  display: inline-flex;
  width: 100%;
  min-height: var(--control-min-height);
  border-radius: 2px;
  box-shadow: none;
  opacity: 1;
}

.compare-table .btn-detail {
  background: var(--btn-secondary-bg);
  color: var(--txt);
  border-color: var(--bd-solid);
}

.compare-header__actions .btn-app,
.empty-compare > .btn-app {
  border-radius: 2px;
}

.compare-header__actions .back-btn {
  opacity: 1;
}

.compare-header__actions .clear-all-btn {
  margin-left: 0;
  background: var(--btn-secondary-bg);
  color: var(--txt);
  border-color: var(--bd-solid);
  opacity: 1;
  box-shadow: none;
}

.empty-compare {
  display: grid;
  justify-items: start;
  max-width: 40rem;
  padding: clamp(3rem, 10vw, 7rem) 0;
  text-align: left;
  opacity: 1;
}

.empty-compare__index {
  margin: 0 0 1rem;
  color: var(--pri);
  font-size: 3rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.empty-compare h2 {
  margin: 0;
  font-size: clamp(1.8rem, 5vw, 3rem);
  text-wrap: balance;
}

.empty-compare > p:not(.empty-compare__index) {
  margin: 0.8rem 0 1.5rem;
  line-height: 1.7;
  opacity: 0.68;
}

@media (max-width: 768px) {
  .compare-page {
    padding: 0.5rem 0.75rem 4rem;
    overflow: visible;
  }

  .compare-header {
    grid-template-columns: 1fr;
    gap: 1.5rem;
    padding-top: 0.75rem;
  }

  .compare-header__actions {
    justify-content: flex-start;
    max-width: none;
  }

  .compare-count {
    text-align: left;
  }

  .compare-toolbar {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.65rem;
  }

  .compare-scroll-hint {
    color: var(--pri);
    font-weight: 700;
    opacity: 1;
  }

  .compare-table th,
  .compare-table td,
  .compare-table .row-label {
    padding: 0.58rem 0.6rem;
  }

  .compare-table .row-label {
    width: 5.75rem;
  }
}

@media (hover: hover) and (pointer: fine) {
  .compare-table .remove-btn:hover {
    border-color: #e74c3c;
    background: color-mix(in srgb, #e74c3c 12%, var(--card-bg-solid));
    color: #e74c3c;
    opacity: 1;
    transform: none;
  }

  .compare-table .btn-action:hover {
    box-shadow: none;
  }

  .compare-table .btn-detail:hover,
  .compare-header__actions .clear-all-btn:hover {
    border-color: var(--bd-hover-solid);
    color: var(--pri);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .item-link,
  .compare-scroll {
    scroll-behavior: auto !important;
  }
}
</style>
