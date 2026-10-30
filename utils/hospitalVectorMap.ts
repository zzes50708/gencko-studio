import type { StyleSpecification } from 'maplibre-gl'
import { preciseMapHospitals, type MapHospital } from './hospitalMap'

export const HOSPITAL_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
export const HOSPITAL_SOURCE = 'gencko-hospitals'
export const HOSPITAL_LAYERS = [
  'gencko-clusters',
  'gencko-points',
  'gencko-hospital-names',
  'gencko-cluster-count'
]
export const TAIWAN_BOUNDS: [[number, number], [number, number]] = [
  [118.05, 21.7],
  [122.15, 25.65]
]

/** 缺少道路編號長度時，以超過盾牌上限的值略過，避免空值／字串造成型別警告。 */
function roadRefLengthFilter(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  if (value[0] === 'get' && value[1] === 'ref_length')
    return ['to-number', ['coalesce', ['get', 'ref_length'], 7], 7]
  return value.map(roadRefLengthFilter)
}

/** 道路、文字與建築共用相同向量底圖，不另疊一張地圖。 */
export function hospitalVectorStyle(original: StyleSpecification): StyleSpecification {
  const style = JSON.parse(JSON.stringify(original)) as StyleSpecification
  for (const layer of style.layers) {
    if (layer.type === 'symbol' && /shield/.test(layer.id) && layer.filter)
      layer.filter = roadRefLengthFilter(layer.filter) as typeof layer.filter
    if (
      layer.type === 'symbol' &&
      layer['source-layer'] === 'poi' &&
      layer.layout?.['icon-image']
    ) {
      // 使用同一套圖示集的停車圖示與中性標記；文字與實際地點類型保持原資料。
      const originalIcon = layer.layout['icon-image']
      layer.layout['icon-image'] = [
        'coalesce',
        ['image', originalIcon],
        [
          'image',
          [
            'match',
            originalIcon,
            'motorcycle_parking',
            'parking',
            ['cycle_barrier', 'bollard'],
            'circle_stroked',
            originalIcon
          ]
        ],
        ['image', 'circle_stroked']
      ]
    }
    // 暖灰與霧藍的低彩度底圖；保留原圖徵、道路層級與文字佈局。
    if (layer.type === 'background') layer.paint = { ...layer.paint, 'background-color': '#e9e5df' }
    if (layer.type === 'raster' && layer.id === 'natural_earth')
      layer.paint = { ...layer.paint, 'raster-saturation': -1 }
    if (layer.type === 'fill') {
      const source = layer['source-layer']
      let color: string | undefined
      if (source === 'water') color = '#91a8ae'
      else if (source === 'park' || source === 'landcover')
        color = /sand|ice/.test(layer.id) ? '#ded6c6' : '#bbc5b5'
      else if (source === 'landuse')
        color = /school|hospital/.test(layer.id) ? '#d8d0c3' : '#dedbd3'
      else if (source === 'building') color = '#a6abaa'
      else if (source === 'aeroway' || source === 'transportation') color = '#e4dfd6'
      if (color) layer.paint = { ...layer.paint, 'fill-color': color, 'fill-outline-color': color }
    }
    if (layer.type === 'line') {
      const source = layer['source-layer']
      let color: string | undefined
      if (source === 'waterway') color = '#91a8ae'
      else if (source === 'park') color = '#abb7a5'
      else if (source === 'boundary') color = '#89918e'
      else if (source === 'aeroway') color = '#f6f1e8'
      else if (source === 'transportation')
        color = /rail/.test(layer.id)
          ? '#959c9a'
          : /casing/.test(layer.id)
            ? '#b8b2a7'
            : /motorway|trunk|primary/.test(layer.id)
              ? '#d8c2a9'
              : '#fffaf2'
      if (color) layer.paint = { ...layer.paint, 'line-color': color }
    }
    if (layer.type === 'symbol' && layer.layout?.['text-field'] && !/shield|arrow/.test(layer.id))
      layer.paint = {
        ...layer.paint,
        'text-color': /water/.test(layer.id) ? '#42616b' : '#3c494a',
        'text-halo-color': '#f6f2eb',
        'text-halo-width': 1.25
      }
    if (
      layer.type === 'symbol' &&
      layer.layout?.['text-field'] &&
      /name/.test(JSON.stringify(layer.layout['text-field'])) &&
      !/shield|arrow/.test(layer.id)
    ) {
      layer.layout['text-field'] = [
        'coalesce',
        ['get', 'name:zh-Hant'],
        ['get', 'name:zh'],
        ['get', 'name:nonlatin'],
        ['get', 'name'],
        ['get', 'name:latin'],
        ['get', 'name_en']
      ]
    }
    if (layer.type === 'fill-extrusion' && layer['source-layer'] === 'building') {
      layer.minzoom = 14
      layer.paint = {
        ...layer.paint,
        'fill-extrusion-height': ['max', 3, ['to-number', ['get', 'render_height'], 3]],
        'fill-extrusion-base': ['max', 0, ['to-number', ['get', 'render_min_height'], 0]],
        'fill-extrusion-opacity': 0.94,
        'fill-extrusion-color': '#818c8c',
        'fill-extrusion-vertical-gradient': true
      }
    }
  }
  return style
}

