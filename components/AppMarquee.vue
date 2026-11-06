<script setup>
import { computed, ref } from 'vue'
import { useDocumentVisibility, useElementVisibility } from '@vueuse/core'

const root = ref(null)
const inViewport = useElementVisibility(root)
const documentVisibility = useDocumentVisibility()
const inactive = computed(() => !inViewport.value || documentVisibility.value === 'hidden')

const props = defineProps({
  // 秒數越小越快
  duration: { type: Number, default: 28 },
  // 兩份內容之間的間距
  gapPx: { type: Number, default: 14 },
  // 是否在桌機 hover 時暫停
  pauseOnHover: { type: Boolean, default: true },
  // 讓觸控及鍵盤使用者也能主動停止展示。
  paused: { type: Boolean, default: false },
  // 是否反向跑（第二行可用來做交錯效果）
  reverse: { type: Boolean, default: false },
  // 無縫循環接縫修正（可用 calc(...)；預設 0px）
  seamOffset: { type: String, default: '0px' },
  // 可選：提供 aria-label
  ariaLabel: { type: String, default: '' }
})

const styleVars = computed(() => ({
  '--marquee-duration': `${props.duration}s`,
  '--marquee-gap': `${props.gapPx}px`,
  '--marquee-direction': props.reverse ? 'reverse' : 'normal',
  '--marquee-seam-offset': props.seamOffset
}))
</script>

<template>
  <div
    ref="root"
    class="app-marquee"
    :class="{
      'is-paused': paused || inactive,
      'is-offscreen': inactive,
      'can-pause-on-hover': pauseOnHover
    }"
    :style="styleVars"
    :aria-label="ariaLabel || undefined"
  >
    <div class="app-marquee__track">
      <div class="app-marquee__group">
        <slot :group-index="0" />
      </div>
      <!-- 副本仍會移入可視範圍，不能使用 inert 停用滑鼠互動；插槽負責排除重複 Tab 順序。 -->
      <div class="app-marquee__group" aria-hidden="true">
        <slot :group-index="1" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-marquee {
  /* 需要水平裁切，但垂直要能露出陰影/傾斜 */
  overflow-x: hidden;
  overflow-y: visible;
}

.app-marquee__track {
  display: flex;
  width: max-content;
  gap: var(--marquee-gap);
  animation: app-marquee var(--marquee-duration) linear infinite;
  animation-direction: var(--marquee-direction);
  will-change: transform;
}

.app-marquee:focus-within .app-marquee__track {
  animation-play-state: paused;
}
.app-marquee.is-paused .app-marquee__track {
  animation-play-state: paused;
  will-change: auto;
}

.app-marquee__group {
  display: flex;
  gap: var(--marquee-gap);
}

@media (hover: hover) and (pointer: fine) {
  .app-marquee.can-pause-on-hover:hover .app-marquee__track {
    animation-play-state: paused;
  }
}

@keyframes app-marquee {
  from {
    transform: translateX(0);
  }
  to {
    /* 注意：track 內包含兩份內容，正常情況下 -50% 可以無縫接續
       若兩份內容之間有 gap 或負重疊（例如卡片覆蓋 1/4），就需要修正接縫位移。 */
    transform: translateX(calc(-50% - var(--marquee-gap) / 2 + var(--marquee-seam-offset, 0px)));
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-marquee__track {
    animation: none;
    transform: none;
    will-change: auto;
  }
}
</style>
