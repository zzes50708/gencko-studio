<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { OFFICIAL_LINE_INBOX_URL } from '~/utils/auction-contact'

const store = useMainStore()
const supabase = useSupabaseClient()
useHead({ title: '競標管理', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
const selectedAuction = ref(null)
const auctionId = computed(() => selectedAuction.value?.id || '')
const auctions = ref([])
const listLoading = ref(false)
const listError = ref('')
const manager = computed(
  () => store.currentUser?.type === 'google' && store.currentUser?.auctionAdmin === true
)
const detailHeading = ref(null)
const listHeading = ref(null)
let listRevision = 0
async function loadAuctions() {
  const request = ++listRevision
  listLoading.value = true
  listError.value = ''
  try {
    const result = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from('auctions')
        .select('id,morph,status,start_price,min_increment,buy_now_price,end_time')
        .order('end_time', { ascending: false, nullsFirst: false })
        .order('id')
        .range(offset, offset + 499)
      if (request !== listRevision) return
      if (error) throw error
      result.push(...(data || []))
      if (!data || data.length < 500) break
    }
    auctions.value = result
  } catch {
    if (request === listRevision) listError.value = '場次列表暫時無法載入，請重試。'
  } finally {
    if (request === listRevision) listLoading.value = false
  }
}
async function selectAuction(auction) {
  selectedAuction.value = auction
  void search()
  await nextTick()
  detailHeading.value?.focus()
}
async function backToList() {
  revision++
  selectedAuction.value = null
  rows.value = []
  loading.value = false
  message.value = ''
  searched.value = false
  await nextTick()
  listHeading.value?.focus()
}
const statusText = (auction) =>
  auction.status === 'active'
    ? new Date(auction.end_time).getTime() > Date.now()
      ? '競標中'
      : '已截止'
    : auction.status === 'ended'
      ? '已結標'
      : '未開放'
const formatTime = (value) =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })
    : '未設定'
onBeforeUnmount(() => {
  revision++
  listRevision++
})
const rows = ref([])
const loading = ref(false)
const searched = ref(false)
const message = ref('')
let revision = 0
watch(
  () => [store.currentUser?.id, manager.value],
  () => {
    revision++
    rows.value = []
    loading.value = false
    searched.value = false
    message.value = ''
    selectedAuction.value = null
    auctions.value = []
    listRevision++
    listLoading.value = false
    listError.value = ''
    if (manager.value) void loadAuctions()
  },
  { immediate: true }
)
async function search() {
  const id = auctionId.value.trim()
  rows.value = []
  searched.value = false
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    message.value = '請輸入完整場次編號。'
    return
  }
  const request = ++revision
  loading.value = true
  message.value = ''
  try {
    // 權限由資料庫查核實際管理員設定，不能只相信前端旗標。
    const { data, error } = await supabase.rpc('get_auction_bidder_contacts', { p_auction_id: id })
    if (request !== revision) return
    if (error) throw error
    rows.value = data || []
    searched.value = true
  } catch (error) {
    if (request === revision)
      message.value =
        error?.code === '42501'
          ? '此帳號沒有競標管理權限，請使用指定的 Google 管理員帳號登入。'
          : '暫時無法取得出價者資料，請稍後重試。'
  } finally {
    if (request === revision) loading.value = false
  }
}
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value)
    message.value = '已複製。'
  } catch {
    message.value = '無法自動複製，請選取文字複製。'
  }
}
</script>

