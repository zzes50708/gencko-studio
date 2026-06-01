<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import Atropos from 'atropos'

const props = defineProps({
  /**
   * 是否啟用 3D（桌機 hover: fine 才會啟用；手機端自動降級為一般卡片）
   */
  enabled: { type: Boolean, default: true },
  /**
   * 是否延遲初始化（用於大量卡片：只有滑鼠移入才建立 Atropos 實例）
   */
  lazyInit: { type: Boolean, default: false },
  /**
   * 最大旋轉角度（度）
   */
  rotate: { type: Number, default: 14 },
  /**
   * 高亮效果
   */
  highlight: { type: Boolean, default: false },
  /**
   * 陰影效果
   */
  shadow: { type: Boolean, default: false },
  /**
   * 靜態基礎姿勢（預設微斜放），hover 時回正
   */
  baseRotateY: { type: Number, default: 0 },
  baseRotateX: { type: Number, default: 0 },
})

const rootEl = ref(null)
const instance = ref(null)

const isFineHover = useMediaQuery('(hover: hover) and (pointer: fine)')
const canRun = computed(() => props.enabled && isFineHover.value)

const destroy = () => {
  try {
    instance.value?.destroy?.()
  } catch (e) {
    // ignore
  } finally {
    instance.value = null
  }
}

const init = () => {
  if (!canRun.value) return
  if (!rootEl.value) return
  if (instance.value) return

  instance.value = Atropos({
    el: rootEl.value,
    rotateXMax: props.rotate,
    rotateYMax: props.rotate,
    highlight: props.highlight,
    shadow: props.shadow,
    // 讓 hover 的回正感更俐落
    duration: 180,
  })
}

const onEnter = () => {
  if (props.lazyInit) init()
}

onMounted(() => {
  if (!props.lazyInit) init()
})

onUnmounted(() => {
  destroy()
})
</script>

<template>
  <div
    ref="rootEl"
    class="atropos atropos-base"
    :style="{
      '--base-rotate-y': `${baseRotateY}deg`,
      '--base-rotate-x': `${baseRotateX}deg`,
    }"
    @pointerenter="onEnter"
  >
    <div class="atropos-scale">
      <div class="atropos-rotate">
        <div class="atropos-inner">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (hover: hover) and (pointer: fine) {
  .atropos-base {
    transform-style: preserve-3d;
    transform: rotateY(var(--base-rotate-y)) rotateX(var(--base-rotate-x));
    transition: transform 180ms ease;
    will-change: transform;
  }
  .atropos-base:hover,
  .atropos-base:focus-within {
    transform: rotateY(0deg) rotateX(0deg);
  }
}
</style>
