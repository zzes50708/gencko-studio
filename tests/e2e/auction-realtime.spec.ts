import { test, expect } from '@playwright/test'

test('第一筆出價預填起標價，與最低金額提示一致', async ({ page }) => {
  const id = 'TEST-AUCTION-20261016-01'
  const auction = {
    id,
    morph: '起標金額測試',
    status: 'active',
    start_price: 100,
    min_increment: 100,
    end_time: new Date(Date.now() + 3600000).toISOString(),
    images: []
  }
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.has('id') ? auction : [auction] })
  )
  await page.route('**/rest/v1/auction_bids?**', (r) => r.fulfill({ json: [] }))
  await page.goto(`/auction/${id}`)
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async () => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    await store.checkAuthStatus()
    store.currentUser = { id: 'TEST-MEMBER', type: 'google', email: 'test@example.invalid' }
  })
  const input = page.getByRole('spinbutton', { name: '出價金額', exact: true })
  await expect(input).toHaveAttribute('min', '100')
  await expect(input).toHaveValue('100')
  await expect(page.locator('.bid-hint')).toContainText('NT$ 100')
})

for (const skew of [2, -2]) {
  test(`裝置${skew > 0 ? '快' : '慢'}兩天仍依伺服器時間顯示競標與48小時保留期限`, async ({
    page
  }) => {
    const serverNow = Date.now()
    await page.clock.setFixedTime(serverNow + skew * 86400000)
    await page.route('**/api/server-time', (r) => r.fulfill({ json: { serverTime: serverNow } }))
    await page.routeWebSocket('**/realtime/v1/websocket**', () => {})
    let cutoff = ''
    await page.route('**/rest/v1/auctions?**', (r) => {
      cutoff = new URL(r.request().url()).searchParams.get('end_time') || cutoff
      return r.fulfill({
        json: [
          {
            id: 'CLOCK-ACTIVE',
            morph: '正確時間競標',
            status: 'active',
            start_price: 100,
            end_time: new Date(serverNow + 120000).toISOString(),
            images: []
          },
          {
            id: 'CLOCK-RECENT',
            morph: '正確時間結標',
            status: 'ended',
            start_price: 100,
            end_time: new Date(serverNow - 47 * 3600000).toISOString(),
            images: []
          }
        ]
      })
    })
    await page.route('**/rest/v1/auction_bids?**', (r) => r.fulfill({ json: [] }))
    await page.goto('/auction')
    await expect(
      page.getByRole('link', { name: '查看 正確時間競標 競標詳情', exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: '查看 正確時間結標 競標詳情', exact: true })
    ).toBeVisible()
    await expect(page.getByRole('timer', { name: '競標剩餘時間' })).toContainText(/00:0[12]:/)
    expect(
      Math.abs(Date.parse(cutoff.replace(/^gt\./, '')) - (serverNow - 48 * 3600000))
    ).toBeLessThan(5000)
    // 使用中手動改系統日期，不得讓倒數或保留期限跳動。
    await page.clock.setFixedTime(serverNow + 10 * 86400000)
    await expect(page.getByRole('timer', { name: '競標剩餘時間' })).toContainText(/00:0[12]:/)
  })
}

