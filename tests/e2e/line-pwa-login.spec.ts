import { test, expect } from '@playwright/test'

const android =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
async function app(page: any, standalone = true) {
  await page.addInitScript((installed: boolean) => {
    const original = window.matchMedia.bind(window)
    window.matchMedia = (query) => {
      const result = original(query)
      if (query === '(display-mode: standalone)')
        Object.defineProperty(result, 'matches', { value: installed })
      return result
    }
  }, standalone)
  await page.goto('/profile', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () =>
      !!(
        document.querySelector('#__nuxt') as any
      )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
  )
  await page.evaluate(async () => {
    await (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$pinia._s
      .get('main')
      .checkAuthStatus()
  })
}

for (const installed of [true, false]) {
  test(`Android LINE 登入保留原頁回程（安裝模式 ${installed}）`, async ({ browser }) => {
    const context = await browser.newContext({ userAgent: android })
    try {
      const page = await context.newPage()
      let authorize = ''
      await page.route('**/api/auth/line/relay', (r) => r.fulfill({ json: { status: 'ok' } }))
      await page.route('**/auth/v1/authorize?**', (r) => {
        authorize = r.request().url()
        return r.fulfill({ contentType: 'text/html', body: '<p>隔離登入測試</p>' })
      })
      await app(page, installed)
      await page.getByRole('button', { name: 'LINE 登入', exact: true }).first().click()
      await expect.poll(() => authorize).not.toBe('')
      const url = new URL(authorize)
      expect(url.searchParams.get('provider')).toBe('custom:line-oauth')
      expect(url.searchParams.has('disable_auto_login')).toBe(false)
      expect(url.searchParams.get('prompt')).not.toBe('login')
      expect(url.searchParams.get('code_challenge')).toBeTruthy()
      expect(new URL(url.searchParams.get('redirect_to')!).pathname).toBe('/api/auth/line/callback')
      expect(new URL(url.searchParams.get('redirect_to')!).searchParams.get('flow')).toBeTruthy()
    } finally {
      await context.close()
    }
  })
}

test('回到App、恢復連線及顯示頁面時，重新讀取已登入的同瀏覽器工作階段', async ({ page }) => {
  await app(page)
  await page.evaluate(() => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    g.$supabase.client.auth.getSession = async () => ({
      data: {
        session: {
          user: {
            id: 'PWA-LINE',
            app_metadata: { provider: 'custom:line-oauth' },
            user_metadata: { name: 'PWA 測試會員' }
          }
        }
      },
      error: null
    })
    window.dispatchEvent(new Event('pageshow'))
  })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            document.querySelector('#__nuxt') as any
          ).__vue_app__.config.globalProperties.$pinia._s.get('main').currentUser?.id
      )
    )
    .toBe('PWA-LINE')
})

test('登出只針對此裝置，失敗保留登入並提示，重試成功清除', async ({ page }) => {
  await app(page, false)
  const result = await page.evaluate(async () => {
    const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
    const store = g.$pinia._s.get('main')
    const calls: any[] = [],
      messages: string[] = []
    window.alert = (text) => messages.push(text)
    store.currentUser = { id: 'LINE-LOGOUT', type: 'line', authSource: 'supabase' }
    g.$supabase.client.auth.signOut = async (options: any) => {
      calls.push(options)
      return { error: new Error('offline') }
    }
    await store.logout()
    const retained = store.currentUser?.id
    g.$supabase.client.auth.signOut = async (options: any) => {
      calls.push(options)
      return { error: null }
    }
    await store.logout()
    return { calls, messages, retained, after: store.currentUser }
  })
  expect(result.calls).toEqual([{ scope: 'local' }, { scope: 'local' }])
  expect(result.retained).toBe('LINE-LOGOUT')
  expect(result.messages).toEqual(['登出未完成，請確認網路後重試。'])
  expect(result.after).toBeNull()
})
