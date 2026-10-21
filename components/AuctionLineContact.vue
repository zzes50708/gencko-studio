<script setup>
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
const props = defineProps({
  auctionId: { type: String, required: true },
  memberId: { type: String, required: true }
})
const emit = defineEmits(['verified'])
const supabase = useSupabaseClient()
const store = useMainStore()
const state = ref(null)
const challenge = ref(null)
const busy = ref(false)
const message = ref('')
const copyMessage = ref('')
const bindingText = computed(() => (challenge.value ? `競標綁定 ${challenge.value.code}` : ''))
async function copy() {
  const owner = revision
  const current = challenge.value
  if (!current || expireChallenge()) return
  try {
    await navigator.clipboard.writeText(bindingText.value)
    if (owner === revision && current === challenge.value)
      copyMessage.value = '已複製，請貼到 Gencko 官方 LINE 並傳送。'
  } catch {
    if (owner === revision && current === challenge.value)
      copyMessage.value = '無法自動複製，請選取下方完整訊息後複製。'
  }
}
let revision = 0
let checkRevision = 0
let timer
let mounted = false
let resuming = false
async function resume() {
  if (resuming || document.hidden || !navigator.onLine) return
  resuming = true
  try {
    await check()
  } finally {
    resuming = false
  }
}
function stop() {
  clearTimeout(timer)
}
function expireChallenge() {
  if (!challenge.value || Date.parse(challenge.value.expires_at) > store.auctionNow()) return false
  stop()
  challenge.value = null
  copyMessage.value = ''
  message.value = '綁定碼已過期，請重新建立。'
  return true
}
function openLine(event) {
  if (!challenge.value || expireChallenge()) event.preventDefault()
}
async function check() {
  const owner = revision
  const request = ++checkRevision
  try {
    const { data, error } = await supabase.rpc('get_auction_contact_status', {
      p_auction_id: props.auctionId
    })
    if (owner !== revision || request !== checkRevision) return
    if (error) throw error
    if (!data || ['required', 'ready', 'restricted'].some((key) => typeof data[key] !== 'boolean'))
      throw Error('LINE 狀態回應不完整')
    state.value = data
    emit(
      'verified',
      (data?.required === false || data?.ready === true) && data?.restricted !== true
    )
    message.value = ''
    if (data?.ready || data?.restricted) {
      stop()
      challenge.value = null
    }
  } catch {
    if (owner !== revision || request !== checkRevision) return
    state.value = null
    emit('verified', false)
    message.value = '暫時無法確認 LINE 聯絡狀態，請重新確認。'
  }
}
async function poll() {
  const owner = revision
  const current = challenge.value
  stop()
  if (!challenge.value) return
  if (expireChallenge()) return
  if (document.visibilityState === 'visible') await check()
  if (owner === revision && current === challenge.value && challenge.value)
    timer = setTimeout(
      poll,
      Math.max(0, Math.min(5000, Date.parse(challenge.value.expires_at) - store.auctionNow()))
    )
}
async function create() {
  if (busy.value || !state.value?.required || state.value?.ready || state.value?.restricted) return
  const request = revision
  busy.value = true
  message.value = ''
  copyMessage.value = ''
  try {
    const { data, error } = await supabase.rpc('create_auction_line_link')
    if (request !== revision) return
    if (error) throw error
    if (
      !/^[0-9a-f]{36}$/.test(data?.code) ||
      !Number.isFinite(Date.parse(data.expires_at)) ||
      Date.parse(data.expires_at) <= store.auctionNow()
    )
      throw Error()
    challenge.value = data
    void poll()
  } catch {
    if (request === revision) message.value = '暫時無法建立綁定碼，請稍後重試。'
  } finally {
    if (request === revision) busy.value = false
  }
}
watch(
  () => [props.memberId, props.auctionId],
  () => {
    revision++
    stop()
    state.value = null
    challenge.value = null
    busy.value = false
    message.value = ''
    copyMessage.value = ''
    emit('verified', false)
    if (mounted) void check()
  }
)
onMounted(() => {
  mounted = true
  void check()
  window.addEventListener('focus', resume)
  window.addEventListener('pageshow', resume)
  window.addEventListener('online', resume)
  document.addEventListener('visibilitychange', resume)
})
onBeforeUnmount(() => {
  mounted = false
  revision++
  stop()
  challenge.value = null
  window.removeEventListener('focus', resume)
  window.removeEventListener('pageshow', resume)
  window.removeEventListener('online', resume)
  document.removeEventListener('visibilitychange', resume)
})
</script>

<template>
  <section
    v-if="state?.required !== false || state?.restricted"
    class="line-contact"
    aria-label="官方 LINE 聯絡驗證"
  >
    <p v-if="state?.restricted">此帳號已被限制出價。請回覆官方 LINE 說明原因，由工作室審核解除。</p>
    <p v-else-if="state?.ready">
      ✓ 官方 LINE 聯絡已驗證
      <span v-if="state.display_name">：{{ state.display_name }}</span>
    </p>
    <p v-else-if="!state && !message" role="status">正在確認出價資格與官方 LINE 聯絡狀態…</p>
    <template v-else-if="state?.required">
      <p>
        首次出價前，請用目前登入的 LINE 向 Gencko 官方帳號傳送驗證碼。每個 LINE
        帳號只需驗證一次，之後不用重複傳送；棄標等出價限制仍適用。
      </p>
      <button
        v-if="!challenge"
        type="button"
        class="btn-app btn-app--secondary"
        :disabled="busy"
        @click="create"
      >
        {{ busy ? '建立中…' : '建立 LINE 聯絡' }}
      </button>
      <template v-else>
        <p>請將下方完整訊息傳送至 Gencko 官方 LINE（@219abdzn）。</p>
        <button type="button" class="btn-app btn-app--secondary" @click="copy">複製綁定訊息</button>
        <textarea readonly aria-label="LINE 綁定訊息" :value="bindingText" rows="2" />
        <p role="status">{{ copyMessage }}</p>
        <OfficialLineHandoff
          :message="bindingText"
          mobile-label="前往 LINE 傳送綁定訊息"
          @open="openLine"
        />
        <p>請在 LINE 按下傳送；綁定碼 15 分鐘內有效，請勿轉交他人。</p>
        <button type="button" class="btn-app btn-app--ghost" @click="check">
          我已傳送，重新確認
        </button>
      </template>
    </template>
    <p role="status">{{ message }}</p>
    <button v-if="message" type="button" class="btn-app btn-app--ghost" @click="check">
      重新確認 LINE 狀態
    </button>
  </section>
</template>

<style scoped>
.line-contact {
  border: 1px solid var(--border-color, #d8d4cf);
  padding: 12px;
  margin-block: 10px;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.line-contact p {
  margin: 0 0 8px;
}
.line-contact p:empty {
  margin: 0;
}
.line-contact .btn-app {
  min-height: 44px;
  white-space: normal;
}
.line-contact textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin-block: 8px;
  padding: 8px;
  font: inherit;
  resize: vertical;
  color: var(--txt);
  background: var(--bg, #fff);
  border: 1px solid var(--border-color, #d8d4cf);
}
</style>
