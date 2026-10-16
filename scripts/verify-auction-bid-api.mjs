import { build } from 'esbuild'
import { createServer } from 'node:http'
import { createApp, createRouter, toNodeListener, defineEventHandler } from 'h3'
import fs from 'node:fs'
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
  app_metadata: { provider: 'google', providers: ['google'] }
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
  {
    name: '下一口加價造成溢位',
    body: { amount: 2147483647 },
    rpcError: { code: '22003', message: 'integer out of range' }
  },
  { name: '無效請求編號', body: { amount: 500, requestId: 'invalid' } },
  { name: '回執金額不符', body: { amount: 500 }, wrongReceipt: true },
  { name: 'LINE 無 email 會員', body: { amount: 500 }, line: true },
  { name: '偽造 LINE 個人資料', body: { amount: 500 }, spoofLine: true }
]
try {
  for (const test of cases) {
    const calls = []
    globalThis.auctionAuditClient = {
      auth: {
        getUser: async () => ({
          data: {
            user:
              test.authError || test.noUser
                ? null
                : test.line
                  ? { ...user, email: null, app_metadata: { provider: 'custom:line', providers: ['custom:line'] } }
                  : test.spoofLine
                    ? { ...user, app_metadata: { provider: 'email' }, user_metadata: { provider: 'custom:line' } }
                : test.nonGoogle
                  ? { ...user, app_metadata: { provider: 'email', providers: ['email'] } }
                  : user
          },
          error: test.authError || null
        })
      },
      rpc: async (name, args) => {
        calls.push({ name, args })
        return {
          data:
            test.rpcError || test.nullData
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
                },
          error: test.rpcError || null
        }
      }
    }
    const r = await fetch(root, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(test.body)
    })
    const text = await r.text()
    out.push({
      name: test.name,
      status: r.status,
      response: text ? JSON.parse(text) : null,
      rpcCalls: calls
    })
  }
  const expected = [503, 503, 400, 400, 400, 503, 503, 200, 401, 403, 400, 400, 503, 200, 403]
  for (let i = 0; i < out.length; i++) {
    if (JSON.stringify(out[i].response).includes('AUDIT_INTERNAL_DETAIL_NOT_FOR_CUSTOMER'))
      throw Error('內部錯誤外洩')
    if (out[i].status !== expected[i]) throw Error(out[i].name + ': ' + out[i].status)
    if ([2, 3, 4, 8, 9, 11, 14].includes(i) && out[i].rpcCalls.length) throw Error('無效金額進入RPC')
  }
  console.log('競標 API 十五項故障回歸通過')
} finally {
  await new Promise((r) => server.close(r))
}
