// 會員收藏與醫院頁共用資料及快取，避免兩份名單不一致。
export function useHospitalDirectoryData() {
  const supabase = useSupabaseClient()
  return useAsyncData('hospitals-v1', async () => {
    try {
      const { data, error } = await supabase
        .from('hospitals')
        .select(
          'id, name, address, city, district, phone, map_url, region, hours, has_emergency, accept_species, verified_at, latitude, longitude, geocode_source, geocode_source_id'
        )
        .eq('status', 'active')
        .order('id', { ascending: true })
      if (error) throw error
      if (!data) throw new Error('醫院資料暫時無法載入')
      return data.map((h) => ({
        id: String(h.id),
        name: h.name,
        address: h.address,
        city: String(h.city || '')
          .replaceAll('臺', '台')
          .trim(),
        district: h.district,
        phone: h.phone,
        mapUrl: h.map_url || null,
        region: h.region,
        hours: h.hours,
        hasEmergency: h.has_emergency,
        acceptSpecies: h.accept_species || [],
        verifiedAt: h.verified_at,
        latitude: h.latitude == null ? null : Number(h.latitude),
        longitude: h.longitude == null ? null : Number(h.longitude),
        geocodeSource: h.geocode_source || null,
        geocodeSourceId: h.geocode_source_id || null
      }))
    } catch (e) {
      console.error('[hospitals SSR] fetch failed:', e?.message)
      throw new Error('醫院資料暫時無法載入')
    }
  })
}
