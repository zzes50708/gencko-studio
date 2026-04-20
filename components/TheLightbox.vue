<script setup>
import { ref } from 'vue'
import { getCleanUrl } from '~/utils/image.js'

const props = defineProps({
    item: { type: Object, default: null },
    lineLink: { type: String, default: '' }
})

const emit = defineEmits(['close'])

// --- 🌟 PWA 手勢滑動追蹤 ---
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
    
    // 如果上下滑動超過 100px，則觸發關閉視窗
    if (Math.abs(touchDeltaY.value) > 100) {
        emit('close')
    }
    
    // 恢復原位，若沒有被關閉則利用 CSS transition 彈回
    touchDeltaY.value = 0
}
</script>

<template>
    <div v-if="item" class="lightbox-overlay" @click="emit('close')">
        <div class="lightbox-close" @click.stop="emit('close')">✕</div>
        
        <!-- 🌟 將圖片與文字包裝起來，方便整體連動滑動 -->
        <div class="lightbox-content-wrapper"
             :style="{
                 transform: `translateY(${touchDeltaY}px)`,
                 transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), opacity 0.3s ease',
                 opacity: Math.max(0, 1 - Math.abs(touchDeltaY) / 250)
             }"
             @touchstart="onTouchStart"
             @touchmove="onTouchMove"
             @touchend="onTouchEnd"
             @click.stop
        >
            <!-- 使用 NuxtImg 進行放大預覽圖的最佳化 -->
            <NuxtImg 
                v-if="item.ImageURL"
                :src="getCleanUrl(item.ImageURL)" 
                class="lightbox-img" 
                width="1000"
                height="800"
                fit="contain"
                format="webp"
                draggable="false"
            />
            
            <div class="lightbox-info">
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
    </div>
</template>

<style scoped>
/* 🌟 增強行動端手勢流暢度 */
.lightbox-content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    /* 禁用預設的瀏覽器捲動/下拉更新，確保滑動手勢專屬於拖曳圖片 */
    touch-action: none;
    will-change: transform, opacity;
}

.lightbox-img {
    /* 防止長按圖片時跳出系統選單，提升 App 沉浸感 */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}
</style>