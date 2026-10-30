import { SITE_URL } from './site-constants'

const privateRoute = /^\/(?:api|profile|auction-management|line-login-return|identity)(?:\/|$)/
/** 僅正式公開路徑，不傳查詢字詞、授權碼、雜湊或會員資料。 */
export function analyticsPage(href: string) {
  try {
    const url = new URL(href)
    const decoded = decodeURIComponent(url.pathname)
    if (url.origin !== SITE_URL || privateRoute.test(decoded) || /[\\\u0000-\u001f]/.test(decoded))
      return null
    return { page_location: `${SITE_URL}${url.pathname}`, page_path: url.pathname }
  } catch {
    return null
  }
}
const events = new Set([
  'navigation_click',
  'inquiry_click',
  'search_no_results',
  'login_success',
  'line_verified',
  'bid_success',
  'certificate_search'
])
export function analyticsEvent(name: string, input: Record<string, unknown> = {}) {
  if (!events.has(name)) return null
  const parameters: Record<string, string | number | boolean> = {}
  if (typeof input.item_id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(input.item_id))
    parameters.item_id = input.item_id
  if (
    ['shop', 'articles', 'genes', 'hospital', 'certificates', 'auction'].includes(
      String(input.surface)
    )
  )
    parameters.surface = String(input.surface)
  if (typeof input.extended === 'boolean') parameters.extended = input.extended
  if (typeof input.destination === 'string' && /^\/[a-z/-]*$/.test(input.destination))
    parameters.destination = input.destination
  return { name, parameters }
}
