import { test, expect } from '@playwright/test'

for (const width of [320, 390])
  test(`${width}px 手機滿版先配置、確認才生成、返回先關閉視窗`, async ({ browser, baseURL }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 700 },
      isMobile: true,
      hasTouch: true
    })
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/merch')
    const launch = page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true })
    await expect(launch).toBeVisible()
    await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
    await launch.tap()
    const dialog = page.getByRole('dialog', { name: '3D 客製模擬系統', exact: true })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: '確認生成模型', exact: true })).toBeVisible()
    const swatches = await page
      .getByRole('group', { name: '貼皮示意色', exact: true })
      .getByRole('button')
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const box = button.getBoundingClientRect()
          return { top: box.top, height: box.height, width: box.width }
        })
      )
    expect(swatches).toHaveLength(4)
    expect(new Set(swatches.map((box) => Math.round(box.top))).size).toBe(1)
    expect(swatches.every((box) => box.height >= 44 && box.width >= 44)).toBe(true)
    const bounds = await dialog.boundingBox()
    expect(bounds?.x).toBe(0)
    expect(bounds?.y).toBe(0)
    expect(bounds?.width).toBe(width)
    expect(bounds?.height).toBe(700)
    await page.getByRole('button', { name: '層數', exact: true }).tap()
    await page
      .getByRole('dialog', { name: '層數', exact: true })
      .getByRole('button', { name: '8', exact: true })
      .tap()
    await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
    await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
    await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30000
    })
    await expect(page.locator('#cabinet-summary')).toHaveValue(/2 抽 × 8 層/)
    await page.getByRole('button', { name: '調整配置', exact: true }).tap()
    await expect(page.locator('.cabinet-workspace canvas')).toBeHidden()
    await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
    await expect(page.locator('.cabinet-workspace canvas')).toBeVisible()
    await page.goBack()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/merch$/)
    await expect(launch).toBeFocused()
    await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
    await launch.tap()
    await expect(dialog).toBeVisible()
    await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
    await expect(page.locator('#cabinet-summary')).toHaveValue(/2 抽 × 8 層/)
    await page.getByRole('button', { name: '關閉模擬視窗', exact: true }).tap()
    await expect(dialog).toBeHidden()
    await expect(launch).toBeFocused()
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
    expect(errors).toEqual([])
    await context.close()
  })

test('電腦維持頁內模型與即時更新', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/merch')
  await expect(page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true })).toHaveCount(
    0
  )
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const rows = page.getByRole('spinbutton', { name: '層數', exact: true })
  await rows.fill('6')
  await rows.blur()
  await expect(page.locator('#cabinet-summary')).toHaveValue(/2 抽 × 6 層/)
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  await expect(page.getByRole('button', { name: '確認生成模型', exact: true })).toHaveCount(0)
})
