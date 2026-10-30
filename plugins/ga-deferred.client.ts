import { nextTick } from 'vue'
import type { Router } from 'vue-router'
import { analyticsPage, analyticsEvent } from '~/utils/site-analytics'

/** 正式公開頁限定；先清理參數，再延遲送出。 */
export default defineNuxtPlugin((app) => {
  const router = app.$router as Router
  const { gaId, enableGa } = useRuntimeConfig().public
  const win = window as any
  const gate = (path: string) => {
    const current = analyticsPage(new URL(path, location.origin).href)
    win[`ga-disable-${gaId}`] = !enableGa || !current
    if (loaded && current) win.gtag('set', { ...current, page_referrer: '' })
  }
  const page = () => analyticsPage(location.href)
  let loaded = false,
    disposed = false,
    mounted = false,
    revision = 0,
    lastPath = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  gate(location.pathname)
  const queue: Array<{ name: string; parameters: Record<string, unknown> }> = []
  const send = (name: string, parameters: Record<string, unknown>) => {
    if (!enableGa || !gaId || disposed || !page()) return
    if (loaded) (window as any).gtag('event', name, parameters)
    else {
      queue.push({ name, parameters })
      if (queue.length > 30) queue.shift()
    }
  }
  const track = (name: string, input: Record<string, unknown> = {}) => {
    const event = analyticsEvent(name, input),
      current = page()
    if (event && current) send(event.name, { ...current, ...event.parameters, page_referrer: '' })
  }
  const load = () => {
    if (!mounted || loaded || disposed || !enableGa || !gaId || !page()) return
    loaded = true
    win.dataLayer ||= []
    win.gtag = function () {
      win.dataLayer.push(arguments)
    }
    win.gtag('js', new Date())
    win.gtag('config', gaId, {
      send_page_view: false,
      page_location: page()!.page_location,
      page_referrer: '',
      ignore_referrer: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    })
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(String(gaId))}`
    document.head.appendChild(script)
    queue.splice(0).forEach((event) => win.gtag('event', event.name, event.parameters))
  }
  const recordPage = async () => {
    const request = ++revision
    await nextTick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    if (disposed || request !== revision) return
    const current = page()
    if (!current) {
      lastPath = ''
      return
    }
    if (lastPath !== current.page_path) {
      lastPath = current.page_path
      send('page_view', { ...current, page_title: document.title, page_referrer: '' })
    }
    if (!loaded) {
      clearTimeout(timer)
      timer = setTimeout(load, 1500)
    }
  }
  const click = (event: Event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null
    const href = link?.getAttribute('href') || ''
    if (/^https:\/\/(?:line\.me|lin\.ee)\//.test(href)) track('inquiry_click')
    else if (/^\/[a-z/-]*$/.test(href)) track('navigation_click', { destination: href })
  }
  app.hook('app:mounted', () => {
    mounted = true
    void recordPage()
    document.addEventListener('click', click)
  })
  app.hook('page:finish', () => {
    if (mounted) void recordPage()
  })
  const remove = router.afterEach(() => {
    gate(location.pathname)
    revision++
    if (mounted) void recordPage()
  })
  const removeGate = router.beforeEach((to) => {
    // 導航尚未確認前先停用，避免取消導航後仍沿用目標頁的權限。
    win[`ga-disable-${gaId}`] = true
  })
  app.vueApp.onUnmount(() => {
    disposed = true
    clearTimeout(timer)
    remove()
    removeGate()
    document.removeEventListener('click', click)
    queue.length = 0
  })
  return { provide: { track } }
})
