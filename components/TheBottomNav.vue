<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 判斷目前是否在特定路由下，以亮起對應的導航圖示
const isActive = (path) => {
    if (path === '/') return route.path === '/'
    return route.path.startsWith(path)
}
</script>

<template>
    <nav class="bottom-nav">
        <NuxtLink to="/" class="nav-item" :class="{ active: isActive('/') }">
            <span class="icon">🏠</span>
            <span class="label">首頁</span>
        </NuxtLink>
        <NuxtLink to="/shop" class="nav-item" :class="{ active: isActive('/shop') }">
            <span class="icon">🦎</span>
            <span class="label">選購</span>
        </NuxtLink>
        <NuxtLink to="/auction" class="nav-item" :class="{ active: isActive('/auction') }">
            <span class="icon">🔨</span>
            <span class="label">競標</span>
        </NuxtLink>
        <NuxtLink to="/profile" class="nav-item" :class="{ active: isActive('/profile') }">
            <span class="icon">👤</span>
            <span class="label">我的</span>
        </NuxtLink>
    </nav>
</template>

<style scoped>
/* 預設在桌機版隱藏 */
.bottom-nav {
    display: none;
}

@media (max-width: 768px) {
    .bottom-nav {
        display: flex;
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        justify-content: space-around;
        align-items: center;
        /* 基礎高度 65px + iOS 底部主畫面橫條的安全邊距 */
        height: calc(65px + env(safe-area-inset-bottom, 0px));
        padding-bottom: env(safe-area-inset-bottom, 0px);
        background: rgba(8, 8, 8, 0.92);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 9999;
        box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.5);
    }
}

/* 日間模式適配 */
:global(body.day-mode) .bottom-nav {
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 -5px 20px rgba(0, 0, 0, 0.05);
}

.nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    color: #888;
    transition: 0.2s ease-in-out;
    gap: 4px;
    height: 100%;
    /* 確保可點擊區域夠大 (至少 44x44px) 符合 Apple 規範 */
    min-width: 60px; 
}

.nav-item .icon {
    font-size: 1.4rem;
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.nav-item .label {
    font-size: 0.65rem;
    font-weight: 700;
}

/* 點擊時的微互動回饋 */
.nav-item:active .icon {
    transform: scale(0.8);
}

/* 活躍狀態樣式 */
.nav-item.active {
    color: var(--pri);
}

.nav-item.active .icon {
    transform: translateY(-3px) scale(1.15);
    filter: drop-shadow(0 2px 5px var(--pri-glow));
}

/* 日間模式文字顏色覆寫 */
:global(body.day-mode) .nav-item {
    color: #999;
}
:global(body.day-mode) .nav-item.active {
    color: var(--pri);
}
</style>