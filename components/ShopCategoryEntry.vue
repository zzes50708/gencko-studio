<script setup>
import { computed, onMounted } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { buildShopCategories } from '~/utils/shop-categories'
import { getCleanUrl } from '~/utils/image'
const store = useMainStore()
const published = await useShopCollections()
const client = useSupabaseClient()
const species = useState('shop-entry-species', () => '豹紋守宮')
const onlyFavorites = useState('shop-only-favorites', () => false)
const onlyHistory = useState('shop-only-history', () => false)
const {
  data: initialItems,
  error,
  refresh
} = await useAsyncData('shop-entry-inventory', async () => {
  const { data, error } = await client
    .from('site_public_animals')
    .select('id,species,morph,genes,image_url,status')
    .in('status', ['ForSale', 'Reserved', 'Auction', 'Sold', 'SelfKeep'])
  if (error) throw error
  return (data || []).map((item) => ({
    ID: item.id,
    Species: item.species,
    Morph: item.morph,
    Genes: item.genes,
    ImageURL: item.image_url,
    Status: item.status
  }))
})
const inventory = computed(() => (store.inventoryLoaded ? store.inv : initialItems.value || []))
const categories = computed(() =>
  buildShopCategories(
    inventory.value,
    species.value,
    published.document.value.groups,
    published.document.value.covers
  )
)
const total = computed(() => categories.value.find((item) => item.id === 'all')?.count || 0)
const catalogLink = (category) => ({
  path: '/shop/all',
  query: {
    ...(species.value === '肥尾守宮' ? { sp: species.value } : {}),
    ...(category.id === 'all' ? {} : { group: category.id })
  }
})
onMounted(() => {
  store.ensureInventoryLoaded()
  onlyFavorites.value = false
  onlyHistory.value = false
  store.displayLimit = 20
})
useHead({
  title: '依品系選購守宮｜Gencko Studio',
  meta: [
    {
      name: 'description',
      content:
        '從實際個體照片探索豹紋守宮與肥尾守宮品系，依分類瀏覽現有個體，查看照片、價格與完整資料。'
    }
  ],
  link: [{ rel: 'canonical', href: 'https://www.genckobreeding.com/shop' }]
})
</script>
<template>
  <div
    class="site-document-page collection-entry"
    data-scroll-page="/shop"
    data-scroll-ready="true"
  >
    <header class="collection-header">
      <p class="collection-eyebrow">THE GECKO COLLECTION</p>
      <h1>依品系選購</h1>
      <p class="collection-lead">從喜歡的品系開始，找到想進一步認識的個體。</p>
      <NuxtLink no-prefetch :to="catalogLink({ id: 'all' })" class="collection-all">
        瀏覽全部個體
        <span aria-hidden="true">↗</span>
      </NuxtLink>
    </header>
    <p v-if="published.error.value" role="alert" class="collection-empty">
      分類設定暫時無法更新。
      <button type="button" @click="published.refresh()">重新載入分類</button>
    </p>
    <div class="collection-toolbar">
      <div class="collection-species" role="group" aria-label="選擇物種">
        <button
          v-for="name in ['豹紋守宮', '肥尾守宮']"
          :key="name"
          type="button"
          :aria-pressed="species === name"
          @click="species = name"
        >
          {{ name }}
        </button>
      </div>
      <span class="collection-count" role="status">{{ total }} 隻個體</span>
    </div>
    <div v-if="error && !inventory.length" class="collection-empty" role="alert">
      <p>分類資料暫時無法載入。</p>
      <button type="button" @click="refresh()">重新載入</button>
    </div>
    <div v-else-if="!total" class="collection-empty" role="status">
      <p>{{ store.loading ? '正在整理目前的個體…' : '這個物種目前暫無上架個體。' }}</p>
      <NuxtLink no-prefetch to="/shop/all">查看個體清單</NuxtLink>
    </div>
    <div class="collection-grid">
      <NuxtLink
        v-for="category in categories"
        :key="species + category.id"
        no-prefetch
        :to="catalogLink(category)"
        class="collection-tile"
        :aria-label="`${species}・${category.label}（${category.count} 隻）`"
      >
        <div class="collection-photo">
          <ArticleImage
            :src="category.image ? getCleanUrl(category.image, 900) : undefined"
            :alt="`${category.label}個體範例`"
            empty-text="分類照片尚未提供"
          />
        </div>
        <div class="collection-caption">
          <div>
            <h2>{{ category.label }}</h2>
            <span>{{ category.count }} 隻個體</span>
          </div>
          <span class="collection-direction" aria-hidden="true">↗</span>
        </div>
      </NuxtLink>
    </div>
    <footer class="collection-footnote">
      <p>同一個體可能出現在不同品系分類。照片為現有個體，發色請以最新紀錄為準。</p>
      <NuxtLink no-prefetch to="/buying-guide">
        購買流程
        <span aria-hidden="true">↗</span>
      </NuxtLink>
    </footer>
  </div>
