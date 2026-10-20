import { it, expect, vi, afterEach } from 'vitest'

const client = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => client }))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  client.rpc.mockReset()
})

async function setup() {
  let handler
  const env = {
    SUPABASE_URL: 'https://example.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-only',
    AUCTION_LINE_CHANNEL_ID: 'test-only',
    AUCTION_LINE_CHANNEL_SECRET: 'test-secret',
    AUCTION_WORKER_SECRET: 'test-worker'
  }
  vi.stubGlobal('Deno', {
    serve: (callback) => {
      handler = callback
    },
    env: { get: (key) => env[key] }
  })
  client.rpc.mockResolvedValue({ data: { linked: true }, error: null })
  await import('../supabase/functions/auction-workflow/index.ts')
  return handler
}
async function signedRequest(events) {
  const raw = JSON.stringify({ events })
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('test-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = btoa(
    String.fromCharCode(
      ...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)))
    )
  )
  return new Request('https://example.invalid/auction-workflow/line-webhook', {
    method: 'POST',
    headers: { 'x-line-signature': signature },
    body: raw
  })
}
const event = {
  type: 'message',
  source: { type: 'user', userId: 'U' + 'a'.repeat(32) },
  webhookEventId: 'isolated-event',
  timestamp: 1792450000000,
  message: { type: 'text', text: '競標綁定 ' + 'a'.repeat(36) }
}

it('LINE 暱稱查詢失敗不能阻擋已驗證來源的領標／綁定事件寫入', async () => {
  const handler = await setup()
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw Error('LINE optional profile unavailable')
    })
  )
  const response = await handler(await signedRequest([event]))
  expect(response.status).toBe(200)
  expect(client.rpc).toHaveBeenCalledWith(
    'record_auction_line_event',
    expect.objectContaining({ p_event_id: 'isolated-event', p_code: 'a'.repeat(36), p_name: null })
  )
})

it('未驗證簽章與非 POST 請求不可呼叫資料庫，群組訊息不可綁定身分', async () => {
  const handler = await setup()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect((await handler(new Request('https://example.invalid/line-webhook'))).status).toBe(405)
  expect(
    (
      await handler(
        new Request('https://example.invalid/line-webhook', {
          method: 'POST',
          body: '{"events":[]}'
        })
      )
    ).status
  ).toBe(401)
  expect(
    (await handler(await signedRequest([{ ...event, source: { ...event.source, type: 'group' } }])))
      .status
  ).toBe(200)
  expect(client.rpc).not.toHaveBeenCalled()
  expect(fetch).not.toHaveBeenCalled()
})

it('事件缺少編號或時間無效時不查暱稱、不寫入；資料庫失敗不回覆假成功', async () => {
  const handler = await setup()
  const fetch = vi.fn()
  vi.stubGlobal('fetch', fetch)
  expect(
    (
      await handler(
        await signedRequest([
          { ...event, webhookEventId: '' },
          { ...event, timestamp: 1e20 }
        ])
      )
    ).status
  ).toBe(200)
  expect(fetch).not.toHaveBeenCalled()
  expect(client.rpc).not.toHaveBeenCalled()
  client.rpc.mockResolvedValue({ error: { message: 'isolated database unavailable' } })
  const response = await handler(
    await signedRequest([{ ...event, message: { type: 'text', text: '普通訊息' } }])
  )
  expect(response.status).toBe(503)
  expect(await response.json()).toEqual({ error: 'WEBHOOK_STORAGE_FAILED' })
})

it('排程入口缺少正確專用密鑰時，不能結算或領取通知', async () => {
  const handler = await setup()
  const response = await handler(
    new Request('https://example.invalid/auction-workflow', {
      method: 'POST',
      headers: { 'x-auction-worker-secret': 'wrong' }
    })
  )
  expect(response.status).toBe(401)
  expect(client.rpc).not.toHaveBeenCalled()
})

it.each([
  [409, null, 'failed'],
  [409, 'original-accepted-request', 'sent'],
  [429, null, 'retry'],
  [503, null, 'retry'],
  [400, null, 'failed']
])('LINE HTTP %i，原受理編號 %s，通知回執必須是 %s', async (status, accepted, result) => {
  const handler = await setup()
  const message = {
    id: 'TEST-OUTBOX',
    claim_token: 'TEST-LEASE',
    retry_key: 'TEST-RETRY',
    line_user_id: 'U' + 'a'.repeat(32),
    auction_id: 'TEST',
    amount: 700,
    attempts: 1,
    created_at: new Date().toISOString()
  }
  client.rpc.mockImplementation(async (name) => ({
    data: name === 'claim_auction_notifications' ? [message] : { settled: 1 },
    error: null
  }))
  const requests = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options) => {
      requests.push({ url, options })
      if (url.endsWith('/accessToken'))
        return Response.json({ access_token: 'test-only', expires_in: 3600 })
      return new Response(null, {
        status,
        headers: accepted ? { 'x-line-accepted-request-id': accepted } : {}
      })
    })
  )
  const response = await handler(
    new Request('https://example.invalid/auction-workflow', {
      method: 'POST',
      headers: { 'x-auction-worker-secret': 'test-worker' }
    })
  )
  expect(response.status).toBe(200)
  expect(client.rpc).toHaveBeenCalledWith(
    'finish_auction_notification',
    expect.objectContaining({
      p_id: 'TEST-OUTBOX',
      p_claim: 'TEST-LEASE',
      p_result: result,
      p_request_id: accepted
    })
  )
  expect((await response.json()).notifications_accepted).toBe(result === 'sent' ? 1 : 0)
  const push = requests.find((r) => r.url.endsWith('/message/push'))
  expect(push.options.headers['x-line-retry-key']).toBe('TEST-RETRY')
})
