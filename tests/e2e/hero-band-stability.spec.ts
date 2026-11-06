import { test, expect } from '@playwright/test'

for (const mobile of [true, false]) {
  test(`斜帶${mobile ? '手機' : '桌機'}：動畫參數不污染整頁，靜止 Logo 不重畫`, async ({
    browser
  }) => {
    test.setTimeout(120000)
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      isMobile: mobile,
      hasTouch: mobile,
      serviceWorkers: 'block'
    })
    const page = await context.newPage()
    try {
      await page.addInitScript(() => {
        const counts = new WeakMap<HTMLCanvasElement, number>()
        const wrapped = new WeakSet<object>()
        const getContext = HTMLCanvasElement.prototype.getContext
        ;(HTMLCanvasElement.prototype as any).getContext = function (...args: any[]) {
          const context = (getContext as any).apply(this, args)
          if (context && /^webgl/.test(args[0]) && !wrapped.has(context)) {
            wrapped.add(context)
            for (const key of ['drawArrays', 'drawElements']) {
              const draw = context[key].bind(context)
              context[key] = (...values: any[]) => {
                counts.set(this, (counts.get(this) ?? 0) + 1)
                return draw(...values)
              }
            }
          }
          return context
        }
        ;(window as any).__logoDrawCount = () =>
          counts.get(document.querySelector('.logo-disc') as HTMLCanvasElement) ?? 0
      })
      await page.goto('/')
      await page.waitForFunction(
        () => Boolean((window as any).__hero?.state),
        {},
        { timeout: 90000 }
      )
      // 進站前 240ms 會防止瀏覽器還原舊捲動位置；待初始化結束再操作。
      await page.waitForTimeout(400)
      await page.evaluate(() =>
        scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * 0.3)
      )
      const root = page.locator('.hero-composite')
      await expect
        .poll(
          () =>
            root.evaluate((element) =>
              Number(element.style.getPropertyValue('--hero-exit-progress'))
            ),
          { timeout: 30000 }
        )
        .toBeGreaterThan(0)
      expect(
        await page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--hero-exit-progress')
        )
      ).toBe('')
      const equivalent = await root.evaluate((element) => {
        const root = element as HTMLElement
        const properties = Array.from(root.style).filter((name) => name.startsWith('--hero-'))
        const values = properties.map((name) => [name, root.style.getPropertyValue(name)])
        const snapshot = () =>
          Array.from(
            root.querySelectorAll(
              '.hero-underlay, .band-logo-stage, .band-logo-rig, .hero-canvas-shell, .intro-copy, .intro-meta'
            )
          ).map((node) => {
            const style = getComputedStyle(node),
              rect = node.getBoundingClientRect()
            return {
              rect: [rect.x, rect.y, rect.width, rect.height],
              clip: style.clipPath,
              opacity: style.opacity,
              filter: style.filter,
              transform: style.transform,
              background: style.backgroundImage,
              color: style.color,
              font: style.font
            }
          })
        const scoped = snapshot()
        // 在同一幀、同一組動畫參數比較原本的全域寫法，排除動畫時間差。
        for (const [name, value] of values) {
          document.documentElement.style.setProperty(name, value)
          root.style.removeProperty(name)
        }
        const global = snapshot()
        for (const [name, value] of values) {
          root.style.setProperty(name, value)
          document.documentElement.style.removeProperty(name)
        }
        return { scoped, global }
      })
      expect(equivalent.scoped).toEqual(equivalent.global)
      // 文字與 Logo 需要各自有空間；斜帶本身的掃入掃出裁切屬於正常動畫。
      const overlaps = await root.evaluate((element) => {
        const logo = element.querySelector('.band-logo-rig')!.getBoundingClientRect()
        return ['.intro-copy', '.intro-meta'].map((selector) => {
          const text = element.querySelector(selector)!.getBoundingClientRect()
          return (
            Math.max(0, Math.min(text.right, logo.right) - Math.max(text.left, logo.left)) *
            Math.max(0, Math.min(text.bottom, logo.bottom) - Math.max(text.top, logo.top))
          )
        })
      })
      expect(overlaps).toEqual([0, 0])
      await expect
        .poll(() => page.evaluate(() => (window as any).__logoDrawCount()))
        .toBeGreaterThan(0)
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const state = (window as any).__hero.state()
              return Math.abs(state.currentHeroScrollProgress - state.targetHeroScrollProgress)
            }),
          { timeout: 30000 }
        )
        .toBeLessThan(0.000001)
      const before = await page.evaluate(() => (window as any).__logoDrawCount())
      await page.evaluate(() =>
        document.documentElement.style.setProperty('--unrelated-test-value', '1')
      )
      await page.waitForTimeout(500)
      expect(await page.evaluate(() => (window as any).__logoDrawCount())).toBe(before)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      )
      // 真正離開場景，確認動態樣式不會污染其他頁面。
      await page.evaluate(() =>
        (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
          '/certificates'
        )
      )
      await expect(page.locator('.hero-composite')).toHaveCount(0)
      expect(
        await page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--hero-exit-progress')
        )
      ).toBe('')
    } finally {
      await context.close()
    }
  })
}
