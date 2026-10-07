import { test, expect } from '@playwright/test'

test('高像素手機旋轉時降低解析度，停止後恢復高清且關閉不留計時器錯誤', async ({
  browser,
  baseURL
}) => {
  test.setTimeout(60000)
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 3,
    hasTouch: true,
    isMobile: true
  })
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 })
    Object.defineProperty(navigator, 'deviceMemory', { value: 8 })
  })
  const page = await context.newPage(),
    errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  const canvas = page.locator('.cabinet-workspace canvas')
  await expect(canvas).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const ratio = () =>
    canvas.evaluate((el: HTMLCanvasElement) => el.width / el.getBoundingClientRect().width)
  await expect.poll(ratio).toBeGreaterThan(1.4)
  const resting = await ratio(),
    bounds = (await canvas.boundingBox())!
  const x = bounds.x + bounds.width * 0.6,
    y = bounds.y + bounds.height * 0.5
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 0, x, y }] })
  for (let i = 1; i <= 6; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 0, x: x - i * 8, y }]
    })
  await expect.poll(ratio).toBeLessThan(resting - 0.3)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(ratio).toBeCloseTo(resting, 1)
  const close = (await page
    .getByRole('button', { name: '關閉模擬視窗', exact: true })
    .boundingBox())!
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ id: 0, x: close.x + close.width / 2, y: close.y + close.height / 2 }]
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(canvas).toHaveCount(0)
  expect(errors).toEqual([])
  await context.close()
})

test('電腦相機按鍵動畫結束後也恢復高清', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/merch')
  const canvas = page.locator('.cabinet-workspace canvas')
  await expect(canvas).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const ratio = () =>
    canvas.evaluate((el: HTMLCanvasElement) => el.width / el.getBoundingClientRect().width)
  await expect.poll(ratio).toBeGreaterThan(1.3)
  const resting = await ratio()
  await page.locator('.workspace-stage').focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(ratio).toBeLessThan(resting - 0.1)
  await expect.poll(ratio).toBeCloseTo(resting, 1)
})
