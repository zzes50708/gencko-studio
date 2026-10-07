import { test, expect } from '@playwright/test'
import { FEED_FREQ, SUPPLEMENTS } from '../../utils/care'

if (process.env.UX_BASE_URL) test.use({ baseURL: process.env.UX_BASE_URL })
for (const width of [320, 390, 768, 1440]) {
  test(`介紹與飼養 ${width}px 保留完整資料並可閱讀`, async ({ browser, baseURL }) => {
    const c = await browser.newContext({
        baseURL,
        viewport: { width, height: 844 },
        hasTouch: width < 1000,
        isMobile: width < 768,
        reducedMotion: 'reduce'
      }),
      p = await c.newPage()
    await p.goto('/care')
    await p.waitForTimeout(600)
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (width < 768) {
      const lists = p.locator('.care-mobile-data')
      await expect(lists.first()).toBeVisible()
      for (const r of FEED_FREQ)
        for (const value of Object.values(r)) await expect(lists.first()).toContainText(value)
      for (const r of SUPPLEMENTS)
        for (const value of Object.values(r)) await expect(lists.last()).toContainText(value)
      expect(
        await lists
          .first()
          .evaluate((e) => parseFloat(getComputedStyle(e.querySelector('dd')!).fontSize))
      ).toBeGreaterThanOrEqual(13)
    } else {
      await expect(p.getByRole('table', { name: '餵食頻率與份量' })).toBeVisible()
      await expect(p.getByRole('columnheader', { name: '頻率', exact: true })).toBeVisible()
    }
    await p.locator('.care-reading-index-links button').nth(1).click()
    const y = await p.locator('#food').evaluate((e) => e.getBoundingClientRect().top)
    expect(y).toBeGreaterThanOrEqual(8)
    expect(y).toBeLessThan(width < 768 ? 30 : 100)
    const start = await p.evaluate(() => scrollY)
    await p.waitForTimeout(160)
    expect(await p.evaluate(() => scrollY)).toBe(start)
    await p.goto('/guide')
    if (width < 768) {
      await expect(p.locator('.cmp-mobile .cmp-species')).toHaveCount(4)
      for (const row of await p.locator('.cmp-mobile .cmp-species').all())
        await expect(row.locator('dt')).toHaveText(['豹紋守宮', '肥尾守宮'])
      for (const a of await p.locator('.guide-orientation-map a').all())
        expect((await a.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    } else await expect(p.getByRole('table', { name: '豹紋守宮與肥尾守宮差異' })).toBeVisible()
    await expect(p.locator('.starter-route')).toHaveCount(0)
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await c.close()
  })
}
