import { expect, test } from '@playwright/test'
import type { Page, Response } from '@playwright/test'

const contentRoutes = [
  '/home',
  '/shop',
  '/breeders',
  '/auction',
  '/merch',
  '/compare',
  '/calculator',
  '/genes',
  '/hospital',
  '/health',
  '/qs',
  '/articles',
  '/care',
  '/guide',
  '/faq',
  '/buying-guide',
  '/why-gencko',
  '/start-here',
  '/stories',
  '/profile'
] as const

const matrix = [
  { width: 320, height: 720, theme: 'light' },
  { width: 390, height: 844, theme: 'dark' },
  { width: 768, height: 1024, theme: 'light' },
  { width: 1440, height: 1000, theme: 'dark' }
] as const

const gotoRoute = async (page: Page, route: string): Promise<Response | null> => {
  try {
    return await page.goto(route, { waitUntil: 'domcontentloaded' })
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('ERR_ABORTED')) throw error
    await page.waitForTimeout(250)
    return page.goto(route, { waitUntil: 'domcontentloaded' })
  }
}

test.describe('全站 UI 完成矩陣', () => {
  test.describe.configure({ timeout: 180_000 })

  for (const state of matrix) {
    test(`${state.width}px ${state.theme}：所有內容入口可讀且無橫向溢位`, async ({ page }) => {
      await page.setViewportSize({ width: state.width, height: state.height })
      await page.addInitScript((theme) => {
        localStorage.setItem('gencko_theme', theme)
      }, state.theme)

      for (const route of contentRoutes) {
        const runtimeErrors: string[] = []
        const onPageError = (error: Error) => runtimeErrors.push(error.message)
        page.on('pageerror', onPageError)

        const response = await gotoRoute(page, route)
        expect(response?.status(), `${route} 應成功回應`).toBeLessThan(400)
        await expect(page.locator('#main-content'), `${route} 應有主要內容`).toBeVisible()
        await expect(page.locator('body'), `${route} 不應顯示 404`).not.toContainText(
          '找不到這隻守宮'
        )
        await expect
          .poll(
            () =>
              page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
            { message: `${route} 在 ${state.width}px 不應橫向溢位` }
          )
          .toBe(true)

        if (state.theme === 'light') {
          await expect(page.locator('html')).toHaveClass(/day-mode/)
        } else {
          await expect(page.locator('html')).not.toHaveClass(/day-mode/)
        }

        if (route === '/home') {
          await expect(page.locator('body')).not.toContainText('找到適合你的守宮，從理解開始')
          await page
            .locator('.home-product-marquee, .empty-state-text')
            .first()
            .waitFor({ state: 'visible', timeout: 30_000 })

          if (state.width === 768) {
            await expect(page.locator('.dt-nav')).toBeVisible()
            await expect(page.locator('.bottom-nav')).toBeHidden()
          }

          await page.screenshot({
            path: `output/playwright/final-ui-home-${state.width}-${state.theme}.png`
          })
          await page.locator('.home-hot-picks').screenshot({
            path: `output/playwright/final-ui-products-${state.width}-${state.theme}.png`
          })
          await page.locator('.home-trust').scrollIntoViewIfNeeded()
          await page.screenshot({
            path: `output/playwright/final-ui-trust-${state.width}-${state.theme}.png`
          })
        }

        expect(runtimeErrors, `${route} 不應產生 runtime error`).toEqual([])
        page.off('pageerror', onPageError)
      }
    })
  }
})
