import { test, expect } from '@playwright/test'
test.use({ baseURL: process.env.UX_BASE_URL || 'http://[::1]:3000', reducedMotion: 'reduce' })
test('手機清單優先、收藏篩選與返回保留搜尋', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/hospital')
  await page.waitForTimeout(900)
  await expect(page.locator('.hosp-card').first()).toBeVisible()
  await expect(page.locator('.map-stage canvas')).toHaveCount(0)
  await expect(page.locator('.hosp-map-section')).toHaveCount(0)
  const first = page.locator('.hosp-card').first()
  const name = await first.locator('.hosp-name').innerText()
  await first.locator('.hosp-fav-btn').click()
  await page.getByLabel(/只看收藏/).check()
  await expect(page.locator('.hosp-card')).toHaveCount(1)
  await page.getByRole('searchbox').fill(name)
  await first.locator('.hosp-header-toggle').click()
  await page.getByRole('navigation', { name: '全站導覽' }).count()
  await page.goto('/qs')
  // 完整重新載入會建立新狀態；下面使用 SPA 工具連結再驗證返回。
  await page.waitForTimeout(1500)
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await page.waitForTimeout(1500)
  await page.getByRole('searchbox').fill(name)
  await page.locator('.hosp-card').first().locator('.hosp-header-toggle').click()
  await page
    .getByRole('navigation', { name: '手機底部導覽' })
    .getByRole('button')
    .filter({ hasText: '知識' })
    .click()
  await page.getByRole('dialog').getByRole('link', { name: '飼養前評估', exact: true }).click()
  await expect(page).toHaveURL(/qs/)
  await page.goBack()
  await expect(page.getByRole('searchbox')).toHaveValue(name)
  await expect(page.locator('.hosp-card').first().locator('.hosp-header-toggle')).toHaveAttribute(
    'aria-expanded',
    'true'
  )
})
test('醫院資料失敗可重試，篩選零結果可清除', async ({ page }) => {
  await page.goto('/qs')
  await page.waitForTimeout(1500)
  await page.route('**/rest/v1/hospitals*', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"暫時無法載入"}' })
  )
  await page.getByRole('link', { name: '查找特寵醫院', exact: true }).click()
  await expect(page).toHaveURL(/hospital/, { timeout: 15000 })
  await expect(page.getByRole('button', { name: '重新載入', exact: true })).toBeVisible({
    timeout: 15000
  })
  await expect(page.locator('.hosp-count')).toHaveText('暫時無法載入')
  await page.unroute('**/rest/v1/hospitals*')
  await page.getByRole('button', { name: '重新載入', exact: true }).click()
  await expect(page.locator('.hosp-card').first()).toBeVisible()
  await page.getByRole('searchbox').fill('不存在院所測試')
  await expect(page.locator('.hosp-card')).toHaveCount(0)
  await page.locator('.hosp-empty').getByRole('button', { name: '清除篩選', exact: true }).click()
  await expect(page.locator('.hosp-card').first()).toBeVisible()
})
