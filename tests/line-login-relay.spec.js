import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createLineLoginRelay } from '../utils/line-login-relay'

const memory = () => {
  const items = new Map()
  return {
    getItem: (k) => items.get(k) ?? null,
    setItem: (k, v) => items.set(k, v),
    removeItem: (k) => items.delete(k)
  }
}
describe('LINE 跨瀏覽器回程', () => {
  it('登入交換成功後，不等待可能失敗的清理請求才通知畫面', async () => {
    let cleanup
    const relay = createLineLoginRelay({
      storage: memory(),
      auth: {
        exchangeCodeForSession: async () => ({ data: { session: { user: { id: 'DONE' } } } })
      },
      request: async (body) => {
        if (body.action === 'read') return { status: 'ready', code: 'CODE' }
        if (body.action === 'ack') return new Promise((r) => (cleanup = r))
        return { status: 'ok' }
      }
    })
    await relay.start('https://example.invalid/profile')
    let completed = false
    const result = relay.resume().then((v) => {
      completed = !!v?.session
    })
    await new Promise((r) => setTimeout(r, 20))
    const beforeCleanup = completed
    cleanup({ status: 'ok' })
    await result
    expect(beforeCleanup).toBe(true)
  })
  it('拒絕尾端夾帶額外內容的接續碼，保留原有流程供重新貼上', async () => {
    const relay = createLineLoginRelay({
      storage: memory(),
      auth: {},
      request: async () => ({ status: 'ok' })
    })
    const redirect = await relay.start('https://example.invalid/profile')
    const id = new URL(redirect).searchParams.get('flow')
    expect(() => relay.attachTransfer(`${id}.${'b'.repeat(64)}.junk`)).toThrow(
      'LINE_TRANSFER_INVALID'
    )
    expect(relay.pending()).toBeTruthy()
  })
  it('登出取消尚未完成的發起請求，不可再開啟舊授權流程', async () => {
    let release
    const relay = createLineLoginRelay({
      storage: memory(),
      auth: {},
      request: () => new Promise((r) => (release = r))
    })
    const start = relay.start('https://example.invalid/profile')
    while (!release) await new Promise((r) => setTimeout(r, 0))
    relay.cancel()
    release({ status: 'ok' })
    await expect(start).rejects.toThrow('LINE_LOGIN_CANCELLED')
  })
  it('重現：另一瀏覽器沒有發起端的 PKCE verifier，無法交換登入', async () => {
    const options = (storage) => ({
      auth: {
        storage,
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
    const app = createClient('https://example.invalid', 'public', options(memory()))
    const browser = createClient('https://example.invalid', 'public', options(memory()))
    const { data } = await app.auth.signInWithOAuth({
      provider: 'custom:line-oauth',
      options: { skipBrowserRedirect: true }
    })
    expect(new URL(data.url).searchParams.get('code_challenge')).toBeTruthy()
    const { error } = await browser.auth.exchangeCodeForSession('callback-in-other-browser')
    expect(error?.code).toBe('pkce_code_verifier_not_found')
  })

  it('只有原本持有秘密的 App 能取回授權碼，重載後仍可接續', async () => {
    const storage = memory(),
      calls = []
    let ready = false
    const request = async (body) => {
      calls.push(body)
      return body.action === 'read'
        ? ready
          ? { status: 'ready', code: 'ONE_TIME_CODE' }
          : { status: 'pending' }
        : { status: 'ok' }
    }
    const auth = {
      exchangeCodeForSession: async (code) => ({
        data: { session: { user: { id: code } } },
        error: null
      })
    }
    const first = createLineLoginRelay({ storage, request, auth })
    const target = await first.start('https://example.invalid/auction/TEST?keep=1')
    expect(new URL(target).pathname).toBe('/api/auth/line/callback')
    expect(target).not.toMatch(/secret|access_token|refresh_token/)
    expect(await first.resume()).toBeNull()
    ready = true
    const second = createLineLoginRelay({ storage, request, auth })
    expect(await second.resume()).toMatchObject({
      returnTo: '/auction/TEST?keep=1',
      session: { user: { id: 'ONE_TIME_CODE' } }
    })
    expect(await second.resume()).toBeNull()
    expect(calls.filter((c) => c.action === 'ack')).toHaveLength(1)
  })

  it('沒有發起紀錄的回程瀏覽器不交換、不取回登入', async () => {
    let requested = false
    const relay = createLineLoginRelay({
      storage: memory(),
      request: async () => {
        requested = true
      },
      auth: {}
    })
    expect(await relay.resume()).toBeNull()
    expect(requested).toBe(false)
  })
  it('跨瀏覽器須貼上對應的回程證明，只有發起秘密不可直接登入', async () => {
    const storage = memory(),
      returnSecret = 'b'.repeat(64)
    let exchanged = 0,
      flowId
    const relay = createLineLoginRelay({
      storage,
      auth: {
        exchangeCodeForSession: async () => {
          exchanged++
          return { data: { session: { user: { id: 'VERIFIED' } } } }
        }
      },
      request: async (body) => {
        if (body.action === 'start') {
          flowId = body.flow
          return { status: 'ok' }
        }
        if (body.action === 'read')
          return body.returnSecret === returnSecret
            ? { status: 'ready', code: 'CODE' }
            : { status: 'needs_transfer' }
        return { status: 'ok' }
      }
    })
    await relay.start('https://example.invalid/profile')
    expect(await relay.resume()).toEqual({ needsTransfer: true })
    expect(exchanged).toBe(0)
    expect(() => relay.attachTransfer(`wrong.${returnSecret}`)).toThrow('LINE_TRANSFER_INVALID')
    relay.attachTransfer(`${flowId}.${returnSecret}`)
    expect(await relay.resume()).toMatchObject({ session: { user: { id: 'VERIFIED' } } })
    expect(exchanged).toBe(1)
  })

  it('過期清除，網路暫斷保留，不顯示原始回程錯誤', async () => {
    let now = 1000,
      fail = false
    const storage = memory()
    const relay = createLineLoginRelay({
      storage,
      now: () => now,
      request: async (body) => {
        if (fail) throw Error('private detail')
        return { status: 'ok' }
      },
      auth: {}
    })
    await relay.start('https://example.invalid/profile')
    fail = true
    await expect(relay.resume()).rejects.toThrow('private detail')
    expect(relay.pending()).toBeTruthy()
    now += 11 * 60 * 1000
    expect(relay.pending()).toBeNull()
  })

  it('取消或切換登入後，舊回程不能再進行交換', async () => {
    let release
    const storage = memory(),
      exchanged = []
    const relay = createLineLoginRelay({
      storage,
      request: async (body) => (body.action === 'read' ? new Promise((r) => (release = r)) : {}),
      auth: {
        exchangeCodeForSession: async (code) => {
          exchanged.push(code)
        }
      }
    })
    await relay.start('https://example.invalid/profile')
    const pending = relay.resume()
    relay.cancel()
    release({ status: 'ready', code: 'OLD' })
    expect(await pending).toBeNull()
    expect(exchanged).toEqual([])
  })
})
