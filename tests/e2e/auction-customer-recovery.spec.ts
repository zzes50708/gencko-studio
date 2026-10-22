import { test, expect } from '@playwright/test'

async function setup(page: any, surface = 'profile', hanging = '') {
  const now = Date.now()
  await page.clock.install({ time: now })
  const auction = {
    id: 'CUSTOMER-RECOVERY',
    morph: '領標復原測試',
    status: 'ended',
    start_price: 200,
    end_time: new Date(now - 60000).toISOString(),
    workflow_enabled: true,
    images: []
  }
  const outcome = {
    auction_id: auction.id,
    morph: auction.morph,
    state: 'awaiting_payment',
    amount: 700,
    notification_status: 'sent',
    payment_due_at: new Date(now + 86400000).toISOString(),
    claimed_at: null
  }
  const state = {
    hang: new Set(hanging ? [hanging] : []),
    calls: {} as Record<string, number>,
    outcome
  }
  await page.routeWebSocket('**/realtime/v1/websocket**', () => {})
  await page.route('**/api/server-time', (r) => r.fulfill({ json: { serverTime: now } }))
  await page.route('**/rest/v1/**', async (r) => {
    const url = new URL(r.request().url())
    const name = url.pathname.split('/').at(-1)!
    state.calls[name] = (state.calls[name] || 0) + 1
    if (state.hang.has(name)) return
    let data: any = []
    if (name === 'auctions') data = url.searchParams.has('id') ? auction : [auction]
    if (name === 'my_auction_outcomes') data = [state.outcome]
    if (name === 'my_auction_outcome') data = state.outcome
    if (name === 'create_auction_winner_claim')
      data = {
        message: '【Gencko 得標確認】\n領標驗證：' + 'a'.repeat(36),
        amount: 700,
        expires_at: new Date(now + 900000).toISOString()
      }
    if (name === 'report_auction_payment') {
      state.outcome.state = 'payment_review'
      data = null
    }
    if (name === 'abandon_auction') {
      state.outcome.state = 'abandoned'
      data = null
    }
    await r.fulfill({ json: data })
  })
  await page.goto(surface === 'profile' ? '/profile' : '/auction/' + auction.id)
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
            id: 'CUSTOMER-ISOLATED',
            app_metadata: { provider: 'custom:line-oauth' },
            user_metadata: {}
          }
        }
      },
      error: null
    })
    await g.$pinia._s.get('main').checkAuthStatus()
  })
  if (surface === 'profile') {
    await page.getByRole('button', { name: /^競標/ }).click()
    await expect(page.getByRole('heading', { name: '得標與付款', exact: true })).toBeVisible()
  } else
    await expect(page.getByRole('heading', { name: '領標復原測試', exact: true })).toBeVisible()
  return state
}

for (const area of ['競標紀錄', '得標紀錄', '單場得標']) {
  test(`${area}讀取逾時能重試，不誤顯示沒有紀錄`, async ({ page }) => {
    const rpc = {
      競標紀錄: 'get_my_auction_bids',
      得標紀錄: 'my_auction_outcomes',
      單場得標: 'my_auction_outcome'
    }[area]!
    const state = await setup(page, area === '單場得標' ? 'detail' : 'profile', rpc)
    await expect.poll(() => state.calls[rpc] || 0).toBeGreaterThan(0)
    await page.clock.fastForward(11000)
    const error = {
      競標紀錄: '競標紀錄暫時無法載入，請稍後重試。',
      得標紀錄: '得標紀錄暫時無法載入，請重試。',
      單場得標: '暫時無法確認得標結果，請重試。'
    }[area]!
    await expect(page.getByText(error, { exact: true })).toBeVisible()
    state.hang.delete(rpc)
    const retry = {
      競標紀錄: '重新載入競標紀錄',
      得標紀錄: '重新載入得標紀錄',
      單場得標: '重新確認得標結果'
    }[area]!
    await page.getByRole('button', { name: retry, exact: true }).click()
    await expect(page.getByText(error, { exact: true })).toHaveCount(0)
  })
}

