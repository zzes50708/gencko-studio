import { build } from 'esbuild'
import { createServer } from 'node:http'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
fs.mkdirSync('output', { recursive: true })
await build({
  entryPoints: ['server/api/auctions/[id]/bid.post.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'output/auction-bid-api-regression.mjs',
  external: ['h3'],
  alias: { '~': process.cwd() },
  plugins: [
    {
      name: '隔離Supabase',
      setup(b) {
        b.onResolve({ filter: /^#supabase\/server$/ }, () => ({
          path: 'supabase-audit',
          namespace: 'audit'
        }))
        b.onLoad({ filter: /.*/, namespace: 'audit' }, () => ({
          contents:
            'export async function serverSupabaseClient(){return globalThis.auctionAuditClient}'
        }))
      }
    }
  ]
})
globalThis.defineEventHandler = defineEventHandler
const handler = (await import('../output/auction-bid-api-regression.mjs')).default
const app = createApp()
const router = createRouter()
router.post('/api/auctions/:id/bid', handler)
app.use(router)
const server = createServer(toNodeListener(app))
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const root = `http://127.0.0.1:${server.address().port}/api/auctions/TEST-AUCTION-20261016-01/bid`
const out = []
const user = {
  id: 'isolated-test-principal',
  email: 'auction-audit@example.invalid',
  app_metadata: { provider: 'custom:line-oauth', providers: ['custom:line-oauth'] }
}
const cases = [
  {
    name: '驗證身分服務暫時失效',
    authError: {
      name: 'AuthRetryableFetchError',
      status: 503,
      message: 'temporary auth service failure'
    },
    body: { amount: 500 }
  },
  {
    name: '出價資料服務暫時失效',
    rpcError: { code: '', message: 'temporary database network failure' },
    body: { amount: 500 }
  },
  { name: '小數金額', body: { amount: 500.5 } },
  {
    name: '超出資料庫整數上限',
    body: { amount: 2147483648 },
    rpcError: { code: '22003', message: 'value out of range for type integer' }
  },
  { name: '陣列金額型別', body: { amount: [500] } },
  { name: 'RPC回傳null無錯誤', body: { amount: 500 }, nullData: true },
  {
    name: '未知資料庫錯誤不外洩內容',
    body: { amount: 500 },
    rpcError: { code: 'XX000', message: 'AUDIT_INTERNAL_DETAIL_NOT_FOR_CUSTOMER' }
  },
  { name: '正常成功回應', body: { amount: 500 } },
  { name: '缺少登入使用者', body: { amount: 500 }, noUser: true },
  { name: '不支援的登入供應商', body: { amount: 500 }, nonGoogle: true },
  { name: '僅Google登入不能出價', body: { amount: 500 }, googleOnly: true },
  {
    name: '下一口加價造成溢位',
    body: { amount: 2147483647 },
    rpcError: { code: '22003', message: 'integer out of range' }
  },
  { name: '無效請求編號', body: { amount: 500, requestId: 'invalid' } },
  { name: '回執金額不符', body: { amount: 500 }, wrongReceipt: true },
  { name: 'LINE 無 email 會員', body: { amount: 500 }, line: true },
  { name: '偽造 LINE 個人資料', body: { amount: 500 }, spoofLine: true },
  {
    name: '資料庫拒絕不支援登入方式',
    body: { amount: 500 },
    rpcError: {
      code: '42501',
      message: '競標出價需使用 Google 或 LINE 帳號登入'
    }
  },
  {
    name: '登入服務直接拋出例外',
    body: { amount: 500 },
    authThrows: true,
    status: 503,
    outcome: 'not_submitted',
    noRpc: true
  },
  {
    name: '登入服務缺少資料',
    body: { amount: 500 },
    authEmpty: true,
    status: 503,
    outcome: 'not_submitted',
    noRpc: true
  },
  {
    name: '出價送出後連線直接拋出例外',
    body: { amount: 500 },
    rpcThrows: true,
    status: 503,
    outcome: 'unknown'
  },
  {
    name: '超長暱稱尚未送出',
    body: { amount: 500, nickname: '測'.repeat(16) },
    status: 400,
    outcome: 'not_submitted',
    noRpc: true
  },
  {
    name: '錯誤場次編號尚未送出',
    body: { amount: 500 },
    suffix: 'invalid.id',
    status: 400,
    outcome: 'not_submitted',
    noRpc: true
  },
  {
    name: '損壞請求內容尚未送出',
    rawBody: '{broken',
    status: 400,
    outcome: 'not_submitted',
    noRpc: true
  },
  {
    name: '表情符號暱稱以字元計算',
    body: {
      amount: 500,
      nickname: '🦎'.repeat(15),
      requestId: '12345678-0000-4000-8000-000000000001'
    },
    status: 200
  }
]
try {
  for (const test of cases) {
    const calls = []
    // 保留實際 SDK 的 thenable 型態；不能用 async RPC 假物件掩蓋介面差異。
    const realClient = createClient('http://127.0.0.1:1', 'isolated-publishable-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: async (_url, options) => {
          const args = JSON.parse(options.body)
          calls.push({ name: 'submit_auction_bid', args })
          if (test.rpcThrows) throw new Error('AUDIT_INTERNAL_DETAIL_NOT_FOR_CUSTOMER')
          const data =
            test.rpcError ||
            (test.nullData
              ? null
              : {
                  bid: {
                    id: 'AUDIT',
                    auction_id: 'TEST-AUCTION-20261016-01',
                    amount: test.wrongReceipt ? args.p_amount + 100 : args.p_amount
                  },
                  auction: { id: 'TEST-AUCTION-20261016-01', end_time: '2030-01-01T00:00:00Z' },
                  extended: false,
                  min_next_bid: args.p_amount + 100
                })
          return new Response(JSON.stringify(data), {
            status: test.rpcError ? 400 : 200,
            headers: { 'content-type': 'application/json' }
          })
        }
      }
    })
    globalThis.auctionAuditClient = {
      auth: {
        getUser: async () => {
          if (test.authThrows) throw new Error('AUDIT_INTERNAL_DETAIL_NOT_FOR_CUSTOMER')
          if (test.authEmpty) return { data: null, error: null }
          return {
            data: {
              user:
                test.authError || test.noUser
                  ? null
                  : test.line
                    ? {
                        ...user,
                        email: null,
                        app_metadata: {
                          provider: 'custom:line-oauth',
                          providers: ['custom:line-oauth']
                        }
                      }
                    : test.spoofLine
                      ? {
                          ...user,
                          app_metadata: { provider: 'email' },
                          user_metadata: { provider: 'custom:line' }
                        }
                      : test.googleOnly
                        ? { ...user, app_metadata: { provider: 'google', providers: ['google'] } }
                        : test.nonGoogle
                          ? { ...user, app_metadata: { provider: 'email', providers: ['email'] } }
                          : user
            },
            error: test.authError || null
          }
        }
      },
      rpc: (name, args) => {
        const request = realClient.rpc(name, args)
        return test.rpcThrows ? request.throwOnError() : request
      }
    }
    const r = await fetch(
      test.suffix ? root.replace('TEST-AUCTION-20261016-01', test.suffix) : root,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: test.rawBody ?? JSON.stringify(test.body)
      }
    )
    const text = await r.text()
    out.push({
      name: test.name,
      status: r.status,
      response: text ? JSON.parse(text) : null,
      rpcCalls: calls
    })
  }
  const expected = [
    503, 503, 400, 400, 400, 503, 503, 200, 401, 403, 403, 400, 400, 503, 200, 403, 400
  ]
  for (let i = 0; i < out.length; i++) {
    if (JSON.stringify(out[i].response).includes('AUDIT_INTERNAL_DETAIL_NOT_FOR_CUSTOMER'))
      throw Error('內部錯誤外洩')
    if (out[i].status !== (cases[i].status ?? expected[i]))
      throw Error(out[i].name + ': ' + out[i].status)
    if ([2, 3, 4, 8, 9, 10, 12, 15].includes(i) && out[i].rpcCalls.length)
      throw Error('無效登入或金額進入RPC')
    if (cases[i].noRpc && out[i].rpcCalls.length) throw Error('尚未送出的錯誤不應呼叫 RPC')
    if (cases[i].outcome && out[i].response?.data?.outcome !== cases[i].outcome)
      throw Error(out[i].name + ': 出價結果分類錯誤')
  }
  if (out[16].response?.data?.outcome !== 'rejected') throw Error('登入方式拒絕被誤判為出價待確認')
  if (out[23].rpcCalls[0]?.args?.p_request_id !== cases[23].body.requestId)
    throw Error('請求編號未原樣傳入資料庫')
  console.log('競標 API 24 項故障回歸通過')
} finally {
  await new Promise((r) => server.close(r))
}
