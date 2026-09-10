import { describe, expect, it } from 'vitest'
import {
  DESKTOP_NAV_GROUPS,
  FOOTER_NAV_GROUPS,
  MOBILE_NAV_ITEMS,
  getNavigationGroup
} from '../utils/site-navigation'
import { PUBLIC_SITEMAP_ROUTES } from '../utils/site-seo'
import { getBreadcrumbForPath } from '../utils/seo-schemas'

const paths = (items) => items.flatMap((item) => item.links?.map((link) => link.to) ?? [item.to])

describe('B2 全站資訊架構', () => {
  it('桌機維持四個核准群組與既有預設入口', () => {
    expect(DESKTOP_NAV_GROUPS.map(({ key, label, to }) => ({ key, label, to }))).toEqual([
      { key: 'explore', label: '探索選購', to: '/shop' },
      { key: 'learn', label: '新手與知識', to: '/start-here' },
      { key: 'tools', label: '基因與工具', to: '/genes' },
      { key: 'brand', label: '品牌與購買', to: '/why-gencko' }
    ])
  })

  it('手機底部導覽為首頁、探索、新手、工具四項', () => {
    expect(MOBILE_NAV_ITEMS.map(({ key, label, to }) => ({ key, label, to }))).toEqual([
      { key: 'home', label: '首頁', to: '/home' },
      { key: 'explore', label: '探索', to: '/shop' },
      { key: 'learn', label: '新手', to: '/start-here' },
      { key: 'tools', label: '工具', to: '/genes' }
    ])
  })

  it('依核准語意判定目前群組，並保留 Hero Lab 與商業首頁的分工', () => {
    expect(getNavigationGroup('/')).toBe('hero')
    expect(getNavigationGroup('/hero-lab')).toBe('hero')
    expect(getNavigationGroup('/home')).toBe('home')
    expect(getNavigationGroup('/product/GECKO-1')).toBe('explore')
    expect(getNavigationGroup('/health')).toBe('learn')
    expect(getNavigationGroup('/qs')).toBe('learn')
    expect(getNavigationGroup('/calculator')).toBe('tools')
    expect(getNavigationGroup('/about')).toBe('brand')
    expect(getNavigationGroup('/profile')).toBe('profile')
  })

  it('Footer 僅連向現有頁面，不產生未核准的 terms/contact 路由', () => {
    const footerPaths = paths(FOOTER_NAV_GROUPS)
    expect(FOOTER_NAV_GROUPS.map((group) => group.label)).toEqual([
      '探索選購',
      '新手與知識',
      '基因與工具',
      '品牌與服務'
    ])
    expect(footerPaths).not.toContain('/terms')
    expect(footerPaths).not.toContain('/contact')
    expect(footerPaths).toContain('/about')
    expect(footerPaths).toContain('/profile')
  })
})

describe('B2 sitemap 與 indexing 契約', () => {
  it('納入核准 Hub，排除狀態頁與 placeholder', () => {
    const sitemapPaths = PUBLIC_SITEMAP_ROUTES.map((route) => route.loc)
    expect(sitemapPaths).toEqual(
      expect.arrayContaining(['/home', '/start-here', '/buying-guide', '/why-gencko'])
    )
    expect(sitemapPaths).not.toEqual(
      expect.arrayContaining(['/hero-lab', '/compare', '/stories', '/profile'])
    )
  })

  it('商業首頁優先於 Hero Lab，但兩者都保留公開索引', () => {
    const home = PUBLIC_SITEMAP_ROUTES.find((route) => route.loc === '/home')
    const hero = PUBLIC_SITEMAP_ROUTES.find((route) => route.loc === '/')
    expect(home.priority).toBeGreaterThan(hero.priority)
  })

  it('內容頁 Breadcrumb 回商業首頁，Hero Lab 則維持自己的根路徑', () => {
    expect(getBreadcrumbForPath('/care')[0]).toEqual({ name: '首頁', url: '/home' })
    expect(getBreadcrumbForPath('/')[0]).toEqual({ name: 'Hero Lab', url: '/' })
  })
})
