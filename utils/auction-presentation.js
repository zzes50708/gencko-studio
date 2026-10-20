export function auctionState(item, now = Date.now()) {
  const end = new Date(item?.end_time).getTime()
  if (!item || !item.end_time || !Number.isFinite(end))
    return { status: 'closed', text: '場次資料待確認', class: 'badge-ended' }
  if (item.status === 'ended') return { status: 'ended', text: '已結標', class: 'badge-ended' }
  if (item.status !== 'active') return { status: 'closed', text: '暫停競標', class: 'badge-ended' }
  if (end <= now) return { status: 'ended', text: '已結標', class: 'badge-ended' }
  if (item.start_time) {
    const start = Date.parse(item.start_time)
    if (!Number.isFinite(start) || start >= end)
      return { status: 'closed', text: '場次時間待確認', class: 'badge-ended' }
    if (start > now) return { status: 'scheduled', text: '尚未開標', class: 'badge-scheduled' }
  }
  return { status: 'active', text: '競標中', class: 'badge-active' }
}
export function isAuctionListed(item, now = Date.now()) {
  const end = Date.parse(item?.end_time)
  return (
    ['active', 'ended'].includes(item?.status) && Number.isFinite(end) && now < end + 48 * 3600000
  )
}
export const hasBuyNowPrice = (item) =>
  item?.buy_now_price !== null &&
  item?.buy_now_price !== '' &&
  Number.isFinite(Number(item?.buy_now_price)) &&
  Number(item.buy_now_price) > 0
export function auctionCountdown(item, now = Date.now()) {
  const state = auctionState(item, now)
  if (!['active', 'scheduled'].includes(state.status)) return state.text
  const deadline = state.status === 'scheduled' ? item.start_time : item.end_time
  const seconds = Math.max(0, Math.floor((new Date(deadline).getTime() - now) / 1000))
  const days = Math.floor(seconds / 86400)
  const clock = [Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60, seconds % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
  return `${state.status === 'scheduled' ? '開標倒數 ' : ''}${days ? `${days}天 ` : ''}${clock}`
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

/** 列表與搜尋引擎資料使用相同範圍，避免歷史資料或 API 上限隱藏有效場次。 */
export async function readAuctionCatalog(client, now = Date.now(), fields = '*') {
  const rows = []
  const seen = new Set()
  const cutoff = new Date(now - 48 * 3600000).toISOString()
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from('auctions')
      .select(fields)
      .in('status', ['active', 'ended'])
      .gt('end_time', cutoff)
      .order('end_time', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + 499)
    if (error) throw error
    if (!Array.isArray(data)) throw new Error('競標列表回應不完整')
    for (const row of data) {
      if (seen.has(row.id)) continue
      seen.add(row.id)
      rows.push(row)
    }
    if (data.length < 500) return rows
  }
}

/** 集中讀取場次紀錄，分頁避免 API 預設上限截斷最高價或數量。 */
export async function readAuctionBids(client, ids, fields, signal) {
  if (!ids.length) return []
  const rows = []
  const seen = new Set()
  const uniqueIds = [...new Set(ids)]
  // 場次過多時分批，避免 in 查詢網址過長而被瀏覽器、代理或 API 拒絕。
  for (let group = 0; group < uniqueIds.length; group += 100) {
    for (let offset = 0; ; offset += 1000) {
      if (signal?.aborted) throw new Error('讀取已取消')
      let query = client
        .from('auction_bids')
        .select(fields)
        .in('auction_id', uniqueIds.slice(group, group + 100))
        .order('id')
        .range(offset, offset + 999)
      if (signal) query = query.abortSignal(signal)
      const { data, error } = await query
      if (error) throw error
      if (!Array.isArray(data)) throw new Error('出價紀錄回應不完整')
      // UUID 排序分頁期間仍可能插入新出價，避免跨頁位移造成同筆重複。
      for (const row of data) {
        if (row.id != null) {
          if (seen.has(row.id)) continue
          seen.add(row.id)
        }
        rows.push(row)
      }
      if (data.length < 1000) break
    }
  }
  return rows
}
