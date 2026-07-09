/**
 * 全站常數
 *
 * 集中管理品牌名、網域、logo、社群連結、分享卡圖等常數，
 * 避免散落在 16+ 個頁面與 schema JSON-LD 中。
 *
 * 用法：
 *   import { SITE_URL, BRAND_LOGO_URL, SOCIAL_LINKS } from '~/utils/site-constants'
 */

// 基本識別
export const SITE_URL = 'https://www.genckobreeding.com'
export const SITE_NAME = 'Gencko Breeding Studio'
export const SITE_ALT_NAMES = ['Gencko Studio', '捷客工作室']
export const SITE_DESCRIPTION =
  'Gencko Breeding Studio 台灣豹紋守宮專業繁育工作室，提供特殊基因品系個體選購、基因計算機、新手飼養教學、健康評估、特寵醫院查詢與線上競標。從基因到飼養的一站式服務。'
export const SITE_FOUNDER = 'Gino'
export const SITE_FOUNDING_YEAR = '2025'
export const SITE_FOUNDING_LOCATION = '三重, 台灣'

// 圖片資源
export const BRAND_LOGO_URL = 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/11.png'

// 預設社群分享卡（1200×630 WebP，wsrv.nl 即時合成淺灰底 + 中央 logo）
export const DEFAULT_OG_IMAGE =
  'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'

// 社群連結
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/gencko_breeding',
  facebook: 'https://www.facebook.com/profile.php?id=61579393505049',
  line: 'https://line.me/R/ti/p/@219abdzn'
}
export const SOCIAL_SAME_AS = [SOCIAL_LINKS.instagram, SOCIAL_LINKS.facebook, SOCIAL_LINKS.line]

// Schema.org 共用 @id 參照（避免重複拼接）
export const WEBSITE_AT_ID = `${SITE_URL}/#website`
export const ORG_AT_ID = `${SITE_URL}/#organization`

// 全站 URL 路徑（避免硬編路徑被遺漏更新）
export const ROUTES = {
  home: '/',
  about: '/about',
  care: '/care',
  articles: '/articles',
  genes: '/genes',
  shop: '/shop',
  calculator: '/calculator',
  health: '/health',
  qs: '/qs',
  hospital: '/hospital',
  auction: '/auction',
  merch: '/merch',
  breeders: '/breeders',
  compare: '/compare',
  faq: '/faq'
}

// 完整絕對 URL helper
export const absUrl = (path = '/'): string =>
  `${SITE_URL}${path.startsWith('/') ? path : '/' + path}`
