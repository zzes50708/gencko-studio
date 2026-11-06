import { useMainStore } from '~/stores/useMainStore'
import { pageDataNeeds } from '~/utils/site-data-policy'

export default defineNuxtPlugin((app) => {
  const store = useMainStore()
  const router = useRouter()
  let active = true,
    reading = false
  let timer: ReturnType<typeof setInterval> | undefined
  const refresh = async (force = false) => {
    if (!active || reading || document.hidden || !navigator.onLine) return
    const needs = pageDataNeeds(router.currentRoute.value.path)
    if (!needs.inventory && !needs.articles) return
    reading = true
    try {
      const tasks = []
      if (needs.inventory)
        tasks.push(force ? store.loadDataFromAPI() : store.ensureInventoryLoaded())
      if (needs.articles) tasks.push(store.loadArticles({ force }))
      await Promise.allSettled(tasks)
    } finally {
      reading = false
    }
  }
  const resume = () => void refresh()
  const reconnect = () => void refresh(true)
  app.hook('app:mounted', () => {
    window.addEventListener('pageshow', resume)
    window.addEventListener('focus', resume)
    window.addEventListener('online', reconnect)
    document.addEventListener('visibilitychange', resume)
    timer = setInterval(resume, 30000)
  })
  app.vueApp.onUnmount(() => {
    active = false
    clearInterval(timer)
    window.removeEventListener('pageshow', resume)
    window.removeEventListener('focus', resume)
    window.removeEventListener('online', reconnect)
    document.removeEventListener('visibilitychange', resume)
  })
})
