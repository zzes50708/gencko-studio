import { test, expect } from '@playwright/test'
const store = (page: any) =>
  page.evaluate(() => {
    return (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main').articlesLoaded
  })
test('文章 SSR 可讀，hydration 不重複抓取摘要，正文進頁才載入', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => {
    if (r.url().includes('/rest/v1/articles')) requests.push(r.url())
  })
  const response = await page.goto('/articles')
  expect(await response!.text()).toContain('article-entry')
  await expect(page.locator('.article-entry').first()).toBeVisible()
  await expect.poll(() => store(page)).toBe(true)
  await page.waitForTimeout(500)
  expect(requests).toHaveLength(0)
  await page.locator('.article-entry').first().click()
  await expect(page.locator('.reader-content')).not.toBeEmpty()
  expect(requests.some((u) => u.includes('id=eq.'))).toBe(true)
})
test('文章失敗可重試、並行載入去重且不等待其他資料表', async ({ page }) => {
  let fail = true,
    calls = 0
  await page.route('**/rest/v1/articles*', async (r) => {
    calls++
    await r.fulfill(
      fail
        ? { status: 400, json: { message: 'test' } }
        : { json: [{ id: 'test', title: '恢復文章', status: 'published' }] }
    )
  })
  let release!: () => void
  const hold = new Promise<void>((r) => (release = r))
  await page.route('**/rest/v1/merchandise*', async (r) => {
    await hold
    await r.fulfill({ json: [] })
  })
  await page.goto('/home')
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__))
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            document.querySelector('#__nuxt') as any
          ).__vue_app__.config.globalProperties.$pinia._s.get('main').articlesError
      )
    )
    .toBeTruthy()
  fail = false
  await page.evaluate(async () => {
    const s = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    await Promise.all([s.loadArticles(), s.loadArticles()])
  })
  expect(calls).toBe(2)
  expect(await store(page)).toBe(true)
  release()
})
test('手機原生捲動保有列表分段載入與閱讀進度', async ({ browser }) => {
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const p = await c.newPage()
  await p.goto('/shop')
  await p.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__))
  await expect(p.locator('.flip-card').first()).toBeVisible()
  expect(await p.evaluate(() => (window as any).__lenis)).toBeNull()
  const before = await p.evaluate(
    () =>
      (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
        'main'
      ).displayLimit
  )
  await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  await expect
    .poll(() =>
      p.evaluate(
        () =>
          (
            document.querySelector('#__nuxt') as any
          ).__vue_app__.config.globalProperties.$pinia._s.get('main').displayLimit
      )
    )
    .toBeGreaterThan(before)
  await p.goto('/articles/ART-007')
  await expect(p.locator('.reader-content')).toBeVisible()
  await p.evaluate(() => scrollTo(0, 500))
  await expect
    .poll(() =>
      p.evaluate(
        () =>
          (
            document.querySelector('#__nuxt') as any
          ).__vue_app__.config.globalProperties.$pinia._s.get('main').readingProgress
      )
    )
    .toBeGreaterThan(0)
  await c.close()
})
test('卡片影片在背景可見性切換時暫停並恢復', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => Boolean((window as any).__hero?.state))
  await expect
    .poll(() => page.evaluate(() => (window as any).__hero.state().cardVideoPaused))
    .toBe(false)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect
    .poll(() => page.evaluate(() => (window as any).__hero.state().cardVideoPaused))
    .toBe(true)
  await page.evaluate(() => {
    delete (document as any).hidden
    delete (document as any).visibilityState
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect
    .poll(() => page.evaluate(() => (window as any).__hero.state().cardVideoPaused))
    .toBe(false)
})
test('CPU 降速手機旋轉後仍使用照片及可捲動動畫', async ({ browser }) => {
  test.setTimeout(90000)
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true
  })
  const p = await c.newPage()
  const cdp = await c.newCDPSession(p)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const videos: string[] = []
  p.on('request', (r) => {
    if (r.url().includes('/previews/') && r.url().includes('.mp4')) videos.push(r.url())
  })
  await p.goto('/')
  await p.waitForFunction(() => Boolean((window as any).__hero?.state))
  await expect
    .poll(() => p.evaluate(() => (window as any).__hero.state().cardPreviewReady), {
      timeout: 30000
    })
    .toBe(true)
  await p.setViewportSize({ width: 844, height: 390 })
  await expect(p.locator('.hero-canvas-shell canvas')).toBeVisible()
  await p.setViewportSize({ width: 390, height: 844 })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 190, y: 680 }]
  })
  for (let y = 650; y > 220; y -= 30)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect.poll(() => p.evaluate(() => scrollY)).toBeGreaterThan(0)
  expect(videos).toEqual([])
  await c.close()
})
