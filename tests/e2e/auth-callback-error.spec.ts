import { test, expect } from '@playwright/test'
for (const fragment of [false, true]) {
  test(`取消授權返回顯示一次提示並清理網址（fragment ${fragment}）`, async ({ page }) => {
    const messages: string[] = []
    page.on('dialog', async (dialog) => {
      messages.push(dialog.message())
      await dialog.accept()
    })
    const suffix = fragment
      ? '#error=access_denied&error_description=PRIVATE_CALLBACK_DETAIL'
      : '?keep=1&error=access_denied&error_description=PRIVATE_CALLBACK_DETAIL'
    await page.goto('/profile' + suffix, { waitUntil: 'domcontentloaded' })
    await expect
      .poll(() => messages)
      .toEqual(['你已取消登入，尚未完成新的登入；可以再次選擇登入。'])
    await expect(page).toHaveURL(fragment ? /\/profile$/ : /\/profile\?keep=1$/)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'LINE 登入', exact: true }).first()).toBeVisible()
    expect(messages).toHaveLength(1)
    expect(messages.join()).not.toContain('PRIVATE_CALLBACK_DETAIL')
  })
}
for (const firstProvider of ['line', 'google']) {
  test(`同時點登入不覆寫驗證流程，失敗後可重新登入（先 ${firstProvider}）`, async ({ page }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'LINE 登入', exact: true }).first()).toBeVisible()
    await page.waitForFunction(
      () =>
        !!(
          document.querySelector('#__nuxt') as any
        )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
    )
    const result = await page.evaluate(async (firstProvider) => {
      const g = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties
      const store = g.$pinia._s.get('main')
      const calls: any[] = [],
        alerts: string[] = []
      window.alert = (text) => alerts.push(text)
      let release: any
      g.$supabase.client.auth.signInWithOAuth = (args: any) => {
        calls.push(args)
        return new Promise((resolve) => {
          release = resolve
        })
      }
      history.replaceState(
        history.state,
        '',
        '/profile?keep=1&code=old&state=old&error=server_error#bids'
      )
      const first = firstProvider === 'line' ? store.loginWithLine() : store.loginWithGoogle()
      await (firstProvider === 'line' ? store.loginWithGoogle() : store.loginWithLine())
      const pendingCount = calls.length
      release({ error: new Error('隔離登入失敗') })
      await first
      g.$supabase.client.auth.signInWithOAuth = async (args: any) => {
        calls.push(args)
        return { error: null }
      }
      await store.loginWithGoogle()
      return { calls, alerts, pendingCount }
    }, firstProvider)
    expect(result.pendingCount).toBe(1)
    expect(result.calls).toHaveLength(2)
    expect(result.alerts).toHaveLength(1)
    expect(result.calls[1].options.redirectTo).toMatch(/\/profile\?keep=1#bids$/)
    expect(result.calls[1].options.redirectTo).not.toMatch(/code=|state=|error=/)
  })
}
