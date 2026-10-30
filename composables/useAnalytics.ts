/** 追蹤只接受白名單資料，失敗不能影響交易。 */
export function useAnalytics() {
  const app = useNuxtApp()
  return (name: string, parameters: Record<string, unknown> = {}) => {
    try {
      if (import.meta.client) app.$track?.(name, parameters)
    } catch {
      /* 分析服務不可影響交易或登入。 */
    }
  }
}
