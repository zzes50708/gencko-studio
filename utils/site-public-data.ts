const publicTables: Record<string, string> = {
  animals: 'site_public_animals',
  articles: 'site_public_articles',
  genetic_pages: 'site_public_genetic_pages',
  merchandise: 'site_public_merchandise',
  config: 'site_public_config'
}

export function publicTable(table: string): string {
  if (!Object.hasOwn(publicTables, table)) throw new Error('沒有宣告的公開資料介面')
  return publicTables[table]
}

export const publicAnimalFields =
  'id, source, species, morph, genes, gender_type, gender_value, birthday, listing_price, status, note, image_url, is_hot, created_at, tags, photo_updated_at'

export function shouldRefreshCatalog(loadedAt: number, now: number, maxAge = 30000): boolean {
  return !loadedAt || now < loadedAt || now - loadedAt >= maxAge
}

/** 分批讀取且固定以不可變 ID 排序，避免預設列數上限讓個體無聲消失。 */
export async function readPublicAnimals(client: any) {
  const rows: any[] = []
  let cursor: string | null = null
  while (true) {
    let query = client
      .from(publicTable('animals'))
      .select(publicAnimalFields)
      .order('id')
      .limit(200)
    if (cursor !== null) query = query.gt('id', cursor)
    const { data, error } = await query
    if (error) return { data: null, error }
    if (!Array.isArray(data)) return { data: null, error: new Error('個體資料回應不完整') }
    rows.push(...data)
    if (data.length < 200) return { data: rows, error: null }
    const next = String(data.at(-1)?.id || '')
    if (!next || next === cursor) return { data: null, error: new Error('個體分頁游標未前進') }
    cursor = next
  }
}
