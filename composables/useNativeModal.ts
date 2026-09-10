import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

let openCount = 0
let savedOverflow = ''

/** 原生 dialog 負責焦點限制與還原；此處同步開關及背景捲動。 */
export function useNativeModal(isOpen: () => boolean) {
  const dialog = ref<HTMLDialogElement | null>(null)
  let locked = false
  let trigger: HTMLElement | null = null
  const unlock = () => {
    if (!locked) return
    locked = false
    openCount -= 1
    if (openCount === 0) document.body.style.overflow = savedOverflow
  }
  watch(isOpen, async (open) => {
    if (!import.meta.client) return
    if (!open) {
      dialog.value?.close()
      unlock()
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
      trigger = null
      return
    }
    await nextTick()
    if (!isOpen() || !dialog.value?.isConnected) return
    if (!dialog.value.open) {
      trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.value.showModal()
    }
    if (!locked) {
      if (openCount === 0) savedOverflow = document.body.style.overflow
      openCount += 1
      locked = true
      document.body.style.overflow = 'hidden'
    }
  }, { immediate: true })
  onBeforeUnmount(() => {
    dialog.value?.close()
    unlock()
  })
  return dialog
}
