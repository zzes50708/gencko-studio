import { test, expect } from '@playwright/test'

test('開燈旋轉與縮放切換畫質後，畫布不在繪製完成後再次被清空', async ({ page }) => {
  test.setTimeout(90000)
  await page.setViewportSize({ width: 1280, height: 850 })
  await page.addInitScript(() => {
    const state = { armed: false, revision: 0, drawn: 0, clearsAfterFrame: 0, resizes: 0, draws: 0 }
    ;(window as any).cabinetFrameAudit = state
    for (const key of ['width', 'height']) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, key)!
      Object.defineProperty(HTMLCanvasElement.prototype, key, {
        ...descriptor,
        set(value) {
          if (state.armed && (this as HTMLCanvasElement).closest('.cabinet-workspace')) {
            state.revision++
            state.resizes++
          }
          descriptor.set!.call(this, value)
        }
      })
    }
    let framebuffer: WebGLFramebuffer | null = null
    const proto = WebGL2RenderingContext.prototype
    const bind = proto.bindFramebuffer
    proto.bindFramebuffer = function (target, value) {
      if (target === this.FRAMEBUFFER || target === this.DRAW_FRAMEBUFFER) framebuffer = value
      return bind.call(this, target, value)
    }
    for (const key of [
      'drawArrays',
      'drawElements',
      'drawArraysInstanced',
      'drawElementsInstanced'
    ] as const) {
      const draw = proto[key]
      ;(proto as any)[key] = function (...args: any[]) {
        if (state.armed && framebuffer === null) {
          state.drawn = state.revision
          state.draws++
        }
        return (draw as any).apply(this, args)
      }
    }
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) =>
      raf((time) => {
        // 模擬低效能裝置，觸發操作中的自適應降畫質。
        if (state.armed) {
          const until = performance.now() + 35
          while (performance.now() < until) {
            /* 僅測試使用的慢幀。 */
          }
        }
        const drawsBefore = state.draws
        callback(time)
        const rendered = state.draws > drawsBefore
        // Vue 的更新會在目前繪製回呼之後排入微任務；檢查更新後是否清掉剛畫好的內容。
        queueMicrotask(() => {
          if (rendered && state.armed && state.revision > state.drawn) state.clearsAfterFrame++
        })
      })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/merch')
  await expect(page.locator('.cabinet-workspace')).toHaveAttribute('aria-busy', 'false', {
    timeout: 45000
  })
  await page.locator('select[aria-label="LED照明層數"]').selectOption('4')
  await expect(page.getByRole('switch', { name: 'LED 開啟', exact: true })).toBeChecked()
  await page.locator('.workspace-stage').focus()
  await page.evaluate(() => {
    ;(window as any).cabinetFrameAudit.armed = true
  })
  for (const key of ['ArrowRight', 'ArrowLeft', '+', '-', 'ArrowRight']) {
    await page.keyboard.press(key)
    await page.waitForTimeout(650)
  }
  const result = await page.evaluate(() => (window as any).cabinetFrameAudit)
  console.log('畫布刷新紀錄', result)
  expect(result.resizes).toBeGreaterThan(0)
  expect(result.clearsAfterFrame).toBe(0)
  await page.evaluate(() => {
    ;(window as any).cabinetFrameAudit.armed = false
  })
  await page.getByRole('switch', { name: 'LED 開啟', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'LED 關閉', exact: true })).not.toBeChecked()
  await page.getByRole('switch', { name: 'LED 關閉', exact: true }).click()
  await expect(page.getByRole('switch', { name: 'LED 開啟', exact: true })).toBeChecked()
  expect(errors).toEqual([])
  await page.screenshot({ path: 'output/cabinet-led-flicker-verified.png' })
})
