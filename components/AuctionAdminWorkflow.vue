<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
const props = defineProps({ auctionId: { type: String, required: true } })
const supabase = useSupabaseClient()
const data = ref(null)
const reason = ref('')
const busy = ref(false)
const loading = ref(false)
const message = ref('')
const confirmingAbandon = ref(false)
let revision = 0
const outcome = computed(() => data.value?.outcome)
const mayAct = computed(
  () =>
    !busy.value && !loading.value && reason.value.trim().length >= 2 && reason.value.length <= 500
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
async function load() {
  const request = revision
  loading.value = true
  data.value = null
  try {
    const { data: result, error } = await supabase.rpc('admin_auction_workflow', {
      p_auction_id: props.auctionId
    })
    if (request !== revision) return
    if (error) throw error
    data.value = result
  } catch {
    if (request === revision) message.value = '無法讀取管理資料，請確認管理權限後重試。'
  } finally {
    if (request === revision) loading.value = false
  }
}
async function act(action) {
  if (!mayAct.value) return
  const request = revision
  busy.value = true
  message.value = ''
  try {
    const { error } = await supabase.rpc('admin_auction_action', {
      p_auction_id: props.auctionId,
      p_action: action,
      p_reason: reason.value.trim()
    })
    if (request !== revision) return
    if (error) throw error
    reason.value = ''
    confirmingAbandon.value = false
    message.value = '操作完成，已重新查核狀態。'
    await load()
  } catch {
    if (request === revision) {
      data.value = null
      message.value = '操作結果尚未確認，請重新載入；不要重複操作。'
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
    void load()
  }
)
onMounted(load)
onBeforeUnmount(() => {
  revision++
  data.value = null
})
</script>
<template>
  <section class="workflow-admin" aria-label="得標付款與出價限制管理">
    <h3>得標與付款管理</h3>
    <p role="status">{{ message }}</p>
    <button type="button" class="btn-app btn-app--ghost" :disabled="loading || busy" @click="load">
      重新載入得標狀態
    </button>
    <p v-if="loading">讀取中…</p>
    <p v-else-if="data && !data.enabled">此場次尚未納入自動得標與付款流程。</p>
    <p v-else-if="data && !outcome">尚未結算，截止後才會建立得標紀錄。</p>
    <template v-if="outcome">
      <p>
        {{ labels[outcome.state] || '待確認' }} · NT$ {{ outcome.amount?.toLocaleString('zh-TW') }}
      </p>
      <p>網站出價限制：{{ outcome.restricted ? '有' : '無' }}</p>
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
          v-if="outcome.restricted && outcome.state === 'abandoned'"
          type="button"
          class="btn-app btn-app--secondary"
          :disabled="!mayAct"
          @click="act('unblock')"
        >
          解除網站出價限制
        </button>
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