<template>
  <div class="cont management">
    <header class="page-header">
      <p class="en-label">AUCTION MANAGEMENT</p>
      <h1>競標管理</h1>
      <p>查詢出價紀錄與會員聯絡身分，僅限授權管理員。</p>
    </header>
    <section v-if="!store.currentUser" class="access-box">
      <p>請使用指定的 Google 管理員帳號登入。</p>
      <button type="button" class="btn-hero" @click="store.loginWithGoogle">
        Google 管理員登入
      </button>
    </section>
    <section v-else>
      <div class="account-row">
        <span>目前帳號：{{ store.currentUser.email || store.currentUser.name }}</span>
        <button type="button" @click="store.logout">登出</button>
        <button v-if="!manager" type="button" @click="store.loginWithGoogle">
          切換 Google 管理員登入
        </button>
      </div>
      <p v-if="!manager" role="status" class="access-box">
        目前登入的是一般會員帳號。請切換指定的 Google 管理員帳號，才能管理競標；LINE
        登入是供客人出價使用。
      </p>
      <template v-else>
        <section v-if="!selectedAuction" aria-label="場次列表">
          <h2 ref="listHeading" tabindex="-1">場次列表</h2>
          <p v-if="listLoading" role="status">載入場次中…</p>
          <div v-else-if="listError" role="alert">
            <p>{{ listError }}</p>
            <button type="button" @click="loadAuctions">重新載入場次</button>
          </div>
          <p v-else-if="!auctions.length">目前沒有競標場次。</p>
          <ul v-else class="auction-list">
            <li v-for="auction in auctions" :key="auction.id">
              <button type="button" class="auction-row" @click="selectAuction(auction)">
                <span>
                  <strong>{{ auction.morph || auction.id }}</strong>
                  <small>{{ auction.id }}</small>
                </span>
                <span>
                  {{ statusText(auction) }}
                  <small>截止 {{ formatTime(auction.end_time) }}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          </ul>
        </section>
        <section v-else aria-label="場次資訊">
          <button type="button" @click="backToList">返回場次列表</button>
          <h2 ref="detailHeading" tabindex="-1">{{ selectedAuction.morph || auctionId }}</h2>
          <dl class="auction-summary">
            <dt>場次編號</dt>
            <dd>{{ auctionId }}</dd>
            <dt>狀態</dt>
            <dd>{{ statusText(selectedAuction) }}</dd>
            <dt>截止時間</dt>
            <dd>{{ formatTime(selectedAuction.end_time) }}</dd>
            <dt>起標價</dt>
            <dd>NT$ {{ selectedAuction.start_price ?? 0 }}</dd>
            <dt>最低增額</dt>
            <dd>NT$ {{ selectedAuction.min_increment ?? 100 }}</dd>
            <template v-if="selectedAuction.buy_now_price > 0">
              <dt>直購價</dt>
              <dd>NT$ {{ selectedAuction.buy_now_price }}</dd>
            </template>
          </dl>
          <NuxtLink :to="`/auction/${encodeURIComponent(auctionId)}`" no-prefetch>
            查看公開場次頁
          </NuxtLink>
          <button type="button" :disabled="loading" @click="search">重新載入出價者</button>
          <AuctionAdminWorkflow
            :auction-id="auctionId"
            :key="`${store.currentUser.id}:${auctionId}`"
          />
          <p v-if="loading" role="status">載入出價者中…</p>
        </section>
        <p v-if="message" role="status">{{ message }}</p>
        <p v-if="searched && !rows.length">此場次尚無出價紀錄。</p>
        <div v-if="rows.length" class="bidder-list" aria-label="出價者紀錄">
          <article v-for="bid in rows" :key="bid.id" class="bidder-card">
            <div class="bid-heading">
              <h2>{{ bid.user_name }}</h2>
              <strong>NT$ {{ bid.amount.toLocaleString() }}</strong>
            </div>
            <p>
              {{
                new Date(bid.bid_time).toLocaleString('zh-TW', {
                  timeZone: 'Asia/Taipei',
                  hour12: false
                })
              }}
            </p>
            <dl>
              <dt>登入方式</dt>
              <dd>{{ bid.contact_provider === 'line' ? 'LINE' : 'Google／其他會員' }}</dd>
              <template v-if="bid.line_user_id">
                <dt>LINE 名稱</dt>
                <dd>{{ bid.line_name || '未提供' }}</dd>
                <dt>LINE 使用者 ID</dt>
                <dd>{{ bid.line_user_id }}</dd>
              </template>
              <template v-else>
                <dt>聯絡識別</dt>
                <dd>{{ bid.phone }}</dd>
              </template>
              <dt>會員編號</dt>
              <dd>{{ bid.user_id }}</dd>
            </dl>
            <button type="button" @click="copy(bid.user_id)">複製會員編號</button>
            <a
              v-if="bid.line_user_id"
              :href="OFFICIAL_LINE_INBOX_URL"
              target="_blank"
              rel="noopener noreferrer"
            >
              開啟官方 LINE 收件匣
            </a>
            <button v-if="bid.line_name" type="button" @click="copy(bid.line_name)">
              複製 LINE 名稱
            </button>
            <p v-if="bid.line_user_id" class="note">
              此入口會開啟官方收件匣，不會直接選取出價者。請以 LINE
              名稱搜尋，並核對會員傳來的場次及會員編號；LINE 使用者 ID 不是可搜尋的加好友
              ID，也不是後台對話網址。
            </p>
          </article>
        </div>
      </template>
    </section>
    <NuxtLink to="/auction" no-prefetch>返回線上競標</NuxtLink>
  </div>
</template>

<style scoped>
.auction-list {
  list-style: none;
  padding: 0;
  margin: 12px 0;
  display: grid;
  gap: 8px;
}
.auction-row {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  text-align: left;
  padding: 12px;
  border: 1px solid var(--bd, #ddd);
  background: transparent;
  color: inherit;
}
.auction-row span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.auction-row small {
  display: block;
  margin-top: 4px;
  font-size: 0.8rem;
  color: var(--txt-muted, #777);
}
.auction-summary {
  padding-block: 12px;
}

.management {
  max-width: 960px;
  padding-bottom: 36px;
}
.page-header {
  margin-bottom: 16px;
}
.access-box,
.bidder-card {
  padding: 16px;
  border: 1px solid var(--border, #ddd);
}
.account-row,
.bid-heading {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.search-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
}
input {
  min-width: 0;
  flex: 1;
  min-height: 44px;
  padding: 8px;
  border: 1px solid var(--border, #ccc);
  background: var(--card, white);
  color: var(--txt);
}
button {
  min-height: 44px;
  padding: 8px 12px;
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.bidder-list {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}
.bid-heading h2 {
  font-size: 1.05rem;
  margin: 0;
}
dl {
  display: grid;
  grid-template-columns: 108px minmax(0, 1fr);
  gap: 6px 12px;
}
dd {
  margin: 0;
  overflow-wrap: anywhere;
}
dt,
.note {
  color: var(--txt-muted, #777);
}
.note {
  font-size: 0.85rem;
}
</style>
