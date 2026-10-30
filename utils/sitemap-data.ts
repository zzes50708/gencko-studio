/** 呼叫端固定排序後分頁，避免網站地圖被 Data API 預設筆數上限截斷。 */
export async function readSitemapRows<T>(
  readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
) {
  const rows: T[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await readPage(from, from + 499)
    if (error) return { data: null, error }
    if (!Array.isArray(data)) return { data: null, error: new Error('網站地圖資料回應不完整') }
    rows.push(...data)
    if (data.length < 500) return { data: rows, error: null }
  }
}
