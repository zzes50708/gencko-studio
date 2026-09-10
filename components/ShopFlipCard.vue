<script setup>
import { computed, ref } from 'vue'
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

const genderText = computed(() => {
  const t = normalizeSpace(props.item?.GenderType || '')
  if (!t) return '未登錄'
  if (t === '溫控') {
    const v = normalizeSpace(props.item?.GenderValue || '')
    return v ? `孵化溫度:${v}度（不保證性別）` : '孵化溫度（不保證性別）'
  }
  return t
})

const mobileGenderText = computed(() => genderText.value.replace('（不保證性別）', ''))
const isIncubationTemperature = computed(() => props.item?.GenderType === '溫控')

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
</script>

<template>
  <article class="flip-card card slim-card">
    <NuxtLink
      no-prefetch
      :to="linkTo"
      class="flip-card-link"
      :aria-label="`查看 ${item.Morph} 詳情`"
    >
      <span class="sr-only">查看 {{ item.Morph }} 詳情</span>
    </NuxtLink>

    <div class="flip-inner">
      <div class="flip-face flip-front">
        <div v-if="item.Status === 'Sold'" class="sold-stamp">SOLD</div>

        <div style="position: relative">
          <InteractiveGridPattern v-if="showInteractiveGrid" class="igp-overlay" />

          <div
            v-if="isWishlisted || isCompared"
            class="flip-front-indicators dt-only"
            aria-hidden="true"
          >
            <span v-if="isWishlisted" class="flip-indicator">已收藏</span>
            <span v-if="isCompared" class="flip-indicator">比較中</span>
          </div>

          <img
            v-if="item.ImageURL"
            :src="getCleanUrl(item.ImageURL, 400)"
            :alt="item.Morph"
            class="card-img slim-img flip-img"
            :class="{ 'flip-img--loaded': imgLoaded }"
            :loading="index < 6 ? 'eager' : 'lazy'"
            :fetchpriority="index < 6 ? 'high' : 'auto'"
            decoding="async"
            @load="onImgLoad"
          />
          <div
            v-else
            class="card-img slim-img"
            style="
              display: flex;
              align-items: center;
              justify-content: center;
              color: #333;
              font-size: 1rem;
              background: #000;
            "
          >
            無圖片
          </div>
        </div>

        <div class="card-body slim-body">
          <h3 class="slim-title" style="margin: 0">{{ item.Morph }}</h3>
          <div v-if="showMobileMeta" class="mobile-card-meta" aria-label="種群資料">
            <span v-if="genderText !== '未登錄'" class="mobile-card-meta__item">
              性別 {{ mobileGenderText }}
              <span v-if="isIncubationTemperature" class="mobile-card-meta__note">
                （不保證性別）
              </span>
            </span>
            <span v-if="birthdayText !== '未登錄'" class="mobile-card-meta__item">
              生日 {{ birthdayText }}
            </span>
            <span
              v-if="showMobileGenes && geneText"
              class="mobile-card-meta__item mobile-card-meta__item--gene"
            >
              {{ geneText }}
            </span>
          </div>
          <div class="slim-price-row" style="margin-top: 4px">
            <template v-if="item.Status === 'Sold'">
              <span class="status-badge s-sold">售出</span>
            </template>
            <template v-else-if="item.Status === 'Auction' && hasAuction">
              <span class="status-badge s-auction">競標中</span>
            </template>
            <template v-else-if="item.Status === 'SelfKeep'">
              <span v-if="showStatusBadge" class="status-badge s-nfs">自留</span>
            </template>
            <template v-else>
              <span v-if="store.isExhibitionMode" class="exhibition-note">
                {{ store.exhibitionNote }}
              </span>
              <div v-else class="price slim-price">${{ item.ListingPrice }}</div>
            </template>
          </div>
        </div>
      </div>

      <div class="flip-face flip-back" aria-hidden="true">
        <div class="flip-back-inner">
          <div class="flip-back-title">{{ item.Morph }}</div>
          <div class="flip-back-row">
            <span class="k">性別</span>
            <span class="v">{{ genderText }}</span>
          </div>
          <div class="flip-back-row">
            <span class="k">生日</span>
            <span class="v">{{ birthdayText }}</span>
          </div>
          <div v-if="uploadedText" class="flip-back-row">
            <span class="k">上傳</span>
            <span class="v">{{ uploadedText }}</span>
          </div>
          <div v-if="showBackPrice" class="flip-back-row">
            <span class="k">價格</span>
            <span class="v">{{ priceText }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 控制項與整卡連結同層，保持鍵盤與觸控操作獨立。 -->
    <div class="card-action-stack flip-front-actions">
      <button
        v-if="showWishlist"
        type="button"
        class="btn-app btn-app--ghost btn-app--xs btn-app--pill card-action-btn"
        :class="{ 'card-action-btn--active': isWishlisted }"
        @click="onToggleWishlist(item.ID)"
      >
        收藏
      </button>

      <button
        v-if="showCompare && item.Status !== 'Sold'"
        type="button"
        class="btn-app btn-app--ghost btn-app--xs btn-app--pill card-action-btn"
        :class="{ 'card-action-btn--active': isCompared }"
        :disabled="compareDisabled"
        @click="onToggleCompare(item.ID)"
        :title="isCompared ? '移出比較' : compareDisabled ? '最多 3 隻' : '加入比較'"
      >
        加入比較
      </button>
    </div>

    <div class="flip-back-actions flip-back-actions--overlay">
      <button
        v-if="showWishlist"
        type="button"
        class="btn-app btn-app--ghost btn-app--xs btn-app--pill flip-action-btn"
        :class="{ 'flip-action-btn--active': isWishlisted }"
        @click="onToggleWishlist(item.ID)"
      >
        收藏
      </button>

      <button
        v-if="showCompare && item.Status !== 'Sold'"
        type="button"
        class="btn-app btn-app--ghost btn-app--xs btn-app--pill flip-action-btn"
        :class="{ 'flip-action-btn--active': isCompared }"
        :disabled="compareDisabled"
        @click="onToggleCompare(item.ID)"
        :title="isCompared ? '移出比較' : compareDisabled ? '最多 3 隻' : '加入比較'"
      >
        加入比較
      </button>
    </div>
  </article>
</template>

<style scoped>
.flip-card {
  position: relative;
  perspective: 1200px;
}

.flip-card-link {
  position: absolute;
  inset: 0;
  z-index: 10;
  color: inherit;
  text-decoration: none;
}

.flip-card-link:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 3px;
}

