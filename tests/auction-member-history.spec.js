import { expect, it } from 'vitest'
import { readMemberAuctionHistory } from '../utils/auction-member-history'

function fixture(rows) {
  const calls = { rpc: [], batches: [] }
  const client = {
    rpc(name, args) {
      calls.rpc.push([name, args])
      return {
        order() {
          return this
        },
        range(a, b) {
          this.a = a
          this.b = b
          return this
        },
        abortSignal() {
          return this
        },
        then(resolve) {
          return Promise.resolve({ data: rows?.slice(this.a, this.b + 1) ?? null }).then(resolve)
        }
      }
    },
    from() {
      return {
        select() {
          return this
        },
        in(_, ids) {
          this.ids = ids
          calls.batches.push(ids)
          return this
        },
        abortSignal() {
          return this
        },
        then(resolve) {
          return Promise.resolve({
            data: this.ids.map((id) => ({ id, status: 'active', end_time: '2035-01-01T00:00:00Z' }))
          }).then(resolve)
        }
      }
    }
  }
  return { client, calls }
}
const bid = (id, amount = 200) => ({ auction_id: id, amount, bid_time: '2026-10-21T00:00:00Z' })
it('大量場次資料每批最多100個ID；只呼叫自己的RPC，不從前端傳會員ID', async () => {
  const { client, calls } = fixture(Array.from({ length: 201 }, (_, i) => bid('A' + i)))
  expect(await readMemberAuctionHistory(client)).toHaveLength(201)
  expect(calls.batches.map((x) => x.length)).toEqual([100, 100, 1])
  expect(calls.rpc).toEqual([['get_my_auction_bids', undefined]])
})
it('跨頁重複不多算，超過一千筆仍找到本人完整最高價', async () => {
  const rows = Array.from({ length: 1201 }, (_, i) => bid('A', 200 + i))
  rows.splice(500, 0, rows[499])
  const { client } = fixture(rows)
  expect((await readMemberAuctionHistory(client))[0]).toMatchObject({
    my_max_bid: 1400,
    bid_count: 1201
  })
})
it('空回執與錯誤欄位拒絕；缺少場次資料保留本人紀錄但不冒稱競標中', async () => {
  for (const rows of [
    null,
    [{ ...bid('A'), amount: '200' }],
    [{ ...bid('A'), bid_time: 'invalid' }]
  ])
    await expect(readMemberAuctionHistory(fixture(rows).client)).rejects.toThrow(
      '個人出價紀錄回應不完整'
    )
  const { client } = fixture([bid('A')])
  client.from = () => ({
    select() {
      return this
    },
    in() {
      return Promise.resolve({ data: [] })
    }
  })
  expect((await readMemberAuctionHistory(client))[0]).toMatchObject({
    morph: '場次資料待確認',
    status: undefined,
    my_max_bid: 200
  })
})
it('末批失敗與取消查詢，不回傳半份可誤信的資料', async () => {
  const { client } = fixture(Array.from({ length: 101 }, (_, i) => bid('A' + i)))
  let batches = 0
  const original = client.from
  client.from = () =>
    ++batches === 2
      ? {
          select() {
            return this
          },
          in() {
            return Promise.resolve({ data: null, error: Error('offline') })
          }
        }
      : original()
  await expect(readMemberAuctionHistory(client)).rejects.toThrow('offline')
  const controller = new AbortController()
  controller.abort()
  await expect(readMemberAuctionHistory(client, controller.signal)).rejects.toThrow('查詢已取消')
})
