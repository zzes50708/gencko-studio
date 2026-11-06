/** 有上限的記憶體佇列；失敗不先刪除資料，也不把瀏覽紀錄留在裝置。 */
export function createMonitoringDelivery(
  send: (events: Record<string, string | number>[]) => Promise<boolean>,
  online: () => boolean,
  schedule: (callback: () => void, delay: number) => ReturnType<typeof setTimeout> = setTimeout,
  cancel: (timer: ReturnType<typeof setTimeout>) => void = clearTimeout
) {
  const queue: { event: Record<string, string | number>; attempts: number }[] = []
  let timer: ReturnType<typeof setTimeout> | undefined
  let running = false
  let disposed = false
  const arm = (delay: number) => {
    if (disposed) return
    if (timer) cancel(timer)
    timer = schedule(() => {
      timer = undefined
      void flush()
    }, delay)
  }
  async function flush() {
    if (disposed || running || !online() || !queue.length) return
    running = true
    const batch = queue.slice(0, 10)
    let ok = false
    try {
      ok = await send(batch.map((row) => row.event))
    } catch {
      /* 稍後重送。 */
    }
    if (disposed) return
    for (const row of batch) {
      row.attempts++
      if (ok || row.attempts >= 3) {
        const index = queue.indexOf(row)
        if (index >= 0) queue.splice(index, 1)
      }
    }
    running = false
    if (queue.length) arm(ok ? 2500 : 5000 * batch[0].attempts)
  }
  return {
    push(event: Record<string, string | number>) {
      if (disposed || queue.length >= 20) return
      queue.push({ event, attempts: 0 })
      arm(2500)
    },
    flush,
    beacon(sendBeacon: (events: Record<string, string | number>[]) => boolean) {
      // 傳送中保留原請求；避免切到背景時同批重複送出。
      if (disposed || running || !online() || !queue.length) return
      const batch = queue.slice(0, 10)
      if (sendBeacon(batch.map((row) => row.event))) queue.splice(0, batch.length)
      else void flush()
    },
    dispose() {
      disposed = true
      if (timer) cancel(timer)
      queue.length = 0
    }
  }
}