.mobile-card-meta {
  display: none;
}

/* 展場模式：價格改顯示提示文字（#task4） */
.exhibition-note {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--pri);
}

.flip-inner {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
  height: 100%;
}

/* will-change 只在 hover 時才啟用，避免所有卡片同時佔用 GPU 合成層 */
@media (min-width: 769px) and (hover: hover) and (pointer: fine) {
  .flip-card:hover .flip-inner {
    will-change: transform;
  }
}

.flip-img {
  opacity: 0;
  transition: opacity 220ms ease;
}

.flip-img--loaded {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .flip-inner {
    transition: none;
  }

  .flip-img {
    transition: none;
    opacity: 1;
  }
}

.flip-face {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  height: 100%;
}

.flip-back {
  position: absolute;
  inset: 0;
  transform: rotateY(180deg);
  display: none; /* 預設不顯示，避免手機/無 hover 裝置出現背面 */
}

.flip-back-inner {
  height: 100%;
  padding: 14px 14px 12px 14px;
  background: var(--card-bg-solid);
  color: var(--txt);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
}

.flip-back-title {
  font-weight: 900;
  font-size: 0.95rem;
  color: var(--pri);
  text-align: center;
  margin-bottom: 2px;
}

.flip-back-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 0.82rem;
  line-height: 1.3;
}

.flip-back-row .k {
  opacity: 0.75;
  flex: 0 0 auto;
}

.flip-back-row .v {
  font-weight: 800;
  text-align: right;
  flex: 1 1 auto;
  /* 禁止 ... 省略：允許換行顯示完整內容 */
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
}

.flip-back-actions {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
  pointer-events: auto;
}

.flip-back-actions--overlay {
  display: none;
  position: absolute;
  right: 14px;
  bottom: 12px;
  left: 14px;
  z-index: 30;
}

.flip-action-btn {
  opacity: 1;
}

.flip-action-btn--active {
  border-color: var(--bd-hover-solid);
  color: var(--pri);
}

.flip-front-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  flex-direction: row;
  gap: 4px;
  z-index: 20;
}

.flip-front-indicators {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 20;
  pointer-events: none;
}

/* 互動格線：手機不顯示，桌機定位在圖片上層（低於按鈕） */
.igp-overlay {
  display: none;
}
@media (min-width: 769px) and (hover: hover) and (pointer: fine) {
  .igp-overlay {
    display: block;
    position: absolute;
    inset: 0;
    z-index: 3;
  }
}

/* 只在桌機顯示正面標示 */
.dt-only {
  display: none;
}
@media (min-width: 769px) and (hover: hover) and (pointer: fine) {
  .dt-only {
    display: flex;
  }
}

.flip-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.2px;
  color: #fff;
  background: rgba(232, 68, 10, 0.92);
  box-shadow: 0 8px 22px rgba(232, 68, 10, 0.22);
}

/* 手機/無 hover：白底黑字，已選擇維持主色 */
@media (hover: none), (pointer: coarse), (max-width: 768px) {
  .mobile-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 8px;
    margin-top: 5px;
    color: var(--txt);
    font-size: 0.7rem;
    line-height: 1.35;
    opacity: 0.75;
  }

  .mobile-card-meta__item {
    min-width: 0;
  }

  .mobile-card-meta__note {
    display: block;
    white-space: nowrap;
  }

  .mobile-card-meta__item--gene {
    flex-basis: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .flip-front-actions .card-action-btn {
    opacity: 1;
    padding: 2px 7px;
    font-size: 0.68rem;
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(0, 0, 0, 0.12);
    color: #111;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }

  .flip-front-actions .card-action-btn--active {
    background: var(--pri);
    border-color: var(--pri);
    color: #fff;
    box-shadow: 0 4px 12px rgba(232, 68, 10, 0.28);
  }
}

/* 僅限桌機：hover 翻牌 */
@media (min-width: 769px) and (hover: hover) and (pointer: fine) {
  .flip-back {
    display: block;
  }

  /* 桌機有背面按鈕時，正面就隱藏（避免重複） */
  .flip-front-actions {
    display: none;
  }

  .flip-card:hover .flip-inner,
  .flip-card:focus-within .flip-inner {
    transform: rotateY(180deg);
  }

  .flip-card:hover .flip-back-actions--overlay,
  .flip-card:focus-within .flip-back-actions--overlay {
    display: flex;
  }
}
</style>
