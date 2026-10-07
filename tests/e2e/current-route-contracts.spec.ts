import { test, expect } from '@playwright/test'
test('舊周邊詳情導向現行訂製頁', async ({ page }) => {
  test.setTimeout(45000)
  await page.goto('/merch/legacy-item')
  await expect(page).toHaveURL(/\/merch$/)
  await expect(page.locator('.cabinet-workspace')).toBeVisible({ timeout: 30000 })
})
test('Het 按鈕提供選取與取消狀態', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/calculator')
  await page.waitForFunction(
    () => !!(document.querySelector('.calc-parent-card') as any)?.__vueParentComponent
  )
  const card = page.locator('.calc-parent-card').first()
  await card.getByRole('button', { name: '川普白化 基因', exact: true }).click()
  const het = card.getByRole('button', { name: 'Het', exact: true })
  await expect(het).toHaveAttribute('aria-pressed', 'false')
  await het.click()
  await expect(het).toHaveAttribute('aria-pressed', 'true')
  await het.click()
  await expect(het).toHaveAttribute('aria-pressed', 'false')
})
