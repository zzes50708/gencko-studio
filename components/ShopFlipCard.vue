<script setup>
import { computed, ref, watch } from 'vue'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image'

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
  showMobileMeta: { type: Boolean, default: false },
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

const incubationProbability = (value) => {
  const temperature = Number.parseFloat(String(value || ''))
  if (!Number.isFinite(temperature)) return ''
  if (temperature >= 31) return '90%公'
  if (temperature >= 30) return '75%公'
  if (temperature >= 28) return '公母均等'
  if (temperature >= 27) return '75%母'
  return '90%母'
}

const genderText = computed(() => {
  const t = normalizeSpace(props.item?.GenderType || '')
  if (!t) return '未登錄'
  if (t === '溫控') {
    const v = normalizeSpace(props.item?.GenderValue || '')
    const probability = incubationProbability(v)
    return v
      ? `孵化溫度:${v}度${probability ? `（${probability}，不保證性別）` : '（不保證性別）'}`
      : '孵化溫度（不保證性別）'
  }
  return t
})

const isIncubationTemperature = computed(() => props.item?.GenderType === '溫控')
const mobileGenderText = computed(() => {
  if (!isIncubationTemperature.value) return genderText.value
  const value = normalizeSpace(props.item?.GenderValue || '')
  const probability = incubationProbability(value)
  return value ? `孵化溫度:${value}度${probability ? `（${probability}）` : ''}` : '孵化溫度'
})

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
const birthYear = computed(() => String(props.item.Birthday || '').match(/\d{4}/)?.[0] || '')
const previewGenes = computed(() => (props.item.Genes || []).slice(0, 2))
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
          <div v-if="showMobileMeta" class="mobile-card-meta">
            <span :title="genderText">
              {{ isIncubationTemperature ? mobileGenderText : genderText }}
              <small v-if="isIncubationTemperature">不保證性別</small>
            </span>
            <span v-if="birthYear">{{ birthYear }} 年出生</span>
          </div>
          <div v-if="showMobileGenes && previewGenes.length" class="card-genes">
            <span v-for="gene in previewGenes" :key="gene">{{ gene }}</span>
            <span v-if="item.Genes.length > 2">+{{ item.Genes.length - 2 }}</span>
          </div>
        </div>
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
    <details class="mobile-card-details">
      <summary :aria-label="`查看 ${item.Morph} 的基本資訊`">基本資訊</summary>
      <div class="mobile-card-details-body">
        <span>編號：{{ item.ID }}</span>
        <span>
          {{ isIncubationTemperature ? mobileGenderText : genderText }}
          <template v-if="isIncubationTemperature">，不保證性別</template>
        </span>
        <span v-if="birthYear">{{ birthYear }} 年出生</span>
        <span v-if="geneText">{{ geneText }}</span>
      </div>
    </details>
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
  transform: none !important;
  transition: none;
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
  display: flex;
  flex-wrap: wrap;
  gap: 3px 8px;
  line-height: 1.45;
  font-size: 12px;
  color: var(--txt-muted);
}
.mobile-card-meta small {
  font-size: 11px;
  display: block;
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
.mobile-card-details,
.action-icon {
  display: none;
}
.card-purchase-row > .slim-price-row {
  padding: 0 10px 8px !important;
}
@media (max-width: 767px) {
  .flip-card {
    align-self: start;
    height: auto;
  }
  .flip-inner {
    flex: none;
  }
  .slim-body > .card-id,
  .slim-body > .mobile-card-meta,
  .slim-body > .card-genes {
    display: none;
  }
  .slim-title {
    min-height: 0;
    margin: 0 !important;
  }
  .card-purchase-row {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 0 6px 2px;
  }
  .card-purchase-row > .slim-price-row {
    flex: 1;
    margin: 0;
    padding: 0 !important;
  }
  .card-purchase-row .flip-front-actions {
    padding: 0;
    flex-wrap: nowrap;
    gap: 2px;
    flex-shrink: 0;
  }
  .card-purchase-row .card-action-btn {
    width: 32px;
    min-width: 32px;
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
  .mobile-card-details {
    display: block;
    position: relative;
    z-index: 2;
    border-top: 1px solid var(--bd);
    margin: 0 8px;
  }
  .mobile-card-details summary {
    min-height: 32px;
    padding: 6px 0;
    cursor: pointer;
    font-size: 11px;
    color: var(--txt-muted);
  }
  .mobile-card-details summary:focus-visible {
    outline: 2px solid var(--pri);
  }
  .mobile-card-details-body {
    display: grid;
    gap: 4px;
    padding: 2px 0 8px;
    font-size: 11px;
    overflow-wrap: anywhere;
    color: var(--txt-muted);
  }

  .slim-body {
    padding: 8px !important;
  }
  .slim-title {
    font-size: 14px !important;
  }
  .slim-price {
    font-size: 17px !important;
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
    font-size: 11px;
  }
  .card-id {
    font-size: 10px;
  }
  .card-genes {
    font-size: 10px;
  }
}
@media (pointer: coarse) and (min-width: 768px) {
  .card-action-btn {
    min-height: 40px;
  }
}
</style>
