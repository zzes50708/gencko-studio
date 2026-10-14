import { expect, it } from 'vitest'
import { parseHospitalFavorites } from '../utils/hospitalFavorites'
it('收藏只接受 ID 陣列並統一型別、移除重複及無效內容', () => {
  expect(parseHospitalFavorites('[12,"12"," A ",null,{},false,""]')).toEqual(['12', 'A'])
})
it('毀損或非陣列的收藏不會拋錯', () => {
  for (const raw of [null, 'bad JSON', '{}', '12', '"abc"'])
    expect(parseHospitalFavorites(raw)).toEqual([])
})
