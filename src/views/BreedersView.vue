<script>
export default {
    name: 'BreedersView',
    props: {
        breedersList: { type: Array, default: () => [] },
        breederSp: { type: String, default: '豹紋守宮' }
    },
    emits: ['update:breederSp', 'open-lightbox'],
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
    <div>
        <h1 class="page-title">種群展示</h1>
        <div class="tabs">
            <div class="tab" :class="{active:breederSp==='豹紋守宮'}" @click="$emit('update:breederSp', '豹紋守宮')">豹紋守宮</div>
            <div class="tab" :class="{active:breederSp==='肥尾守宮'}" @click="$emit('update:breederSp', '肥尾守宮')">肥尾守宮</div>
        </div>
        <!-- Breeders Grid (Photo Grid) -->
        <div class="grid photo-grid">
            <div class="card" v-for="i in breedersList" :key="i.ID" @click="$emit('open-lightbox', i)">
                <img :src="convertLink(i.ImageURL)" class="card-img">
                <div class="card-body" style="padding:10px;">
                    <div class="morph-title" style="font-size:1rem;text-align:center;">{{i.Morph}}</div>
                </div>
            </div>
        </div>
    </div>
</template>