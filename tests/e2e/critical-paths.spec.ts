import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// 全站關鍵路徑煙霧測試：每條都是「使用者真的會做的事」，不只是看 200
// 失敗代表某條 critical path 壞了；CI 該擋
const waitForHydration = (page: Page) =>
  page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as HTMLElement & { __vue_app__?: unknown }
    return Boolean(root?.__vue_app__)
  })

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

  test('商業首頁 SEO 與桌機導覽 active state 一致', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://www.genckobreeding.com/home'
    )
    await expect(page.locator('.home-btn')).toHaveClass(/active/)
    await expect(page.locator('.home-btn')).toHaveAttribute('aria-current', 'page')

    await page.goto('/profile')
    await expect(page.locator('.member-btn')).toHaveClass(/active/)
    await expect(page.locator('.member-btn')).toHaveAttribute('aria-current', 'page')
  })
})

test.describe('Hero Lab / 流暢度回歸', () => {
  test.describe.configure({ mode: 'serial', timeout: 90_000 })

  test.beforeEach(async ({ page }) => {
    const pageErrors: Error[] = []
    page.on('pageerror', (error) => pageErrors.push(error))
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(new Error(message.text()))
    })
    await page.goto('/')
    await expect(page.locator('.hero-lab')).toBeVisible()
    if ((page.viewportSize()?.width ?? 1280) >= 768) {
      await page.waitForFunction(
        () =>
          typeof (window as unknown as { __hero?: { state?: unknown } }).__hero?.state ===
          'function',
        undefined,
        { timeout: 30_000 }
      )
    } else {
      await expect(page.locator('.hero-mobile-fallback')).toBeVisible()
    }
    ;(page as unknown as { __heroPageErrors?: Error[] }).__heroPageErrors = pageErrors
  })

  test.afterEach(async ({ page }) => {
    expect((page as unknown as { __heroPageErrors?: Error[] }).__heroPageErrors ?? []).toEqual([])
  })

  test('起始狀態在頂部，進度可驅動場景且 dev 性能介面可用', async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 1280) < 768,
      '手機使用靜態 fallback，不執行桌機 debug API 流程'
    )
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

  test('鍵盤可使用 Hero Lab 語意導覽與進度控制', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1280) < 768, '手機不 mount Hero Lab Canvas')
    const progress = page.locator('#hero-lab-progress')
    const accessibleNav = page.locator('.hero-accessible-nav')

    await expect(progress).toHaveCount(1)
    await progress.focus()
    await expect(progress).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().targetHeroScrollProgress))
      .toBeGreaterThan(0)

    const firstDestination = accessibleNav.locator('a').first()
    await firstDestination.focus()
    await expect(firstDestination).toBeFocused()
    await expect(accessibleNav).toBeVisible()
    await expect(accessibleNav.locator('a')).toHaveCount(9)
  })

  test('卡片可開啟/關閉，離開 Hero 後頁面狀態恢復', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1280) < 768, '手機不 mount Hero Lab Canvas')
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

    let expectedCardTitle = ''
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
          if ((window as any).__hero.hit(x, y) === quad.title) return { x, y, title: quad.title }
        }
        return null
      })
      expect(cardPoint).not.toBeNull()
      expectedCardTitle = cardPoint!.title
      if ((page.viewportSize()?.width ?? 1280) < 768) {
        await page.touchscreen.tap(cardPoint!.x, cardPoint!.y)
      } else {
        await page.mouse.move(cardPoint!.x, cardPoint!.y)
        await page.mouse.click(cardPoint!.x, cardPoint!.y)
      }
      await page.waitForTimeout(220)
    }
    await expect(page.locator('.gallery-scene')).toBeVisible()
    await expect(page.locator('#hero-gallery-title')).toHaveText(expectedCardTitle)
    await expect(page.locator('.gallery-close')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(page.locator('.gallery-scene')).toBeHidden()
    await expect(page.locator('.hero-accessible-nav')).toBeFocused()

    await expect(page.locator('.hero-lab-home-link')).toHaveAttribute('href', '/home')
    await page.goto('/home')
    await expect(page).toHaveURL(/\/home$/)
    await expect
      .poll(() => page.evaluate(() => document.body.classList.contains('hero-lab-active')))
      .toBe(false)
    await expect(page.locator('.hero-lab')).toHaveCount(0)
  })

  test('終章往回滑可恢復卡片', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1280) < 768, '手機不 mount Hero Lab Canvas')
    await page.evaluate(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo(0, Math.max(1, maxScroll))
    })
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().targetPlaceholderProgress))
      .toBeGreaterThan(0.95)
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().heroCardsVisible))
      .toBe(false)

    await page.evaluate(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      window.scrollTo(0, Math.max(1, maxScroll * 0.55))
    })
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().heroCardsVisible))
      .toBe(true)
    await expect
      .poll(() => page.evaluate(() => (window as any).__hero.state().heroCardVisibleHolders))
      .toBeGreaterThan(0)
  })

  test('手機顯示輕量 fallback，不建立 Canvas 或長距離 scroll-space', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 1280) >= 768, '僅驗證手機 fallback')
    await expect(page.locator('.hero-mobile-fallback')).toBeVisible()
    await expect(page.locator('.hero-canvas-shell')).toHaveCount(0)
    await expect(page.locator('.hero-lab-scroll-space')).toHaveCSS('height', '0px')
  })
})

