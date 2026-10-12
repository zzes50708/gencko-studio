import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import type { BuildingTileData, TileCoordinate } from './hospitalBuildingTiles'

export function decodeBuildingTile(buffer: ArrayBuffer, tile: TileCoordinate): BuildingTileData {
  const vector = new VectorTile(new PbfReader(buffer))
  const result: BuildingTileData = { buildings: [], roads: [], greens: [], water: [], places: [] }
  for (const layerName of [
    'building',
    'transportation',
    'transportation_name',
    'landcover',
    'landuse',
    'water',
    'poi'
  ]) {
    const layer = vector.layers[layerName]
    if (!layer) continue
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i)
      const properties = feature.properties
      const geometry = feature.toGeoJSON(tile.x, tile.y, tile.z).geometry
      const name = String(properties['name:zh'] || properties.name || '')
      const kind = String(properties.class || '')
      if (
        layerName === 'building' &&
        (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')
      ) {
        if (properties.hide_3d === true || properties.hide_3d === 1) continue
        const height = Math.max(1, Math.min(800, Number(properties.render_height) || 5))
        const minHeight = Math.max(
          0,
          Math.min(height - 1, Number(properties.render_min_height) || 0)
        )
        result.buildings.push({
          id: String(feature.id ?? i),
          height,
          minHeight,
          polygons: (geometry.type === 'Polygon'
            ? [geometry.coordinates]
            : geometry.coordinates) as [number, number][][][]
        })
      } else if (
        layerName === 'transportation' &&
        (geometry.type === 'LineString' || geometry.type === 'MultiLineString')
      ) {
        result.roads.push({
          name,
          kind,
          lines: (geometry.type === 'LineString'
            ? [geometry.coordinates]
            : geometry.coordinates) as [number, number][][]
        })
      } else if (
        (layerName === 'landcover' || layerName === 'landuse') &&
        ['grass', 'wood', 'park', 'forest', 'garden', 'recreation_ground'].includes(kind) &&
        (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')
      ) {
        result.greens.push(
          ...((geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as [
            number,
            number
          ][][][])
        )
      } else if (
        layerName === 'water' &&
        (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')
      ) {
        result.water.push(
          ...((geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates) as [
            number,
            number
          ][][][])
        )
      } else if (
        layerName === 'transportation_name' &&
        name &&
        (geometry.type === 'LineString' || geometry.type === 'MultiLineString')
      ) {
        const line =
          geometry.type === 'LineString' ? geometry.coordinates : geometry.coordinates[0]!
        const point = line[Math.floor(line.length / 2)]!
        if (point)
          result.places.push({ name, category: 'road', longitude: point[0]!, latitude: point[1]! })
      } else if (layerName === 'poi' && name && geometry.type === 'Point') {
        result.places.push({
          name,
          category: kind,
          longitude: geometry.coordinates[0]!,
          latitude: geometry.coordinates[1]!
        })
      }
    }
  }
  return result
}
