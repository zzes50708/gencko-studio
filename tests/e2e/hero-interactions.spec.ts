import { test, expect } from '@playwright/test'

for (const mobile of [true, false]) {
  test(`開場互動：${mobile ? '手機點按' : '桌機鍵盤'}掃描、切卡、全息與終章入口`, async ({
    browser
  }) => {
    test.setTimeout(300000)
    const width = mobile ? 390 : 1440,
      height = mobile ? 844 : 900
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
      serviceWorkers: 'block'
    })
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /WebGLProgram|VALIDATE_STATUS|shader error/i.test(message.text())
      )
        errors.push(message.text())
    })
    const go = async (progress: number) => {
      await page.evaluate(
        (p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p),
        progress
      )
      await page.waitForFunction(
        (p) => Math.abs((window as any).__hero.state().currentHeroScrollProgress - p) < 0.001,
        progress,
        { timeout: 60000 }
      )
    }
    try {
      await page.goto('/')
      await page.waitForFunction(
        () => Boolean((window as any).__hero?.state),
        {},
        { timeout: 90000 }
      )
      await page.waitForTimeout(500)
      await page.addStyleTag({
        content: '.nuxt-devtools-anchor,#nuxt-devtools-container{display:none!important}'
      })
      const scene = page.locator('.hero-composite')
      await expect(page.locator('.hero-interaction-panel,.hero-accessible-nav')).toHaveCount(0)
      if (mobile) await page.touchscreen.tap(width / 2, height * 0.42)
      else {
        await scene.focus()
        await scene.press('Enter')
      }
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().sceneScanCount))
        .toBe(1)
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().sceneScanActive), {
          timeout: 10000
        })
        .toBe(false)
      await go(0.22)
      if (mobile) await page.touchscreen.tap(width / 2, height * 0.42)
      else await page.mouse.click(width / 2, height * 0.42)
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().sceneScanCount))
        .toBe(2)
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().sceneScanActive), {
          timeout: 10000
        })
        .toBe(false)
      if (mobile) {
        const cdp = await context.newCDPSession(page)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: 190, y: 620 }]
        })
        for (const y of [580, 520, 450, 370])
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: 190, y }]
          })
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        expect(await page.evaluate(() => (window as any).__hero.state().sceneScanCount)).toBe(2)
      }
      await go(0.55)
      const orbit = await page.evaluate(() => (window as any).__hero.state().targetCardOrbit)
      await scene.focus()
      await scene.press('ArrowRight')
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().targetCardOrbit), {
          timeout: 30000
        })
        .toBeGreaterThan(orbit)
      await page.waitForTimeout(700)
      await scene.press('Enter')
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.getByRole('button', { name: '關閉展覽' }).click()
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10000 })
      await expect(page.locator('.hero-interaction-panel,.hero-accessible-nav')).toHaveCount(0)
      await go(0.82)
      expect(await page.evaluate(() => (window as any).__hero.state().embryoMaterial)).toBe(
        'ShaderMaterial'
      )
      if (mobile) await page.touchscreen.tap(width / 2, height * 0.42)
      else {
        await scene.focus()
        await scene.press('Enter')
      }
      await expect
        .poll(() => page.evaluate(() => (window as any).__hero.state().sceneScanCount))
        .toBe(3)
      await page.screenshot({ path: `output/hero-electronic-interactions/${width}-electronic.png` })
      await go(0.98)
      await expect(page.locator('.hero-interaction-panel,.hero-accessible-nav')).toHaveCount(0)
      await page.waitForFunction(
        () => (window as any).__hero.state().currentPlaceholderProgress > 0.8,
        {},
        { timeout: 30000 }
      )
      await page.screenshot({ path: `output/hero-electronic-interactions/${width}-finale.png` })
      if (mobile) {
        const target = await page.evaluate(() => {
          for (let y = 280; y < innerHeight - 80; y += 16) {
            for (let x = 20; x < innerWidth - 20; x += 16) {
              if ((window as any).__hero.finaleHit(x, y) === '/calculator') return { x, y }
            }
          }
          return null
        })
        expect(target).not.toBeNull()
        await page.touchscreen.tap(target!.x, target!.y)
      } else {
        await scene.focus()
        await scene.press('ArrowRight')
        await scene.press('ArrowRight')
        await scene.press('ArrowRight')
        await scene.press('Enter')
      }
      await expect(page).toHaveURL(/\/calculator$/, { timeout: 30000 })
      await expect(page.locator('.hero-composite')).toHaveCount(0)
      expect(errors).toEqual([])
    } finally {
      await context.close()
    }
  })
}
