import { test, expect } from '@playwright/test'

test('About 短手機各場景的文字、CTA 與資訊卡不互相遮擋', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()
  try {
    await page.goto('/about')
    await expect(page.locator('.stage--touch')).toBeVisible()
    await page.waitForFunction(
      () =>
        (document.querySelector('.stage') as any)?.__vueParentComponent?.setupState?.isMounted ===
        true
    )
    await page.addStyleTag({ content: '#nuxt-devtools-container { display:none!important }' })
    for (let scene = 1; scene <= 4; scene++) {
      await page.keyboard.press('ArrowDown')
      const content = page.locator('.carousel-item').nth(scene - 1)
      await expect(content).toHaveCSS('opacity', '1')
      const box = await content.locator('.carousel-item__content').boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(320)
      const link = content.getByRole('link')
      const clickable = await link.evaluate((el) => {
        const r = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
      })
      expect(clickable).toBe(true)
      if (scene === 3) {
        const cards = await page.locator('.holo-card--visible').evaluateAll((es) =>
          es.map((el) => {
            const r = el.getBoundingClientRect()
            return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
          })
        )
        const button = await link.boundingBox()
        for (const card of cards) {
          expect(card.left).toBeGreaterThanOrEqual(0)
          expect(card.right).toBeLessThanOrEqual(320)
          expect(card.top).toBeGreaterThan(button!.y + button!.height)
          expect(card.bottom).toBeLessThanOrEqual(510)
        }
      }
    }
  } finally {
    await context.close()
  }
})

test('文章圖片與標題緊接、欄寬一致，手機長標題不被單行截斷', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/articles')
  await expect(page.locator('.article-entry').first()).toBeVisible()
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 })
    const metrics = await page.locator('.article-entry').evaluateAll((entries) =>
      entries.map((el) => {
        const image = el.querySelector('.article-thumb-wrap')!.getBoundingClientRect()
        const body = el.querySelector('.article-body')!.getBoundingClientRect()
        const badge = el.querySelector('.article-category-badge')!.getBoundingClientRect()
        return {
          width: el.getBoundingClientRect().width,
          ratio: image.width / image.height,
          gap: body.top - image.bottom,
          badge: badge.height,
          whiteSpace: getComputedStyle(el.querySelector('h3')!).whiteSpace
        }
      })
    )
    expect(metrics.length).toBeGreaterThan(0)
    for (const metric of metrics) {
      expect(Math.abs(metric.width - metrics[0].width)).toBeLessThan(2)
      expect(metric.ratio).toBeCloseTo(1.6, 1)
      expect(Math.abs(metric.gap)).toBeLessThan(2)
      expect(metric.badge).toBeLessThan(44)
      expect(metric.whiteSpace).not.toBe('nowrap')
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(
      true
    )
  }
  await page.getByRole('searchbox', { name: '搜尋文章' }).fill('不存在的測試文章xyz')
  await expect(page.getByText('目前沒有符合條件的文章')).toBeVisible()
  await page.getByRole('button', { name: '清除篩選', exact: true }).click()
  await expect(page.locator('.article-entry').first()).toBeVisible()
})

test('會員已登入時可直接進頁，舊帳號慢回應不覆蓋新帳號', async ({ page }) => {
  test.setTimeout(60000)
  let calls = 0
  let releaseOld!: () => void
  const oldResponse = new Promise<void>((resolve) => {
    releaseOld = resolve
  })
  await page.route('**/rest/v1/rpc/get_my_auction_bids', async (route) => {
    const call = ++calls
    if (call === 2) await oldResponse
    await route.fulfill({ json: [{ auction_id: call === 2 ? 'old' : 'new', amount: 2000 }] })
  })
  await page.route('**/rest/v1/auctions?*', (route) =>
    route.fulfill({
      json: [{ id: 'new', morph: '新帳號測試個體', end_time: '2030-01-01', images: [] }]
    })
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/home')
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__))
  // 僅更動隔離瀏覽器的 UI 狀態，RPC 由測試攔截，不建立真實登入或出價。
  await page.evaluate(async () => {
    const globals = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    globals.$pinia._s.get('main').currentUser = {
      type: 'google',
      name: '測試帳號',
      email: 'test@example.invalid'
    }
    await globals.$router.push('/profile')
  })
  await page.getByRole('tab', { name: /競標/ }).click()
  await expect(page.locator('.bid-card')).toContainText('新帳號測試個體')
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = { type: 'google', name: '慢回應帳號' }
  })
  await expect.poll(() => calls).toBe(2)
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = { type: 'google', name: '新帳號' }
  })
  await expect(page.locator('.bid-card')).toContainText('新帳號測試個體')
  releaseOld()
  await page.waitForTimeout(300)
  await expect(page.locator('.bid-card')).toContainText('新帳號測試個體')
  expect(errors).toEqual([])
})

test('電子身分證列印排除網站外框，離頁不影響其他頁', async ({ page }) => {
  await page.goto('/identity/S-53518')
  await expect(page.locator('.id-card')).toBeVisible()
  await page.evaluate(() => {
    ;(window as any).__printed = false
    window.print = () => {
      ;(window as any).__printed = true
    }
  })
  await page.getByRole('button', { name: '儲存電子身分證為 PDF' }).click()
  expect(await page.evaluate(() => (window as any).__printed)).toBe(true)
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.site-footer')).toBeHidden()
  await expect(page.locator('.sticky-nav')).toBeHidden()
  await expect(page.locator('.id-card')).toBeVisible()
  await page.pdf({
    path: 'output/ui-responsive-20260911/identity-print.pdf',
    format: 'A4',
    printBackground: true
  })
  await page.emulateMedia({ media: 'screen' })
  await page.evaluate(async () => {
    await (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$router.push('/home')
  })
  await expect(page.locator('body')).not.toHaveClass(/identity-print-page/)
  await expect(page.locator('.site-footer')).toBeVisible()
})