test('列表收到新出價即時更新，密集事件補讀且舊事件不覆寫場次', async ({ page }) => {
  const id = 'TEST-AUCTION-20261016-01'
  const auction = {
    id,
    morph: '列表同步測試',
    animal_id: null,
    status: 'active',
    start_price: 100,
    end_time: new Date(Date.now() + 3600000).toISOString(),
    images: []
  }
  let bids = [{ id: 'L1', auction_id: id, amount: 400 }]
  let publish: undefined | (() => void)
  let stale: undefined | (() => void)
  let hold = false
  let release: undefined | (() => void)
  let auctionReads = 0
  let summaryFails = false
  let disconnect: undefined | (() => void)
  let listJoins = 0
  await page.routeWebSocket('**/realtime/v1/websocket**', (ws) => {
    ws.onMessage((raw) => {
      const msg = JSON.parse(raw.toString())
      const [join, ref, topic, event, payload] = Array.isArray(msg)
        ? msg
        : [msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload]
      const send = (event: string, payload: any) =>
        ws.send(
          JSON.stringify(
            Array.isArray(msg)
              ? [join, ref, topic, event, payload]
              : { join_ref: join, ref, topic, event, payload }
          )
        )
      if (event === 'phx_join') {
        const bindings = (payload.config?.postgres_changes || []).map((b: any, i: number) => ({
          ...b,
          id: i + 1
        }))
        send('phx_reply', { status: 'ok', response: { postgres_changes: bindings } })
        if (topic === 'realtime:auction-list-live') {
          listJoins++
          disconnect = () => ws.close({ code: 1012, reason: '測試重新連線' })
          publish = () =>
            send('postgres_changes', {
              ids: [1],
              data: {
                type: 'INSERT',
                schema: 'public',
                table: 'auction_bids',
                columns: [],
                record: {},
                old_record: {},
                commit_timestamp: new Date().toISOString()
              }
            })
        }
        if (topic === 'realtime:public:auctions')
          stale = () =>
            send('postgres_changes', {
              ids: [1],
              data: {
                type: 'UPDATE',
                schema: 'public',
                table: 'auctions',
                columns: [],
                record: { ...auction, morph: '過期事件內容' },
                old_record: {},
                commit_timestamp: new Date().toISOString()
              }
            })
      } else if (event === 'heartbeat') send('phx_reply', { status: 'ok', response: {} })
    })
  })
  await page.route('**/rest/v1/auctions?**', (r) => {
    auctionReads++
    return r.fulfill({ json: [auction] })
  })
  await page.route('**/rest/v1/auction_bids?**', async (r) => {
    const captured = [...bids]
    if (hold) {
      hold = false
      await new Promise<void>((resolve) => {
        release = resolve
      })
    }
    await r.fulfill(
      summaryFails ? { status: 400, json: { message: '測試價格讀取失敗' } } : { json: captured }
    )
  })
  await page.goto('/auction')
  await expect(page.locator('.bid-summary')).toContainText('400')
  await expect.poll(() => !!publish && !!stale).toBe(true)
  bids = [...bids, { id: 'L2', auction_id: id, amount: 700 }]
  publish!()
  await expect(page.locator('.bid-summary')).toContainText('700', { timeout: 4000 })
  hold = true
  publish!()
  await expect.poll(() => !!release).toBe(true)
  bids = [...bids, { id: 'L3', auction_id: id, amount: 900 }]
  publish!()
  release!()
  await expect(page.locator('.bid-summary')).toContainText('900', { timeout: 4000 })
  const beforeStale = auctionReads
  stale!()
  await expect.poll(() => auctionReads).toBeGreaterThan(beforeStale)
  await expect(page.locator('.morph-name')).toHaveText('列表同步測試')
  await expect(page.getByText('過期事件內容', { exact: true })).toHaveCount(0)
  summaryFails = true
  publish!()
  await expect(page.getByText('出價摘要暫時無法更新。', { exact: false })).toBeVisible()
  await expect(page.locator('.bid-summary')).toHaveCount(0)
  summaryFails = false
  bids = [...bids, { id: 'L4', auction_id: id, amount: 1100 }]
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.locator('.bid-summary')).toContainText('1,100', { timeout: 4000 })
  const previousJoins = listJoins
  bids = [...bids, { id: 'L5', auction_id: id, amount: 1300 }]
  disconnect!()
  await expect.poll(() => listJoins, { timeout: 10000 }).toBeGreaterThan(previousJoins)
  await expect(page.locator('.bid-summary')).toContainText('1,300', { timeout: 4000 })
})

