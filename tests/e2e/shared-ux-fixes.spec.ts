import { expect, test } from '@playwright/test'

async function getStore(page: any, action: string) {
  await page.waitForFunction(
    () => !!(document.querySelector('.sticky-nav') as any)?.__vueParentComponent
  )
  await page.evaluate((code: string) => {
    let component = (document.querySelector('.sticky-nav') as any).__vueParentComponent
    while (component && !component.setupState.store) component = component.parent
    ;(window as any).uxStore = component.setupState.store
    new Function('store', code)(component.setupState.store)
  }, action)
}

test('桌面隱藏導覽遇到焦點會顯示，進度線收起貼頂', async ({ page }) => {
  await page.goto('/home')
  await getStore(
    page,
    "store.curTab='articles';store.readingArticle={title:'共用進度測試'};store.navHidden=true"
  )
  await expect
    .poll(() =>
      page
        .locator('.reading-progress-bar')
        .evaluate((el) => Math.round(el.getBoundingClientRect().top))
    )
    .toBe(0)
  await page.locator('.nav-disclosure').first().focus()
  await expect
    .poll(() =>
      page.locator('.sticky-nav').evaluate((el) => Math.round(el.getBoundingClientRect().top))
    )
    .toBe(0)
})

test('觸控平板導覽點按範圍至少 44px 且不溢出', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 768, height: 1024 },
    hasTouch: true
  })
  const page = await context.newPage()
  await page.goto('/home')
  await expect(page.locator('.sticky-nav')).toBeVisible()
  for (const item of await page.locator('.nav-disclosure').all()) {
    const rect = (await item.boundingBox())!
    expect(rect.width).toBeGreaterThanOrEqual(44)
    expect(rect.height).toBeGreaterThanOrEqual(44)
    expect(rect.x + rect.width).toBeLessThanOrEqual(768)
  }
  for (const item of await page.locator('.nav-item-dt-link').all())
    expect((await item.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await page.locator('.nav-disclosure').first().tap()
  await expect(page.locator('.dt-dropdown.visible')).toBeVisible()
  await context.close()
})

test('手機導覽隔離背景，返回先關閉，第二次才退頁', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.goto('/home')
  await page.getByRole('link', { name: '選購個體', exact: true }).tap()
  await expect(page).toHaveURL(/\/shop$/)
  await page.waitForFunction(
    () => !!(document.querySelector('.bottom-nav') as any)?.__vueParentComponent
  )
  await page.locator('.bottom-nav button').filter({ hasText: '工具' }).tap()
  await expect(page.getByRole('dialog', { name: '工具導覽選單' })).toBeVisible()
  expect(
    await page.evaluate(() => {
      ;(document.querySelector('#main-content a') as HTMLElement)?.focus()
      return !!document.activeElement?.closest('dialog')
    })
  ).toBe(true)
  await page.goBack()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).toHaveURL(/\/shop$/)
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await page.goBack()
  await expect(page).toHaveURL(/\/home$/)
  const opacity = await page
    .locator('.bottom-nav .nav-item')
    .nth(2)
    .evaluate((el) => getComputedStyle(el).opacity)
  expect(opacity).toBe('1')
  await context.close()
})

test('圖片預覽向上或多指不關閉，單指向下才關閉', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const page = await context.newPage()
  await page.goto('/home')
  await getStore(
    page,
    "store.openLightbox({ImageURL:document.querySelector('#main-content img').src,Name:'共用手勢測試'})"
  )
  const image = page.locator('.lightbox-img')
  await expect(image).toBeVisible()
  const session = await context.newCDPSession(page)
  const swipe = async (direction: number, multi = false) => {
    const box = (await image.boundingBox())!
    const x = box.x + box.width / 2,
      y = box.y + box.height / 2
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 8; i++) {
      const points = [{ x, y: y + i * 18 * direction }]
      if (multi) points.push({ x: x + 40, y: y + i * 18 * direction })
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points })
      await page.waitForTimeout(16)
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  await swipe(-1)
  await expect(image).toBeVisible()
  await swipe(1, true)
  await expect(image).toBeVisible()
  await swipe(1)
  await expect(image).toBeHidden()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
  await session.detach()
  await context.close()
})
