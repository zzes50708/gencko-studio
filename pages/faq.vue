<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '#imports'
import { FAQ_DATA } from '~/utils/faq.js'

const router = useRouter()

useHead({
    title: '常見問題',
    meta:[
        { name: 'description', content: 'Gencko Studio 整理了關於守宮購買流程、運送方式以及售後服務的常見問題。' },
        { property: 'og:title', content: '常見問題 | Gencko Studio' },
        { property: 'og:description', content: '關於守宮購買流程、運送方式以及售後服務的常見問題。' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/faq' }
    ]
})

const faqList = ref(JSON.parse(JSON.stringify(FAQ_DATA)))
const activeIndex = ref(null)

const toggle = (idx) => {
    activeIndex.value = activeIndex.value === idx ? null : idx
}

// 🌟 返回邏輯
const goBack = () => {
    if (window.history.state && window.history.state.back) {
        router.back()
    } else {
        router.push('/')
    }
}
</script>

<template>
    <div class="faq-page-wrapper">
        
        <!-- 🌟 手機版顯示的 App-like 返回按鈕 -->
        <div class="nav-action-row m-only">
            <button class="app-back-btn" @click="goBack">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                返回
            </button>
        </div>

        <div class="content-card">
            <!-- 🌟 桌機版顯示標題與前言，手機版直接隱藏節省高度 -->
            <h1 class="page-title dt-only">常見問題 FAQ</h1>
            <div class="page-text-box dt-only">
                <p>這裡整理了關於購買流程、運送方式以及售後服務的常見問題。</p>
            </div>

            <div v-if="faqList.length === 0" style="text-align:center; padding:40px; color:#666;">
                載入中...
            </div>

            <div v-else class="faq-list">
                <div v-for="(q, idx) in faqList" :key="idx" class="faq-item" :class="{active: activeIndex === idx}">
                    <div class="faq-q" @click="toggle(idx)">
                        <span class="q-text">{{ q.title }}</span>
                        <span class="q-icon">{{ activeIndex === idx ? '▲' : '▼' }}</span>
                    </div>
                    <div class="faq-body-wrapper">
                        <div class="faq-body-inner">
                            <div class="faq-a" v-html="q.ans ? q.ans.replace(/\n/g, '<br>') : ''"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.faq-page-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding-top: 15px;
    padding-bottom: 20px;
}

/* 🌟 Responsive Utilities */
.dt-only { display: block; }
.m-only { display: none !important; }

/* 🌟 App-like 返回按鈕 */
.nav-action-row {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    margin-bottom: 10px;
}

.app-back-btn {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
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
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.app-back-btn:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.1);
}

/* 卡片化內容 */
.content-card {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.page-title {
    font-size: 2.2rem;
    margin: 0 0 20px 0;
    color: #fff;
    line-height: 1.2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 15px;
}

.page-text-box {
    background: rgba(255,255,255,0.02);
    padding: 15px 20px;
    border-radius: 10px;
    border: 1px solid var(--bd);
    margin-bottom: 25px;
    color: #ccc;
    font-size: 1rem;
    line-height: 1.6;
}

/* FAQ 列表 */
.faq-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.faq-item {
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--bd);
    border-radius: 10px;
    overflow: hidden;
    transition: 0.3s;
}

.faq-q {
    padding: 18px 20px;
    cursor: pointer;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #fff;
    font-size: 1.05rem;
    background: transparent;
    transition: 0.2s;
}

.faq-item.active {
    border-color: var(--pri);
    box-shadow: 0 4px 15px rgba(255,69,0,0.1);
}

.faq-item.active .faq-q {
    background: rgba(255,69,0,0.1);
    color: var(--pri);
}

.q-text {
    flex: 1;
    padding-right: 15px;
    line-height: 1.4;
}

.q-icon {
    font-size: 0.8rem;
    opacity: 0.6;
    transition: 0.2s;
}

.faq-item.active .q-icon {
    opacity: 1;
    color: var(--pri);
}

.faq-body-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.faq-item.active .faq-body-wrapper {
    grid-template-rows: 1fr;
}

.faq-body-inner {
    overflow: hidden;
}

.faq-a {
    padding: 20px;
    background: rgba(0,0,0,0.2);
    color: #ddd;
    line-height: 1.7;
    border-top: 1px dashed rgba(255,255,255,0.1);
    font-size: 0.95rem;
}

/* Day Mode Overrides */
:global(body.day-mode) .app-back-btn { background: #fff; border-color: #ddd; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
:global(body.day-mode) .app-back-btn:active { background: #f0f0f0; }
:global(body.day-mode) .content-card { background: #fff; border-color: #ddd; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); }
:global(body.day-mode) .page-title { color: #111; border-bottom-color: #eee; }
:global(body.day-mode) .page-text-box { background: #f9f9f9; border-color: #eee; color: #444; }
:global(body.day-mode) .faq-item { background: #fff; border-color: #ddd; }
:global(body.day-mode) .faq-item.active { border-color: var(--pri); }
:global(body.day-mode) .faq-q { color: #111; }
:global(body.day-mode) .faq-a { background: #f9f9f9; color: #333; border-top-color: #eee; font-weight: 500; }

/* 🌟 Mobile Optimizations (極致壓縮高度) */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .m-only { display: flex !important; }
    
    .faq-page-wrapper {
        padding-top: 0;
    }
    
    .nav-action-row {
        margin-bottom: 5px;
    }
    
    .app-back-btn {
        padding: 6px 12px;
        font-size: 0.95rem;
    }
    
    .content-card {
        padding: 15px; /* 縮小外框內距 */
        border-radius: 12px;
    }
    
    .faq-list {
        gap: 8px; /* 縮小問題之間的間距 */
    }
    
    .faq-item {
        border-radius: 8px;
    }
    
    .faq-q {
        padding: 14px 15px; /* 壓縮問題欄位的高度 */
        font-size: 1rem;
    }
    
    .faq-a {
        padding: 15px; /* 壓縮答案欄位的高度 */
        font-size: 0.9rem;
        line-height: 1.6;
    }
}
</style>