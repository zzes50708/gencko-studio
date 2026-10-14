import { test, expect, type Page } from '@playwright/test'
test.use({ serviceWorkers: 'block' })
async function openHospital(page: Page) {
  await page.route('**/rest/v1/hospitals*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 12,
          name: 'ABC 動物醫院',
          address: '台北市大同區100號',
          city: '台北市',
          district: '大同區',
          phone: '02-12345678',
          latitude: 25.063,
          longitude: 121.513
        }
      ])
    })
  )
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.hosp-card')).toHaveCount(1)
}
test('收藏儲存格式錯誤不會使醫院頁崩潰', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gencko_hosp_wishlist', '{"invalid":true}'))
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openHospital(page)
  expect(errors).toEqual([])
  await expect(page.locator('.hosp-fav-btn')).toHaveAttribute('aria-pressed', 'false')
})
test('收藏讀取與刪除被拒絕仍可使用醫院頁', async ({ page }) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem,
      remove = Storage.prototype.removeItem
    Storage.prototype.getItem = function (key) {
      if (key === 'gencko_hosp_wishlist') throw new DOMException('讀取受限', 'SecurityError')
      return get.call(this, key)
    }
    Storage.prototype.removeItem = function (key) {
      if (key === 'gencko_hosp_wishlist') throw new DOMException('刪除受限', 'SecurityError')
      return remove.call(this, key)
    }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await openHospital(page)
  expect(errors).toEqual([])
  await expect(page.locator('.hosp-alert-box')).toContainText('暫時無法儲存收藏')
})
test('舊數字收藏 ID 可還原，重複 ID 不會重複計數', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gencko_hosp_wishlist', '[12,"12",null,{}]'))
  await openHospital(page)
  await expect(page.locator('.hosp-fav-btn')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.hosp-filter-actions label')).toContainText('只看收藏（1）')
  await page.getByRole('checkbox', { name: /只看收藏/ }).check()
  await expect(page.locator('.hosp-card')).toHaveCount(1)
})

test('只有數字 ID 的舊收藏仍能對應院所', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gencko_hosp_wishlist', '[12]'))
  await openHospital(page)
  await expect(page.locator('.hosp-fav-btn')).toHaveAttribute('aria-pressed', 'true')
})

test('新增收藏在整頁重新載入後仍保留', async ({ page }) => {
  await openHospital(page)
  await page.locator('.hosp-fav-btn').click()
  await expect(page.locator('.hosp-fav-btn')).toHaveAttribute('aria-pressed', 'true')
  await openHospital(page)
  await expect(page.locator('.hosp-fav-btn')).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('checkbox', { name: /只看收藏/ }).check()
  await expect(page.locator('.hosp-card')).toHaveCount(1)
})
test('全形關鍵字可搜尋半形院名與門牌', async ({ page }) => {
  await openHospital(page)
  await page
    .getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
    .fill('ＡＢＣ １００')
  await expect(page.locator('.hosp-card')).toHaveCount(1)
})
