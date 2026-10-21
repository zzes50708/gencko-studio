import { useMainStore } from '~/stores/useMainStore'
import { readOAuthFailure } from '~/utils/line-login'

export default defineNuxtPlugin((nuxtApp) => {
  const failure = readOAuthFailure(window.location.href)
  const store = useMainStore()
  let reading = false
  let disposed = false
  const resume = async () => {
    if (disposed || reading || document.hidden || !navigator.onLine) return
    reading = true
    try {
      await store.checkAuthStatus()
    } finally {
      reading = false
    }
  }
  nuxtApp.hook('app:mounted', async () => {
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    window.addEventListener('online', resume)
    document.addEventListener('visibilitychange', resume)
    if (failure) {
      const url = new URL(failure.url)
      await nuxtApp.$router.replace(url.pathname + url.search + url.hash)
      window.alert(failure.message)
    }
  })
  nuxtApp.vueApp.onUnmount(() => {
    disposed = true
    window.removeEventListener('pageshow', resume)
    window.removeEventListener('focus', resume)
    window.removeEventListener('online', resume)
    document.removeEventListener('visibilitychange', resume)
  })
})
