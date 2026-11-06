const routes = new Set([
  'home',
  'shop',
  'product',
  'compare',
  'breeders',
  'articles',
  'genes',
  'calculator',
  'care',
  'guide',
  'start-here',
  'health',
  'qs',
  'faq',
  'hospital',
  'merch',
  'certificates',
  'identity',
  'profile',
  'auction',
  'auction-management',
  'line-login-return',
  'about',
  'hero-lab',
  'stories',
  'why-gencko',
  'buying-guide'
])
export function monitoringRoute(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
    return '/unknown'
  const parts = value.split(/[?#]/)[0].split('/').filter(Boolean)
  if (!parts.length) return '/'
  if (!routes.has(parts[0])) return '/unknown'
  return `/${parts[0]}${parts.length > 1 ? '/:id' : ''}`
}
const types = new Set([
  'vue_error',
  'script_error',
  'unhandled_rejection',
  'resource_error',
  'LCP',
  'CLS',
  'INP',
  'route_render'
])
const categories = new Set(['render', 'network', 'chunk', 'image', 'script', 'unknown'])
export function sanitizeMonitoringEvent(input: any): Record<string, string | number> | null {
  if (!input || !types.has(input.type)) return null
  const result: Record<string, string | number> = {
    type: input.type,
    route: monitoringRoute(input.route)
  }
  if (['LCP', 'CLS', 'INP', 'route_render'].includes(input.type)) {
    if (
      typeof input.value !== 'number' ||
      !Number.isFinite(input.value) ||
      input.value < 0 ||
      input.value > (input.type === 'CLS' ? 100 : 3600000)
    )
      return null
    result.value = Math.round(input.value * 1000) / 1000
    result.scope = input.type === 'route_render' ? 'route' : 'document'
  } else result.category = categories.has(input.category) ? input.category : 'unknown'
  return result
}
