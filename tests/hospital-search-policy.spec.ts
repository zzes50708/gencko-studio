import { describe, expect, it } from 'vitest'
import { hospitalSearchRequest, createHospitalSearchGate } from '../utils/hospitalSearchPolicy'
describe('地點搜尋請求邊界', () => {
  it('相同查詢使用相同快取鍵並區分縣市', () => {
    expect(hospitalSearchRequest('  TAIPEI  101 ', '臺北市')?.key).toBe(
      hospitalSearchRequest('taipei 101', '台北市')?.key
    )
    expect(hospitalSearchRequest('醫院', '台北市')?.key).not.toBe(
      hospitalSearchRequest('醫院', '新北市')?.key
    )
  })
  it('拒絕異常、超長及錯誤區域值', () => {
    for (const raw of [null, [], 'a', 'a'.repeat(81)]) expect(hospitalSearchRequest(raw)).toBeNull()
    expect(hospitalSearchRequest('醫院', 'invalid')).toBeNull()
  })
  it('限流分開計算來源並於期限後恢復', () => {
    const gate = createHospitalSearchGate(2, 1000)
    expect(gate('a', 0)).toBe(0)
    expect(gate('a', 100)).toBe(0)
    expect(gate('a', 200)).toBe(1)
    expect(gate('b', 200)).toBe(0)
    expect(gate('a', 1000)).toBe(0)
  })
})
