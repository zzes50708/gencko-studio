import { it, expect } from 'vitest'
import {
  restoreAdminIntent,
  matchesAdminReceipt,
  readAuctionBidderContacts
} from '../utils/auction-admin'

const intent = {
  p_request_id: '30000000-0000-4000-8000-000000000001',
  p_auction_id: 'TEST',
  p_action: 'extend',
  p_reason: '延後一天'
}

it('待確認管理操作僅恢復同場次與有效完整請求，不帶入額外參數', () => {
  expect(restoreAdminIntent(JSON.stringify({ ...intent, secret: '不送出' }), 'TEST')).toEqual(
    intent
  )
  for (const value of [
    null,
    {},
    { ...intent, p_action: 'delete' },
    { ...intent, p_reason: '🦎' },
    { ...intent, p_request_id: 'wrong' }
  ])
    expect(restoreAdminIntent(JSON.stringify(value), 'TEST')).toBeNull()
  expect(restoreAdminIntent(JSON.stringify(intent), 'OTHER')).toBeNull()
  expect(restoreAdminIntent('{', 'TEST')).toBeNull()
})

it('只有對應原請求、場次及動作的回執才能認定管理操作完成', () => {
  const receipt = { request_id: intent.p_request_id, auction_id: 'TEST', action: 'extend' }
  expect(matchesAdminReceipt(receipt, intent)).toBe(true)
  for (const value of [
    null,
    {},
    { ...receipt, action: 'paid' },
    { ...receipt, auction_id: 'OTHER' },
    { ...receipt, request_id: 'other' }
  ])
    expect(matchesAdminReceipt(value, intent)).toBe(false)
})

it('管理查詢跨越 API 上限仍取得完整紀錄，跨頁重複不重算，讀取失敗不回傳半份資料', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id: String(id), amount: 2000 - id }))
  const ranges = []
  let fail = false
  const client = {
    rpc: () => ({
      order() {
        return this
      },
      range(from, to) {
        ranges.push([from, to])
        return this
      },
      then(resolve) {
        const [from, to] = ranges.at(-1)
        return Promise.resolve({
          data: rows.slice(from, to + 1),
          error: fail && from > 0 ? Error('查詢失敗') : null
        }).then(resolve)
      }
    })
  }
  expect(await readAuctionBidderContacts(client, 'TEST')).toHaveLength(1201)
  expect(ranges).toEqual([
    [0, 499],
    [500, 999],
    [1000, 1499]
  ])
  const pages = [rows.slice(0, 500), rows.slice(499, 999), rows.slice(998)]
  const moving = {
    rpc: () => ({
      order() {
        return this
      },
      range() {
        return Promise.resolve({ data: pages.shift() })
      }
    })
  }
  expect(await readAuctionBidderContacts(moving, 'TEST')).toHaveLength(1201)
  fail = true
  await expect(readAuctionBidderContacts(client, 'TEST')).rejects.toThrow('查詢失敗')
  const abort = new AbortController()
  abort.abort()
  await expect(readAuctionBidderContacts(client, 'TEST', abort.signal)).rejects.toThrow()
})
