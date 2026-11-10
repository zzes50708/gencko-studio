import { test, expect } from '@playwright/test'
test.use({
  baseURL: process.env.UX_BASE_URL || 'http://[::1]:3000',
  viewport: { width: 390, height: 850 },
  hasTouch: true,
  isMobile: true,
  reducedMotion: 'reduce'
})
test.beforeEach(async ({ page }) => {
  await page.goto('/calculator')
  await page.waitForTimeout(1200)
})
test('原有觸控按鈕與即時結果，不增加操作層級', async ({ page }) => {
  const cards = page.locator('.calc-parent-card')
  for (let i = 0; i < 2; i++) {
    await page.locator('.calc-mobile-parents button').nth(i).tap()
    await cards.nth(i).getByRole('button', { name: '川普白化 基因', exact: true }).tap()
    const het = cards.nth(i).getByRole('button', { name: 'Het', exact: true })
    await het.tap()
    await expect(het).toHaveClass(/active/)
    expect((await het.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
  await expect(page.locator('.calc-res-card')).toHaveCount(2)
  await expect(page.locator('.calc-result-shell')).toContainText('66% Het')
  await expect(page.locator('.calc-prob-val')).toHaveText([/25\s*%/, /75\s*%/])
  await expect(page.locator('.calc-warn')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /查看配對結果/ })).toHaveCount(0)
  await expect(page.locator('.calc-prob-sub')).toHaveCount(0)
  await page.locator('.calc-mobile-parents button').first().tap()
  await expect(cards.first().getByRole('button', { name: 'Het', exact: true })).toHaveClass(
    /active/
  )
})
test('基因說明在頁內切換與收合', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 600 })
  const types = page.getByRole('button', { name: '基因觀念', exact: true })
  const poly = page.getByRole('button', { name: '多遺傳說明', exact: true })
  const info = page.locator('#calc-inline-info')
  await expect(info).toBeHidden()
  await types.tap()
  await expect(types).toHaveAttribute('aria-expanded', 'true')
  await expect(info).toContainText('完全顯性')
  await poly.tap()
  await expect(types).toHaveAttribute('aria-expanded', 'false')
  await expect(poly).toHaveAttribute('aria-expanded', 'true')
  await expect(info).toContainText('體色強化')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.calc-mobile-parents button').first()).toBeEnabled()
  await poly.tap()
  await expect(info).toBeHidden()
})
test('反向匹配角色標籤與套用返回保留原設定', async ({ page }) => {
  const cards = page.locator('.calc-parent-card')
  await cards.first().getByRole('button', { name: '川普白化 基因', exact: true }).tap()
  await cards.first().getByRole('button', { name: 'Het', exact: true }).tap()
  await page.locator('.calc-mobile-parents button').last().tap()
  await cards.last().getByRole('button', { name: '子代', exact: true }).tap()
  await cards.last().getByRole('button', { name: '川普白化 基因', exact: true }).tap()
  await expect(page.locator('.calc-mobile-parents button').last()).toContainText('子代')
  const apply = page.getByRole('button', { name: '套用此配對', exact: true }).first()
  await expect(apply).toBeVisible()
  expect((await apply.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await apply.tap()
  await page.getByRole('button', { name: /返回反向匹配/ }).tap()
  await expect(page.locator('.calc-result-mode')).toContainText('反向匹配')
  await expect(apply).toBeVisible()
  await expect(page.locator('.calc-mobile-parents button').last()).toContainText('子代')
})
