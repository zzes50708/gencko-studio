<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { OFFICIAL_LINE_INBOX_URL } from '~/utils/auction-contact'
import { auctionState } from '~/utils/auction-presentation'
import { readAuctionBidderContacts } from '~/utils/auction-admin'

const store = useMainStore()
const supabase = useSupabaseClient()
const now = ref(store.auctionNow())
let clockTimer
const updateClock = () => {
  now.value = store.auctionNow()
}
onMounted(() => {
  updateClock()
  clockTimer = setInterval(() => {
    if (document.visibilityState === 'visible') updateClock()
  }, 1000)
  document.addEventListener('visibilitychange', updateClock)
})
useHead({ title: '競標管理', meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
const selectedAuction = ref(null)
const creating = ref(false)
const publicationNotice = ref('')
const auctionId = computed(() => selectedAuction.value?.id || '')
const auctions = ref([])
const listLoading = ref(false)
const listError = ref('')
const listQuery = ref('')
const listFilter = ref('all')
const visibleAuctions = computed(() => {
  const query = listQuery.value.trim().toLocaleLowerCase()
  return auctions.value.filter((auction) => {
    const state = auctionState(auction, now.value).status
    return (
      (!query || `${auction.id} ${auction.morph || ''}`.toLocaleLowerCase().includes(query)) &&
      (listFilter.value === 'all' ||
        (listFilter.value === 'active'
          ? state === 'active'
          : listFilter.value === 'scheduled'
            ? state === 'scheduled'
            : ['ended', 'closed'].includes(state)))
    )
  })
})
const bidderGroups = computed(() => {
  const groups = new Map()
  for (const bid of rows.value) {
    const key = bid.user_id || bid.id
    const group = groups.get(key)
    if (!group) groups.set(key, { ...bid, bids: [bid] })
    else {
      group.bids.push(bid)
      if (bid.amount > group.amount) Object.assign(group, bid)
    }
  }
  return [...groups.values()].sort((a, b) => b.amount - a.amount)
})
const manager = computed(
  () => store.currentUser?.type === 'google' && store.currentUser?.auctionAdmin === true
)
const detailHeading = ref(null)
const listHeading = ref(null)
const workflowPanel = ref(null)
let listRevision = 0
let bidderRead
let liveChannel, liveTimer, liveDebounce
let liveGeneration = 0
let disposed = false
function stopLive() {
  liveGeneration++
  clearInterval(liveTimer)
  clearTimeout(liveDebounce)
  liveDebounce = null
  if (liveChannel) void supabase.removeChannel(liveChannel)
  liveChannel = null
  document.removeEventListener('visibilitychange', queueLiveRefresh)
  window.removeEventListener('online', queueLiveRefresh)
}
function queueLiveRefresh() {
  if (disposed || !manager.value || document.hidden) return
  if (liveDebounce) return
  const generation = liveGeneration
  liveDebounce = setTimeout(async () => {
    liveDebounce = null
    if (disposed || generation !== liveGeneration || !manager.value || document.hidden) return
    if (listLoading.value || loading.value) {
      queueLiveRefresh()
      return
    }
    await loadAuctions()
    if (disposed || generation !== liveGeneration || !manager.value || !selectedAuction.value)
      return
    await Promise.allSettled([search(true), workflowPanel.value?.refreshIfIdle()])
  }, 400)
}
function startLive() {
  if (!import.meta.client) return
  stopLive()
  if (!manager.value) return
  liveChannel = supabase
    .channel('auction-management-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'auctions' }, queueLiveRefresh)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'auction_bids' },
      queueLiveRefresh
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') queueLiveRefresh()
    })
  liveTimer = setInterval(queueLiveRefresh, 15000)
  document.addEventListener('visibilitychange', queueLiveRefresh)
  window.addEventListener('online', queueLiveRefresh)
}
async function loadAuctions() {
  const request = ++listRevision
  listLoading.value = true
  listError.value = ''
  try {
    const result = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase
        .from('auctions')
        .select('id,morph,status,start_price,min_increment,buy_now_price,start_time,end_time')
        .order('end_time', { ascending: false, nullsFirst: false })
        .order('id')
        .range(offset, offset + 499)
      if (request !== listRevision) return
      if (error) throw error
      result.push(...(data || []))
      if (!data || data.length < 500) break
    }
    auctions.value = result
    if (selectedAuction.value) {
      const latest = result.find((a) => a.id === selectedAuction.value.id)
      if (latest) selectedAuction.value = latest
    }
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
  bidderRead?.abort()
  revision++
  selectedAuction.value = null
  rows.value = []
  loading.value = false
  message.value = ''
  searched.value = false
  await nextTick()
  listHeading.value?.focus()
}
async function openListing() {
  await backToList()
  creating.value = true
  publicationNotice.value = ''
}
function cancelListing() {
  creating.value = false
  void backToList()
}
async function listingCreated(id) {
  creating.value = false
  publicationNotice.value = `場次已上架：${id}`
  await loadAuctions()
  const created = auctions.value.find((a) => a.id === id)
  if (created) await selectAuction(created)
}
const statusText = (auction) => auctionState(auction, now.value).text
const formatTime = (value) =>
  value && Number.isFinite(new Date(value).getTime())
    ? new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })
    : '未設定'
