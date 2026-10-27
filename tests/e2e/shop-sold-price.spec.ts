import { test, expect } from '@playwright/test'

const animal = {
  id: 'SOLD-PREVIEW',
  species: '豹紋守宮',
  morph: '黑夜',
  status: 'Sold',
  listing_price: 8000,
  sold_price: 9999,
  genes: ['黑夜'],
  gender_type: '公',
  birthday: '2026-03-14',
  image_url: '/sold-preview-fixture.svg'
}
async function fixtures(page: any, exhibition = false, listingPrice: number | null = 8000) {
  const record = { ...animal, listing_price: listingPrice }
  await page.route('**/rest/v1/animals**', (route: any) =>
    route.fulfill({
      json: route.request().url().includes('id=eq.')
        ? record
        : [record, { ...animal, id: 'AVAILABLE-PREVIEW', morph: '橘化', status: 'ForSale' }]
    })
  )
  await page.route('**/rest/v1/site_settings**', (route: any) =>
    route.fulfill({
      json: { exhibition_enabled: exhibition, exhibition_note: '展場請詢價' }
    })
  )
  await page.route('**/sold-preview-fixture.svg', (route: any) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#d9d1bc"/></svg>'
    })
  )
  await page.goto('/shop?sold=true')
  await expect(page.locator('.flip-card')).toHaveCount(2)
}

for (const width of [320, 390, 1440]) {
  test(`${width}px 已售出保留售價、照片印章與詳頁售價`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await fixtures(page)
    const card = page
      .locator('.flip-card')
      .filter({ has: page.locator('a[href="/product/SOLD-PREVIEW"]') })
    const stamp = card.locator('.card-sold-stamp')
    await expect(stamp).toBeVisible()
    await expect(stamp).toHaveText('已售出')
    const price = card.locator(
      width < 768 ? '.card-purchase-row .slim-price' : '.desktop-front-price'
    )
    await expect(price).toContainText('8000')
    await expect(card).not.toContainText('9999')
    await expect(
      page
        .locator('.flip-card')
        .filter({ has: page.locator('a[href="/product/AVAILABLE-PREVIEW"]') })
        .locator('.card-sold-stamp')
    ).toHaveCount(0)
    const photoBounds = (await card.locator('.card-photo').boundingBox())!
    const stampBounds = (await stamp.boundingBox())!
    expect(stampBounds.x).toBeGreaterThanOrEqual(photoBounds.x)
    expect(stampBounds.y).toBeGreaterThanOrEqual(photoBounds.y)
    expect(stampBounds.x + stampBounds.width).toBeLessThanOrEqual(photoBounds.x + photoBounds.width)
    expect(stampBounds.y + stampBounds.height).toBeLessThanOrEqual(
      photoBounds.y + photoBounds.height
    )
    await card.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `output/shop-sold-price-${width}.png` })
    await card.locator('.flip-card-link').click()
    await expect(page.locator('.prod-title')).toHaveText('黑夜')
    await expect(page.locator('.prod-price-area')).toContainText('NT$ 8000')
    await expect(page.locator('.prod-price-area')).toContainText('已售出')
    await expect(page.locator('.prod-img-box .sold-stamp')).toBeVisible()
    await expect(page.getByRole('link', { name: '私訊購買（Line）', exact: true })).toHaveCount(0)
  })
}

test('展場模式下已售出個體仍保留原標示售價', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await fixtures(page, true)
  const available = page
    .locator('.flip-card')
    .filter({ has: page.locator('a[href="/product/AVAILABLE-PREVIEW"]') })
  await expect(available.locator('.exhibition-note')).toHaveText('展場請詢價')
  const sold = page
    .locator('.flip-card')
    .filter({ has: page.locator('a[href="/product/SOLD-PREVIEW"]') })
  await expect(sold.locator('.card-purchase-row .slim-price')).toHaveText('$8000')
  await expect(sold.locator('.card-sold-stamp')).toBeVisible()
})

test('售價缺值時明示未登錄，不顯示空金額或改用內部成交紀錄', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await fixtures(page, false, null)
  const card = page
    .locator('.flip-card')
    .filter({ has: page.locator('a[href="/product/SOLD-PREVIEW"]') })
  await expect(card.locator('.card-purchase-row .slim-price')).toHaveText('售價未登錄')
  await card.locator('.flip-card-link').click()
  await expect(page.locator('.prod-price-area .price')).toHaveText('售價未登錄')
})
