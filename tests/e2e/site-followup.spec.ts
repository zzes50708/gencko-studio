import { test, expect } from '@playwright/test'

async function ready(page) {
  await page.waitForFunction(() => {
    const app = document.querySelector('#__nuxt')?.__vue_app__?.config.globalProperties.$nuxt
    return app && !app.isHydrating
  })
}
async function navigate(page, path) {
  await page.evaluate(
    (target) =>
      document.querySelector('#__nuxt').__vue_app__.config.globalProperties.$router.push(target),
    path
  )
}

test('收藏匯入合併且損壞檔案不清空原有收藏', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gencko_wishlist', '["EXISTING"]'))
  await page.goto('/profile')
  await ready(page)
  const upload = page.getByLabel('匯入 Gencko 收藏備份')
  await upload.setInputFiles({
    name: 'favorites.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'gencko-favorites',
        version: 1,
        animals: ['NEW', 'EXISTING'],
        hospitals: ['H-1']
      })
    )
  })
  await expect(page.getByRole('status').filter({ hasText: '已合併收藏' })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gencko_wishlist')))).toEqual([
    'EXISTING',
    'NEW'
  ])
  await upload.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{')
  })
  await expect(page.getByRole('status').filter({ hasText: '檔案無法讀取' })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('gencko_wishlist')))).toEqual([
    'EXISTING',
    'NEW'
  ])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('證書列印等待照片完成，避免慢網路印出空白照片', async ({ page }) => {
  let release: () => void = () => {}
  const wait = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/rest/v1/*animals?**', (route) =>
    route.fulfill({
      json: {
        id: 'PRINT-TEST',
        morph: '測試',
        gender_type: '公',
        birthday: '2026-01-01',
        image_url: 'https://example.com/print-test.png'
      }
    })
  )
  await page.route(/(?:wsrv\.nl.*print-test|example\.com\/print-test)/, async (route) => {
    await wait
    await route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDesAAAAASUVORK5CYII=',
        'base64'
      )
    })
  })
  await page.goto('/certificates')
  await ready(page)
  await page.evaluate(() => {
    window.print = () => {
      window.__printed = true
    }
  })
  await navigate(page, '/identity/PRINT-TEST')
  const print = page.getByRole('button', { name: '儲存個體證書為 PDF', exact: true })
  await print.click()
  await expect(print).toBeDisabled()
  expect(await page.evaluate(() => !!window.__printed)).toBe(false)
  release()
  await expect.poll(() => page.evaluate(() => !!window.__printed)).toBe(true)
  await expect(print).toBeEnabled()
})

test('手機分享配置優先於舊草稿，還原後仍須確認生成', async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 850 },
    isMobile: true,
    hasTouch: true,
    serviceWorkers: 'block'
  })
  await context.addInitScript(() =>
    sessionStorage.setItem('gencko-cabinet-draft-v1', JSON.stringify({ boxVariant: 'a4', rows: 2 }))
  )
  const page = await context.newPage()
  const hash = new URLSearchParams({
    cabinet: JSON.stringify({
      version: 1,
      boxVariant: 'a6',
      rows: 6,
      columns: 3,
      finish: 'stone',
      storageHeight: 25
    })
  })
  await page.goto('/merch#' + hash)
  await page.getByRole('button', { name: '開啟 3D 客製模擬系統', exact: true }).tap()
  await expect(page.getByRole('button', { name: '層數', exact: true })).toContainText('6')
  await expect(page.getByRole('button', { name: '每層抽數', exact: true })).toContainText('3')
  await expect(page.getByRole('button', { name: '確認生成模型', exact: true })).toBeVisible()
  await expect(page.locator('.cabinet-workspace canvas')).toHaveCount(0)
  await context.close()
})

test('回報失敗會重送，換頁耗時標示目前頁面且不含私密錯誤內容', async ({ page }) => {
  const batches: any[] = []
  await page.addInitScript(() => {
    Math.random = () => 0.01
  })
  await page.route('**/api/telemetry', async (route) => {
    batches.push(route.request().postDataJSON())
    await route.fulfill({ status: batches.length === 1 ? 503 : 204, body: '' })
  })
  await page.goto('/certificates')
  await ready(page)
  await page.evaluate(() =>
    window.dispatchEvent(
      new ErrorEvent('error', { error: new Error('PRIVATE_CUSTOMER_INFORMATION') })
    )
  )
  await navigate(page, '/faq')
  await expect.poll(() => batches.length, { timeout: 15000 }).toBeGreaterThanOrEqual(2)
  const events = batches.flatMap((batch) => batch.events)
  expect(events.some((event) => event.type === 'script_error')).toBe(true)
  expect(
    events.some(
      (event) => event.type === 'route_render' && event.route === '/faq' && event.scope === 'route'
    )
  ).toBe(true)
  expect(JSON.stringify(events)).not.toContain('PRIVATE_CUSTOMER_INFORMATION')
})

test('桌面分享按鈕在剪貼簿被拒絕時仍提供可複製的還原連結', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', '手機配置還原由獨立觸控情境驗證。')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('denied')) }
    })
  })
  await page.goto('/merch')
  await page.getByRole('button', { name: '分享配置', exact: true }).click()
  const link = page.getByRole('textbox', { name: '配置分享連結', exact: true })
  await expect(link).toBeVisible()
  await expect(link).toHaveValue(/\/merch#cabinet=/)
  expect(await link.inputValue()).not.toContain('undefined')
})
