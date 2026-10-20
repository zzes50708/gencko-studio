<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import {
  listingError,
  parseTaipeiDateTime,
  taipeiDateTime,
  restoreListingIntent,
  nextAuctionSchedule,
  AUCTION_SHIPPING,
  AUCTION_FEEDING_OPTIONS
} from '~/utils/auction-listing'
import { getCleanUrl } from '~/utils/image'
const props = defineProps({ ownerId: { type: String, required: true } })
const emit = defineEmits(['created', 'cancel'])
const store = useMainStore()
const supabase = useSupabaseClient()
const query = ref('')
const candidates = ref([])
const selected = ref(null)
const heading = ref(null)
const message = ref('')
const busy = ref(false)
const searching = ref(false)
const searchFailed = ref(false)
const intent = ref(null)
const defaultSchedule = nextAuctionSchedule(store.auctionNow())
const form = reactive({
  animalId: '',
  startPrice: 200,
  increment: 100,
  mode: 'scheduled',
  startTime: defaultSchedule.startTime,
  endTime: defaultSchedule.endTime,
  note: '',
  shipping: AUCTION_SHIPPING,
  diet: '冷凍蟋蟀/杜比亞',
  frequency: AUCTION_FEEDING_OPTIONS[0],
  tongs: '是'
})
let alive = true
let searchRevision = 0
const storageKey = `auction-listing-pending:${props.ownerId}`
function saveIntent(value) {
  try {
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value))
    else sessionStorage.removeItem(storageKey)
  } catch {
    /* 儲存受限仍沿用目前頁面的同筆請求。 */
  }
}
async function searchAnimals() {
  if (intent.value || busy.value) return
  const request = ++searchRevision
  searching.value = true
  searchFailed.value = false
  message.value = ''
  try {
    const { data, error } = await supabase.rpc('admin_auction_candidates', {
      p_query: query.value.trim()
    })
    if (!alive || request !== searchRevision) return
    if (error) throw error
    if (
      !Array.isArray(data) ||
      data.some(
        (animal) =>
          !animal ||
          typeof animal.id !== 'string' ||
          !animal.id.trim() ||
          (typeof animal.morph !== 'string' && animal.morph !== null)
      )
    )
      throw Error('個體搜尋回應不完整')
    candidates.value = data
  } catch {
    if (alive && request === searchRevision) {
      candidates.value = []
      searchFailed.value = true
      message.value = '個體搜尋失敗，請確認管理權限後重試。'
    }
  } finally {
    if (alive && request === searchRevision) searching.value = false
  }
}
function selectAnimal(animal) {
  selected.value = animal
  form.animalId = animal.id
}
async function publish() {
  if (busy.value) return
  message.value = ''
  if (!intent.value) {
    const error = listingError(form, store.auctionNow())
    if (error) {
      message.value = error
      return
    }
    intent.value = {
      p_request_id: crypto.randomUUID(),
      p_animal_id: form.animalId,
      p_start_price: form.startPrice,
      p_min_increment: form.increment,
      p_start_time: form.mode === 'scheduled' ? parseTaipeiDateTime(form.startTime) : null,
      p_end_time: parseTaipeiDateTime(form.endTime),
      p_note: form.note.trim(),
      p_shipping_info: AUCTION_SHIPPING,
      p_diet: form.diet.trim(),
      p_feeding_freq: form.frequency.trim(),
      p_tongs_fed: form.tongs
    }
    saveIntent(intent.value)
  }
  busy.value = true
  try {
    const { data, error } = await supabase.rpc('admin_create_auction', intent.value)
    if (!alive) return
    if (error) {
      const validationMessages = new Set([
        '請設定有效的開標與結標時間，結標須晚於開標',
        '起標價須為非負整數，最低增額須為正整數',
        '場次說明文字過長',
        '此個體目前不能上架競標，請重新選取',
        '此個體已有尚未結束的場次',
        '此個體尚有未結束場次或待處理交易，請先處理原場次',
        '請先在個體資料補齊品系',
        '此個體尚無有效照片，請先補齊照片'
      ])
      if (error.code === '22023' && validationMessages.has(error.message)) {
        intent.value = null
        saveIntent(null)
        message.value = error.message
        return
      }
      throw error
    }
    if (data?.id !== `A-${intent.value.p_request_id}`) throw Error('回執不完整')
    saveIntent(null)
    intent.value = null
    emit('created', data.id)
  } catch {
    if (alive)
      message.value = '上架結果尚未確認，請重試同一筆上架，或返回場次列表核對。請勿另建相同個體。'
  } finally {
    if (alive) busy.value = false
  }
}
onMounted(() => {
  heading.value?.focus()
  try {
    const saved = restoreListingIntent(sessionStorage.getItem(storageKey))
    if (saved) {
      Object.assign(form, {
        animalId: saved.p_animal_id,
        startPrice: saved.p_start_price,
        increment: saved.p_min_increment,
        mode: saved.p_start_time ? 'scheduled' : 'now',
        startTime: saved.p_start_time ? taipeiDateTime(Date.parse(saved.p_start_time)) : '',
        endTime: taipeiDateTime(Date.parse(saved.p_end_time)),
        note: saved.p_note || '',
        shipping: saved.p_shipping_info || '',
        diet: saved.p_diet || '',
        frequency: saved.p_feeding_freq || '',
        tongs: saved.p_tongs_fed || '未確認'
      })
      intent.value = saved
      message.value = '有一筆上架結果待確認，請重試同一筆上架或核對場次列表。'
      return
    }
    saveIntent(null)
  } catch {
    saveIntent(null)
  }
  void searchAnimals()
})
onBeforeUnmount(() => {
  alive = false
  searchRevision++
  candidates.value = []
  selected.value = null
})
</script>
<template>
  <section class="listing" aria-label="新增競標場次">
    <div class="listing-heading">
      <h2 ref="heading" tabindex="-1">新增競標場次</h2>
      <button type="button" :disabled="busy" @click="emit('cancel')">返回場次列表</button>
    </div>
    <p>選取個體後自動帶入照片、品系與性別。上架時會將該個體轉為競標狀態。</p>
    <form @submit.prevent="publish" novalidate>
      <fieldset :disabled="busy || !!intent">
        <legend>1. 選取個體</legend>
        <div class="animal-search">
          <label>
            個體 ID 或品系
            <input
              v-model="query"
              maxlength="80"
              type="search"
              @keydown.enter.prevent="searchAnimals"
            />
          </label>
          <button type="button" :disabled="searching" @click="searchAnimals">搜尋個體</button>
        </div>
        <p v-if="searching" role="status">搜尋中…</p>
        <p v-else-if="!searchFailed && !candidates.length">
          找不到可上架個體，請換個 ID 或確認個體狀態。
        </p>
        <p v-else-if="!searchFailed && candidates.length === 30">
          目前顯示前 30 隻，請輸入更完整的 ID 或品系縮小搜尋。
        </p>
        <div class="candidate-list">
          <button
            v-for="animal in candidates"
            :key="animal.id"
            type="button"
            :aria-pressed="form.animalId === animal.id"
            @click="selectAnimal(animal)"
          >
            <strong>{{ animal.id }}</strong>
            <span>{{ animal.morph }}</span>
          </button>
        </div>
        <div v-if="selected" class="selected-animal">
          <img
            v-if="selected.images?.[0] || selected.image_url"
            :src="getCleanUrl(selected.images?.[0] || selected.image_url)"
            alt="選取個體的封面照片"
          />
          <p>
            <strong>{{ selected.id }} · {{ selected.morph }}</strong>
            <br />
            {{ selected.gender_type }} {{ selected.gender_value }} ·
            {{ selected.birthday || '未填生日' }}
          </p>
        </div>
      </fieldset>
      <fieldset :disabled="busy || !!intent">
        <legend>2. 金額與時間</legend>
        <div class="form-grid">
          <label>
            起標價（元）
            <input
              v-model.number="form.startPrice"
              type="number"
              min="0"
              step="100"
              inputmode="numeric"
            />
          </label>
          <label>
            最低增額（元）
            <input
              v-model.number="form.increment"
              type="number"
              min="100"
              step="100"
              inputmode="numeric"
            />
          </label>
          <label>
            開標方式
            <select v-model="form.mode" aria-label="開標方式">
              <option value="now">立即開標</option>
              <option value="scheduled">預約開標</option>
            </select>
          </label>
          <label v-if="form.mode === 'scheduled'">
            開標時間（台灣）
            <input v-model="form.startTime" type="datetime-local" />
          </label>
          <label>
            結標時間（台灣）
            <input v-model="form.endTime" type="datetime-local" />
          </label>
        </div>
        <p>
          預設下週一 10:00 開標、同週六 22:00 結標（台灣時間），特殊情況可調整。結標前 3
          分鐘有效出價會延長 3 分鐘。
        </p>
      </fieldset>
      <fieldset :disabled="busy || !!intent">
        <legend>3. 飼養與領標資訊</legend>
        <div class="form-grid">
          <label>
            夾餵
            <select v-model="form.tongs" aria-label="夾餵">
              <option>是</option>
              <option>否</option>
              <option>未確認</option>
            </select>
          </label>
          <label>
            餌料
            <input v-model="form.diet" maxlength="200" />
          </label>
          <label>
            餵食頻率
            <select v-model="form.frequency" aria-label="餵食頻率">
              <option
                v-for="frequency in AUCTION_FEEDING_OPTIONS"
                :key="frequency"
                :value="frequency"
              >
                {{ frequency }}
              </option>
            </select>
          </label>
        </div>
        <p>運送／面交：{{ form.shipping }}</p>
        <label>
          個體注意事項
          <textarea v-model="form.note" maxlength="3000" rows="3" />
        </label>
      </fieldset>
      <p role="status">{{ message }}</p>
      <p v-if="intent">
        待確認個體：{{ intent.p_animal_id }} · 起標 NT$
        {{ intent.p_start_price }}。重試會沿用同一請求編號，避免重複上架。
      </p>
      <button class="publish" type="submit" :disabled="busy">
        {{ busy ? '確認上架中…' : intent ? '重試同一筆上架' : '確認上架' }}
      </button>
    </form>
  </section>
