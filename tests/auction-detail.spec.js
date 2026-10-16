import { it, expect } from 'vitest'
import {
  auctionPhotos,
  auctionShareDetails,
  sampleAuctionClock,
  auctionClockNow
} from '../utils/auction-detail'

const item = {
  id: 'TEST',
  morph: '測試',
  status: 'active',
  start_price: 100,
  min_increment: 100,
  end_time: '2030-01-01T00:00:00Z'
}

it('照片保留順序並去除空值、不安全網址與重複項', () => {
  expect(
    auctionPhotos([
      ' https://example.com/1.jpg ',
      '',
      null,
      'javascript:alert(1)',
      'https://example.com/2.jpg',
      'https://example.com/1.jpg'
    ])
  ).toEqual(['https://example.com/1.jpg', 'https://example.com/2.jpg'])
  expect(auctionPhotos(null)).toEqual([])
})

it('最高價未知時不能把起標價寫成最高價；無人出價要標示起標', () => {
  const unknown = auctionShareDetails(item, { known: false, highest: null, now: 0 })
  expect(unknown.title).not.toContain('目前最高')
  expect(unknown.currentPrice).toBe(null)
  const empty = auctionShareDetails(item, { known: true, highest: null, now: 0 })
  expect(empty.title).toContain('尚無出價')
  expect(empty.priceLabel).toBe('起標價')
  expect(auctionShareDetails(item, { known: true, highest: 400, now: 0 }).title).toContain('400')
})

it('暫停、結標、遺失與讀取錯誤不宣稱販售中', () => {
  const paused = auctionShareDetails(
    { ...item, status: 'paused' },
    { known: true, highest: 400, now: 0 }
  )
  expect(paused.title).toContain('暫停競標')
  expect(paused.indexable).toBe(false)
  expect(paused.availability).toBe('out of stock')
  const missing = auctionShareDetails(null, { now: 0 })
  expect(missing.indexable).toBe(false)
  expect(auctionShareDetails(null, { error: true, now: 0 }).title).toContain('載入失敗')
})

it('伺服器時間以單調時鐘推進，不依賴裝置日期', () => {
  const anchor = sampleAuctionClock(100000, 100, 300)
  expect(auctionClockNow(anchor, 1300)).toBe(101100)
  expect(sampleAuctionClock('bad', 0, 100)).toBe(null)
})
