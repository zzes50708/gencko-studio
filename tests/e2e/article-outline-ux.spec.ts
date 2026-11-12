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
      await expect(page.getByRole('navigation', { name: '文章章節' })).toBeVisible()
    })
    test('底部章節按鈕不遮住手機導覽，長標題不推寬', async ({ page }) => {
      const navigation = page.getByRole('navigation', { name: '文章章節' })
      await navigation.getByRole('button').nth(1).focus()
      const bounds = await navigation.evaluate((element) => {
        const box = element.getBoundingClientRect()
        const dock = document.querySelector('.bottom-nav')?.getBoundingClientRect()
        return {
          bottom: box.bottom,
          viewport: innerHeight,
          dockTop: dock && dock.height ? dock.top : innerHeight,
          position: getComputedStyle(element).position,
          overflow: document.documentElement.scrollWidth > innerWidth
        }
      })
      expect(bounds.position).toBe('fixed')
      expect(bounds.bottom).toBeLessThanOrEqual(bounds.dockTop)
      expect(bounds.viewport - bounds.bottom).toBeLessThan(110)
      expect(bounds.overflow).toBe(false)
      expect(
        await navigation.getByRole('button').evaluateAll((buttons) =>
          buttons.every((button) => {
            const box = button.getBoundingClientRect()
            return box.left >= 0 && box.right <= innerWidth && box.height >= 44
          })
        )
      ).toBe(true)
      await expect(page.getByRole('combobox', { name: '跳至文章章節' })).toHaveCount(0)
    })
    test('可跳到章節，回頂端後可再次選相同章節', async ({ page }) => {
      const button = page.getByRole('navigation', { name: '文章章節' }).getByRole('button').nth(1)
      const heading = page.locator('.reader-content h2').nth(1)
      await button.click()
      await expect.poll(async () => (await heading.boundingBox())!.y).toBeGreaterThanOrEqual(0)
      await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(150)
      await expect(heading).toBeFocused()
      await expect(page.locator('.reader-outline')).toBeInViewport()
      expect(
        await heading.evaluate((element) => {
          const control = document.querySelector('.reader-outline')!
          return element.getBoundingClientRect().top < control.getBoundingClientRect().top
        })
      ).toBe(true)
      await page.mouse.move(20, 300)
      await page.mouse.wheel(0, -10000)
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(5)
      await button.click()
      await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(150)
      await expect(heading).toBeFocused()
    })
    test('正文重新渲染且沒有標題 ID 時仍可跳轉第一章及後續章節', async ({ page }) => {
      const buttons = page.getByRole('navigation', { name: '文章章節' }).getByRole('button')
      // 模擬 v-html 重建正文，不保留事後補上的 DOM 屬性。
      await page.locator('.reader-content').evaluate((element) => {
        element.querySelectorAll('h2, h3').forEach((heading) => heading.removeAttribute('id'))
        element.innerHTML = element.innerHTML
      })
      for (const index of [0, 2]) {
        await buttons.nth(index).click()
        const heading = page.locator('.reader-content :is(h2, h3)').nth(index)
        await expect.poll(async () => (await heading.boundingBox())!.y).toBeLessThan(150)
        await expect.poll(async () => (await heading.boundingBox())!.y).toBeGreaterThanOrEqual(0)
        await expect(heading).toBeFocused()
      }
    })
  })
}
