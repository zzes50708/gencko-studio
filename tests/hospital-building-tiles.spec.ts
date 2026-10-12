import { describe, expect, it } from 'vitest'
import { projectTaiwanCoordinate, unprojectTaiwanCoordinate } from '../utils/hospitalMap'
import { geographicTile, visibleBuildingTiles } from '../utils/hospitalBuildingTiles'
import { readFileSync } from 'node:fs'
import { decodeBuildingTile } from '../utils/hospitalVectorTileDecode'
describe('全台建築圖磚', () => {
  it('真實金門圖磚可解析建築、道路與地標', () => {
    const buffer = readFileSync(
      new URL('./fixtures/hospital-buildings-kinmen.pbf', import.meta.url)
    )
    const data = decodeBuildingTile(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
      { z: 14, x: 13576, y: 7044 }
    )
    expect(data.buildings).toHaveLength(12)
    expect(data.roads.length).toBeGreaterThan(0)
    expect(data.places.length).toBeGreaterThan(0)
    expect(data.buildings.every((building) => building.height > building.minHeight)).toBe(true)
  })
  it('投影可逆，北中南東與離島位置不偏移', () => {
    for (const [lon, lat] of [
      [121.564, 25.033],
      [120.3, 22.63],
      [121.15, 22.76],
      [118.318, 24.433]
    ]) {
      const world = projectTaiwanCoordinate(lon!, lat!)
      const result = unprojectTaiwanCoordinate(...world)
      expect(result[0]).toBeCloseTo(lon!, 7)
      expect(result[1]).toBeCloseTo(lat!, 7)
    }
  })
  it('只取視野內圖磚，限制單次下載數量', () => {
    const tiles = visibleBuildingTiles({ west: 121.56, east: 121.57, south: 25.03, north: 25.04 })
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.length).toBeLessThanOrEqual(16)
    expect(tiles).toContainEqual(geographicTile(121.564, 25.033, 14))
    expect(visibleBuildingTiles({ west: 115, east: 125, south: 18, north: 27 })).toEqual([])
  })
})
