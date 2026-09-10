/**
 * Supabase 查詢的重試包裝。
 * - 暫時性錯誤（network error / 5xx / 429）：指數退避重試
 * - 不可恢復的客戶端錯誤（4xx）：直接回傳，不重試
 * - 全部失敗：丟回最後一次錯誤，呼叫端可決定 fallback
 *
 * 用法：
 *   const { data, error } = await withRetry(() => supabase.from('animals').select('*'))
 */

export interface QueryResult<T = unknown> {
  data: T | null
  error: unknown
  status?: number
  statusText?: string
}

export interface RetryOptions {
  retries?: number
  baseDelay?: number
  label?: string
}

export async function withRetry<T = unknown>(
  queryFn: () => Promise<QueryResult<T>>,
  opts: RetryOptions = {}
): Promise<QueryResult<T>> {
  const retries = opts.retries ?? 2
  const baseDelay = opts.baseDelay ?? 400
  const label = opts.label || 'supabase'

  let lastErr: unknown = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await queryFn()
      const err = res?.error
      if (!err) return res

      // 不可恢復的 4xx 不重試；408、409、429 仍可能是暫時性狀態
      const e = err as { status?: number }
      const status = Number(res?.status || e.status || 0)
      if (status >= 400 && status < 500 && ![408, 409, 429].includes(status)) {
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
          (lastErr as { message?: string })?.message || lastErr
        )
      await new Promise((r) => setTimeout(r, delay))
    }
  }

  return { data: null, error: lastErr }
}
