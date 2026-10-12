import { test, expect } from '@playwright/test'

for (const [label, draft] of [
  ['損壞 JSON', '{'],
  ['舊盒型', JSON.stringify({ boxVariant: 'tub-s', rows: 8 })],
  ['超出範圍設定', JSON.stringify({ boxVariant: 'a4', rows: 999, columns: -9, counts: null })]
] as const) {
  test(`草稿邊界：${label} 不阻斷手機配置`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 390, height: 800 },
      isMobile: true,
      hasTouch: true
    })
    await context.addInitScript(
      (value) => sessionStorage.setItem('gencko-cabinet-draft-v1', value),
      draft
    )
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/merch')
    await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
    await expect(page.getByRole('button', { name: '層數', exact: true })).toContainText(
      label === '超出範圍設定' ? '8' : '4'
    )
    await expect(page.getByRole('button', { name: '確認生成模型', exact: true })).toBeVisible()
    await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
    expect(errors).toEqual([])
    await context.close()
  })
}

test('版本更新重新載入後恢復配置，不自動生成手機模型', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 800 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  const launch = page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true })
  await launch.tap()
  await page.getByRole('button', { name: '層數', exact: true }).tap()
  await page
    .getByRole('dialog', { name: '層數', exact: true })
    .getByRole('button', { name: '6', exact: true })
    .tap()
  await page.reload()
  await launch.tap()
  await expect(page.getByRole('button', { name: '層數', exact: true })).toContainText('6')
  await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
  await context.close()
})
