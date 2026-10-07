import { test, expect } from '@playwright/test'

test('所有盒型上方開放，塑膠盒有四邊平面外緣', async ({ page }) => {
  await page.goto('/merch')
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const boxes = await page.locator('.cabinet-workspace').evaluate(async (el) => {
    let c = (el as any).__vueParentComponent
    while (c && !c.setupState.input) c = c.parent
    const { createCabinetModel } = await import('/_nuxt/utils/cabinet/model.ts')
    const { calculateCabinet, BOXES } = await import('/_nuxt/utils/cabinet/config.ts')
    return Object.keys(BOXES).map((boxVariant) => {
      const layout = calculateCabinet({ ...c.setupState.input, boxVariant, rows: 1, columns: 1 })
      const model = createCabinetModel(layout)
      model.root.updateMatrixWorld(true)
      const body = model.root.getObjectByName('drawer-body-0') as any
      let blocked = false
      body.parent.traverse((mesh: any) => {
        if (!mesh.geometry) return
        const positions = mesh.geometry.attributes.position
        const index = mesh.geometry.index
        for (let i = 0; i < (index?.count ?? positions.count); i += 3) {
          const points = [0, 1, 2].map((offset) => {
            const vertex = index ? index.getX(i + offset) : i + offset
            const point = body.position
              .clone()
              .set(positions.getX(vertex), positions.getY(vertex), positions.getZ(vertex))
            return body.worldToLocal(point.applyMatrix4(mesh.matrixWorld))
          })
          if (points.some((point) => point.y < layout.configuration.boxDimensions.height - 0.4))
            continue
          const cross = points.map(
            (point, j) => point.x * points[(j + 1) % 3].z - points[(j + 1) % 3].x * point.z
          )
          if (Math.abs(cross.reduce((sum, value) => sum + value, 0)) < 0.001) continue
          if (cross.every((value) => value >= -0.001) || cross.every((value) => value <= 0.001))
            blocked = true
        }
      })
      const rim = body.parent.getObjectByName('drawer-rim-0') as any
      const data = {
        boxVariant,
        blocked,
        rim: !!rim,
        topNormal: rim?.geometry.attributes.normal.getY(0),
        rimWidth: rim?.geometry.boundingBox?.max.x - rim?.geometry.boundingBox?.min.x,
        boxWidth: layout.configuration.boxDimensions.width
      }
      model.dispose()
      return data
    })
  })
  for (const box of boxes) {
    expect(box.blocked, box.boxVariant).toBe(false)
    if (!box.boxVariant.startsWith('acrylic-')) {
      expect(box.rim, box.boxVariant).toBe(true)
      expect(box.topNormal).toBeGreaterThan(0.9)
      expect(box.rimWidth).toBeCloseTo(box.boxWidth, 3)
    }
  }
})
