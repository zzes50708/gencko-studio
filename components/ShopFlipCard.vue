<script setup>
import { computed, ref, watch } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'
import { formatAnimalSex, formatAnimalPreviewSex } from '~/utils/incubation-sex'

const store = useMainStore()

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
  isWishlisted: { type: Boolean, default: false },
  isCompared: { type: Boolean, default: false },
  compareDisabled: { type: Boolean, default: false },
  hasAuction: { type: Boolean, default: false },
  showCompare: { type: Boolean, default: true },
  showWishlist: { type: Boolean, default: true },
  showStatusBadge: { type: Boolean, default: true },
  showBackPrice: { type: Boolean, default: true },
  showMobileMeta: { type: Boolean, default: true },
  showMobileGenes: { type: Boolean, default: true },
  showInteractiveGrid: { type: Boolean, default: true },
  onToggleWishlist: { type: Function, required: true },
  onToggleCompare: { type: Function, default: () => {} }
})

const linkTo = computed(() => `/product/${props.item.ID}`)

const normalizeSpace = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim()

const genderText = computed(() => formatAnimalSex(props.item))
const mobileGenderText = computed(() => formatAnimalPreviewSex(props.item))

const birthdayText = computed(() => {
  const b = normalizeSpace(props.item?.Birthday || '')
  return b || '未登錄'
})

const geneText = computed(() => {
  if (!Array.isArray(props.item?.Genes)) return ''
  return props.item.Genes.filter(Boolean).join(' · ')
})

const uploadedText = computed(() => {
  const raw = props.item?.PhotoUpdatedAt || props.item?.CreatedDate || ''
  const m = String(raw).match(/\d{4}-\d{2}-\d{2}/)
  return m ? m[0] : ''
})

const priceText = computed(() => {
  if (store.isExhibitionMode) return store.exhibitionNote
  if (props.item?.Status === 'Sold') return '售出'
  const p = props.item?.ListingPrice
  if (p === null || p === undefined || p === '') return '未登錄'
  return `NT$${p}`
})

const imgLoaded = ref(false)
const onImgLoad = () => {
  imgLoaded.value = true
}

