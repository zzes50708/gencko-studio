<script>
export default {
    name: 'TheMarquee',
    props: {
        list: { type: Array, default: () => [] }
    }
}
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