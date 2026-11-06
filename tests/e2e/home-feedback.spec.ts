import { test, expect } from '@playwright/test'

async function ready(page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__
    return app && !app.config.globalProperties.$nuxt.isHydrating
  })
}

test('種群首屏不把尚未載入的資料當成空種群', async ({ page }) => {
  await page.route('**/rest/v1/*animals**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    await route.fulfill({
      json: [
        { id: 'BREED-READY', morph: '測試種群', species: '豹紋守宮', status: 'SelfKeep', genes: [] }
      ]
    })
  })
  const response = await page.goto('/breeders')
  expect(await response!.text()).not.toContain('此物種目前尚無公開種群。')
  await expect(page.locator('.breeder-photo-card')).toContainText('BREED-READY')
  await expect(page.getByText('此物種目前尚無公開種群。', { exact: true })).toHaveCount(0)
})

for (const width of [320, 390, 1440]) {
  test(`熱門控制 ${width}px：沒有舊句子與獨立留白列`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 })
    await page.route('**/rest/v1/*animals**', (route) =>
      route.fulfill({
        json: [
          {
            id: 'SHOWCASE-01',
            morph: '展示測試',
            is_hot: true,
            status: 'ForSale',
            species: '豹紋守宮',
            genes: []
          }
        ]
      })
    )
    await page.goto('/home')
    await ready(page)
    await expect(page.getByText('每一隻，都值得好好認識。', { exact: true })).toHaveCount(0)
    const pause = page.locator('.hot-picks-head').getByRole('button', { name: '暫停個體展示' })
    await expect(pause).toBeVisible()
    await pause.click()
    await expect(
      page.locator('.hot-picks-head').getByRole('button', { name: '繼續個體展示' })
    ).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}

for (const width of [390, 1440]) {
  test(`雙物種入口 ${width}px：hover 或觸控後可前往正確分類`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 950 },
      hasTouch: width < 768,
      isMobile: width < 768
    })
    const page = await context.newPage()
    await page.goto('/home')
    await ready(page)
    const region = page.getByRole('region', { name: '認識豹紋與肥尾守宮' })
    await expect(region.getByRole('heading', { name: '豹紋守宮', exact: true })).toBeVisible()
    await expect(region.getByRole('heading', { name: '肥尾守宮', exact: true })).toBeVisible()
    const fatTail = region.getByRole('link', { name: '查看肥尾守宮個體' })
    await expect(fatTail).toHaveAttribute('href', /sp=/)
    await region.scrollIntoViewIfNeeded()
    await expect
      .poll(() =>
        region.evaluate((el) =>
          Number(getComputedStyle(el.closest('.experience-reveal') || el).opacity)
        )
      )
      .toBe(1)
    if (width >= 768) {
      const card = region.locator('.species-route').last()
      await card.hover()
      await expect
        .poll(() => card.locator('img').evaluate((el) => getComputedStyle(el).transform))
        .not.toBe('none')
    }
    await region.screenshot({
      path: `output/home-feedback/species-${width}.png`,
      animations: 'disabled'
    })
    await fatTail.click()
    await expect(page).toHaveURL(/\/shop\?sp=/)
    await expect(page.getByRole('button', { name: '肥尾守宮', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await context.close()
  })
}
