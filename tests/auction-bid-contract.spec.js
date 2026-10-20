import { expect, it } from 'vitest'
import {
  validBidAmount,
  validBidReceipt,
  restoreBidIntent,
  auctionBidIncrement,
  auctionMinimumBid
} from '../utils/auction-bid-contract'

it('出價暫存逐筆驗證後才恢復，不帶入別人、錯場次、毀損請求及額外欄位', () => {
  const intent = {
    owner: 'MEMBER',
    auctionId: 'A',
    amount: 700,
    requestId: 'abcdef00-0000-4000-8000-000000000001',
    nickname: '原出價'
  }
  expect(restoreBidIntent(JSON.stringify({ ...intent, extra: '不傳送' }), 'A', ['MEMBER'])).toEqual(
    intent
  )
  const invalid = JSON.stringify({ ...intent, amount: '700' })
  expect(
    [invalid, JSON.stringify(intent)]
      .map((raw) => restoreBidIntent(raw, 'A', ['MEMBER']))
      .find(Boolean)
  ).toEqual(intent)
  expect(restoreBidIntent(JSON.stringify(intent), 'B', ['MEMBER'])).toBeNull()
  expect(restoreBidIntent(JSON.stringify(intent), 'A', ['OTHER'])).toBeNull()
  expect(restoreBidIntent('{', 'A', ['MEMBER'])).toBeNull()
  expect(
    restoreBidIntent(
      JSON.stringify({ ...intent, requestId: intent.requestId.toUpperCase() }),
      'A',
      ['MEMBER']
    )
  ).toEqual(intent)
})

it('第一筆可按起標價出價，已有出價才加上最低增額', () => {
  expect(auctionMinimumBid(100, null, 100)).toBe(100)
  expect(auctionMinimumBid(100, 100, 100)).toBe(200)
  expect(auctionMinimumBid(0, null, 100)).toBe(100)
  expect(auctionMinimumBid(500, null, 1000)).toBe(500)
})

it('空值與零加價幅度與資料庫規則一致', () => {
  expect(auctionBidIncrement(null)).toBe(100)
  expect(auctionBidIncrement(0)).toBe(1)
  expect(auctionBidIncrement(-100)).toBe(1)
  expect(auctionBidIncrement(500)).toBe(500)
})

it('拒絕型別強制轉換、小數與資料庫溢位', () => {
  for (const value of [[500], '500', null, 0, -1, 500.5, Infinity, 2147483648]) {
    expect(validBidAmount(value)).toBe(false)
  }
  expect(validBidAmount(500)).toBe(true)
})

it('只有對應同場次與原確認金額的完整回執才算成功', () => {
  const receipt = {
    bid: { id: 'B', auction_id: 'A', amount: 500 },
    auction: { id: 'A', end_time: '2030-01-01T00:00:00Z' }
  }
  expect(validBidReceipt(receipt, 'A', 500)).toBe(true)
  for (const value of [
    null,
    {},
    { ...receipt, auction: {} },
    { ...receipt, bid: { ...receipt.bid, amount: 600 } }
  ]) {
    expect(validBidReceipt(value, 'A', 500)).toBe(false)
  }
  expect(validBidReceipt(receipt, 'OTHER', 500)).toBe(false)
})
