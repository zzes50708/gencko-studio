export function auctionState(item, now = Date.now()) {
  const end = new Date(item?.end_time).getTime()
  if (!item || !item.end_time || !Number.isFinite(end))
    return { status: 'closed', text: '場次資料待確認', class: 'badge-ended' }
  if (end <= now || item.status === 'ended')
    return { status: 'ended', text: '已結標', class: 'badge-ended' }
  if (item.status !== 'active') return { status: 'closed', text: '暫停競標', class: 'badge-ended' }
  return { status: 'active', text: '競標中', class: 'badge-active' }
}
export const hasBuyNowPrice = (item) =>
  item?.buy_now_price !== null &&
  item?.buy_now_price !== '' &&
  Number.isFinite(Number(item?.buy_now_price)) &&
  Number(item.buy_now_price) > 0
export function auctionCountdown(item, now = Date.now()) {
  const state = auctionState(item, now)
  if (state.status !== 'active') return state.text
  const seconds = Math.max(0, Math.floor((new Date(item.end_time).getTime() - now) / 1000))
  const days = Math.floor(seconds / 86400)
  const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
  return `${days ? `${days}天 ` : ''}${clock}`
}
export function summarizeAuctionBids(rows) {
  const result = {}
  for (const row of rows) {
    const amount = Number(row.amount)
    if (!Number.isFinite(amount) || amount < 0) continue
    const summary = (result[row.auction_id] ||= { count: 0, highest: 0 })
    summary.count++
    summary.highest = Math.max(summary.highest, amount)
  }
  return result
}

/** 集中讀取場次紀錄，分頁避免 API 預設上限截斷最高價或數量。 */
export async function readAuctionBids(client, ids, fields, signal) {
  if (!ids.length) return []
  const rows = []
  for (let offset = 0; ; offset += 1000) {
    if (signal?.aborted) throw new Error('讀取已取消')
    let query = client
      .from('auction_bids')
      .select(fields)
      .in('auction_id', ids)
      .order('id')
      .range(offset, offset + 999)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 1000) return rows
  }
}
