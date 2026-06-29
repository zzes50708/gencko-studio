/**
 * Supabase 查詢的重試包裝。
 * - 暫時性錯誤（network error / 5xx / 429）：指數退避重試
 * - 客戶端錯誤（4xx）：直接拋，不重試（重試也沒用）
 * - 全部失敗：丟回最後一次錯誤，呼叫端可決定 fallback
 *
 * 用法：
 *   const { data, error } = await withRetry(() => supabase.from('animals').select('*'))
 *
 * @param {() => Promise<{data: any, error: any}>} queryFn 包好的 supabase 查詢
 * @param {{retries?: number, baseDelay?: number, label?: string}} opts
 */
export async function withRetry(queryFn, opts = {}) {
  const retries = opts.retries ?? 2
  const baseDelay = opts.baseDelay ?? 400
  const label = opts.label || 'supabase'

  let lastErr = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await queryFn()
      const err = res?.error
      if (!err) return res

      // 4xx → 不重試
      const code = Number(err.code || err.status || 0)
      if (code >= 400 && code < 500 && code !== 429) {
        return res
      }

      lastErr = err
    } catch (e) {
      lastErr = e
    }

    if (attempt < retries) {
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 100
      if (import.meta.dev)
        console.warn(
          `[${label}] retry ${attempt + 1}/${retries} after ${Math.round(delay)}ms`,
          lastErr?.message || lastErr
        )
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  return { data: null, error: lastErr }
}
