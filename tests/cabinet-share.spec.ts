import { describe, expect, it } from 'vitest'
import { cabinetShareLink, readCabinetShare } from '../utils/cabinet/share'
import { normalizeCabinet } from '../utils/cabinet/config'
import type { CabinetInput } from '../utils/cabinet/config'
describe('爬櫃配置分享', () => {
  it('還原可見選項，維持現有尺寸限制，不傳送額外欄位', () => {
    const input = normalizeCabinet({
      boxVariant: 'a6',
      rows: 7,
      columns: 3,
      finish: 'stone',
      ledLayers: 4,
      wheels: true,
      storageHeight: 30,
      counts: { thermometer: 3 },
      secret: 'PRIVATE'
    } as unknown as CabinetInput)
    const url = new URL(cabinetShareLink(input, 'https://www.genckobreeding.com'))
    expect(url.pathname).toBe('/merch')
    expect(url.search).toBe('')
    expect(url.href).not.toContain('PRIVATE')
    const { secret, ...expected } = input as CabinetInput & { secret: string }
    expect(secret).toBe('PRIVATE')
    expect(readCabinetShare(url.hash)).toEqual(expected)
  })
  it('拒絕損壞、過大、非公開盒款與未知版本，越界數字由既有規則修正', () => {
    for (const hash of [
      '#cabinet=broken',
      '#cabinet=null',
      '#cabinet=' + 'x'.repeat(5000),
      '#cabinet={"version":2}',
      '#cabinet={"version":1,"boxVariant":"tub-s"}'
    ])
      expect(readCabinetShare(hash)).toBeNull()
    const cfg = readCabinetShare(
      '#' +
        new URLSearchParams({
          cabinet: JSON.stringify({ version: 1, boxVariant: 'a4', rows: 999, columns: -1 })
        })
    )
    expect(cfg?.rows).toBe(8)
    expect(cfg?.columns).toBe(1)
  })
})
