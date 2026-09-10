export interface PublicSitemapRoute {
  loc: string
  changefreq: 'hourly' | 'daily' | 'weekly' | 'monthly'
  priority: number
}

export const PUBLIC_SITEMAP_ROUTES: PublicSitemapRoute[] = [
  { loc: '/home', changefreq: 'daily', priority: 1.0 },
  { loc: '/', changefreq: 'weekly', priority: 0.8 },
  { loc: '/shop', changefreq: 'hourly', priority: 0.9 },
  { loc: '/articles', changefreq: 'daily', priority: 0.9 },
  { loc: '/start-here', changefreq: 'monthly', priority: 0.8 },
  { loc: '/guide', changefreq: 'monthly', priority: 0.8 },
  { loc: '/care', changefreq: 'monthly', priority: 0.6 },
  { loc: '/health', changefreq: 'monthly', priority: 0.5 },
  { loc: '/qs', changefreq: 'monthly', priority: 0.5 },
  { loc: '/faq', changefreq: 'monthly', priority: 0.5 },
  { loc: '/genes', changefreq: 'weekly', priority: 0.8 },
  { loc: '/calculator', changefreq: 'monthly', priority: 0.8 },
  { loc: '/hospital', changefreq: 'monthly', priority: 0.8 },
  { loc: '/why-gencko', changefreq: 'monthly', priority: 0.7 },
  { loc: '/buying-guide', changefreq: 'monthly', priority: 0.7 },
  { loc: '/about', changefreq: 'monthly', priority: 0.5 },
  { loc: '/breeders', changefreq: 'monthly', priority: 0.7 },
  { loc: '/merch', changefreq: 'weekly', priority: 0.8 },
  { loc: '/auction', changefreq: 'hourly', priority: 0.9 }
]
