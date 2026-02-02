<script>
export default {
    name: 'TheLightbox',
    props: {
        item: { type: Object, default: null }, // Lightbox 顯示的物件
        lineLink: { type: String, default: '' }
    },
    emits: ['close'],
    methods: {
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        }
    }
}
</script>
<template>
    <div v-if="item" class="lightbox-overlay" @click="$emit('close')">
        <div class="lightbox-close" @click.stop="$emit('close')">✕</div>
        <img :src="convertLink(item.ImageURL)" class="lightbox-img" @click.stop>
        <div class="lightbox-info" @click.stop>
            <h2 style="color:#fff;margin:10px 0;">{{item.Morph}}</h2>
            <a v-if="item.Status==='ForSale'" :href="lineLink" target="_blank" class="btn-buy" style="font-size:1.2rem;padding:12px 30px;display:inline-block;margin-top:10px;position:relative;z-index:100001;">立即私訊購買</a>
        </div>
    </div>
</template>