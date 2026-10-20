import { test, expect } from '@playwright/test'

async function member(page: any, id: string | null) {
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async (id: string | null) => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    await store.checkAuthStatus()
    store.currentUser = id
      ? {
          id,
          type: 'google',
          email: 'admin@example.invalid',
          name: '測試管理員',
          auctionAdmin: true
        }
      : null
  }, id)
}

test('管理列表可搜尋及篩選，同一會員出價合併且保留完整紀錄', async ({ page }) => {
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [
        {
          id: 'TEST-OPEN',
          morph: '測試開放',
          status: 'active',
          start_price: 100,
          end_time: '2030-01-01T00:00:00Z'
        },
        {
          id: 'TEST-END',
          morph: '測試結束',
          status: 'ended',
          start_price: 100,
          end_time: '2020-01-01T00:00:00Z'
        }
      ]
    })
  )
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) =>
    r.fulfill({ json: { enabled: true, outcome: null } })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) =>
    r.fulfill({
      json: [
        {
          id: 'B1',
          user_id: 'MEMBER-1',
          user_name: '測試會員',
          amount: 500,
          bid_time: '2026-10-16T07:00:00Z',
          contact_provider: 'line',
          line_user_id: 'LINE-TEST',
          line_name: '測試聯絡'
        },
        {
          id: 'B2',
          user_id: 'MEMBER-1',
          user_name: '測試會員',
          amount: 700,
          bid_time: '2026-10-16T07:01:00Z',
          contact_provider: 'line',
          line_user_id: 'LINE-TEST',
          line_name: '測試聯絡'
        }
      ]
    })
  )
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  await member(page, 'ADMIN')
  await expect(page.locator('.auction-row')).toHaveCount(2)
  await page.getByLabel('場次狀態', { exact: true }).selectOption('active')
  await expect(page.locator('.auction-row')).toHaveCount(1)
  await page.getByLabel('搜尋場次', { exact: true }).fill('找不到')
  await expect(page.getByText('沒有符合條件的場次，請調整搜尋或狀態。')).toBeVisible()
  await page.getByLabel('搜尋場次', { exact: true }).fill('TEST-OPEN')
  await page.getByRole('button', { name: /測試開放/ }).click()
  await expect(page.locator('.bidder-card')).toHaveCount(1)
  await expect(page.getByText('1 位 · 2 筆出價')).toBeVisible()
  await expect(page.locator('.bid-heading')).toContainText('700')
  await page.getByText('出價紀錄與會員識別 · 2 筆').click()
  await expect(page.locator('.bid-history li')).toHaveCount(2)
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: 'output/auction-management-refined.png', fullPage: true })
})

