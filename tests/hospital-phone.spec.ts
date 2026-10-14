import { describe, expect, it } from 'vitest'
import { hospitalPhone } from '../utils/hospitalPhone'
describe('醫院主號與分機', () => {
  it('分機不串入主號，支援常用分隔格式', () => {
    for (const phone of ['04-2332-3456#6371', '04-2332-3456 分機 6371', '04-2332-3456 ext. 6371']) {
      expect(hospitalPhone(phone)).toEqual({
        number: '04-2332-3456',
        extension: '6371',
        href: 'tel:0423323456'
      })
    }
  })
  it('一般號碼與國際號碼保留正確撥號內容', () => {
    expect(hospitalPhone('(02) 2553-7939').href).toBe('tel:0225537939')
    expect(hospitalPhone('+886 2 2553 7939').href).toBe('tel:+886225537939')
  })
  it('沒有電話時不產生可點擊連結', () => {
    expect(hospitalPhone(null).href).toBe('')
  })
})
