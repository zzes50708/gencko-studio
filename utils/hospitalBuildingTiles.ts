export type TileCoordinate = { z: number; x: number; y: number }
export type GeographicBounds = { west: number; east: number; south: number; north: number }
export type TileBuilding = {
  id: string
  height: number
  minHeight: number
  polygons: [number, number][][][]
}
export type TilePlace = { name: string; category: string; longitude: number; latitude: number }
export type BuildingTileData = {
  buildings: TileBuilding[]
  roads: { name?: string; kind: string; lines: [number, number][][] }[]
  greens: [number, number][][][]
  water: [number, number][][][]
  places: TilePlace[]
}
export function geographicTile(longitude: number, latitude: number, z: number): TileCoordinate {
  const n = 2 ** z
  const phi = (Math.max(-85, Math.min(85, latitude)) * Math.PI) / 180
  return {
    z,
    x: Math.floor(((longitude + 180) / 360) * n),
    y: Math.floor(((1 - Math.asinh(Math.tan(phi)) / Math.PI) / 2) * n)
  }
}
export function visibleBuildingTiles(
  bounds: GeographicBounds,
  maxTiles = 16,
  focus?: [number, number]
): TileCoordinate[] {
  const west = Math.max(115, bounds.west),
    east = Math.min(125, bounds.east)
  const south = Math.max(18, bounds.south),
    north = Math.min(27, bounds.north)
  if (west > east || south > north || maxTiles < 1) return []
  // 固定使用完整建築細節；視野過大時先載入中心區域，不退回建築稀少的低細節圖磚。
  const z = 14,
    nw = geographicTile(west, north, z),
    se = geographicTile(east, south, z)
  const center = geographicTile(
    Math.max(west, Math.min(east, focus?.[0] ?? (west + east) / 2)),
    Math.max(south, Math.min(north, focus?.[1] ?? (south + north) / 2)),
    z
  )
  const radius = Math.ceil(Math.sqrt(maxTiles))
  const tiles: TileCoordinate[] = []
  for (let x = Math.max(nw.x, center.x - radius); x <= Math.min(se.x, center.x + radius); x++)
    for (let y = Math.max(nw.y, center.y - radius); y <= Math.min(se.y, center.y + radius); y++)
      tiles.push({ z, x, y })
  return tiles
    .sort(
      (a, b) =>
        (a.x - center.x) ** 2 +
          (a.y - center.y) ** 2 -
          ((b.x - center.x) ** 2 + (b.y - center.y) ** 2) ||
        a.x - b.x ||
        a.y - b.y
    )
    .slice(0, maxTiles)
}
