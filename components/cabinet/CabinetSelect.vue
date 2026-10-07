<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMediaQuery, useWindowSize } from '@vueuse/core'
defineOptions({ inheritAttrs: false })
const props = defineProps<{
  value?: string | number
  modelValue?: string | number
  disabled?: boolean
}>()
const emit = defineEmits<{ change: [event: Event]; 'update:modelValue': [value: string] }>()
const mobile = useMediaQuery('(max-width: 767px), (pointer: coarse), (hover: none)')
const native = ref<HTMLSelectElement | null>(null)
const opened = ref(false)
const popup = useNativeModal(() => opened.value)
const attrs = useAttrs()
const current = computed(() => String(props.modelValue ?? props.value ?? ''))
const title = computed(() => String(attrs['aria-label'] || '選擇選項'))
const label = computed(
  () =>
    Array.from(native.value?.options || []).find((option) => option.value === current.value)
      ?.text || current.value
)
const options = ref<{ value: string; label: string; disabled: boolean }[]>([])
const numeric = computed(() =>
  options.value.every((option) => /^\d+(\s*(個|層|cm))?$/.test(option.label))
)
const { width: viewportWidth, height: viewportHeight } = useWindowSize()
const numericColumns = computed(() => {
  const base = options.value.length > 24 ? 6 : 3
  // 高度不足時增加欄數，保留完整選項與可觸控的高度。
  const availableRows = Math.max(1, Math.floor((viewportHeight.value - 116) / 39))
  const maxColumns = Math.max(base, Math.floor((viewportWidth.value - 48) / 44))
  return Math.min(maxColumns, Math.max(base, Math.ceil(options.value.length / availableRows)))
})
const pickerRows = computed(() => Math.ceil(options.value.length / numericColumns.value))
function open() {
  if (props.disabled || !native.value) return
  options.value = Array.from(native.value.options, (option) => ({
    value: option.value,
    label: option.text,
    disabled: option.disabled
  }))
  opened.value = true
}
function changed(event: Event) {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
  emit('change', event)
}
function choose(value: string) {
  if (!native.value) return
  native.value.value = value
  native.value.dispatchEvent(new Event('change', { bubbles: true }))
  opened.value = false
}
function keepPickerFocus(event: KeyboardEvent) {
  if (event.key !== 'Tab' || !popup.value) return
  const buttons = Array.from(
    popup.value.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
  )
  const first = buttons[0]
  const last = buttons.at(-1)
  if (!first || !last) return
  // 避免原生選單循環時將焦點移到瀏覽器工具列。
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}
watch(mobile, () => {
  opened.value = false
})
</script>

<template>
  <select
    ref="native"
    v-bind="$attrs"
    :value="current"
    :disabled="disabled"
    :style="mobile ? { display: 'none' } : undefined"
    @change="changed"
  >
    <slot />
  </select>
  <button
    v-if="mobile"
    type="button"
    class="cabinet-select-trigger"
    :disabled="disabled"
    :aria-label="title"
    aria-haspopup="dialog"
    :aria-expanded="opened"
    @click.stop="open"
  >
    {{ label }}
    <span aria-hidden="true">⌄</span>
  </button>
  <Teleport to="body">
    <dialog
      ref="popup"
      class="cabinet-picker"
      :aria-label="title"
      @keydown="keepPickerFocus"
      @cancel.prevent="opened = false"
      @click="$event.target === $event.currentTarget && (opened = false)"
    >
      <section v-if="opened" class="cabinet-picker-panel">
        <header>
          <strong>{{ title }}</strong>
          <button type="button" aria-label="關閉選單" @click="opened = false">×</button>
        </header>
        <div
          class="cabinet-picker-list"
          :class="{ 'is-numeric': numeric }"
          :style="{ '--picker-columns': numericColumns, '--picker-rows': pickerRows }"
          data-lenis-prevent
        >
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            :disabled="option.disabled"
            :aria-pressed="current === option.value"
            @click="choose(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </section>
    </dialog>
  </Teleport>
</template>

<style scoped>
.cabinet-select-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 2px 6px;
  font-size: 12px;
  line-height: 1.25;
  text-align: left;
  color: inherit;
  background: #f5f3ee;
  border: 1px solid #c5c0b5;
  border-radius: 3px;
}
.cabinet-select-trigger:disabled {
  opacity: 0.5;
}
.cabinet-picker {
  position: fixed;
  inset: 0;
  width: 100%;
  max-width: none;
  height: 100dvh;
  max-height: none;
  margin: 0;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px));
  border: 0;
  background: transparent;
  color: #29251f;
  box-sizing: border-box;
}
.cabinet-picker[open] {
  display: flex;
  align-items: flex-end;
}
.cabinet-picker::backdrop {
  background: #0008;
}
.cabinet-picker-panel {
  width: 100%;
  max-width: 900px;
  margin-inline: auto;
  padding: 12px;
  background: #faf9f6;
  border-radius: 12px;
}
.cabinet-picker header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.cabinet-picker header button {
  width: 44px;
  height: 44px;
  border: 0;
  background: none;
  font-size: 24px;
}
.cabinet-picker-list {
  display: grid;
  max-height: none;
  overflow: visible;
  overscroll-behavior: contain;
  touch-action: pan-y;
  gap: 4px;
}
.cabinet-picker-list button {
  min-height: 34px;
  padding: 6px;
  font-size: 12px;
  text-align: left;
  border: 1px solid #d4cec5;
  background: white;
  border-radius: 4px;
}
.cabinet-picker-list button[aria-pressed='true'] {
  background: #efe3d5;
  border-color: #9c5c3b;
}
.cabinet-picker header {
  font-size: 13px;
}
.cabinet-picker-list.is-numeric {
  grid-template-columns: repeat(var(--picker-columns), minmax(0, 1fr));
  gap: 3px;
}
.cabinet-picker-list.is-numeric button {
  text-align: center;
  min-height: 0;
  height: clamp(36px, calc((100svh - 116px) / var(--picker-rows) - 3px), 40px);
  padding: 2px;
  font-size: 11px;
}
select {
  width: 100%;
  min-height: 44px;
  padding: 0.35rem 0.45rem;
  border: 1px solid #c5c0b5;
  border-radius: 3px;
  background: #f5f3ee;
  color: inherit;
}
</style>