test('管理端收到新出價與結標事件自動重讀，保留理由；待確認管理操作不被背景重讀覆蓋', async ({
  page
}) => {
  const auction = {
    id: 'TEST-LIVE-MANAGER',
    morph: '管理同步測試',
    status: 'active',
    start_price: 100,
    end_time: '2030-01-01T00:00:00Z'
  }
  let bids = [{ id: 'B1', user_id: 'MEMBER', user_name: '測試會員', amount: 500 }]
  let state = 'awaiting_payment'
  let workflowReads = 0
  let publish: undefined | (() => void)
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
        if (topic === 'realtime:auction-management-live')
          publish = () =>
            send('postgres_changes', {
              ids: [2],
              data: {
                type: 'INSERT',
                schema: 'public',
                table: 'auction_bids',
                columns: [],
                record: { auction_id: auction.id },
                old_record: {},
                commit_timestamp: new Date().toISOString()
              }
            })
      } else if (event === 'heartbeat') send('phx_reply', { status: 'ok', response: {} })
    })
  })
  await page.route('**/rest/v1/auctions?**', (r) => r.fulfill({ json: [auction] }))
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) => r.fulfill({ json: bids }))
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) => {
    workflowReads++
    return r.fulfill({
      json: {
        enabled: true,
        outcome: {
          state,
          amount: 700,
          restricted: false,
          auction_restricted: false,
          notification_status: 'manual'
        }
      }
    })
  })
  await page.route('**/rest/v1/rpc/admin_auction_action_once', (r) => r.fulfill({ json: null }))
  await page.goto('/auction-management')
  await member(page, 'ADMIN')
  await page.getByRole('button', { name: /管理同步測試/ }).click()
  await expect(page.getByText('1 位 · 1 筆出價')).toBeVisible()
  await page.getByLabel('管理操作原因', { exact: true }).fill('保留輸入中的理由')
  await page.evaluate(() => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.currentUser = { ...store.currentUser }
  })
  await expect(page.getByLabel('管理操作原因', { exact: true })).toHaveValue('保留輸入中的理由')
  await expect(page.locator('.detail-title')).toContainText('管理同步測試')
  await expect.poll(() => !!publish).toBe(true)
  bids = [...bids, { id: 'B2', user_id: 'MEMBER2', user_name: '新出價者', amount: 700 }]
  auction.status = 'ended'
  publish!()
  await expect(page.getByText('2 位 · 2 筆出價')).toBeVisible({ timeout: 6000 })
  await expect(page.locator('.detail-title')).toContainText('已結標')
  await expect(page.getByLabel('管理操作原因', { exact: true })).toHaveValue('保留輸入中的理由')
  await page.getByRole('button', { name: '付款期限延後 24 小時', exact: true }).click()
  await expect(page.getByRole('button', { name: '重試同一筆管理操作', exact: true })).toBeVisible()
  const readsBefore = workflowReads
  state = 'paid'
  publish!()
  await expect.poll(() => page.getByText('2 位 · 2 筆出價').isVisible()).toBe(true)
  await page.waitForTimeout(1000)
  expect(workflowReads).toBe(readsBefore)
  await expect(page.getByRole('button', { name: '重試同一筆管理操作', exact: true })).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        JSON.parse(
          sessionStorage.getItem('auction-admin-pending:ADMIN:TEST-LIVE-MANAGER') || 'null'
        )?.p_reason
    )
  ).toBe('保留輸入中的理由')
  await member(page, null)
  await expect(page.locator('.bidder-card')).toHaveCount(0)
})

test('管理出價超過一千筆仍列出末頁會員與完整出價次數', async ({ page }) => {
  const offsets: number[] = []
  const rows = Array.from({ length: 1201 }, (_, i) => ({
    id: `B-${i}`,
    user_id: i === 1200 ? 'LAST' : 'FIRST',
    user_name: i === 1200 ? '末頁測試會員' : '大量紀錄測試會員',
    amount: 2200 - i,
    bid_time: '2026-10-20T00:00:00Z',
    contact_provider: 'google'
  }))
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [{ id: 'TEST', morph: '大量出價測試', status: 'ended', end_time: '2020-01-01' }]
    })
  )
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) =>
    r.fulfill({ json: { enabled: true, outcome: null } })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) => {
    const url = new URL(r.request().url())
    const offset = Number(url.searchParams.get('offset') || 0)
    const limit = Math.min(Number(url.searchParams.get('limit') || 1000), 1000)
    offsets.push(offset)
    return r.fulfill({ json: rows.slice(offset, offset + limit) })
  })
  await page.goto('/auction-management')
  await member(page, 'ADMIN-BULK')
  await page.getByRole('button', { name: /大量出價測試/ }).click()
  await expect(page.getByText('2 位 · 1201 筆出價', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '末頁測試會員', exact: true })).toBeVisible()
  expect(offsets).toEqual([0, 500, 1000])
})

test('管理列表放著不動也會在預約開標與截止時更新篩選', async ({ page }) => {
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [
        {
          id: 'TEST-TIME',
          morph: '時間切換測試',
          status: 'active',
          start_price: 100,
          start_time: '2030-01-01T00:00:10Z',
          end_time: '2030-01-01T00:00:20Z'
        }
      ]
    })
  )
  await page.goto('/auction-management')
  await member(page, 'ADMIN')
  await page.evaluate(() => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    ;(window as any).auditNow = Date.parse('2030-01-01T00:00:00Z')
    store.auctionNow = () => (window as any).auditNow
  })
  await page.getByLabel('場次狀態', { exact: true }).selectOption('scheduled')
  await expect(page.locator('.auction-row')).toHaveCount(1)
  await page.evaluate(() => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    ;(window as any).auditNow = Date.parse('2030-01-01T00:00:11Z')
  })
  await expect(page.locator('.auction-row')).toHaveCount(0)
  await page.getByLabel('場次狀態', { exact: true }).selectOption('active')
  await expect(page.locator('.auction-row')).toHaveCount(1)
  await page.evaluate(() => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    ;(window as any).auditNow = Date.parse('2030-01-01T00:00:21Z')
  })
  await expect(page.locator('.auction-row')).toHaveCount(0)
  await page.getByLabel('場次狀態', { exact: true }).selectOption('closed')
  await expect(page.locator('.auction-row')).toHaveCount(1)
})

