import { test, expect } from '@playwright/test'
import { FEED_FREQ, SUPPLEMENTS } from '../../utils/care'

if (process.env.UX_BASE_URL) test.use({ baseURL: process.env.UX_BASE_URL })
for (const width of [320, 390, 768, 1440]) {
  test(`介紹與飼養 ${width}px 保留完整資料並可閱讀`, async ({ browser, baseURL }) => {
    // 同一案例檢查兩頁及大量欄位；保留逐項斷言期限，另給瀏覽器關閉資源的時間。
    test.setTimeout(90000)
    const c = await browser.newContext({
        baseURL,
        serviceWorkers: 'block',
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
    const trail = p.getByRole('navigation', { name: '飼養章節導覽' })
    await trail.getByRole('link', { name: /餵食營養/ }).click()
    const y = await p.locator('#food').evaluate((e) => e.getBoundingClientRect().top)
    const navBottom = await trail.evaluate((e) => e.getBoundingClientRect().bottom)
    expect(y).toBeGreaterThanOrEqual(Math.max(0, navBottom) - 2)
    expect(y).toBeLessThan(Math.max(160, navBottom + 80))
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
