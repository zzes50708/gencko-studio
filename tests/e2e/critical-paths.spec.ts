import { test, expect } from '@playwright/test'

// 全站關鍵路徑煙霧測試：每條都是「使用者真的會做的事」，不只是看 200
// 失敗代表某條 critical path 壞了；CI 該擋

test.describe('首頁 / 全站基礎結構', () => {
  test('首頁載入 + Skip to content 鏈接存在（WCAG）', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.skip-to-content')).toBeAttached()
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('404 走自訂頁，含 noindex meta', async ({ page }) => {
    const res = await page.goto('/totally-does-not-exist')
    expect(res?.status()).toBe(404)
    await expect(page.locator('text=找不到這隻守宮')).toBeVisible()
    await expect(page.locator('meta[name="robots"][content*="noindex"]')).toHaveCount(1)
  })
})

test.describe('Shop 流程', () => {
  test('/shop 載入並渲染商品列表 or 空狀態', async ({ page }) => {
    await page.goto('/shop')
    await expect(page).toHaveTitle(/Gencko/)
    // 商品卡片 .photo-grid 內或空狀態二擇一
    const grid = page.locator('.photo-grid')
    await grid.waitFor({ state: 'visible' })
    const hasCards = await page.locator('.photo-grid .card, .photo-grid .flip-card').count()
    const hasEmpty = await page.locator('.shop-empty-state').count()
    expect(hasCards + hasEmpty).toBeGreaterThan(0)
  })
})

test.describe('Articles 流程', () => {
  test('/articles 列出文章 → 點第一篇 → 內文渲染', async ({ page }) => {
    await page.goto('/articles')
    const firstArticle = page.locator('.article-card').first()
    await expect(firstArticle).toBeVisible()
    await firstArticle.click()
    await expect(page).toHaveURL(/\/articles\/[A-Z0-9-]+/)
    // 文章內容容器
    await expect(page.locator('.reader-content')).toBeVisible()
    // 作者卡片
    await expect(page.locator('.author-card')).toBeVisible()
  })

  test('/articles RSS 自動發現連結存在', async ({ page }) => {
    await page.goto('/articles')
    const rss = page.locator('link[rel="alternate"][type="application/rss+xml"]')
    await expect(rss).toHaveCount(1)
    expect(await rss.getAttribute('href')).toContain('/feed.xml')
  })
})

test.describe('Auction 流程', () => {
  test('/auction 載入並有 grid 或空狀態', async ({ page }) => {
    await page.goto('/auction')
    // 等到 SkeletonCard 或實卡或空狀態出現
    await page.locator('.auction-container, .auction-grid, .empty-state').first().waitFor()
    // 不檢查內容（拍賣可能是空的）
    await expect(page).toHaveTitle(/Gencko/)
  })
})

test.describe('Feeds / SEO endpoints', () => {
  test('/sitemap.xml 為合法 sitemap', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('<urlset')
    expect(body).toContain('<loc>')
    expect(body).toContain('xmlns:image')
  })

  test('/feed.xml 為合法 RSS 2.0', async ({ request }) => {
    const res = await request.get('/feed.xml')
    expect(res.status()).toBe(200)
    const body = await res.text()
    expect(body).toContain('<rss version="2.0"')
    expect(body).toContain('<channel>')
    expect(body.match(/<item>/g)?.length || 0).toBeGreaterThan(0)
  })

  test('/ 帶 CSP header 與 nosniff', async ({ request }) => {
    const res = await request.get('/')
    expect(res.headers()['content-security-policy']).toBeTruthy()
    expect(res.headers()['x-content-type-options']).toBe('nosniff')
  })
})