test('競標管理訪客沒有私人紀錄；拒絕權限失敗後不殘留資料', async ({ page }) => {
  let deny = false
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (route) =>
    route.fulfill(
      deny
        ? { status: 403, json: { code: '42501', message: '僅限競標管理員查詢' } }
        : {
            json: [
              {
                id: 'B1',
                auction_id: 'TEST',
                user_name: '公開暱稱',
                amount: 500,
                bid_time: '2026-10-16T07:00:00Z',
                user_id: 'MEMBER-TEST',
                contact_provider: 'line',
                line_user_id: 'LINE-TEST',
                line_name: '測試LINE名稱'
              }
            ]
          }
    )
  )
  await page.route('**/rest/v1/auctions?**', (route) =>
    route.fulfill({
      json: [
        {
          id: 'TEST',
          morph: '測試場次',
          status: 'active',
          start_price: 100,
          end_time: '2030-01-01T00:00:00Z'
        },
        {
          id: 'EMPTY',
          morph: '空場次',
          status: 'ended',
          start_price: 200,
          end_time: '2020-01-01T00:00:00Z'
        }
      ]
    })
  )
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  await expect(page.locator('.bidder-card')).toHaveCount(0)
  await member(page, 'ADMIN')
  await expect(page.getByLabel('場次編號', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: /測試場次/ }).click()
  await expect(page.getByText('測試LINE名稱', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('link', { name: '開啟官方 LINE 收件匣', exact: true })
  ).toHaveAttribute('href', 'https://chat.line.biz/account/@219abdzn')
  await expect(page.getByRole('link', { name: '開啟 LINE 對話', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '複製 LINE 名稱', exact: true })).toBeVisible()
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.getByRole('button', { name: '返回場次列表', exact: true }).click()
  await expect(page.locator('.bidder-card')).toHaveCount(0)
  await page.getByRole('button', { name: /測試場次/ }).click()
  await expect(page.locator('.bidder-card')).toHaveCount(1)
  deny = true
  await page.getByRole('button', { name: '重新載入出價者', exact: true }).click()
  await expect(page.getByText('此帳號沒有競標管理權限', { exact: false })).toBeVisible()
  await expect(page.locator('.bidder-card')).toHaveCount(0)
  await member(page, null)
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
})

test('一般 Google 與 LINE 會員不顯示管理場次及查詢操作', async ({ page }) => {
  let privateCalls = 0
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (route) => {
    privateCalls++
    return route.fulfill({ status: 403, json: { code: '42501' } })
  })
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  for (const type of ['google', 'line']) {
    await page.waitForFunction(
      () =>
        !!(
          document.querySelector('#__nuxt') as any
        )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
    )
    await page.evaluate(async (type) => {
      const store = (
        document.querySelector('#__nuxt') as any
      ).__vue_app__.config.globalProperties.$pinia._s.get('main')
      await store.checkAuthStatus()
      store.currentUser = { id: `CUSTOMER-${type}`, type, name: '一般會員', auctionAdmin: false }
    }, type)
    await expect(page.getByRole('button', { name: '切換 Google 管理員登入' })).toBeVisible()
    await expect(page.getByRole('region', { name: '場次列表', exact: true })).toHaveCount(0)
    await expect(page.getByRole('region', { name: '場次資訊', exact: true })).toHaveCount(0)
  }
  expect(privateCalls).toBe(0)
})

