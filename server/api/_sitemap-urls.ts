import { serverSupabaseClient } from '#supabase/server'
import { getCleanUrl } from '~/utils/image'

type SitemapImage = { loc: string }
type SitemapUrl = {
  loc: string
  changefreq?: string
  priority?: number
  lastmod?: string
  images?: SitemapImage[]
}

// 把 DB 的 image_url 包成 sitemap images 陣列；空值回傳 undefined
const toImages = (url?: string | null): SitemapImage[] | undefined => {
  if (!url) return undefined
  const clean = getCleanUrl(url, 1200)
  return clean ? [{ loc: clean }] : undefined
}

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const urls: SitemapUrl[] = []

  // 定義基礎靜態路由
  const staticRoutes = [
    { loc: '/', changefreq: 'daily', priority: 1.0 },
    { loc: '/shop', changefreq: 'hourly', priority: 0.9 },
    { loc: '/articles', changefreq: 'daily', priority: 0.9 },
    { loc: '/genes', changefreq: 'weekly', priority: 0.8 },
    { loc: '/calculator', changefreq: 'monthly', priority: 0.8 },
    { loc: '/hospital', changefreq: 'monthly', priority: 0.8 },
    { loc: '/about', changefreq: 'monthly', priority: 0.5 },
    { loc: '/care', changefreq: 'monthly', priority: 0.6 },
    { loc: '/faq', changefreq: 'monthly', priority: 0.5 },
    { loc: '/breeders', changefreq: 'monthly', priority: 0.7 },
    { loc: '/merch', changefreq: 'weekly', priority: 0.8 },
    { loc: '/auction', changefreq: 'hourly', priority: 0.9 },
    { loc: '/qs', changefreq: 'monthly', priority: 0.5 },
    { loc: '/compare', changefreq: 'monthly', priority: 0.5 },
    { loc: '/health', changefreq: 'monthly', priority: 0.5 }
    // /profile 與 /identity/ 已在 robots.txt Disallow，不放入 sitemap
  ]
  urls.push(...staticRoutes)

  // 1. 抓取商品與電子身分證 (Inventory)
  // 嚴格還原舊版寫法：只抓 id 與 status，把過濾邏輯放回 JS 處理
  const { data: products, error: err1 } = await supabase
    .from('animals')
    .select('id, status, image_url')

  if (err1) console.error('Sitemap 抓取 animals 失敗:', err1)
  if (products) {
    products.forEach((p) => {
      // 過濾垃圾桶與自留品
      if (p.status !== 'Trash' && p.status !== 'SelfKeep') {
        const images = toImages(p.image_url)
        urls.push({
          loc: `/product/${p.id}`,
          changefreq: 'weekly',
          priority: p.status === 'ForSale' ? 0.8 : 0.4,
          ...(images ? { images } : {})
        })
        // /identity/ 已在 robots.txt 設為 Disallow，不放入 sitemap 避免矛盾
      }
    })
  }

  // 2. 抓取文章 (Articles)
  const { data: articles, error: err2 } = await supabase
    .from('articles')
    .select('id, publish_date, status, image_url')
    .ilike('status', 'published')

  if (err2) console.error('Sitemap 抓取 articles 失敗:', err2)
  if (articles) {
    articles.forEach((a) => {
      const images = toImages(a.image_url)
      urls.push({
        loc: `/articles/${a.id}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: a.publish_date,
        ...(images ? { images } : {})
      })
    })
  }

  // 3. 抓取基因圖鑑 (Genes)
  // 嚴格還原舊版寫法：只抓 name
  const { data: genes, error: err3 } = await supabase
    .from('genetic_pages')
    .select('name, image_url')

  if (err3) console.error('Sitemap 抓取 genetic_pages 失敗:', err3)
  if (genes) {
    genes.forEach((g) => {
      const images = toImages(g.image_url)
      urls.push({
        loc: `/genes/${g.name}`,
        changefreq: 'monthly',
        priority: 0.7,
        ...(images ? { images } : {})
      })
    })
  }

  // 4. 抓取周邊商品 (Merch)
  // 嚴格還原舊版寫法：只抓 item_id
  const { data: merch, error: err4 } = await supabase
    .from('merchandise')
    .select('item_id, image_url')

  if (err4) console.error('Sitemap 抓取 merchandise 失敗:', err4)
  if (merch) {
    merch.forEach((m) => {
      const images = toImages(m.image_url)
      urls.push({
        loc: `/merch/${m.item_id}`,
        changefreq: 'weekly',
        priority: 0.7,
        ...(images ? { images } : {})
      })
    })
  }

  // 5. 抓取進行中的競標 (Auctions)
  const { data: auctions, error: err5 } = await supabase
    .from('auctions')
    .select('id, end_time, images')

  if (err5) console.error('Sitemap 抓取 auctions 失敗:', err5)
  if (auctions) {
    const now = new Date().getTime()
    auctions.forEach((a) => {
      const isEnded = new Date(a.end_time).getTime() < now
      const first = Array.isArray(a.images) ? a.images[0] : null
      const images = toImages(first)
      urls.push({
        loc: `/auction/${a.id}`,
        changefreq: isEnded ? 'monthly' : 'hourly',
        priority: isEnded ? 0.4 : 0.8,
        ...(images ? { images } : {})
      })
    })
  }

  return urls
})
