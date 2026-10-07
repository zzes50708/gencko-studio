import { test, expect } from '@playwright/test'
// 包含 WebGL 首次載入及多次模型更新，總時限需涵蓋各階段等待。
test.setTimeout(60000)
async function state(page: any) {
  return page.locator('.cabinet-workspace').evaluate((e: any) => {
    let c = e.__vueParentComponent
    while (c && !c.setupState.controls) c = c.parent
    const controls = c.setupState.controls.instance
    const ids = new Set()
    c.setupState.model.root.traverse((o: any) => {
      if (typeof o.userData.drawerId === 'number') ids.add(o.userData.drawerId)
    })
    const offset = controls.object.position.clone().sub(controls.target)
    return { offset: offset.toArray(), distance: offset.length(), drawers: ids.size }
  })
}
async function ready(page: any) {
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  await expect(page.locator('.cabinet-workspace canvas')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 20000
  })
  await page.locator('.cabinet-workspace canvas').scrollIntoViewIfNeeded()
}
test('手機原生旋轉與雙指縮放確實改變視角', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await ready(page)
  const before = await state(page),
    bounds = (await page.locator('.cabinet-workspace canvas').boundingBox())!,
    x = bounds.x + bounds.width * 0.6,
    y = bounds.y + bounds.height * 0.5,
    cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 0, x, y }] })
  for (let i = 1; i <= 5; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ id: 0, x: x - i * 12, y }]
    })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  const rotated = await state(page)
  expect(Math.abs(rotated.offset[0] - before.offset[0])).toBeGreaterThan(1)
  expect(rotated.distance).toBeCloseTo(before.distance, 1)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { id: 0, x: x - 30, y },
      { id: 1, x: x + 30, y }
    ]
  })
  for (let i = 1; i <= 4; i++)
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { id: 0, x: x - 30 - i * 8, y },
        { id: 1, x: x + 30 + i * 8, y }
      ]
    })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect((await state(page)).distance).toBeLessThan(rotated.distance)
  await context.close()
})
test('更新期間選項可操作，最後配置生效且保留旋轉視角', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  // 刻意保留平行編譯等待，避免快速更新使測試錯過等待狀態。
  await page.addInitScript(() => {
    const state = window as any
    state.cabinetHoldCompilation = false
    const wrapped = new Set<object>()
    for (const type of [WebGLRenderingContext, WebGL2RenderingContext]) {
      let owner: any = type.prototype
      while (owner && !Object.prototype.hasOwnProperty.call(owner, 'getProgramParameter'))
        owner = Object.getPrototypeOf(owner)
      if (!owner || wrapped.has(owner)) continue
      wrapped.add(owner)
      const original = owner.getProgramParameter
      owner.getProgramParameter = function (program: any, name: number) {
        if (name === 0x91b1 && state.cabinetHoldCompilation) return false
        return original.call(this, program, name)
      }
    }
  })
  await ready(page)
  await page.evaluate(() => {
    ;(window as any).cabinetHoldCompilation = true
  })
  await page.locator('.workspace-stage').focus()
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(250)
  const before = await state(page)
  await page.getByRole('button', { name: '調整配置', exact: true }).tap()
  await page.getByRole('button', { name: '層數', exact: true }).tap()
  await page
    .getByRole('dialog', { name: '層數', exact: true })
    .getByRole('button', { name: '8', exact: true })
    .tap()
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'true')
  await expect(page.getByRole('button', { name: '調整配置', exact: true })).toBeEnabled()
  await expect(page.locator('.workspace-updating')).toHaveCSS('pointer-events', 'none')
  const updating = await page.locator('.workspace-updating').boundingBox(),
    dimensions = await page.locator('.mobile-dimensions').boundingBox()
  expect(updating!.y).toBeGreaterThanOrEqual(dimensions!.y + dimensions!.height)
  await page.getByRole('button', { name: '調整配置', exact: true }).tap()
  await page.getByRole('button', { name: '層數', exact: true }).tap()
  await page
    .getByRole('dialog', { name: '層數', exact: true })
    .getByRole('button', { name: '3', exact: true })
    .tap()
  await page.evaluate(() => {
    ;(window as any).cabinetHoldCompilation = false
  })
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 20000
  })
  const after = await state(page)
  expect(after.drawers).toBe(6)
  const dot =
    before.offset.reduce((sum: number, v: number, i: number) => sum + v * after.offset[i], 0) /
    (before.distance * after.distance)
  expect(dot).toBeGreaterThan(0.98)
  await expect(page.locator('#cabinet-summary')).toHaveValue(/2 抽 × 3 層/)
  await page.getByRole('button', { name: '調整配置', exact: true }).tap()
  await page.getByRole('button', { name: '層數', exact: true }).tap()
  await page.getByRole('button', { name: '關閉選單', exact: true }).tap()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await page.getByRole('button', { name: '關閉模擬視窗', exact: true }).tap()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await page.locator('.bottom-nav a[href="/home"]').click()
  await expect(page.locator('.cabinet-workspace')).toHaveCount(0)
  await context.close()
})
