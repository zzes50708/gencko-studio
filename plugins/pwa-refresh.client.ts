export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return
  let lastCheck = 0
  let checking = false
  const check = async () => {
    if (checking || document.hidden || !navigator.onLine || Date.now() - lastCheck < 30000) return
    checking = true
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (!registration) return
      lastCheck = Date.now()
      await registration.update()
    } catch {
      // 暫時離線不影響現有操作，下次返回或恢復連線時再查。
    } finally {
      checking = false
    }
  }
  nuxtApp.hook('app:mounted', () => {
    void navigator.serviceWorker.ready.then(check).catch(() => {})
    window.addEventListener('pageshow', check)
    window.addEventListener('online', check)
    document.addEventListener('visibilitychange', check)
  })
  nuxtApp.vueApp.onUnmount(() => {
    window.removeEventListener('pageshow', check)
    window.removeEventListener('online', check)
    document.removeEventListener('visibilitychange', check)
  })
})
