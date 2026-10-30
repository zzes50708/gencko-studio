import { test, expect } from '@playwright/test'
test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.route('**/rest/v1/hospitals*', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        Array.from({ length: 12 }, (_, i) => ({
          id: `SEARCH-${i + 1}`,
          name: `測試院所${i + 1}`,
          address: `台北市大同區${i + 1}號`,
          city: '台北市',
          district: i === 11 ? '中正區' : '大同區',
          phone: '04-2332-3456#6371',
          latitude: 25.063 + i * 0.001,
          longitude: 121.513
        }))
      )
    })
  )
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.locator('.hosp-card')).toHaveCount(12)
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
})
test('在地圖搜尋自動定位，不移走搜尋焦點，直接電話及收藏', async ({ page }) => {
  const input = page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  await input.scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => scrollY)
  await input.fill('測試院所12')
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
  await expect
    .poll(async () => Number(await page.locator('.map-stage').getAttribute('data-map-zoom')))
    .toBeCloseTo(200, 1)
  await expect(input).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(scroll, 0)
  await expect(page.locator('.map-hospital-detail a[href="tel:0423323456"]')).toHaveText('撥打電話')
  await expect(page.locator('.map-contact-phone')).toContainText('分機 6371')
  await page.getByRole('button', { name: '收藏院所', exact: true }).click()
  await expect(page.getByRole('button', { name: '取消收藏', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})
test('零結果仍可在原處修改與清除搜尋', async ({ page }) => {
  const input = page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  await input.fill('不存在院所')
  await expect(page.locator('.hosp-map-empty-state')).toBeVisible()
  await expect(input).toBeFocused()
  await page
    .locator('.hosp-map-empty-state')
    .getByRole('button', { name: '清除篩選', exact: true })
    .click()
  await expect(input).toBeFocused()
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
  await expect(page.locator('.map-preview-list button')).toHaveCount(12)
})

test('站內返回醫院頁時還原搜尋並自動定位', async ({ page }) => {
  await page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true }).fill('測試院所12')
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
  await page
    .locator('a[href="/qs"]')
    .first()
    .evaluate((element) => (element as HTMLAnchorElement).click())
  await expect(page).toHaveURL(/\/qs$/)
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(
    page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  ).toHaveValue('測試院所12')
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
  await expect
    .poll(async () => Number(await page.locator('.map-stage').getAttribute('data-map-zoom')))
    .toBeCloseTo(200, 1)
})
test('結果清單可在地圖區捲動及選第12間，滾輪不影響地圖', async ({ page }) => {
  await page.locator('.map-stage').scrollIntoViewIfNeeded()
  const list = page.locator('.map-preview-list')
  await expect(list.locator('button')).toHaveCount(12)
  const rect = (await list.boundingBox())!
  const zoom = await page.locator('.map-stage').getAttribute('data-map-zoom')
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.wheel(200, 200)
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0)
  expect(await page.locator('.map-stage').getAttribute('data-map-zoom')).toBe(zoom)
  await list.getByRole('button', { name: /測試院所12/ }).click()
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
})

test('只看收藏自動定位並在站內返回後還原', async ({ page }) => {
  await page.locator('#hospital-SEARCH-12 .hosp-fav-btn').click()
  await page.getByRole('checkbox', { name: /只看收藏/ }).check()
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
  await page
    .locator('a[href="/qs"]')
    .first()
    .evaluate((element) => (element as HTMLAnchorElement).click())
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: /只看收藏/ })).toBeChecked()
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
})

test('行政區篩選自動聚焦剩餘院所', async ({ page }) => {
  await page.getByRole('combobox', { name: '區域與縣市', exact: true }).selectOption('台北市')
  await page.getByRole('combobox', { name: '行政區', exact: true }).selectOption('中正區')
  await expect(page.locator('.hosp-card')).toHaveCount(1)
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
})

test('只看收藏時取消其中一間，自動定位剩餘院所', async ({ page }) => {
  await page.locator('#hospital-SEARCH-1 .hosp-fav-btn').click()
  await page.locator('#hospital-SEARCH-12 .hosp-fav-btn').click()
  await page.getByRole('checkbox', { name: /只看收藏/ }).check()
  await expect(page.locator('.hosp-card')).toHaveCount(2)
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-idle', 'true')
  await page.locator('#hospital-SEARCH-1 .hosp-fav-btn').click()
  await expect(page.locator('.hosp-card')).toHaveCount(1)
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
})

test('搜尋後立即選院所，延遲取景不蓋掉使用者選擇', async ({ page }) => {
  await page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true }).fill('測試院所1')
  await page
    .locator('.map-preview-list')
    .getByRole('button', { name: /測試院所12/ })
    .click()
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
  await page.waitForTimeout(500)
  await expect(page.locator('.map-hospital-detail')).toContainText('測試院所12')
})
