import { test, expect } from '@playwright/test'
const animal = {
  id: 'UX-P',
  species: '豹紋守宮',
  morph: '川白黑夜het日蝕長品系測試',
  genes: ['土匪'],
  gender_type: '公',
  birthday: '2026-01-01',
  listing_price: 8000,
  status: 'ForSale',
  image_url: ''
}
async function fixtures(page: any, options: any = {}) {
  await page.route('**/rest/v1/animals**', (r) =>
    r.fulfill({
      status: options.fail ? 400 : 200,
      json: options.fail
        ? { message: '測試失敗' }
        : r.request().url().includes('id=eq.')
          ? { ...animal, ...options.animal }
          : [animal, { ...animal, id: 'UX-Q', status: 'Reserved', genes: ['土匪', '橘化'] }]
    })
  )
  await page.route('**/rest/v1/site_settings**', (r) =>
    r.fulfill({ json: { exhibition_enabled: !!options.exhibition, exhibition_note: '展場請詢價' } })
  )
  await page.route('**/rest/v1/auctions**', (r) => r.fulfill({ json: options.auctions || [] }))
}
async function openProduct(page: any) {
  await page.goto('/shop')
  await page.locator('.flip-card a[href="/product/UX-P"]').first().click()
  await page.locator('.prod-title').waitFor()
}
test('手機個體加入比較、分享失敗、缺圖及原生圖卡返回隔離', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    }),
    page = await context.newPage()
  await fixtures(page)
  await openProduct(page)
  await expect(page.locator('.product-photo-fallback')).toContainText('尚無照片')
  await page.getByRole('button', { name: '加入比較', exact: true }).tap()
  await expect(page.getByRole('button', { name: '移出比較', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(Error('測試')) }
    })
  })
  await page.locator('.btn-share').tap()
  await expect(page.getByLabel('手動複製個體連結')).toBeVisible()
  await page.locator('.btn-promo').focus()
  await page.evaluate(() => {
    let c = (document.querySelector('.btn-promo') as any).__vueParentComponent
    while (c && !c.setupState.promoModal) c = c.parent
    c.setupState.generatedImage =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
    c.setupState.promoModal.open()
  })
  await expect(page.locator('dialog.promo-modal-overlay')).toBeVisible()
  await page.evaluate(() => (document.querySelector('.btn-share') as HTMLElement).focus())
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
  await page.goBack()
  await expect(page.locator('dialog.promo-modal-overlay')).not.toBeVisible()
  await expect(page).toHaveURL(/product\/UX-P$/)
  await context.close()
})
test('比較失效ID、單隻中性基因、中文狀態、展場與分享替代', async ({ page }) => {
  await fixtures(page, { exhibition: true })
  await page.goto('/compare?ids=UX-P,MISSING')
  await expect(page.locator('.missing-items')).toContainText('MISSING')
  await expect(page.locator('.gene-tag.shared,.gene-tag.unique')).toHaveCount(0)
  await expect(page.locator('.price-cell')).toContainText('展場請詢價')
  await page.getByRole('button', { name: '移除失效個體 MISSING' }).click()
  await expect(page).toHaveURL(/ids=UX-P$/)
  await page.goto('/compare?ids=UX-P,UX-Q')
  await expect(page.locator('.status-badge').last()).toContainText('已預訂')
  await expect(page.locator('.gene-tag').first()).toContainText('2/2 隻')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(Error('測試')) }
    })
  )
  await page.getByRole('button', { name: '複製比較連結' }).click()
  await expect(page.getByLabel('手動複製比較連結')).toHaveValue(/UX-P%2CUX-Q/)
})
test('資料失敗可重試且不冒充未選擇或不存在', async ({ page }) => {
  await fixtures(page, { fail: true })
  await page.goto('/compare?ids=UX-P')
  await expect(page.getByRole('alert')).toContainText('資料載入失敗')
  await expect(page.locator('.empty-compare')).toHaveCount(0)
  await page.unroute('**/rest/v1/animals**')
  await fixtures(page)
  await page.getByRole('button', { name: '重試資料' }).click()
  await expect(page.locator('.item-heading')).toHaveCount(1)
  await page.unroute('**/rest/v1/animals**')
  await fixtures(page, { fail: true })
  await page.locator('.item-link').click()
  await expect(page.locator('.product-read-error')).toBeVisible()
  await expect(page.getByText('找不到此守宮', { exact: true })).toHaveCount(0)
})
test('同品系但不同ID不誤連競標', async ({ page }) => {
  await fixtures(page, {
    animal: { status: 'Auction' },
    auctions: [
      {
        id: 'OTHER',
        animal_id: 'OTHER-ANIMAL',
        morph: animal.morph,
        status: 'active',
        end_time: '2030-01-01'
      }
    ]
  })
  await openProduct(page)
  await expect(page.locator('a[href="/auction/OTHER"]')).toHaveCount(0)
})
