import { test, expect } from '@playwright/test'

test('領標後返回網站會更新領標與付款狀態，正常補查保留未送出的訊息', async ({ page }) => {
  const now = Date.now()
  let claimed = false,
    status = 'awaiting_payment',
    calls = 0,
    fail = false,
    claimCalls = 0
  const a = {
    id: 'TEST-CLAIM-RESUME',
    morph: '領標返回測試',
    status: 'ended',
    start_price: 200,
    end_time: new Date(now - 60000).toISOString(),
    images: [],
    workflow_enabled: true
  }
  await page.route('**/api/server-time', (r) => r.fulfill({ json: { serverTime: now } }))
  await page.route('**/rest/v1/auctions?**', (r) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.has('id') ? a : [a] })
  )
  await page.route('**/rest/v1/auction_bids?**', (r) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/my_auction_outcome', async (r) => {
    calls++
    await new Promise((done) => setTimeout(done, 80))
    return fail
      ? r.fulfill({ status: 503, json: { message: '隔離故障' } })
      : r.fulfill({
          json: {
            auction_id: a.id,
            state: status,
            amount: 700,
            notification_status: 'manual',
            payment_due_at: new Date(now + 86400000).toISOString(),
            claimed_at: claimed ? new Date(now).toISOString() : null
          }
        })
  })
  await page.route('**/rest/v1/rpc/create_auction_winner_claim', (r) => {
    claimCalls++
    return r.fulfill({
      json: {
        message: '領標驗證：' + 'a'.repeat(36),
        amount: 700,
        expires_at: new Date(now + 900000).toISOString()
      }
    })
  })
  await page.goto('/auction/' + a.id)
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await expect(page.getByRole('heading', { name: '領標返回測試', exact: true })).toBeVisible()
  await page.evaluate(async () => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    g.$supabase.client.auth.getSession = async () => ({
      data: {
        session: {
          user: {
            id: 'CLAIM-WINNER',
            app_metadata: { provider: 'custom:line-oauth' },
            user_metadata: {}
          }
        }
      },
      error: null
    })
    await g.$pinia._s.get('main').checkAuthStatus()
    g.$pinia._s.get('main').currentUser = {
      id: 'CLAIM-WINNER',
      type: 'line',
      authSource: 'supabase'
    }
  })
  await page.getByRole('button', { name: '複製得標確認訊息', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '得標確認訊息' })).toHaveValue(/aaaaaaaa/)
  await page.getByRole('button', { name: '複製得標確認訊息', exact: true }).click()
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toBeEnabled()
  expect(claimCalls).toBe(1)
  await page.getByRole('button', { name: '用手機 LINE 掃碼傳送', exact: true }).click()
  await expect(
    page.getByRole('img', { name: '用手機 LINE 掃描以開啟官方帳號並預填訊息', exact: true })
  ).toBeVisible()
  const before = calls
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('online'))
    window.dispatchEvent(new Event('pageshow'))
  })
  await expect.poll(() => calls).toBe(before + 1)
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toBeEnabled()
  await expect(page.getByRole('textbox', { name: '得標確認訊息' })).toHaveValue(/aaaaaaaa/)
  claimed = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('已收到 LINE 領標訊息。', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '得標確認訊息' })).toHaveCount(0)
  await expect(
    page.getByRole('img', { name: '用手機 LINE 掃描以開啟官方帳號並預填訊息', exact: true })
  ).toHaveCount(0)
  status = 'paid'
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(
    page.getByText('工作室已確認付款，請勿重複付款。可透過官方 LINE 確認交付。')
  ).toBeVisible()
  status = 'cancelled'
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('本場已取消，不需付款；如有疑問請聯絡工作室。')).toBeVisible()
  await expect(page.getByRole('button', { name: '複製得標確認訊息', exact: true })).toHaveCount(0)
  fail = true
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('暫時無法確認得標結果，請重試。', { exact: true })).toBeVisible()
})
