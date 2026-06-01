<script setup>
import { computed } from 'vue'

const props = withDefaults(defineProps(), {
  duration: 5,
})

const styleVar = computed(() => ({
  animationDuration: `${props.duration}s`,
}))
</script>

<template>
  <span class="radiant-text" :style="styleVar"><slot /></span>
</template>

<style>
/*
  原理：
  background-size: 400% → 漸層是元素寬度的 4 倍
  白色亮點位於漸層中間 50%（= 元素寬度 2 倍處）
  background-position: 100% → 漸層左移 3 倍元素寬，亮點在元素左側外
  background-position:   0% → 漸層原位，亮點在元素右側外
  動畫從 100% → 0%：亮點從左掃到右
  不在 keyframes 用 calc/var，100% 瀏覽器相容
*/
@keyframes radiant-sweep {
  0%, 12.5% { background-position: 100% 0; }
  87.5%, 100% { background-position: 0% 0; }
}

.radiant-text {
  color: transparent;

  /* 深色模式：橘底 + 白色掃光 */
  background: linear-gradient(
    to right,
    rgba(255, 110, 10, 0.85)  0%,
    rgba(255, 110, 10, 0.85) 40%,
    rgba(255, 255, 255, 0.70) 50%,
    rgba(255, 110, 10, 0.85) 60%,
    rgba(255, 110, 10, 0.85) 100%
  );
  background-size: 400% 100%;
  background-repeat: no-repeat;
  background-position: 100% 0;
  background-clip: text;
  -webkit-background-clip: text;

  animation: radiant-sweep 5s infinite;

  display: inline-block;
  width: 100%;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: inherit;
}

/* 日間模式：只改 image，不用 shorthand（避免 background-clip 被重設成 border-box） */
html.day-mode .radiant-text {
  background-image: linear-gradient(
    to right,
    rgba(232, 68, 10, 0.85)  0%,
    rgba(232, 68, 10, 0.85) 40%,
    rgba(255, 255, 255, 0.70) 50%,
    rgba(232, 68, 10, 0.85) 60%,
    rgba(232, 68, 10, 0.85) 100%
  );
}
</style>
