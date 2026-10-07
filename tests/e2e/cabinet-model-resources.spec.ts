import { test, expect } from '@playwright/test'
test('模型釋放不銷毀共用貼圖，純色與備援材質皆能建立', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/merch')
  await page.locator('.cabinet-workspace canvas').waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: '清水模紋理貼皮', exact: true }).click()
  await page.waitForFunction(() => {
    let c = (document.querySelector('.cabinet-workspace') as any).__vueParentComponent
    while (c && !c.setupState.woodTextures) c = c.parent
    return !!c?.setupState.woodTextures
  })
  const result = await page.locator('.cabinet-workspace').evaluate(async (el) => {
    let c = (el as any).__vueParentComponent
    while (c && !c.setupState.layout) c = c.parent
    const s = c.setupState
    const { createCabinetModel } = await import('/_nuxt/utils/cabinet/model.ts')
    const { calculateCabinet } = await import('/_nuxt/utils/cabinet/config.ts')
    const sources = s.woodTextures
    if (!sources) throw Error('正式貼圖尚未載入')
    let disposed = 0
    Object.values(sources).forEach((t: any) => t.addEventListener('dispose', () => disposed++))
    const models = []
    for (const finishId of ['concrete', 'stone', 'white', 'charcoal']) {
      const layout = calculateCabinet({ ...s.input, finishId })
      for (const textures of [sources, null]) {
        const model = createCabinetModel(layout, textures)
        models.push({ finishId, parts: model.root.children.length })
        model.dispose()
      }
    }
    return { disposed, models }
  })
  expect(result.disposed).toBe(0)
  expect(result.models).toHaveLength(8)
  expect(result.models.every((m: any) => m.parts > 0)).toBe(true)
})
