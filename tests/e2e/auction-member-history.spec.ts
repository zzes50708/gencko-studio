import { test, expect } from '@playwright/test'

async function profile(page: any, bids: any, auctions: any[]) {
  const now = Date.now()
  await page.route('**/api/server-time', (r: any) => r.fulfill({ json: { serverTime: now } }))
  await page.route('**/rest/v1/rpc/get_my_auction_bids**', (r: any) => {
    const url = new URL(r.request().url())
    const offset = Number(url.searchParams.get('offset') || 0)
    const limit = Number(url.searchParams.get('limit') || 1000)
    return r.fulfill({ json: Array.isArray(bids) ? bids.slice(offset, offset + limit) : bids })
  })
  await page.route('**/rest/v1/rpc/my_auction_outcomes', (r: any) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/auctions?**', (r: any) => r.fulfill({ json: auctions }))
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async () => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    await g.$pinia._s.get('main').checkAuthStatus()
    const user = { id: 'HISTORY-MEMBER', app_metadata: { provider: 'custom:line-oauth' } }
    g.$supabase.client.auth.getSession = async () => ({ data: { session: { user } }, error: null })
    g.$pinia._s.get('main').currentUser = { id: user.id, type: 'line', authSource: 'supabase' }
  })
  await page.getByRole('button', { name: /^競標/ }).click()
}

test('會員紀錄超過千筆仍有完整自己的最高價與次數，無照片不打失效佔位圖', async ({ page }) => {
  let placeholderRequests = 0
  await page.route('**/placeholder.jpg', (r) => {
    placeholderRequests++
    return r.fulfill({ status: 404, body: '' })
  })
  const bids = Array.from({ length: 1201 }, (_, i) => ({
    auction_id: 'HISTORY',
    amount: 200 + i,
    bid_time: new Date(Date.now() - i * 1000).toISOString()
  }))
  await profile(page, bids, [
    {
      id: 'HISTORY',
      morph: '會員完整紀錄',
      status: 'active',
      end_time: '2035-01-01T00:00:00Z',
      images: []
    }
  ])
  const card = page.locator('.bid-card').filter({ hasText: '會員完整紀錄' })
  await expect(card).toContainText('您共出價了 1201 次')
  await expect(card).toContainText('我的最高出價')
  await expect(card).toContainText('1400')
  expect(placeholderRequests).toBe(0)
  await expect(card).toContainText('尚無個體照片')
  await expect(card).not.toContainText('文章圖片未提供')
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'output/auction-member-history-1440.png', fullPage: true })
})

test('會員紀錄空回執顯示錯誤，不能冒充沒有出價', async ({ page }) => {
  await profile(page, null, [])
  await expect(page.getByText('競標紀錄暫時無法載入，請稍後重試。', { exact: true })).toBeVisible()
  await expect(page.locator('.bid-list')).toHaveCount(0)
})

test('會員紀錄依伺服器時間及場次狀態區分預約、暫停與結標', async ({ page }) => {
  const now = Date.now()
  await page.clock.setFixedTime(now + 3 * 86400000)
  const auctions = [
    {
      id: 'SCHEDULED',
      morph: '會員預約',
      status: 'active',
      start_time: new Date(now + 3600000).toISOString(),
      end_time: new Date(now + 7200000).toISOString()
    },
    {
      id: 'PAUSED',
      morph: '會員暫停',
      status: 'paused',
      end_time: new Date(now + 7200000).toISOString()
    },
    {
      id: 'ACTIVE',
      morph: '會員競標中',
      status: 'active',
      end_time: new Date(now + 7200000).toISOString()
    }
  ]
  await profile(
    page,
    auctions.map((a) => ({ auction_id: a.id, amount: 200, bid_time: new Date(now).toISOString() })),
    auctions
  )
  await expect(page.locator('.bid-card').filter({ hasText: '會員預約' })).toContainText('尚未開標')
  await expect(page.locator('.bid-card').filter({ hasText: '會員暫停' })).toContainText('暫停競標')
  await expect(page.locator('.bid-card').filter({ hasText: '會員競標中' })).toContainText('競標中')
  await expect(
    page.locator('.bid-card').filter({ hasText: '會員競標中' }).locator('.status-badge')
  ).toHaveClass(/s-res/)
  await expect(
    page.locator('.bid-card').filter({ hasText: '會員暫停' }).locator('.status-badge')
  ).toHaveClass(/s-sold/)
})

test('會員紀錄在開標與截止邊界自行更新，不用重新整理', async ({ page }) => {
  const now = Date.now()
  await page.clock.install({ time: now })
  await profile(
    page,
    [{ auction_id: 'BOUNDARY', amount: 200, bid_time: new Date(now).toISOString() }],
    [
      {
        id: 'BOUNDARY',
        morph: '會員時間邊界',
        status: 'active',
        start_time: new Date(now + 5000).toISOString(),
        end_time: new Date(now + 10000).toISOString()
      }
    ]
  )
  const card = page.locator('.bid-card').filter({ hasText: '會員時間邊界' })
  await expect(card).toContainText('尚未開標')
  await page.clock.fastForward(6000)
  await expect(card).toContainText('競標中')
  await page.clock.fastForward(5000)
  await expect(card).toContainText('已結標')
})

test('同帳號重新查核不清空歷史；背景更新等待時保留卡片，登出後清除', async ({ page }) => {
  await profile(
    page,
    [{ auction_id: 'PRESERVE', amount: 200, bid_time: new Date().toISOString() }],
    [{ id: 'PRESERVE', morph: '會員保留紀錄', status: 'active', end_time: '2035-01-01T00:00:00Z' }]
  )
  const card = page.locator('.bid-card').filter({ hasText: '會員保留紀錄' })
  await expect(card).toBeVisible()
  let calls = 0
  let release: (() => void) | undefined
  await page.route('**/rest/v1/rpc/get_my_auction_bids**', async (r) => {
    calls++
    await new Promise<void>((resolve) => {
      release = resolve
    })
    return r.fulfill({ json: [] })
  })
  await page.evaluate(() => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.currentUser = { ...store.currentUser, name: '同帳號新名稱' }
  })
  await page.waitForTimeout(100)
  expect(calls).toBe(0)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect.poll(() => calls).toBe(1)
  await expect(card).toBeVisible()
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = null
  })
  await expect(card).toHaveCount(0)
  release!()
})
