<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getLineMessageLink } from '~/utils/animal-inquiry'
import { isAuctionOutcome } from '~/utils/auction-outcomes'
import { useMainStore } from '~/stores/useMainStore'
const props = defineProps({
  auctionId: { type: String, required: true },
  memberId: { type: String, required: true },
  initialOutcome: { type: Object, default: null },
  disabled: { type: Boolean, default: false }
})
const supabase = useSupabaseClient()
const store = useMainStore()
const outcome = ref(props.initialOutcome)
const text = ref('')
const message = ref('')
const busy = ref(false)
const loading = ref(false)
const canClaim = computed(
  () => outcome.value && !['cancelled', 'no_bids'].includes(outcome.value.state)
)
let revision = 0
let loadRevision = 0
let expiryTimer
let expiresAt = 0
function clearClaim() {
  clearTimeout(expiryTimer)
  expiresAt = 0
  text.value = ''
}
function checkClaimExpiry() {
  clearTimeout(expiryTimer)
  if (!text.value || !expiresAt) return
  const remaining = expiresAt - store.auctionNow()
  if (remaining <= 0) {
    clearClaim()
    message.value = '領標驗證碼已過期，請重新產生訊息後傳送。'
  } else expiryTimer = setTimeout(checkClaimExpiry, Math.min(remaining, 2147483647))
}
const lineLink = computed(() => getLineMessageLink('https://line.me/R/ti/p/@219abdzn', text.value))
const deadline = computed(() =>
  outcome.value?.payment_due_at
    ? new Date(outcome.value.payment_due_at).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour12: false
      })
    : '待工作室確認'
)
async function load() {
  const owner = revision
  const request = ++loadRevision
  loading.value = true
  outcome.value = null
  clearClaim()
  message.value = ''
  try {
    const { data, error } = await supabase.rpc('my_auction_outcome', {
      p_auction_id: props.auctionId
    })
    if (owner !== revision || request !== loadRevision) return
    if (error) throw error
    if (data !== null && !isAuctionOutcome(data, props.auctionId)) throw Error('得標回應不完整')
    outcome.value = data
  } catch {
    if (owner === revision && request === loadRevision)
      message.value = '暫時無法確認得標結果，請重試。'
  } finally {
    if (owner === revision && request === loadRevision) loading.value = false
  }
}
async function copyClaim() {
  if (props.disabled || busy.value || loading.value || !canClaim.value) return
  const request = revision
  busy.value = true
  message.value = ''
  try {
    const { data, error } = await supabase.rpc('create_auction_winner_claim', {
      p_auction_id: props.auctionId
    })
    if (request !== revision) return
    if (
      error ||
      typeof data?.message !== 'string' ||
      !data.message.trim() ||
      typeof data.expires_at !== 'string' ||
      !Number.isFinite(Date.parse(data.expires_at)) ||
      Date.parse(data.expires_at) <= store.auctionNow() ||
      data.amount !== outcome.value?.amount
    )
      throw Error('領標回應不完整或已過期')
    text.value = data.message
    expiresAt = Date.parse(data.expires_at)
    checkClaimExpiry()
    try {
      await navigator.clipboard.writeText(text.value)
      if (request === revision && text.value === data.message)
        message.value = '已複製，請貼到官方 LINE 並傳送，完成領標。'
    } catch {
      if (request === revision && text.value === data.message)
        message.value = '請選取下方完整訊息複製，貼到官方 LINE 並傳送。'
    }
  } catch {
    if (request === revision) {
      clearClaim()
      message.value = '未能產生領標訊息，請確認使用出價時的帳號登入，再重新確認結果。'
    }
  } finally {
    if (request === revision) busy.value = false
  }
}
watch(
  () => props.initialOutcome,
  (value) => {
    // 更新結算結果時，同時撤下舊訊息並讓先前的非同步請求失效。
    revision++
    outcome.value = value
    clearClaim()
    message.value = ''
    busy.value = false
    loading.value = false
    if (!value) void load()
  }
)
watch(
  () => [props.auctionId, props.memberId],
  () => {
    revision++
    outcome.value = props.initialOutcome
    clearClaim()
    message.value = ''
    busy.value = false
    loading.value = false
    if (!props.initialOutcome) void load()
  }
)
onMounted(() => {
  document.addEventListener('visibilitychange', checkClaimExpiry)
  window.addEventListener('online', checkClaimExpiry)
  if (!props.initialOutcome) void load()
})
onBeforeUnmount(() => {
  revision++
  clearClaim()
  document.removeEventListener('visibilitychange', checkClaimExpiry)
  window.removeEventListener('online', checkClaimExpiry)
  outcome.value = null
})
</script>
<template>
  <section class="winner-claim" aria-label="得標領標">
    <template v-if="outcome">
      <h3>本場得標確認</h3>
      <template v-if="canClaim">
        <p>成交金額 NT$ {{ outcome.amount?.toLocaleString('zh-TW') }}</p>
        <p v-if="outcome.state === 'paid'">
          工作室已確認付款，請勿重複付款。可透過官方 LINE 確認交付。
        </p>
        <p v-else-if="outcome.state === 'abandoned'">
          本場已標記棄標，請先聯絡工作室確認處理方式。
        </p>
        <p v-else>付款期限 {{ deadline }}</p>
        <p>複製訊息後，請自行貼到 Gencko 官方 LINE（@219abdzn）領標；收到款項後由工作室核帳。</p>
        <p v-if="outcome.claimed_at">已收到 LINE 領標訊息。</p>
      </template>
      <p v-else-if="outcome.state === 'cancelled'">本場已取消，不需付款；如有疑問請聯絡工作室。</p>
      <p v-else>本場無得標紀錄，不需付款。</p>
      <button
        v-if="canClaim"
        type="button"
        class="btn-app btn-app--primary"
        :disabled="props.disabled || busy || loading"
        @click="copyClaim"
      >
        {{ busy ? '產生中…' : '複製得標確認訊息' }}
      </button>
      <template v-if="text">
        <textarea aria-label="得標確認訊息" readonly :value="text" rows="6" />
        <p>驗證碼 15 分鐘內有效，請完整傳送、不要轉交他人；過期可重新產生。</p>
        <a
          class="btn-app btn-app--secondary"
          :href="lineLink"
          target="_blank"
          rel="noopener noreferrer"
        >
          手機開啟 LINE 領標
        </a>
        <p>電腦版請自行開啟 LINE，貼上訊息傳送；複製本身不代表已領標或已付款。</p>
      </template>
    </template>
    <p v-else-if="loading">正在確認本帳號的得標結果…</p>
    <p v-else>此帳號沒有可領標紀錄，或結果仍在確認中；請使用出價時的帳號登入。</p>
    <p role="status">{{ message }}</p>
    <button
      type="button"
      class="btn-app btn-app--ghost"
      :disabled="props.disabled || loading || busy"
      @click="load"
    >
      重新確認得標結果
    </button>
  </section>
</template>
<style scoped>
.winner-claim {
  padding: 14px;
  border: 1px solid var(--border-color, #d8d4cf);
  margin-block: 12px;
  overflow-wrap: anywhere;
}
.winner-claim p {
  margin-block: 8px;
  line-height: 1.6;
}
.winner-claim .btn-app {
  min-height: 44px;
  white-space: normal;
  margin: 4px 4px 4px 0;
}
.winner-claim textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: 10px;
  font: inherit;
  line-height: 1.5;
  resize: vertical;
  color: var(--txt);
  background: var(--bg, #fff);
  border: 1px solid var(--border-color, #ddd);
  margin-top: 10px;
}
</style>
