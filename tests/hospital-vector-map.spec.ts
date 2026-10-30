import { describe, it, expect } from 'vitest'
import {
  hospitalVectorStyle,
  hospitalFeatures,
  hospitalGeographicBounds,
  hospitalMapFeaturePlace,
  hospitalPlaceSearchResults,
  photonPlaces
} from '../utils/hospitalVectorMap'
import liberty from './fixtures/openfreemap-liberty.json'

describe('地點搜尋API回應邊界', () => {
  const valid = {
    id: 'point',
    name: '台北101',
    address: '台北市',
    longitude: 121.565,
    latitude: 25.034
  }
  it('接受合法結果與真正的零筆結果', () => {
    expect(hospitalPlaceSearchResults({ places: [valid] })).toEqual([valid])
    expect(hospitalPlaceSearchResults({ places: [] })).toEqual([])
  })
  it('區分錯誤格式與零筆結果', () => {
    for (const response of [null, {}, { places: null }, { places: 'error' }, { places: [null] }])
      expect(hospitalPlaceSearchResults(response)).toBeNull()
  })
  it('拒絕無效或台灣範圍外的座標', () => {
    for (const longitude of ['121.565', NaN, Infinity, 0, 180])
      expect(hospitalPlaceSearchResults({ places: [{ ...valid, longitude }] })).toBeNull()
  })
  it('拒絕空名稱、過長欄位及過量結果', () => {
    for (const row of [
      { ...valid, id: '' },
      { ...valid, name: ' ' },
      { ...valid, name: 'a'.repeat(121) },
      { ...valid, address: 'a'.repeat(241) }
    ])
      expect(hospitalPlaceSearchResults({ places: [row] })).toBeNull()
    expect(hospitalPlaceSearchResults({ places: Array(7).fill(valid) })).toBeNull()
  })
  it('只保留已確認的欄位且不修改原回應', () => {
    const response = { places: [{ ...valid, name: ' 台北101 ', mapUrl: 'https://invalid.test/' }] }
    expect(hospitalPlaceSearchResults(response)).toEqual([valid])
    expect(response.places[0]?.name).toBe(' 台北101 ')
  })
})

