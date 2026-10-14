import { test, expect } from '@playwright/test'
test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.route('**/rest/v1/hospitals*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'TEST',
          name: '測試院所',
          address: '台北市大同區',
          city: '台北市',
          district: '大同區',
          phone: '04-2332-3456#6371',
          latitude: 25.063,
          longitude: 121.513,
          status: 'active'
        }
      ])
    })
  )
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.hosp-card')).toHaveCount(1)
})
test('多關鍵字搜尋與結構化電話', async ({ page }) => {
  await page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true }).fill('臺北 大同')
  await expect(page.locator('.hosp-card')).toHaveCount(1)
  const data = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(data.join('')).toContain('+886423323456')
  expect(data.join('')).not.toContain('+8864233234566371')
})
test('收藏儲存失敗不會使頁面崩潰', async ({ page }) => {
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'gencko_hosp_wishlist') throw new DOMException('儲存受限', 'QuotaExceededError')
      original.call(this, key, value)
    }
  })
  await page.getByRole('button', { name: '收藏 測試院所', exact: true }).click()
  await expect(page.locator('.hosp-alert-box')).toContainText('暫時無法儲存收藏')
  await expect(page.locator('.hosp-card')).toHaveCount(1)
})
test('地圖不攔截瀏覽器快捷鍵', async ({ page }) => {
  const canvas = page.locator('.map-stage canvas')
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
  expect(
    await canvas.evaluate((el) =>
      ['+', '0', 'ArrowLeft'].map((key) => {
        const event = new KeyboardEvent('keydown', {
          key,
          ctrlKey: key !== 'ArrowLeft',
          altKey: key === 'ArrowLeft',
          cancelable: true,
          bubbles: true
        })
        el.dispatchEvent(event)
        return event.defaultPrevented
      })
    )
  ).toEqual([false, false, false])
})
test('手機篩選按鈕至少44px', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await expect(page.locator('.hosp-filter-actions button')).toHaveCount(2)
    for (const button of await page.locator('.hosp-filter-actions button').all()) {
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
})
