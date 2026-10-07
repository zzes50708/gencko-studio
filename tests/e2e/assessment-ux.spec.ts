import { test, expect } from '@playwright/test'

test.use({ baseURL: process.env.UX_BASE_URL || 'http://[::1]:3000', reducedMotion: 'reduce' })

test('飼養評估返回保留答案並維持題目焦點', async ({ page }) => {
  await page.goto('/qs')
  await page.waitForTimeout(800)
  await page.locator('.qs-option-btn').first().click()
  await expect(page.locator('.qs-step-count')).toContainText('02')
  await expect(page.locator('.qs-question-text')).toBeFocused()
  await page.locator('.qs-nav-btn').click()
  await expect(page.locator('.qs-option-btn[aria-pressed="true"]')).toHaveCount(1)
  expect(
    await page.evaluate(
      () => Object.keys(JSON.parse(localStorage.getItem('gencko_qs_progress_v3')!).answers).length
    )
  ).toBe(1)
})

test('飼養評估離頁取消延遲換題，不覆寫離頁時的答案進度', async ({ page }) => {
  await page.goto('/qs')
  await page.waitForTimeout(800)
  await page.locator('.qs-option-btn').first().click()
  await page.locator('.qs-toolbar-back').dispatchEvent('click')
  await expect(page).toHaveURL(/start-here/)
  await page.waitForTimeout(350)
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('gencko_qs_progress_v3')!).step)
  ).toBe(0)
})

test('健康問卷進度列滿版且不遮擋導覽下拉連結', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/health')
  await page.waitForTimeout(800)
  await page.locator('.h-entry-card').first().click()
  expect((await page.locator('.h-quiz-toolbar').boundingBox())!.width).toBe(1440)
  await page.getByRole('button', { name: '基因與工具選單' }).click()
  await page.getByRole('link', { name: '基因計算機', exact: true }).first().click()
  await expect(page).toHaveURL(/calculator/)
})
