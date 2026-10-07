import { test, expect } from '@playwright/test'
async function projectedLabels(page: any) {
  return page.locator('.cabinet-workspace').evaluate((el: any) => {
    let c = el.__vueParentComponent
    while (c && !c.setupState.controls) c = c.parent
    const s = c.setupState,
      camera = s.controls.instance.object,
      canvas = el.querySelector('canvas').getBoundingClientRect()
    s.model.root.updateMatrixWorld(true)
    return s.model.measurements.children
      .filter((o: any) => o.type === 'Sprite')
      .map((o: any) => {
        const centre = o.getWorldPosition(o.position.clone()),
          scale = o.getWorldScale(o.scale.clone())
        const right = centre.clone().set(1, 0, 0).applyQuaternion(camera.quaternion),
          up = centre.clone().set(0, 1, 0).applyQuaternion(camera.quaternion)
        const points = [
          [-1, -1],
          [1, 1]
        ].map(([x, y]) =>
          centre
            .clone()
            .addScaledVector(right, (x * scale.x) / 2)
            .addScaledVector(up, (y * scale.y) / 2)
            .project(camera)
        )
        return {
          extent: Math.max(...points.flatMap((p: any) => [Math.abs(p.x), Math.abs(p.y)])),
          fontHeight: (((Math.abs(points[1].y - points[0].y) * canvas.height) / 2) * 43) / 112
        }
      })
  })
}
for (const width of [320, 390])
  test(`${width}px 標註完整且可讀，複雜配置仍保留邊界`, async ({ browser, baseURL }) => {
    test.setTimeout(60000)
    const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 900 },
        hasTouch: true,
        isMobile: true
      }),
      page = await context.newPage()
    await page.goto('/merch')
    await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
    await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30000
    })
    await expect
      .poll(async () => Math.max(...(await projectedLabels(page)).map((x: any) => x.extent)))
      .toBeLessThanOrEqual(0.96)
    for (const label of await projectedLabels(page))
      expect(label.fontHeight).toBeGreaterThanOrEqual(8.5)
    await page.getByRole('button', { name: '層數', exact: true }).tap()
    await page.locator('dialog[open]').getByRole('button', { name: '8', exact: true }).tap()
    await page.getByRole('button', { name: '每層抽數', exact: true }).tap()
    await page.locator('dialog[open] .cabinet-picker-list button').last().tap()
    await expect(page.locator('#cabinet-summary')).toHaveValue(/8 層/)
    await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
      timeout: 30000
    })
    await expect
      .poll(async () => Math.max(...(await projectedLabels(page)).map((x: any) => x.extent)))
      .toBeLessThanOrEqual(0.96)
    for (const label of await projectedLabels(page))
      expect(label.fontHeight).toBeGreaterThanOrEqual(8.5)
    await context.close()
  })
