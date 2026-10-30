import { photonPlaces } from '~/utils/hospitalVectorMap'
import { hospitalSearchRequest, createHospitalSearchGate } from '~/utils/hospitalSearchPolicy'

const gate = createHospitalSearchGate()
const search = defineCachedFunction(
  async (q: string, city: string) => {
    try {
      const data = await $fetch('https://photon.komoot.io/api/', {
        query: {
          q: city && !q.includes(city) ? `${city} ${q}` : q,
          countrycode: 'TW',
          bbox: '118,20,124,27',
          limit: 12
        },
        timeout: 7000,
        retry: 0
      })
      if (!data || !Array.isArray((data as { features?: unknown }).features))
        throw new Error('Invalid geocoder response')
      return { places: photonPlaces(data) }
    } catch {
      throw createError({ statusCode: 503, statusMessage: 'Place search temporarily unavailable' })
    }
  },
  {
    maxAge: 3600,
    swr: false,
    name: 'hospital-place-search-v2',
    getKey: (q, city) => hospitalSearchRequest(q, city)!.key
  }
)

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = hospitalSearchRequest(query.q, query.city ?? '')
  if (!parsed) throw createError({ statusCode: 400, statusMessage: 'Invalid place query' })
  const retryAfter = gate(getRequestIP(event, { xForwardedFor: !!process.env.VERCEL }) || 'unknown')
  if (retryAfter) {
    setResponseHeader(event, 'Retry-After', retryAfter)
    throw createError({ statusCode: 429, statusMessage: 'Too many place searches' })
  }
  return search(parsed.q, parsed.city)
})
