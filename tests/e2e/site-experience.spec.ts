import { test, expect } from '@playwright/test'

async function ready(page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__
    return app && !app.config.globalProperties.$nuxt.isHydrating
  })
}

test('手機文章建議詞具備完整觸控高度，選取後仍可篩選', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/articles', { waitUntil: 'domcontentloaded' })
  await ready(page)
  const tag = page.locator('.q-tag').first()
  await expect(tag).toBeVisible()
  expect((await tag.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  const query = (await tag.textContent())!.trim()
  await tag.tap()
  await expect(page.getByRole('searchbox', { name: '搜尋文章' })).toHaveValue(query)
  await context.close()
})

test('模型視角控制具備完整操作寬度', async ({ page }) => {
  await page.goto('/merch', { waitUntil: 'domcontentloaded' })
  await ready(page)
  const zoom = page.getByRole('button', { name: '縮小模型', exact: true })
  await expect(zoom).toBeVisible({ timeout: 30000 })
  expect((await zoom.boundingBox())!.width).toBeGreaterThanOrEqual(44)
})

test('手機選擇欄位維持可讀字級與操作高度', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  for (const route of ['/calculator', '/hospital', '/shop']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await ready(page)
    if (route === '/hospital') {
      const filterDetails = page.locator('.hosp-sidebar-filter-details')
      await expect(filterDetails).toBeAttached({ timeout: 20000 })
      if ((await filterDetails.getAttribute('open')) === null) {
        await filterDetails.locator('summary').click()
      }
    }
    const fields = page.locator('#main-content select:visible')
    await expect(fields.first()).toBeVisible({ timeout: 20000 })
    expect(await fields.count()).toBeGreaterThan(0)
    for (const field of await fields.all()) {
      expect(
        await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
      ).toBeGreaterThanOrEqual(16)
      expect((await field.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await context.close()
})

test('全站圖片預覽失敗可重試，恢復後可關閉', async ({ page }) => {
  let fail = true
  await page.route('**/site-experience-image.svg', (route) =>
    route.fulfill(
      fail
        ? { status: 503, body: '' }
        : {
            contentType: 'image/svg+xml',
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#d87a36"/></svg>'
          }
    )
  )
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await ready(page)
  await page.evaluate(() => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.openLightbox({ Morph: '圖片恢復驗證', ImageURL: '/site-experience-image.svg' })
  })
  const dialog = page.getByRole('dialog', { name: '圖片預覽' })
  await expect(dialog.getByText('照片暫時無法載入')).toBeVisible()
  fail = false
  await dialog.getByRole('button', { name: '重新載入圖片' }).click()
  await expect
    .poll(() => dialog.locator('.lightbox-img').evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0)
  await dialog.getByRole('button', { name: '關閉', exact: true }).click()
  await expect(dialog).not.toBeVisible()
})

test('熱門展示離開畫面暫停，返回畫面繼續', async ({ page }) => {
  await page.route('**/rest/v1/*animals*', (route) =>
    route.fulfill({
      json: [
        {
          id: 'VISIBILITY-01',
          morph: '可見性驗證',
          is_hot: true,
          image_url: '',
          status: 'ForSale',
          created_at: '2026-11-05'
        }
      ]
    })
  )
  await page.goto('/home', { waitUntil: 'domcontentloaded' })
  await ready(page)
  const track = page.locator('.app-marquee__track').first()
  await expect(track).toBeVisible()
  await page.locator('.app-marquee').first().scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await expect
    .poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState))
    .toBe('running')
  await page.locator('.home-trust').scrollIntoViewIfNeeded()
  await expect
    .poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState))
    .toBe('paused')
  await page.locator('.app-marquee').first().scrollIntoViewIfNeeded()
  await expect
    .poll(() => track.evaluate((el) => getComputedStyle(el).animationPlayState))
    .toBe('running')
})

test('減少動態時全站提示立即顯示，不保留位移轉場', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await ready(page)
  const duration = await page.evaluate(async () => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.showToast = true
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    return getComputedStyle(document.querySelector('.toast')!).transitionDuration
  })
  expect(duration.split(',').every((value) => parseFloat(value) <= 0.001)).toBe(true)
})

test('平板觸控模式的收藏與比較維持完整操作尺寸', async ({ browser, baseURL }) => {
  for (const width of [768, 1024]) {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 1000 },
      hasTouch: true
    })
    const page = await context.newPage()
    await page.route('**/rest/v1/*animals*', (route) =>
      route.fulfill({
        json: [
          {
            id: 'TOUCH-01',
            morph: '平板操作驗證',
            species: '豹紋守宮',
            image_url: '',
            status: 'ForSale',
            listing_price: 8000,
            genes: []
          }
        ]
      })
    )
    await page.goto('/shop', { waitUntil: 'domcontentloaded' })
    await ready(page)
    await expect(page.locator('.card-action-btn').first()).toBeVisible()
    for (const button of await page.locator('.card-action-btn').all()) {
      const box = (await button.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
    await context.close()
  }
})
