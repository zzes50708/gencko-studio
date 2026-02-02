<script>
export default {
    name: 'MerchView',
    props: {
        curTab: { type: String, required: true },
        merchList: { type: Array, default: () => [] },
        currentMerch: { type: Object, default: null },
        lineLink: { type: String, default: '' }
    },
    emits: ['open-detail', 'navigate', 'copy'],
    methods: {
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        },
        shareCurrentPage() {
            this.$emit('copy', window.location.href);
        }
    }
}
</script>

<template>
    <div>
        <!-- List Mode -->
        <transition name="fade">
            <div v-show="curTab==='merch'">
                <h1 class="page-title">周邊商品</h1>
                <div class="grid">
                    <div class="card" v-for="m in merchList" :key="m.ItemID" @click="$emit('open-detail', m.ItemID)">
                        <img :src="convertLink(m.ImageURL)" class="card-img">
                        <div class="card-body">
                            <div class="morph-title">{{m.Name}}</div>
                            <div class="price">NT$ {{m.Price}}</div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Detail Mode -->
        <transition name="fade">
            <div v-show="curTab==='merch_detail'">
                <div v-if="currentMerch" class="prod-container">
                    <button class="btn-back" @click="$emit('navigate', '/merch')">← 返回列表</button>
                    <div class="prod-layout">
                        <div class="prod-img-box">
                            <img :src="convertLink(currentMerch.ImageURL)" class="prod-main-img">
                        </div>
                        <div class="prod-info-box">
                            <h1 class="prod-title">{{currentMerch.Name}}</h1>
                            <div class="merch-desc">{{currentMerch.Description}}</div>
                            <div class="prod-price-area">
                                <div class="price">NT$ {{currentMerch.Price}}</div>
                            </div>
                            <div class="prod-actions">
                                <a v-if="currentMerch.Available!=='No'" :href="currentMerch.ExternalLink || lineLink" target="_blank" class="btn-buy-lg">🛒 前往購買</a>
                                <button class="btn-share" @click="shareCurrentPage">🔗 複製連結分享</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>