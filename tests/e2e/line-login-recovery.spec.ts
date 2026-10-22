import { test, expect } from '@playwright/test'
const flow = 'd0000000-0000-4000-8000-000000000002'
const transfer = `${flow}.${'b'.repeat(64)}`

test('接續碼 API 提供剩餘期限並禁止快取，不以裝置時間判斷', async ({ request, baseURL }) => {
  const expiresAt = Date.now() + 180000
  const response = await request.post('/api/auth/line/transfer', {
    headers: { origin: baseURL!, cookie: `gencko_line_return=${transfer}.${expiresAt}` },
    data: { flow }
  })
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  expect(response.headers()['referrer-policy']).toBe('no-referrer')
  const data = await response.json()
  expect(data.transfer).toBe(transfer)
  expect(data.expiresAt).toBe(expiresAt)
  expect(data.serverTime).toBeLessThan(expiresAt)
})

test('接續碼 API 拒絕過期、不符場次及缺少回程證明', async ({ request, baseURL }) => {
  for (const cookie of [
    `gencko_line_return=${transfer}.${Date.now() - 1000}`,
    `gencko_line_return=d0000000-0000-4000-8000-000000000003.${'b'.repeat(64)}`,
    ''
  ]) {
    const response = await request.post('/api/auth/line/transfer', {
      headers: { origin: baseURL!, cookie },
      data: { flow }
    })
    expect(response.status()).toBe(410)
    expect(await response.text()).not.toContain(transfer)
  }
})

test('接續碼 API 不接受外站讀取', async ({ request }) => {
  const response = await request.post('/api/auth/line/transfer', {
    headers: {
      origin: 'https://example.invalid',
      cookie: `gencko_line_return=${transfer}.${Date.now() + 180000}`
    },
    data: { flow }
  })
  expect(response.status()).toBe(403)
  expect(await response.text()).not.toContain(transfer)
})

async function ready(page: any, path = '/profile') {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
}
async function waiting(page: any) {
  await page.addInitScript(
    ({ flow }) =>
      localStorage.setItem(
        'gencko_line_login_pending_v1',
        JSON.stringify({
          id: flow,
          secret: 'a'.repeat(64),
          expires: Date.now() + 600000,
          returnTo: '/profile'
        })
      ),
    { flow }
  )
  await page.route('**/api/auth/line/relay', (r) =>
    r.fulfill({ json: { status: 'needs_transfer' } })
  )
  await ready(page)
  await expect(page.getByRole('region', { name: '接續 LINE 登入' })).toBeVisible()
}

test('接續碼暫時讀取失敗，可在原頁重試，不必重新授權', async ({ page }) => {
  let reads = 0
  await page.route('**/api/auth/line/transfer', (r) =>
    ++reads === 1
      ? r.fulfill({ status: 503, json: {} })
      : r.fulfill({ json: { transfer, serverTime: Date.now(), expiresAt: Date.now() + 180000 } })
  )
  await ready(page, `/line-login-return?flow=${flow}&status=ready`)
  await page.getByRole('button', { name: '重新取得接續碼' }).click()
  await expect(page.getByRole('textbox', { name: '可手動複製的登入接續碼' })).toHaveValue(transfer)
})
test('接續頁放到過期後，立即隱藏舊碼並禁止複製', async ({ page }) => {
  await page.route('**/api/auth/line/transfer', (r) =>
    r.fulfill({ json: { transfer, serverTime: Date.now(), expiresAt: Date.now() + 1500 } })
  )
  await ready(page, `/line-login-return?flow=${flow}&status=ready`)
  await expect(page.getByRole('button', { name: '複製登入接續碼' })).toBeVisible()
  await expect(page.getByRole('button', { name: '複製登入接續碼' })).toBeHidden({ timeout: 5000 })
  await expect(page.getByRole('heading', { level: 1 })).toContainText('逾時')
})
test('重開驗證輸入區，不沿用上次的接續碼或錯誤', async ({ page }) => {
  await waiting(page)
  await page.getByRole('textbox', { name: '登入接續碼', exact: true }).fill('OLD_INVALID_INPUT')
  await page.getByRole('button', { name: '完成登入', exact: true }).click()
  await page.evaluate(async () => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.lineLoginNeedsTransfer = false
    await new Promise((r) => setTimeout(r, 30))
    store.lineLoginNeedsTransfer = true
  })
  await expect(page.getByRole('textbox', { name: '登入接續碼', exact: true })).toHaveValue('')
  await expect(page.getByRole('status')).toHaveCount(0)
})
test('關閉輸入區後，延遲讀到的剪貼簿不可自動啟動登入', async ({ page }) => {
  await waiting(page)
  await page.evaluate(() => {
    let release: any
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: () => new Promise((r) => (release = r)) }
    })
    ;(window as any).releaseClipboard = () => release('OLD_CLIPBOARD')
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    ;(window as any).completeCalls = 0
    store.completeLineLogin = async () => {
      ;(window as any).completeCalls++
      return false
    }
  })
  await page.getByRole('button', { name: '貼上並登入' }).click()
  await page.evaluate(async () => {
    const store = (
      document.querySelector('#__nuxt') as any
    ).__vue_app__.config.globalProperties.$pinia._s.get('main')
    store.lineLoginNeedsTransfer = false
    await new Promise((r) => setTimeout(r, 30))
    ;(window as any).releaseClipboard()
  })
  await page.waitForTimeout(50)
  expect(await page.evaluate(() => (window as any).completeCalls)).toBe(0)
})
test('使用者可取消未完成的接續，不留下遮住頁面的輸入框', async ({ page }) => {
  await waiting(page)
  await page.getByRole('button', { name: '取消本次登入' }).click()
  await expect(page.getByRole('region', { name: '接續 LINE 登入' })).toBeHidden()
  expect(await page.evaluate(() => localStorage.getItem('gencko_line_login_pending_v1'))).toBeNull()
})
test('兩個分頁同時發起 LINE 與 Google，不交錯覆寫 PKCE', async ({ context }) => {
  const first = await context.newPage(),
    second = await context.newPage()
  for (const page of [first, second]) {
    await page.route('**/api/auth/line/relay', (r) => r.fulfill({ json: { status: 'ok' } }))
    await ready(page)
    await page.evaluate(() => {
      const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      ;(window as any).authorizeCount = 0
      g.$supabase.client.auth.signInWithOAuth = () => {
        ;(window as any).authorizeCount++
        return new Promise(
          (r) => ((window as any).releaseAuthorize = () => r({ error: Error('ISOLATED_FAILURE') }))
        )
      }
      window.alert = () => {}
    })
  }
  await first.evaluate(() => {
    void (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s
      .get('main')
      .loginWithLine()
  })
  await expect.poll(() => first.evaluate(() => (window as any).authorizeCount)).toBe(1)
  await second.evaluate(() => {
    void (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s
      .get('main')
      .loginWithGoogle()
  })
  await second.waitForTimeout(100)
  expect(await second.evaluate(() => (window as any).authorizeCount)).toBe(0)
  await first.evaluate(() => (window as any).releaseAuthorize())
  await expect.poll(() => second.evaluate(() => (window as any).authorizeCount)).toBe(1)
  await second.evaluate(() => (window as any).releaseAuthorize())
})
