import { serverSupabaseClient } from '#supabase/server'
import { getCleanUrl } from '~/utils/image'
import { PUBLIC_SITEMAP_ROUTES } from '~/utils/site-seo'
import { readSitemapRows } from '~/utils/sitemap-data'
import { auctionState, readAuctionCatalog } from '~/utils/auction-presentation'
import { seoDate } from '~/utils/seo-head'

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

  urls.push(...PUBLIC_SITEMAP_ROUTES)

  // 1. 抓取商品與電子身分證 (Inventory)
  // 嚴格還原舊版寫法：只抓 id 與 status，把過濾邏輯放回 JS 處理
  const { data: products, error: err1 } = await readSitemapRows((from, to) =>
    supabase.from('animals').select('id, status, image_url').order('id').range(from, to)
  )

  if (err1) console.error('Sitemap 抓取 animals 失敗:', err1)
  if (products) {
    products.forEach((p) => {
      // 過濾垃圾桶與自留品
      if (p.status !== 'Trash' && p.status !== 'SelfKeep') {
        const images = toImages(p.image_url)
        urls.push({
          loc: `/product/${encodeURIComponent(p.id)}`,
          changefreq: 'weekly',
          priority: p.status === 'ForSale' ? 0.8 : 0.4,
          ...(images ? { images } : {})
        })
        // 個體證書詳情維持 noindex，只納入公開的證書查詢入口。
      }
    })
  }

  // 2. 抓取文章 (Articles)
  const { data: articles, error: err2 } = await readSitemapRows((from, to) =>
    supabase
      .from('articles')
      .select('id, publish_date, status, image_url')
      .ilike('status', 'published')
      .order('id')
      .range(from, to)
  )

  if (err2) console.error('Sitemap 抓取 articles 失敗:', err2)
  if (articles) {
    articles.forEach((a) => {
      const images = toImages(a.image_url)
      urls.push({
        loc: `/articles/${encodeURIComponent(a.id)}`,
        changefreq: 'monthly',
        priority: 0.7,
        lastmod: seoDate(a.publish_date),
        ...(images ? { images } : {})
      })
    })
  }

  // 3. 抓取基因圖鑑 (Genes)
  // 嚴格還原舊版寫法：只抓 name
  const { data: genes, error: err3 } = await readSitemapRows((from, to) =>
    supabase.from('genetic_pages').select('name, image_url').order('name').range(from, to)
  )

  if (err3) console.error('Sitemap 抓取 genetic_pages 失敗:', err3)
  if (genes) {
    genes.forEach((g) => {
      const images = toImages(g.image_url)
      urls.push({
        loc: `/genes/${encodeURIComponent(g.name)}`,
        changefreq: 'monthly',
        priority: 0.7,
        ...(images ? { images } : {})
      })
    })
  }

  // 4. 抓取進行中的競標 (Auctions)
  // 公開清單保留 48 小時，但網站地圖只收錄詳情頁允許索引的競標中場次。
  let auctions = []
  try {
    auctions = await readAuctionCatalog(
      supabase,
      Date.now(),
      'id, status, start_time, end_time, images'
    )
  } catch (error) {
    console.error('Sitemap 抓取 auctions 失敗:', error)
  }
  if (auctions) {
    const now = new Date().getTime()
    auctions.forEach((a) => {
      if (auctionState(a, now).status !== 'active') return
      const first = Array.isArray(a.images) ? a.images[0] : null
      const images = toImages(first)
      urls.push({
        loc: `/auction/${encodeURIComponent(a.id)}`,
        changefreq: 'hourly',
        priority: 0.8,
        ...(images ? { images } : {})
      })
    })
  }

  return urls
})
