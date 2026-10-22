import { test, expect } from '@playwright/test'

const auction = {
  id: 'ISOLATED-MANAGER',
  morph: '管理復原測試',
  status: 'ended',
  end_time: '2020-01-01T00:00:00Z',
  start_price: 200,
  min_increment: 100
}
async function setup(page: any) {
  const now = Date.now()
  await page.clock.install({ time: now })
  const state = {
    hang: new Set<string>(),
    calls: {} as Record<string, number>,
    writes: {} as Record<string, any[]>,
    rows: [auction],
    outcome: 'awaiting_payment'
  }
  await page.routeWebSocket('**/realtime/v1/websocket**', () => {})
  await page.route('**/api/server-time', (r) => r.fulfill({ json: { serverTime: now } }))
  await page.route('**/rest/v1/**', async (r) => {
    const name = new URL(r.request().url()).pathname.split('/').at(-1)!
    state.calls[name] = (state.calls[name] || 0) + 1
    const body = r.request().postDataJSON()
    if (['admin_create_auction', 'admin_auction_action_once'].includes(name))
      (state.writes[name] ||= []).push(body)
    if (state.hang.has(name)) return
    let data: any = []
    if (name === 'auctions') data = state.rows
    if (name === 'admin_auction_candidates')
      data = [{ id: 'TEST-RECOVERY', morph: '隔離上架測試', images: [] }]
    if (name === 'get_auction_bidder_contacts')
      data = [
        {
          id: 'B1',
          user_id: 'ISOLATED-BIDDER',
          user_name: '測試出價者',
          amount: 700,
          bid_time: '2026-10-22T00:00:00Z'
        }
      ]
    if (name === 'admin_auction_workflow')
      data = {
        enabled: true,
        outcome: {
          state: state.outcome,
          amount: 700,
          restricted: false,
          auction_restricted: false,
          notification_status: 'manual'
        }
      }
    if (name === 'admin_auction_action_once') {
      data = { request_id: body.p_request_id, auction_id: body.p_auction_id, action: body.p_action }
      state.outcome = 'paid'
    }
    if (name === 'admin_create_auction') {
      data = { id: `A-${body.p_request_id}` }
      state.rows = [{ ...auction, id: data.id, morph: '新上架測試' }]
    }
    await r.fulfill({ json: data })
  })
  await page.goto('/auction-management')
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async () => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    await g.$pinia._s.get('main').checkAuthStatus()
    g.$supabase.client.auth.getSession = async () => ({
      data: {
        session: {
          user: {
            id: 'ADMIN-RECOVERY',
            email: 'admin@example.invalid',
            app_metadata: { provider: 'google', auction_admin: true },
            user_metadata: {}
          }
        }
      },
      error: null
    })
    await g.$pinia._s.get('main').checkAuthStatus()
  })
  await expect(page.locator('.auction-row')).toHaveCount(1)
  return state
}

for (const area of ['場次', '出價者', '得標狀態', '個體搜尋']) {
  test(`${area}讀取卡住會結束等待，恢復後可重新載入`, async ({ page }) => {
    const state = await setup(page)
    const rpc = {
      場次: 'auctions',
      出價者: 'get_auction_bidder_contacts',
      得標狀態: 'admin_auction_workflow',
      個體搜尋: 'admin_auction_candidates'
    }[area]!
    const messages = {
      場次: '場次列表暫時無法載入，請重試。',
      出價者: '暫時無法取得出價者資料，請稍後重試。',
      得標狀態: '無法讀取管理資料，請確認管理權限後重試。',
      個體搜尋: '個體搜尋失敗，請確認管理權限後重試。'
    }
    const before = state.calls[rpc] || 0
    state.hang.add(rpc)
    if (area === '場次')
      await page.getByRole('button', { name: '重新載入場次', exact: true }).click()
    else if (area === '個體搜尋')
      await page.getByRole('button', { name: '新增競標場次', exact: true }).click()
    else await page.getByRole('button', { name: /管理復原測試/ }).click()
    await expect.poll(() => state.calls[rpc] || 0).toBeGreaterThan(before)
    await page.clock.fastForward(11000)
    await expect(page.getByText(messages[area], { exact: true })).toBeVisible()
    state.hang.delete(rpc)
    const retry = {
      場次: '重新載入場次',
      出價者: '重新載入出價者',
      得標狀態: '重新載入得標狀態',
      個體搜尋: '搜尋個體'
    }[area]!
    await page.getByRole('button', { name: retry, exact: true }).click()
    await expect(page.getByText(messages[area], { exact: true })).toHaveCount(0)
    if (area === '個體搜尋')
      await expect(page.getByRole('button', { name: /TEST-RECOVERY/ })).toBeVisible()
  })
}

