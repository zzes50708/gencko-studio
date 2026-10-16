import { expect, it } from 'vitest'
import { validBidAmount, validBidReceipt, auctionBidIncrement } from '../utils/auction-bid-contract'

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
