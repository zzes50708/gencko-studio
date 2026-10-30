import { photonPlaces } from '~/utils/hospitalVectorMap'

export default defineCachedEventHandler(
  async (event) => {
    const raw = getQuery(event).q
    if (typeof raw !== 'string' || raw.trim().length < 2 || raw.length > 80)
      throw createError({ statusCode: 400, statusMessage: 'Invalid place query' })
    try {
      const data = await $fetch('https://photon.komoot.io/api/', {
        query: { q: raw.trim(), countrycode: 'TW', bbox: '118,20,124,27', limit: 12 },
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
  { maxAge: 3600, swr: false, getKey: (event) => JSON.stringify(getQuery(event).q ?? null) }
)
