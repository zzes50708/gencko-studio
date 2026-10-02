import { describe, expect, it } from 'vitest'
import { validateGoogleGeocodingCandidate } from '../scripts/lib/hospital-geocoding-validation.mjs'

const hospital = {
  city: '台北市',
  district: '中山區',
  address: '台北市中山區八德路二段229之2號'
}

const candidate = {
  formatted_address: '104台灣台北市中山區八德路二段229號之2',
  place_id: 'example-place',
  geometry: { location: { lat: 25.0468265, lng: 121.5403755 } },
  address_components: []
}

describe('Google 批次定位地址檢核', () => {
  it('僅接受同城市、同區域與同門牌的完整結果', () => {
    expect(validateGoogleGeocodingCandidate(hospital, candidate)).toMatchObject({
      accepted: true,
      latitude: 25.0468265,
      longitude: 121.5403755
    })
  })

  it('拒絕部分比對及跨區或錯誤門牌，保留人工審核', () => {
    expect(
      validateGoogleGeocodingCandidate(hospital, { ...candidate, partial_match: true })
    ).toEqual({
      accepted: false,
      reason: 'partial_match'
    })
    expect(
      validateGoogleGeocodingCandidate(hospital, {
        ...candidate,
        formatted_address: '104台灣台北市中山區八德路二段231號'
      })
    ).toEqual({ accepted: false, reason: 'street_or_number_mismatch' })
    expect(
      validateGoogleGeocodingCandidate(hospital, {
        ...candidate,
        formatted_address: '100台灣台北市中正區八德路一段1號'
      })
    ).toEqual({ accepted: false, reason: 'district_mismatch' })
  })
})
