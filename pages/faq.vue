<script setup>
import { ref } from 'vue'
import { useHead } from '#imports'
import { FAQ_DATA } from '~/utils/faq.js'

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
</script>

<template>
    <div class="faq-page-wrapper">
        
        <!-- 🌟 引入全域共用的 App-like 返回按鈕 -->
        <TheBackButton wrapper-class="m-only" fallback="/" />

        <div class="content-card">
            <!-- 桌機版顯示標題與前言，手機版直接隱藏節省高度 -->
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
/*[局部樣式修復] 
  已清除寫死的深色背景與淺色字體色碼。
  全面導入 CSS 變數，移除所有不必要的 :global(body.day-mode) 覆寫。
  （已移除重複的 app-back-btn 相關樣式）
*/
.faq-page-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding-top: 15px;
    padding-bottom: 20px;
}

/* 🌟 Responsive Utilities */
.dt-only { display: block; }
.m-only { display: none !important; }

/* 卡片化內容 */
.content-card {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.page-title {
    font-size: 2.2rem;
    margin: 0 0 20px 0;
    color: var(--txt);
    line-height: 1.2;
    border-bottom: 1px solid var(--bd);
    padding-bottom: 15px;
}

.page-text-box {
    background: rgba(128, 128, 128, 0.05);
    padding: 15px 20px;
    border-radius: 10px;
    border: 1px solid var(--bd);
    margin-bottom: 25px;
    color: var(--txt);
    opacity: 0.8;
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
    background: var(--card-bg);
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
    color: var(--txt);
    font-size: 1.05rem;
    background: transparent;
    transition: 0.2s;
}

.faq-item.active {
    border-color: var(--pri);
    box-shadow: 0 4px 15px rgba(255,69,0,0.1);
}

.faq-item.active .faq-q {
    background: rgba(255,69,0,0.05);
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
    background: rgba(128, 128, 128, 0.05);
    color: var(--txt);
    opacity: 0.9;
    line-height: 1.7;
    border-top: 1px dashed var(--bd);
    font-size: 0.95rem;
}

/* 🌟 Mobile Optimizations (極致壓縮高度) */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .m-only { display: flex !important; }
    
    .faq-page-wrapper {
        padding-top: 0;
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