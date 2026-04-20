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
        <!-- 🌟 App-like 毛玻璃關閉按鈕 -->
        <button class="lightbox-close" @click.stop="emit('close')">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
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
            <!-- 🌟 App-like 頂部滑動提示條 -->
            <div class="swipe-indicator"></div>

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
                <h2 class="lightbox-title">{{ item.Morph || item.Name }}</h2>
                <a v-if="item.Status === 'ForSale' || item.Available !== 'No'" 
                   :href="item.ExternalLink || lineLink" 
                   target="_blank" 
                   class="app-btn-buy" 
                   rel="noopener noreferrer">
                   💬 立即私訊購買
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 🌟 增強行動端手勢流暢度 */
.lightbox-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.95);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

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

/* 🌟 滑動提示條 */
.swipe-indicator {
    width: 40px;
    height: 5px;
    border-radius: 5px;
    background: rgba(255, 255, 255, 0.4);
    margin-bottom: 12px;
}

.lightbox-img {
    max-width: 95%;
    max-height: 75vh;
    border-radius: 16px; /* 🌟 加大圓角 */
    box-shadow: 0 10px 40px rgba(0,0,0,0.8);
    object-fit: contain;
    /* 防止長按圖片時跳出系統選單，提升 App 沉浸感 */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.lightbox-info {
    margin-top: 20px;
    text-align: center;
    width: 100%;
    position: relative;
    z-index: 1000000;
}

.lightbox-title {
    color: #fff;
    margin: 0 0 15px 0;
    font-size: 1.5rem;
    font-weight: 900;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
}

/* 🌟 App-like 購買按鈕 */
.app-btn-buy {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 1.1rem;
    padding: 14px 35px;
    background: var(--pri);
    color: #fff;
    border-radius: 30px;
    font-weight: bold;
    text-decoration: none;
    box-shadow: 0 5px 20px rgba(255, 69, 0, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
    position: relative;
    z-index: 100001;
}

.app-btn-buy:active {
    transform: scale(0.95);
    box-shadow: 0 2px 10px rgba(255, 69, 0, 0.3);
}

/* 🌟 App-like 毛玻璃關閉按鈕 */
.lightbox-close {
    position: absolute;
    top: calc(20px + env(safe-area-inset-top, 0px));
    right: 20px;
    color: #fff;
    cursor: pointer;
    z-index: 1000000;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    width: 44px; /* 🌟 確保符合觸控標準 */
    height: 44px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: background 0.2s, transform 0.2s;
    padding: 0;
}

.lightbox-close:active {
    background: rgba(255, 255, 255, 0.25);
    transform: scale(0.9);
}

/* Day Mode Overrides */
:global(body.day-mode) .lightbox-overlay { background: rgba(255, 255, 255, 0.98); }
:global(body.day-mode) .lightbox-title { color: #111; text-shadow: none; }
:global(body.day-mode) .swipe-indicator { background: rgba(0, 0, 0, 0.2); }
:global(body.day-mode) .lightbox-img { border-color: #ddd; box-shadow: 0 10px 40px rgba(0,0,0,0.15); background: #f9f9f9; }
:global(body.day-mode) .lightbox-close { background: rgba(0, 0, 0, 0.05); color: #333; border-color: rgba(0, 0, 0, 0.1); }
:global(body.day-mode) .lightbox-close:active { background: rgba(0, 0, 0, 0.1); }
</style>