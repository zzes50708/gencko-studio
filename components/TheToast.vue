<script setup>
const props = defineProps({
    show: { type: Boolean, default: false }
})
</script>

<template>
    <Transition name="toast-anim">
        <div v-if="show" class="toast">
            已複製到剪貼簿
        </div>
    </Transition>
</template>

<style scoped>
/*
  [局部樣式與全域整合]
  已將原本散落於 style.css 的提示氣泡樣式抽回。
  利用反向變數 (背景用文字色，文字用背景色) 達到完美的日夜高對比。
*/
.toast {
    position: fixed;
    /* 配合底部安全區與導航列，讓提示氣泡浮在偏下方但不會被擋住 */
    bottom: calc(100px + env(safe-area-inset-bottom, 0px));
    left: 50%;
    transform: translateX(-50%);
    /* 🌟 反向變數：達到完美的視覺反差 */
    background: var(--txt);
    color: var(--bg-dark);
    padding: 12px 24px;
    border-radius: 30px;
    font-weight: bold;
    font-size: 0.95rem;
    z-index: 999999;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    pointer-events: none; /* 不阻擋底下的點擊事件 */
    white-space: nowrap;
}

/* 🌟 Vue Transition 動畫設定 */
.toast-anim-enter-active,
.toast-anim-leave-active {
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toast-anim-enter-from,
.toast-anim-leave-to {
    opacity: 0;
    /* 從下方滑出並配合置中的 transform */
    transform: translate(-50%, 20px);
}

@media (max-width: 768px) {
    .toast {
        font-size: 0.9rem;
        padding: 10px 20px;
        /* 手機版稍微調低，因為底部導航列佔了空間 */
        bottom: calc(85px + env(safe-area-inset-bottom, 0px));
    }
}
</style>