import { it, expect } from 'vitest'
import {
  auctionState,
  hasBuyNowPrice,
  readAuctionBids,
  summarizeAuctionBids
} from '../utils/auction-presentation'

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
