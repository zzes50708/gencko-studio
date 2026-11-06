import { BOXES, normalizeCabinet } from './config'
import type { CabinetInput } from './config'

const keys = [
  'boxVariant',
  'rows',
  'columns',
  'finish',
  'boxColor',
  'counts',
  'ledLayers',
  'ledColor',
  'ledEnabled',
  'ledRowEnabled',
  'heatingMat',
  'storageHeight',
  'storageStyle',
  'wheels',
  'lighting',
  'lightLevel'
] as const
function publicInput(input: CabinetInput) {
  const normalized = normalizeCabinet(input)
  return Object.fromEntries(keys.map((key) => [key, normalized[key]]))
}
export function cabinetShareLink(input: CabinetInput, origin: string) {
  const url = new URL('/merch', origin)
  url.hash = new URLSearchParams({
    cabinet: JSON.stringify({ version: 1, ...publicInput(input) })
  }).toString()
  return url.href
}
export function readCabinetShare(hash: string): CabinetInput | null {
  if (!hash || hash.length > 4096) return null
  try {
    const value = JSON.parse(new URLSearchParams(hash.replace(/^#/, '')).get('cabinet') || 'null')
    if (
      !value ||
      value.version !== 1 ||
      !Object.hasOwn(BOXES, value.boxVariant) ||
      value.boxVariant.startsWith('tub-')
    )
      return null
    // 僅取配置白名單；標題、HTML、網址及其他欄位不進入元件狀態。
    const picked = Object.fromEntries(
      keys.map((key) => [key, value[key]])
    ) as unknown as CabinetInput
    return normalizeCabinet(picked)
  } catch {
    return null
  }
}
