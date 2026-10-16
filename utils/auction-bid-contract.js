// 與資料庫 integer 上限一致；最終最低價及加價運算仍由資料庫鎖定後判斷。
export const MAX_BID_AMOUNT = 2147483647

export function auctionBidIncrement(value) {
  const increment = Number(value ?? 100)
  return Number.isFinite(increment) ? Math.max(increment, 1) : 100
}

export const validBidAmount = (amount) =>
  typeof amount === 'number' &&
  Number.isSafeInteger(amount) &&
  amount > 0 &&
  amount <= MAX_BID_AMOUNT

export function validBidReceipt(result, auctionId, amount) {
  return !!(
    result?.bid &&
    typeof result.bid.id === 'string' &&
    result.bid.id &&
    result.bid.auction_id === auctionId &&
    result.bid.amount === amount &&
    result?.auction?.id === auctionId &&
    Number.isFinite(Date.parse(result.auction.end_time))
  )
}
