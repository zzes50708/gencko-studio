import { test, expect } from '@playwright/test'

// 此檔需對正式建置執行；開發模式依專案設定不註冊 Service Worker。
test('正式PWA即使有舊快取，離線也不能回傳舊競價資料', async ({ browser, baseURL }) => {
  test.setTimeout(60000)
  const context = await browser.newContext({ baseURL })
  try {
    const page = await context.newPage()
    await page.goto('/auction/TEST-AUCTION-20261016-01')
    await page.evaluate(async () => {
      await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)
    const urls = ['auctions', 'auction_bids', 'articles'].map(
      (table) => `https://sfndneptcwhblvrxykcy.supabase.co/rest/v1/${table}?select=id&limit=1`
    )
    await page.evaluate(async (urls) => {
      const cache = await caches.open('supabase-api-cache')
      for (const url of urls)
        await cache.put(
          url,
          new Response('[{"id":"STALE-CACHE"}]', {
            headers: { 'content-type': 'application/json' }
          })
        )
    }, urls)
    await context.setOffline(true)
    const results = await page.evaluate(async (urls) => {
      const results = []
      for (const url of urls) {
        try {
          results.push(await (await fetch(url)).text())
        } catch {
          results.push('network-error')
        }
      }
      return results
    }, urls)
    expect(results).toEqual(['network-error', 'network-error', '[{"id":"STALE-CACHE"}]'])
  } finally {
    await context.close()
  }
})

test('時間API不快取，回傳伺服器時間而非裝置日期', async ({ request }) => {
  const before = Date.now()
  const response = await request.get('/api/server-time')
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  const data = await response.json()
  expect(data.serverTime).toBeGreaterThanOrEqual(before - 1000)
  expect(data.serverTime).toBeLessThanOrEqual(Date.now() + 1000)
})
