import { serverSupabaseClient } from '#supabase/server'

// Nuxt 3 內建的 Nitro API 機制：回傳包含 `loc` 與 SEO 權重的陣列
// 這支 API 會被 `@nuxtjs/sitemap` 模組在每次存取 /sitemap.xml 時「動態呼叫」
export default defineEventHandler(async (event) => {
  // 在 Server API 端獲取 Supabase 客戶端實例
  const supabase = await serverSupabaseClient(event)
  const urls: { loc: string; changefreq?: string; priority?: number; lastmod?: string }[] =[]

  // 定義基礎靜態路由 (與您舊版 script 一致)
  const staticRoutes =[
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
    { loc: '/auction', changefreq: 'hourly', priority: 0.9 }, // 補上競標頁面
    { loc: '/qs', changefreq: 'monthly', priority: 0.5 }      // 補上問卷頁面
  ]
  urls.push(...staticRoutes)

  try {
    // 1. 抓取商品 (Inventory)
    // 這次因為是動態的，我們只需列出「ForSale」與「Reserved」的商品，已售出的降低權重或排除
    const { data: products } = await supabase
      .from('inventory')
      .select('id, updated_at, status')
      .neq('status', 'Trash')
      .neq('status', 'NotForSale')
    
    if (products) {
      products.forEach(p => {
        urls.push({
          loc: `/product/${p.id}`,
          changefreq: 'weekly',
          priority: p.status === 'ForSale' ? 0.8 : 0.4, // 已售出的商品降低 SEO 權重
          lastmod: p.updated_at
        })
        // 順便把電子身分證的網址也加進去
        urls.push({
          loc: `/identity/${p.id}`,
          changefreq: 'monthly',
          priority: 0.5,
          lastmod: p.updated_at
        })
      })
    }

    // 2. 抓取文章 (Articles)
    const { data: articles } = await supabase
      .from('articles')
      .select('id, publish_date, status')
      .eq('status', 'Published')

    if (articles) {
      articles.forEach(a => {
        urls.push({
          loc: `/articles/${a.id}`,
          changefreq: 'monthly',
          priority: 0.7,
          lastmod: a.publish_date
        })
      })
    }

    // 3. 抓取基因圖鑑 (Genes)
    const { data: genes } = await supabase
      .from('genetic_pages')
      .select('name, updated_at')

    if (genes) {
      genes.forEach(g => {
        urls.push({
          // 記得編碼，因為基因名稱包含中文
          loc: `/genes/${encodeURIComponent(g.name)}`,
          changefreq: 'monthly',
          priority: 0.7,
          lastmod: g.updated_at || undefined
        })
      })
    }

    // 4. 抓取周邊商品 (Merch)
    const { data: merch } = await supabase
        .from('merchandise')
        .select('item_id, updated_at')
    
    if (merch) {
        merch.forEach(m => {
            urls.push({
                loc: `/merch/${m.item_id}`,
                changefreq: 'weekly',
                priority: 0.7,
                lastmod: m.updated_at || undefined
            })
        })
    }

    // 5. 抓取進行中的競標 (Auctions)
    const { data: auctions } = await supabase
        .from('auctions')
        .select('id, end_time')
    
    if (auctions) {
        const now = new Date().getTime()
        auctions.forEach(a => {
            const isEnded = new Date(a.end_time).getTime() < now
            urls.push({
                loc: `/auction/${a.id}`,
                changefreq: isEnded ? 'monthly' : 'hourly', // 進行中則高頻爬取，結束則低頻
                priority: isEnded ? 0.4 : 0.8
            })
        })
    }

  } catch (error) {
    console.error('動態 Sitemap 抓取失敗:', error)
  }

  // Nuxt Sitemap 會自動將這個陣列組裝成合規的 XML
  return urls
})