</template>
<style scoped>
.collection-entry {
  padding-bottom: 48px;
}
.collection-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 16px;
  position: relative;
  padding: 10px 0 8px;
  border-bottom: 1px solid var(--bd);
}
.collection-eyebrow {
  font-size: 11px;
  letter-spacing: 0.16em;
  color: var(--pri);
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  grid-column: 1;
}
.collection-header h1 {
  margin: 0;
  line-height: 1.12;
  grid-column: 1;
  font-family: var(--font-heading-zh);
}
.collection-lead {
  color: var(--txt-muted);
  font-size: 15px;
  line-height: 1.35;
  margin: 0;
  grid-column: 1;
}
.collection-all {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  margin: 0;
  line-height: 1.2;
  grid-column: 2;
  grid-row: 1 / 4;
  align-self: center;
  color: var(--txt);
  border-bottom: 1px solid var(--txt);
  text-decoration: none;
  font-weight: 650;
}
.collection-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 4px 0;
}
.collection-species {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.collection-species button {
  min-height: 36px;
  padding: 4px 2px;
  background: none;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--txt-muted);
  font: inherit;
  line-height: 1.2;
  cursor: pointer;
}
.collection-species button[aria-pressed='true'] {
  border-color: var(--pri);
  color: var(--txt);
  font-weight: 700;
}
.collection-count {
  color: var(--txt-muted);
  font-size: 13px;
  white-space: nowrap;
}
.collection-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px 16px;
}
.collection-tile {
  color: var(--txt);
  min-width: 0;
  text-decoration: none;
}
.collection-photo {
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--card-bg);
  border-radius: 3px;
}
.collection-photo :deep(img),
.collection-photo :deep(.article-image-fallback) {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 500ms var(--motion-ease-out);
}
.collection-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--bd);
}
.collection-caption h2 {
  font: 650 15px/1.25 var(--font-body-zh);
  margin: 0 0 1px;
  overflow-wrap: anywhere;
}
.collection-caption div > span {
  color: var(--txt-muted);
  font-size: 12px;
  line-height: 1.2;
}
.collection-direction {
  font-size: 22px;
  transition: transform 240ms var(--motion-ease-out);
}
.collection-footnote {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  color: var(--txt-muted);
  font-size: 12px;
  line-height: 1.35;
}
.collection-footnote p {
  margin: 0;
}
.collection-footnote a {
  color: var(--txt);
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 18px;
}
.collection-empty {
  padding: 50px 0;
  color: var(--txt-muted);
}
.collection-empty :is(button, a) {
  min-height: 44px;
  padding: 10px;
}
.collection-entry :is(a, button):focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 4px;
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .collection-tile:hover .collection-photo :deep(img) {
    transform: scale(1.035);
  }
  .collection-tile:hover .collection-direction {
    transform: translate(2px, -2px);
  }
  .collection-tile:hover h2,
  .collection-all:hover {
    color: var(--pri);
  }
}
@media (max-width: 1023px) {
  .collection-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 539px) {
  .collection-header {
    grid-template-columns: minmax(0, 1fr);
    padding: 6px 0 4px;
  }
  .collection-all {
    grid-column: 1;
    grid-row: auto;
    justify-self: start;
    min-height: 44px;
  }
  .collection-lead {
    font-size: 13px;
  }
  .collection-grid {
    gap: 12px;
  }
  .collection-caption {
    padding: 5px 0;
    gap: 6px;
  }
  .collection-caption h2 {
    font-size: 15px;
  }
  .collection-toolbar {
    gap: 8px;
    padding: 2px 0;
  }
  .collection-species {
    gap: 12px;
    font-size: 14px;
  }
  .collection-species button {
    min-height: 44px;
  }
  .collection-count {
    font-size: 11px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .collection-photo :deep(img),
  .collection-direction {
    transition: none;
    transform: none !important;
  }
}
@media (max-width: 767px), (hover: none), (pointer: coarse) {
  .collection-all,
  .collection-species button {
    min-height: 44px;
  }
}
</style>
