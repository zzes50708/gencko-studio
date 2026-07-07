/**
 * SEO / Schema.org JSON-LD 共用 helper
 *
 * 為什麼存在：
 *   - 原本 publisher Organization 在 16+ 個頁面複製 200+ 行重複碼
 *   - 改 publisher（如品牌名、logo、sameAs）需要逐頁編輯，容易遺漏
 *   - 抽 helper 後一處修改全站生效
 *
 * 用法：
 *   import { getPublisher, getBreadcrumb, getWebPage, GECKO_TAXONS } from '~/utils/seo-schemas'
 *
 *   useHead({
 *     script: [
 *       { type: 'application/ld+json', innerHTML: JSON.stringify(getWebPage({
 *           url: 'https://www.genckobreeding.com/foo',
 *           name: '頁面名稱',
 *           image: someImg,
 *           speakable: ['.page-title'],
 *           about: GECKO_TAXONS,
 *           mainEntity: someEntity,
 *       })) }
 *     ]
 *   })
 */

import {
  SITE_URL,
  SITE_NAME,
  SITE_ALT_NAMES,
  BRAND_LOGO_URL,
  SOCIAL_SAME_AS,
  WEBSITE_AT_ID,
  DEFAULT_OG_IMAGE
} from './site-constants'

// 一般 JSON-LD 物件（欄位動態、值型別不定）
type JsonLd = Record<string, unknown>

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface WebPageOptions {
  url: string
  name: string
  type?: string
  image?: string
  speakable?: string[]
  about?: unknown
  mainEntity?: unknown
  hasPart?: unknown
  publisher?: unknown
}

export interface SocialMetaOptions {
  title: string
  description: string
  image?: string
  url: string
  type?: string
  imageAlt?: string
}

// ─────────────────────────────────────────────────────────────────
// Organization / publisher 共用物件
// ─────────────────────────────────────────────────────────────────

/** 完整 publisher（含 logo width/height，給 Article / BlogPosting 等 Google 規範要求的位置用） */
export const getPublisher = (): JsonLd => ({
  '@type': 'Organization',
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES,
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: BRAND_LOGO_URL,
    width: 512,
    height: 512
  },
  sameAs: SOCIAL_SAME_AS
})

/** 輕量 Organization（用於 brand / seller / manufacturer，不需 ImageObject 包覆） */
export const getOrgRef = (): JsonLd => ({
  '@type': 'Organization',
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES,
  url: SITE_URL,
  logo: BRAND_LOGO_URL,
  sameAs: SOCIAL_SAME_AS
})

/** Brand 物件（用於 Product.brand） */
export const getBrand = (): JsonLd => ({
  '@type': 'Brand',
  name: SITE_NAME,
  alternateName: SITE_ALT_NAMES
})

// ─────────────────────────────────────────────────────────────────
// 麵包屑
// ─────────────────────────────────────────────────────────────────

/**
 * 路徑 → 顯示標籤（用於 getBreadcrumbForPath 自動產生麵包屑）
 * 想替全站新頁面標準化麵包屑，只要在這加路徑即可。
 */
export const ROUTE_LABELS: Record<string, string> = {
  '/': '首頁',
  '/about': '關於我們',
  '/articles': '飼養知識專欄',
  '/genes': '守宮基因圖鑑',
  '/shop': '線上選購',
  '/product': '商品個體',
  '/calculator': '基因計算機',
  '/care': '新手飼養教學',
  '/health': '健康評估',
  '/qs': '飼養前評估',
  '/hospital': '特寵醫院查詢',
  '/auction': '守宮競標',
  '/merch': '周邊商品',
  '/breeders': '種群展示',
  '/compare': '個體比較',
  '/faq': '常見問題 FAQ',
  '/home': '首頁'
}

/**
 * 依目前 route path 自動生成麵包屑項目陣列
 *
 * @param path - 路由 path（如 '/articles/ART-002'）
 * @param lastLabel - 末段標籤覆寫（動態頁用，如文章標題）
 *
 * @example
 *   getBreadcrumbForPath('/articles')
 *   // → [{name:'首頁',url:'/'}, {name:'飼養知識專欄',url:'/articles'}]
 */
