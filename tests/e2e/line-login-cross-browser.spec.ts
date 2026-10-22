import { test, expect } from '@playwright/test'
import { createHash } from 'node:crypto'

for (const isolated of [true, false])
  test(`LINE 回程以原 verifier 完成登入（隔離瀏覽器 ${isolated}）`, async ({ browser }) => {
    const app = await browser.newContext({ serviceWorkers: 'block' })
    const callback = isolated ? await browser.newContext({ serviceWorkers: 'block' }) : app
    const records = new Map<string, any>()
    const returnSecret = 'b'.repeat(64)
    let tokenCalls = 0,
      challenge = '',
      authorize = ''
    const uid = 'd0000000-0000-4000-8000-000000000001'
    const session = {
      access_token: `e30.${Buffer.from(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.test`,
      refresh_token: 'isolated-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: uid,
        aud: 'authenticated',
        role: 'authenticated',
        app_metadata: { provider: 'custom:line-oauth', providers: ['custom:line-oauth'] },
        user_metadata: { name: '隔離回程測試' },
        identities: []
      }
    }
    try {
      for (const context of new Set([app, callback])) {
        await context.route('**/api/auth/line/relay', async (route) => {
          const body = route.request().postDataJSON()
          if (body.action === 'start')
            records.set(body.flow, { proof: body.proof, status: 'pending' })
          const record = records.get(body.flow)
          if (body.action === 'ack') records.delete(body.flow)
          if (body.action === 'read') {
            const proof = createHash('sha256').update(body.secret).digest('hex')
            const hasReturn =
              body.returnSecret === returnSecret ||
              route
                .request()
                .headers()
                ['cookie']?.includes(`gencko_line_return=${body.flow}.${returnSecret}`)
            return route.fulfill({
              json:
                record?.proof === proof
                  ? record.status === 'ready' && !hasReturn
                    ? { status: 'needs_transfer' }
                    : { status: record.status, code: record.code }
                  : { status: 'expired' }
            })
          }
          return route.fulfill({ json: { status: 'ok' } })
        })
        await context.route('**/auth/v1/token?grant_type=pkce', (route) => {
          tokenCalls++
          const body = route.request().postDataJSON()
          expect(createHash('sha256').update(body.code_verifier).digest('base64url')).toBe(
            challenge
          )
          expect(body.auth_code).toBe('ISOLATED_LINE_AUTH_CODE')
          return route.fulfill({ json: session })
        })
      }
      const page = await app.newPage()
      await page.route('**/auth/v1/authorize?**', (route) => {
        authorize = route.request().url()
        challenge = new URL(authorize).searchParams.get('code_challenge')!
        return route.fulfill({ contentType: 'text/html', body: '已離開原 App，進入隔離授權測試' })
      })
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      await expect(
        page.getByRole('button', { name: 'LINE 登入', exact: true }).first()
      ).toBeVisible()
      await page.waitForFunction(
        () =>
          !!(
            document.querySelector('#__nuxt') as any
          )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')
      )
      await page.getByRole('button', { name: 'LINE 登入', exact: true }).first().click()
      await expect.poll(() => authorize).not.toBe('')
      const flow = new URL(new URL(authorize).searchParams.get('redirect_to')!).searchParams.get(
        'flow'
      )!
      const record = records.get(flow)
      expect(record).toBeTruthy()
      record.status = 'ready'
      record.code = 'ISOLATED_LINE_AUTH_CODE'
      await callback.addCookies([
        {
          name: 'gencko_line_return',
          value: `${flow}.${returnSecret}`,
          url: 'http://127.0.0.1:42861',
          httpOnly: true,
          sameSite: 'Lax'
        }
      ])
      await callback.route('**/api/auth/line/transfer', (route) =>
        route.fulfill({
          json: {
            transfer: `${flow}.${returnSecret}`,
            serverTime: Date.now(),
            expiresAt: Date.now() + 240000
          }
        })
      )
      const returned = await callback.newPage()
      await returned.goto(`/line-login-return?flow=${flow}&status=ready`, {
        waitUntil: 'domcontentloaded'
      })
      if (isolated) {
        await expect(
          returned.getByRole('heading', { name: '請返回原本的 Gencko App' })
        ).toBeVisible()
        await expect(returned.getByRole('button', { name: '複製登入接續碼' })).toBeVisible()
        expect(tokenCalls).toBe(0)
        await returned.setViewportSize({ width: 390, height: 844 })
        await returned.screenshot({ path: 'output/line-return-handoff-390.png' })
      } else {
        await expect(returned).toHaveURL(/\/profile$/)
        expect(tokenCalls).toBe(1)
      }
      expect(
        await returned.evaluate(() => localStorage.getItem('gencko_line_login_pending_v1'))
      ).toBeNull()
      // 原 App 重新進入時保留自己的 cookie 與發起秘密，不共用回程瀏覽器的儲存。
      await page.goto('/profile', { waitUntil: 'domcontentloaded' })
      if (isolated) {
        await expect(page.getByRole('region', { name: '接續 LINE 登入' })).toBeVisible()
        await page.setViewportSize({ width: 390, height: 844 })
        await page.screenshot({ path: 'output/line-original-app-resume-390.png' })
        expect(tokenCalls).toBe(0)
        const transfer = await returned
          .getByRole('textbox', { name: '可手動複製的登入接續碼' })
          .inputValue()
        await page.getByRole('textbox', { name: '登入接續碼', exact: true }).fill(transfer)
        await page.getByRole('button', { name: '完成登入', exact: true }).click()
      }
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (
                document.querySelector('#__nuxt') as any
              )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')?.currentUser?.id
          )
        )
        .toBe(uid)
      expect(tokenCalls).toBe(1)
      expect(
        await page.evaluate(() => localStorage.getItem('gencko_line_login_pending_v1'))
      ).toBeNull()
      expect(records.has(flow)).toBe(false)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              (
                document.querySelector('#__nuxt') as any
              )?.__vue_app__?.config.globalProperties.$pinia?._s.get('main')?.currentUser?.id
          )
        )
        .toBe(uid)
      expect(tokenCalls).toBe(1)
    } finally {
      await app.close()
      if (isolated) await callback.close()
    }
  })
