import { test, expect } from '@playwright/test'
test.use({ baseURL: process.env.UX_BASE_URL || 'http://[::1]:3000', reducedMotion: 'reduce' })
const getStore = () =>
  (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
    'main'
  )
test('手機四分類完整顯示、訪客提示與跨頁保留', async ({ page }) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    await page.goto('/profile')
    await page.waitForTimeout(1200)
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    const tabs = page.locator('.seg-tab')
    await expect(tabs).toHaveCount(4)
    for (const tab of await tabs.all()) {
      const box = (await tab.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x + box.width).toBeLessThanOrEqual(width)
    }
    await tabs.last().click()
    await expect(page.getByText('使用 Google 登入查看競標紀錄', { exact: true })).toBeVisible()
  }
  await page.screenshot({ path: 'output/ux-node12-profile.png' })
})
test('收藏醫院使用現行名單，失敗可重試', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('gencko_hosp_wishlist', JSON.stringify(['99999']))
  )
  await page.goto('/why-gencko')
  await page.waitForTimeout(1200)
  let fail = true
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({
      status: fail ? 503 : 200,
      contentType: 'application/json',
      body: fail
        ? '{}'
        : JSON.stringify([
            {
              id: '99999',
              name: '測試新醫院',
              address: '測試路1號',
              city: '台北市',
              district: '中山區',
              phone: null
            }
          ])
    })
  )
  await page.evaluate(() =>
    (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$nuxt.$router.push('/profile')
  )
  await page
    .getByRole('button', { name: /醫院/ })
    .filter({ has: page.locator('span') })
    .click()
  await expect(page.getByRole('button', { name: '重新載入醫院', exact: true })).toBeVisible()
  fail = false
  await page.getByRole('button', { name: '重新載入醫院', exact: true }).click()
  await expect(page.locator('.hosp-name')).toHaveText('測試新醫院')
  await expect(page.locator('.hosp-call-btn')).toHaveCount(0)
  await page.getByRole('button', { name: '取消收藏 測試新醫院', exact: true }).click()
  await expect(page.locator('.hosp-name')).toHaveCount(0)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gencko_hosp_wishlist')!))
  ).toEqual([])
})
test('競標紀錄失敗不冒充空資料，重試與LINE狀態正確', async ({ page }) => {
  await page.goto('/profile')
  await page.waitForTimeout(1200)
  let fail = true
  await page.route('**/rest/v1/rpc/get_my_auction_bids', (r) =>
    r.fulfill({
      status: fail ? 503 : 200,
      contentType: 'application/json',
      body: fail ? '{}' : '[]'
    })
  )
  await page.evaluate(() => {
    const s = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    s.currentUser = { type: 'google', name: '隔離測試', email: 'test@example.com' }
  })
  await page.locator('.seg-tab').last().click()
  await expect(page.getByRole('button', { name: '重新載入競標紀錄', exact: true })).toBeVisible()
  await expect(page.getByText('您尚未參與任何競標活動。')).toBeHidden()
  fail = false
  await page.getByRole('button', { name: '重新載入競標紀錄', exact: true }).click()
  await expect(page.getByText('您尚未參與任何競標活動。')).toBeVisible()
  await page.evaluate(() => {
    const s = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    s.currentUser = { type: 'line', name: '隔離LINE測試' }
  })
  await expect(page.getByText('使用 Google 登入查看競標紀錄', { exact: true })).toBeVisible()
})

test('收藏卡取消不誤開詳情，圖片失敗仍可操作', async ({ page }) => {
  await page.route('**/*profile-broken*', (r) => r.abort())
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/profile')
  await page.waitForTimeout(1200)
  await page.evaluate(() => {
    const s = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    s.inv = [
      {
        ID: 'ux-test-only',
        Morph: '隔離測試長名稱',
        Status: 'ForSale',
        ListingPrice: 1000,
        ImageURL: 'https://example.com/profile-broken.jpg'
      }
    ]
    s.wishlist = ['ux-test-only']
  })
  await expect(page.locator('.photo-grid .article-image-fallback').first()).toBeVisible()
  await page.getByRole('button', { name: '取消收藏', exact: true }).first().click()
  await expect(page).toHaveURL(/profile$/)
  await expect(page.getByText('您的收藏清單空空如也，趕快去商城逛逛吧！')).toBeVisible()
})
