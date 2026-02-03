<script>
export default {
    name: 'FaqView',
    props: {
        faqList: { type: Array, default: () => [] }
    },
    data() {
        return {
            activeIndex: null // 用來記錄哪一個被打開，null 代表全關
        };
    },
    methods: {
        toggle(idx) {
            // 如果點擊同一個就關閉，否則切換到新的
            this.activeIndex = this.activeIndex === idx ? null : idx;
        }
    }
}
</script>

<template>
    <div class="prod-container">
        <h1 class="page-title">常見問題 FAQ</h1>
        <div class="page-text-box">
            <p>這裡整理了關於購買流程、運送方式以及售後服務的常見問題。</p>
        </div>

        <div v-if="faqList.length === 0" style="text-align:center; padding:40px; color:#666;">
            載入中...
        </div>

        <div v-else>
            <!-- 綁定 active class 來觸發 CSS 動畫 -->
            <div v-for="(q, idx) in faqList" :key="idx" class="faq-item" :class="{active: activeIndex === idx}">
                <div class="faq-q" @click="toggle(idx)">
                    <span>{{q.title}}</span>
                    <!-- 箭頭圖示變化 -->
                    <span>{{ activeIndex === idx ? '▲' : '▼' }}</span>
                </div>
                <div class="faq-body-wrapper">
                    <div class="faq-body-inner">
                        <!-- 保留原始的換行替換邏輯 -->
                        <div class="faq-a" v-html="q.ans ? q.ans.replace(/\n/g, '<br>') : ''"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>