for (const operation of ['核帳', '上架']) {
  test(`${operation}逾時保留原請求，重試不建立另一筆操作`, async ({ page }) => {
    const state = await setup(page)
    const rpc = operation === '核帳' ? 'admin_auction_action_once' : 'admin_create_auction'
    if (operation === '核帳') {
      await page.getByRole('button', { name: /管理復原測試/ }).click()
      await page.getByLabel('管理操作原因', { exact: true }).fill('隔離測試已核對款項')
    } else {
      await page.getByRole('button', { name: '新增競標場次', exact: true }).click()
      await page.getByRole('button', { name: /TEST-RECOVERY/ }).click()
    }
    state.hang.add(rpc)
    await page
      .getByRole('button', {
        name: operation === '核帳' ? '確認收款，完成核帳' : '確認上架',
        exact: true
      })
      .click()
    await expect.poll(() => state.writes[rpc]?.length || 0).toBe(1)
    await page.clock.fastForward(16000)
    const retry = page.getByRole('button', {
      name: operation === '核帳' ? '重試同一筆管理操作' : '重試同一筆上架',
      exact: true
    })
    await expect(retry).toBeEnabled()
    const saved = await page.evaluate(() =>
      Object.keys(sessionStorage)
        .filter(
          (key) =>
            key.startsWith('auction-admin-pending:') || key.startsWith('auction-listing-pending:')
        )
        .map((key) => JSON.parse(sessionStorage.getItem(key)!))
    )
    expect(saved[0].p_request_id).toBe(state.writes[rpc][0].p_request_id)
    state.hang.delete(rpc)
    await retry.click()
    await expect.poll(() => state.writes[rpc]?.length || 0).toBe(2)
    expect(state.writes[rpc][1]).toEqual(state.writes[rpc][0])
    await expect(
      page.getByText(operation === '核帳' ? '操作完成，已重新查核狀態。' : /場次已上架：A-/)
    ).toBeVisible()
  })
}

for (const fails of [false, true]) {
  test(`離開場次後忽略延遲的複製${fails ? '失敗' : '成功'}提示`, async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: /管理復原測試/ }).click()
    await page.evaluate(
      (fails) =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText: () =>
              new Promise(
                (resolve, reject) =>
                  ((window as any).finishManagerCopy = () =>
                    fails ? reject(Error('隔離拒絕')) : resolve(undefined))
              )
          }
        }),
      fails
    )
    await page.getByRole('button', { name: '複製會員編號', exact: true }).click()
    await page.getByRole('button', { name: '返回場次列表', exact: true }).click()
    await page.evaluate(() => (window as any).finishManagerCopy())
    await expect(
      page.getByText(fails ? '無法自動複製，請選取文字複製。' : '已複製。', { exact: true })
    ).toHaveCount(0)
  })
}

test('管理列表離線時不自動重讀，恢復連線才同步', async ({ page }) => {
  const state = await setup(page)
  const before = state.calls.auctions
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  )
  await page.clock.runFor(16000)
  await page.waitForTimeout(100)
  expect(state.calls.auctions).toBe(before)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    window.dispatchEvent(new Event('online'))
  })
  await page.clock.runFor(500)
  await expect.poll(() => state.calls.auctions).toBeGreaterThan(before)
})

test('離開新增場次頁會取消仍在等待的個體查詢', async ({ page }) => {
  const state = await setup(page)
  state.hang.add('admin_auction_candidates')
  let cancelled = false
  page.on('requestfailed', (r) => {
    if (r.url().includes('/rpc/admin_auction_candidates')) cancelled = true
  })
  await page.getByRole('button', { name: '新增競標場次', exact: true }).click()
  await expect.poll(() => state.calls.admin_auction_candidates || 0).toBe(1)
  await page.getByRole('button', { name: '返回場次列表', exact: true }).click()
  await expect.poll(() => cancelled).toBe(true)
})
