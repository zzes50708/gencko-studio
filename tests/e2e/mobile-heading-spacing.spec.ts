import { test, expect } from '@playwright/test'

const routes = [
  '/shop',
  '/breeders',
  '/auction',
  '/merch',
  '/calculator',
  '/genes',
  '/articles',
  '/guide',
  '/care',
  '/faq',
  '/start-here',
  '/health',
  '/hospital',
  '/buying-guide',
  '/why-gencko',
  '/stories',
  '/profile',
  '/compare',
  '/home'
]
for (const width of [320, 390]) {
  test(`手機 ${width}px 全站內容標題共用起點及緊湊留白`, async ({ browser, baseURL }) => {
    test.setTimeout(120000)
    const context = await browser.newContext({
      baseURL,
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true
    })
    const page = await context.newPage()
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      const heading = page
        .locator('#main-content h1:not(.sr-only), #main-content h2.page-title')
        .first()
      await expect(heading, route).toBeVisible()
      await page.evaluate(() => document.fonts.ready)
      const metrics = await heading.evaluate((e) => ({
        top: e.getBoundingClientRect().top,
        font: getComputedStyle(e).fontSize
      }))
      expect(metrics.font, route).toBe('24px')
      expect(Math.round(metrics.top), route).toBe(50)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route
      ).toBe(true)
    }
    await page.goto('/qs')
    const toolbar = page.locator('.qs-quiz-toolbar')
    const heading = page.getByRole('heading', { name: '飼養前自我評估', exact: true })
    await expect(heading).toBeVisible()
    const bar = (await toolbar.boundingBox())!
    expect((await heading.boundingBox())!.y).toBeGreaterThan(bar.y + bar.height)
    await context.close()
  })
}
