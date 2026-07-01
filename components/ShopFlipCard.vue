<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const router = useRouter()
const store = useMainStore()

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 },
  isWishlisted: { type: Boolean, default: false },
  isCompared: { type: Boolean, default: false },
  compareDisabled: { type: Boolean, default: false },
  hasAuction: { type: Boolean, default: false },
  showCompare: { type: Boolean, default: true },
  showStatusBadge: { type: Boolean, default: true },
  showBackPrice: { type: Boolean, default: true },
  onToggleWishlist: { type: Function, required: true },
  onToggleCompare: { type: Function, default: () => {} }
})

const linkTo = computed(() => `/product/${props.item.ID}`)

const normalizeSpace = (s) =>
  String(s || '')
    .replace(/\s+/g, ' ')
    .trim()

// 已售/自留個體導向同品系在售搜尋，避免卡片成為死路（#U4）
const findSimilar = () => {
  const kw = normalizeSpace(props.item?.Morph || '')
  router.push(kw ? { path: '/shop', query: { kw } } : { path: '/shop' })
}

const genderText = computed(() => {
  const t = normalizeSpace(props.item?.GenderType || '')
  if (!t) return '未登錄'
  if (t === '溫控') {
    const v = normalizeSpace(props.item?.GenderValue || '')
    return v ? `溫控 ${v}°C` : '溫控'
  }
  return t
})

const birthdayText = computed(() => {
  const b = normalizeSpace(props.item?.Birthday || '')
  return b || '未登錄'
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
  <NuxtLink
    :to="linkTo"
    class="flip-card card slim-card"
    style="text-decoration: none; color: inherit"
  >
    <div class="flip-inner">
      <!-- 正面 -->
      <div class="flip-face flip-front">
        <div v-if="item.Status === 'Sold'" class="sold-stamp">SOLD</div>

        <div style="position: relative">
          <!-- 桌機限定：互動格線 hover 特效 -->
          <InteractiveGridPattern class="igp-overlay" />

          <!-- 桌機：背面按鈕已選擇時，正面也要有標示（手機不顯示，避免重複） -->
          <div
            v-if="isWishlisted || isCompared"
            class="flip-front-indicators dt-only"
            aria-hidden="true"
          >
            <span v-if="isWishlisted" class="flip-indicator">已收藏</span>
            <span v-if="isCompared" class="flip-indicator">比較中</span>
          </div>

          <!-- 手機/無 hover：按鈕維持在照片上（因為沒有背面翻牌） -->
          <div class="card-action-stack flip-front-actions">
            <button
              type="button"
              class="btn-app btn-app--ghost btn-app--xs btn-app--pill card-action-btn"
              :class="{ 'card-action-btn--active': isWishlisted }"
              @click.stop.prevent="onToggleWishlist(item.ID)"
            >
              收藏
            </button>

            <button
              v-if="showCompare && item.Status !== 'Sold'"
              type="button"
              class="btn-app btn-app--ghost btn-app--xs btn-app--pill card-action-btn"
              :class="{ 'card-action-btn--active': isCompared }"
              :disabled="compareDisabled"
              @click.stop.prevent="onToggleCompare(item.ID)"
              :title="isCompared ? '移出比較' : compareDisabled ? '最多 3 隻' : '加入比較'"
            >
              加入比較
            </button>
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

          <div v-if="item.Status === 'ForSale'" class="trust-badge">100% 健康</div>
        </div>

        <div class="card-body slim-body">
          <h3 class="slim-title" style="margin: 0">{{ item.Morph }}</h3>
          <div class="slim-price-row" style="margin-top: 4px">
            <template v-if="item.Status === 'Sold'">
              <span class="status-badge s-sold">售出</span>
              <button
                type="button"
                class="find-similar-btn"
                @click.stop.prevent="findSimilar"
                aria-label="找相似在售個體"
              >
                找相似 →
              </button>
            </template>
            <template v-else-if="item.Status === 'Auction' && hasAuction">
              <span class="status-badge s-auction">競標中</span>
            </template>
            <template v-else-if="item.Status === 'SelfKeep'">
              <span v-if="showStatusBadge" class="status-badge s-nfs">自留</span>
              <button
                type="button"
                class="find-similar-btn"
                @click.stop.prevent="findSimilar"
                aria-label="找相似在售個體"
              >
                找相似 →
              </button>
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

      <!-- 背面（僅桌機 hover 才會翻到） -->
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
          <div v-if="showBackPrice" class="flip-back-row">
            <span class="k">價格</span>
            <span class="v">{{ priceText }}</span>
          </div>

          <div class="flip-back-actions">
            <button
              type="button"
              class="btn-app btn-app--ghost btn-app--xs btn-app--pill flip-action-btn"
              :class="{ 'flip-action-btn--active': isWishlisted }"
              @click.stop.prevent="onToggleWishlist(item.ID)"
            >
              收藏
            </button>

            <button
              v-if="showCompare && item.Status !== 'Sold'"
              type="button"
              class="btn-app btn-app--ghost btn-app--xs btn-app--pill flip-action-btn"
              :class="{ 'flip-action-btn--active': isCompared }"
              :disabled="compareDisabled"
              @click.stop.prevent="onToggleCompare(item.ID)"
              :title="isCompared ? '移出比較' : compareDisabled ? '最多 3 隻' : '加入比較'"
            >
              加入比較
            </button>
          </div>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.flip-card {
  perspective: 1200px;
}

/* 已售/自留卡的「找相似」出口（#U4）：色彩沿用 --pri（#27 已確保兩模式對比 AA） */
.find-similar-btn {
  margin-left: 8px;
  padding: 0;
  background: none;
  border: none;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--pri);
  cursor: pointer;
  vertical-align: middle;
}
.find-similar-btn:hover,
.find-similar-btn:focus-visible {
  text-decoration: underline;
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
@media (hover: hover) and (pointer: fine) {
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
  flex-direction: column;
  gap: 6px;
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
@media (hover: hover) and (pointer: fine) {
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
@media (hover: hover) and (pointer: fine) {
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
  .flip-front-actions .card-action-btn {
    opacity: 1;
    padding: 3px 8px;
    font-size: 0.75rem;
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
@media (hover: hover) and (pointer: fine) {
  .flip-back {
    display: block;
  }

  /* 桌機有背面按鈕時，正面就隱藏（避免重複） */
  .flip-front-actions {
    display: none;
  }

  .flip-card:hover .flip-inner {
    transform: rotateY(180deg);
  }
}
</style>
