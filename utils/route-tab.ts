export type RouteTab =
  | 'home'
  | 'articles'
  | 'care'
  | 'shop'
  | 'auction'
  | 'breeders'
  | 'merch'
  | 'genes'
  | 'calculator'
  | 'health'
  | 'hospital'
  | 'qs'
  | 'about'
  | 'guide'
  | 'faq'
  | 'profile'

const startsWithAny = (path: string, prefixes: string[]) =>
  prefixes.some((prefix) => path.startsWith(prefix))

export const getRouteTab = (path: string): RouteTab => {
  if (path === '/') return 'home'
  if (path.startsWith('/articles')) return 'articles'
  if (path.startsWith('/start-here')) return 'care'
  if (
    startsWithAny(path, [
      '/shop',
      '/product',
      '/identity',
      '/buying-guide',
      '/why-gencko',
      '/stories'
    ])
  )
    return 'shop'
  if (path.startsWith('/auction')) return 'auction'
  if (path.startsWith('/breeders')) return 'breeders'
  if (path.startsWith('/merch')) return 'merch'
  if (path.startsWith('/genes')) return 'genes'
  if (path.startsWith('/calculator')) return 'calculator'
  if (path.startsWith('/health')) return 'health'
  if (path.startsWith('/hospital')) return 'hospital'
  if (path.startsWith('/qs')) return 'qs'
  if (path.startsWith('/about')) return 'about'
  if (path.startsWith('/care')) return 'care'
  if (path.startsWith('/guide')) return 'guide'
  if (path.startsWith('/faq')) return 'faq'
  if (path.startsWith('/profile')) return 'profile'
  return 'home'
}