test('場次列表失敗可重試，空列表不誤顯示為載入失敗', async ({ page }) => {
  let fail = true
  let nullResponse = false
  await page.route('**/rest/v1/auctions?**', (route) =>
    route.fulfill(
      fail ? { status: 400, json: { message: '測試暫時失敗' } } : { json: nullResponse ? null : [] }
    )
  )
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  await member(page, 'ADMIN')
  await expect(page.getByRole('button', { name: '重新載入場次' })).toBeVisible()
  fail = false
  nullResponse = true
  await page.getByRole('button', { name: '重新載入場次' }).click()
  await expect(page.getByText('場次列表暫時無法載入，請重試。', { exact: true })).toBeVisible()
  await expect(page.getByText('目前沒有競標場次。', { exact: true })).toHaveCount(0)
  nullResponse = false
  await page.getByRole('button', { name: '重新載入場次' }).click()
  await expect(page.getByText('目前沒有競標場次。', { exact: true })).toBeVisible()
})

test('得標管理的空白或不完整回應顯示錯誤，正常空結果仍顯示尚未結算', async ({ page }) => {
  let workflow: any = null
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [
        {
          id: 'TEST-WORKFLOW-SHAPE',
          morph: '管理回應格式測試',
          status: 'ended',
          end_time: '2020-01-01T00:00:00Z'
        }
      ]
    })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) => r.fulfill({ json: workflow }))
  await page.goto('/auction-management')
  await member(page, 'ADMIN')
  await page.getByRole('button', { name: /管理回應格式測試/ }).click()
  const panel = page.getByRole('region', { name: '得標付款與出價限制管理' })
  await expect(panel).toContainText('無法讀取管理資料，請確認管理權限後重試。')
  for (const invalid of [
    { enabled: true },
    { enabled: true, outcome: [] },
    { enabled: 'true', outcome: null }
  ]) {
    workflow = invalid
    await page.getByRole('button', { name: '重新載入得標狀態', exact: true }).click()
    await expect(panel).toContainText('無法讀取管理資料，請確認管理權限後重試。')
    await expect(panel).not.toContainText('尚未結算')
  }
  workflow = { enabled: true, outcome: null }
  await page.getByRole('button', { name: '重新載入得標狀態', exact: true }).click()
  await expect(panel).toContainText('尚未結算，截止後才會建立得標紀錄。')
  await expect(panel).not.toContainText('無法讀取管理資料')
})

test('核帳已送出但狀態重讀失敗時不宣稱已查核，重試成功清除錯誤', async ({ page }) => {
  let failRead = false
  let actions = 0
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [{ id: 'TEST', morph: '測試核帳', status: 'ended', end_time: '2020-01-01T00:00:00Z' }]
    })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) =>
    r.fulfill(
      failRead
        ? { status: 503, json: { message: '測試斷線' } }
        : {
            json: {
              enabled: true,
              outcome: {
                state: actions ? 'paid' : 'awaiting_payment',
                amount: 700,
                restricted: false
              },
              events: []
            }
          }
    )
  )
  await page.route('**/rest/v1/rpc/admin_auction_action_once', (r) => {
    actions++
    failRead = true
    const body = r.request().postDataJSON()
    return r.fulfill({
      json: { request_id: body.p_request_id, auction_id: body.p_auction_id, action: body.p_action }
    })
  })
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  await member(page, 'ADMIN')
  await page.getByRole('button', { name: /測試核帳/ }).click()
  await page.getByLabel('管理操作原因', { exact: true }).fill('測試確認已收款')
  await page.getByRole('button', { name: '確認收款，完成核帳', exact: true }).click()
  const panel = page.getByRole('region', { name: '得標付款與出價限制管理' })
  await expect(panel).toContainText('未能重新確認最新狀態')
  await expect(panel).not.toContainText('已重新查核狀態')
  expect(actions).toBe(1)
  failRead = false
  await page.getByRole('button', { name: '重新載入得標狀態', exact: true }).click()
  await expect(panel).toContainText('已確認付款')
  await expect(panel).not.toContainText('未能重新確認最新狀態')
  expect(actions).toBe(1)
})

