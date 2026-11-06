import { test, expect } from '@playwright/test'

async function openHome(page) {
  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__
    return app && !app.config.globalProperties.$nuxt.isHydrating
  })
}

async function seedShowcase(page, id: string, morph: string) {
  // 固定真正的讀取邊界，避免背景更新覆蓋測試個體。
  await page.route('**/rest/v1/*animals*', (route) =>
    route.fulfill({
      json: [
        { id, morph, image_url: '', is_hot: true, status: 'ForSale', created_at: '2026-11-05' }
      ]
    })
  )
}

test('品牌入口保留清楚識別，首頁入口可直接操作', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Gencko 科學選育工作室')).toBeVisible()
  const home = page.getByRole('link', { name: '前往首頁', exact: true })
  await expect(home).toBeVisible()
  await home.click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('熱門展示可暫停及繼續，暫停後個體連結仍能操作', async ({ page }) => {
  await seedShowcase(page, 'BRAND-01', '展示個體')
  await openHome(page)
  const pause = page.getByRole('button', { name: '暫停個體展示' })
  await pause.click()
  await expect(page.getByRole('button', { name: '繼續個體展示' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  for (const track of await page.locator('.home-product-marquee .app-marquee__track').all()) {
    expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe('paused')
  }
  await expect(
    page.locator('.app-marquee__group:not([aria-hidden])').first().getByRole('link').first()
  ).toHaveAttribute('href', '/product/BRAND-01')
  await page.getByRole('button', { name: '繼續個體展示' }).click()
  await pause.focus()
  await page.locator('.app-marquee').first().scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await expect
    .poll(() =>
      page
        .locator('.app-marquee__track')
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState)
    )
    .toBe('running')
})

test('手機工具預覽完整呈現，圖片失敗仍可前往真正的工具', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.route('**/previews/20260911-ui/*.webp', (route) => route.abort())
  await openHome(page)
  const tools = page.getByRole('region', { name: '選育與照護工具' })
  await tools.scrollIntoViewIfNeeded()
  await expect(tools.getByRole('link')).toHaveCount(3)
  for (const destination of ['/calculator', '/hospital', '/genes']) {
    const link = tools.locator(`a[href="${destination}"]`)
    await expect(link).toBeVisible()
    await expect(link.locator('.hover-action')).toBeVisible()
    await expect(link.locator('.tool-preview__fallback')).toBeVisible()
  }
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await tools.locator('a[href="/calculator"]').tap()
  await expect(page).toHaveURL(/\/calculator$/)
  await context.close()
})

test('減少動態時品牌與工具保持可讀，展示不自動移動', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedShowcase(page, 'REDUCED-01', '減少動態驗證')
  await openHome(page)
  await expect(page.locator('.app-marquee__track').first()).toBeVisible()
  expect(
    await page
      .locator('.app-marquee__track')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName)
  ).toBe('none')
  await expect(page.getByRole('region', { name: '認識豹紋與肥尾守宮' })).toBeVisible()
  const tools = page.getByRole('region', { name: '選育與照護工具' })
  await tools.scrollIntoViewIfNeeded()
  await expect(tools.getByRole('link')).toHaveCount(3)
  for (const link of await tools.getByRole('link').all()) {
    expect(await link.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    expect(await link.evaluate((el) => getComputedStyle(el).transform)).toBe('none')
  }
})

test('首頁各尺寸與日夜模式完整呈現，並保留檢視截圖', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openHome(page)
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.getByRole('region', { name: '選育與照護工具' }).scrollIntoViewIfNeeded()
    for (const image of await page.locator('.tool-preview__media img').all()) {
      await image.scrollIntoViewIfNeeded()
      await image.evaluate(async (el: HTMLImageElement) => {
        if (!el.complete)
          await new Promise((resolve) => {
            el.onload = resolve
            el.onerror = resolve
          })
      })
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => {
      ;(document.activeElement as HTMLElement)?.blur()
      window.scrollTo({ top: 0, behavior: 'auto' })
    })
    await expect(page.getByRole('heading', { level: 1 })).toBeInViewport()
    await page.screenshot({ path: `output/brand-experience/home-${width}.png`, fullPage: true })
    for (const hint of await page.locator('.scenario-hint').all()) {
      expect(await hint.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    }
  }
  // 切換既有主題按鈕，確認新增展示區一同配合日夜模式。
  await page.getByRole('switch', { name: '切換為暗色模式' }).click()
  await expect(page.getByRole('switch', { name: '切換為亮色模式' })).toBeVisible()
  await page.screenshot({ path: 'output/brand-experience/home-1440-dark.png', fullPage: true })
  await page
    .getByRole('region', { name: '選育與照護工具' })
    .screenshot({ path: 'output/brand-experience/tools-dark.png' })
  await page.getByRole('switch', { name: '切換為亮色模式' }).click()
  await page.locator('.brand-bridge').evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page
    .locator('.brand-bridge')
    .screenshot({ path: 'output/brand-experience/brand-bridge.png' })
  await page
    .locator('.tool-preview-grid')
    .screenshot({ path: 'output/brand-experience/tools-light.png' })
})
