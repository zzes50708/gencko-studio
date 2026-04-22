<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
    // 當沒有歷史紀錄時的預設返回路徑
    fallback: { type: String, default: '/' },
    // 按鈕顯示文字
    text: { type: String, default: '返回' },
    // 外層容器的客製化 class (例如傳入 'm-only' 可在桌機隱藏)
    wrapperClass: { type: String, default: '' }
})

const router = useRouter()

const goBack = () => {
    // 安全檢查：若有瀏覽器歷史紀錄，則回上一頁；否則跳至指定預設路由
    if (import.meta.client && window.history.state && window.history.state.back) {
        router.back()
    } else {
        router.push(props.fallback)
    }
}
</script>

<template>
    <div class="nav-action-row" :class="wrapperClass">
        <button class="app-back-btn" @click="goBack">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            {{ text }}
        </button>
    </div>
</template>

<style scoped>
/* 統整並標準化的按鈕樣式，相容所有日夜模式變數 */
.nav-action-row {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    margin-bottom: 10px;
}

.app-back-btn {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    color: var(--txt);
    font-size: 0.95rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 30px;
    transition: 0.2s;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.app-back-btn:active {
    transform: scale(0.95);
    background: var(--bd);
}

/* 行動端自動微調內距與字體大小 */
@media (max-width: 768px) {
    .nav-action-row {
        margin-bottom: 8px;
    }
    .app-back-btn {
        padding: 6px 12px;
        font-size: 0.9rem;
    }
}
</style>