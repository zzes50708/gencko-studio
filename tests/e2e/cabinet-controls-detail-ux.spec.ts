import { test, expect } from '@playwright/test'

test('手機數字選單不拉寬，溫控黑底紅字且保留完整按鍵區', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 800 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  for (const title of ['層數', '每層抽數']) {
    await page.getByRole('button', { name: title, exact: true }).tap()
    const dialog = page.getByRole('dialog', { name: title, exact: true })
    const options = dialog.locator('.cabinet-picker-list button')
    const bounds = await options.evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      })
    )
    expect(bounds.every((rect) => rect.width <= 60 && rect.height >= 36)).toBe(true)
    await options.first().tap()
  }
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const display = await page.locator('.cabinet-workspace').evaluate((el) => {
    let c = (el as any).__vueParentComponent
    while (c && !c.setupState.model) c = c.parent
    const root = c.setupState.model.root
    const screen = root.getObjectByName('thermostat-display')
    const buttons = root.getObjectByName('thermostat-buttons')
    const canvas = screen.material.map.image as HTMLCanvasElement
    const pixel = canvas.getContext('2d')!.getImageData(0, 0, 1, 1).data
    return {
      background: Array.from(pixel),
      material: screen.material.type,
      toneMapped: screen.material.toneMapped,
      buttons: !!buttons
    }
  })
  expect(display.background.slice(0, 3)).toEqual([7, 7, 9])
  expect(display.material).toBe('MeshBasicMaterial')
  expect(display.toneMapped).toBe(false)
  expect(display.buttons).toBe(true)
  await context.close()
})
