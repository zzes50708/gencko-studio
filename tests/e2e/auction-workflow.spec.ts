import { test, expect } from '@playwright/test'

test('新流程出價前必須驗證 LINE 聯絡；傳送綁定碼後可重新確認', async ({ page }) => {
  let ready = false
  let challengeCalls = 0
  let holdStatus = false
  let releaseOldStatus: (() => void) | null = null
  await page.route('**/rest/v1/rpc/get_auction_contact_status', (r) =>
    holdStatus
      ? new Promise<void>((resolve) => {
          releaseOldStatus = resolve
        }).then(() =>
          r.fulfill({ json: { required: true, ready: false, linked: false, restricted: false } })
        )
      : r.fulfill({ json: { required: true, ready, linked: ready, restricted: false } })
  )
  await page.route('**/rest/v1/rpc/create_auction_line_link', (r) => {
    challengeCalls++
    return r.fulfill({
      json: { code: 'a'.repeat(36), expires_at: new Date(Date.now() + 900000).toISOString() }
    })
  })
  await page.route('**/rest/v1/auction_bids?**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/auctions?**', (r) => {
    const a = {
      id: 'TEST-AUCTION-20261016-01',
      morph: '測試',
      status: 'active',
      start_price: 100,
      min_increment: 100,
      end_time: new Date(Date.now() + 86400000).toISOString(),
      workflow_enabled: true,
      images: []
    }
    return r.fulfill({ json: new URL(r.request().url()).searchParams.has('id') ? a : [a] })
  })
  await page.goto('/stories')
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async () => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    const store = g.$pinia._s.get('main')
    store.currentUser = { id: 'TEST-MEMBER', type: 'google', email: 'test@example.invalid' }
    store.auctionList = [
      {
        id: 'TEST-AUCTION-20261016-01',
        morph: '測試',
        status: 'active',
        start_price: 100,
        min_increment: 100,
        end_time: new Date(Date.now() + 86400000).toISOString(),
        workflow_enabled: true,
        images: []
      }
    ]
    await g.$router.push('/auction/TEST-AUCTION-20261016-01')
  })
  await expect(page.getByRole('heading', { name: '測試', exact: true })).toBeVisible()
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = { id: 'TEST-MEMBER', type: 'google', email: 'test@example.invalid' }
  })
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  const link = page.getByRole('link', { name: '前往 LINE 傳送綁定訊息', exact: true })
  await expect(link).toHaveAttribute(
    'href',
    new RegExp(encodeURIComponent('競標綁定 ' + 'a'.repeat(36)))
  )
  expect(challengeCalls).toBe(1)
  await expect(page.getByRole('textbox', { name: 'LINE 綁定訊息', exact: true })).toHaveValue(
    '競標綁定 ' + 'a'.repeat(36)
  )
  await expect(page.getByRole('button', { name: '複製綁定訊息', exact: true })).toBeVisible()
  holdStatus = true
  await page.getByRole('button', { name: '我已傳送，重新確認', exact: true }).click()
  await expect.poll(() => !!releaseOldStatus).toBe(true)
  holdStatus = false
  ready = true
  await page
    .getByRole('button', { name: '我已傳送，重新確認', exact: true })
    .click({ timeout: 1500 })
    .catch(async (error) => {
      // 自動輪詢可能已先完成驗證並移除按鈕，此時以實際成功狀態判定。
      if (!(await page.getByText('官方 LINE 聯絡已驗證', { exact: false }).isVisible())) throw error
    })
  await expect(page.getByText('官方 LINE 聯絡已驗證', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
  const oldResponse = page.waitForResponse((r) =>
    r.url().includes('/rpc/get_auction_contact_status')
  )
  releaseOldStatus!()
  await oldResponse
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  await expect(page.getByText('官方 LINE 聯絡已驗證', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
})

test('得標者回報付款後進入人工核帳，登出即清除私人結果', async ({ page }) => {
  let state = 'awaiting_payment'
  let holdRead = false
  let outcomeReads = 0
  let releaseRead: (() => void) | null = null
  await page.route('**/rest/v1/rpc/my_auction_outcomes', async (r) => {
    outcomeReads++
    if (holdRead)
      await new Promise<void>((resolve) => {
        releaseRead = resolve
      })
    return r.fulfill({
      json: [
        {
          auction_id: 'TEST',
          morph: '測試得標',
          amount: 700,
          state,
          notification_status: 'sent',
          payment_due_at: '2030-01-02T00:00:00Z',
          claimed_at: '2030-01-01T00:00:00Z'
        }
      ]
    })
  })
  await page.route('**/rest/v1/rpc/get_my_auction_bids', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/report_auction_payment', (r) => {
    expect(r.request().postDataJSON()).toEqual({ p_auction_id: 'TEST' })
    state = 'payment_review'
    return r.fulfill({ json: null })
  })
  await page.route('**/rest/v1/rpc/create_auction_winner_claim', (r) =>
    r.fulfill({
      json: {
        message: '【Gencko 得標確認】\n場次：TEST\n成交金額：NT$ 700\n領標驗證：' + 'a'.repeat(36),
        expires_at: new Date(Date.now() + 900000).toISOString(),
        amount: 700
      }
    })
  )
  await page.goto('/profile')
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = { id: 'TEST-MEMBER', type: 'google', email: 'test@example.invalid' }
  })
  await page.getByRole('button', { name: /^競標/ }).click()
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = { id: 'TEST-MEMBER', type: 'google', email: 'test@example.invalid' }
  })
  await expect(page.getByText('測試得標', { exact: true })).toBeVisible()
  await expect(page.getByText('已收到 LINE 領標訊息。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '複製得標確認訊息', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toHaveValue(
    /成交金額：NT\$ 700/
  )
  const readsBeforeResume = outcomeReads
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect.poll(() => outcomeReads).toBeGreaterThan(readsBeforeResume)
  await expect(page.getByRole('button', { name: '重新載入得標紀錄', exact: true })).toBeEnabled()
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toHaveValue(
    /領標驗證/
  )
  holdRead = true
  await page.getByRole('button', { name: '重新載入得標紀錄', exact: true }).click()
  await expect.poll(() => !!releaseRead).toBe(true)
  await expect(page.getByRole('button', { name: '我已付款，送出核帳', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: '申請棄標', exact: true })).toBeDisabled()
  holdRead = false
  releaseRead!()
  await expect(page.getByRole('button', { name: '我已付款，送出核帳', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '我已付款，送出核帳', exact: true }).click()
  await expect(page.getByText('已回報付款，等待核帳', { exact: true })).toBeVisible()
  // 父層重新取得結果後，上一份領標驗證碼不可繼續顯示。
  await expect(page.getByRole('textbox', { name: '得標確認訊息', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '重新載入得標紀錄', exact: true })).toBeEnabled()
  state = 'paid'
  await page.evaluate(() => window.dispatchEvent(new Event('online')))
  await expect(page.getByText('已確認付款', { exact: true })).toBeVisible()
  await expect(page.locator('.outcomes')).not.toContainText('付款期限')
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = null
  })
  await expect(page.getByText('測試得標', { exact: true })).toHaveCount(0)
})

