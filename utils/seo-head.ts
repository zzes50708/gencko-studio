import { SITE_URL } from './site-constants'

interface SeoTag {
  tag: string
  props: Record<string, any>
  textContent?: string
  _d?: string
}

/** 只補最終缺漏的標記，保留頁面自己的標題、摘要、圖片與索引限制。 */
export function completeSeoTags(tags: SeoTag[], path: string) {
  const findMeta = (name: string) =>
    tags.find(
      (tag) => tag.tag === 'meta' && (tag.props.name === name || tag.props.property === name)
    )
  const value = (name: string) => findMeta(name)?.props.content
  const appendMeta = (name: string, content: string | undefined) => {
    if (!content || findMeta(name)) return
    tags.push({
      tag: 'meta',
      // 與 Unhead 原生 meta 使用相同識別，SSR 水合與換頁才會更新原標記。
      _d: `meta:${name}`,
      props: { [name.startsWith('og:') ? 'property' : 'name']: name, content }
    })
  }
  const canonical = tags.find((tag) => tag.tag === 'link' && tag.props.rel === 'canonical')
  // 固定本站來源，避免雙斜線路徑被 URL 當作另一個網域；備用網址也不保留尾斜線。
  const cleanPath = '/' + path.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '')
  const fallbackUrl = new URL(SITE_URL)
  fallbackUrl.pathname = cleanPath
  const url = canonical?.props.href || fallbackUrl.href
  if (!canonical)
    tags.push({ tag: 'link', _d: 'canonical', props: { rel: 'canonical', href: url } })
  appendMeta('og:title', tags.find((tag) => tag.tag === 'title')?.textContent)
  appendMeta('og:image:alt', value('og:title'))
  appendMeta('og:description', value('description'))
  appendMeta('og:url', url)
  appendMeta('twitter:title', value('og:title'))
  appendMeta('twitter:description', value('og:description'))
  appendMeta('twitter:image', value('og:image'))
  appendMeta('twitter:image:alt', value('og:image:alt') || value('og:title'))
  appendMeta(
    'robots',
    /^(?:\/profile|\/compare|\/auction-management|\/line-login-return|\/identity)(?:\/|$)/.test(
      path
    )
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  )
}

/** 缺漏日期不補今天；完整時間轉成 UTC，日期與時間格式都驗證真實日曆日期。 */
export function seoDate(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return undefined
  const date = value.trim()
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date) || !Number.isFinite(Date.parse(date)))
    return undefined
  if (new Date(date.slice(0, 10)).toISOString().slice(0, 10) !== date.slice(0, 10)) return undefined
  return date.length === 10 ? date : new Date(date).toISOString()
}

/** 未標價、零值及無效值都不宣稱是免費商品。 */
export function seoPrice(value: unknown) {
  const price = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(price) && price > 0 ? price : undefined
}
