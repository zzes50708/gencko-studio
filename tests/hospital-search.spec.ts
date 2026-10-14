import { expect, it } from 'vitest'
import { hospitalMatchesQuery } from '../utils/hospitalSearch'
import { hospitalPhoneE164 } from '../utils/hospitalPhone'

it('全形英文與數字可搜尋半形院名及地址', () => {
  expect(hospitalMatchesQuery(['ABC 動物醫院', '台北市100號'], 'ＡＢＣ １００')).toBe(true)
})

it('台臺通用，多關鍵字跨欄位比對且必須全部符合', () => {
  const fields = ['測試院所', '臺北市', '大同區']
  expect(hospitalMatchesQuery(fields, ' 台北　大同 ')).toBe(true)
  expect(hospitalMatchesQuery(fields, '臺北 大同')).toBe(true)
  expect(hospitalMatchesQuery(fields, '台北 信義')).toBe(false)
  expect(hospitalMatchesQuery(fields, '  ')).toBe(true)
})
it('結構化電話排除分機並保留國際國碼', () => {
  expect(hospitalPhoneE164('04-2332-3456#6371')).toBe('+886423323456')
  expect(hospitalPhoneE164('+886 2 2553 7939')).toBe('+886225537939')
  expect(hospitalPhoneE164(null)).toBe(null)
})
