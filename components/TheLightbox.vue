<script setup>
import { getCleanUrl } from '~/utils/image.js'

const props = defineProps({
    item: { type: Object, default: null },
    lineLink: { type: String, default: '' }
})

const emit = defineEmits(['close'])
</script>

<template>
    <div v-if="item" class="lightbox-overlay" @click="emit('close')">
        <div class="lightbox-close" @click.stop="emit('close')">✕</div>
        <!-- 使用 NuxtImg 進行放大預覽圖的最佳化 -->
        <NuxtImg 
            v-if="item.ImageURL"
            :src="getCleanUrl(item.ImageURL)" 
            class="lightbox-img" 
            @click.stop
            width="1000"
            height="800"
            fit="contain"
            format="webp"
        />
        <div class="lightbox-info" @click.stop>
            <h2 style="color:#fff;margin:10px 0;">{{ item.Morph || item.Name }}</h2>
            <a v-if="item.Status === 'ForSale' || item.Available !== 'No'" 
               :href="item.ExternalLink || lineLink" 
               target="_blank" 
               class="btn-buy" 
               style="font-size:1.2rem;padding:12px 30px;display:inline-block;margin-top:10px;position:relative;z-index:100001;"
               rel="noopener noreferrer">
               立即私訊購買
            </a>
        </div>
    </div>
</template>