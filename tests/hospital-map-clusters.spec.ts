import { describe, expect, it } from 'vitest'
import { clusterScreenHospitals } from '../utils/hospitalMapClusters'
describe('院所畫面群聚', () => {
  it('合併重疊點位，保留所有院所', () => {
    const result = clusterScreenHospitals([
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 110, y: 104 },
      { id: 'c', x: 300, y: 100 }
    ])
    expect(result).toHaveLength(2)
    expect(result[0]!.ids).toEqual(['a', 'b'])
    expect(result.flatMap((group) => group.ids).sort()).toEqual(['a', 'b', 'c'])
  })
  it('放大後距離拉開可展開，空篩選沒有群聚', () => {
    expect(
      clusterScreenHospitals([
        { id: 1, x: 100, y: 100 },
        { id: 2, x: 170, y: 100 }
      ])
    ).toHaveLength(2)
    expect(clusterScreenHospitals([])).toEqual([])
  })
})
