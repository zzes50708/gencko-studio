import { test, expect } from '@playwright/test'
test('群聚點選可放大，篩選清除後不殘留院所標記', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/hospital')
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-ready', 'true', {
    timeout: 30000
  })
  const group = page.getByRole('button', { name: /放大查看 \d+ 間院所/ }).first()
  await expect(group).toBeVisible()
  const before = await group.getAttribute('aria-label')
  await group.click()
  await expect(page.locator('.map-stage')).toHaveAttribute('data-map-idle', 'true')
  await expect
    .poll(async () =>
      page
        .getByRole('button', { name: /放大查看 \d+ 間院所/ })
        .first()
        .getAttribute('aria-label')
        .catch(() => null)
    )
    .not.toBe(before)
  await page
    .getByRole('searchbox', { name: '搜尋醫院名稱或地址', exact: true })
    .fill('不存在院所測試')
  await expect(page.locator('.map-cluster')).toHaveCount(0)
  await expect(page.locator('.map-stage')).toHaveCount(1)
  await expect(page.locator('.map-stage canvas')).toBeVisible()
  await expect(page.locator('.hosp-map-empty-state')).toContainText('沒有符合條件的院所')
})
