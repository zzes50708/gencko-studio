import { test, expect } from '@playwright/test'
async function swipe(page: any, context: any) {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 190, y: 650 }]
  })
  for (let y = 610; y >= 250; y -= 40)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}
test('品牌介紹原生滑動、導覽鍵盤隔離與離頁捲動恢復', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce'
  })
  const page = await context.newPage()
  await page.goto('/about')
  await page.waitForFunction(
    () => !!(document.querySelector('.stage') as any)?.__vueParentComponent
  )
  const scene = () =>
    page.locator('.stage').evaluate((e) => {
      let c = (e as any).__vueParentComponent
      while (c && !('currentSceneIndex' in c.setupState)) c = c.parent
      return c.setupState.currentSceneIndex
    })
  await expect(page.locator('.about-loader')).toBeHidden({ timeout: 7000 })
  expect(await scene()).toBe(0)
  await page.locator('.bottom-nav button').filter({ hasText: '工具' }).focus()
  await page.keyboard.press('ArrowDown')
  expect(await scene()).toBe(0)
  await page.locator('.stage').click({ position: { x: 30, y: 300 } })
  await swipe(page, context)
  await expect.poll(scene).toBeGreaterThan(0)
  await page.locator('.bottom-nav a[href="/home"]').click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.locator('.stage')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await page.evaluate(() => scrollTo(0, 300))
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await context.close()
})
test('Hero Lab 原生觸控推進與底部首頁入口清理', async ({ browser, baseURL }) => {
  test.setTimeout(90000)
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    isMobile: true,
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.locator('.hero-canvas-shell canvas')).toBeVisible({ timeout: 60000 })
  await page.waitForFunction(() => !!(window as any).__hero?.state)
  await swipe(page, context)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(50)
  await expect
    .poll(() => page.evaluate(() => (window as any).__hero.state().currentHeroScrollProgress))
    .toBeGreaterThan(0.001)
  await page.locator('.bottom-nav a[href="/home"]').click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.locator('.hero-canvas-shell')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => !!(window as any).__hero)).toBe(false)
  expect(await page.evaluate(() => document.body.classList.contains('hero-lab-active'))).toBe(false)
  await context.close()
})

test('桌面場景鍵盤切換與隱藏入口隔離', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about')
  await page.waitForFunction(
    () => !!(document.querySelector('.stage') as any)?.__vueParentComponent
  )
  const stage = page.locator('.stage')
  await stage.focus()
  await page.keyboard.press('ArrowDown')
  await expect
    .poll(() =>
      page.locator('.dot--active').evaluate((e) => Array.from(e.parentElement!.children).indexOf(e))
    )
    .toBe(1)
  expect(
    await page
      .locator('.scene-ui .scene-block')
      .evaluateAll((items) =>
        items
          .filter((e) => e.getAttribute('aria-hidden') === 'true')
          .every((e) => e.hasAttribute('inert'))
      )
  ).toBe(true)
  await page.keyboard.press('ArrowUp')
  await expect
    .poll(() =>
      page.locator('.dot--active').evaluate((e) => Array.from(e.parentElement!.children).indexOf(e))
    )
    .toBe(0)
  await page.getByRole('link', { name: '直接進入官網', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
})
test('Hero Lab 替代入口返回清除根頁樣式', async ({ page }) => {
  test.setTimeout(90000)
  await page.goto('/hero-lab')
  await expect(page.locator('.hero-canvas-shell canvas')).toBeVisible({ timeout: 60000 })
  await page.getByRole('link', { name: '前往首頁', exact: true }).click()
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.locator('.hero-canvas-shell')).toHaveCount(0)
  expect(
    await page.evaluate(() => document.documentElement.classList.contains('hero-lab-active-root'))
  ).toBe(false)
  await expect
    .poll(() => page.evaluate(() => document.documentElement.style.overflow))
    .not.toBe('hidden')
})

test('DNA 裝飾遵守減少動態設定，恢復一般模式會繼續動畫', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about')
  const dna = page.locator('.dna-decor')
  await expect(dna).toBeVisible()
  await page.waitForFunction(
    () => !!(document.querySelector('.dna-decor') as any)?.__vueParentComponent
  )
  const before = await dna.evaluate((e) => (e as HTMLCanvasElement).toDataURL())
  await page.waitForTimeout(160)
  expect(await dna.evaluate((e) => (e as HTMLCanvasElement).toDataURL())).toBe(before)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect
    .poll(() => dna.evaluate((e) => (e as HTMLCanvasElement).toDataURL()))
    .not.toBe(before)
})