test('管理延期回執遺失後重新整理，沿用同筆請求確認且不重複延期', async ({ page }) => {
  const requests: any[] = []
  const committed = new Set<string>()
  let extensions = 0
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [
        { id: 'TEST', morph: '管理重送測試', status: 'ended', end_time: '2020-01-01T00:00:00Z' }
      ]
    })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) =>
    r.fulfill({
      json: {
        enabled: true,
        outcome: {
          state: 'awaiting_payment',
          amount: 700,
          restricted: false,
          payment_due_at: new Date(Date.UTC(2030, 0, 1) + extensions * 86400000).toISOString()
        },
        events: []
      }
    })
  )
  await page.route('**/rest/v1/rpc/admin_auction_action_once', (r) => {
    const body = r.request().postDataJSON()
    requests.push(body)
    if (requests.length === 3)
      return r.fulfill({
        status: 400,
        json: {
          code: '22023',
          message: '此狀態不能執行所選操作'
        }
      })
    if (!committed.has(body.p_request_id)) {
      committed.add(body.p_request_id)
      extensions++
    }
    return r.fulfill({
      json:
        requests.length === 1
          ? null
          : {
              request_id: body.p_request_id,
              auction_id: body.p_auction_id,
              action: body.p_action,
              replayed: true
            }
    })
  })
  await page.goto('/auction-management')
  await member(page, 'ADMIN-REPLAY')
  await page.getByRole('button', { name: /管理重送測試/ }).click()
  await page.getByLabel('管理操作原因', { exact: true }).fill('🦎')
  await expect(
    page.getByRole('button', { name: '付款期限延後 24 小時', exact: true })
  ).toBeDisabled()
  await page.getByLabel('管理操作原因', { exact: true }).fill('客人已說明延期理由')
  await page.getByRole('button', { name: '付款期限延後 24 小時', exact: true }).click()
  await expect(page.getByRole('button', { name: '重試同一筆管理操作', exact: true })).toBeVisible()
  await expect.poll(() => extensions).toBe(1)
  await expect(page.getByRole('button', { name: '重試同一筆管理操作', exact: true })).toBeEnabled()
  await page.reload()
  await member(page, 'ADMIN-REPLAY')
  await page.getByRole('button', { name: /管理重送測試/ }).click()
  await expect(page.getByLabel('管理操作原因', { exact: true })).toHaveValue('客人已說明延期理由')
  await expect(page.getByLabel('管理操作原因', { exact: true })).toBeDisabled()
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const retry = await page
      .getByRole('button', { name: '重試同一筆管理操作', exact: true })
      .boundingBox()
    expect(retry?.height).toBeGreaterThanOrEqual(44)
  }
  await page.setViewportSize({ width: 390, height: 850 })
  await page.screenshot({ path: 'output/auction-admin-retry-restored.png', fullPage: true })
  await page.getByRole('button', { name: '重試同一筆管理操作', exact: true }).click()
  await expect(page.getByText('操作完成，已重新查核狀態。', { exact: true })).toBeVisible()
  expect(requests).toHaveLength(2)
  expect(requests[1]).toEqual(requests[0])
  expect(extensions).toBe(1)
  await expect(page.getByRole('button', { name: '重試同一筆管理操作', exact: true })).toHaveCount(0)
  await page.getByLabel('管理操作原因', { exact: true }).fill('測試另一筆明確拒絕')
  await page.getByRole('button', { name: '確認收款，完成核帳', exact: true }).click()
  await expect(
    page.getByText('操作未成立：此狀態不能執行所選操作。請重新載入狀態。', { exact: true })
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '重試同一筆管理操作', exact: true })).toHaveCount(0)
})

test('本場解封後仍有其他限制時，不再顯示本場解封按鈕', async ({ page }) => {
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [
        { id: 'TEST', morph: '本場解封測試', status: 'ended', end_time: '2020-01-01T00:00:00Z' }
      ]
    })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) =>
    r.fulfill({
      json: {
        enabled: true,
        outcome: { state: 'abandoned', amount: 700, restricted: true, auction_restricted: false },
        events: []
      }
    })
  )
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入' })).toBeVisible()
  await member(page, 'ADMIN')
  await page.getByRole('button', { name: /本場解封測試/ }).click()
  await expect(page.getByText('本場限制：已解除', { exact: true })).toBeVisible()
  await expect(page.getByText('網站出價限制：有', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '解除網站出價限制', exact: true })).toHaveCount(0)
})
