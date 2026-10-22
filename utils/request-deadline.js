/** 等待上限涵蓋 SDK 取得憑證及網路請求；取消不代表伺服器尚未完成寫入。 */
export function createRequestDeadline(milliseconds = 10000) {
  const controller = new AbortController()
  const aborted = () => new Error('REQUEST_ABORTED')
  const timer = setTimeout(() => controller.abort(), milliseconds)
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
    async run(work) {
      let onAbort
      try {
        if (controller.signal.aborted) throw aborted()
        const cancelled = new Promise((_, reject) => {
          onAbort = () => reject(aborted())
          controller.signal.addEventListener('abort', onAbort, { once: true })
        })
        return await Promise.race([
          Promise.resolve().then(() => {
            if (controller.signal.aborted) throw aborted()
            return work(controller.signal)
          }),
          cancelled
        ])
      } finally {
        clearTimeout(timer)
        if (onAbort) controller.signal.removeEventListener('abort', onAbort)
      }
    }
  }
}
