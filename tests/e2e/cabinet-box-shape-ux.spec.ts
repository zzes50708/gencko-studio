import { test, expect } from '@playwright/test'

test('塑膠盒底框內縮，壓克力盒底面為不透光白色且保留板厚', async ({ page }) => {
  test.setTimeout(60000)
  await page.goto('/merch')
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  const result = await page.locator('.cabinet-workspace').evaluate(async (el) => {
    let c = (el as any).__vueParentComponent
    while (c && !c.setupState.input) c = c.parent
    const { createCabinetModel } = await import('/_nuxt/utils/cabinet/model.ts')
    const { calculateCabinet } = await import('/_nuxt/utils/cabinet/config.ts')
    return ['a4', 'a6', 'acrylic-m', 'acrylic-l'].map((boxVariant) => {
      const model = createCabinetModel(calculateCabinet({ ...c.setupState.input, boxVariant }))
      const body = model.root.getObjectByName('drawer-body-0') as any
      body.geometry.computeBoundingBox()
      const positions = body.geometry.attributes.position
      let topWidth = 0,
        bottomWidth = 0,
        innerFloor = Infinity
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i),
          x = Math.abs(positions.getX(i))
        if (y > 1) topWidth = Math.max(topWidth, x * 2)
        if (y < 0.01) bottomWidth = Math.max(bottomWidth, x * 2)
        if (y > 0.01) innerFloor = Math.min(innerFloor, y)
      }
      const base = Array.isArray(body.material) ? body.material[1] : null
      let plasticExtraBody = false
      if (!boxVariant.startsWith('acrylic')) {
        for (const mesh of body.parent.children as any[]) {
          if (!mesh.geometry || mesh === body || mesh.name.startsWith('drawer-rim-')) continue
          const detail = mesh.geometry.attributes.position
          for (let i = 0; i < detail.count; i++) {
            const y = detail.getY(i) + mesh.position.y - body.position.y
            if (y < body.geometry.boundingBox?.max.y * 0.8 || y < 1) plasticExtraBody = true
          }
        }
      }
      const data = {
        boxVariant,
        topWidth,
        bottomWidth,
        innerFloor,
        plasticExtraBody,
        whiteBase: base
          ? {
              transmission: base.transmission,
              color: base.color.getHexString(),
              opacity: base.opacity
            }
          : null,
        groups: body.geometry.groups.map((g: any) => g.materialIndex)
      }
      model.dispose()
      return data
    })
  })
  for (const box of result) {
    expect(box.innerFloor).toBeGreaterThan(0.1)
    if (box.boxVariant.startsWith('acrylic')) {
      expect(box.whiteBase).toEqual({ transmission: 0, color: 'f2f1ed', opacity: 1 })
      expect(box.groups).toContain(1)
      expect(box.bottomWidth).toBeCloseTo(box.topWidth, 2)
    } else {
      expect(box.topWidth - box.bottomWidth).toBeGreaterThan(1)
      expect(box.plasticExtraBody).toBe(false)
    }
  }
})
