<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { restoreAdminIntent, matchesAdminReceipt } from '~/utils/auction-admin'
const props = defineProps({ auctionId: { type: String, required: true } })
const supabase = useSupabaseClient()
const store = useMainStore()
const pending = ref(null)
const storageKey = () => `auction-admin-pending:${store.currentUser?.id}:${props.auctionId}`
function savePending(value) {
  try {
    if (value) sessionStorage.setItem(storageKey(), JSON.stringify(value))
    else sessionStorage.removeItem(storageKey())
  } catch {
    /* 儲存受限仍可在目前頁面重試原請求。 */
  }
}
function restorePending() {
  try {
    const raw = sessionStorage.getItem(storageKey())
    pending.value = restoreAdminIntent(raw, props.auctionId)
    if (raw && !pending.value) savePending(null)
    if (pending.value) reason.value = pending.value.p_reason
  } catch {
    pending.value = null
  }
}
const data = ref(null)
const reason = ref('')
const busy = ref(false)
const loading = ref(false)
const message = ref('')
const confirmingAbandon = ref(false)
let revision = 0
let loadRevision = 0
const outcome = computed(() => data.value?.outcome)
const thisAuctionRestricted = computed(
  () => outcome.value?.auction_restricted ?? outcome.value?.restricted
)
const mayAct = computed(
  () =>
    !busy.value &&
    !loading.value &&
    !pending.value &&
    [...reason.value.trim()].length >= 2 &&
    [...reason.value].length <= 500
)
const labels = {
  no_bids: '無人出價',
  pending_contact: '等待 LINE 聯絡驗證',
  awaiting_notice: '等待得標通知',
  awaiting_payment: '等待付款',
  payment_review: '等待人工核帳',
  paid: '已確認付款',
  abandoned: '已棄標',
  cancelled: '已取消'
}
const time = (v) =>
  v ? new Date(v).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '尚未開始'