test('產生領標訊息逾時可退出，再試時能顯示有效訊息', async ({ page }) => {
  const state = await setup(page, 'detail')
  state.hang.add('create_auction_winner_claim')
  const button = page.getByRole('button', { name: '複製得標確認訊息', exact: true })
  await button.click()
  await expect.poll(() => state.calls.create_auction_winner_claim || 0).toBe(1)
  await page.clock.fastForward(16000)
  await expect(button).toBeEnabled()
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toHaveCount(0)
  state.hang.delete('create_auction_winner_claim')
  await button.click()
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toHaveValue(
    /aaaaaaaa/
  )
})

for (const action of ['付款', '棄標']) {
  test(`${action}操作逾時後先查核，不能直接重複送出`, async ({ page }) => {
    const state = await setup(page)
    const rpc = action === '付款' ? 'report_auction_payment' : 'abandon_auction'
    if (action === '棄標') await page.getByRole('button', { name: '申請棄標', exact: true }).click()
    const button = page.getByRole('button', {
      name: action === '付款' ? '我已付款，送出核帳' : '確認棄標並限制出價',
      exact: true
    })
    state.hang.add(rpc)
    await button.click()
    await expect.poll(() => state.calls[rpc] || 0).toBe(1)
    await page.clock.fastForward(16000)
    await expect(
      page.getByText(
        action === '付款'
          ? '未能確認操作結果，請重新載入紀錄；勿重複付款。'
          : '未能確認棄標結果，請重新載入紀錄後再操作。',
        { exact: true }
      )
    ).toBeVisible()
    await expect(button).toBeDisabled()
    expect(state.calls[rpc]).toBe(1)
    state.outcome.state = action === '付款' ? 'payment_review' : 'abandoned'
    await page.getByRole('button', { name: '重新載入得標紀錄', exact: true }).click()
    await expect(
      page.getByText(action === '付款' ? '已回報付款，等待核帳' : '已棄標', { exact: true })
    ).toBeVisible()
    await expect(button).toHaveCount(0)
    expect(state.calls[rpc]).toBe(1)
  })
}

test('剪貼簿一直等待會退出，保留手動複製訊息與原驗證碼', async ({ page }) => {
  const state = await setup(page, 'detail')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => new Promise(() => {}) }
    })
  )
  await page.getByRole('button', { name: '複製得標確認訊息', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toBeVisible()
  await page.clock.fastForward(11000)
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toBeEnabled()
  await expect(
    page.getByText('請選取下方完整訊息複製，貼到官方 LINE 並傳送。', { exact: true })
  ).toBeVisible()
  expect(state.calls.create_auction_winner_claim).toBe(1)
})

test('剪貼簿延遲返回時，校時後已過期的領標訊息不能顯示複製成功', async ({ page }) => {
  await setup(page, 'detail')
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => new Promise((resolve) => ((window as any).finishClaimCopy = resolve))
      }
    })
  )
  await page.getByRole('button', { name: '複製得標確認訊息', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toBeVisible()
  await page.evaluate(() => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.auctionNow = () => Date.now() + 1200000
    ;(window as any).finishClaimCopy()
  })
  await expect(
    page.getByText('已複製，請貼到官方 LINE 並傳送，完成領標。', { exact: true })
  ).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toHaveCount(0)
  await expect(
    page.getByText('領標驗證碼已過期，請重新產生訊息後傳送。', { exact: true })
  ).toBeVisible()
})

test('離線不更新競標歷史，恢復連線才補查', async ({ page }) => {
  const state = await setup(page)
  await expect(page.getByText('您尚未參與任何競標活動。', { exact: true })).toBeVisible()
  const before = state.calls.get_my_auction_bids
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
  )
  await page.clock.runFor(16000)
  await page.waitForTimeout(100)
  expect(state.calls.get_my_auction_bids).toBe(before)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    window.dispatchEvent(new Event('online'))
  })
  await expect.poll(() => state.calls.get_my_auction_bids).toBeGreaterThan(before)
})

test('離開會員頁取消仍在等待的得標紀錄查詢', async ({ page }) => {
  let cancelled = false
  page.on('requestfailed', (r) => {
    if (r.url().includes('/rpc/my_auction_outcomes')) cancelled = true
  })
  const state = await setup(page, 'profile', 'my_auction_outcomes')
  await expect.poll(() => state.calls.my_auction_outcomes || 0).toBeGreaterThan(0)
  await page.evaluate(() =>
    (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
      '/stories'
    )
  )
  await expect(page.getByRole('heading', { name: '得標與付款', exact: true })).toHaveCount(0)
  await expect.poll(() => cancelled).toBe(true)
})
