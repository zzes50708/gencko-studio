<script setup>
const props = defineProps({
    list: { type: Array, default: () => [ ] }
})
</script>

<template>
    <div class="marquee-container">
        <div class="marquee-content">
            <span v-for="(item, i) in list" :key="i" class="marquee-item">
                <a v-if="item.url" :href="item.url" target="_blank" class="marquee-link">{{ item.text }}</a>
                <span v-else>{{ item.text }}</span>
                <span style="margin: 0 80px; opacity: 0.3;">◆</span>
            </span>
        </div>
    </div>
</template>
<style scoped>
/*[局部樣式與全域整合]
  已將原本散落於 style.css 的跑馬燈專屬樣式抽回 TheMarquee.vue。
  確保跑馬燈始終維持品牌主色，不受日夜模式的強制覆寫干擾。
*/

/* 🌟 Marquee 加入頂部安全區適配 (瀏海) */
.marquee-container { 
    position: fixed; 
    top: 0; 
    left: 0; 
    /* 確保背景維持品牌主色，並用漸層增加立體感 */
    background: linear-gradient(90deg, #cc3700, var(--pri), #cc3700); 
    width: 100%; 
    overflow: hidden; 
    z-index: 1001; 
    box-shadow: 0 2px 10px rgba(255, 69, 0, 0.3); 
    /* 配合手機頂部安全區 (瀏海) 延伸背景色 */
    height: calc(40px + env(safe-area-inset-top, 0px)); 
    padding-top: env(safe-area-inset-top, 0px); 
    display: flex; 
    align-items: center; 
}

.marquee-content { 
    display: inline-block; 
    white-space: nowrap; 
    padding-left: 100%; 
    animation: marquee 25s linear infinite; 
}

/* 當滑鼠懸停時暫停跑馬燈，方便閱讀 */
.marquee-content:hover {
    animation-play-state: paused;
}

.marquee-item { 
    color: #fff; 
    font-weight: 900; 
    letter-spacing: 1px; 
    font-size: 0.95rem; 
    margin-right: 40px; 
    display: inline-flex; 
    align-items: center; 
}

.marquee-link { 
    cursor: pointer; 
    color: #fff; 
    text-decoration: none; 
    border-bottom: 1px dashed rgba(255, 255, 255, 0.8); 
    transition: border-bottom-color 0.2s, opacity 0.2s;
}

.marquee-link:hover {
    border-bottom: 1px solid #fff;
    opacity: 0.9;
}

@keyframes marquee { 
    0% { transform: translateX(0); } 
    100% { transform: translateX(-100%); } 
}

/* 🌟 Mobile Optimizations */
@media (max-width: 768px) {
    .marquee-item {
        font-size: 0.85rem;
    }
}
</style>