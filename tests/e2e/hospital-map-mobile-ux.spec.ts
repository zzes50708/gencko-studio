import { test, expect } from '@playwright/test'

test('手機位置預覽只提供篩選後院所，零結果不顯示外部搜尋地圖', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/hospital')
  await expect(page.locator('.hosp-card').first()).toBeVisible()
  const firstName = await page.locator('.hosp-card').first().locator('.hosp-name').innerText()
  await page.getByRole('button', { name: '查看地圖', exact: true }).click()
  await expect(page.getByLabel('選擇預覽院所')).toBeVisible()
  await page.getByRole('searchbox').fill(firstName)
  await expect(page.getByLabel('選擇預覽院所').locator('option')).toHaveCount(1)
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveAttribute(
    'src',
    new RegExp(encodeURIComponent(firstName))
  )
  await page.getByRole('searchbox').fill('不存在院所測試')
  await expect(page.locator('.hosp-mobile-map iframe')).toHaveCount(0)
  await expect(page.locator('.hosp-mobile-map')).toContainText('沒有符合條件的院所')
})
