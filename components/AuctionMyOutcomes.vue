<script setup>
import { ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { isAuctionOutcome } from '~/utils/auction-outcomes'
import { createRequestDeadline } from '~/utils/request-deadline'
const props = defineProps({ memberId: { type: String, required: true } })
const supabase = useSupabaseClient()
const rows = ref([])
const message = ref('')
const loading = ref(false)
const busy = ref(false)
const needsRefresh = ref(false)
const abandoning = ref('')
let revision = 0
let loadRevision = 0
let mounted = false
let refreshTimer
let readRequest, actionRequest
function resumeRefresh() {
  if (!document.hidden && navigator.onLine && !loading.value && !busy.value && !abandoning.value)
    void load(true)
}
const labels = {
  pending_contact: '等待建立 LINE 聯絡',
  awaiting_notice: '等待得標通知',
  awaiting_payment: '等待付款',
  payment_review: '已回報付款，等待核帳',
  paid: '已確認付款',
  abandoned: '已棄標',
  cancelled: '已取消'
}
const time = (value) =>
  value
    ? new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })
    : '尚未開始'
async function load(quiet = false) {
  quiet = quiet === true
  const owner = revision
  const request = ++loadRevision
  readRequest?.abort()
  const scope = (readRequest = createRequestDeadline())
  loading.value = true
  message.value = ''
  try {
    const { data, error } = await scope.run((signal) =>
      supabase.rpc('my_auction_outcomes').abortSignal(signal)
    )
    if (owner !== revision || request !== loadRevision) return false
    if (error) throw error
    if (!Array.isArray(data) || data.some((row) => !isAuctionOutcome(row)))
      throw Error('得標紀錄回應不完整')
    // 背景查詢內容未變時沿用原物件，避免清除客人剛複製的領標訊息。
    const previous = new Map(rows.value.map((row) => [row.auction_id, row]))
    rows.value = data.map((row) => {
      const old = previous.get(row.auction_id)
      return quiet && old && JSON.stringify(old) === JSON.stringify(row) ? old : row
    })
    needsRefresh.value = false
    return true
  } catch {
    if (owner === revision && request === loadRevision) {
      rows.value = []
      message.value = '得標紀錄暫時無法載入，請重試。'
    }
    return false
  } finally {
    if (owner === revision && request === loadRevision) loading.value = false
  }
}
async function act(id, action) {
  if (busy.value || loading.value || needsRefresh.value) return
  const request = revision
  busy.value = true
  message.value = ''
  const scope = (actionRequest = createRequestDeadline(15000))
  try {
    const { error } = await scope.run((signal) =>
      supabase.rpc(action, { p_auction_id: id }).abortSignal(signal)
    )
    if (request !== revision) return
    if (error) throw error
    abandoning.value = ''
    const successMessage =
      action === 'report_auction_payment'
        ? '已送出付款回報，等待工作室核帳。'
        : '已確認棄標，網站出價功能將被限制，LINE 聯絡不受影響。'
    const refreshed = await load()
    if (request !== revision) return
    message.value = refreshed
      ? successMessage
      : '操作已送出，但未能重新確認最新紀錄。請重新載入，不要重複操作。'
  } catch {
    if (request === revision) {
      needsRefresh.value = true
      message.value =
        action === 'report_auction_payment'
          ? '未能確認操作結果，請重新載入紀錄；勿重複付款。'
          : '未能確認棄標結果，請重新載入紀錄後再操作。'
    }
  } finally {
    if (request === revision) busy.value = false
  }
}
watch(
  () => props.memberId,
  () => {
    revision++
    readRequest?.abort()
    actionRequest?.abort()
    rows.value = []
    message.value = ''
    abandoning.value = ''
    busy.value = false
    needsRefresh.value = false
    if (mounted) void load()
  }
)
onMounted(() => {
  mounted = true
  void load()
  refreshTimer = setInterval(resumeRefresh, 15000)
  document.addEventListener('visibilitychange', resumeRefresh)
  window.addEventListener('online', resumeRefresh)
  window.addEventListener('focus', resumeRefresh)
  window.addEventListener('pageshow', resumeRefresh)
})
onBeforeUnmount(() => {
  mounted = false
  clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange', resumeRefresh)
  window.removeEventListener('online', resumeRefresh)
  window.removeEventListener('focus', resumeRefresh)
  window.removeEventListener('pageshow', resumeRefresh)
  revision++
  readRequest?.abort()
  actionRequest?.abort()
  rows.value = []
})
</script>
<template>
  <section class="outcomes" aria-label="我的得標與付款">
    <h2>得標與付款</h2>
    <p role="status">{{ message }}</p>
    <button type="button" class="btn-app btn-app--ghost" :disabled="loading || busy" @click="load">
      重新載入得標紀錄
    </button>
    <p v-if="loading">讀取中…</p>
    <p v-else-if="!rows.length && !message">目前沒有得標待辦。</p>
    <article v-for="row in rows" :key="row.auction_id">
      <h3>{{ row.morph }}</h3>
      <p>{{ row.auction_id }} · NT$ {{ row.amount?.toLocaleString('zh-TW') }}</p>
      <p>{{ labels[row.state] || '資料待確認' }}</p>
      <AuctionWinnerClaim
        :auction-id="row.auction_id"
        :member-id="memberId"
        :initial-outcome="row"
        :disabled="loading || busy || needsRefresh"
      />
      <p v-if="row.notification_status === 'failed' && !['paid', 'cancelled'].includes(row.state)">
        通知未成功，付款期限尚未開始。請聯絡官方 LINE 確認。
      </p>
      <p v-if="row.payment_due_at && !['paid', 'cancelled'].includes(row.state)">
        付款期限：{{ time(row.payment_due_at) }}
      </p>
      <p v-if="row.state === 'payment_review'">工作室核帳期間不會因原期限到期自動限制出價。</p>
      <template v-if="row.state === 'awaiting_payment' && row.notification_status !== 'manual'">
        <p>請透過官方 LINE 確認付款方式；實際完成付款後再回報。</p>
        <button
          type="button"
          class="btn-app btn-app--primary"
          :disabled="busy || loading || needsRefresh"
          @click="act(row.auction_id, 'report_auction_payment')"
        >
          我已付款，送出核帳
        </button>
      </template>
      <a
        href="https://line.me/R/ti/p/%40219abdzn"
        target="_blank"
        rel="noopener noreferrer"
        class="btn-app btn-app--ghost"
      >
        聯絡官方 LINE
      </a>
      <AuctionLineContact
        v-if="row.state === 'pending_contact'"
        :auction-id="row.auction_id"
        :member-id="memberId"
        @verified="$event && load()"
      />
      <template
        v-if="
          ['awaiting_payment', 'payment_review', 'awaiting_notice', 'pending_contact'].includes(
            row.state
          )
        "
      >
        <button
          v-if="abandoning !== row.auction_id"
          type="button"
          class="btn-app btn-app--ghost"
          :disabled="busy || loading || needsRefresh"
          @click="abandoning = row.auction_id"
        >
          申請棄標
        </button>
        <div v-else>
          <p>確認棄標後會禁止網站出價；如有正當理由，請先聯絡工作室。此操作不會封鎖 LINE。</p>
          <button
            type="button"
            class="btn-app btn-app--secondary"
            :disabled="busy || loading || needsRefresh"
            @click="act(row.auction_id, 'abandon_auction')"
          >
            確認棄標並限制出價
          </button>
          <button
            type="button"
            class="btn-app btn-app--ghost"
            :disabled="busy || loading || needsRefresh"
            @click="abandoning = ''"
          >
            取消
          </button>
        </div>
      </template>
    </article>
  </section>
</template>
<style scoped>
.outcomes {
  margin-block: 16px;
  overflow-wrap: anywhere;
}
.outcomes article {
  border: 1px solid var(--border-color, #ddd);
  padding: 16px;
  margin-block: 12px;
}
.outcomes p {
  margin-block: 8px;
  line-height: 1.6;
}
.outcomes .btn-app {
  min-height: 44px;
  white-space: normal;
  margin: 4px;
}
</style>
