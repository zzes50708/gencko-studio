import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

async function ready(page: Page) {
  await page.waitForFunction(() => {
    const app = (document.querySelector('#__nuxt') as any)?.__vue_app__?.config?.globalProperties
      ?.$nuxt
    return app && !app.isHydrating
  })
}
async function navigate(page: Page, path: string) {
  await page.evaluate(
    (path) =>
      (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
        path
      ),
    path
  )
}

test('根路由 SSR 提供品牌標題與選購入口', async ({ request }) => {
  const response = await request.get('/')
  const html = await response.text()
  expect(response.status()).toBe(200)
  expect(html).toMatch(/<h1[^>]*>Gencko Studio/)
  expect(html).toContain('href="/shop"')
  expect(response.headers()['content-security-policy']).not.toContain('unsafe-eval')
})

test('找不到的證書回傳 404，且錯誤仍可返回搜尋', async ({ page }) => {
  const response = await page.goto('/identity/AUDIT-NOT-FOUND')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '無法顯示個體證書' })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('證書搜尋不預載其他頁面的完整目錄', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (request) => {
    if (/\/rest\/v1\/(animals|genetic_pages|auctions|merchandise)(?:\?|$)/.test(request.url()))
      requests.push(request.url())
  })
  await page.goto('/certificates')
  await ready(page)
  await page.waitForTimeout(1000)
  expect(requests).toEqual([])
})

test('登入接續頁只有一個 main', async ({ page }) => {
  await page.goto('/line-login-return')
  await ready(page)
  await expect(page.locator('main')).toHaveCount(1)
})

test('客製設備清楚標示規劃中、尚未販售與台灣地區限制', async ({ page, request }) => {
  const response = await request.get('/merch')
  const html = await response.text()
  expect(html).toContain('尚未開始販售')
  expect(html).toContain('僅限台灣地區購買')
  await page.goto('/merch')
  await ready(page)
  await expect(page.getByRole('note', { name: '販售狀態與購買地區' })).toContainText('規劃中')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /尚未開始販售.*僅限台灣地區購買/
  )
})

test('正式網域追蹤只排入清理後頁覽，敏感頁停用 GA', async ({ page, baseURL }) => {
  // 以本機頁面回應正式來源，GA 腳本使用空白替身，不發送真實分析資料。
  await page.route('https://www.genckobreeding.com/**', async (route) => {
    const source = new URL(route.request().url())
    const response = await route.fetch({ url: `${baseURL}${source.pathname}${source.search}` })
    await route.fulfill({ response })
  })
  await page.route('https://www.googletagmanager.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: '' })
  )
  await page.goto('https://www.genckobreeding.com/faq?q=PRIVATE_SEARCH&code=SECRET#PRIVATE_TOKEN')
  await ready(page)
  await page.waitForFunction(() =>
    (window as any).dataLayer?.some(
      (entry: any) => entry[0] === 'event' && entry[1] === 'page_view'
    )
  )
  const sent = await page.evaluate(() =>
    Array.from((window as any).dataLayer, (entry: any) => Array.from(entry))
  )
  expect(JSON.stringify(sent)).not.toMatch(/PRIVATE_SEARCH|SECRET|PRIVATE_TOKEN/)
  await navigate(page, '/line-login-return?flow=PRIVATE_FLOW')
  await expect
    .poll(() =>
      page.evaluate(() =>
        Object.entries(window)
          .filter(([key]) => key.startsWith('ga-disable-'))
          .map(([, value]) => value)
      )
    )
    .toContain(true)
  expect(await page.evaluate(() => JSON.stringify((window as any).dataLayer))).not.toContain(
    'PRIVATE_FLOW'
  )
})

test('瀏覽器拒絕儲存時仍能顯示搜尋頁', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', {
      value() {
        throw new DOMException('blocked', 'SecurityError')
      }
    })
    Object.defineProperty(Storage.prototype, 'removeItem', {
      value() {
        throw new DOMException('blocked', 'SecurityError')
      }
    })
    Object.defineProperty(Storage.prototype, 'setItem', {
      value() {
        throw new DOMException('blocked', 'SecurityError')
      }
    })
  })
  await page.goto('/certificates')
  await ready(page)
  await expect(page.getByRole('button', { name: '搜尋個體證書' })).toBeEnabled()
  await expect(page.getByText('頁面發生錯誤', { exact: true })).toHaveCount(0)
})

test('不安全文章被清理，長網址及寬表格不撐破頁面', async ({ page }) => {
  const article = {
    id: 'AUDIT-HTML',
    title: '稽核測試文章',
    category: '環境佈置',
    status: 'published',
    author: 'Gencko Studio',
    publish_date: '2026-10-30',
    image_url: '',
    summary: '測試摘要',
    content:
      '<h2>第一章</h2><p>' +
      'https://example.com/' +
      'long-url-'.repeat(100) +
      '</p><table><tr><td>' +
      '很長資料'.repeat(100) +
      '</td></tr></table><img src="/logo.png" onerror="window.auditInjected=1"><script>window.auditInjected=1</script>'
  }
  await page.route('**/rest/v1/articles**', (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has('id') ? article : [article]
    })
  )
  await page.goto('/certificates')
  await ready(page)
  await navigate(page, '/articles/AUDIT-HTML')
  await expect(page.locator('.reader-content h2')).toHaveText('第一章')
  expect(await page.evaluate(() => (window as any).auditInjected)).toBeUndefined()
  await expect(page.locator('.reader-content [onerror], .reader-content script')).toHaveCount(0)
  await expect(page.locator('.reader-content img')).toHaveAttribute('loading', 'lazy')
  const sizes = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    text: document.querySelector('.reader-content')!.getBoundingClientRect().right
  }))
  expect(sizes.document).toBeLessThanOrEqual(sizes.width + 1)
  expect(sizes.text).toBeLessThanOrEqual(sizes.width)
})

for (const path of [
  '/home',
  '/shop',
  '/genes',
  '/care',
  '/calculator',
  '/hospital',
  '/buying-guide'
]) {
  test(`${path} 主要版面與互動入口正常`, async ({ page }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(path)
    await ready(page)
    await page.waitForTimeout(path === '/hospital' ? 1500 : 600)
    await expect(page.locator('main h1').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
    expect(errors).toEqual([])
    await page.screenshot({
      path: `output/site-audit-release-${testInfo.project.name}-${path.slice(1)}.png`
    })
  })
}

for (const width of [375, 430, 768]) {
  test(`${width}px 商城、閱讀入口及篩選不水平溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/shop')
    await ready(page)
    await expect(page.locator('.flip-card').first()).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true
    )
    if (width < 768) {
      await page.getByRole('button', { name: '篩選', exact: true }).click()
      await expect(page.getByRole('dialog', { name: '篩選條件' })).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
      ).toBe(true)
    }
  })
}
