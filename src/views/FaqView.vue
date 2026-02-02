<script>
export default {
    name: 'FaqView',
    props: {
        faqList: { type: Array, default: () => [] }
    }
}
</script>

<template>
    <div class="page-text-box">
        <div class="page-title">FAQ</div>
        <div v-for="(q, idx) in faqList" :key="idx" class="faq-item" :class="{active: q.open}">
            <div class="faq-q" @click="q.open = !q.open">{{q.title}} <span>{{q.open?'▲':'▼'}}</span></div>
            <div class="faq-body-wrapper">
                <div class="faq-body-inner">
                    <div class="faq-a" v-html="q.ans.replace(/\n/g, '<br>')"></div>
                </div>
            </div>
        </div>
    </div>
</template>