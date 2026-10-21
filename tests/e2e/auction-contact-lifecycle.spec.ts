import { test, expect } from '@playwright/test'

async function openContact(page: any, required = true, workflow = true) {
  const now = Date.now()
  await page.clock.install({ time: now })
  const a = {
    id: 'TEST-CONTACT-LIFE',
    morph: '聯絡生命週期測試',
    status: 'active',
    start_price: 100,
    min_increment: 100,
    end_time: new Date(now + 86400000).toISOString(),
    workflow_enabled: workflow,
    images: []
  }
  const state = { calls: 0, created: 0, hold: false, release: null as null | (() => void) }
  await page.route('**/api/server-time', (r: any) => r.fulfill({ json: { serverTime: now } }))
  await page.route('**/rest/v1/auctions?**', (r: any) =>
    r.fulfill({ json: new URL(r.request().url()).searchParams.has('id') ? a : [a] })
  )
  await page.route('**/rest/v1/auction_bids?**', (r: any) => r.fulfill({ json: [] }))
  await page.route('**/rest/v1/rpc/get_auction_contact_status', async (r: any) => {
    state.calls++
    if (state.hold)
      await new Promise<void>((resolve) => {
        state.release = resolve
      })
    return r.fulfill({ json: { required, ready: false, restricted: false } })
  })
  await page.route('**/rest/v1/rpc/create_auction_line_link', (r: any) => {
    state.created++
    return r.fulfill({
      json: {
        code: (state.created === 1 ? 'a' : 'b').repeat(36),
        expires_at: new Date(now + state.created * 10000).toISOString()
      }
    })
  })
  await page.goto('/stories')
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async (a: any) => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    g.$supabase.client.auth.getSession = async () => ({
      data: {
        session: {
          user: {
            id: 'CONTACT-MEMBER',
            app_metadata: { provider: 'custom:line-oauth' },
            user_metadata: {}
          }
        }
      },
      error: null
    })
    g.$pinia._s.get('main').currentUser = {
      id: 'CONTACT-MEMBER',
      type: 'line',
      authSource: 'supabase',
      email: 'test@example.invalid'
    }
    g.$pinia._s.get('main').auctionList = [a]
    await g.$router.push(`/auction/${a.id}`)
  }, a)
  await expect(page.getByRole('heading', { name: '聯絡生命週期測試', exact: true })).toBeVisible()
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = {
      id: 'CONTACT-MEMBER',
      type: 'line',
      authSource: 'supabase',
      email: 'test@example.invalid'
    }
  })
  if (required)
    await expect(page.getByRole('button', { name: '建立 LINE 聯絡', exact: true })).toBeVisible()
  else await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
  return state
}