const imageFailed = ref(false)
watch(
  () => props.item.ImageURL,
  () => {
    imageFailed.value = false
    imgLoaded.value = false
  }
)
const previewGenes = computed(() => (props.item.Genes || []).slice(0, 2))
const statusText = computed(
  () =>
    ({
      ForSale: '販售中',
      Sold: '已售出',
      Reserved: '已保留',
      Auction: '競標中',
      SelfKeep: '自留'
    })[props.item.Status] ||
    props.item.Status ||
    '未登錄'
)
const informationRows = computed(() => [
  ['編號', props.item.ID],
  ['物種', props.item.Species || '未登錄'],
  ['狀態', statusText.value],
  ['性別', genderText.value],
  ['生日', birthdayText.value],
  ['基因', geneText.value || '未登錄'],
  ['照片更新', uploadedText.value || '未登錄'],
  ...(props.item.Note ? [['備註', String(props.item.Note).trim()]] : [])
])
</script>
<template>
  <article class="flip-card card slim-card">
    <NuxtLink
      no-prefetch
      :to="linkTo"
      class="flip-card-link"
      :aria-label="`查看 ${item.Morph}（${item.ID}）詳情`"
    >
      <span class="sr-only">查看 {{ item.Morph }}（{{ item.ID }}）詳情</span>
    </NuxtLink>
    <div class="flip-inner">
      <div class="flip-face flip-front">
        <div class="card-photo">
          <img
            v-if="item.ImageURL && !imageFailed"
            :src="getCleanUrl(item.ImageURL, 400)"
            :alt="item.Morph"
            class="card-img slim-img flip-img"
            :class="{ 'flip-img--loaded': imgLoaded }"
            :loading="index < 6 ? 'eager' : 'lazy'"
            :fetchpriority="index < 6 ? 'high' : 'auto'"
            decoding="async"
            @load="onImgLoad"
            @error="imageFailed = true"
          />
          <div v-else class="card-image-placeholder">
            {{ imageFailed ? '照片暫時無法載入' : '尚無照片' }}
          </div>
          <span v-if="item.Status === 'Sold'" class="card-status">已售出</span>
          <span v-else-if="item.Status === 'Reserved'" class="card-status">已保留</span>
          <span v-else-if="item.Status === 'Auction' && hasAuction" class="card-status">
            競標中
          </span>
        </div>
        <div class="card-body slim-body">
          <span class="card-id">{{ item.ID }}</span>
          <h3 class="slim-title" :title="item.Morph">{{ item.Morph }}</h3>
          <div class="desktop-front-price price slim-price">{{ priceText }}</div>
          <div v-if="showMobileMeta" class="mobile-card-meta">
            <span aria-label="生日">{{ birthdayText }}</span>
            <span :title="genderText" aria-label="性別或孵化溫度">{{ mobileGenderText }}</span>
          </div>
          <div v-if="showMobileGenes && previewGenes.length" class="card-genes">
            <span v-for="gene in previewGenes" :key="gene">{{ gene }}</span>
            <span v-if="item.Genes.length > 2">+{{ item.Genes.length - 2 }}</span>
          </div>
        </div>
      </div>
      <div class="flip-face flip-back">
        <dl class="flip-back-information" :aria-label="`${item.Morph} 的完整資訊`">
          <div v-for="[label, value] in informationRows" :key="label" class="flip-back-row">
            <dt>{{ label }}</dt>
            <dd>{{ value }}</dd>
          </div>
        </dl>
      </div>
    </div>
    <div class="card-purchase-row">
      <div class="slim-price-row">
        <span v-if="item.Status === 'Sold'" class="status-badge">售出</span>
        <span v-else-if="item.Status === 'Auction' && hasAuction" class="status-badge">競標中</span>
        <span v-else-if="item.Status === 'SelfKeep' && showStatusBadge" class="status-badge">
          自留
        </span>
        <span v-else-if="store.isExhibitionMode" class="exhibition-note">
          {{ store.exhibitionNote }}
        </span>
        <span v-else class="price slim-price">${{ item.ListingPrice }}</span>
      </div>
      <div v-if="showWishlist || showCompare" class="card-action-stack flip-front-actions">
        <button
          v-if="showWishlist"
          type="button"
          class="card-action-btn"
          :class="{ 'card-action-btn--active': isWishlisted }"
          :aria-pressed="isWishlisted"
          :aria-label="isWishlisted ? '已收藏' : '收藏'"
          @click="onToggleWishlist(item.ID)"
        >
          <span class="action-text">{{ isWishlisted ? '已收藏' : '收藏' }}</span>
          <span class="action-icon" aria-hidden="true">{{ isWishlisted ? '♥' : '♡' }}</span>
        </button>
        <button
          v-if="showCompare && item.Status !== 'Sold'"
          type="button"
          class="card-action-btn"
          :class="{ 'card-action-btn--active': isCompared }"
          :aria-pressed="isCompared"
          :aria-label="isCompared ? '移出比較' : '加入比較'"
          :disabled="compareDisabled"
          :title="compareDisabled ? '最多比較三隻，請先移除一隻' : undefined"
          @click="onToggleCompare(item.ID)"
        >
          <span class="action-text">{{ isCompared ? '移出比較' : '加入比較' }}</span>
          <span class="action-icon" aria-hidden="true">⇄</span>
        </button>
      </div>
    </div>
  </article>
