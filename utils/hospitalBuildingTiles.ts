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
export function visibleBuildingTiles(bounds: GeographicBounds, maxTiles = 16): TileCoordinate[] {
  const west = Math.max(115, bounds.west),
    east = Math.min(125, bounds.east)
  const south = Math.max(18, bounds.south),
    north = Math.min(27, bounds.north)
  if (west > east || south > north) return []
  for (let z = 14; z >= 13; z--) {
    const nw = geographicTile(west, north, z),
      se = geographicTile(east, south, z)
    if ((se.x - nw.x + 1) * (se.y - nw.y + 1) > maxTiles) continue
    const tiles: TileCoordinate[] = []
    for (let x = nw.x; x <= se.x; x++) for (let y = nw.y; y <= se.y; y++) tiles.push({ z, x, y })
    return tiles
  }
  return []
}
