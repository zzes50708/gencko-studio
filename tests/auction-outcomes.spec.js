import { expect, it } from 'vitest'
import { isAuctionOutcome } from '../utils/auction-outcomes'

const outcome = { auction_id: 'TEST', state: 'awaiting_payment', amount: 700 }
it('合法得標狀態可讀取，但另一場回應不能當成本場結果', () => {
  expect(isAuctionOutcome(outcome, 'TEST')).toBe(true)
  expect(isAuctionOutcome(outcome, 'OTHER')).toBe(false)
  expect(isAuctionOutcome({ ...outcome, state: 'paid' })).toBe(true)
  expect(isAuctionOutcome({ ...outcome, state: 'no_bids', amount: null })).toBe(true)
})
it('壞資料與未知狀態不可顯示成交或領標入口', () => {
  for (const value of [
    null,
    [],
    {},
    { ...outcome, auction_id: '' },
    { ...outcome, state: 'unknown' }
  ])
    expect(isAuctionOutcome(value)).toBe(false)
})
it('金額必須是範圍內整數，不能靠字串或空值冒充', () => {
  for (const amount of ['700', null, -1, 0.5, 2147483648, Infinity])
    expect(isAuctionOutcome({ ...outcome, amount })).toBe(false)
  expect(isAuctionOutcome({ ...outcome, amount: 0 })).toBe(true)
})
it('付款與領標日期不可出現 Invalid Date，空日期仍合法', () => {
  expect(isAuctionOutcome({ ...outcome, payment_due_at: null, claimed_at: null })).toBe(true)
  expect(isAuctionOutcome({ ...outcome, claimed_at: '2026-10-20T00:00:00Z' })).toBe(true)
  expect(isAuctionOutcome({ ...outcome, payment_due_at: 'not-a-date' })).toBe(false)
  expect(isAuctionOutcome({ ...outcome, claimed_at: 1 })).toBe(false)
})