test('離開競標頁後，延遲完成的LINE輪詢不得重新啟動背景請求', async ({ page }) => {
  const state = await openContact(page)
  state.hold = true
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  await expect.poll(() => !!state.release).toBe(true)
  await page.evaluate(async () =>
    (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$router.push(
      '/stories'
    )
  )
  await expect(page.locator('.line-contact')).toHaveCount(0)
  const response = page.waitForResponse((r) => r.url().includes('/rpc/get_auction_contact_status'))
  state.hold = false
  state.release!()
  await response
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  const before = state.calls
  await page.clock.fastForward(6000)
  await page.waitForTimeout(150)
  expect(state.calls).toBe(before)
})

test('僅Google登入不出現出價入口，切回LINE可繼續', async ({ page }) => {
  await openContact(page)
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).currentUser = {
      id: 'GOOGLE-MEMBER',
      type: 'google',
      authSource: 'supabase',
      email: 'test@example.invalid'
    }
  })
  await expect(page.getByRole('button', { name: 'LINE 登入', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Google 登入', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toHaveCount(0)
})

test('暱稱欄與確認出價都提醒完整公開，取消不送出出價', async ({ page }) => {
  await openContact(page, false)
  let posts = 0
  await page.route('**/api/auctions/**/bid', (r) => {
    posts++
    return r.abort()
  })
  const input = page.getByLabel('自訂顯示暱稱', { exact: true })
  await expect(input).toHaveAttribute('aria-describedby', 'nickname-public-notice')
  await expect(page.locator('#nickname-public-notice')).toContainText('不會再遮蔽')
  await input.fill('公開測試名稱')
  let confirmation = ''
  page.once('dialog', async (d) => {
    confirmation = d.message()
    await d.dismiss()
  })
  await page.getByRole('button', { name: '確認出價', exact: true }).click()
  await expect.poll(() => confirmation).toContain('公開名稱：公開測試名稱（完整顯示，不遮蔽）')
  expect(posts).toBe(0)
})

test('舊綁定碼複製延遲完成，不得替新綁定碼顯示已複製', async ({ page }) => {
  const state = await openContact(page)
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          new Promise<void>((resolve) => {
            ;(window as any).finishOldCopy = resolve
          })
      }
    })
  })
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  await page.getByRole('button', { name: '複製綁定訊息', exact: true }).click()
  await page.clock.fastForward(11000)
  await expect(page.getByText('綁定碼已過期，請重新建立。', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'LINE 綁定訊息', exact: true })).toHaveValue(
    '競標綁定 ' + 'b'.repeat(36)
  )
  await page.evaluate(() => (window as any).finishOldCopy())
  await expect(
    page.getByText('已複製，請貼到 Gencko 官方 LINE 並傳送。', { exact: true })
  ).toHaveCount(0)
  expect(state.created).toBe(2)
})

test('官方驗證查詢失敗時不誤導建立綁定，可重新確認恢復', async ({ page }) => {
  await openContact(page)
  await page.route('**/rest/v1/rpc/get_auction_contact_status', (r) =>
    r.fulfill({ status: 503, json: { message: '隔離故障' } })
  )
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  await expect(page.getByText('暫時無法確認 LINE 聯絡狀態，請重新確認。')).toBeVisible()
  await expect(page.getByRole('button', { name: '建立 LINE 聯絡', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeDisabled()
  await page.route('**/rest/v1/rpc/get_auction_contact_status', (r) =>
    r.fulfill({ json: { required: false, ready: false, restricted: false } })
  )
  await page.getByRole('button', { name: '重新確認 LINE 狀態', exact: true }).click()
  await expect(page.locator('.line-contact')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
})

test('伺服器回傳已過期綁定碼不提供傳送入口', async ({ page }) => {
  await openContact(page)
  await page.route('**/rest/v1/rpc/create_auction_line_link', (r) =>
    r.fulfill({ json: { code: 'a'.repeat(36), expires_at: '2000-01-01T00:00:00Z' } })
  )
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  await expect(page.getByText('暫時無法建立綁定碼，請稍後重試。')).toBeVisible()
  await expect(page.getByRole('link', { name: '前往 LINE 傳送綁定訊息' })).toHaveCount(0)
})

test('返回網站重新查核出價限制，解除限制後恢復，重複回前景事件只補查一次', async ({ page }) => {
  const state = await openContact(page, false)
  await page.route('**/rest/v1/rpc/get_auction_contact_status', (r) =>
    r.fulfill({ json: { required: false, ready: false, restricted: true } })
  )
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(
    page.getByText('此帳號已被限制出價。請回覆官方 LINE 說明原因，由工作室審核解除。')
  ).toBeVisible()
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeDisabled()
  let calls = 0
  await page.route('**/rest/v1/rpc/get_auction_contact_status', async (r) => {
    calls++
    await new Promise((done) => setTimeout(done, 100))
    return r.fulfill({ json: { required: false, ready: false, restricted: false } })
  })
  await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'))
    window.dispatchEvent(new Event('pageshow'))
    window.dispatchEvent(new Event('online'))
  })
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
  expect(calls).toBe(1)
})

test('非付款測試場次也須先傳驗證碼，成功後顯示已驗證與開放出價', async ({ page }) => {
  await openContact(page, true, false)
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeDisabled()
  await expect(page.getByText(/每個 LINE 帳號只需驗證一次/)).toBeVisible()
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  await expect(page.getByRole('button', { name: '我已傳送，重新確認', exact: true })).toBeVisible()
  await page.route('**/rest/v1/rpc/get_auction_contact_status', (r) =>
    r.fulfill({ json: { required: true, ready: true, restricted: false } })
  )
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByText('✓ 官方 LINE 聯絡已驗證')).toBeVisible()
  await expect(page.getByRole('button', { name: '建立 LINE 聯絡', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '確認出價', exact: true })).toBeEnabled()
})

for (const action of ['複製', '開啟LINE']) {
  test(`輪詢間隔內過期的驗證碼不可繼續${action}，應改為重新建立`, async ({ page }) => {
    if (action === '開啟LINE')
      await page.addInitScript(() =>
        Object.defineProperty(navigator, 'userAgent', {
          configurable: true,
          value: 'Mozilla Android 14 Mobile'
        })
      )
    await openContact(page)
    await page.route('**/rest/v1/rpc/create_auction_line_link', (r) =>
      r.fulfill({
        json: { code: 'a'.repeat(36), expires_at: new Date(Date.now() + 7000).toISOString() }
      })
    )
    await page.evaluate(() =>
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          writeText: async () => {
            ;(window as any).__expiredCopies = ((window as any).__expiredCopies || 0) + 1
          }
        }
      })
    )
    await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
    await expect(page.getByRole('button', { name: '複製綁定訊息', exact: true })).toBeVisible()
    // 模擬恢復前景後重新校時，尚未等到下一次五秒輪詢。
    await page.evaluate(() => {
      ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
        'main'
      ).auctionNow = () => Date.now() + 60000
    })
    const control =
      action === '複製'
        ? page.getByRole('button', { name: '複製綁定訊息', exact: true })
        : page.getByRole('link', { name: '前往 LINE 傳送綁定訊息', exact: true })
    if (await control.isVisible()) await control.click()
    await expect(page.getByRole('textbox', { name: 'LINE 綁定訊息', exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => (window as any).__expiredCopies || 0)).toBe(0)
    expect(page.context().pages()).toHaveLength(1)
    await expect(page.getByRole('button', { name: '建立 LINE 聯絡', exact: true })).toBeVisible()
  })
}

