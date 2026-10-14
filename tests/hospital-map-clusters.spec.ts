import { describe, expect, it } from 'vitest'
import { clusterScreenHospitals, hospitalMarkerBounds } from '../utils/hospitalMapClusters'
describe('院所畫面群聚', () => {
  it('靠近左右邊界的院名完整留在地圖內', () => {
    for (const x of [23, 400, 777]) {
      const bounds = hospitalMarkerBounds({ x, y: 100, ids: ['a'] }, 800)
      expect(bounds.left).toBeGreaterThanOrEqual(0)
      expect(bounds.right).toBeLessThanOrEqual(800)
    }
  })
  it('名稱避讓仍保留所有院所並能在放大後拆開', () => {
    const points = [
      { id: 'a', x: 100, y: 100 },
      { id: 'b', x: 220, y: 100 },
      { id: 'c', x: 340, y: 100 }
    ]
    const groups = clusterScreenHospitals(points, 70, true, 800)
    expect(groups.flatMap((group) => group.ids).sort()).toEqual(['a', 'b', 'c'])
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        const a = hospitalMarkerBounds(groups[i]!, 800),
          b = hospitalMarkerBounds(groups[j]!, 800)
        expect(
          a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
        ).toBe(true)
      }
    expect(
      clusterScreenHospitals(
        [
          { id: 'a', x: 100, y: 100 },
          { id: 'b', x: 400, y: 100 }
        ],
        70,
        true,
        800
      )
    ).toHaveLength(2)
  })
  it('名稱寬度重疊時合併，避免兩家院名互相遮擋', () => {
    expect(
      clusterScreenHospitals(
        [
          { id: 'a', x: 100, y: 100 },
          { id: 'b', x: 220, y: 100 }
        ],
        70,
        true,
        800
      )
    ).toHaveLength(1)
  })
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
