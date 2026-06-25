/**
 * SEO / Schema.org JSON-LD 共用 helper
 *
 * 為什麼存在：
 *   - 原本 publisher Organization 在 16+ 個頁面複製 200+ 行重複碼
 *   - 改 publisher（如品牌名、logo、sameAs）需要逐頁編輯，容易遺漏
 *   - 抽 helper 後一處修改全站生效
 *
 * 用法：
 *   import { getPublisher, getBreadcrumb, getWebPage, GECKO_TAXONS } from '~/utils/seo-schemas.js'
 *
 *   useHead({
 *     script: [
 *       { type: 'application/ld+json', children: JSON.stringify(getWebPage({
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
    SOCIAL_LINKS,
    WEBSITE_AT_ID,
    DEFAULT_OG_IMAGE,
} from './site-constants.js'

// ─────────────────────────────────────────────────────────────────
// Organization / publisher 共用物件
// ─────────────────────────────────────────────────────────────────

/** 完整 publisher（含 logo width/height，給 Article / BlogPosting 等 Google 規範要求的位置用） */
export const getPublisher = () => ({
    "@type": "Organization",
    "name": SITE_NAME,
    "alternateName": SITE_ALT_NAMES,
    "url": SITE_URL,
    "logo": {
        "@type": "ImageObject",
        "url": BRAND_LOGO_URL,
        "width": 512,
        "height": 512,
    },
    "sameAs": SOCIAL_SAME_AS,
})

/** 輕量 Organization（用於 brand / seller / manufacturer，不需 ImageObject 包覆） */
export const getOrgRef = () => ({
    "@type": "Organization",
    "name": SITE_NAME,
    "alternateName": SITE_ALT_NAMES,
    "url": SITE_URL,
    "logo": BRAND_LOGO_URL,
    "sameAs": SOCIAL_SAME_AS,
})

/** Brand 物件（用於 Product.brand） */
export const getBrand = () => ({
    "@type": "Brand",
    "name": SITE_NAME,
    "alternateName": SITE_ALT_NAMES,
})

// ─────────────────────────────────────────────────────────────────
// 麵包屑
// ─────────────────────────────────────────────────────────────────

/**
 * BreadcrumbList helper
 * @param {Array<{name: string, url: string}>} items - 麵包屑項目
 * @example
 *   getBreadcrumb([
 *     { name: '首頁', url: '/' },
 *     { name: '文章', url: '/articles' },
 *   ])
 */
export const getBreadcrumb = (items) => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((it, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": it.name,
        "item": it.url.startsWith('http') ? it.url : `${SITE_URL}${it.url.startsWith('/') ? it.url : '/' + it.url}`,
    })),
})

// ─────────────────────────────────────────────────────────────────
// WebPage 包覆 helper
// ─────────────────────────────────────────────────────────────────

/**
 * WebPage / CollectionPage / MedicalWebPage 等通用包覆
 * @param {object} opts
 * @param {string} opts.url - 頁面網址（完整 URL）
 * @param {string} opts.name - 頁面名稱
 * @param {string} [opts.type='WebPage'] - schema.org 類型（CollectionPage / MedicalWebPage / AboutPage 等）
 * @param {string} [opts.image] - 主視覺圖
 * @param {string[]} [opts.speakable] - speakable cssSelector 陣列
 * @param {Array} [opts.about] - about 物件（如 Taxon）
 * @param {object} [opts.mainEntity] - 主體實體
 * @param {Array} [opts.hasPart] - 子實體陣列
 * @param {object} [opts.publisher] - 自訂 publisher（預設用 getPublisher()）
 */
export const getWebPage = (opts) => {
    const ld = {
        "@context": "https://schema.org",
        "@type": opts.type || "WebPage",
        "@id": opts.url,
        "url": opts.url,
        "name": opts.name,
        "inLanguage": "zh-TW",
        "isPartOf": { "@type": "WebSite", "@id": WEBSITE_AT_ID },
    }
    if (opts.image) {
        ld.primaryImageOfPage = { "@type": "ImageObject", "url": opts.image }
    }
    if (opts.speakable && opts.speakable.length) {
        ld.speakable = {
            "@type": "SpeakableSpecification",
            "cssSelector": opts.speakable,
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
    "@type": "Taxon",
    "name": "Eublepharis macularius",
    "alternateName": "豹紋守宮",
    "sameAs": "https://www.wikidata.org/wiki/Q185061",
}
export const TAXON_FAT_TAIL_GECKO = {
    "@type": "Taxon",
    "name": "Hemitheconyx caudicinctus",
    "alternateName": "肥尾守宮",
    "sameAs": "https://www.wikidata.org/wiki/Q913571",
}
export const TAXON_HOGNOSE_SNAKE = {
    "@type": "Taxon",
    "name": "Heterodon nasicus",
    "alternateName": "豬鼻蛇",
    "sameAs": "https://www.wikidata.org/wiki/Q914251",
}

/** 守宮雙物種（about 欄位最常用） */
export const GECKO_TAXONS = [TAXON_LEOPARD_GECKO, TAXON_FAT_TAIL_GECKO]

/** 三物種全集（基因計算機 / 商品分類等用） */
export const ALL_TAXONS = [TAXON_LEOPARD_GECKO, TAXON_FAT_TAIL_GECKO, TAXON_HOGNOSE_SNAKE]

// ─────────────────────────────────────────────────────────────────
// 常用 Meta tags helper（給 useHead 用）
// ─────────────────────────────────────────────────────────────────

/**
 * 產出標準 og + twitter card meta 陣列
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string} [opts.image=DEFAULT_OG_IMAGE]
 * @param {string} opts.url - 完整 URL
 * @param {string} [opts.type='website'] - og:type (website / article / product)
 * @param {string} [opts.imageAlt] - og:image:alt
 */
export const getSocialMeta = (opts) => {
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
        { name: 'twitter:image', content: img },
    ]
}
