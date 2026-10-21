import { MAX_BID_AMOUNT } from './auction-bid-contract.js'

/** 只透過伺服器核對本人的 RPC 讀取，不接受前端傳入其他會員 ID。 */
export async function readMemberAuctionHistory(client, signal) {
  const bids = []
  const seen = new Set()
  const check = () => {
    if (signal?.aborted) throw Error('查詢已取消')
  }
  for (let offset = 0; ; offset += 500) {
    check()
    let query = client
      .rpc('get_my_auction_bids')
      .order('bid_time', { ascending: false })
      .order('auction_id')
      .order('amount', { ascending: false })
      .range(offset, offset + 499)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    check()
    if (error) throw error
    if (
      !Array.isArray(data) ||
      data.some(
        (bid) =>
          !bid ||
          typeof bid.auction_id !== 'string' ||
          !bid.auction_id.trim() ||
          !Number.isSafeInteger(bid.amount) ||
          bid.amount <= 0 ||
          bid.amount > MAX_BID_AMOUNT ||
          typeof bid.bid_time !== 'string' ||
          !Number.isFinite(Date.parse(bid.bid_time))
      )
    )
      throw Error('個人出價紀錄回應不完整')
    for (const bid of data) {
      // 此 RPC 不提供出價 ID；同場次有效出價不可重複同金額，以此識別跨頁位移。
      const key = JSON.stringify([bid.auction_id, bid.amount, bid.bid_time])
      if (!seen.has(key)) {
        seen.add(key)
        bids.push(bid)
      }
    }
    if (data.length < 500) break
  }
  const ids = [...new Set(bids.map((bid) => bid.auction_id))]
  const auctions = new Map()
  for (let offset = 0; offset < ids.length; offset += 100) {
    check()
    let query = client
      .from('auctions')
      .select('id,morph,start_time,end_time,status,images')
      .in('id', ids.slice(offset, offset + 100))
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    check()
    if (error) throw error
    if (!Array.isArray(data)) throw Error('場次資料回應不完整')
    for (const auction of data) {
      if (!auction || typeof auction.id !== 'string') throw Error('場次資料回應不完整')
      auctions.set(auction.id, auction)
    }
  }
  const grouped = new Map()
  for (const bid of bids) {
    const group = grouped.get(bid.auction_id)
    if (group) {
      group.bid_count++
      group.my_max_bid = Math.max(group.my_max_bid, bid.amount)
    } else {
      const auction = auctions.get(bid.auction_id)
      grouped.set(bid.auction_id, {
        auction_id: bid.auction_id,
        morph: auction?.morph || '場次資料待確認',
        image: Array.isArray(auction?.images)
          ? auction.images.find((url) => typeof url === 'string' && url.trim()) || ''
          : '',
        status: auction?.status,
        start_time: auction?.start_time,
        end_time: auction?.end_time,
        my_max_bid: bid.amount,
        bid_count: 1
      })
    }
  }
  return [...grouped.values()]
}