test('其他人出價與延長可即時更新；讀取期間的新事件不遺漏', async ({ page }) => {
  const id = 'TEST-AUCTION-20261016-01'
  const end = Date.now() + 120000
  const auction = {
    id,
    morph: '即時同步測試',
    status: 'active',
    start_price: 100,
    min_increment: 100,
    end_time: new Date(end).toISOString(),
    images: []
  }
  let bids = [
    {
      id: 'B1',
      auction_id: id,
      amount: 400,
      user_name: '初始會員',
      bid_time: new Date().toISOString()
    }
  ]
  let publish: undefined | ((type?: 'INSERT' | 'UPDATE') => void)
  let reads = 0
  let hold = false
  let release: undefined | (() => void)
  await page.routeWebSocket('**/realtime/v1/websocket**', (ws) => {
    ws.onMessage((raw) => {
      const msg = JSON.parse(raw.toString())
      const [join, ref, topic, event, payload] = Array.isArray(msg)
        ? msg
        : [msg.join_ref, msg.ref, msg.topic, msg.event, msg.payload]
      const send = (event: string, payload: any) =>
        ws.send(
          JSON.stringify(
            Array.isArray(msg)
              ? [join, ref, topic, event, payload]
              : { join_ref: join, ref, topic, event, payload }
          )
        )
      if (event === 'phx_join') {
        const bindings = (payload.config?.postgres_changes || []).map((b: any, i: number) => ({
          ...b,
          id: i + 1
        }))
        send('phx_reply', { status: 'ok', response: { postgres_changes: bindings } })
        if (topic === `realtime:auction-detail-${id}`)
          publish = (type = 'INSERT') =>
            send('postgres_changes', {
              ids: [type === 'INSERT' ? 1 : 2],
              data: {
                schema: 'public',
                table: type === 'INSERT' ? 'auction_bids' : 'auctions',
                type,
                columns: [],
                record: {},
                old_record: {},
                commit_timestamp: new Date().toISOString(),
                errors: null
              }
            })
      } else if (event === 'heartbeat') send('phx_reply', { status: 'ok', response: {} })
    })
  })
  await page.route('**/rest/v1/auction_bids?**', async (r) => {
    reads++
    const captured = [...bids]
    if (hold) {
      hold = false
      await new Promise<void>((resolve) => {
        release = resolve
      })
    }
    await r.fulfill({ json: captured })
  })
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.has('id') ? auction : [auction] })
  )
  await page.goto(`/auction/${id}`)
  await expect(page.locator('.history-list')).toContainText('NT$ 400')
  await expect.poll(() => !!publish).toBe(true)
  const navigations = [] as string[]
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url())
  })
  bids = [...bids, { ...bids[0], id: 'B2', amount: 700, user_name: '其他會員' }]
  auction.end_time = new Date(end + 180000).toISOString()
  publish!()
  await expect(page.locator('.history-list')).toContainText('NT$ 700', { timeout: 4000 })
  await expect(page.getByText('出價紀錄 (2)', { exact: true })).toBeVisible()
  const secondsRemaining = async () => {
    const value = await page.locator('.timer-value').innerText()
    const clock = value.match(/(\d+):(\d+):(\d+)/)
    return clock ? Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3]) : 0
  }
  await expect.poll(secondsRemaining, { timeout: 4000 }).toBeGreaterThan(180)
  const previousReads = reads
  hold = true
  publish!()
  await expect.poll(() => reads > previousReads && !!release).toBe(true)
  bids = [...bids, { ...bids[0], id: 'B3', amount: 900, user_name: '第二位會員' }]
  publish!()
  release!()
  await expect(page.locator('.history-list')).toContainText('NT$ 900', { timeout: 4000 })
  auction.end_time = new Date(end + 360000).toISOString()
  publish!('UPDATE')
  await expect.poll(secondsRemaining, { timeout: 4000 }).toBeGreaterThan(360)
  auction.status = 'ended'
  publish!('UPDATE')
  await expect(page.locator('.timer-value')).toHaveText('已結標', { timeout: 4000 })
  expect(navigations).toHaveLength(0)
})
