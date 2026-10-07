import { test, expect } from '@playwright/test'
test.use({ hasTouch: true, isMobile: true })

test('手機橫向爬櫃所有選單完整呈現，不需捲動', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 740, height: 320 })
  await page.goto('/merch')
  await page.waitForFunction(
    () => !!(document.querySelector('.cabinet-select-trigger') as any)?.__vueParentComponent
  )
  const triggers = page.locator('.cabinet-select-trigger')
  for (let i = 0; i < (await triggers.count()); i++) {
    if (await triggers.nth(i).isDisabled()) continue
    await triggers.nth(i).tap()
    const panel = page.locator('.cabinet-picker[open] .cabinet-picker-panel')
    await expect(panel).toBeVisible()
    const bounds = await panel.boundingBox()
    expect(
      bounds!.y,
      (await triggers.nth(i).getAttribute('aria-label')) || ''
    ).toBeGreaterThanOrEqual(0)
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(320)
    await expect(page.locator('.cabinet-picker[open] button').last()).toBeInViewport()
    await page.getByRole('button', { name: '關閉選單', exact: true }).tap()
  }
})

test('手機導覽在低可視高度下仍能關閉並前往其他頁', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 320 })
  await page.goto('/stories')
  await page.locator('.bottom-nav button').filter({ hasText: '工具' }).tap()
  const dialog = page.getByRole('dialog', { name: '工具導覽選單' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: /關閉/ })).toBeInViewport()
  const close = dialog.getByRole('button', { name: /關閉/ })
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await close.tap()
  await expect(dialog).toBeHidden()
  await page.locator('.bottom-nav button').filter({ hasText: '工具' }).tap()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('link', { name: /基因計算機/ }).tap()
  await expect(page).toHaveURL(/\/calculator$/)
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})