test('管理員解除出價限制必填原因並重新載入結果', async ({ page }) => {
  let restricted = true
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({
      json: [
        {
          id: 'TEST',
          morph: '測試管理',
          status: 'ended',
          start_price: 100,
          end_time: '2020-01-01T00:00:00Z'
        }
      ]
    })
  )
  await page.route('**/rest/v1/rpc/get_auction_bidder_contacts**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/admin_auction_workflow', (r) =>
    r.fulfill({
      json: { enabled: true, outcome: { state: 'abandoned', amount: 700, restricted }, events: [] }
    })
  )
  await page.route('**/rest/v1/rpc/admin_auction_action_once', (r) => {
    expect(r.request().postDataJSON()).toEqual({
      p_request_id: expect.any(String),
      p_auction_id: 'TEST',
      p_action: 'unblock',
      p_reason: '核准正當理由'
    })
    restricted = false
    const body = r.request().postDataJSON()
    return r.fulfill({
      json: { request_id: body.p_request_id, auction_id: body.p_auction_id, action: body.p_action }
    })
  })
  await page.goto('/auction-management')
  await expect(page.getByRole('button', { name: 'Google 管理員登入', exact: true })).toBeVisible()
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
    store.currentUser = {
      id: 'ADMIN',
      type: 'google',
      email: 'test@example.invalid',
      auctionAdmin: true
    }
  })
  await page.getByRole('button', { name: /測試管理/ }).click()
  await expect(page.getByRole('button', { name: '解除網站出價限制', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: '管理操作原因', exact: true }).fill('核准正當理由')
  await page.getByRole('button', { name: '解除網站出價限制', exact: true }).click()
  await expect(page.getByText('網站出價限制：無', { exact: true })).toBeVisible()
})

