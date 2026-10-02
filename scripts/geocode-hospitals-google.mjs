import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { validateGoogleGeocodingCandidate } from './lib/hospital-geocoding-validation.mjs'

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`缺少環境變數 ${name}`)
  return value
}

const writeEnabled = process.argv.includes('--write')
const limitArgument = process.argv.find((argument) => argument.startsWith('--limit='))
const limit = limitArgument ? Number(limitArgument.slice('--limit='.length)) : Infinity
if (!Number.isFinite(limit) && limit !== Infinity) throw new Error('--limit 必須是正整數')

const apiKey = required('GOOGLE_MAPS_GEOCODING_API_KEY')
const supabase = createClient(required('SUPABASE_URL'), required('SUPABASE_KEY'), {
  auth: { persistSession: false }
})
const { data: hospitals, error } = await supabase
  .from('hospitals')
  .select('id,name,address,city,district')
  .eq('status', 'active')
  .or('latitude.is.null,longitude.is.null')
  .order('id', { ascending: true })
  .limit(limit)
if (error) throw error

const geocode = async (hospital) => {
  const query = new URLSearchParams({
    address: hospital.address,
    components: 'country:TW',
    language: 'zh-TW',
    key: apiKey
  })
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${query}`)
  if (!response.ok) return { hospital, accepted: false, reason: `http_${response.status}` }
  const payload = await response.json()
  if (payload.status !== 'OK') return { hospital, accepted: false, reason: `google_${payload.status}` }
  const candidates = payload.results.map((result) => ({
    ...validateGoogleGeocodingCandidate(hospital, result),
    placeId: result.place_id || null,
    formattedAddress: result.formatted_address || null,
    types: result.types || []
  }))
  const accepted = candidates.find((candidate) => candidate.accepted)
  return { hospital, accepted: !!accepted, candidate: accepted || null, candidates }
}

const results = []
for (const hospital of hospitals) {
  results.push(await geocode(hospital))
  // 保持低請求頻率，避免批次作業因流量限制中斷。
  await new Promise((resolve) => setTimeout(resolve, 120))
}

const generatedAt = new Date().toISOString()
const folder = `output/hospital-geocoding-${generatedAt.slice(0, 10).replaceAll('-', '')}`
await mkdir(folder, { recursive: true })
const audit = {
  generatedAt,
  provider: 'Google Maps Geocoding API',
  mode: writeEnabled ? 'write' : 'dry-run',
  hospitalCount: hospitals.length,
  acceptedCount: results.filter((item) => item.accepted).length,
  rejectedCount: results.filter((item) => !item.accepted).length,
  results
}
await writeFile(`${folder}/google-geocoding-audit.json`, JSON.stringify(audit, null, 2))

let written = 0
if (writeEnabled) {
  for (const item of results.filter((result) => result.accepted)) {
    const { hospital, candidate } = item
    const { data, error: updateError } = await supabase
      .from('hospitals')
      .update({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        geocode_source: 'Google Maps Geocoding API',
        geocode_source_id: candidate.placeId,
        geocoded_at: generatedAt
      })
      .eq('id', hospital.id)
      .eq('address', hospital.address)
      .is('latitude', null)
      .is('longitude', null)
      .select('id,name,address,latitude,longitude,geocode_source,geocode_source_id,geocoded_at')
    if (updateError) throw updateError
    if (data.length !== 1) {
      throw new Error(`院所 #${hospital.id} 的資料已變更，已停止寫入以避免覆蓋。`)
    }
    written++
  }
}

console.log(`待定位 ${hospitals.length} 間；通過地址檢核 ${audit.acceptedCount} 間；退回人工審核 ${audit.rejectedCount} 間。`)
console.log(`審核檔：${folder}/google-geocoding-audit.json`)
console.log(writeEnabled ? `已安全寫入 ${written} 間。` : '目前為預演模式，未寫入 Supabase。加入 --write 才會寫入。')
