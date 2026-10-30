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
  await page.route('**/rest/v1/animals*', (route: any) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(inventory)
    })
  )
  await page.goto('/shop')
  await expect
    .poll(() => page.locator('.flip-card').count(), { timeout: 30000 })
    .toBeGreaterThanOrEqual(Math.min(20, count))
}
test.use({ serviceWorkers: 'block' })

test('桌面六欄、翻卡完整資訊與收藏操作', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 })
  await seed(page)
  const grid = page.locator('.grid.photo-grid').last()
  expect(
    await grid.evaluate(
      (element) => getComputedStyle(element).gridTemplateColumns.split(' ').length
    )
  ).toBe(6)
  const card = page.locator('.flip-card').first()
  await expect(card.locator('.flip-front .card-id')).toBeHidden()
  await expect(card.locator('.flip-front .card-genes')).toBeHidden()
  await expect(card.locator('.desktop-front-price')).toContainText('8000')
  await card.hover()
  await expect
    .poll(() =>
      card.locator('.flip-inner').evaluate((element) => getComputedStyle(element).transform)
    )
    .toMatch(/matrix3d\(-1/)
  await expect(card.locator('.flip-back-information')).toContainText('2026-03-14')
  await expect(card.locator('.flip-back-information')).toContainText('不保證性別')
  await expect(card.locator('.flip-back-information')).toContainText('母溫')
  await expect(card.locator('.flip-back-information')).toContainText(
    '土匪 · 橘化 · 日蝕 · 川普白化 · 黑夜'
  )
  await expect(card.locator('.flip-back-information')).toContainText('完整備註第二行')
  const contained = await card.evaluate((element) => {
    const information = element.querySelector('.flip-back-information')!
    return (
      information.getBoundingClientRect().bottom <= element.getBoundingClientRect().bottom &&
      information.scrollHeight <= information.clientHeight
    )
  })
  expect(contained).toBe(true)
  await card.getByRole('button', { name: '收藏', exact: true }).click()
  await expect(card.getByRole('button', { name: '已收藏', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await card.locator('.flip-card-link').focus()
  await expect(card.locator('.flip-card-link')).toBeFocused()
})

test('手機三欄不顯示基本資訊下拉，收藏與比較可操作', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await seed(page)
  const card = page.locator('.flip-card').first()
  expect(
    await page
      .locator('.grid.photo-grid')
      .last()
      .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
  ).toBe(3)
  await expect(card.locator('.flip-back')).toBeHidden()
  await expect(card.locator('details, summary')).toHaveCount(0)
  await expect(card.locator('.mobile-card-meta span')).toHaveText(['2026-03-14', '27.5度'])
  await expect(card.locator('.card-genes')).toHaveCount(0)
  await expect(card.locator('.flip-card-link')).toHaveAttribute('href', '/product/FLIP-1')
  await card.getByRole('button', { name: '收藏', exact: true }).click()
  await expect(card.getByRole('button', { name: '已收藏', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await card.getByRole('button', { name: '加入比較', exact: true }).click()
  await expect(card.getByRole('button', { name: '移出比較', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect(
    await card.locator('.flip-inner').evaluate((element) => getComputedStyle(element).transform)
  ).toBe('none')
})

test('未確認性別可獨立排除，網址重載與重置保持一致', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await seed(page)
  await page.getByRole('button', { name: /展開篩選/ }).click()
  const filters = page.locator('#desktop-shop-filters')
  await expect(filters.getByLabel('已確認公', { exact: true })).toBeChecked()
  await filters.getByLabel('孵化溫度／未確認', { exact: true }).uncheck()
  await expect(page.locator('.flip-card')).toHaveCount(0)
  await expect(page).toHaveURL(/sexU=false/)
  await page.reload()
  // 重新整理後先等水合完成，避免對尚未掛上事件的 SSR 按鈕送出點擊。
  await page.waitForFunction(() => !!(document.querySelector('#__nuxt') as any)?.__vue_app__)
  await page.getByRole('button', { name: /展開篩選/ }).click()
  await expect(page.locator('.flip-card')).toHaveCount(0)
  await expect(
    page.locator('#desktop-shop-filters').getByLabel('孵化溫度／未確認', { exact: true })
  ).not.toBeChecked()
  await page.getByRole('button', { name: '重置全部篩選', exact: true }).click()
  await expect(page.locator('.flip-card')).toHaveCount(12)
  await expect(page).not.toHaveURL(/sexU=/)
})

for (const width of [320, 360, 390, 430]) {
  test(`${width}px 商品可讀與44px觸控區不擠壓價格`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await seed(page)
    const card = page.locator('.flip-card').first()
    const cardBounds = await card.boundingBox()
    for (const name of ['收藏', '加入比較']) {
      const bounds = await card.getByRole('button', { name, exact: true }).boundingBox()
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
      expect(bounds!.height).toBeGreaterThanOrEqual(44)
      expect(bounds!.x).toBeGreaterThanOrEqual(cardBounds!.x - 1)
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(cardBounds!.x + cardBounds!.width + 1)
    }
    await expect(card.locator('details, summary')).toHaveCount(0)
    const footer = await card.evaluate((element) => {
      const price = element.querySelector('.card-purchase-row > .slim-price-row')!
      const actions = element.querySelector('.flip-front-actions')!
      const cardBox = element.getBoundingClientRect()
      const actionBox = actions.getBoundingClientRect()
      return {
        fontSize: parseFloat(getComputedStyle(price.querySelector('.slim-price')!).fontSize),
        gap: actionBox.top - price.getBoundingClientRect().bottom,
        centerOffset: Math.abs(actionBox.x + actionBox.width / 2 - cardBox.x - cardBox.width / 2)
      }
    })
    expect(footer.fontSize).toBe(13)
    expect(footer.gap).toBeLessThanOrEqual(1)
    expect(footer.centerOffset).toBeLessThanOrEqual(1)
    const cards = page.locator('.flip-card')
    const firstRow = await cards.evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => ({
        height: element.getBoundingClientRect().height,
        titleHeight: element.querySelector('.slim-title')!.getBoundingClientRect().height,
        metaFits:
          element.querySelector('.mobile-card-meta')!.scrollWidth <=
          element.querySelector('.mobile-card-meta')!.clientWidth
      }))
    )
    expect(
      Math.max(...firstRow.map((card) => card.height)) -
        Math.min(...firstRow.map((card) => card.height))
    ).toBeLessThanOrEqual(1)
    expect(new Set(firstRow.map((card) => card.titleHeight)).size).toBe(1)
    expect(firstRow.every((card) => card.metaFits)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: `output/fullsite-shop-fixed-${width}.png` })
  })
}

test('桌機在清單尾端進入視窗前預載下一批，並可連續載入到全部', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await seed(page, 80)
  const cards = page.locator('.flip-card')
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
  await expect(page.locator('.flip-card')).toHaveCount(20)
  await page.locator('.load-more').click()
  await expect(page.locator('.flip-card')).toHaveCount(40)
  await page.locator('.load-more').click()
  await expect(page.locator('.flip-card')).toHaveCount(60)
  await expect(page.locator('.load-more')).toHaveCount(0)
})
