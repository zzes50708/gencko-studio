<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { shopCollections, shopCollectionCovers } from '~/data/shop-collections'
import { SHOP_COLLECTION_DRAFT_KEY, parseShopCollectionDraft } from '~/utils/shop-collection-draft'
import { getCleanUrl } from '~/utils/image'
import {
  belongsToShopCategory,
  canJoinShopCategory,
  isSharedShopCategory,
  shopCategoryDefinitions
} from '~/utils/shop-categories'
import { getShopGeneCategories } from '~/utils/shop-catalog'
import { GENES_DB } from '~/utils/genes-db'
import { createRequestDeadline } from '~/utils/request-deadline'
useHead({
  title: '分類與封面管理｜Gencko',
  meta: [{ name: 'robots', content: 'noindex,nofollow' }]
})
const store = useMainStore()
const supabase = useSupabaseClient()
const published = await useShopCollections({ refreshOnMount: false })
const canEdit = ref(false)
const accessChecking = ref(true)
const saving = ref(false)
const loaded = ref(false)
const revision = ref(0)
const savedAt = ref('')
const conflict = ref(false)
const localDraftAvailable = ref(false)
const savedSnapshot = ref('')
const activeRequests = new Set()
const groups = ref(JSON.parse(JSON.stringify(shopCollections)))
const covers = ref({ ...shopCollectionCovers })
const species = ref('豹紋守宮')
const editingId = ref('all')
const newName = ref('')
const keyword = ref('')
const source = ref('all')
const editingMode = ref('cover')
const membershipFilter = ref('all')
const status = ref('')
const dirty = computed(
  () => JSON.stringify({ groups: groups.value, covers: covers.value }) !== savedSnapshot.value
)
async function request(work) {
  const deadline = createRequestDeadline(15000)
  activeRequests.add(deadline)
  try {
    return await deadline.run(work)
  } finally {
    activeRequests.delete(deadline)
  }
}
onBeforeUnmount(() => {
  for (const deadline of activeRequests) deadline.abort()
})
const geneOptions = computed(() => [
  ...new Set(
    Object.values(
      getShopGeneCategories(
        sharedCategory.value ? ['豹紋守宮', '肥尾守宮'] : species.value,
        GENES_DB
      )
    ).flat()
  )
])
const isMember = (item) => Boolean(selected.value && belongsToShopCategory(item, selected.value))
const groupCount = (group) => store.inv.filter((item) => belongsToShopCategory(item, group)).length
const selected = computed(() => groups.value.find((group) => group.id === editingId.value))
const sharedCategory = computed(() => isSharedShopCategory(selected.value))
const speciesGroups = computed(() => shopCategoryDefinitions(species.value, groups.value))
const candidates = computed(() =>
  store.inv.filter(
    (item) =>
      (sharedCategory.value
        ? ['豹紋守宮', '肥尾守宮'].includes(item.Species)
        : item.Species === species.value) &&
      ['ForSale', 'Reserved', 'Auction', 'Sold', 'SelfKeep'].includes(item.Status) &&
      (editingMode.value === 'cover' || canJoinShopCategory(item)) &&
      (editingMode.value === 'membership' ||
        source.value === 'all' ||
        (source.value === 'breeders' ? item.Status === 'SelfKeep' : item.Status !== 'SelfKeep')) &&
      `${item.ID} ${item.Morph}`.toLowerCase().includes(keyword.value.toLowerCase())
  )
)
// 封面不代表分類歸屬；手動加入、基因規則及排除清單均沿用同一套判斷。
const categorizedIds = computed(
  () =>
    new Set(
      store.inv
        .filter((item) => groups.value.some((group) => belongsToShopCategory(item, group)))
        .map((item) => item.ID)
    )
)
const membershipCounts = computed(() => ({
  all: candidates.value.length,
  unclassified: candidates.value.filter(
    (item) => canJoinShopCategory(item) && !categorizedIds.value.has(item.ID)
  ).length,
  current: candidates.value.filter(isMember).length
}))
const items = computed(() =>
  candidates.value.filter((item) =>
    editingMode.value === 'cover'
      ? true
      : membershipFilter.value === 'unclassified'
        ? canJoinShopCategory(item) && !categorizedIds.value.has(item.ID)
        : membershipFilter.value === 'current'
          ? isMember(item)
          : true
  )
)
watch(selected, (group) => {
  if (!group) {
    editingMode.value = 'cover'
    if (membershipFilter.value === 'current') membershipFilter.value = 'all'
  }
})
const chosenCover = computed(() =>
  editingId.value === 'all' ? covers.value[species.value] : selected.value?.coverAnimalId
)
const coverItem = computed(() => store.inv.find((item) => item.ID === chosenCover.value))
function selectSpecies(name) {
  species.value = name
  editingId.value = 'all'
}
function addGroup() {
  const label = newName.value.trim()
  if (!label) {
    status.value = '請先輸入分類名稱。'
    return
  }
  if (speciesGroups.value.some((group) => group.label === label)) {
    status.value = '這個物種已有相同分類名稱。'
    return
  }
  const group = {
    id: `group-${crypto.randomUUID()}`,
    label,
    species: species.value,
    animalIds: [],
    matchMode: 'manual',
    geneKeys: [],
    excludedAnimalIds: [],
    coverAnimalId: ''
  }
  groups.value.push(group)
  editingId.value = group.id
  newName.value = ''
  status.value = '分類已建立，接著勾選個體與封面。'
}
function toggleMember(id) {
  if (!selected.value) return
  const group = selected.value
  const item = store.inv.find((item) => item.ID === id)
  if (!item || !canJoinShopCategory(item)) return
  if (belongsToShopCategory(item, group)) {
    group.animalIds = group.animalIds.filter((value) => value !== id)
    group.excludedAnimalIds = [...new Set([...(group.excludedAnimalIds || []), id])]
  } else {
    group.excludedAnimalIds = (group.excludedAnimalIds || []).filter((value) => value !== id)
    group.animalIds = [...new Set([...group.animalIds, id])]
  }
}
function chooseCover(item) {
  if (editingId.value === 'all') covers.value[species.value] = item.ID
  else if (selected.value) selected.value.coverAnimalId = item.ID
}
function reorder(id, direction) {
  const list = speciesGroups.value
  const target = list[list.findIndex((group) => group.id === id) + direction]
  if (!target) return
  const a = groups.value.findIndex((group) => group.id === id),
    b = groups.value.indexOf(target)
  ;[groups.value[a], groups.value[b]] = [groups.value[b], groups.value[a]]
}
function removeGroup() {
  groups.value = groups.value.filter((group) => group.id !== editingId.value)
  editingId.value = 'all'
  status.value = '已移除此分類，個體資料維持原樣。'
}
async function save() {
  if (!canEdit.value || !loaded.value || saving.value || conflict.value) return
  saving.value = true
  status.value = ''
  try {
    const draft = parseShopCollectionDraft({
      format: 'gencko-shop-collections',
      version: 1,
      groups: groups.value,
      covers: covers.value
    })
    const { data, error } = await request((signal) =>
      supabase
        .rpc('save_shop_collections', {
          p_document: draft,
          p_expected_revision: revision.value
        })
        .abortSignal(signal)
    )
    if (error) throw error
    if (!data || data.revision !== revision.value + 1)
      throw Error('儲存結果尚未確認，請保留目前設定並重新載入網站版本。')
    revision.value = data.revision
    savedAt.value = data.updated_at
    savedSnapshot.value = JSON.stringify({ groups: groups.value, covers: covers.value })
    published.data.value = { document: draft, revision: data.revision, updatedAt: data.updated_at }
    status.value = '已儲存，網站分類與封面已更新。'
  } catch (error) {
    if (error.code === '40001') {
      conflict.value = true
      status.value =
        '網站已有其他分頁儲存的新版本，目前修改尚未送出。請先重新載入網站版本，再確認修改。'
    } else if (error.code === '42501' || error.code === 'PGRST301') {
      canEdit.value = false
      status.value = '登入或管理權限已失效，請重新登入管理員帳號。'
    } else if (error.code === '22023')
      status.value = '分類資料或封面照片無效，請檢查分類名稱與封面後重試。'
    else
      status.value =
        '尚未確認儲存結果，請稍後重試；目前修改仍保留，若網站已收到儲存，重試會提示重新載入版本。'
  } finally {
    saving.value = false
  }
}
async function loadPublished() {
  loaded.value = false
  await published.refresh()
  if (published.error.value) {
    status.value = '無法讀取網站現有分類，已暫停儲存以免覆蓋設定。請重新載入網站版本。'
    return
  }
  const document = published.document.value
  groups.value = JSON.parse(JSON.stringify(document.groups))
  covers.value = { ...document.covers }
  if (!groups.value.some((group) => group.id === editingId.value)) editingId.value = 'all'
  revision.value = published.data.value?.revision ?? 0
  savedAt.value = published.data.value?.updatedAt || ''
  conflict.value = false
  loaded.value = true
  savedSnapshot.value = published.data.value?.document
    ? JSON.stringify({ groups: groups.value, covers: covers.value })
    : ''
  status.value = ''
}
let accessSequence = 0
async function checkAccess() {
  const sequence = ++accessSequence
  canEdit.value = false
  loaded.value = false
  accessChecking.value = true
  if (!store.currentUser) {
    accessChecking.value = false
    return
  }
  let data, error
  try {
    ;({ data, error } = await request((signal) =>
      supabase.rpc('shop_collection_access').abortSignal(signal)
    ))
  } catch {
    error = true
  }
  if (sequence !== accessSequence) return
  accessChecking.value = false
  canEdit.value = !error && data === true
  if (error) status.value = '無法確認管理權限，請稍後重試。'
  if (canEdit.value) {
    await loadPublished()
    void store.ensureInventoryLoaded()
  }
}
function restoreLocalDraft() {
  try {
    const raw = localStorage.getItem(SHOP_COLLECTION_DRAFT_KEY)
    if (raw) {
      const draft = parseShopCollectionDraft(raw)
      groups.value = draft.groups
      covers.value = draft.covers
      status.value = '已載入先前的本機草稿，尚未儲存到網站。'
    }
  } catch {
    status.value = '舊草稿無法讀取，網站設定維持原樣。'
  }
}
onMounted(() => {
  try {
    localDraftAvailable.value = Boolean(localStorage.getItem(SHOP_COLLECTION_DRAFT_KEY))
  } catch {}
  void checkAccess()
})
watch(
  () => store.currentUser?.id,
  () => {
    void checkAccess()
  }
)
</script>
<template>
  <div class="site-document-page collection-studio">
    <header class="studio-heading">
      <div>
        <p>COLLECTION STUDIO</p>
        <h1>分類與封面</h1>
        <p>挑選 1:1 封面，個體分類可另外設定。</p>
      </div>
      <button
        v-if="canEdit"
        type="button"
        class="studio-save"
        :disabled="saving || !loaded || conflict"
        @click="save"
      >
        {{ saving ? '正在儲存…' : '儲存並更新網站 ↗' }}
      </button>
    </header>
    <p class="studio-note">
      管理員可在這裡直接設定分類與封面，儲存後同步到網站。照片可從販售個體、已售個體或自留種群挑選。
    </p>
    <p v-if="status" role="status" class="studio-status">{{ status }}</p>
    <div v-if="accessChecking" role="status" class="studio-access">正在確認管理權限…</div>
    <div v-else-if="!canEdit" class="studio-access">
      <h2>{{ store.currentUser ? '此帳號沒有分類管理權限' : '請登入管理員帳號' }}</h2>
      <p>使用原有的 Google 管理員帳號登入後，就能在這頁更新網站。</p>
      <button type="button" @click="store.loginWithGoogle">Google 管理員登入</button>
      <button v-if="store.currentUser" type="button" @click="store.logout">登出目前帳號</button>
      <button v-if="store.currentUser" type="button" @click="checkAccess">重新確認權限</button>
      <NuxtLink no-prefetch to="/shop">返回選購分類</NuxtLink>
    </div>
    <template v-if="canEdit">
      <div class="studio-version">
        <span>
          {{
            savedAt
              ? `最近儲存：${new Date(savedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`
              : '尚未儲存網站分類'
          }}
        </span>
        <span v-if="loaded && dirty">有尚未儲存的修改</span>
        <button type="button" :disabled="saving" @click="loadPublished">
          {{ loaded && dirty ? '捨棄修改並載入網站版本' : '重新載入網站版本' }}
        </button>
        <button
          v-if="localDraftAvailable && loaded"
          type="button"
          :disabled="saving"
          @click="restoreLocalDraft"
        >
          載入先前本機草稿
        </button>
        <NuxtLink no-prefetch to="/shop">查看網站分類 ↗</NuxtLink>
      </div>
      <fieldset class="studio-editor" :disabled="saving || !loaded">
        <legend class="sr-only">編輯網站分類與封面</legend>
        <div class="studio-species" role="group" aria-label="設定分類的物種">
          <button
            v-for="name in ['豹紋守宮', '肥尾守宮']"
            :key="name"
            type="button"
            :aria-pressed="species === name"
            @click="selectSpecies(name)"
          >
            {{ name }}
          </button>
        </div>
        <div class="studio-layout">
          <aside class="studio-sidebar">
            <form class="studio-create" @submit.prevent="addGroup">
              <label for="collection-name">新增分類</label>
              <div>
                <input
                  id="collection-name"
                  v-model="newName"
                  maxlength="60"
                  placeholder="輸入你要的品系名稱"
                />
                <button type="submit">新增</button>
              </div>
            </form>
            <label class="studio-mobile-select">
              編輯分類
              <select v-model="editingId">
                <option value="all">All Available</option>
                <option v-for="group in speciesGroups" :key="group.id" :value="group.id">
                  {{ group.label }}
                </option>
              </select>
            </label>
            <nav aria-label="編輯分類">
              <button
                type="button"
                :aria-current="editingId === 'all' ? 'page' : undefined"
                @click="editingId = 'all'"
              >
                全部個體封面
              </button>
              <div
                v-for="(group, index) in speciesGroups"
                :key="group.id"
                class="studio-category-row"
              >
                <button
                  type="button"
                  :aria-current="editingId === group.id ? 'page' : undefined"
                  @click="editingId = group.id"
                >
                  {{ group.label }}
                  <small>{{ groupCount(group) }}</small>
                </button>
                <button
                  type="button"
                  :disabled="index === 0"
                  :aria-label="`上移 ${group.label}`"
                  @click="reorder(group.id, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  :disabled="index === speciesGroups.length - 1"
                  :aria-label="`下移 ${group.label}`"
                  @click="reorder(group.id, 1)"
                >
                  ↓
                </button>
              </div>
            </nav>
            <div v-if="selected" class="studio-selected">
              <div class="studio-order-mobile">
                <button type="button" @click="reorder(selected.id, -1)">往前排列</button>
                <button type="button" @click="reorder(selected.id, 1)">往後排列</button>
              </div>
              <label>
                分類名稱
                <input v-model="selected.label" maxlength="60" />
              </label>
              <label>
                分類方式
                <select v-model="selected.matchMode">
                  <option value="manual">手動勾選個體</option>
                  <option value="genes">符合任一基因標籤</option>
                </select>
              </label>
              <div v-if="selected.matchMode === 'genes'" class="studio-gene-choices">
                <label v-for="gene in geneOptions" :key="gene">
                  <input v-model="selected.geneKeys" type="checkbox" :value="gene" />
                  {{ gene }}
                </label>
              </div>
              <button type="button" class="studio-remove" @click="removeGroup">移除此分類</button>
            </div>
            <div class="studio-cover">
              <p>目前封面</p>
              <div class="studio-cover-image">
                <ArticleImage
                  :src="coverItem?.ImageURL ? getCleanUrl(coverItem.ImageURL, 400) : undefined"
                  :alt="coverItem?.Morph || '尚未選擇封面'"
                  empty-text="請從右側選擇封面"
                />
              </div>
              <small>{{ chosenCover || '尚未選擇' }}</small>
            </div>
          </aside>
          <section class="studio-inventory" aria-label="挑選分類個體與封面">
            <header>
              <div>
                <h2>{{ selected?.label || '全部個體封面' }}</h2>
                <p v-if="sharedCategory">豹紋守宮與肥尾守宮共用分類，兩種物種可在這裡一起設定。</p>
                <p>
                  {{
                    selected
                      ? '可直接挑選任何照片當封面。勾選「加入此分類」只影響個體清單，與封面分開設定。'
                      : '點選喜歡的照片，作為這個物種「全部個體」的封面。'
                  }}
                </p>
              </div>
              <input
                v-model="keyword"
                type="search"
                aria-label="搜尋可分類個體"
                placeholder="搜尋品系或個體 ID"
              />
              <div class="studio-editing-modes" role="group" aria-label="編輯模式">
                <button
                  type="button"
                  :aria-pressed="editingMode === 'cover'"
                  @click="editingMode = 'cover'"
                >
                  設定封面
                </button>
                <button
                  type="button"
                  :disabled="!selected"
                  :aria-pressed="editingMode === 'membership'"
                  @click="editingMode = 'membership'"
                >
                  加入此分類
                </button>
              </div>
              <label v-if="editingMode === 'cover'" class="studio-source">
                照片來源
                <select v-model="source">
                  <option value="all">全部個體（含種群）</option>
                  <option value="breeders">自留種群</option>
                  <option value="sales">販售與已售個體</option>
                </select>
              </label>
              <div
                v-if="editingMode === 'membership'"
                class="studio-membership-filters"
                role="group"
                aria-label="分類歸屬篩選"
              >
                <button
                  type="button"
                  :aria-pressed="membershipFilter === 'all'"
                  @click="membershipFilter = 'all'"
                >
                  全部 {{ membershipCounts.all }}
                </button>
                <button
                  type="button"
                  :aria-pressed="membershipFilter === 'unclassified'"
                  @click="membershipFilter = 'unclassified'"
                >
                  尚未分類 {{ membershipCounts.unclassified }}
                </button>
                <button
                  type="button"
                  :disabled="!selected"
                  :aria-pressed="membershipFilter === 'current'"
                  @click="membershipFilter = 'current'"
                >
                  目前分類 {{ membershipCounts.current }}
                </button>
              </div>
              <p class="studio-filter-note" aria-live="polite">
                {{
                  editingMode === 'cover'
                    ? '封面可從全部個體挑選，包含種群與已售出個體；不會加入販售分類。'
                    : membershipFilter === 'unclassified'
                      ? '未歸入此物種任何分類的個體；僅設為封面不算已分類。'
                      : membershipFilter === 'current'
                        ? `目前屬於 ${selected?.label || ''} 的個體。`
                        : '僅顯示待售個體，可設定販售頁分類歸屬。'
                }}
                顯示 {{ items.length }} 隻。
              </p>
            </header>
            <p v-if="store.loading && !items.length" role="status">正在載入個體照片…</p>
            <p v-else-if="!items.length">目前沒有符合條件的個體。</p>
            <div class="studio-photo-grid">
              <article
                v-for="item in items"
                :key="item.ID"
                class="studio-photo-card"
                :class="{ 'is-cover': chosenCover === item.ID }"
              >
                <div class="studio-photo">
                  <ArticleImage
                    :src="item.ImageURL ? getCleanUrl(item.ImageURL, 400) : undefined"
                    :alt="`${item.Morph}（${item.ID}）`"
                  />
                </div>
                <strong>{{ item.Morph }}</strong>
                <small>{{ item.ID }}</small>
                <small v-if="sharedCategory">{{ item.Species }}</small>
                <small v-if="item.Status === 'SelfKeep'" class="studio-breeder-mark">
                  自留種群・僅限封面
                </small>
                <small v-else-if="item.Status === 'Sold'" class="studio-breeder-mark">
                  已售出・僅限封面
                </small>
                <label
                  v-if="editingMode === 'membership' && selected && canJoinShopCategory(item)"
                  class="studio-membership"
                  :class="{ 'is-member': isMember(item) }"
                >
                  <input
                    type="checkbox"
                    :checked="isMember(item)"
                    @change="toggleMember(item.ID)"
                  />
                  加入此分類
                </label>
                <button
                  v-if="editingMode === 'cover'"
                  type="button"
                  :disabled="!item.ImageURL"
                  :aria-label="`將 ${item.ID} 設為封面`"
                  :aria-pressed="chosenCover === item.ID"
                  @click="chooseCover(item)"
                >
                  {{ chosenCover === item.ID ? '✓ 已選封面' : '設為封面' }}
                </button>
              </article>
            </div>
          </section>
        </div>
      </fieldset>
    </template>
  </div>
