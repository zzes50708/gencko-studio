import { test, expect } from '@playwright/test'

async function seed(page: any, count = 12) {
  const inventory = Array.from({ length: count }, (_, index) => ({
    id: `FLIP-${index + 1}`,
    species: '豹紋守宮',
    morph: index === 0 ? '黑夜' : `川普白化黑夜 het 日蝕 ${index + 1}`,
    status: 'ForSale',
    listing_price: 8000,
    gender_type: '溫控',
    gender_value: '27.5',
    birthday: '2026-03-14',
    photo_updated_at: '2026-10-10',
    created_at: '2026-10-10',
    genes: ['土匪', '橘化', '日蝕', '川普白化', '黑夜'],
    note: index === 0 ? '完整備註第一行\n完整備註第二行：不可截斷的個體資訊。' : '',
    image_url: ''
  }))
  await page.route('**/rest/v1/*animals*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(inventory)
    })
  )
  await page.goto('/shop/all')
  await expect
    .poll(() => page.locator('.catalog-card').count(), { timeout: 30000 })
    .toBeGreaterThanOrEqual(Math.min(20, count))
}
test.use({ serviceWorkers: 'block' })

for (const width of [390, 1440]) {
  test(width + 'px 正方照片、清楚品系價格及直接收藏比較', async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 })
    await seed(page)
    expect(
      await page
        .locator('.grid.photo-grid')
        .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    ).toBe(width < 768 ? 2 : 5)
    const card = page.locator('.catalog-card').first()
    const photo = card.locator('.catalog-card-photo')
    const box = await photo.boundingBox()
    expect(box!.width).toBeCloseTo(box!.height, 0)
    await expect(card.locator('.catalog-card-meta')).toContainText('FLIP-1')
    await expect(card.locator('.catalog-card-meta')).toContainText('27.5度')
    await expect(card.locator('.catalog-card-price')).toHaveText('NT$ 8,000')
    await card.getByRole('button', { name: '收藏', exact: true }).click()
    await expect(card.getByRole('button', { name: '取消收藏', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await card.getByRole('button', { name: '加入比較', exact: true }).click()
    await expect(card.getByRole('button', { name: '移出比較', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await photo.focus()
    await expect(photo).toBeFocused()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(
      await photo
        .locator('[role="img"]')
        .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration))
    ).toBeLessThan(0.001)
  })
}

test('未確認性別可獨立排除，網址重載與重置保持一致', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await seed(page)
  await page.getByRole('button', { name: /展開篩選/ }).click()
  const filters = page.locator('#desktop-shop-filters')
  await expect(filters.getByLabel('已確認公', { exact: true })).toBeChecked()
  await filters.getByLabel('孵化溫度／未確認', { exact: true }).uncheck()
  await expect(page.locator('.catalog-card')).toHaveCount(0)
  await expect(page).toHaveURL(/sexU=false/)
  await page.reload()
  // 重新整理後先等水合完成，避免對尚未掛上事件的 SSR 按鈕送出點擊。
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await page.getByRole('button', { name: /展開篩選/ }).click()
  await expect(page.locator('.catalog-card')).toHaveCount(0)
  await expect(
    page.locator('#desktop-shop-filters').getByLabel('孵化溫度／未確認', { exact: true })
  ).not.toBeChecked()
  await page.getByRole('button', { name: '重置全部篩選', exact: true }).click()
  await expect(page.locator('.catalog-card')).toHaveCount(12)
  await expect(page).not.toHaveURL(/sexU=/)
})

for (const width of [320, 360, 390, 430]) {
  test(`${width}px 商品可讀與44px觸控區不擠壓價格`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await seed(page)
    const card = page.locator('.catalog-card').first()
    const cardBounds = await card.boundingBox()
    for (const name of ['收藏', '加入比較']) {
      const bounds = await card.getByRole('button', { name, exact: true }).boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
      expect(bounds!.x).toBeGreaterThanOrEqual(cardBounds!.x - 1)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width + 1)
    }
    await expect(card.locator('details, summary')).toHaveCount(0)
    expect(
      await card
        .locator('.catalog-card-price')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    ).toBe(15)
    expect(
      await card
        .locator('.catalog-card-name h2')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    ).toBe(15)
    const firstRow = await page
      .locator('.catalog-card')
      .evaluateAll((elements) =>
        elements.slice(0, 2).map((el) => el.getBoundingClientRect().height)
      )
    expect(Math.max(...firstRow) - Math.min(...firstRow)).toBeLessThanOrEqual(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `output/fullsite-shop-fixed-${width}.png` })
  })
}

test('桌機在清單尾端進入視窗前預載下一批，並可連續載入到全部', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seed(page, 80)
  const cards = page.locator('.catalog-card')
  const before = await cards.count()
  expect(before).toBeLessThan(80)
  const button = page.locator('.load-more')
  const targetY = await button.evaluate(
    (element) => element.getBoundingClientRect().top + scrollY - innerHeight - 600
  )
  await page.evaluate((y) => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }), targetY)
  await expect.poll(() => cards.count()).toBeGreaterThan(before)
  expect(
    await page.evaluate(() => scrollY + innerHeight < document.documentElement.scrollHeight - 500)
  ).toBe(true)
  for (let batch = 0; batch < 4 && (await cards.count()) < 80; batch++) {
    const count = await cards.count()
    await page.locator('.shop-load-trigger').scrollIntoViewIfNeeded()
    await expect.poll(() => cards.count()).toBeGreaterThan(count)
  }
  await expect(cards).toHaveCount(80)
  await expect(button).toHaveCount(0)
  await expect(page.locator('.shop-load-trigger')).toHaveCount(0)
})

test('無自動觀察功能時仍能手動載入更多', async ({ page }) => {
  await page.addInitScript(() => Reflect.deleteProperty(window, 'IntersectionObserver'))
  await page.setViewportSize({ width: 1440, height: 900 })
  await seed(page, 60)
  await expect(page.locator('.catalog-card')).toHaveCount(20)
  await page.locator('.load-more').click()
  await expect(page.locator('.catalog-card')).toHaveCount(40)
  await page.locator('.load-more').click()
  await expect(page.locator('.catalog-card')).toHaveCount(60)
  await expect(page.locator('.load-more')).toHaveCount(0)
})
