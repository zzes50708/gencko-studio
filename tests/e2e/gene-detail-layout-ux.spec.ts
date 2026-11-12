import { test, expect } from '@playwright/test'

for (const width of [320, 390, 768, 1440]) {
  test(`${width}px 詞條長資料完整換行且工具入口可操作`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const gene = {
      name: '長詞條' + 'LongGeneName'.repeat(8),
      inheritance_mode: 'PolygenicLineBred'.repeat(12),
      discovery_year: '尚待資料考證',
      brief: '外觀與遺傳判斷須配合完整紀錄。',
      detail: '完整保留既有詞條說明。',
      image_url: '/images/home-gecko.webp',
      source: 'https://example.org/' + 'LongSource'.repeat(20)
    }
    await page.route('**/rest/v1/*genetic_pages**', (route) =>
      route.fulfill({
        json: new URL(route.request().url()).searchParams.has('name') ? gene : [gene]
      })
    )
    await page.goto('/certificates')
    await page.waitForFunction(() => {
      const app = (document.querySelector('#__nuxt') as any)?.__vue_app__
      return app && !app.config.globalProperties.$nuxt.isHydrating
    })
    await page.evaluate(
      (name) =>
        (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
          '/genes/' + encodeURIComponent(name)
        ),
      gene.name
    )
    await expect(page.locator('h1')).toHaveText(gene.name)
    const metrics = await page
      .locator('.gene-title, .gene-facts dd, .source-text')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect()
          return { x: r.x, right: r.right, overflow: el.scrollWidth > el.clientWidth + 1 }
        })
      )
    expect(metrics.every((m) => m.x >= 0 && m.right <= width && !m.overflow)).toBe(true)
    await expect(page.locator('.source-text a')).toHaveAttribute('href', gene.source)
    const calculator = page.getByRole('link', { name: '前往基因計算機', exact: true })
    const box = (await calculator.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(box.height).toBeGreaterThanOrEqual(44)
    await calculator.click()
    await expect(page).toHaveURL(/\/calculator$/)
  })
}
