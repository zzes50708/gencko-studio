import { test, expect } from '@playwright/test'
for (const width of [320, 390])
  test(`${width}px 比較移除按鈕可觸控且只移除指定個體`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true
    })
    const page = await context.newPage()
    const animals = ['UX-A', 'UX-B'].map((id, i) => ({
      id,
      species: '豹紋守宮',
      morph: i ? '另一隻守宮' : '較長品系名稱測試',
      gender_type: '公',
      status: 'ForSale',
      listing_price: 1000,
      image_url: '',
      genes: []
    }))
    await page.route('**/rest/v1/animals**', (r) => r.fulfill({ json: animals }))
    await page.goto('/compare?ids=UX-A,UX-B')
    await expect(page.locator('.item-heading')).toHaveCount(2)
    const remove = page.getByRole('button', { name: '移除 較長品系名稱測試 比較項目', exact: true })
    const box = await remove.boundingBox()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
    await page.screenshot({ path: `output/ux-node49-compare-${width}.png` })
    await remove.tap()
    await expect(page.locator('.item-heading')).toHaveCount(1)
    await expect(page.locator('.item-morph')).toHaveText('另一隻守宮')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await context.close()
  })
