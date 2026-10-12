import { describe, expect, it } from 'vitest'
import { buildingMapHeight } from '../utils/hospitalBuildings'
import data from '../public/hospital-buildings-taipei101.json'

describe('虛擬建築量體', () => {
  it('使用圖資樓高，保持地圖比例', () => {
    const tower = data.buildings.find((building) => building.id === '1159328965')!
    expect(tower.height).toBe(508)
    expect(tower.heightSource).toBe('height')
    const h = buildingMapHeight({ ...tower, ring: tower.ring as [number, number][] })
    expect(h).toBeGreaterThan(0)
    expect(
      buildingMapHeight({ ...tower, height: 254, ring: tower.ring as [number, number][] }) / h
    ).toBeCloseTo(0.5, 3)
  })
  it('建築輪廓閉合，不把樓層細部分件疊成多棟大樓', () => {
    expect(data.buildings.length).toBe(41)
    expect(new Set(data.buildings.map((building) => building.id)).size).toBe(41)
    for (const building of data.buildings) {
      expect(building.ring[0]).toEqual(building.ring.at(-1))
      expect(building.height).toBeGreaterThan(0)
    }
  })
})
