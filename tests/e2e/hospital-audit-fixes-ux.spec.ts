import { test, expect } from '@playwright/test'
test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => {
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.route('**/rest/v1/hospitals*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'PHONE-TEST',
          name: '分機測試院所',
          address: '台北市大同區測試地址',
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
  await page.setViewportSize({ width: 768, height: 950 })
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page).toHaveURL(/hospital/)
  await expect(page.locator('.hosp-card')).toHaveCount(1)
})
test('分機獨立顯示，只撥主號', async ({ page }) => {
  await page.locator('.hosp-header-toggle').click()
  await expect(page.locator('.hosp-phone')).toHaveText('04-2332-3456')
  await expect(page.locator('.hosp-phone-extension')).toHaveText('分機 6371')
  await expect(page.locator('.hosp-call-btn')).toHaveAttribute('href', 'tel:0423323456')
})
test('窄桌面資訊在地圖下方，標記可點選，Esc 焦點正常', async ({ page }) => {
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  await page.locator('.hosp-header-toggle').click()
  await page.locator('.hosp-map-focus').click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeGreaterThan(190)
  await expect(stage).toHaveAttribute('data-map-idle', 'true')
  const bounds = (await stage.boundingBox())!,
    detail = (await page.locator('.map-hospital-detail').boundingBox())!
  expect(detail.y).toBeGreaterThanOrEqual(bounds.y + bounds.height)
  expect(
    await page.locator('.map-cluster.chosen').evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return (
        document
          .elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
          ?.closest('.map-cluster') === element
      )
    })
  ).toBe(true)
  await page.getByRole('button', { name: '關閉院所資訊', exact: true }).focus()
  await page.keyboard.press('Escape')
  await expect(page.locator('.map-hospital-detail')).toHaveCount(0)
  await expect(stage.locator('canvas')).toBeFocused()
})
test('零結果保留地圖但移除院所與縣市數字，清除篩選可恢復', async ({ page }) => {
  await page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true }).fill('不存在院所')
  await expect(page.locator('.map-stage')).toHaveCount(1)
  await expect(page.locator('.map-pin')).toHaveCount(0)
  const empty = page.locator('.hosp-map-empty-state')
  await expect(empty).toContainText('沒有符合條件')
  expect((await empty.boundingBox())!.height).toBeLessThan(120)
  await empty.getByRole('button', { name: '清除篩選', exact: true }).click()
  await expect(
    page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
  ).toBeFocused()
  await expect(page.locator('.hosp-card')).toHaveCount(1)
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
})
