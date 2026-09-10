import { expect, test } from '@playwright/test'

const prepare = async (page: import('@playwright/test').Page) => {
  await page.goto('/care')
  await page.addStyleTag({ content: '#nuxt-devtools-container { display:none !important }' })
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as HTMLElement & { __vue_app__?: unknown })?.__vue_app__))
}

test('環境模型延後載入、閒置休眠、離屏釋放及重新進入', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { habitatDraws: number }
    state.habitatDraws = 0
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const draw = prototype.drawElements
      prototype.drawElements = function (...args: Parameters<typeof draw>) {
        state.habitatDraws += 1
        return draw.apply(this, args)
      }
    }
  })
  await prepare(page)
  await expect(page.locator('.habitat-stage canvas')).toHaveCount(0)
  await page.locator('.habitat-explorer').scrollIntoViewIfNeeded()
  await expect(page.locator('.habitat-stage canvas')).toBeVisible()
  await expect(page.locator('.habitat-loading')).toHaveCount(0)
  await page.waitForTimeout(1700)
  const before = await page.evaluate(() => (window as typeof window & { habitatDraws: number }).habitatDraws)
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => (window as typeof window & { habitatDraws: number }).habitatDraws)
  expect(after - before).toBeLessThanOrEqual(4)
  const canvas = page.locator('.habitat-stage canvas')
  const box = await canvas.boundingBox()
  const prior = await canvas.screenshot()
  await page.mouse.move(box!.x + box!.width * .5, box!.y + box!.height * .5)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width * .65, box!.y + box!.height * .54, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(800)
  expect(Buffer.compare(prior, await canvas.screenshot())).not.toBe(0)
  await page.locator('h1').scrollIntoViewIfNeeded()
  await expect(canvas).toHaveCount(0)
  await page.locator('.habitat-explorer').scrollIntoViewIfNeeded()
  await expect(canvas).toBeVisible()
  await expect(page.getByText('頁面發生錯誤', { exact: true })).toHaveCount(0)
})

for (const width of [320, 390, 768]) {
  test(`環境示意 ${width}px 觸控模式不建立 Canvas，七項設備完整可操作`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    await prepare(page)
    await page.locator('.habitat-explorer').scrollIntoViewIfNeeded()
    await expect(page.locator('.habitat-stage canvas')).toHaveCount(0)
    await expect(page.locator('.habitat-toolbar')).toHaveCount(0)
    await expect(page.locator('.habitat-poster')).toBeVisible()
    expect(await page.locator('.habitat-poster').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true)
    const buttons = page.getByRole('group', { name: '選擇設備' }).getByRole('button')
    await expect(buttons).toHaveCount(7)
    for (const button of await buttons.all()) {
      await button.click()
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    }
    await expect(page.locator('.habitat-description h4')).toHaveText('溫度計')
    await expect(page.locator('.habitat-selected-point')).toHaveText('07')
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2)).toBe(true)
    await page.locator('.habitat-explorer').screenshot({ path: `output/habitat-20260910/mobile-${width}.png` })
    await context.close()
  })
}

test('WebGL 無法建立時仍提供可操作的環境示意', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null
      return original.call(this, type, ...args)
    } as typeof original
  })
  await prepare(page)
  await page.locator('.habitat-explorer').scrollIntoViewIfNeeded()
  await expect(page.locator('.habitat-toolbar')).toHaveCount(0)
  await expect(page.locator('.habitat-poster')).toBeVisible()
  await page.getByRole('group', { name: '選擇設備' }).getByRole('button', { name: /躲避屋/ }).click()
  await expect(page.locator('.habitat-description h4')).toHaveText('躲避屋')
  await expect(page.getByText('頁面發生錯誤', { exact: true })).toHaveCount(0)
})
