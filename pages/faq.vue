<script setup>
import { ref, computed } from 'vue'
import { useHead } from '#imports'
import { FAQ_CATEGORIES, FAQ_DATA } from '~/utils/faq.js'

useHead({
    title: '常見問題 FAQ',
    meta:[
        { name: 'description', content: 'Gencko Studio 常見問題整理：守宮飼養知識、官網功能使用說明、購買流程與售後保障，新手入手前必讀。' },
        { property: 'og:title', content: '常見問題 FAQ | Gencko Studio' },
        { property: 'og:description', content: '守宮飼養知識、官網使用說明、購買與售後保障完整解答。' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/faq' }
    ],
    link:[
        { rel: 'canonical', href: 'https://www.genckobreeding.com/faq' }
    ],
    script:[
    {
        type: 'application/ld+json',
        children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "常見問題 FAQ",
            "url": "https://www.genckobreeding.com/faq",
            "speakable": {
                "@type": "SpeakableSpecification",
                "cssSelector": [".faq-item", ".faq-answer"]
            }
        })
    },
    {
        type: 'application/ld+json',
        children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": FAQ_DATA.map(q => ({
                "@type": "Question",
                "name": q.title.replace(/（必讀）|\(必讀\)/g, '').trim(),
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": (q.ans || '').replace(/\n/g, ' ').trim()
                }
            }))
        })
    }]
})

const activeCategory = ref('gecko')
const activeIndex = ref(null)  // 格式：'catId-qIdx'

const currentCategory = computed(() =>
    FAQ_CATEGORIES.find(c => c.id === activeCategory.value)
)

const switchCategory = (id) => {
    activeCategory.value = id
    activeIndex.value = null
}

const toggleQ = (key) => {
    activeIndex.value = activeIndex.value === key ? null : key
}
</script>

<template>
    <div class="faq-page-wrapper">
        <TheBackButton wrapper-class="m-only" fallback="/" />

        <div class="content-card">
            <h1 class="page-title dt-only">常見問題 FAQ</h1>

            <!-- 分類 Tab -->
            <div class="cat-tabs">
                <button
                    v-for="cat in FAQ_CATEGORIES"
                    :key="cat.id"
                    class="cat-tab"
                    :class="{ active: activeCategory === cat.id }"
                    @click="switchCategory(cat.id)"
                >
                    <span class="cat-tab-title">{{ cat.title }}</span>
                    <span class="cat-tab-sub dt-only">{{ cat.subtitle }}</span>
                </button>
            </div>

            <!-- 問題列表 -->
            <div class="faq-list">
                <div
                    v-for="(q, idx) in currentCategory.questions"
                    :key="idx"
                    class="faq-item"
                    :class="{ active: activeIndex === `${activeCategory}-${idx}` }"
                >
                    <div class="faq-q" @click="toggleQ(`${activeCategory}-${idx}`)">
                        <span class="q-text">{{ q.title }}</span>
                        <span class="q-icon">{{ activeIndex === `${activeCategory}-${idx}` ? '▲' : '▼' }}</span>
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
.faq-page-wrapper { max-width: 900px; margin: 0 auto; padding-top: 15px; padding-bottom: 20px; }
.dt-only { display: block; }
.m-only { display: none !important; }

.content-card {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}
.page-title { font-size: 2.2rem; margin: 0 0 20px 0; color: var(--txt); line-height: 1.2; border-bottom: 1px solid var(--bd); padding-bottom: 15px; }

/* ── 分類 Tab ── */
.cat-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}
.cat-tab {
    flex: 1;
    min-width: 100px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--bd);
    background: var(--card-bg);
    color: var(--txt);
    cursor: pointer;
    transition: 0.2s;
    opacity: 0.65;
}
.cat-tab:hover { opacity: 0.9; border-color: var(--bd-hover); }
.cat-tab.active {
    background: var(--pri);
    color: #fff;
    border-color: var(--pri);
    opacity: 1;
    box-shadow: 0 3px 12px var(--pri-glow);
}
.cat-tab-title { font-size: 0.95rem; font-weight: 800; }
.cat-tab-sub { font-size: 0.72rem; opacity: 0.8; }
.cat-tab.active .cat-tab-sub { opacity: 0.9; }

/* ── FAQ 列表 ── */
.faq-list { display: flex; flex-direction: column; gap: 10px; }
.faq-item { background: var(--card-bg); border: 1px solid var(--bd); border-radius: 10px; overflow: hidden; transition: 0.25s; }
.faq-item.active { border-color: var(--pri); box-shadow: 0 4px 15px var(--pri-glow-soft); }

.faq-q { padding: 16px 18px; cursor: pointer; font-weight: bold; display: flex; justify-content: space-between; align-items: center; color: var(--txt); font-size: 1rem; transition: 0.2s; }
.faq-item.active .faq-q { background: rgba(232,68,10,0.05); color: var(--pri); }
.q-text { flex: 1; padding-right: 12px; line-height: 1.4; }
.q-icon { font-size: 0.75rem; opacity: 0.5; transition: 0.2s; flex-shrink: 0; }
.faq-item.active .q-icon { opacity: 1; color: var(--pri); }

.faq-body-wrapper { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
.faq-item.active .faq-body-wrapper { grid-template-rows: 1fr; }
.faq-body-inner { overflow: hidden; }
.faq-a { padding: 16px 18px; background: rgba(128,128,128,0.04); color: var(--txt); opacity: 0.9; line-height: 1.75; border-top: 1px dashed var(--bd); font-size: 0.93rem; }

@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .m-only { display: flex !important; }
    .faq-page-wrapper { padding-top: 0; }
    .content-card { padding: 12px; border-radius: 12px; }
    .cat-tabs { gap: 6px; }
    .cat-tab { padding: 8px 6px; min-width: 80px; }
    .cat-tab-title { font-size: 0.82rem; }
    .faq-list { gap: 7px; }
    .faq-q { padding: 13px 12px; font-size: 0.93rem; }
    .faq-a { padding: 12px; font-size: 0.88rem; }
}
</style>
