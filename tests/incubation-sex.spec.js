import { describe, expect, it } from 'vitest'
import { getIncubationEstimate, formatAnimalSex, getAnimalSexTone } from '../utils/incubation-sex'
describe('物種孵化溫度表', () => {
  it.each([
    [24, '絕大多數母'],
    [26.9, '絕大多數母'],
    [27, '約25%公／75%母'],
    [28, '公母各約50%'],
    [30, '約70～75%公／25%母'],
    [31, '絕大多數公'],
    [33, '絕大多數公'],
    [34, '比例未提供']
  ])('豹紋 %s°C 顯示 %s', (t, label) =>
    expect(getIncubationEstimate('豹紋守宮', t).label).toBe(label)
  )
  it.each([
    [26, '絕大多數母'],
    [27.5, '絕大多數母'],
    [28, '公母各約50%'],
    [29.5, '公母各約50%'],
    [29.8, '比例未提供'],
    [30, '絕大多數公'],
    [31.9, '絕大多數公'],
    [32, '多為高溫母，不建議'],
    [33, '多為高溫母，不建議']
  ])('肥尾 %s°C 顯示 %s', (t, label) =>
    expect(getIncubationEstimate('肥尾守宮', t).label).toBe(label)
  )
  it('缺值與無效溫度不能被當作低溫母', () => {
    for (const value of ['', null, '未知', '27-28'])
      expect(getIncubationEstimate('豹紋守宮', value).label).toBe('')
    expect(getIncubationEstimate('其他物種', 27).label).toBe('比例未提供')
  })
  it('手機可將不保證性別分行，但完整資料保留提示', () => {
    const item = { Species: '肥尾守宮', GenderType: '溫控', GenderValue: '３２°C' }
    expect(formatAnimalSex(item)).toBe('孵化溫度:32度（母溫，不保證性別）')
    expect(formatAnimalSex(item, { disclaimer: false })).not.toContain('不保證性別')
    expect(getAnimalSexTone(item)).toBe('female')
    expect(formatAnimalSex({ GenderType: '公', GenderValue: 27 })).toBe('公')
  })
})

it('前台使用公溫母溫，舊資料名稱不外露', () => {
  for (const type of ['溫控', '孵化溫度', '公溫', '母溫']) {
    const text = formatAnimalSex({ Species: '豹紋守宮', GenderType: type, GenderValue: 31 })
    expect(text).toContain('公溫')
    expect(text).not.toContain('溫控')
  }
  expect(formatAnimalSex({ Species: '豹紋守宮', GenderType: '溫控', GenderValue: 27.5 })).toContain(
    '母溫'
  )
})

it('顧客只看到公母溫，不顯示百分比或比例表提示', () => {
  for (const t of [24, 27.5, 28, 30.5, 31, 34]) {
    const text = formatAnimalSex({ Species: '豹紋守宮', GenderType: '孵化溫度', GenderValue: t })
    expect(text).not.toMatch(/%|比例|參考表/)
  }
  expect(formatAnimalSex({ GenderType: '母溫' })).toContain('母溫')
})
