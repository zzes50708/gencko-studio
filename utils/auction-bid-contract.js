// 與資料庫 integer 上限一致；最終最低價及加價運算仍由資料庫鎖定後判斷。
export const MAX_BID_AMOUNT = 2147483647

export function auctionBidIncrement(value) {
  const increment = Number(value ?? 100)
  return Number.isFinite(increment) ? Math.max(increment, 1) : 100
}

export function auctionMinimumBid(startPrice, highestBid, increment) {
  const step = auctionBidIncrement(increment)
  if (highestBid != null) return Number(highestBid) + step
  const start = Number(startPrice)
  return Number.isFinite(start) && start > 0 ? start : step
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

export function restoreBidIntent(raw, auctionId, owners) {
  try {
    const saved = JSON.parse(raw || 'null')
    if (
      !saved ||
      !owners.includes(saved.owner) ||
      saved.auctionId !== auctionId ||
      !validBidAmount(saved.amount) ||
      typeof saved.requestId !== 'string' ||
      !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(saved.requestId) ||
      typeof saved.nickname !== 'string' ||
      [...saved.nickname].length > 15
    )
      return null
    return {
      owner: saved.owner,
      auctionId,
      amount: saved.amount,
      requestId: saved.requestId.toLowerCase(),
      nickname: saved.nickname
    }
  } catch {
    return null
  }
}
