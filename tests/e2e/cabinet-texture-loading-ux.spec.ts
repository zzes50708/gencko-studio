import { test, expect } from '@playwright/test'
test('只載入所選貼皮，切換後保留正式貼圖且不重複下載', async ({ page }) => {
  test.setTimeout(60000)
  const requests: string[] = []
  page.on('request', (r) => {
    if (/\/(concrete|stone)-v2-(normal|roughness)\.jpg/.test(r.url())) requests.push(r.url())
  })
  await page.setViewportSize({ width: 390, height: 850 })
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).click()
  await page.waitForFunction(
    () => !!(document.querySelector('.cabinet-workspace') as any)?.__vueParentComponent
  )
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: '清水模紋理貼皮', exact: true }).click()
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: '確認生成模型', exact: true }).click()
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  await expect.poll(() => requests.filter((u) => u.includes('concrete')).length).toBe(2)
  expect(requests.filter((u) => u.includes('stone'))).toHaveLength(0)
  await page.getByRole('button', { name: '調整配置', exact: true }).click()
  await page.getByRole('button', { name: '深灰石紋貼皮', exact: true }).click()
  await expect.poll(() => requests.filter((u) => u.includes('stone')).length).toBe(2)
  await page.waitForFunction(() => {
    let c = (document.querySelector('.cabinet-workspace') as any).__vueParentComponent
    while (c && !c.setupState.stoneTextures) c = c.parent
    return !!c?.setupState.stoneTextures
  })
  await page.getByRole('button', { name: '清水模紋理貼皮', exact: true }).click()
  await page.getByRole('button', { name: '深灰石紋貼皮', exact: true }).click()
  await page.waitForTimeout(400)
  expect(requests).toHaveLength(4)
})
