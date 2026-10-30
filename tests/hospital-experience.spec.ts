import { describe, expect, it } from 'vitest'
import {
  normalizeHospitalQuery,
  rankHospitalMatches,
  hospitalHours,
  hospitalSpecies,
  hospitalVerifiedDate,
  hospitalPixelRatio
} from '../utils/hospitalExperience'

describe('醫院搜尋與資料呈現', () => {
  it('統一全形、台臺及空白', () =>
    expect(normalizeHospitalQuery('  臺北　１０１  ')).toBe('台北 101'))
  it('院名完整符合優先，其他相同分數維持穩定順序', () => {
    const rows = [{ name: '甲分院' }, { name: '甲' }, { name: '乙', address: '甲路' }]
    expect(rankHospitalMatches(rows, '甲')).toEqual([rows[1], rows[0], rows[2]])
    expect(rankHospitalMatches(rows, '無結果')).toEqual([])
  })
  it('看診時間只接受有意義的來源文字', () => {
    expect(hospitalHours(null)).toBe('')
    expect(hospitalHours({ 週一: '10–18', 未確認: false })).toBe('週一：10–18')
    expect(hospitalHours(['上午', null])).toBe('上午')
  })
  it('拒絕無效確認日期並去除重複物種', () => {
    expect(hospitalVerifiedDate('2026-02-30')).toBe('')
    expect(hospitalVerifiedDate('2026-10-30T00:00:00Z')).toBe('2026-10-30')
    expect(hospitalSpecies(['爬蟲', '爬蟲', null])).toBe('爬蟲')
  })
  it('低階裝置降低解析度但維持實際3D畫布', () => {
    expect(hospitalPixelRatio(3, true, 4, 4)).toBe(1)
    expect(hospitalPixelRatio(3, true, 8, 8)).toBe(1.25)
    expect(hospitalPixelRatio(2, false, 8, 8)).toBe(1.75)
  })
})

describe('醫院地圖連結與取得時間', () => {
  it('只接受Google地圖網址，錯誤來源退回安全的地址查詢', async () => {
    const { hospitalGoogleMapUrl, hospitalLoadedTime } = await import('../utils/hospitalExperience')
    expect(hospitalGoogleMapUrl({ mapUrl: 'https://maps.app.goo.gl/example' })).toBe(
      'https://maps.app.goo.gl/example'
    )
    for (const mapUrl of [
      'javascript:alert(1)',
      'https://google.com.invalid/maps',
      'https://www.google.com/url?q=https://invalid.test'
    ])
      expect(hospitalGoogleMapUrl({ name: '測試', address: '台北', mapUrl })).toContain(
        'https://www.google.com/maps/search/?api=1&query='
      )
    expect(hospitalLoadedTime('invalid')).toBe('未提供')
    expect(hospitalLoadedTime('2026-10-30T00:00:00Z')).toContain('08:00')
  })
})