onBeforeUnmount(() => {
  disposed = true
  stopLive()
  bidderRead?.abort()
  clearInterval(clockTimer)
  document.removeEventListener('visibilitychange', updateClock)
  revision++
  listRevision++
})
const rows = ref([])
const loading = ref(false)
const searched = ref(false)
const message = ref('')
let revision = 0
watch(
  () => `${store.currentUser?.id || ''}:${manager.value}`,
  () => {
    bidderRead?.abort()
    revision++
    rows.value = []
    loading.value = false
    searched.value = false
    message.value = ''
    selectedAuction.value = null
    creating.value = false
    publicationNotice.value = ''
    auctions.value = []
    listRevision++
    listLoading.value = false
    listError.value = ''
    listQuery.value = ''
    listFilter.value = 'all'
    if (manager.value) void loadAuctions()
    startLive()
  },
  { immediate: true }
)
async function search(quiet = false) {
  // DOM 點擊事件會傳入 Event，只有明確的 true 才是背景更新。
  quiet = quiet === true
  bidderRead?.abort()
  bidderRead = new AbortController()
  const signal = bidderRead.signal
  const id = auctionId.value.trim()
  if (!quiet) {
    rows.value = []
    searched.value = false
  }
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    message.value = '請輸入完整場次編號。'
    return
  }
  const request = ++revision
  loading.value = true
  message.value = ''
  try {
    // 權限由資料庫查核實際管理員設定，不能只相信前端旗標。
    const data = await readAuctionBidderContacts(supabase, id, signal)
    if (request !== revision) return
    rows.value = data || []
    searched.value = true
  } catch (error) {
    if (request === revision) {
      rows.value = []
      searched.value = false
      message.value =
        error?.code === '42501'
          ? '此帳號沒有競標管理權限，請使用指定的 Google 管理員帳號登入。'
          : '暫時無法取得出價者資料，請稍後重試。'
    }
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
      <p>場次、領標與核帳，一處管理。</p>
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
        <p role="status">{{ publicationNotice }}</p>
        <AuctionListingForm
          v-if="creating"
          :owner-id="store.currentUser.id"
          :key="store.currentUser.id"
          @cancel="cancelListing"
          @created="listingCreated"
        />
        <section v-else-if="!selectedAuction" aria-label="場次列表">
          <div class="section-heading">
            <h2 ref="listHeading" tabindex="-1">
              場次列表
              <small>{{ auctions.length }} 場</small>
            </h2>
            <button type="button" :disabled="listLoading" @click="loadAuctions">
              重新載入場次
            </button>
            <button type="button" @click="openListing">新增競標場次</button>
          </div>
          <div class="list-tools">
            <label>
              搜尋場次
              <input v-model="listQuery" type="search" placeholder="場次編號或品系" />
            </label>
            <label>
              場次狀態
              <select v-model="listFilter" aria-label="場次狀態">
                <option value="all">全部場次</option>
                <option value="active">競標中</option>
                <option value="scheduled">尚未開標</option>
                <option value="closed">已截止／未開放</option>
              </select>
            </label>
          </div>
          <details class="schedule-note">
            <summary>開標時間與自動排程說明</summary>
            <p>
              按「新增競標場次」可選立即開標或預約開標，時間一律採台灣時間。預約場次先公開顯示倒數，開標前不能出價。截止後自動結算，結標起
              24 小時內須完成付款核帳，公開列表保留 48 小時。
            </p>
          </details>
          <p v-if="listLoading" role="status">載入場次中…</p>
          <div v-else-if="listError" role="alert">
            <p>{{ listError }}</p>
          </div>
          <p v-else-if="!auctions.length">目前沒有競標場次。</p>
          <p v-else-if="!visibleAuctions.length" role="status">
            沒有符合條件的場次，請調整搜尋或狀態。
          </p>
          <ul v-else class="auction-list">
            <li v-for="auction in visibleAuctions" :key="auction.id">
              <button type="button" class="auction-row" @click="selectAuction(auction)">
                <span>
                  <strong>{{ auction.morph || auction.id }}</strong>
                  <small>{{ auction.id }}</small>
                </span>
                <span>
                  <b class="status-chip">{{ statusText(auction) }}</b>
                  <small>截止 {{ formatTime(auction.end_time) }}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          </ul>
        </section>
        <section v-else aria-label="場次資訊">
          <div class="section-heading">
            <button type="button" @click="backToList">返回場次列表</button>
            <NuxtLink :to="`/auction/${encodeURIComponent(auctionId)}`" no-prefetch>
              查看公開場次頁 ↗
            </NuxtLink>
          </div>
          <h2 ref="detailHeading" class="detail-title" tabindex="-1">
            {{ selectedAuction.morph || auctionId }}
            <span class="status-chip">{{ statusText(selectedAuction) }}</span>
          </h2>
          <dl class="auction-summary">
            <dt>場次編號</dt>
            <dd>{{ auctionId }}</dd>
            <dt>狀態</dt>
            <dd>{{ statusText(selectedAuction) }}</dd>
            <dt>截止時間</dt>
            <dd>{{ formatTime(selectedAuction.end_time) }}</dd>
            <dt>開標時間</dt>
            <dd>
              {{ selectedAuction.start_time ? formatTime(selectedAuction.start_time) : '立即開標' }}
            </dd>
            <dt>起標價</dt>
            <dd>NT$ {{ selectedAuction.start_price ?? 0 }}</dd>
            <dt>最低增額</dt>
            <dd>NT$ {{ selectedAuction.min_increment ?? 100 }}</dd>
            <template v-if="selectedAuction.buy_now_price > 0">
              <dt>直購價</dt>
              <dd>NT$ {{ selectedAuction.buy_now_price }}</dd>
            </template>
          </dl>
          <p v-if="listError" role="status">{{ listError }}</p>
          <AuctionAdminWorkflow
            ref="workflowPanel"
            :auction-id="auctionId"
            :key="`${store.currentUser.id}:${auctionId}`"
          />
          <div class="section-heading">
            <h3>
              出價者
              <small>{{ bidderGroups.length }} 位 · {{ rows.length }} 筆出價</small>
            </h3>
            <button type="button" :disabled="loading" @click="search">重新載入出價者</button>
          </div>
          <p v-if="rows.some((bid) => bid.line_user_id)" class="note contact-note">
            聯絡客人：開啟官方 LINE 收件匣，以 LINE 名稱搜尋，再核對客人傳來的領標場次。LINE 使用者
            ID 不是加好友 ID。
          </p>
          <p v-if="loading" role="status">載入出價者中…</p>
        </section>
        <p v-if="message" role="status">{{ message }}</p>
        <p v-if="searched && !rows.length">此場次尚無出價紀錄。</p>
        <div v-if="rows.length" class="bidder-list" aria-label="出價者紀錄">
          <article v-for="bid in bidderGroups" :key="bid.user_id || bid.id" class="bidder-card">
            <div class="bid-heading">
              <h3>{{ bid.user_name }}</h3>
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
              </template>
              <template v-else>
                <dt>聯絡識別</dt>
                <dd>{{ bid.phone }}</dd>
              </template>
            </dl>
            <div class="contact-actions">
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
            </div>
            <details class="bid-history">
              <summary>出價紀錄與會員識別 · {{ bid.bids.length }} 筆</summary>
              <p class="note">會員編號：{{ bid.user_id }}</p>
              <p v-if="bid.line_user_id" class="note">LINE 使用者 ID：{{ bid.line_user_id }}</p>
              <ul>
                <li v-for="entry in bid.bids" :key="entry.id">
                  NT$ {{ entry.amount.toLocaleString('zh-TW') }}
                  <time>{{ formatTime(entry.bid_time) }}</time>
                </li>
              </ul>
            </details>
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
  max-width: 1080px;
  padding-bottom: 36px;
}
.section-heading,
.contact-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.section-heading {
  margin-block: 16px 10px;
}
.section-heading h2,
.section-heading h3 {
  margin: 0;
  font-size: 1.15rem;
}
.section-heading small {
  font-size: 0.8rem;
  color: var(--txt-muted, #777);
  font-weight: 400;
}
.list-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 12px;
}
.list-tools label {
  display: grid;
  gap: 6px;
  font-size: 0.85rem;
}
.list-tools input,
.list-tools select {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--bd, #ddd);
  background: var(--bg, #fff);
  color: inherit;
  padding: 10px;
  font-size: 1rem;
  border-radius: 4px;
}
.schedule-note {
  margin-block: 12px;
  font-size: 0.85rem;
}
.schedule-note p {
  max-width: 70ch;
  line-height: 1.7;
  color: var(--txt-muted, #777);
}
summary {
  cursor: pointer;
  padding-block: 12px;
}
.status-chip {
  display: inline-block;
  padding: 4px 8px;
  border: 1px solid var(--bd, #ddd);
  font-size: 0.75rem;
  font-weight: 600;
  vertical-align: middle;
}
.detail-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 1.5rem;
  margin-block: 16px 8px;
}
.account-row {
  border-block: 1px solid var(--bd, #ddd);
  padding-block: 8px;
  font-size: 0.85rem;
}
.auction-summary {
  border-bottom: 1px solid var(--bd, #ddd);
  margin-top: 0;
  grid-template-columns: 100px minmax(0, 1fr) 100px minmax(0, 1fr);
  row-gap: 12px;
  font-variant-numeric: tabular-nums;
}
.contact-actions {
  justify-content: flex-start;
  margin-top: 12px;
}
.contact-actions a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--bd, #ddd);
}
.contact-note {
  line-height: 1.6;
}
.bid-history {
  border-top: 1px solid var(--bd, #ddd);
  margin-top: 12px;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
}
.bid-history ul {
  list-style: none;
  padding: 0;
}
.bid-history li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 6px;
  padding-block: 6px;
  border-bottom: 1px solid var(--bd, #ddd);
}
.bid-history time {
  color: var(--txt-muted, #777);
}
button,
a,
input,
select,
summary {
  outline-offset: 4px;
}
@media (max-width: 480px) {
  .list-tools {
    grid-template-columns: minmax(0, 1fr);
  }
  .auction-row {
    gap: 8px;
    padding: 12px 8px;
  }
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
  border: 1px solid var(--bd, #ddd);
  border-radius: 4px;
  background: var(--bg, #fff);
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}
.management a {
  color: inherit;
  text-underline-offset: 4px;
}
.auction-row {
  border-radius: 6px;
  padding: 16px;
}
.bidder-card {
  border-radius: 6px;
}
@media (hover: hover) and (pointer: fine) {
  button:hover,
  .contact-actions a:hover {
    background: var(--bg-soft, #f5f3ef);
  }
}
@media (max-width: 640px) {
  .auction-summary {
    grid-template-columns: 90px minmax(0, 1fr);
    gap: 6px 12px;
  }
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
.bid-heading h3 {
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
