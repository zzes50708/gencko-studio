import { test, expect } from '@playwright/test'
test.use({ serviceWorkers: 'block' })
test('不同桌面寬度及平移後，院名不互相遮擋或被左右裁切', async ({ page }) => {
  test.setTimeout(60000)
  await page.route('https://tiles.openfreemap.org/**', (route) => route.abort())
  await page.goto('/hospital')
  const stage = page.locator('.map-stage')
  await expect(stage).toHaveAttribute('data-map-ready', 'true', { timeout: 30000 })
  await page.locator('.hosp-header-toggle').first().click()
  for (const width of [768, 900, 1280, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    await stage.scrollIntoViewIfNeeded()
    await expect(stage).toHaveAttribute('data-map-idle', 'true')
    for (let step = 0; step < 2; step++) {
      const rect = (await stage.boundingBox())!
      const boxes = await page.locator('.map-cluster').evaluateAll((elements) =>
        elements.map((element) => {
          const r = element.getBoundingClientRect()
          return { x: r.x, right: r.right, y: r.y, bottom: r.bottom }
        })
      )
      expect(boxes.length).toBeGreaterThan(0)
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(rect.x - 1)
        expect(box.right).toBeLessThanOrEqual(rect.x + rect.width + 1)
      }
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!,
            b = boxes[j]!
          expect(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y).toBe(true)
        }
      const canvas = stage.locator('canvas')
      const bounds = (await canvas.boundingBox())!
      await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height - 100)
      await page.mouse.down()
      await page.mouse.move(bounds.x + bounds.width / 2 + 80, bounds.y + bounds.height - 100, {
        steps: 8
      })
      await page.mouse.up()
      await expect(stage).toHaveAttribute('data-map-idle', 'true')
    }
  }
})

test('手機橫向保留輕量地圖及可操作尺寸', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 })
  await page.goto('/hospital')
  await expect(page.locator('.hosp-card').first()).toBeVisible()
  await expect(page.locator('.map-stage canvas')).toHaveCount(0)
  await page.getByRole('button', { name: '查看地圖', exact: true }).click()
  await expect(page.locator('.hosp-mobile-map')).toBeVisible()
  for (const button of await page.locator('.hosp-mobile-map-actions button').all()) {
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
