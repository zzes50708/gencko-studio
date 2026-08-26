import { test, expect } from '@playwright/test'

// 全站關鍵路徑煙霧測試：每條都是「使用者真的會做的事」，不只是看 200
// 失敗代表某條 critical path 壞了；CI 該擋

test.describe('首頁 / 全站基礎結構', () => {
  test('首頁載入 + Skip to content 鏈接存在（WCAG）', async ({ page }) => {
    await page.goto('/home')
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

test.describe('Hero Lab / 流暢度回歸', () => {
  test.describe.configure({ mode: 'serial', timeout: 60_000 })

  test.beforeEach(async ({ page }) => {
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => pageErrors.push(error))
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(new Error(message.text()))
    })
    await page.goto('/')
    await expect(page.locator('.hero-lab')).toBeVisible()
    await page.waitForFunction(
      () =>
        typeof (window as unknown as { __hero?: { state?: unknown } }).__hero?.state === 'function',
      undefined,
      { timeout: 30_000 }
    )
    ;(page as unknown as { __heroPageErrors?: Error[] }).__heroPageErrors = pageErrors
  })

  test.afterEach(async ({ page }) => {
    expect((page as unknown as { __heroPageErrors?: Error[] }).__heroPageErrors ?? []).toEqual([])
  })

  test('起始狀態在頂部，進度可驅動場景且 dev 性能介面可用', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(2)
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().currentHeroScrollProgress))
      .toBeLessThan(0.01)

    await page.evaluate(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo(0, Math.max(1, maxScroll * 0.2))
    })
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().targetHeroScrollProgress))
      .toBeGreaterThan(0.01)
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().currentHeroScrollProgress))
      .toBeGreaterThan(0.001)

    const perf = await page.evaluate(() => {
      const api = (window as any).__heroPerf
      return typeof api?.snapshot === 'function' ? api.snapshot() : null
    })
    if (perf) {
      expect(perf.frameCount).toBeGreaterThan(0)
      expect(perf.p95FrameTimeMs).toBeGreaterThanOrEqual(0)
    }
  })

  test('卡片可開啟/關閉，離開 Hero 後頁面狀態恢復', async ({ page }) => {
    await page.evaluate(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo(0, Math.max(1, maxScroll * 0.55))
    })
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().heroCardsVisible))
      .toBe(true)
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().cardInteractionReady))
      .toBe(true)
    await page.waitForTimeout(500)

    for (
      let attempt = 0;
      attempt < 4 && (await page.locator('.gallery-scene').count()) === 0;
      attempt += 1
    ) {
      const cardPoint = await page.evaluate(() => {
        const cards = (window as any).__hero
          .cardQuads()
          ?.filter((item: any) => item.front > 0.2)
          .sort((a: any, b: any) => b.front - a.front)
        for (const quad of cards ?? []) {
          const x = quad.pts.reduce((sum: number, point: any) => sum + point.x, 0) / quad.pts.length
          const y = quad.pts.reduce((sum: number, point: any) => sum + point.y, 0) / quad.pts.length
          if ((window as any).__hero.hit(x, y) === quad.title) return { x, y }
        }
        return null
      })
      expect(cardPoint).not.toBeNull()
      await page.mouse.move(cardPoint!.x, cardPoint!.y)
      await page.mouse.click(cardPoint!.x, cardPoint!.y)
      await page.waitForTimeout(220)
    }
    await expect(page.locator('.gallery-scene')).toBeVisible()
    await page.locator('.gallery-close').click()
    await expect(page.locator('.gallery-scene')).toBeHidden()

    await expect(page.locator('.hero-lab-home-link')).toHaveAttribute('href', '/home')
    await page.goto('/home')
    await expect(page).toHaveURL(/\/home$/)
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('hero-lab-active')))
      .toBe(false)
    await expect(page.locator('.hero-lab')).toHaveCount(0)
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