const hospitals = [
  { id: 1, name: '測試醫院', city: '台北市', latitude: 25.03, longitude: 121.56 },
  { id: 2, city: '新北市', latitude: null, longitude: null }
]
describe('統一向量地圖', () => {
  it('建築使用底圖相同來源及真實高度欄位', () => {
    const result = hospitalVectorStyle(liberty as any)
    const layer = result.layers.find((l) => l.id === 'building-3d') as any
    expect(layer.source).toBe('openmaptiles')
    expect(layer.minzoom).toBe(14)
    expect(JSON.stringify(layer.paint)).toContain('render_height')
  })
  it('不改寫下載的原始樣式', () => {
    const before = JSON.stringify(liberty)
    hospitalVectorStyle(liberty as any)
    expect(JSON.stringify(liberty)).toBe(before)
  })
  it('中文路名與地標優先且保留道路編號', () => {
    const result = hospitalVectorStyle(liberty as any)
    expect(JSON.stringify(result.layers.find((l) => l.id === 'highway-name-major'))).toContain(
      'name:zh-Hant'
    )
    for (const layer of liberty.layers.filter((l) => /shield/.test(l.id)))
      expect(result.layers.find((l) => l.id === layer.id)).toEqual(layer)
  })
  it('缺少精確座標時不放上虛構點位', () =>
    expect(hospitalFeatures(hospitals, []).features).toHaveLength(1))
  it('收藏與選取支援數字與字串 ID', () =>
    expect(hospitalFeatures(hospitals, ['1'], '1').features[0]?.properties).toMatchObject({
      saved: true,
      selected: true
    }))
  it('只有有效點位參與取景', () =>
    expect(hospitalGeographicBounds(hospitals)).toEqual([
      [121.56, 25.03],
      [121.56, 25.03]
    ]))
  it('空集合不產生無限座標', () => expect(hospitalGeographicBounds([])).toBeNull())
})
const feature = (
  coordinates = [121.56, 25.03],
  properties = { name: '台北101', countrycode: 'TW' }
) => ({ geometry: { type: 'Point', coordinates }, properties })
describe('開放地標搜尋資料', () => {
  it('同名近距離但門牌不同的分店不可合併', () =>
    expect(
      photonPlaces({
        features: [
          feature([121.56, 25.03], {
            name: '同名分店',
            countrycode: 'TW',
            street: '測試路',
            housenumber: '1'
          } as any),
          feature([121.56001, 25.03001], {
            name: '同名分店',
            countrycode: 'TW',
            street: '測試路',
            housenumber: '2'
          } as any)
        ]
      })
    ).toHaveLength(2))
  it('同名但不同地點不合併', () =>
    expect(photonPlaces({ features: [feature(), feature([121.57, 25.03])] })).toHaveLength(2))
  it('只接受台灣點位', () =>
    expect(
      photonPlaces({
        features: [
          feature(),
          feature([1, 2]),
          feature([121.56, 25.03], { name: '外國', countrycode: 'JP' })
        ]
      })
    ).toHaveLength(1))
  it('忽略格式錯誤與非有限座標', () =>
    expect(
      photonPlaces({
        features: [null, feature([NaN, 25]), { geometry: { type: 'Polygon', coordinates: [] } }]
      })
    ).toEqual([]))
  it('不重複同一地標', () =>
    expect(photonPlaces({ features: [feature(), feature()] })).toHaveLength(1))
  it('相同名稱且相距數公尺的地標合併，避免搜尋結果被重複站點占滿', () =>
    expect(photonPlaces({ features: [feature(), feature([121.56001, 25.03001])] })).toHaveLength(1))
  it('最多顯示六筆', () =>
    expect(
      photonPlaces({
        features: Array.from({ length: 10 }, (_, i) => feature([121.56 + i / 100, 25.03]))
      })
    ).toHaveLength(6))
  it('未知回應安全回傳空清單', () => {
    expect(photonPlaces(null)).toEqual([])
    expect(photonPlaces({})).toEqual([])
  })
})

describe('圖上地標座標', () => {
  it('點選支援底圖已顯示的 name_en 備援名稱', () => {
    expect(
      hospitalMapFeaturePlace(
        {
          properties: { name_en: 'Taipei Landmark' },
          geometry: { type: 'Point', coordinates: [121.56, 25.03] }
        },
        [121, 25]
      )?.name
    ).toBe('Taipei Landmark')
  })
  it('地標的英文備援名稱不蓋掉既有中文名稱', () => {
    expect(
      hospitalMapFeaturePlace(
        {
          properties: { 'name:zh-Hant': '台北地標', name_en: 'Taipei Landmark' },
          geometry: { type: 'Point', coordinates: [121.56, 25.03] }
        },
        [121, 25]
      )?.name
    ).toBe('台北地標')
  })
  it('點選標籤時採用真實點位而非滑鼠位置', () =>
    expect(
      hospitalMapFeaturePlace(
        { properties: { name: '地標' }, geometry: { type: 'Point', coordinates: [121.56, 25.03] } },
        [121.58, 25.06]
      )
    ).toMatchObject({ longitude: 121.56, latitude: 25.03 }))
  it('支援只有繁體中文名稱的地標', () =>
    expect(
      hospitalMapFeaturePlace(
        {
          properties: { 'name:zh-Hant': '繁體地標' },
          geometry: { type: 'Point', coordinates: [121.56, 25.03] }
        },
        [0, 0]
      )?.name
    ).toBe('繁體地標'))
  it('道路採點擊座標並排除無效圖徵座標', () => {
    expect(
      hospitalMapFeaturePlace(
        { properties: { name: '道路' }, geometry: { type: 'LineString' } },
        [121.56, 25.03]
      )?.longitude
    ).toBe(121.56)
    expect(
      hospitalMapFeaturePlace(
        { properties: { name: '錯誤' }, geometry: { type: 'Point', coordinates: [NaN, 1000] } },
        [121, 25]
      )
    ).toBeNull()
  })
})
