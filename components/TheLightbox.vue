<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getCleanUrl } from '~/utils/image.js'

const props = defineProps({
    item: { type: Object, default: null },
    lineLink: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const onKeydown = (e) => {
    if (e.key === 'Escape') emit('close')
}

onMounted(() => {
    if (import.meta.client) window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
    if (import.meta.client) window.removeEventListener('keydown', onKeydown)
})

// --- ?? PWA ?皛?餈質馱 ---
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
    
    
    if (Math.abs(touchDeltaY.value) > 100) {
        emit('close')
    }
    
    
    touchDeltaY.value = 0
}

// ?? 摰????蝬脣??摩嚗Ⅱ靽?GitHub ???雯???湔憿舐內
const getImgSrc = (item) => {
    if (!item) return ''
    
    const rawUrl = item.ImageURL || item.image_url || ''
    return getCleanUrl(rawUrl)
}
</script>

<template>
    <div v-if="item" class="lightbox-overlay" @click="emit('close')">
        
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
            <button class="lightbox-close-btn" type="button" @click="emit('close')" aria-label="關閉">×</button>
            <!-- ?? 銝??????內 -->
            <div class="swipe-hint-container">
                <div class="swipe-indicator"></div>
                <span class="swipe-text">向下滑動可關閉</span>
            </div>

            <!-- ?? 雿輻?? img 隞亦Ⅱ靽?GitHub ?湧?雯???擃帘摰改?銝???Nuxt Image ?? -->
            <img 
                v-if="getImgSrc(item)"
                :src="getImgSrc(item)" 
                :alt="item.Morph || item.Name || 'Gencko Showcase'"
                class="lightbox-img" 
                loading="lazy"
                decoding="async"
                draggable="false"
            />
            
            <div class="lightbox-info">
                <h2 class="lightbox-title">{{ item.Morph || item.Name }}</h2>
                <a v-if="item.Status === 'ForSale' || (item.Available && item.Available !== 'No')"
                   :href="item.ExternalLink || lineLink" 
                   target="_blank" 
                   class="btn-app btn-app--primary btn-app--lg btn-app--pill app-btn-buy" 
                   rel="noopener noreferrer">
                   立即私訊購買
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.lightbox-overlay {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: var(--card-bg);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
}

.lightbox-close-btn {
    position: fixed;
    top: calc(12px + env(safe-area-inset-top, 0px));
    right: 12px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    color: var(--txt);
    cursor: pointer;
    font-size: 1.4rem;
    font-weight: 300;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000002;
    transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                color 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

@media (hover: hover) and (pointer: fine) {
    .lightbox-close-btn:hover {
        background: var(--pri);
        border-color: var(--pri);
        color: #fff;
        transform: scale(1.08) rotate(90deg);
        box-shadow: 0 8px 28px rgba(255, 69, 0, 0.4);
    }
}

.lightbox-close-btn:active {
    transform: scale(0.95) rotate(90deg);
    box-shadow: 0 2px 10px rgba(255, 69, 0, 0.3);
}

.lightbox-content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    touch-action: none;
    will-change: transform, opacity;
}

.swipe-hint-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 12px;
    opacity: 0.6;
    animation: float 2s ease-in-out infinite;
}

@keyframes float {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-5px); }
    100% { transform: translateY(0px); }
}

.swipe-indicator {
    width: 40px;
    height: 5px;
    border-radius: 5px;
    background: var(--txt);
    margin-bottom: 6px;
}

.swipe-text {
    font-size: 0.75rem;
    color: var(--txt);
    font-weight: bold;
    letter-spacing: 1px;
}

.lightbox-img {
    max-width: 95%;
    width: auto; 
    height: auto; 
    max-height: 70vh; 
    border-radius: 16px; 
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    object-fit: contain;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    background: rgba(128, 128, 128, 0.05);
    border: 1px solid var(--bd);
}

.lightbox-info {
    margin-top: 20px;
    text-align: center;
    width: 100%;
    position: relative;
    z-index: 1000000;
}

.lightbox-title {
    color: var(--txt);
    margin: 0 0 15px 0;
    font-size: 1.5rem;
    font-weight: 900;
    text-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.app-btn-buy { z-index: 100001; }

@media (max-width: 768px) {
    .lightbox-img {
        max-height: 60vh;
    }
    
    .lightbox-title {
        font-size: 1.25rem;
        margin-bottom: 12px;
    }
    
    .app-btn-buy { padding: 12px 25px; font-size: 1rem; }
}
</style>