</template>
<style scoped>
.collection-studio {
  padding-block: 20px 64px;
}
.studio-editor {
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}
.studio-access {
  padding: 24px 0;
}
.studio-access button,
.studio-access a {
  margin: 6px 10px 6px 0;
}
.studio-version {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-bottom: 20px;
  font-size: 12px;
}
.studio-version a,
.studio-access a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  color: var(--pri);
}
.studio-source {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  font-size: 12px;
}
.studio-breeder-mark {
  color: var(--pri);
}
.studio-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--bd);
  padding-bottom: 20px;
}
.studio-heading p,
.studio-note {
  font-size: 13px;
  color: var(--txt-muted);
  line-height: 1.7;
}
.studio-heading h1 {
  margin: 8px 0;
}
.collection-studio button {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  color: var(--txt);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}
.collection-studio button:disabled {
  opacity: 0.35;
  cursor: default;
}
.collection-studio .studio-save {
  background: var(--pri-btn);
  color: white;
  border-color: var(--pri-btn);
}
.studio-species {
  display: flex;
  gap: 8px;
  margin: 20px 0;
}
.studio-species button[aria-pressed='true'] {
  border-color: var(--pri);
  color: var(--pri);
}
.studio-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 32px;
}
.studio-sidebar {
  min-width: 0;
}
.collection-studio input:not([type='checkbox']) {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 8px;
  background: var(--card-bg-solid);
  border: 1px solid var(--bd);
  color: var(--txt);
  font: inherit;
  font-size: 16px;
}
.studio-create label,
.studio-selected label {
  display: grid;
  gap: 8px;
  font-size: 13px;
}
.studio-create > div {
  display: flex;
  gap: 6px;
  margin: 8px 0 16px;
}
.studio-create > div button {
  flex-shrink: 0;
  white-space: nowrap;
}
.studio-sidebar nav > button {
  width: 100%;
  text-align: left;
}
.studio-category-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px 44px;
  margin-top: 6px;
}
.studio-category-row > button:first-child {
  text-align: left;
  overflow-wrap: anywhere;
}
.studio-sidebar [aria-current] {
  color: var(--pri);
  border-color: var(--pri);
  background: color-mix(in srgb, var(--pri) 5%, var(--card-bg-solid));
}
.studio-selected {
  border-block: 1px solid var(--bd);
  padding: 16px 0;
  margin-top: 16px;
}
.studio-selected button {
  margin-top: 10px;
}
.studio-cover p {
  font-size: 13px;
}
.studio-cover-image,
.studio-photo {
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--card-bg);
}
.studio-cover-image :deep(img),
.studio-photo :deep(img),
.studio-photo :deep(.article-image-fallback) {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.studio-cover small {
  display: block;
  margin-top: 8px;
}
.studio-inventory {
  min-width: 0;
}
.studio-inventory header {
  margin-bottom: 20px;
}
.studio-inventory h2 {
  font-size: 20px;
  margin: 0 0 8px;
}
.studio-inventory p {
  color: var(--txt-muted);
  font-size: 13px;
  line-height: 1.7;
}
.studio-photo-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 18px 10px;
}
.studio-photo-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 5px;
  border: 1px solid transparent;
}
.studio-photo-card.is-cover {
  border-color: var(--pri);
}
.studio-photo-card strong {
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.studio-photo-card small {
  color: var(--txt-muted);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.studio-membership {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  min-height: 52px;
  padding: 10px 8px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.studio-membership input {
  width: 22px;
  height: 22px;
  margin: 0;
  flex: 0 0 22px;
  accent-color: var(--pri);
}
.studio-membership.is-member {
  border-color: var(--pri);
  color: var(--pri);
  background: color-mix(in srgb, var(--pri) 8%, var(--card-bg-solid));
}
.studio-membership-filters,
.studio-editing-modes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
.studio-membership-filters button[aria-pressed='true'],
.studio-editing-modes button[aria-pressed='true'] {
  color: var(--pri);
  border-color: var(--pri);
  background: color-mix(in srgb, var(--pri) 8%, var(--card-bg-solid));
}
.studio-filter-note {
  margin: 10px 0 0;
}
.studio-photo-card button {
  margin-top: auto;
}
.studio-status {
  border-left: 2px solid var(--pri);
  padding: 10px;
  font-size: 13px;
}
.collection-studio :is(input, button, select):focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
@media (max-width: 1100px) {
  .studio-photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 900px) {
  .studio-layout {
    grid-template-columns: 210px minmax(0, 1fr);
    gap: 20px;
  }
  .studio-photo-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 639px) {
  .studio-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .studio-cover {
    display: none;
  }
  .studio-heading .studio-save {
    width: 100%;
  }
}
</style>

<style scoped>
.collection-studio select {
  min-width: 0;
  max-width: 100%;
  width: 100%;
  min-height: 44px;
  padding: 8px;
  background: var(--card-bg-solid);
  color: var(--txt);
  border: 1px solid var(--bd);
  font: inherit;
  font-size: 16px;
}
.studio-selected > label + label {
  margin-top: 14px;
}
.studio-gene-choices {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  padding-top: 12px;
}
.studio-gene-choices label {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 36px;
}
</style>

<style scoped>
.studio-mobile-select,
.studio-order-mobile {
  display: none;
}
@media (max-width: 639px) {
  .studio-sidebar nav {
    display: none;
  }
  .studio-mobile-select {
    display: grid;
    gap: 8px;
    margin-bottom: 16px;
  }
  .studio-mobile-select select {
    min-height: 44px;
    padding: 8px;
    border: 1px solid var(--bd);
    background: var(--card-bg-solid);
    color: var(--txt);
    font: inherit;
  }
  .studio-order-mobile {
    display: flex;
    gap: 8px;
    margin-bottom: 14px;
  }
}
</style>
