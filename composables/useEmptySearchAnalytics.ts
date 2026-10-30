/** 僅記錄零結果狀態，不送出客人的實際搜尋內容。 */
export function useEmptySearchAnalytics(empty: () => boolean, surface: string) {
  const track = useAnalytics()
  let timer: ReturnType<typeof setTimeout> | undefined
  watch(empty, (value) => {
    clearTimeout(timer)
    if (value)
      timer = setTimeout(() => {
        if (empty()) track('search_no_results', { surface })
      }, 400)
  })
  onBeforeUnmount(() => clearTimeout(timer))
}
