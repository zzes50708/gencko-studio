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
    <div class="prod-container">
        <h1 class="page-title">常見問題 FAQ</h1>
        <div class="page-text-box">
            <p>這裡整理了關於購買流程、運送方式以及售後服務的常見問題。</p>
        </div>

        <div v-if="faqList.length === 0" style="text-align:center; padding:40px; color:#666;">
            載入中...
        </div>

        <div v-else>
            <div v-for="(q, idx) in faqList" :key="idx" class="faq-item" :class="{active: activeIndex === idx}">
                <div class="faq-q" @click="toggle(idx)">
                    <span>{{ q.title }}</span>
                    <span>{{ activeIndex === idx ? '▲' : '▼' }}</span>
                </div>
                <div class="faq-body-wrapper">
                    <div class="faq-body-inner">
                        <div class="faq-a" v-html="q.ans ? q.ans.replace(/\n/g, '<br>') : ''"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>