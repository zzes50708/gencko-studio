import { test, expect } from '@playwright/test'

async function openContact(page: any) {
  const now = Date.now()
  await page.clock.install({ time: now })
  const a = {
    id: 'TEST-CONTACT-LIFE',
    morph: '聯絡生命週期測試',
    status: 'active',
    start_price: 100,
    min_increment: 100,
    end_time: new Date(now + 86400000).toISOString(),
    workflow_enabled: true,
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
    return r.fulfill({ json: { required: true, ready: false, restricted: false } })
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
  await expect(page.getByRole('button', { name: '建立 LINE 聯絡', exact: true })).toBeVisible()
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
