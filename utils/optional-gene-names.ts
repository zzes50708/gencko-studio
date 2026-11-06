import { createRequestDeadline } from './request-deadline'

/** 內文連結是輔助功能，不能讓圖鑑名單的慢查詢擋住整篇文章。 */
export async function readOptionalGeneNames(client: any, milliseconds = 1000): Promise<string[]> {
  const request = createRequestDeadline(milliseconds)
  try {
    const result: any = await request.run((signal: AbortSignal) =>
      client.from('site_public_genetic_pages').select('name').abortSignal(signal)
    )
    if (result.error || !Array.isArray(result.data)) return []
    return result.data
      .map((row: any) => row.name)
      .filter((name: unknown) => typeof name === 'string' && name.trim())
  } catch {
    return []
  } finally {
    request.abort()
  }
}
