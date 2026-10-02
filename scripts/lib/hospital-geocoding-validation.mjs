export const normalizeAddress = (value = '') =>
  String(value)
    .normalize('NFKC')
    .replaceAll('臺', '台')
    .replaceAll('之', '')
    .replaceAll('號', '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()

const valueFromComponents = (components = []) =>
  components.flatMap((component) => [component.long_name, component.short_name]).filter(Boolean).join(' ')

export function validateAddressCandidate(hospital, result) {
  if (!result || result.partial_match) return { accepted: false, reason: 'partial_match' }
  const latitude = Number(result.geometry?.location?.lat)
  const longitude = Number(result.geometry?.location?.lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { accepted: false, reason: 'invalid_coordinate' }
  }

  const resolvedAddress = normalizeAddress(`${result.formatted_address || ''} ${valueFromComponents(result.address_components)}`)
  const city = normalizeAddress(hospital.city)
  const district = normalizeAddress(hospital.district)
  if (!resolvedAddress.includes(city)) return { accepted: false, reason: 'city_mismatch' }
  if (!resolvedAddress.includes(district)) return { accepted: false, reason: 'district_mismatch' }

  const localAddress = normalizeAddress(hospital.address)
    .replace(city, '')
    .replace(district, '')
  if (localAddress.length < 4 || !resolvedAddress.includes(localAddress)) {
    return { accepted: false, reason: 'street_or_number_mismatch' }
  }

  return {
    accepted: true,
    latitude,
    longitude,
    placeId: result.place_id || null,
    formattedAddress: result.formatted_address || null
  }
}

// 保留 Google 腳本既有匯入名稱，避免兩種來源的檢核規則分歧。
export const validateGoogleGeocodingCandidate = validateAddressCandidate