test('結標頁只有得標帳號能取得領標訊息，手機與桌機皆可複製', async ({ page }) => {
  let outcomeFails = false
  let outcomeState = 'awaiting_payment'
  await page.route('**/rest/v1/auctions?**', (r) => {
    const a = {
      id: 'TEST-AUCTION-20261016-01',
      morph: '測試領標',
      status: 'ended',
      start_price: 100,
      end_time: new Date(Date.now() - 3600000).toISOString(),
      images: [],
      workflow_enabled: true
    }
    return r.fulfill({ json: new URL(r.request().url()).searchParams.has('id') ? a : [a] })
  })
  await page.route('**/rest/v1/auction_bids?**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/my_auction_outcome', (r) =>
    r.fulfill(
      outcomeFails
        ? { status: 400, json: { message: '測試權限查核失敗' } }
        : {
            json: {
              auction_id: 'TEST-AUCTION-20261016-01',
              amount: 700,
              state: outcomeState,
              notification_status: 'manual',
              payment_due_at: new Date(Date.now() + 23 * 3600000).toISOString()
            }
          }
    )
  )
  await page.goto('/auction/TEST-AUCTION-20261016-01')
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await expect(page.getByRole('heading', { name: '測試領標', exact: true })).toBeVisible()
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = { id: 'WINNER', type: 'google', email: 'test@example.invalid' }
  })
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toBeVisible()
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 850 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  outcomeState = 'paid'
  await page.getByRole('button', { name: '重新確認得標結果', exact: true }).click()
  await expect(
    page.getByText('工作室已確認付款，請勿重複付款。可透過官方 LINE 確認交付。')
  ).toBeVisible()
  await expect(page.locator('.winner-claim')).not.toContainText('付款期限')
  outcomeState = 'cancelled'
  await page.getByRole('button', { name: '重新確認得標結果', exact: true }).click()
  await expect(page.getByText('本場已取消，不需付款；如有疑問請聯絡工作室。')).toBeVisible()
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toHaveCount(0)
  await expect(page.locator('.winner-claim')).not.toContainText('成交金額')
  outcomeFails = true
  await page.getByRole('button', { name: '重新確認得標結果', exact: true }).click()
  await expect(page.getByText('暫時無法確認得標結果，請重試。')).toBeVisible()
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toHaveCount(0)
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = null
  })
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toHaveCount(0)
})

test('競標列表保留 47 小時的結標場次，隱藏 49 小時場次', async ({ page }) => {
  const rows = [
    {
      id: 'RECENT',
      morph: '最近結標',
      status: 'ended',
      end_time: new Date(Date.now() - 47 * 3600000).toISOString(),
      start_price: 100,
      images: []
    },
    {
      id: 'EXPIRED',
      morph: '過期結標',
      status: 'ended',
      end_time: new Date(Date.now() - 49 * 3600000).toISOString(),
      start_price: 100,
      images: []
    },
    {
      id: 'ACTIVE',
      morph: '進行中',
      status: 'active',
      end_time: new Date(Date.now() + 3600000).toISOString(),
      start_price: 100,
      images: []
    }
  ]
  await page.route('**/rest/v1/auctions?**', (r) => r.fulfill({ json: rows }))
  await page.route('**/rest/v1/auction_bids?**', (r) => r.fulfill({ json: [] }))
  await page.goto('/auction')
  await expect(
    page.getByRole('link', { name: '查看 最近結標 競標詳情', exact: true })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: '查看 過期結標 競標詳情', exact: true })).toHaveCount(
    0
  )
  await expect(page.getByRole('link', { name: '查看 進行中 競標詳情', exact: true })).toBeVisible()
})