</template>
<style scoped>
.listing {
  border: 1px solid var(--bd, #ddd);
  padding: 16px;
  margin-block: 16px;
  border-radius: 6px;
}
.listing-heading,
.animal-search,
.selected-animal {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}
.listing-heading h2 {
  margin: 0;
  font-size: 1.3rem;
}
.listing p {
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
fieldset {
  min-width: 0;
  padding: 16px 0;
  margin: 0;
  border: 0;
  border-bottom: 1px solid var(--bd, #ddd);
}
legend {
  font-weight: 700;
  padding-top: 12px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 0.875rem;
  min-width: 0;
}
input,
select,
textarea,
button {
  font: inherit;
  font-size: 1rem;
  color: inherit;
  background: var(--bg, #fff);
  border: 1px solid var(--bd, #ccc);
  border-radius: 4px;
  min-height: 44px;
  padding: 9px 12px;
  box-sizing: border-box;
  max-width: 100%;
}
input,
select,
textarea {
  width: 100%;
  min-width: 0;
}
button {
  cursor: pointer;
}
button:disabled {
  opacity: 0.6;
  cursor: wait;
}
button[aria-pressed='true'] {
  border: 2px solid var(--pri, #bd3b20);
}
.candidate-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  max-height: 240px;
  overflow: auto;
  margin-block: 12px;
}
.candidate-list button {
  text-align: left;
  overflow-wrap: anywhere;
}
.candidate-list span {
  display: block;
  font-size: 0.85rem;
}
.selected-animal {
  justify-content: flex-start;
}
.selected-animal img {
  width: 90px;
  height: 90px;
  object-fit: cover;
  border-radius: 4px;
}
.publish {
  margin-top: 12px;
  background: var(--pri, #bd3b20);
  color: #fff;
  padding-inline: 24px;
}
@media (max-width: 480px) {
  .form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .listing {
    padding: 12px;
  }
}
</style>
