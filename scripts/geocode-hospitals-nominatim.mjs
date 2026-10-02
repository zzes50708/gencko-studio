import 'dotenv/config'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'
import { validateAddressCandidate } from './lib/hospital-geocoding-validation.mjs'

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`缺少環境變數 ${name}`)
  return value
}

const writeEnabled = process.argv.includes('--write')
const limitArgument = process.argv.find((argument) => argument.startsWith('--limit='))
const limit = limitArgument ? Number(limitArgument.slice('--limit='.length)) : Infinity
if (!Number.isInteger(limit) || limit <= 0) {
  if (limit !== Infinity) throw new Error('--limit 必須是正整數')
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const today = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const folder = `output/hospital-geocoding-${today}`
const cachePath = `${folder}/nominatim-cache.json`
await mkdir(folder, { recursive: true })

let cache = {}
try {
  cache = JSON.parse(await readFile(cachePath, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

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

const lookup = async (hospital) => {
  const cacheKey = `${hospital.id}|${hospital.address}`
  if (cache[cacheKey]) return cache[cacheKey]

  const query = new URLSearchParams({
    q: hospital.address,
    countrycodes: 'tw',
    format: 'jsonv2',
    addressdetails: '1',
    limit: '3'
  })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
    headers: {
      // 公開服務要求具識別性的 User-Agent，且本腳本只在本機單執行緒使用。
      'user-agent': 'GenckoStudioHospitalCoordinateAudit/1.0 (+https://www.genckobreeding.com)'
    }
  })
  if (!response.ok) {
    const failed = { error: `http_${response.status}` }
    cache[cacheKey] = failed
    await writeFile(cachePath, JSON.stringify(cache, null, 2))
    return failed
  }
  const payload = await response.json()
  cache[cacheKey] = { payload }
  await writeFile(cachePath, JSON.stringify(cache, null, 2))
  return cache[cacheKey]
}

const results = []
for (const hospital of hospitals) {
  const lookupResult = await lookup(hospital)
  if (lookupResult.error) {
    results.push({ hospital, accepted: false, reason: lookupResult.error })
  } else {
    const candidates = lookupResult.payload.map((result) => {
      const validated = validateAddressCandidate(hospital, {
        formatted_address: result.display_name,
        address_components: Object.entries(result.address || {}).map(([type, value]) => ({
          long_name: value,
          short_name: type
        })),
        geometry: { location: { lat: result.lat, lng: result.lon } },
        place_id: `${result.osm_type}/${result.osm_id}`
      })
      return {
        ...validated,
        osmUrl: `https://www.openstreetmap.org/${result.osm_type}/${result.osm_id}`,
        displayName: result.display_name,
        type: result.type
      }
    })
    const accepted = candidates.find((candidate) => candidate.accepted)
    results.push({ hospital, accepted: !!accepted, candidate: accepted || null, candidates })
  }
  // Nominatim 公開服務規範上限為每秒一筆；快取命中也保持同一節奏，避免重跑形成尖峰。
  await pause(1100)
}

const generatedAt = new Date().toISOString()
const audit = {
  generatedAt,
  provider: 'OpenStreetMap Nominatim',
  license: 'ODbL 1.0',
  policy: 'https://operations.osmfoundation.org/policies/nominatim/',
  mode: writeEnabled ? 'write' : 'dry-run',
  hospitalCount: hospitals.length,
  acceptedCount: results.filter((item) => item.accepted).length,
  rejectedCount: results.filter((item) => !item.accepted).length,
  results
}
await writeFile(`${folder}/nominatim-geocoding-audit.json`, JSON.stringify(audit, null, 2))

let written = 0
if (writeEnabled) {
  for (const item of results.filter((result) => result.accepted)) {
    const { hospital, candidate } = item
    const { data, error: updateError } = await supabase
      .from('hospitals')
      .update({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        geocode_source: 'OpenStreetMap Nominatim (ODbL)',
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
console.log(`審核檔：${folder}/nominatim-geocoding-audit.json`)
console.log(writeEnabled ? `已安全寫入 ${written} 間。` : '目前為預演模式，未寫入 Supabase。加入 --write 才會寫入。')
