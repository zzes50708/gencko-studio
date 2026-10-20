import { it, expect } from 'vitest'
import {
  auctionState,
  hasBuyNowPrice,
  readAuctionBids,
  readAuctionCatalog,
  summarizeAuctionBids,
  isAuctionListed,
  auctionCountdown
} from '../utils/auction-presentation'

it('有效場次超過一千筆仍完整讀取，套用保留期限與固定排序；末頁失敗不回傳部分清單', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id: String(id) }))
  const ranges = [],
    filters = [],
    orders = []
  let fail = false
  const client = {
    from: () => ({
      select() {
        return this
      },
      in(...args) {
        filters.push(args)
        return this
      },
      gt(...args) {
        filters.push(args)
        return this
      },
      order(...args) {
        orders.push(args)
        return this
      },
      range(a, b) {
        ranges.push([a, b])
        return Promise.resolve(
          fail && a === 1000 ? { error: Error('末頁離線') } : { data: rows.slice(a, b + 1) }
        )
      }
    })
  }
  const now = Date.parse('2026-10-20T08:00:00Z')
  expect(await readAuctionCatalog(client, now)).toHaveLength(1201)
  expect(ranges).toEqual([
    [0, 499],
    [500, 999],
    [1000, 1499]
  ])
  expect(filters).toContainEqual(['end_time', '2026-10-18T08:00:00.000Z'])
  expect(filters).toContainEqual(['status', ['active', 'ended']])
  expect(orders.slice(0, 2)).toEqual([
    ['end_time', { ascending: true }],
    ['id', { ascending: true }]
  ])
  fail = true
  await expect(readAuctionCatalog(client, now)).rejects.toThrow('末頁離線')
})

it('預約開標前不能出價，時間到自動轉為競標中，舊場次仍立即開放', () => {
  const start = Date.parse('2026-10-20T08:00:00Z')
  const item = {
    status: 'active',
    start_time: new Date(start).toISOString(),
    end_time: new Date(start + 3600000).toISOString()
  }
  expect(auctionState(item, start - 1).status).toBe('scheduled')
  expect(auctionCountdown(item, start - 60000)).toBe('開標倒數 00:01:00')
  expect(auctionState(item, start).status).toBe('active')
  expect(auctionState(item, start + 3600000).status).toBe('ended')
  expect(auctionState({ ...item, start_time: null }, start - 1).status).toBe('active')
})

it('跨頁讀取期間有新出價插入，不重複計算移到下一頁的紀錄', async () => {
  const first = Array.from({ length: 1000 }, (_, id) => ({ id, auction_id: 'A', amount: id + 100 }))
  const pages = [first, [first[999], { id: 1000, auction_id: 'A', amount: 1500 }]]
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
      range() {
        return Promise.resolve({ data: pages.shift() })
      }
    })
  }
  expect(summarizeAuctionBids(await readAuctionBids(client, ['A'], '*')).A).toEqual({
    count: 1001,
    highest: 1500
  })
})

it('大量場次分批查詢以控制網址長度，空回執不能誤認為沒有出價', async () => {
  const batches = []
  let emptyReceipt = false
  const client = {
    from: () => ({
      select() {
        return this
      },
      in(field, ids) {
        this.ids = ids
        batches.push(ids)
        return this
      },
      order() {
        return this
      },
      range() {
        return Promise.resolve({
          data: emptyReceipt
            ? null
            : this.ids.map((id) => ({ id: 'B-' + id, auction_id: id, amount: 100 }))
        })
      }
    })
  }
  const ids = Array.from({ length: 201 }, (_, i) => 'A-' + i)
  expect(await readAuctionBids(client, [...ids, ids[0]], '*')).toHaveLength(201)
  expect(batches.map((ids) => ids.length)).toEqual([100, 100, 1])
  emptyReceipt = true
  await expect(readAuctionBids(client, ['A'], '*')).rejects.toThrow('出價紀錄回應不完整')
})

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
  expect(auctionState({ ...item, status: 'paused' }, Date.parse('2031-01-01')).status).toBe(
    'closed'
  )
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
