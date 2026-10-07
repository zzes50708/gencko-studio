<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{ src?: string; alt: string; loading?: 'eager' | 'lazy' }>(),
  { loading: 'lazy' }
)
const failed = ref(false)
const image = ref<HTMLImageElement | null>(null)
// SSR 圖片可能在 Vue 掛載前就失敗，掛載後再次核對。
const checkImage = () => {
  if (image.value?.complete && image.value.naturalWidth === 0) failed.value = true
}
onMounted(checkImage)
watch(
  () => props.src,
  async () => {
    failed.value = false
    await nextTick()
    checkImage()
  }
)
</script>
<template>
  <img
    v-if="src && !failed"
    ref="image"
    v-bind="$attrs"
    :src="src"
    :alt="alt"
    :loading="loading"
    decoding="async"
    @error="failed = true"
  />
  <div
    v-else
    v-bind="$attrs"
    class="article-image-fallback"
    role="img"
    :aria-label="`${alt}（圖片暫時無法顯示）`"
  >
    {{ src ? '圖片暫時無法顯示' : '文章圖片未提供' }}
  </div>
</template>
<style scoped>
.article-image-fallback {
  display: grid;
  place-items: center;
  min-height: 90px;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  background: var(--card-bg);
  color: var(--txt-muted);
  font-size: 0.8rem;
  text-align: center;
}
</style>
