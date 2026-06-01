<script setup>
defineProps({
  variant: { type: String, default: 'product' }, // 'product' | 'article'
  square: { type: Boolean, default: false },
  imgHeight: { type: Number, default: 200 },
})
</script>

<template>
  <div class="sk-card">
    <div
      class="skeleton sk-img"
      :style="square ? { height: 'auto', aspectRatio: '1/1' } : { height: imgHeight + 'px' }"
    ></div>
    <div class="sk-body">
      <template v-if="variant === 'article'">
        <div class="skeleton sk-text" style="width:35%; height:12px; margin-bottom:10px;"></div>
        <div class="skeleton sk-title" style="width:85%;"></div>
        <div class="skeleton sk-text" style="margin-top:8px;"></div>
        <div class="skeleton sk-text" style="width:75%;"></div>
      </template>
      <template v-else>
        <div class="skeleton sk-title"></div>
        <div class="skeleton sk-price"></div>
      </template>
    </div>
  </div>
</template>
