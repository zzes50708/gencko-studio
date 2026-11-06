import { sanitizeMonitoringEvent } from '~/utils/site-monitoring'
import { createMonitoringDelivery } from '~/utils/monitoring-delivery'

export default defineNuxtPlugin((app) => {
  if (import.meta.dev) return
  let budget = 20
  const seen = new Map<string, number>()
  let disposed = false
  const initialRoute = location.pathname
  const sampled = Math.random() < 0.2
  const delivery = createMonitoringDelivery(
    async (events) => {
      const controller = new AbortController()
      const deadline = setTimeout(() => controller.abort(), 8000)
      try {
        const response = await fetch('/api/telemetry', {
          method: 'POST',
          body: JSON.stringify({ events }),
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
          signal: controller.signal
        })
        return response.ok
      } finally {
        clearTimeout(deadline)
      }
    },
    () => navigator.onLine
  )
  const flush = () =>
    delivery.beacon(
      (events) =>
        !!navigator.sendBeacon?.(
          '/api/telemetry',
          new Blob([JSON.stringify({ events })], { type: 'application/json' })
        )
    )
  const onOnline = () => {
    void delivery.flush()
  }
  const record = (
    type: string,
    category = 'unknown',
    value?: number,
    route = location.pathname
  ) => {
    const event = sanitizeMonitoringEvent({ type, category, value, route })
    if (disposed || !event || budget <= 0) return
    const key = `${event.type}:${event.route}:${event.category || ''}`
    if (Date.now() - (seen.get(key) || 0) < 10000) return
    seen.set(key, Date.now())
    --budget
    delivery.push(event)
  }
  const classify = (error: unknown) => {
    const name = error instanceof Error ? error.name : ''
    const message = error instanceof Error ? error.message : ''
    if (/ChunkLoad|dynamically imported module|Loading chunk/i.test(name + message)) return 'chunk'
    return /network|fetch/i.test(name + message) ? 'network' : 'render'
  }
  const removeVue = app.hook('vue:error', (error) => record('vue_error', classify(error)))
  const onError = (event: Event) => {
    if (event.target instanceof HTMLImageElement) record('resource_error', 'image')
    else if (event.target instanceof HTMLScriptElement) record('resource_error', 'script')
    else record('script_error', classify((event as ErrorEvent).error))
  }
  const onRejection = (event: PromiseRejectionEvent) =>
    record('unhandled_rejection', classify(event.reason))
  const onHidden = () => {
    if (document.hidden) flush()
  }
  const onPageHide = () => flush()
  // 標準 CWV 是整份文件的量測，不將跨頁累計值誤標成目前頁面。
  // 另記錄每次 SPA 換頁的載入時間，供逐頁定位問題。
  let routeStarted = 0
  const removeStart = app.hook('page:start', () => {
    routeStarted = performance.now()
  })
  const removeFinish = app.hook('page:finish', () => {
    if (sampled && routeStarted) record('route_render', 'unknown', performance.now() - routeStarted)
    routeStarted = 0
  })
  app.hook('app:mounted', async () => {
    window.addEventListener('error', onError, true)
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onHidden)
    if (!sampled || !('PerformanceObserver' in window)) return
    try {
      const { onLCP, onCLS, onINP } = await import('web-vitals')
      if (disposed) return
      const measured = (metric: { name: string; value: number }) => {
        record(metric.name, 'unknown', metric.value, initialRoute)
        if (document.hidden) flush()
      }
      onLCP(measured)
      onCLS(measured)
      onINP(measured)
    } catch {
      /* 量測載入失敗不影響網站操作。 */
    }
  })
  app.vueApp.onUnmount(() => {
    flush()
    disposed = true
    delivery.dispose()
    removeVue()
    removeStart()
    removeFinish()
    window.removeEventListener('error', onError, true)
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('pagehide', onPageHide)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onHidden)
  })
})
