import { MAX_BID_AMOUNT } from './auction-bid-contract.js'

const states = new Set([
  'no_bids',
  'pending_contact',
  'awaiting_notice',
  'awaiting_payment',
  'payment_review',
  'paid',
  'abandoned',
  'cancelled'
])

/** 不完整或不屬於本場的資料不可顯示成交金額與操作入口。 */
export function isAuctionOutcome(value, auctionId = value?.auction_id) {
  return !!(
    value &&
    !Array.isArray(value) &&
    typeof value.auction_id === 'string' &&
    value.auction_id.trim() &&
    value.auction_id === auctionId &&
    states.has(value.state) &&
    ((value.state === 'no_bids' && value.amount === null) ||
      (Number.isSafeInteger(value.amount) &&
        value.amount >= 0 &&
        value.amount <= MAX_BID_AMOUNT)) &&
    ['payment_due_at', 'claimed_at'].every(
      (field) =>
        value[field] == null ||
        (typeof value[field] === 'string' && Number.isFinite(Date.parse(value[field])))
    )
  )
}
