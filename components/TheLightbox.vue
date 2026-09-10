<script setup>
import { ref } from 'vue'
import { getCleanUrl } from '~/utils/image'

const props = defineProps({
  item: { type: Object, default: null },
  lineLink: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const dialog = useNativeModal(() => Boolean(props.item))

// --- ?? PWA ?皛?餈質馱 ---
const touchStartY = ref(0)
const touchDeltaY = ref(0)
const isDragging = ref(false)

const onTouchStart = (e) => {
  touchStartY.value = e.touches[0].clientY
  isDragging.value = true
  touchDeltaY.value = 0
}

const onTouchMove = (e) => {
  if (!isDragging.value) return
  touchDeltaY.value = e.touches[0].clientY - touchStartY.value
}

const onTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false

  if (Math.abs(touchDeltaY.value) > 100) {
    emit('close')
  }

  touchDeltaY.value = 0
}

// ?? 摰????蝬脣??摩嚗Ⅱ靽?GitHub ???雯???湔憿舐內
const getImgSrc = (item) => {
  if (!item) return ''

  const rawUrl = item.ImageURL || item.image_url || ''
  return getCleanUrl(rawUrl)
}
</script>

<template>
  <dialog v-if="item" ref="dialog" class="lightbox-overlay" aria-label="圖片預覽" @cancel.prevent="emit('close')" @click.self="emit('close')">
    <div
      class="lightbox-content-wrapper"
      :style="{
        transform: `translateY(${touchDeltaY}px)`,
        transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s ease-out',
        opacity: Math.max(0, 1 - Math.abs(touchDeltaY) / 250),
        willChange: isDragging ? 'transform, opacity' : 'auto'
      }"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @click.stop
    >
      <button class="lightbox-close-btn" type="button" @click="emit('close')" aria-label="關閉">
        ×
      </button>
      <!-- ?? 銝??????內 -->
      <div class="swipe-hint-container">
        <div class="swipe-indicator"></div>
        <span class="swipe-text">向下滑動可關閉</span>
      </div>

      <!-- ?? 雿輻?? img 隞亦Ⅱ靽?GitHub ?湧?雯???擃帘摰改?銝???Nuxt Image ?? -->
      <img
        v-if="getImgSrc(item)"
        :src="getImgSrc(item)"
        :alt="item.Morph || item.Name || 'Gencko Showcase'"
        class="lightbox-img"
        loading="lazy"
        decoding="async"
        draggable="false"
      />

      <div class="lightbox-info">
        <h2 class="lightbox-title">{{ item.Morph || item.Name }}</h2>
        <a
          v-if="item.Status === 'ForSale' || (item.Available && item.Available !== 'No')"
          :href="item.ExternalLink || lineLink"
          target="_blank"
          class="btn-app btn-app--primary btn-app--lg btn-app--pill app-btn-buy"
          rel="noopener noreferrer"
        >
          立即私訊購買
        </a>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.lightbox-overlay {
  margin: 0;
  border: 0;
  max-width: none;
  max-height: none;
  color: var(--txt);
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100dvh;
  background: var(--card-bg);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  z-index: 999999;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: env(safe-area-inset-top, 0px) env(safe-area-inset-right, 0px)
    env(safe-area-inset-bottom, 0px) env(safe-area-inset-left, 0px);
}

.lightbox-close-btn {
  position: fixed;
  top: calc(12px + env(safe-area-inset-top, 0px));
  right: 12px;
  width: 44px;
  height: 44px;
  border-radius: 2px;
  border: 1px solid var(--txt);
  background: var(--card-bg);
  color: var(--txt);
  cursor: pointer;
  font-size: 1.4rem;
  font-weight: 300;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000002;
  transition:
    background 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: none;
}

@media (hover: hover) and (pointer: fine) {
  .lightbox-close-btn:hover {
    background: var(--pri);
    border-color: var(--pri);
    color: #fff;
    transform: none;
    box-shadow: none;
  }
}

.lightbox-close-btn:active {
  transform: none;
  box-shadow: none;
}

.lightbox-content-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  touch-action: none;
}

.swipe-hint-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 12px;
  opacity: 0.6;
  animation: none;
}

@keyframes float {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
  100% {
    transform: translateY(0px);
  }
}

.swipe-indicator {
  width: 40px;
  height: 5px;
  border-radius: 5px;
  background: var(--txt);
  margin-bottom: 6px;
}

.swipe-text {
  font-size: 0.75rem;
  color: var(--txt);
  font-weight: bold;
  letter-spacing: 1px;
}

.lightbox-img {
  max-width: 95%;
  width: auto;
  height: auto;
  max-height: 70vh;
  border-radius: 2px;
  box-shadow: none;
  object-fit: contain;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
  background: rgba(128, 128, 128, 0.05);
  border: 1px solid var(--bd);
}

.lightbox-info {
  margin-top: 20px;
  text-align: center;
  width: 100%;
  position: relative;
  z-index: 1000000;
}

.lightbox-title {
  font-family: var(--font-heading-zh);
  color: var(--txt);
  margin: 0 0 15px 0;
  font-size: 1.5rem;
  font-weight: 900;
  text-shadow: none;
}

.app-btn-buy {
  z-index: 100001;
  border-radius: 2px;
  min-height: 44px;
  font-family: var(--font-body-zh);
  white-space: nowrap;
  box-shadow: none;
}

@media (max-width: 768px) {
  .lightbox-img {
    max-height: 60vh;
  }

  .lightbox-title {
    font-size: 1.25rem;
    margin-bottom: 12px;
  }

  .app-btn-buy {
    padding: 12px 25px;
    font-size: 1rem;
  }
}
</style>