export const getBreadcrumbForPath = (path: string, lastLabel?: string): BreadcrumbItem[] => {
  if (!path || path === '/') return [{ name: ROUTE_LABELS['/'], url: '/' }]

  const segs = path.split('?')[0].split('#')[0].split('/').filter(Boolean)
  const items: BreadcrumbItem[] = [{ name: ROUTE_LABELS['/'], url: '/' }]
  let cur = ''
  for (let i = 0; i < segs.length; i++) {
    cur += '/' + segs[i]
    const isLast = i === segs.length - 1
    const known = ROUTE_LABELS[cur]
    let label: string
    if (known) label = known
    else if (isLast && lastLabel) label = lastLabel
    else {
      try {
        label = decodeURIComponent(segs[i])
      } catch {
        label = segs[i]
      }
    }
    items.push({ name: label, url: cur })
  }
  return items
}

/**
 * BreadcrumbList helper
 * @param items - 麵包屑項目
 *
 * @example 結合 getBreadcrumbForPath（推薦）
 *   getBreadcrumb(getBreadcrumbForPath(route.path, article.Title))
 */
export const getBreadcrumb = (items: BreadcrumbItem[]): JsonLd => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, idx) => ({
    '@type': 'ListItem',
    position: idx + 1,
    name: it.name,
    item: it.url.startsWith('http')
      ? it.url
      : `${SITE_URL}${it.url.startsWith('/') ? it.url : '/' + it.url}`
  }))
})

// ─────────────────────────────────────────────────────────────────
// WebPage 包覆 helper
// ─────────────────────────────────────────────────────────────────

/** WebPage / CollectionPage / MedicalWebPage 等通用包覆 */
export const getWebPage = (opts: WebPageOptions): JsonLd => {
  const ld: JsonLd = {
    '@context': 'https://schema.org',
    '@type': opts.type || 'WebPage',
    '@id': opts.url,
    url: opts.url,
    name: opts.name,
    inLanguage: 'zh-TW',
    isPartOf: { '@type': 'WebSite', '@id': WEBSITE_AT_ID }
  }
  if (opts.image) {
    ld.primaryImageOfPage = { '@type': 'ImageObject', url: opts.image }
  }
  if (opts.speakable && opts.speakable.length) {
    ld.speakable = {
      '@type': 'SpeakableSpecification',
      cssSelector: opts.speakable
    }
  }
  ld.publisher = opts.publisher || getPublisher()
  if (opts.about) ld.about = opts.about
  if (opts.mainEntity) ld.mainEntity = opts.mainEntity
  if (opts.hasPart) ld.hasPart = opts.hasPart
  return ld
}

// ─────────────────────────────────────────────────────────────────
// Taxon 共用物件（豹紋 / 肥尾守宮 / 豬鼻蛇）
// ─────────────────────────────────────────────────────────────────

export const TAXON_LEOPARD_GECKO = {
  '@type': 'Taxon',
  name: 'Eublepharis macularius',
  alternateName: '豹紋守宮',
  sameAs: 'https://www.wikidata.org/wiki/Q185061'
}
export const TAXON_FAT_TAIL_GECKO = {
  '@type': 'Taxon',
  name: 'Hemitheconyx caudicinctus',
  alternateName: '肥尾守宮',
  sameAs: 'https://www.wikidata.org/wiki/Q913571'
}
export const TAXON_HOGNOSE_SNAKE = {
  '@type': 'Taxon',
  name: 'Heterodon nasicus',
  alternateName: '豬鼻蛇',
  sameAs: 'https://www.wikidata.org/wiki/Q914251'
}

/** 守宮雙物種（about 欄位最常用） */
export const GECKO_TAXONS = [TAXON_LEOPARD_GECKO, TAXON_FAT_TAIL_GECKO]

/** 三物種全集（基因計算機 / 商品分類等用） */
export const ALL_TAXONS = [TAXON_LEOPARD_GECKO, TAXON_FAT_TAIL_GECKO, TAXON_HOGNOSE_SNAKE]

// ─────────────────────────────────────────────────────────────────
// 常用 Meta tags helper（給 useHead 用）
// ─────────────────────────────────────────────────────────────────

/** 產出標準 og + twitter card meta 陣列 */
export const getSocialMeta = (opts: SocialMetaOptions) => {
  const img = opts.image || DEFAULT_OG_IMAGE
  return [
    // Open Graph
    { property: 'og:title', content: opts.title },
    { property: 'og:description', content: opts.description },
    { property: 'og:image', content: img },
    ...(opts.imageAlt ? [{ property: 'og:image:alt', content: opts.imageAlt }] : []),
    { property: 'og:url', content: opts.url },
    { property: 'og:type', content: opts.type || 'website' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: opts.title },
    { name: 'twitter:description', content: opts.description },
    { name: 'twitter:image', content: img }
  ]
}
