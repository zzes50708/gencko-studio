const actions = new Set(['paid', 'extend', 'abandon', 'unblock'])
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function restoreAdminIntent(raw, auctionId) {
  try {
    const value = JSON.parse(raw || 'null')
    if (
      !value ||
      !uuid.test(value.p_request_id || '') ||
      value.p_auction_id !== auctionId ||
      !actions.has(value.p_action) ||
      typeof value.p_reason !== 'string' ||
      [...value.p_reason.trim()].length < 2 ||
      [...value.p_reason].length > 500
    )
      return null
    return {
      p_request_id: value.p_request_id.toLowerCase(),
      p_auction_id: auctionId,
      p_action: value.p_action,
      p_reason: value.p_reason.trim()
    }
  } catch {
    return null
  }
}

export function matchesAdminReceipt(receipt, intent) {
  return !!(
    receipt &&
    intent &&
    receipt.request_id === intent.p_request_id &&
    receipt.auction_id === intent.p_auction_id &&
    receipt.action === intent.p_action
  )
}

/** 出價者 RPC 仍受 API 筆數上限影響，必須分頁讀取後才回傳完整結果。 */
export async function readAuctionBidderContacts(client, auctionId, signal) {
  const rows = []
  const seen = new Set()
  for (let offset = 0; ; offset += 500) {
    if (signal?.aborted) throw Error('查詢已取消')
    let query = client
      .rpc('get_auction_bidder_contacts', { p_auction_id: auctionId })
      .order('amount', { ascending: false })
      .order('bid_time')
      .order('id')
      .range(offset, offset + 499)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error) throw error
    if (!Array.isArray(data)) throw Error('出價者資料格式無效')
    for (const row of data) {
      if (row.id && seen.has(row.id)) continue
      if (row.id) seen.add(row.id)
      rows.push(row)
    }
    if (data.length < 500) return rows
  }
}
