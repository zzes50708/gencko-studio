import { describe, expect, it } from 'vitest'
import {
  MAP_COUNTIES,
  countyAnchor,
  isInsideCounty,
  preciseMapHospitals,
  projectTaiwanCoordinate,
  summarizeMapHospitals
} from '../utils/hospitalMap'

describe('醫院地圖資料可信度', () => {
  it('保留全部 22 縣市與離島，每個縣市的概覽點都在自己的邊界內', () => {
    expect(MAP_COUNTIES).toHaveLength(22)
    expect(new Set(MAP_COUNTIES.map((county) => county.name)).size).toBe(22)
    for (const county of MAP_COUNTIES) {
      const anchor = countyAnchor(county.polygons)
      expect(isInsideCounty(anchor, county.polygons), county.name).toBe(true)
      for (const polygon of county.polygons)
        for (const ring of polygon) {
          expect(ring.length).toBeGreaterThanOrEqual(4)
          expect(ring[0]).toEqual(ring.at(-1))
          expect(ring.every((point) => point.every(Number.isFinite))).toBe(true)
        }
    }
    expect(MAP_COUNTIES.map((county) => county.name)).toEqual(
      expect.arrayContaining(['澎湖縣', '金門縣', '連江縣'])
    )
  })

  it('台／臺異體、數字／字串收藏 id 不會導致漏算，過期收藏不會增加院所數', () => {
    const result = summarizeMapHospitals(
      [
        { id: '1', city: '臺北市' },
        { id: 2, city: '台北市' },
        { id: '3', city: '高雄市' }
      ],
      [1, '2', 'removed']
    )
    expect(result.get('台北市')).toEqual({ count: 2, saved: 2 })
    expect(result.get('高雄市')).toEqual({ count: 1, saved: 0 })
    expect([...result.values()].reduce((sum, county) => sum + county.count, 0)).toBe(3)
  })

  it('空資料保持零筆；洞與多島多邊形不被視為同一片實心陸地', () => {
    expect(summarizeMapHospitals([], ['1']).size).toBe(0)
    const polygons: [number, number][][][] = [
      [
        [
          [0, 0],
          [4, 0],
          [4, 4],
          [0, 4],
          [0, 0]
        ],
        [
          [1, 1],
          [3, 1],
          [3, 3],
          [1, 3],
          [1, 1]
        ]
      ]
    ]
    expect(isInsideCounty([0.5, 0.5], polygons)).toBe(true)
    expect(isInsideCounty([2, 2], polygons)).toBe(false)
    expect(isInsideCounty([5, 5], polygons)).toBe(false)
  })

  it('WGS84 醫院座標會落在對應縣市，缺少座標時不建立假點位', () => {
    const point = projectTaiwanCoordinate(120.6020451, 22.6423906)
    const county = MAP_COUNTIES.find((item) => item.name === '屏東縣')!
    expect(isInsideCounty(point, county.polygons)).toBe(true)
    expect(
      preciseMapHospitals([
        { id: '77', city: '屏東縣', latitude: 22.6423906, longitude: 120.6020451 },
        { id: '78', city: '台東縣', latitude: null, longitude: null }
      ]).map((hospital) => hospital.id)
    ).toEqual(['77'])
  })
})