test.describe('Shop 流程', () => {
  test('/shop 載入並渲染商品列表 or 空狀態', async ({ page }) => {
    await page.goto('/shop')
    await expect(page).toHaveTitle(/Gencko/)
    // 等待 app.vue 完成 Supabase hydration，再判斷商品或空狀態。
    await page
      .locator('.photo-grid .card, .photo-grid .flip-card, .shop-empty-state')
      .first()
      .waitFor({
        state: 'visible',
        timeout: 30_000
      })
    const hasCards = await page.locator('.photo-grid .card, .photo-grid .flip-card').count()
    const hasEmpty = await page.locator('.shop-empty-state').count()
    expect(hasCards + hasEmpty).toBeGreaterThan(0)
  })

  test('篩選側欄只在手機 Drawer 開啟時宣告 modal', async ({ page }) => {
    await page.goto('/shop')
    const filterPanel = page.locator('#shop-filter-panel')
    await expect(filterPanel).not.toHaveAttribute('aria-modal', 'true')

    await page.setViewportSize({ width: 390, height: 844 })
    await page.reload()
    const filterTrigger = page.getByRole('button', { name: '篩選', exact: true })
    await expect(filterTrigger).toBeVisible()
    await filterTrigger.click()
    await expect(filterTrigger).toHaveAttribute('aria-expanded', 'true')
    await expect(filterPanel).toHaveAttribute('role', 'dialog')
    await expect(filterPanel).toHaveAttribute('aria-modal', 'true')
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

test.describe('Profile 流程', () => {
  test('醫院收藏移除按鈕使用單一圖示與可辨識名稱', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('gencko_hosp_wishlist', JSON.stringify(['1']))
    })
    await page.goto('/profile')
    const hospitalsTab = page.getByRole('tab', { name: '醫院 1' })
    await expect(hospitalsTab).toBeVisible()
    await hospitalsTab.click()
    await expect(hospitalsTab).toHaveAttribute('aria-selected', 'true')

    const removeFavorite = page.getByRole('button', {
      name: '取消收藏 不萊梅特殊寵物專科醫院'
    })
    await expect(removeFavorite).toBeVisible()
    await expect(removeFavorite).toHaveText('❤')
  })
})

test.describe('Responsive 驗證矩陣', () => {
  const viewports = [
    { width: 320, height: 720 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 1000 },
    { width: 2560, height: 1440 }
  ]
  const routes = ['/home', '/shop', '/hospital', '/faq']

  for (const viewport of viewports) {
    test(`${viewport.width}px 核心頁無 404、runtime error 或橫向溢位`, async ({ page }) => {
      await page.setViewportSize(viewport)
      const runtimeErrors: string[] = []
      page.on('pageerror', (error) => runtimeErrors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') runtimeErrors.push(message.text())
      })

      for (const route of routes) {
        const response = await page.goto(route)
        expect(response?.status(), `${route} 應成功回應`).toBeLessThan(400)
        await expect(page.locator('#main-content')).toBeVisible()
        await expect
          .poll(() =>
            page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)
          )
          .toBe(true)
      }

      expect(runtimeErrors).toEqual([])
    })
  }

  test('390px coarse-touch 核心互動可操作且不依賴 hover', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2
    })
    const page = await context.newPage()
    const runtimeErrors: string[] = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text())
    })

    await page.goto('/home')
    const themeToggle = page.getByRole('switch')
    const initialTheme = await page.locator('html').getAttribute('class')
    await themeToggle.click()
    await expect.poll(() => page.locator('html').getAttribute('class')).not.toBe(initialTheme)

    await page.goto('/shop')
    await waitForHydration(page)
    await page
      .locator('.photo-grid .flip-card, .shop-empty-state')
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
    await page.locator('.chip-select').selectOption('price_asc')
    await expect(page).toHaveURL(/sort=price_asc/)
    const firstCompare = page.getByRole('button', { name: '加入比較' }).first()
    if (await firstCompare.isVisible()) {
      await firstCompare.click()
      await expect(page.locator('.compare-bar')).toBeVisible()
    }

    await page.goto('/hospital')
    await page.getByLabel('區域與縣市').selectOption('台北市')
    await expect(page.locator('.hosp-card').first()).toBeVisible()
    const hospitalToggle = page.locator('.hosp-header-toggle').first()
    await hospitalToggle.click()
    await expect(hospitalToggle).toHaveAttribute('aria-expanded', 'true')
    const favorite = page.locator('.hosp-fav-btn').first()
    const favoriteLabel = await favorite.getAttribute('aria-label')
    await favorite.click()
    await expect.poll(() => favorite.getAttribute('aria-label')).not.toBe(favoriteLabel)
    await expect(page.locator('.hosp-call-btn').first()).toHaveAttribute('href', /^tel:/)
    await expect(page.locator('.hosp-link').first()).toHaveAttribute('target', '_blank')

    await page.goto('/faq')
    const category = page.locator('.cat-tab').nth(1)
    await category.click()
    await expect(category).toHaveClass(/active/)
    const question = page.locator('.faq-q').first()
    await question.click()
    await expect(question).toHaveAttribute('aria-expanded', 'true')

    expect(runtimeErrors).toEqual([])
    await context.close()
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
