<script setup>
import { getCleanUrl } from '~/utils/image'

const props = defineProps({
  items: { type: Array, default: () => [] },
  imageErrorIds: { type: Object, default: () => new Set() },
  duration: { type: Number, default: 48 },
  reverse: { type: Boolean, default: false },
  paused: { type: Boolean, default: false },
  rowLabel: { type: String, required: true },
  rowKey: { type: String, required: true }
})

const emit = defineEmits(['image-load', 'image-error'])

const isImageError = (id) => props.imageErrorIds.has(id)
const onImageLoad = (id) => emit('image-load', id)
const onImageError = (id) => emit('image-error', id)
</script>

<template>
  <AppMarquee
    :duration="props.duration"
    :gap-px="14"
    :reverse="props.reverse"
    :paused="props.paused"
    seam-offset="calc(var(--hot-card-overlap, 44px) / 2)"
    :aria-label="props.rowLabel"
  >
    <template #default="{ groupIndex }">
      <div
        class="hot-card-wrap"
        v-for="(item, idx) in props.items"
        :key="`${props.rowKey}-${item?.ID ?? 'seam'}-${groupIndex}-${idx}`"
        :style="{
          '--hot-i': String(Number(idx) + Number(groupIndex) * (props.items.length + 1)),
          '--specimen-angle': `${[-2.5, 1.8, -1.2, 2.6, -1.8][Number(idx) % 5]}deg`
        }"
      >
        <div class="hot-card-back" aria-hidden="true"></div>
        <div class="hot-card-item">
          <NuxtLink
            no-prefetch
            :to="item?.ID ? `/product/${item.ID}` : '/shop'"
            class="hot-card-link"
            :tabindex="groupIndex === 1 ? -1 : undefined"
          >
            <div class="hot-card-layer">
              <div class="hot-card-media">
                <img
                  v-if="item.ImageURL && !isImageError(item.ID)"
                  :src="getCleanUrl(item.ImageURL, 300)"
                  :alt="item.Morph + ' 守宮'"
                  class="hot-card-img"
                  loading="lazy"
                  decoding="async"
                  @load="onImageLoad(item.ID)"
                  @error="onImageError(item.ID)"
                />
                <div v-else class="hot-card-img hot-card-img--placeholder">GENCKO</div>
              </div>
            </div>
            <div class="hot-card-body-overlay">
              <span class="specimen-id">{{ item.ID }}</span>
              <h3 class="hot-card-title">{{ item.Morph }}</h3>
            </div>
            <span class="hot-card-turncue" aria-hidden="true">↗</span>
          </NuxtLink>
        </div>
      </div>
    </template>
  </AppMarquee>
</template>