async function load(quiet = false) {
  quiet = quiet === true
  const owner = revision
  const request = ++loadRevision
  loading.value = true
  message.value = ''
  if (!quiet) data.value = null
  try {
    const { data: result, error } = await supabase.rpc('admin_auction_workflow', {
      p_auction_id: props.auctionId
    })
    if (owner !== revision || request !== loadRevision) return false
    if (error) throw error
    if (
      !result ||
      typeof result.enabled !== 'boolean' ||
      !Object.hasOwn(result, 'outcome') ||
      (result.outcome !== null &&
        (typeof result.outcome !== 'object' ||
          Array.isArray(result.outcome) ||
          typeof result.outcome.state !== 'string'))
    )
      throw Error('管理資料回應不完整')
    data.value = result
    return true
  } catch {
    if (owner === revision && request === loadRevision) {
      data.value = null
      message.value = '無法讀取管理資料，請確認管理權限後重試。'
    }
    return false
  } finally {
    if (owner === revision && request === loadRevision) loading.value = false
  }
}
function refreshIfIdle() {
  if (busy.value || loading.value || pending.value || confirmingAbandon.value) return
  return load(true)
}
defineExpose({ refreshIfIdle })
async function act(action) {
  if (busy.value || loading.value || (!pending.value && !mayAct.value)) return
  if (pending.value && pending.value.p_action !== action) return
  if (!pending.value) {
    pending.value = {
      p_request_id: crypto.randomUUID(),
      p_auction_id: props.auctionId,
      p_action: action,
      p_reason: reason.value.trim()
    }
    savePending(pending.value)
  }
  const intent = pending.value
  const request = revision
  busy.value = true
  message.value = ''
  try {
    const { data: receipt, error } = await supabase.rpc('admin_auction_action_once', intent)
    if (request !== revision) return
    if (error) throw error
    if (!matchesAdminReceipt(receipt, intent)) throw Error('管理操作回執不完整')
    savePending(null)
    pending.value = null
    reason.value = ''
    confirmingAbandon.value = false
    const refreshed = await load()
    if (request !== revision) return
    message.value = refreshed
      ? '操作完成，已重新查核狀態。'
      : '操作已送出，但未能重新確認最新狀態。請重新載入得標狀態，不要重複操作。'
  } catch (error) {
    if (request === revision) {
      data.value = null
      const rejected =
        error?.code === '22023' &&
        [
          '此狀態不能執行所選操作',
          '此場次尚未結算',
          '請填寫操作原因（2 至 500 字）',
          '此得標紀錄不能標記棄標'
        ].includes(error.message)
      if (rejected) {
        savePending(null)
        pending.value = null
      }
      message.value = rejected
        ? `操作未成立：${error.message}。請重新載入狀態。`
        : '操作結果尚未確認，請重試同一筆管理操作；不要重新建立不同操作。'
    }
  } finally {
    if (request === revision) busy.value = false
  }
}
watch(
  () => props.auctionId,
  () => {
    revision++
    data.value = null
    reason.value = ''
    confirmingAbandon.value = false
    busy.value = false
    pending.value = null
    restorePending()
    void load()
  }
)
onMounted(() => {
  restorePending()
  void load()
})
onBeforeUnmount(() => {
  revision++
  data.value = null
})
</script>
<template>
  <section class="workflow-admin" aria-label="得標付款與出價限制管理">
    <h3>得標與付款管理</h3>
    <p role="status">{{ message }}</p>
    <div v-if="pending" role="status">
      <p>有一筆管理操作待確認。重試會使用原請求，不會重複延期或核帳。</p>
      <button
        type="button"
        class="btn-app btn-app--secondary"
        :disabled="busy || loading"
        @click="act(pending.p_action)"
      >
        重試同一筆管理操作
      </button>
    </div>
    <button type="button" class="btn-app btn-app--ghost" :disabled="loading || busy" @click="load">
      重新載入得標狀態
    </button>
    <p v-if="loading">讀取中…</p>
    <p v-else-if="data && !data.enabled">此場次尚未納入自動得標與付款流程。</p>
    <p v-else-if="data && !outcome">尚未結算，截止後才會建立得標紀錄。</p>
    <template v-if="outcome">
      <p>
        {{ labels[outcome.state] || '待確認' }}
        <template v-if="outcome.amount != null">
          · NT$ {{ outcome.amount.toLocaleString('zh-TW') }}
        </template>
      </p>
      <p>網站出價限制：{{ outcome.restricted ? '有' : '無' }}</p>
      <p v-if="outcome.state === 'abandoned'">
        本場限制：{{ thisAuctionRestricted ? '尚未解除' : '已解除' }}
      </p>
      <p v-if="outcome.restricted && !thisAuctionRestricted" class="restriction-help">
        本場已無限制；會員仍有其他場次的限制或付款逾期紀錄，請逐場確認。
      </p>
      <p v-if="outcome.restricted" class="restriction-help">
        此會員有棄標或付款逾期紀錄。解除本場後，若其他場次仍有限制，仍無法出價。
      </p>
      <p>
        領標：{{
          outcome.claimed_at
            ? `已由官方 LINE 驗證（${time(outcome.claimed_at)}）`
            : '尚未收到驗證領標訊息'
        }}
      </p>
      <p v-if="outcome.notification_status === 'manual'">
        由得標者自行複製訊息至官方 LINE 領標，結標後 24 小時內付款。
      </p>
      <p>付款期限：{{ time(outcome.payment_due_at) }}</p>
      <p v-if="outcome.notification_error">通知錯誤：{{ outcome.notification_error }}</p>
      <label>
        管理操作原因
        <input
          v-model="reason"
          :disabled="busy || !!pending"
          aria-label="管理操作原因"
          type="text"
          maxlength="500"
          placeholder="請填寫原因（至少 2 字）"
        />
      </label>
      <div class="actions">
        <template
          v-if="['awaiting_payment', 'payment_review', 'abandoned'].includes(outcome.state)"
        >
          <button
            type="button"
            class="btn-app btn-app--primary"
            :disabled="!mayAct"
            @click="act('paid')"
          >
            確認收款，完成核帳
          </button>
          <button
            v-if="outcome.state !== 'abandoned'"
            type="button"
            class="btn-app btn-app--secondary"
            :disabled="!mayAct"
            @click="act('extend')"
          >
            付款期限延後 24 小時
          </button>
        </template>
        <button
          v-if="thisAuctionRestricted && outcome.state === 'abandoned'"
          type="button"
          class="btn-app btn-app--secondary"
          :disabled="!mayAct"
          @click="act('unblock')"
        >
          解除網站出價限制
        </button>
        <p v-if="thisAuctionRestricted && outcome.state === 'abandoned'" class="restriction-help">
          此操作只解除本場限制，不代表已收到款項。收到款項請使用「確認收款，完成核帳」。
        </p>
        <button
          v-if="
            ['pending_contact', 'awaiting_notice', 'awaiting_payment', 'payment_review'].includes(
              outcome.state
            )
          "
          type="button"
          class="btn-app btn-app--ghost"
          :disabled="!mayAct"
          @click="confirmingAbandon = true"
        >
          標記棄標
        </button>
      </div>
      <div v-if="confirmingAbandon">
        <p>這會禁止該會員及已綁定 LINE 身分的網站出價，不會封鎖 LINE。</p>
        <button
          type="button"
          class="btn-app btn-app--secondary"
          :disabled="!mayAct"
          @click="act('abandon')"
        >
          確認棄標並限制出價
        </button>
        <button type="button" class="btn-app btn-app--ghost" @click="confirmingAbandon = false">
          取消
        </button>
      </div>
    </template>
    <details v-if="data?.events?.length">
      <summary>操作紀錄</summary>
      <p v-for="(event, index) in data.events" :key="index">
        {{ time(event.created_at) }} · {{ event.event }} {{ event.note }}
      </p>
    </details>
  </section>
</template>
<style scoped>
.workflow-admin {
  margin-block: 16px;
  padding: 16px;
  border: 1px solid var(--border-color, #ddd);
  overflow-wrap: anywhere;
}
.restriction-help {
  color: var(--txt-muted, #777);
  font-size: 0.85rem;
  line-height: 1.6;
}
.workflow-admin p {
  line-height: 1.6;
  margin-block: 8px;
}
.workflow-admin input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  font: inherit;
  margin-block: 8px;
  color: var(--txt);
  background: var(--bg, #fff);
  border: 1px solid var(--border-color, #ddd);
  padding: 8px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.workflow-admin .btn-app {
  min-height: 44px;
  white-space: normal;
}
</style>