</template>
<style scoped>
.flip-card {
  position: relative;
  min-width: 0;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  display: flex;
  flex-direction: column;
}
.flip-card-link {
  position: absolute;
  inset: 0;
  z-index: 1;
}
.flip-card-link:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: -3px;
}
.flip-inner {
  flex: 1;
  transform: none;
  transition: none;
}
.flip-back,
.desktop-front-price {
  display: none;
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  .flip-card {
    perspective: 1200px;
  }
  .flip-inner {
    display: grid;
    transform-style: preserve-3d;
    transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .flip-face {
    grid-area: 1 / 1;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    min-width: 0;
  }
  .flip-card:hover .flip-inner,
  .flip-card:focus-within .flip-inner {
    transform: rotateY(180deg);
    will-change: transform;
  }
  .flip-back {
    display: block;
    transform: rotateY(180deg);
    background: var(--card-bg-solid);
  }
  .flip-front .card-id,
  .flip-front .card-status,
  .flip-front .mobile-card-meta,
  .flip-front .card-genes,
  .card-purchase-row > .slim-price-row {
    display: none;
  }
  .desktop-front-price {
    display: block;
    margin-top: 6px;
  }
  .slim-title {
    font-size: 15px !important;
  }
}
.flip-back-information {
  margin: 0;
  padding: 12px;
  display: grid;
  gap: 7px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--txt);
}
.flip-back-row {
  display: grid;
  grid-template-columns: 4em minmax(0, 1fr);
  gap: 6px;
}
.flip-back-row dt {
  color: var(--txt-muted);
}
.flip-back-row dd {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
@media (prefers-reduced-motion: reduce) {
  .flip-inner {
    transition: none;
  }
}
.flip-face {
  height: 100%;
}
.card-photo {
  position: relative;
  aspect-ratio: 1;
}
.card-photo img,
.card-image-placeholder {
  display: block;
  width: 100%;
  height: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}
.card-image-placeholder {
  display: grid;
  place-items: center;
  background: var(--bg);
  color: var(--txt-muted);
  font-size: 12px;
  padding: 10px;
  text-align: center;
}
.card-status {
  position: absolute;
  top: 8px;
  left: 8px;
  background: var(--card-bg-solid);
  color: var(--txt);
  padding: 3px 7px;
  font-size: 12px;
  border: 1px solid var(--bd);
}
.slim-body {
  padding: 10px !important;
}
.card-id {
  font-size: 11px;
  color: var(--txt-muted);
  font-variant-numeric: tabular-nums;
}
.slim-title {
  font-size: 17px !important;
  line-height: 1.4;
  margin: 3px 0 5px !important;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  color: var(--txt);
}
.mobile-card-meta {
  display: none;
  color: var(--txt-muted);
}
.card-genes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 5px 0;
  color: var(--txt-muted);
  font-size: 11px;
}
.card-genes span {
  padding: 1px 4px;
  background: var(--bg);
  border: 1px solid var(--bd);
}
.slim-price-row {
  display: flex;
  flex-wrap: wrap;
  margin-top: 6px;
  padding: 0 !important;
  min-width: 0;
}
.slim-price {
  font-size: 20px !important;
  line-height: 1.4;
  max-width: none !important;
  white-space: nowrap;
  overflow: visible !important;
  text-overflow: clip !important;
  font-variant-numeric: tabular-nums;
}
.exhibition-note {
  font-size: 13px;
  overflow-wrap: anywhere;
}
.flip-front-actions {
  position: relative;
  inset: auto;
  display: flex !important;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 4px;
  padding: 0 10px 8px;
  z-index: 2;
}
.card-action-btn {
  min-height: 32px;
  min-width: 40px;
  padding: 4px 7px;
  font-size: 12px;
  line-height: 1.2;
  color: var(--txt);
  background: var(--card-bg-solid);
  border: 1px solid var(--bd);
  border-radius: 2px;
  cursor: pointer;
}
.card-action-btn--active {
  background: var(--pri);
  border-color: var(--pri);
  color: white;
}
.card-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.card-action-btn:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
.flip-img {
  opacity: 0;
}
.flip-img--loaded {
  opacity: 1;
}
.action-icon {
  display: none;
}
.card-purchase-row > .slim-price-row {
  padding: 0 10px 8px !important;
}
@media (max-width: 767px) {
  .flip-card {
    align-self: stretch;
    height: auto;
  }
  .flip-inner {
    flex: none;
  }
  .slim-body > .card-id,
  .slim-body > .card-genes {
    display: none;
  }
  .slim-title {
    height: 2.8em;
    min-height: 2.8em;
    overflow-wrap: anywhere;
    margin: 0 !important;
  }
  .card-purchase-row {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    padding: 0 6px 2px;
    margin-top: auto;
  }
  .card-purchase-row > .slim-price-row {
    flex: none;
    margin: 0;
    padding: 0 !important;
  }
  .card-purchase-row .flip-front-actions {
    padding: 0;
    flex-wrap: nowrap;
    gap: 2px;
    flex-shrink: 0;
    justify-content: center;
    margin-inline: auto;
  }
  .card-purchase-row .card-action-btn {
    width: 44px;
    min-width: 44px;
    padding: 0;
    border: 0;
  }
  .action-text {
    display: none;
  }
  .action-icon {
    display: inline;
    font-size: 21px;
  }

  .slim-body {
    padding: 6px !important;
  }
  .slim-title {
    font-size: 12px !important;
  }
  .slim-price {
    font-size: 13px !important;
    line-height: 1.3;
  }
  .flip-front-actions {
    padding: 0 8px 8px;
    gap: 4px;
  }
  .card-action-btn {
    font-size: 11px;
    min-height: 44px;
    padding: 4px 5px;
  }
  .mobile-card-meta {
    display: grid;
    grid-template-rows: repeat(2, 1.5em);
    margin-top: 3px;
    font-size: 10px;
    line-height: 1.5;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .card-id {
    font-size: 10px;
  }
  .card-genes {
    font-size: 10px;
  }
}
@media (max-width: 359px) {
  .card-purchase-row {
    padding-inline: 0;
  }
  .card-purchase-row > .slim-price-row {
    padding-inline: 6px !important;
  }
  .card-purchase-row .flip-front-actions {
    gap: 0;
  }
}
@media (pointer: coarse) and (min-width: 768px) {
  .card-action-btn {
    min-height: 40px;
  }
}
</style>