test('桌機驗證入口提供本機產生的訊息 QR Code，沒有不支援的聊天跳轉', async ({ page }) => {
  const { default: QRCode } = await import('qrcode')
  await openContact(page)
  await page.getByRole('button', { name: '建立 LINE 聯絡', exact: true }).click()
  await expect(page.getByRole('link', { name: '前往 LINE 傳送綁定訊息', exact: true })).toHaveCount(
    0
  )
  await expect(
    page.getByRole('link', { name: '官方帳號／加好友 QR Code', exact: true })
  ).toHaveAttribute('href', 'https://line.me/R/ti/p/%40219abdzn')
  await page.getByRole('button', { name: '用手機 LINE 掃碼傳送', exact: true }).click()
  const image = page.getByRole('img', {
    name: '用手機 LINE 掃描以開啟官方帳號並預填訊息',
    exact: true
  })
  await expect(image).toBeVisible()
  const expectedLink =
    'https://line.me/R/oaMessage/%40219abdzn/?' + encodeURIComponent('競標綁定 ' + 'a'.repeat(36))
  const svg = await QRCode.toString(expectedLink, {
    type: 'svg',
    margin: 4,
    width: 240,
    errorCorrectionLevel: 'M'
  })
  expect(await image.getAttribute('src')).toBe(
    'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
  )
  await page.locator('.line-contact').screenshot({ path: 'output/line-desktop-handoff.png' })
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.evaluate(() => {
    ;(document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s.get(
      'main'
    ).auctionNow = () => Date.now() + 60000
  })
  await page.getByRole('button', { name: '收起傳送 QR Code', exact: true }).click()
  await expect(image).toHaveCount(0)
  await expect(page.getByRole('button', { name: '建立 LINE 聯絡', exact: true })).toBeVisible()
})
