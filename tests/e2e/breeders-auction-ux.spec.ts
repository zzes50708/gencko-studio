import { test, expect } from '@playwright/test'

async function setup(page: any) {
  await page.waitForFunction(
    () => !!(document.querySelector('.sticky-nav, .bottom-nav') as any)?.__vueParentComponent
  )
  await page.evaluate(() => {
    let c = (document.querySelector('.sticky-nav, .bottom-nav') as any).__vueParentComponent
    while (c && !c.setupState.store) c = c.parent
    ;(window as any).uxStore = c.setupState.store
  })
}
const auction = {
  id: 'UX-NODE3',
  morph: '川白黑夜het日蝕測試長品系',
  gender: '公',
  status: 'active',
  start_price: 8000,
  buy_now_price: null,
  min_increment: 100,
  end_time: '2030-01-01T00:00:00Z',
  images: []
}
async function seedAuction(page: any) {
  await setup(page)
  await page.evaluate((a) => {
    ;(window as any).uxStore.auctionList = [a]
    ;(window as any).uxStore.currentUser = { type: 'google', email: 'test@example.invalid' }
  }, auction)
}
test('種群手機兩欄、搜尋編號、失敗重試且不新增放大', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 320, height: 740 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.route('**/ux-broken-photo**', (r) => r.abort())
  // 固定背景資料回應，避免初始載入稍後蓋掉本測試注入的種群。
  await page.route('**/rest/v1/animals**', (r) =>
    r.fulfill({
      json: Array.from({ length: 4 }, (_, i) => ({
        id: `B-${i}`,
        morph: '測試種群',
        species: '豹紋守宮',
        status: 'SelfKeep',
        genes: ['土匪'],
        image_url: i === 2 ? 'http://localhost/ux-broken-photo' : ''
      }))
    })
  )
  await page.goto('/breeders')
  await setup(page)
  await page.evaluate(() => {
    const store = (window as any).uxStore
    store.inv = Array.from({ length: 4 }, (_, i) => ({
      ID: `B-${i}`,
      Morph: '測試種群',
      Species: '豹紋守宮',
      Status: 'SelfKeep',
      Genes: ['土匪'],
      ImageURL: i === 2 ? 'http://localhost/ux-broken-photo' : ''
    }))
    store.inventoryLoaded = true
  })
  await expect(page.locator('.breeder-photo-card')).toHaveCount(4)
  expect(
    await page
      .locator('.photo-grid')
      .evaluate((e) => getComputedStyle(e).gridTemplateColumns.split(' ').length)
  ).toBe(2)
  await page.getByPlaceholder('搜尋品系、基因或編號').fill('B-2')
  await expect(page.locator('.breeder-photo-card')).toHaveCount(1)
  await expect(page.locator('.breeder-caption')).toContainText('B-2')
  await page.locator('.breeder-photo-card img').evaluate((e) => e.dispatchEvent(new Event('error')))
  await expect(page.getByRole('button', { name: '重試照片' })).toBeVisible()
  await page.getByRole('button', { name: '重試照片' }).tap()
  await expect(page.locator('.breeder-photo-card img')).toHaveCount(1)
  await expect(page.locator('.breeder-photo-card a')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await context.close()
})

test('競標錯誤不冒充空狀態；詳情同步延長與結標、缺價隱藏直購', async ({ page }) => {
  await page.route('**/rest/v1/auction_bids**', (r) =>
    r.fulfill({
      json: [
        { id: 1, auction_id: auction.id, amount: 9000, user_name: '測試', bid_time: '2026-01-01' }
      ]
    })
  )
  await page.route('**/rest/v1/auctions**', (r) =>
    r.fulfill({ json: r.request().url().includes('id=eq.') ? auction : [auction] })
  )
  await page.goto('/auction')
  await seedAuction(page)
  await expect(page.locator('.bid-summary')).toContainText('9,000')
  await page.evaluate(() => {
    const s = (window as any).uxStore
    s.auctionList = []
    s.auctionError = '測試載入失敗'
  })
  await expect(page.getByRole('alert')).toContainText('測試載入失敗')
  await expect(page.locator('.empty-state')).toHaveCount(0)
  await seedAuction(page)
  await page.locator('.auction-card').click()
  await expect(page.locator('.btn-bid')).toBeEnabled()
  await expect(page.locator('.btn-buy-now')).toHaveCount(0)
  await page.evaluate(() => {
    const s = (window as any).uxStore
    s.auctionList = [{ ...s.auctionList[0], end_time: '2031-01-01T00:00:00Z' }]
  })
  await expect
    .poll(() =>
      page.locator('.timer-box').evaluate((e) => {
        let c = (e as any).__vueParentComponent
        while (c && !c.setupState.currentAuction) c = c.parent
        return c.setupState.currentAuction.end_time
      })
    )
    .toBe('2031-01-01T00:00:00Z')
  await page.evaluate(() => {
    const s = (window as any).uxStore
    s.auctionList = [{ ...s.auctionList[0], status: 'ended' }]
  })
  await expect(page.locator('.btn-bid')).toHaveCount(0)
})

test('出價讀取失敗顯示重試；分享失敗提供手動連結；圖卡原生彈窗返回關閉', async ({ page }) => {
  await page.route('**/rest/v1/auction_bids**', (r) =>
    r.fulfill({ status: 400, json: { message: '測試離線' } })
  )
  await page.route('**/rest/v1/auctions**', (r) =>
    r.fulfill({ json: r.request().url().includes('id=eq.') ? auction : [auction] })
  )
  await page.goto('/auction')
  await seedAuction(page)
  await page.locator('.auction-card').click()
  await expect(page.locator('.bid-history [role=alert]')).toBeVisible()
  await expect(page.locator('.empty-history')).toHaveCount(0)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('拒絕')) }
    })
  })
  await page.locator('.btn-share').click()
  await expect(page.getByLabel('手動複製競標連結')).toBeVisible()
  await page.locator('.btn-promo').focus()
  await page.evaluate(() => {
    let c = (document.querySelector('.btn-promo') as any).__vueParentComponent
    while (c && !c.setupState.promoModal) c = c.parent
    c.setupState.generatedImage =
      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
    c.setupState.promoModal.open()
  })
  await expect(page.locator('dialog.promo-modal-overlay')).toBeVisible()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.evaluate(() => (document.querySelector('.btn-share') as HTMLElement).focus())
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
  await page.goBack()
  await expect(page.locator('dialog.promo-modal-overlay')).not.toBeVisible()
  await expect(page).toHaveURL(/auction\/UX-NODE3$/)
})
