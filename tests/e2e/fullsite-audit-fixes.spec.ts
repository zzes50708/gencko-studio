import { test, expect } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('介紹圖片直接讀原圖，失敗仍保留替代資訊', async ({ page, browser, baseURL }) => {
  await page.goto('/guide')
  for (const image of await page.locator('main img').all()) {
    await image.scrollIntoViewIfNeeded()
    await expect
      .poll(() =>
        image.evaluate(
          (e) => (e as HTMLImageElement).complete && (e as HTMLImageElement).naturalWidth > 0
        )
      )
      .toBe(true)
    expect(await image.getAttribute('src')).not.toContain('_ipx')
  }
  await page.screenshot({ path: 'output/fullsite-guide-fixed.png', fullPage: true })
  const fallbackContext = await browser.newContext({ baseURL, serviceWorkers: 'block' })
  const fallbackPage = await fallbackContext.newPage()
  await fallbackPage.route('**/images/guide/**', (r) => r.abort())
  await fallbackPage.goto('/guide')
  await fallbackPage.locator('.species-portraits').scrollIntoViewIfNeeded()
  await expect(fallbackPage.locator('.guide-image-unavailable')).toHaveCount(3)
  await fallbackContext.close()
})

test('LINE登入不依賴CDN圖示，品牌與證書標題正確', async ({ page }) => {
  await page.goto('/profile')
  await expect(page.getByRole('button', { name: 'LINE 登入', exact: true })).toContainText('LINE')
  await expect(page.locator('.btn-quick.line img')).toHaveCount(0)
  await page.goto('/about')
  await expect(page.locator('meta[name="description"]')).not.toHaveAttribute('content', /捷客/)
  expect(await page.locator('script[type="application/ld+json"]').allTextContents()).not.toEqual(
    expect.arrayContaining([expect.stringContaining('捷客')])
  )
  await page.goto('/certificates')
  expect(((await page.title()).match(/Gencko Studio/g) || []).length).toBe(1)
})

test('真正不存在內容回傳404且不索引，正常內容仍回傳200', async ({ request }) => {
  test.setTimeout(90000)
  for (const route of [
    '/product/AUDIT-NOT-FOUND',
    '/articles/AUDIT-NOT-FOUND',
    '/genes/AUDIT-NOT-FOUND'
  ]) {
    const response = await request.get(route)
    expect(response.status()).toBe(404)
    expect(await response.text()).toMatch(/name="robots"[^>]*content="noindex, nofollow"/)
  }
  const valid = await request.get('/product/S-66196')
  expect(valid.status()).toBe(200)
})

test('基因來源連結安全且可直接開啟', async ({ page }) => {
  await page.goto('/genes/WY')
  const links = page.locator('.source-text a')
  await expect(links).toHaveCount(2)
  for (const link of await links.all()) {
    expect(await link.getAttribute('href')).toMatch(/^https:\/\//)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
})

test('手機評估頂部精簡，作答後進度與題目不被遮擋', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/qs')
  const toolbar = page.locator('.qs-quiz-toolbar')
  await expect(toolbar).toBeVisible()
  expect((await toolbar.boundingBox())!.height).toBeLessThanOrEqual(60)
  await expect(toolbar).not.toContainText('飼養前自我評估')
  await page.getByText('每天觀察是我享受的時光', { exact: true }).click()
  await expect(page.getByRole('progressbar', { name: '評估作答進度' })).toHaveAttribute(
    'aria-valuenow',
    '6'
  )
  const question = page.locator('.qs-card h2')
  await expect(question).toBeFocused()
  expect((await question.boundingBox())!.y).toBeGreaterThanOrEqual(
    (await toolbar.boundingBox())!.height
  )
  await page.screenshot({ path: 'output/fullsite-qs-fixed.png' })
})

test('配置器零層LED不假裝開啟，提示與尺寸順序一致', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'LED 未加裝', exact: true })).toBeDisabled()
  await expect(page.getByRole('switch', { name: 'LED 未加裝', exact: true })).toHaveAttribute(
    'aria-checked',
    'false'
  )
  await expect(page.getByText('選擇照明層數後，可設定 LED 色溫。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'LED照明層數', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'LED照明層數', exact: true })
    .getByRole('button', { name: '1 層', exact: true })
    .click()
  await expect(page.getByRole('switch', { name: 'LED 開啟', exact: true })).toBeEnabled()
  await expect(
    page.getByText('確認生成模型後，可點擊模型中的開關控制 LED。', { exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: '確認生成模型', exact: true }).click()
  await expect(page.locator('.mobile-dimensions')).toContainText(
    '盒體（長×寬×高）：34 × 24 × 10.1cm'
  )
  await expect(page.locator('.mobile-dimensions')).toContainText('櫃體（寬×高×深）：')
})

test('資料讀取失敗不冒充不存在，重試成功後恢復正常索引', async ({ page }) => {
  const animal = {
    id: 'UX-CONTENT-RETRY',
    species: '豹紋守宮',
    morph: '回歸測試',
    gender_type: '公',
    status: 'ForSale',
    listing_price: 1000,
    genes: []
  }
  let failed = true
  await page.route('**/rest/v1/animals**', (r) =>
    r.fulfill({
      status: r.request().url().includes('id=eq.') && failed ? 500 : 200,
      json: r.request().url().includes('id=eq.')
        ? failed
          ? { message: '暫時離線' }
          : animal
        : [animal]
    })
  )
  await page.goto('/shop')
  await page.locator('a[href="/product/UX-CONTENT-RETRY"]').first().click()
  await expect(page.getByRole('heading', { name: '個體資料載入失敗', exact: true })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
  await expect(page).toHaveTitle(/個體資料暫時無法載入/)
  failed = false
  await page.getByRole('button', { name: '重試資料', exact: true }).click()
  await expect(page.getByRole('heading', { name: '回歸測試', exact: true })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index, follow/)
})

for (const width of [320, 768, 1440]) {
  test(`全站主要頁面 ${width}px 不橫向溢出與無錯誤品牌`, async ({ browser, baseURL }) => {
    test.setTimeout(180000)
    const context = await browser.newContext({
      baseURL,
      serviceWorkers: 'block',
      viewport: { width, height: 900 },
      reducedMotion: 'reduce'
    })
    const page = await context.newPage()
    try {
      for (const path of [
        '/home',
        '/shop',
        '/breeders',
        '/auction',
        '/merch',
        '/start-here',
        '/guide',
        '/care',
        '/health',
        '/qs',
        '/faq',
        '/articles',
        '/genes',
        '/calculator',
        '/hospital',
        '/why-gencko',
        '/buying-guide',
        '/certificates',
        '/about',
        '/stories',
        '/profile',
        '/compare'
      ]) {
        await page.goto(path)
        await page.locator('main').first().waitFor({ state: 'attached' })
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          path
        ).toBe(true)
        const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
        expect(
          schemas.some((text) => text.includes('捷客')),
          path
        ).toBe(false)
      }
    } finally {
      await context.close()
    }
  })
}
