<script setup>
import { computed } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'
import { formatAnimalPreviewSex } from '~/utils/incubation-sex'
const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
  isWishlisted: Boolean,
  isCompared: Boolean,
  compareDisabled: Boolean,
  hasAuction: Boolean,
  showSpecies: Boolean,
  onToggleWishlist: { type: Function, required: true },
  onToggleCompare: { type: Function, required: true }
})
const store = useMainStore()
const sex = computed(() => formatAnimalPreviewSex(props.item))
const status = computed(
  () =>
    ({ Sold: '已售出', Reserved: '已預訂', Auction: props.hasAuction ? '競標中' : '' })[
      props.item.Status
    ] || ''
)
const price = computed(() => {
  if (store.isExhibitionMode && props.item.Status !== 'Sold') return store.exhibitionNote
  if (props.item.Status === 'Auction' && props.hasAuction) return '查看競標'
  const amount = props.item.ListingPrice
  return amount === null || amount === undefined || amount === ''
    ? '售價未登錄'
    : `NT$ ${Number(amount).toLocaleString('zh-TW')}`
})
</script>
<template>
  <article class="catalog-card">
    <NuxtLink
      no-prefetch
      :to="`/product/${item.ID}`"
      class="catalog-card-photo"
      :aria-label="`查看 ${item.Morph}（${item.ID}）`"
    >
      <ArticleImage
        :src="item.ImageURL ? getCleanUrl(item.ImageURL, 800) : undefined"
        :alt="`${item.Morph}（${item.ID}）`"
        :loading="index < 4 ? 'eager' : 'lazy'"
      />
      <span v-if="status" class="catalog-card-status">{{ status }}</span>
    </NuxtLink>
    <NuxtLink no-prefetch :to="`/product/${item.ID}`" class="catalog-card-name">
      <h2>{{ item.Morph }}</h2>
    </NuxtLink>
    <p class="catalog-card-meta">
      <span v-if="showSpecies">{{ item.Species }}</span>
      <span>{{ item.ID }}</span>
      <span>{{ sex }}</span>
    </p>
    <div class="catalog-card-footer">
      <p class="catalog-card-price">{{ price }}</p>
      <div class="catalog-card-actions">
        <button
          type="button"
          :aria-label="isWishlisted ? '取消收藏' : '收藏'"
          :aria-pressed="isWishlisted"
          @click="onToggleWishlist(item.ID)"
        >
          <span aria-hidden="true">{{ isWishlisted ? '♥' : '♡' }}</span>
        </button>
        <button
          type="button"
          :aria-label="isCompared ? '移出比較' : '加入比較'"
          :aria-pressed="isCompared"
          :disabled="compareDisabled"
          @click="onToggleCompare(item.ID)"
        >
          <span aria-hidden="true">⇄</span>
        </button>
      </div>
    </div>
  </article>
</template>
<style scoped>
.catalog-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.catalog-card-photo {
  display: block;
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: var(--card-bg);
  border-radius: 3px;
}
.catalog-card-photo :deep(img),
.catalog-card-photo :deep(.article-image-fallback) {
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: transform 400ms var(--motion-ease-out);
}
.catalog-card-status {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 7px;
  background: var(--card-bg-solid);
  color: var(--txt);
  font-size: 11px;
}
.catalog-card-name {
  color: var(--txt);
  text-decoration: none;
  margin-top: 4px;
}
.catalog-card-name h2 {
  font: 600 15px/1.2 var(--font-body-zh);
  margin: 0;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.catalog-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  color: var(--txt-muted);
  font-size: 12px;
  margin: 2px 0;
  line-height: 1.2;
  overflow-wrap: anywhere;
}
.catalog-card-footer {
  margin-top: auto;
}
.catalog-card-price {
  font-size: 15px;
  font-weight: 650;
  margin: 2px 0 0;
  line-height: 1.2;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
.catalog-card-actions {
  display: flex;
  gap: 0;
}
.catalog-card-actions button {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--txt-muted);
  font-size: 21px;
  cursor: pointer;
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .catalog-card-actions button {
    min-height: 32px;
    min-width: 36px;
    font-size: 19px;
  }
}
.catalog-card-actions button[aria-pressed='true'] {
  color: var(--pri);
}
.catalog-card-actions button:disabled {
  opacity: 0.35;
  cursor: default;
}
.catalog-card :is(a, button):focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .catalog-card-photo:hover :deep(img) {
    transform: scale(1.035);
  }
  .catalog-card-name:hover {
    color: var(--pri);
  }
  .catalog-card-actions button:not(:disabled):hover {
    color: var(--pri);
    background: var(--card-bg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .catalog-card-photo :deep(img) {
    transition: none;
    transform: none !important;
  }
}
</style>
