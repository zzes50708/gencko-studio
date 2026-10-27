import { test, expect } from '@playwright/test'

const animal = {
  id: 'MOBILE-LAYOUT',
  species: '豹紋守宮',
  morph: '黑夜川普白化 het 日蝕長品系',
  genes: ['黑夜', '川普白化', '日蝕'],
  gender_type: '溫控',
  gender_value: '27.5',
  birthday: '2026-08-27',
  photo_updated_at: '2026-10-26',
  listing_price: 6680,
  status: 'ForSale',
  note:
    '種公母皆體質好的正常體型，反映在價格上。\n黑夜發色變化大，請向官方索取最新照片。' +
    'LongUnbrokenNote'.repeat(8),
  image_url: ''
}

for (const width of [320, 360, 390, 430, 1440]) {
  test(`${width}px 個體資訊不溢出、邊界一致與四欄推薦`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const inventory = [
      animal,
      ...Array.from({ length: 8 }, (_, index) => ({
        ...animal,
        id: `RELATED-${index}`,
        morph: index === 0 ? '黑夜' : animal.morph,
        listing_price: index === 0 ? 108000 : 6980
      }))
    ]
    await page.route('**/rest/v1/animals**', (route) =>
      route.fulfill({
        json: route.request().url().includes('id=eq.') ? animal : inventory
      })
    )
    await page.route('**/rest/v1/site_settings**', (route) => route.fulfill({ json: null }))
    await page.route('**/rest/v1/auctions**', (route) => route.fulfill({ json: [] }))
    await page.goto('/shop')
    await expect(page.locator('.flip-card')).toHaveCount(9, { timeout: 30000 })
    await page.locator('a[href="/product/MOBILE-LAYOUT"]').first().click()
    await expect(page.locator('.prod-title')).toContainText(animal.morph, { timeout: 30000 })
    await expect(page.locator('.related-card')).toHaveCount(8)
    const measurements = await page.evaluate(() => {
      const selectors = [
        '.product-root-container',
        '.prod-header',
        '.prod-note',
        '.spec-row',
        '.prod-img-box',
        '.prod-actions',
        '.related-grid'
      ]
      return {
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        boxes: Object.fromEntries(
          selectors.map((selector) => {
            const element = document.querySelector(selector)!
            const box = element.getBoundingClientRect()
            return [
              selector,
              {
                left: box.left,
                right: box.right,
                width: box.width,
                scrollWidth: element.scrollWidth
              }
            ]
          })
        )
      }
    })
    await page.screenshot({ path: `output/product-mobile-layout-${width}.png` })
    expect(measurements.scrollWidth, JSON.stringify(measurements)).toBeLessThanOrEqual(width)
    if (width < 768) {
      expect(measurements.boxes['.prod-header'].left).toBeCloseTo(
        measurements.boxes['.product-root-container'].left,
        0
      )
      for (const box of Object.values(measurements.boxes)) {
        expect(box.right).toBeLessThanOrEqual(
          measurements.boxes['.product-root-container'].right + 1
        )
        expect(box.scrollWidth).toBeLessThanOrEqual(Math.ceil(box.width))
      }
      const related = page.locator('.related-card')
      const heights = await related.evaluateAll((elements) =>
        elements.slice(0, 4).map((element) => element.getBoundingClientRect().height)
      )
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
      await expect(related.first().locator('.related-meta span')).toHaveText([
        '2026-08-27',
        '27.5度'
      ])
      for (const meta of await page.locator('.related-meta').all())
        expect(await meta.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true
        )
      await expect(page.locator('.sex-val')).toContainText('母溫')
      await expect(page.locator('.birth-val')).toContainText('2026-08-27')
    }
    expect(
      await page
        .locator('.related-grid')
        .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length)
    ).toBe(4)
    for (const price of await page.locator('.related-price').all()) {
      expect(await price.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true
      )
    }
    await expect(page.locator('.related-card').first()).toHaveAttribute(
      'href',
      /\/product\/RELATED-/
    )
  })
}
