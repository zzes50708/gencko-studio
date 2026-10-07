import { test, expect } from '@playwright/test'

test('手機未開啟時不下載工作區與 3D 程式', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 800 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage(),
    requests: string[] = []
  page.on('request', (request) => {
    if (/CabinetWorkspace\.vue|\.vite\/deps\/.*(?:three|tres)/i.test(request.url()))
      requests.push(request.url())
  })
  await page.goto('/merch')
  await expect(
    page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true })
  ).toBeVisible()
  await page.waitForTimeout(300)
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await expect(page.getByRole('button', { name: '確認生成模型', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '層數', exact: true }).tap()
  const rows = page.getByRole('dialog', { name: '層數', exact: true })
  const rowButton = rows.getByRole('button', { name: '8', exact: true })
  const box = await rowButton.boundingBox()
  expect(box!.height).toBeLessThanOrEqual(36)
  expect(box!.y + box!.height).toBeLessThanOrEqual(800)
  await rowButton.tap()
  await page.getByRole('button', { name: '收納抽屜內高', exact: true }).tap()
  const storage = page.getByRole('dialog', { name: '收納抽屜內高', exact: true })
  await expect(storage.getByRole('button', { name: '15 cm', exact: true })).toBeVisible()
  await expect(storage.getByRole('button', { name: '11 cm', exact: true })).toHaveCount(0)
  await storage.getByRole('button', { name: '15 cm', exact: true }).tap()
  await context.close()
})

test('關閉手機模型會釋放幾何資源，重新開啟保留配置', async ({ browser, baseURL }) => {
  test.setTimeout(60000)
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 800 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  const launcher = page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true })
  await launcher.tap()
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  await page.locator('.cabinet-workspace').evaluate((el) => {
    let c = (el as any).__vueParentComponent
    while (c && !c.setupState.input) c = c.parent
    const geometry = new Set<any>()
    c.setupState.model.root.traverse((object: any) => {
      // Sprite 的四邊形由 Three.js 全域共用，不屬於這份模型。
      if (object.geometry && object.type !== 'Sprite') geometry.add(object.geometry)
    })
    ;(window as any).__cabinetResources = { total: geometry.size, disposed: 0 }
    geometry.forEach((item) =>
      item.addEventListener('dispose', () => (window as any).__cabinetResources.disposed++)
    )
  })
  await page.getByRole('button', { name: '關閉模擬視窗', exact: true }).tap()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const count = (window as any).__cabinetResources
        return count.total > 0 && count.total === count.disposed
      })
    )
    .toBe(true)
  await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
  await launcher.tap()
  await expect(page.getByRole('button', { name: '確認生成模型', exact: true })).toBeVisible()
  await context.close()
})

test('GPU context 遺失後可在同一配置重試', async ({ browser, baseURL }) => {
  test.setTimeout(60000)
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 800 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/merch')
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await page.getByRole('button', { name: '層數', exact: true }).tap()
  await page
    .getByRole('dialog', { name: '層數', exact: true })
    .getByRole('button', { name: '6', exact: true })
    .tap()
  await page.getByRole('button', { name: '確認生成模型', exact: true }).tap()
  const canvas = page.locator('.cabinet-workspace canvas')
  await expect(canvas).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  await canvas.evaluate((el: HTMLCanvasElement) =>
    el.getContext('webgl2')!.getExtension('WEBGL_lose_context')!.loseContext()
  )
  await expect(page.getByRole('button', { name: '重新生成模型', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重新生成模型', exact: true }).tap()
  await expect(canvas).toBeVisible({ timeout: 30000 })
  await expect(page.locator('#cabinet-summary')).toHaveValue(/2 抽 × 6 層/)
  await context.close()
})

test('背景頁不繪製 GPU，返回前景可恢復', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as any).__cabinetDraws = 0
    for (const name of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced'
    ]) {
      const original = (WebGL2RenderingContext.prototype as any)[name]
      ;(WebGL2RenderingContext.prototype as any)[name] = function (...args: any[]) {
        ;(window as any).__cabinetDraws++
        return original.apply(this, args)
      }
    }
  })
  await page.goto('/merch')
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 30000
  })
  const before = await page.locator('.cabinet-workspace').evaluate((el) => {
    // 注入瀏覽器 visibility 狀態，測試應用程式的背景處理。
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
    let c = (el as any).__vueParentComponent
    while (c && !c.setupState.input) c = c.parent
    c.setupState.input.lightLevel = 40
    return (window as any).__cabinetDraws
  })
  await page.waitForTimeout(350)
  expect(await page.evaluate(() => (window as any).__cabinetDraws)).toBe(before)
  await page.evaluate(() => {
    delete (document as any).hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect
    .poll(() => page.evaluate(() => (window as any).__cabinetDraws))
    .toBeGreaterThan(before)
})
