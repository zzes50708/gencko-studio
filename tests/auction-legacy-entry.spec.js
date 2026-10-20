import { it, expect, vi } from 'vitest'

it('舊結標入口對任何請求都回覆停用，不讀取密鑰或存取資料庫', async () => {
  let handler
  const envRead = vi.fn(() => {
    throw Error('不可讀取密鑰')
  })
  const fetch = vi.fn(() => {
    throw Error('不可連線')
  })
  vi.stubGlobal('Deno', {
    serve: (callback) => {
      handler = callback
    },
    env: { get: envRead }
  })
  vi.stubGlobal('fetch', fetch)
  try {
    await import('../supabase/functions/end-auction/index.ts')
    for (const method of ['GET', 'POST', 'DELETE']) {
      const response = await handler(new Request('https://example.test/end-auction', { method }))
      expect(response.status).toBe(410)
      expect(response.headers.get('cache-control')).toBe('no-store')
      expect(await response.json()).toEqual({ error: '此結標入口已停用' })
    }
    expect(envRead).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    vi.unstubAllGlobals()
  }
})
