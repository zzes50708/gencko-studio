import { auctionState } from './auction-presentation.js'

export function auctionPhotos(images) {
  if (!Array.isArray(images)) return []
  return [
    ...new Set(
      images
        .filter((url) => typeof url === 'string')
        .map((url) => url.trim())
        .filter((url) => /^https?:\/\//i.test(url) || /^\/(?!\/)/.test(url))
    )
  ]
}

export function auctionShareDetails(
  item,
  { known = false, highest = null, now = Date.now(), error = false } = {}
) {
  if (!item)
    return {
      title: error ? '競標資料載入失敗' : '找不到此競標商品',
      desc: error ? '目前無法讀取競標資料，請稍後重試。' : '該競標可能已下架或不存在。',
      indexable: false,
      availability: 'out of stock',
      currentPrice: null,
      priceLabel: '出價',
      status: 'missing'
    }
  const state = auctionState(item, now)
  const sex = item.gender === '公' ? ' ♂' : item.gender === '母' ? ' ♀' : ''
  const name = `${item.morph}${sex}`
  const hasBids = known && Number.isFinite(highest) && highest > 0
  const currentPrice = known ? (hasBids ? highest : Number(item.start_price) || 0) : null
  const priceText = !known
    ? '出價資料更新中'
    : hasBids
      ? `目前最高 NT$${highest}`
      : `尚無出價，起標 NT$${currentPrice}`
  const statusText = state.status === 'active' ? '線上競標進行中' : state.text
  return {
    title:
      state.status === 'active' ? `限時競標：${name}｜${priceText}` : `${name}（${state.text}）`,
    desc: `${name} ${statusText}。${priceText}。${item.note ? String(item.note).slice(0, 60) : ''}`,
    indexable: state.status === 'active',
    availability: state.status === 'active' ? 'in stock' : 'out of stock',
    currentPrice,
    priceLabel: hasBids ? '目前出價' : known ? '起標價' : '出價',
    status: state.status
  }
}

export function sampleAuctionClock(serverTime, sentAt, receivedAt) {
  if (typeof serverTime !== 'number' || !Number.isFinite(serverTime) || receivedAt < sentAt)
    return null
  return { epoch: serverTime + (receivedAt - sentAt) / 2, monotonic: receivedAt }
}

export function auctionClockNow(anchor, monotonic) {
  return anchor.epoch + Math.max(0, monotonic - anchor.monotonic)
}
