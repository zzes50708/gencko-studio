export function parseHospitalFavorites(raw: string | null): string[] {
  try {
    const value: unknown = JSON.parse(raw || '[]')
    if (!Array.isArray(value)) return []
    return [
      ...new Set(
        value
          .filter((id) => typeof id === 'string' || (typeof id === 'number' && Number.isFinite(id)))
          .map((id) => String(id).trim())
          .filter(Boolean)
      )
    ]
  } catch {
    return []
  }
}
