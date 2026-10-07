import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

/** 同網址的彈窗歷史：返回先關閉，手動關閉消耗自己的歷史項目。 */
export function useHistoryModal(key: string, canOpen: () => boolean = () => true) {
  const route = useRoute()
  const path = route.path
  const isOpen = ref(false)
  const dialog = useNativeModal(() => isOpen.value)
  let ownsEntry = false
  const open = (fromHistory = false) => {
    if (!import.meta.client || route.path !== path || isOpen.value || !canOpen()) return
    if (!fromHistory)
      window.history.pushState({ ...window.history.state, genckoShopModal: key }, '')
    ownsEntry = true
    isOpen.value = true
  }
  const close = async ({ consumeHistory = true } = {}) => {
    isOpen.value = false
    if (consumeHistory && ownsEntry && window.history.state?.genckoShopModal === key) {
      const popped = new Promise<void>((resolve) =>
        window.addEventListener('popstate', () => resolve(), { once: true })
      )
      window.history.back()
      await popped
    }
    ownsEntry = false
  }
  const onPopState = (event: PopStateEvent) => {
    if (event.state?.genckoShopModal === key && route.path === path) open(true)
    else if (isOpen.value) close({ consumeHistory: false })
  }
  watch(
    () => route.path,
    () => {
      if (isOpen.value) close({ consumeHistory: false })
    }
  )
  onMounted(() => window.addEventListener('popstate', onPopState))
  onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
  return { isOpen, dialog, open, close }
}
