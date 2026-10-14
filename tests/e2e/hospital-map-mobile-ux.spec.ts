import { test, expect } from '@playwright/test'

test('手機位置預覽只提供篩選後院所，零結果不顯示外部搜尋地圖', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/hospital')
  await expect(page.locator('.hosp-card').first()).toBeVisible()
  const firstName = await page.locator('.hosp-card').first().locator('.hosp-name').innerText()
  await page.getByRole('button', { name: '查看地圖', exact: true }).click()
  await expect(page.getByLabel('選擇預覽院所')).toBeVisible()
  await page.getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true }).fill(firstName)
  await expect(page.getByLabel('選擇預覽院所').locator('option')).toHaveCount(1)
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveAttribute(
    'src',
    new RegExp(encodeURIComponent(firstName))
  )
  await page
    .getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
    .fill('不存在院所測試')
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveCount(0)
  await expect(page.locator('.hosp-mobile-map')).toContainText('沒有符合條件的院所')
})

test('手機地圖開關恢復焦點與操作鎖，切換寬度不殘留 3D 畫布', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/hospital')
  await page.getByRole('button', { name: '查看地圖', exact: true }).click()
  await expect(page.locator('.hosp-map-section')).toBeFocused()
  await page.getByRole('button', { name: '啟用地圖操作', exact: true }).click()
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveAttribute('tabindex', '0')
  await page.getByRole('button', { name: '關閉地圖', exact: true }).click()
  await expect(page.getByRole('button', { name: '查看地圖', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '查看地圖', exact: true }).click()
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveAttribute('tabindex', '-1')
  await page.getByRole('button', { name: '啟用地圖操作', exact: true }).click()
  await page.setViewportSize({ width: 1440, height: 950 })
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveCount(0)
  await page.setViewportSize({ width: 390, height: 850 })
  await expect(page.locator('.map-stage canvas')).toHaveCount(0)
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveAttribute('tabindex', '-1')
})

test('從院所清單開啟手機地圖，關閉後回到原院所操作', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/hospital')
  const card = page.locator('.hosp-card').first()
  await card.locator('.hosp-header-toggle').click()
  await card.locator('.hosp-map-focus').click()
  await expect(page.locator('.hosp-map-section')).toBeFocused()
  await page.getByRole('button', { name: '關閉地圖', exact: true }).click()
  await expect(card.locator('.hosp-map-focus')).toBeFocused()
})
