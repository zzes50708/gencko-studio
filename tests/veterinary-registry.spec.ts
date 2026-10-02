import { describe, expect, it } from 'vitest'
import {
  mapMoaRegistryRow,
  matchHospitalToRegistry,
  normalizePhone,
  normalizeRegistryText,
  parseMoaDate,
  type RegistryRow
} from '../supabase/functions/_shared/veterinary-registry'

const fetchedAt = '2026-09-15T00:00:00.000Z'

const registryRow = (overrides: Partial<RegistryRow> = {}): RegistryRow => ({
  license_no: '北市獸業字第001號',
  county: '臺北市',
  license_type: '獸醫師',
  official_status: '開業',
  institution_name: '示例動物醫院',
  responsible_vet: '王獸醫師',
  phone: '(02) 2345-6789',
  issued_on: '2024-01-02',
  address: '臺北市中正區示例路1號',
  source_dataset: '農業部獸醫師(佐)開業執照',
  source_url: 'https://data.moa.gov.tw/open_detail.aspx?id=078',
  source_fetched_at: fetchedAt,
  last_seen_at: fetchedAt,
  is_current: true,
  updated_at: fetchedAt,
  ...overrides
})

describe('農業部獸醫院資料正規化', () => {
  it('統一臺台、空白與標點', () => {
    expect(normalizeRegistryText('臺 北・動物醫院（分院）')).toBe('台北動物醫院分院')
    expect(normalizePhone('(02) 2345-6789')).toBe('0223456789')
  })

  it('解析有效日期並拒絕無效日期', () => {
    expect(parseMoaDate('2024/01/02')).toBe('2024-01-02')
    expect(parseMoaDate('20240231')).toBeNull()
  })

  it('轉換官方欄位並略過缺少識別資料的紀錄', () => {
    const mapped = mapMoaRegistryRow(
      {
        縣市: '臺北市',
        字號: '北市獸業字第001號',
        執照類別: '獸醫師',
        狀態: '開業',
        機構名稱: '示例動物醫院',
        負責獸醫: '王獸醫師',
        機構電話: '02-2345-6789',
        發照日期: '20240102',
        機構地址: '臺北市中正區示例路1號'
      },
      fetchedAt
    )
    expect(mapped?.issued_on).toBe('2024-01-02')
    expect(mapMoaRegistryRow({ 機構名稱: '缺資料' }, fetchedAt)).toBeNull()
  })
})

describe('特寵醫院與官方母表配對', () => {
  it('優先沿用已確認的開業證號', () => {
    const target = registryRow({ institution_name: '官方新名稱' })
    expect(
      matchHospitalToRegistry(
        {
          id: 'H001',
          name: '網站舊名稱',
          address: '不同地址',
          official_license_no: target.license_no
        },
        [target]
      )
    ).toMatchObject({ status: 'matched', method: 'license', record: target })
  })

  it('可用正規化名稱與地址找到唯一紀錄', () => {
    const target = registryRow()
    expect(
      matchHospitalToRegistry(
        {
          id: 'H001',
          name: '示例 動物醫院',
          address: '台北市中正區示例路1號',
          phone: '02-2345-6789'
        },
        [target]
      )
    ).toMatchObject({ status: 'matched', method: 'name', record: target })
  })

  it('同分候選不會自動選擇，避免誤配', () => {
    const first = registryRow({ license_no: 'A', address: '台北市甲路1號', phone: null })
    const second = registryRow({ license_no: 'B', address: '台北市乙路2號', phone: null })
    expect(
      matchHospitalToRegistry({ id: 'H001', name: '示例動物醫院', address: '無法比對' }, [
        first,
        second
      ])
    ).toEqual({ status: 'ambiguous', record: null, method: null })
  })

  it('沒有可信訊號時保留人工複核', () => {
    expect(
      matchHospitalToRegistry({ id: 'H001', name: '另一家醫院', address: '另一個地址' }, [
        registryRow()
      ]).status
    ).toBe('unmatched')
  })
})
