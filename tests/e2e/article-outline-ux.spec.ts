import { test, expect } from '@playwright/test'

for (const width of [375, 430, 1440, 1920]) {
  test.describe(`文章章節 ${width}px`, () => {
    test.use({
      viewport: { width, height: 900 },
      isMobile: width < 768,
      hasTouch: width < 768,
      serviceWorkers: 'block'
    })
    test.beforeEach(async ({ page }) => {
      const paragraphs = '<p>章節定位測試文字，維持完整段落與閱讀高度。</p>'.repeat(18)
      const article = {
        id: 'OUTLINE-UX',
        status: 'Published',
        title: '章節跳轉測試',
        content: `${paragraphs}<h2>第一章</h2>${paragraphs}<h2>第二章${'很長的章節標題'.repeat(18)}</h2>${paragraphs}<h3>第三章</h3>${paragraphs}`
      }
      await page.route('**/rest/v1/*articles**', (route) =>
        route.fulfill({
          json: new URL(route.request().url()).searchParams.has('id') ? article : [article]
        })
      )
      await page.route('**/rest/v1/*genetic_pages**', (route) => route.fulfill({ json: [] }))
      await page.goto('/certificates')
      await page.waitForFunction(
        () =>
          !!(document.querySelector('#__nuxt') as any)?.__vue_app__?.config.globalProperties
            .$nuxt &&
          !(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$nuxt
            .isHydrating
      )
      await page.evaluate(() =>
        (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
          '/articles/OUTLINE-UX'
        )
      )
      await expect(page.getByRole('combobox', { name: '跳至文章章節' })).toBeVisible()
    })
    test('選單與焦點邊框留在閱讀器內，長標題不推寬', async ({ page }) => {
      const select = page.getByRole('combobox', { name: '跳至文章章節' })
      await select.focus()
      const bounds = await select.evaluate((element) => {
        const box = element.getBoundingClientRect(),
          container = element.closest('.reader-container')!.getBoundingClientRect()
        return {
          rightGap: container.right - box.right,
          leftGap: box.left - container.left,
          overflow: document.documentElement.scrollWidth > innerWidth
        }
      })
      expect(bounds.rightGap).toBeGreaterThanOrEqual(2)
      expect(bounds.leftGap).toBeGreaterThanOrEqual(2)
      expect(bounds.overflow).toBe(false)
    })
    test('可跳到章節，回頂端後可再次選相同章節', async ({ page }) => {
      const select = page.getByRole('combobox', { name: '跳至文章章節' })
      const heading = page.locator('.reader-content h2').nth(1)
      const option = (await select.locator('option').all()).at(2)!
      const value = await option.getAttribute('value')
      await select.selectOption(value!)
      await expect.poll(async () => (await heading.boundingBox())!.y).toBeGreaterThanOrEqual(0)
      await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(150)
      await expect(heading).toBeFocused()
      await page.mouse.move(20, 300)
      await page.mouse.wheel(0, -10000)
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(5)
      await select.selectOption(value!)
      await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(150)
      await expect(heading).toBeFocused()
    })
    test('正文重新渲染且沒有標題 ID 時仍可跳轉第一章及後續章節', async ({ page }) => {
      const select = page.getByRole('combobox', { name: '跳至文章章節' })
      // 模擬 v-html 重建正文，不保留事後補上的 DOM 屬性。
      await page.locator('.reader-content').evaluate((element) => {
        element.querySelectorAll('h2, h3').forEach((heading) => heading.removeAttribute('id'))
        element.innerHTML = element.innerHTML
      })
      for (const index of [0, 2]) {
        const value = await select
          .locator('option')
          .nth(index + 1)
          .getAttribute('value')
        await select.selectOption(value!)
        const heading = page.locator('.reader-content :is(h2, h3)').nth(index)
        await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(150)
        await expect.poll(async () => (await heading.boundingBox())!.y).toBeGreaterThanOrEqual(0)
        await expect(heading).toBeFocused()
      }
    })
  })
}
