<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from 'vue'
import { getImageSrcset } from '~/utils/image'
defineOptions({ inheritAttrs: false })
const props = withDefaults(
  defineProps<{ src?: string; alt: string; loading?: 'eager' | 'lazy'; emptyText?: string }>(),
  { loading: 'lazy', emptyText: '文章圖片未提供' }
)
const failed = ref(false)
const responsive = ref(true)
const image = ref<HTMLImageElement | null>(null)
const onImageError = (event?: Event) => {
  const element = (event?.target as HTMLImageElement | null) || image.value
  const hasCandidates = !!getImageSrcset(props.src)
  // 忽略已經切換嘗試後才送達的舊圖片事件。
  if (hasCandidates && element?.hasAttribute('srcset') !== responsive.value) return
  if (responsive.value && hasCandidates) responsive.value = false
  else failed.value = true
}
// SSR 圖片可能在 Vue 掛載前就失敗，掛載後再次核對。
const checkImage = () => {
  if (image.value?.complete && image.value.naturalWidth === 0) onImageError()
}
onMounted(checkImage)
watch(
  () => props.src,
  async () => {
    failed.value = false
    responsive.value = true
    await nextTick()
    checkImage()
  }
)
</script>
<template>
  <img
    v-if="src && !failed"
    :key="responsive ? 'responsive' : 'original'"
    ref="image"
    v-bind="$attrs"
    :src="src"
    :srcset="responsive ? getImageSrcset(src) : undefined"
    :sizes="
      String(
        $attrs.sizes || '(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) 45vw, 33vw'
      )
    "
    :alt="alt"
    :loading="loading"
    decoding="async"
    @error="onImageError"
  />
  <div
    v-else
    v-bind="$attrs"
    class="article-image-fallback"
    role="img"
    :aria-label="`${alt}（${src ? '圖片暫時無法顯示' : emptyText}）`"
  >
    {{ src ? '圖片暫時無法顯示' : emptyText }}
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
