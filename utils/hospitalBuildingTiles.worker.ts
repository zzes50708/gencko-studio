import { decodeBuildingTile } from './hospitalVectorTileDecode'
self.onmessage = (event) => {
  const { id, buffer, tile } = event.data
  try {
    self.postMessage({ id, data: decodeBuildingTile(buffer, tile) })
  } catch {
    self.postMessage({ id, error: '建築圖磚解析失敗' })
  }
}