export function hospitalFeatures(
  hospitals: MapHospital[],
  wishlist: (string | number)[],
  selected?: string | number
) {
  const saved = new Set(wishlist.map(String))
  return {
    type: 'FeatureCollection' as const,
    features: preciseMapHospitals(hospitals).map((h) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [h.longitude!, h.latitude!] },
      properties: {
        id: String(h.id),
        name: h.name || '特寵醫院',
        saved: saved.has(String(h.id)),
        selected: String(h.id) === String(selected)
      }
    }))
  }
}

export function hospitalGeographicBounds(
  hospitals: MapHospital[]
): [[number, number], [number, number]] | null {
  const points = preciseMapHospitals(hospitals)
  if (!points.length) return null
  return [
    [Math.min(...points.map((h) => h.longitude!)), Math.min(...points.map((h) => h.latitude!))],
    [Math.max(...points.map((h) => h.longitude!)), Math.max(...points.map((h) => h.latitude!))]
  ]
}

export interface HospitalMapPlace {
  id: string
  name: string
  address: string
  longitude: number
  latitude: number
}

/** 搜尋 API 是另一個資料邊界；格式錯誤不能當成零筆或直接交給地圖。 */
export function hospitalPlaceSearchResults(response: unknown): HospitalMapPlace[] | null {
  const rows = (response as { places?: unknown } | null)?.places
  if (!Array.isArray(rows) || rows.length > 6) return null
  const places: HospitalMapPlace[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') return null
    const { id, name, address, longitude, latitude } = row
    if (
      typeof id !== 'string' ||
      !id ||
      id.length > 512 ||
      typeof name !== 'string' ||
      !name.trim() ||
      name.length > 120 ||
      typeof address !== 'string' ||
      address.length > 240 ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < 118 ||
      longitude > 124 ||
      latitude < 20 ||
      latitude > 27
    )
      return null
    places.push({ id, name: name.trim(), address, longitude, latitude })
  }
  return places
}

/** 標籤可能偏離點位；導航必須優先使用圖徵的實際座標。 */
export function hospitalMapFeaturePlace(
  feature: {
    id?: string | number
    properties?: Record<string, unknown> | null
    geometry?: { type: string; coordinates?: unknown }
  },
  clicked: [number, number]
): HospitalMapPlace | null {
  const p = feature.properties || {}
  const name = ['name:zh-Hant', 'name:zh', 'name:nonlatin', 'name', 'name:latin', 'name_en']
    .map((key) => p[key])
    .find((value) => typeof value === 'string' && value.trim())
  if (typeof name !== 'string') return null
  const coordinate = feature.geometry?.type === 'Point' ? feature.geometry.coordinates : clicked
  if (
    !Array.isArray(coordinate) ||
    !Number.isFinite(coordinate[0]) ||
    !Number.isFinite(coordinate[1]) ||
    Math.abs(coordinate[0]) > 180 ||
    Math.abs(coordinate[1]) > 90
  )
    return null
  return {
    id: String(feature.id || ''),
    name: name.trim().slice(0, 120),
    address: '',
    longitude: coordinate[0],
    latitude: coordinate[1]
  }
}
/** 僅回傳台灣範圍內的地點摘要，不信任第三方回傳的任意連結或 HTML。 */
export function photonPlaces(response: unknown): HospitalMapPlace[] {
  if (!response || !Array.isArray((response as any).features)) return []
  const places: HospitalMapPlace[] = [],
    seen = new Set<string>()
  for (const feature of (response as any).features) {
    if (!Array.isArray(feature?.geometry?.coordinates)) continue
    const [longitude, latitude] = feature.geometry.coordinates
    const p = feature?.properties || {}
    if (
      feature?.geometry?.type !== 'Point' ||
      !Number.isFinite(longitude) ||
      !Number.isFinite(latitude) ||
      longitude < 118 ||
      longitude > 124 ||
      latitude < 20 ||
      latitude > 27 ||
      (p.countrycode && String(p.countrycode).toUpperCase() !== 'TW')
    )
      continue
    const candidate = p.name || p.street
    const name = typeof candidate === 'string' ? candidate.trim().slice(0, 120) : ''
    if (!name) continue
    const address = [
      ...new Set(
        [p.state, p.city, p.district, p.street, p.housenumber]
          .filter((v) => typeof v === 'string' || typeof v === 'number')
          .map(String)
      )
    ]
      .join(' ')
      .slice(0, 240)
    const id = `${longitude}/${latitude}/${name}`
    if (seen.has(id)) continue
    if (
      places.some(
        (place) =>
          place.name === name &&
          (!place.address || !address || place.address === address) &&
          Math.hypot(
            (place.longitude - longitude) * 111320 * Math.cos((latitude * Math.PI) / 180),
            (place.latitude - latitude) * 110540
          ) < 60
      )
    )
      continue
    seen.add(id)
    places.push({ id, name, address, longitude, latitude })
    if (places.length === 6) break
  }
  return places
}
