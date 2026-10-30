import { mkdir, writeFile } from 'node:fs/promises'
import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'

// 只讀取公開樣式與三個城市的抽樣圖資，不進行院所資料更新。
const json = async url => {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`圖資請求失敗：${response.status}`)
  return response.json()
}
const style = await json('https://tiles.openfreemap.org/styles/liberty')
const spriteUrl = typeof style.sprite === 'string' ? style.sprite : style.sprite?.[0]?.url
if (!spriteUrl) throw new Error('上游圖示集格式已變更')
const sprite = await json(`${spriteUrl}.json`)
const source = Object.values(style.sources).find(source => source.type === 'vector' && source.url)
if (!source) throw new Error('上游向量來源已變更')
const metadata = await json(source.url)
const aliases = { motorcycle_parking: 'parking', cycle_barrier: 'circle_stroked', bollard: 'circle_stroked' }
const missing = new Set(), classes = new Set()
for (const [longitude, latitude] of [[121.513, 25.063], [120.673, 24.147], [120.302, 22.627]]) {
  const z = Math.min(14, metadata.maxzoom ?? 14), scale = 2 ** z
  const x = Math.floor((longitude + 180) / 360 * scale)
  const y = Math.floor((1 - Math.asinh(Math.tan(latitude * Math.PI / 180)) / Math.PI) / 2 * scale)
  const url = metadata.tiles[0].replace('{z}', z).replace('{x}', x).replace('{y}', y)
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!response.ok) throw new Error(`抽樣圖資失敗：${response.status}`)
  const tile = new VectorTile(new PbfReader(new Uint8Array(await response.arrayBuffer())))
  const poi = tile.layers.poi
  for (let i = 0; poi && i < poi.length; i++) {
    const p = poi.feature(i).properties
    const icon = ['florist', 'furniture'].includes(p.subclass) ? p.subclass : p.class
    if (typeof icon !== 'string') continue
    classes.add(icon)
    if (!sprite[aliases[icon] || icon]) missing.add(icon)
  }
}
const expectedLayers = ['building-3d', 'highway-name-major', 'highway-shield-non-us']
const missingLayers = expectedLayers.filter(id => !style.layers.some(layer => layer.id === id))
const result = { checkedAt: new Date().toISOString(), sampleCities: ['台北', '台中', '高雄'], classes: classes.size, missingUpstreamIcons: [...missing], unresolvedIcons: sprite.circle_stroked ? [] : [...missing], missingLayers, requiredFallbacksPresent: ['parking', 'circle_stroked'].every(id => !!sprite[id]) }
await mkdir('output', { recursive: true })
await writeFile('output/hospital-map-assets-audit.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify(result))
if (result.unresolvedIcons.length || missingLayers.length || !result.requiredFallbacksPresent) process.exitCode = 1
