import { test, expect } from '@playwright/test'
test.use({ baseURL: process.env.UX_BASE_URL || 'http://[::1]:3000', reducedMotion: 'reduce' })
test('未快取詞條載入失敗可重試，破圖有替代資訊', async ({ page }) => {
  await page.route('**/rest/v1/genetic_pages*', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"模擬暫時失敗"}' })
  )
  await page.goto('/genes')
  await page.waitForTimeout(1200)
  await page.locator('main a[href^="/genes/"]').first().click()
  await expect(page.getByRole('button', { name: '重新載入', exact: true })).toBeVisible({
    timeout: 15000
  })
  await expect(page.getByRole('heading', { name: /找不到/ })).toHaveCount(0)
  await page.unroute('**/rest/v1/genetic_pages*')
  await page.route('**/rest/v1/genetic_pages*', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: '測試基因',
        brief: '隔離測試內容',
        image_url: 'https://example.com/ux-broken-image.png'
      })
    })
  )
  await page.route('**/*ux-broken-image*', (r) => r.abort())
  await page.getByRole('button', { name: '重新載入', exact: true }).click()
  await expect(page.getByRole('heading', { name: '測試基因', exact: true })).toBeVisible()
  await expect(page.locator('.article-image-fallback')).toBeVisible()
})
test('手機親代全寬切換、物種恢復與即時結果', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/calculator')
  await page.waitForTimeout(1200)
  const male = page.locator('.calc-parent-card').first()
  const female = page.locator('.calc-parent-card').last()
  expect((await male.boundingBox())!.width).toBeGreaterThan(320)
  await expect(female).toBeHidden()
  expect(
    (await page.locator('.calc-mobile-parents button').first().boundingBox())!.height
  ).toBeGreaterThanOrEqual(52)
  expect(
    (await male.locator('.calc-dd-item-row--trigger').first().boundingBox())!.height
  ).toBeGreaterThanOrEqual(44)
  await male.getByRole('button', { name: '川普白化 基因', exact: true }).click()
  await page.locator('.calc-mobile-parents').getByRole('button', { name: /母/ }).click()
  await expect(female).toBeVisible()
  await expect(male).toBeHidden()
  await page.getByRole('combobox', { name: '物種', exact: true }).selectOption('肥尾守宮')
  await page.getByRole('combobox', { name: '物種', exact: true }).selectOption('豹紋守宮')
  await expect(page.locator('.calc-mobile-parents')).toContainText('川普白化')
  await expect(page.getByRole('button', { name: /查看配對結果/ })).toHaveCount(0)
  await expect(page.getByRole('region', { name: '配對結果' })).toBeVisible()
  await expect(page.locator('.calc-result-area')).toBeVisible()
})
test('圖鑑搜尋返回保留，計算配置跨頁保留', async ({ page }) => {
  await page.goto('/genes')
  await page.waitForTimeout(1000)
  await page.getByRole('searchbox', { name: '搜尋基因詞條', exact: true }).fill('白化')
  await page.locator('main a[href^="/genes/"]').first().click()
  await page.waitForURL(/genes\/.+/)
  await page.waitForTimeout(700)
  await page.goBack()
  await expect(page).toHaveURL(/genes$/)
  await expect(page.getByRole('searchbox', { name: '搜尋基因詞條', exact: true })).toHaveValue(
    '白化'
  )
  await page.locator('.tool-hub-card').first().click()
  await page.waitForTimeout(700)
  await page
    .locator('.calc-parent-card')
    .first()
    .getByRole('button', { name: '川普白化 基因', exact: true })
    .click()
  await page.goBack()
  await expect(page).toHaveURL(/genes$/)
  await expect(page.getByRole('searchbox', { name: '搜尋基因詞條', exact: true })).toHaveValue(
    '白化'
  )
  await page.goForward()
  await expect(
    page.locator('.calc-parent-card').first().locator('.calc-selected-summary')
  ).toContainText('川普白化')
  await expect(page.locator('.calc-result-area')).toBeVisible()
})
