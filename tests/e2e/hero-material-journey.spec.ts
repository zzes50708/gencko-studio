import { test, expect } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

for (const mobile of [true, false]) {
  test(`開場材質巡檢：${mobile ? '手機' : '桌機'}全程推進與倒滑`, async ({ browser }) => {
    test.setTimeout(360000)
    const width = mobile ? 390 : 1440
    const context = await browser.newContext({
      viewport: { width, height: mobile ? 844 : 900 },
      isMobile: mobile,
      hasTouch: mobile,
      serviceWorkers: 'block'
    })
    const page = await context.newPage()
    const errors: string[] = []
    const shaderErrors: string[] = []
    const samples: unknown[] = []
    const directory = process.env.HERO_ARTIFACT_DIR || 'output/hero-upgrade-round2'
    await mkdir(directory, { recursive: true })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /WebGLProgram|VALIDATE_STATUS|shader error|THREE.WebGLRenderer/i.test(message.text())
      )
        shaderErrors.push(message.text())
    })
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
      await page.evaluate(() => document.fonts.ready)
      for (const progress of [0, 0.22, 0.28, 0.32, 0.55, 0.78, 0.9, 0.98, 0.32, 0]) {
        await page.evaluate(
          (p) => scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * p),
          progress
        )
        await page.waitForFunction(
          (p) => Math.abs((window as any).__hero.state().currentHeroScrollProgress - p) < 0.001,
          progress,
          { timeout: 60000 }
        )
        // 下一場景及蛋的內部阻尼亦需完成，不能只驗證總捲動參數。
        await page.waitForFunction(
          () => {
            const state = (window as any).__hero.state()
            return (
              Math.abs(state.targetNextSceneProgress - state.currentNextSceneProgress) < 0.003 &&
              Math.abs(state.targetPlaceholderProgress - state.currentPlaceholderProgress) < 0.003
            )
          },
          {},
          { timeout: 60000 }
        )
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true
        )
        const state = await page.evaluate(() => ({
          state: (window as any).__hero.state(),
          info: (window as any).__hero.info()
        }))
        samples.push({ progress, ...state })
        await page.screenshot({ path: `${directory}/${width}-${samples.length}-${progress}.png` })
        expect(shaderErrors).toEqual([])
        expect(errors).toEqual([])
      }
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
      await writeFile(
        `${directory}/${width}-journey.json`,
        JSON.stringify({ samples, errors, shaderErrors }, null, 2)
      )
      await context.close()
    }
  })
}
