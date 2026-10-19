import { it, expect } from 'vitest'
import {
  auctionState,
  hasBuyNowPrice,
  readAuctionBids,
  summarizeAuctionBids,
  isAuctionListed
} from '../utils/auction-presentation'

it('結標場次保留 48 小時，邊界到期隱藏；暫停或時間錯誤不展示', () => {
  const end = '2026-10-16T10:00:00Z'
  const item = { status: 'ended', end_time: end }
  expect(isAuctionListed(item, Date.parse(end) + 48 * 3600000 - 1)).toBe(true)
  expect(isAuctionListed(item, Date.parse(end) + 48 * 3600000)).toBe(false)
  expect(isAuctionListed({ ...item, status: 'active' }, Date.parse(end) + 3600000)).toBe(true)
  expect(isAuctionListed({ ...item, status: 'paused' }, Date.parse(end))).toBe(false)
  expect(isAuctionListed({ ...item, end_time: '錯誤' }, Date.now())).toBe(false)
})

it('關閉狀態及缺少時間不能參與競標，缺價不顯示直購', () => {
  const item = { status: 'active', end_time: '2030-01-01', buy_now_price: null }
  expect(auctionState(item, 0).status).toBe('active')
  expect(auctionState({ ...item, status: 'ended' }, 0).status).toBe('ended')
  expect(auctionState({ ...item, status: 'paused' }, 0).status).toBe('closed')
  expect(auctionState({ ...item, end_time: null }, 0).status).toBe('closed')
  expect(auctionState(item, Date.parse('2031-01-01')).status).toBe('ended')
  for (const price of [null, undefined, '', 0, -1, '錯誤'])
    expect(hasBuyNowPrice({ buy_now_price: price })).toBe(false)
  expect(hasBuyNowPrice({ buy_now_price: 8000 })).toBe(true)
})

it('超過一千筆出價仍讀取完整最高價與次數，失敗不回傳空清單', async () => {
  const rows = Array.from({ length: 1002 }, (_, id) => ({ id, auction_id: 'A', amount: id + 100 }))
  const ranges = []
  const client = {
    from: () => ({
      select() {
        return this
      },
      in() {
        return this
      },
      order() {
        return this
      },
      range(a, b) {
        ranges.push([a, b])
        return Promise.resolve({ data: rows.slice(a, b + 1) })
      }
    })
  }
  expect(summarizeAuctionBids(await readAuctionBids(client, ['A'], '*')).A).toEqual({
    count: 1002,
    highest: 1101
  })
  expect(ranges).toEqual([
    [0, 999],
    [1000, 1999]
  ])
  client.from = () => ({
    select() {
      return this
    },
    in() {
      return this
    },
    order() {
      return this
    },
    range() {
      return Promise.resolve({ error: new Error('離線') })
    }
  })
  await expect(readAuctionBids(client, ['A'], '*')).rejects.toThrow('離線')
})
