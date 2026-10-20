import { it, expect } from 'vitest'
import {
  taipeiDateTime,
  parseTaipeiDateTime,
  listingError,
  restoreListingIntent,
  nextAuctionSchedule
} from '../utils/auction-listing.js'
const now = Date.parse('2026-10-19T08:00:00Z')
it('預設下週一台灣10點開標、同週六22點結標，跨週及跨年正確', () => {
  for (const value of ['2026-10-19T01:00:00Z', '2026-10-20T00:00:00Z', '2026-10-25T15:59:00Z'])
    expect(nextAuctionSchedule(Date.parse(value))).toEqual({
      startTime: '2026-10-26T10:00',
      endTime: '2026-10-31T22:00'
    })
  expect(nextAuctionSchedule(Date.parse('2026-10-25T16:00:00Z'))).toEqual({
    startTime: '2026-11-02T10:00',
    endTime: '2026-11-07T22:00'
  })
  expect(nextAuctionSchedule(Date.parse('2026-12-31T00:00:00Z'))).toEqual({
    startTime: '2027-01-04T10:00',
    endTime: '2027-01-09T22:00'
  })
})
const form = {
  animalId: 'TEST',
  startPrice: 0,
  increment: 100,
  mode: 'now',
  startTime: '',
  endTime: '2026-10-20T16:00'
}
it('上架暫存僅恢復完整原請求；已過期仍可重試，毀損或額外參數不會帶入', () => {
  const intent = {
    p_request_id: '10000000-0000-4000-8000-000000000001',
    p_animal_id: 'TEST',
    p_start_price: 0,
    p_min_increment: 100,
    p_start_time: null,
    p_end_time: '2020-01-02T08:00:00.000Z',
    p_note: '',
    p_shipping_info: '',
    p_diet: '',
    p_feeding_freq: '',
    p_tongs_fed: '是'
  }
  expect(restoreListingIntent(JSON.stringify({ ...intent, unwanted: '不傳送' }))).toEqual(intent)
  for (const patch of [
    { p_start_price: '0' },
    { p_min_increment: 0 },
    { p_start_time: '錯誤' },
    { p_start_time: '2020-01-03T08:00:00.000Z' },
    { p_note: null },
    { p_note: '字'.repeat(3001) },
    { p_animal_id: '' }
  ])
    expect(restoreListingIntent(JSON.stringify({ ...intent, ...patch }))).toBeNull()
  expect(restoreListingIntent('{')).toBeNull()
})
it('上架時間固定採台灣時間，拒絕不存在的日期', () => {
  expect(parseTaipeiDateTime('2026-10-20T16:00')).toBe('2026-10-20T08:00:00.000Z')
  expect(taipeiDateTime(now)).toBe('2026-10-19T16:00')
  for (const value of ['', '2026-02-30T12:00', '2026-10-19T25:00', '2026-10-19'])
    expect(parseTaipeiDateTime(value)).toBeNull()
})
it('立即及預約均查核金額、個體與時間先後', () => {
  expect(listingError(form, now)).toBe('')
  expect(listingError({ ...form, mode: 'scheduled', startTime: '2026-10-20T15:00' }, now)).toBe('')
  for (const patch of [
    { animalId: '' },
    { startPrice: -1 },
    { startPrice: 0.5 },
    { increment: 0 },
    { increment: 0.5 },
    { startPrice: 2147483647 },
    { endTime: '2026-10-19T15:00' },
    { mode: 'scheduled', startTime: '2026-10-19T16:00' },
    { mode: 'scheduled', startTime: '2026-10-20T17:00' }
  ])
    expect(listingError({ ...form, ...patch }, now)).not.toBe('')
})
