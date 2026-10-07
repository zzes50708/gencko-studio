import { test, expect } from '@playwright/test'

test('改變層數重用材質程式，不重新編譯整櫃著色器', async ({ browser, baseURL }) => {
  test.setTimeout(60000)
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    ;(window as any).cabinetShaderCount = 0
    const source = WebGL2RenderingContext.prototype.shaderSource
    WebGL2RenderingContext.prototype.shaderSource = function (shader, text) {
      ;(window as any).cabinetShaderCount++
      return source.call(this, shader, text)
    }
  })
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const before = await page.evaluate(() => (window as any).cabinetShaderCount)
  for (const rows of [8, 3, 1, 8]) {
    await page.getByRole('button', { name: '調整配置', exact: true }).tap()
    await page.getByRole('button', { name: '層數', exact: true }).tap()
    await page
      .getByRole('dialog', { name: '層數', exact: true })
      .getByRole('button', { name: String(rows), exact: true })
      .tap()
    await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
    await expect(page.locator('#cabinet-summary')).toHaveValue(new RegExp(`2 抽 × ${rows} 層`))
    await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30000
    })
  }
  const added = await page.evaluate((n) => (window as any).cabinetShaderCount - n, before)
  expect(added).toBe(0)
  await context.close()
})
