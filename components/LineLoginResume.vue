<script setup>
import { useMainStore } from '~/stores/useMainStore'
const store = useMainStore()
const code = ref('')
const message = ref('')
const busy = ref(false)
const reading = ref(false)
let revision = 0
let clipboardRequest = 0
const reset = () => {
  revision++
  clipboardRequest++
  code.value = ''
  message.value = ''
  busy.value = false
  reading.value = false
}
watch(() => [store.lineLoginNeedsTransfer, store.lineLoginTransferId], reset)
onBeforeUnmount(reset)
const inputChanged = () => {
  revision++
  message.value = ''
}
async function paste() {
  if (busy.value || reading.value) return
  const owner = revision,
    request = ++clipboardRequest
  reading.value = true
  try {
    const text = await navigator.clipboard.readText()
    if (owner !== revision || request !== clipboardRequest || !store.lineLoginNeedsTransfer) return
    code.value = text
    message.value = ''
    await complete()
  } catch {
    if (owner === revision) message.value = '請長按輸入欄，貼上剛才複製的登入接續碼。'
  } finally {
    if (request === clipboardRequest) reading.value = false
  }
}
async function complete() {
  if (busy.value) return
  busy.value = true
  const owner = revision
  message.value = ''
  try {
    const success = await store.completeLineLogin(code.value)
    if (owner !== revision) return
    if (!success)
      message.value = store.lineLoginError || '尚未完成，請確認接續碼是否正確或重新登入。'
  } catch {
    if (owner === revision) message.value = '接續碼不符，請貼上這次 LINE 登入頁提供的完整接續碼。'
  } finally {
    if (owner === revision) busy.value = false
  }
}
</script>
<template>
  <section
    v-if="store.lineLoginNeedsTransfer"
    class="line-login-resume"
    aria-label="接續 LINE 登入"
  >
    <div class="line-login-resume__content">
      <div class="line-login-resume__header">
        <strong>接續剛才的 LINE 登入</strong>
        <button
          type="button"
          class="btn-app btn-app--ghost"
          :disabled="busy"
          @click="store.cancelLineLogin"
        >
          取消本次登入
        </button>
      </div>
      <p>若 LINE 回到另一個瀏覽器，請在該頁複製「登入接續碼」，再貼到這裡。</p>
      <form @submit.prevent="complete">
        <input
          v-model="code"
          aria-label="登入接續碼"
          placeholder="貼上登入接續碼"
          autocomplete="off"
          autocapitalize="off"
          :spellcheck="false"
          :disabled="busy"
          @input="inputChanged"
        />
        <button
          type="button"
          class="btn-app btn-app--secondary"
          :disabled="busy || reading"
          @click="paste"
        >
          {{ reading ? '正在讀取…' : '貼上並登入' }}
        </button>
        <button class="btn-app btn-app--primary" type="submit" :disabled="busy || !code.trim()">
          {{ busy ? '正在登入…' : '完成登入' }}
        </button>
      </form>
      <p v-if="message" role="status">{{ message }}</p>
    </div>
  </section>
</template>
<style scoped>
.line-login-resume {
  position: fixed;
  left: 1rem;
  right: 1rem;
  bottom: calc(4.5rem + env(safe-area-inset-bottom));
  z-index: 10010;
  max-width: 48rem;
  margin: 0 auto;
  background: #f5f3ee;
  border: 1px solid #d7d1c7;
  box-shadow: 0 5px 24px #0002;
  color: #292520;
  padding: 1rem;
  max-height: calc(100dvh - 7rem);
  overflow-y: auto;
}
.line-login-resume__content {
  max-width: 48rem;
  margin: 0 auto;
}
.line-login-resume__header {
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  align-items: center;
}
.line-login-resume p {
  font-size: 0.875rem;
  line-height: 1.6;
  margin: 0.35rem 0 0.65rem;
}
.line-login-resume form {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.line-login-resume input {
  flex: 1 1 12rem;
  min-width: 0;
  min-height: 44px;
  border: 1px solid #b9b2a7;
  background: #fff;
  padding: 0.5rem 0.7rem;
  color: inherit;
  font-size: 1rem;
}
@media (min-width: 769px) {
  .line-login-resume {
    bottom: 1rem;
  }
}
.line-login-resume .btn-app {
  min-height: 44px;
  white-space: nowrap;
}
</style>
