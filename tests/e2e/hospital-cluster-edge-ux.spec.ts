import { test, expect } from '@playwright/test'
test.use({ serviceWorkers: 'block' })
test('極近院所到達縮放上限後可選取，關閉選單交回焦點', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.route('https://tiles.openfreemap.org/**', (r) => r.abort())
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        [0, 1].map((i) => ({
          id: `NEAR-${i}`,
          name: `鄰近測試院所${i}`,
          city: '台北市',
          district: '大同區',
          address: '測試地址',
          phone: '02-12345678',
          latitude: 25.063 + i * 0.00002,
          longitude: 121.513,
          status: 'active'
        }))
      )
    })
  )
  await page.goto('/qs')
  await page.waitForLoadState('networkidle')
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  const group = page.getByRole('button', { name: '放大查看 2 間院所', exact: true })
  await group.click()
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeGreaterThan(1399)
  await group.click()
  await expect(page.locator('.map-shared-location')).toContainText('鄰近測試院所1')
  await page.getByRole('button', { name: '關閉院所選單', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(stage.locator('canvas')).toBeFocused()
  await group.click()
  await page.getByRole('button', { name: '鄰近測試院所1', exact: true }).click()
  await expect(page.locator('.map-hospital-detail')).toContainText('鄰近測試院所1')
})
test('待執行滾輪不覆蓋後來的縣市取景', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 950 })
  await page.route('https://tiles.openfreemap.org/**', (r) => r.abort())
  await page.goto('/hospital')
  const stage = page.locator('.map-stage'),
    region = page.getByRole('combobox', { name: '地圖範圍', exact: true })
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  await region.selectOption('台北市')
  await page.waitForTimeout(900)
  const expected = Number(await stage.getAttribute('data-map-zoom'))
  await region.selectOption('all')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-map-zoom')))
    .toBeLessThan(1.01)
  await region.evaluate((element: HTMLSelectElement) => {
    const stage = document.querySelector('.map-stage')!,
      bounds = stage.getBoundingClientRect()
    stage.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY: -400,
        clientX: bounds.x + bounds.width / 2,
        clientY: bounds.y + bounds.height / 2
      })
    )
    element.value = '台北市'
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForTimeout(1100)
  expect(Number(await stage.getAttribute('data-map-zoom'))).toBeCloseTo(expected, 1)
})
