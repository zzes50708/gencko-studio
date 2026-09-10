export type NavigationGroupKey =
  | 'hero'
  | 'home'
  | 'explore'
  | 'learn'
  | 'tools'
  | 'brand'
  | 'profile'

export interface NavigationLink {
  label: string
  to: string
}

export interface NavigationSection {
  label: string
  links: NavigationLink[]
}

export interface NavigationGroup extends NavigationLink {
  key: Exclude<NavigationGroupKey, 'hero' | 'home' | 'profile'>
  links: NavigationLink[]
}

const exploreLinks: NavigationLink[] = [
  { label: '選購守宮', to: '/shop' },
  { label: '線上競標', to: '/auction' },
  { label: '種群展示', to: '/breeders' },
  { label: '周邊商品', to: '/merch' }
]

const learnLinks: NavigationLink[] = [
  { label: '新手入門', to: '/start-here' },
  { label: '守宮介紹', to: '/guide' },
  { label: '飼養指南', to: '/care' },
  { label: '健康評估', to: '/health' },
  { label: '飼養前評估', to: '/qs' },
  { label: '常見問題', to: '/faq' },
  { label: '文章列表', to: '/articles' }
]

const toolLinks: NavigationLink[] = [
  { label: '基因圖鑑', to: '/genes' },
  { label: '基因計算機', to: '/calculator' },
  { label: '特寵醫院', to: '/hospital' }
]

const brandLinks: NavigationLink[] = [
  { label: '選擇 Gencko', to: '/why-gencko' },
  { label: '購買流程', to: '/buying-guide' },
  { label: '關於我們', to: '/about' }
]

export const DESKTOP_NAV_GROUPS: NavigationGroup[] = [
  { key: 'explore', label: '探索選購', to: '/shop', links: exploreLinks },
  { key: 'learn', label: '新手與知識', to: '/start-here', links: learnLinks },
  { key: 'tools', label: '基因與工具', to: '/genes', links: toolLinks },
  { key: 'brand', label: '品牌與購買', to: '/why-gencko', links: brandLinks }
]

export const MOBILE_NAV_ITEMS = [
  { key: 'home', label: '首頁', to: '/home', sections: [] },
  {
    key: 'explore',
    label: '探索',
    to: '/shop',
    sections: [
      { label: '選購', links: exploreLinks },
      {
        label: '買前必讀',
        links: [
          { label: '選擇 Gencko', to: '/why-gencko' },
          { label: '購買流程', to: '/buying-guide' }
        ]
      }
    ] satisfies NavigationSection[]
  },
  {
    key: 'learn',
    label: '新手',
    to: '/start-here',
    sections: [{ label: '新手與知識', links: learnLinks }]
  },
  {
    key: 'tools',
    label: '工具',
    to: '/genes',
    sections: [{ label: '基因與工具', links: toolLinks }]
  }
] as const

export const FOOTER_NAV_GROUPS = [
  { label: '探索選購', links: exploreLinks },
  { label: '新手與知識', links: learnLinks },
  { label: '基因與工具', links: toolLinks },
  {
    label: '品牌與服務',
    links: [...brandLinks, { label: '會員專區', to: '/profile' }]
  }
] satisfies NavigationSection[]

const matchesRoute = (path: string, route: string) => path === route || path.startsWith(`${route}/`)

export const getNavigationGroup = (path: string): NavigationGroupKey => {
  const cleanPath = path.split('?')[0].split('#')[0]
  if (cleanPath === '/' || matchesRoute(cleanPath, '/hero-lab')) return 'hero'
  if (cleanPath === '/home') return 'home'
  if (matchesRoute(cleanPath, '/profile')) return 'profile'

  if (
    ['/shop', '/product', '/identity', '/compare', '/auction', '/breeders', '/merch'].some(
      (route) => matchesRoute(cleanPath, route)
    )
  ) {
    return 'explore'
  }

  if (
    ['/start-here', '/guide', '/care', '/health', '/qs', '/faq', '/articles'].some((route) =>
      matchesRoute(cleanPath, route)
    )
  ) {
    return 'learn'
  }

  if (['/genes', '/calculator', '/hospital'].some((route) => matchesRoute(cleanPath, route))) {
    return 'tools'
  }

  if (
    ['/why-gencko', '/buying-guide', '/about', '/stories'].some((route) =>
      matchesRoute(cleanPath, route)
    )
  ) {
    return 'brand'
  }

  return 'home'
}
