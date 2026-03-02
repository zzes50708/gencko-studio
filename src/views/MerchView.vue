<script>
import { computed } from 'vue';
import { useHead } from '@vueuse/head';

export default {
    name: 'MerchView',
    props: {
        curTab: { type: String, required: true },
        merchList: { type: Array, default: () => [] },
        currentMerch: { type: Object, default: null },
        lineLink: { type: String, default: '' }
    },
    emits: ['open-detail', 'navigate', 'copy'],
    setup(props) {
        // [SEO] 圖片連結轉換 (需與 methods 保持一致)
        const getMetaImg = (url) => {
            if (!url) return 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1200&output=webp&q=80`;
        };

        const siteData = computed(() => {
            // 詳情模式
            if (props.curTab === 'merch_detail' && props.currentMerch) {
                const m = props.currentMerch;
                const img = getMetaImg(m.ImageURL);
                const url = `https://www.gencko.tw/merch/${m.ItemID}`;
                const title = `${m.Name} - NT$${m.Price}`;
                const desc = m.Description ? m.Description.slice(0, 150) + '...' : `Gencko 特選周邊：${m.Name}，售價 NT$${m.Price}。`;
                const isAvailable = m.Available !== 'No';

                // Product Schema
                const jsonLd = {
                    "@context": "https://schema.org/",
                    "@type": "Product",
                    "name": m.Name,
                    "image": [img],
                    "description": m.Description || desc,
                    "sku": m.ItemID,
                    "brand": {
                        "@type": "Brand",
                        "name": "Gencko Studio"
                    },
                    "offers": {
                        "@type": "Offer",
                        "url": url,
                        "priceCurrency": "TWD",
                        "price": m.Price,
                        "availability": isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                        "itemCondition": "https://schema.org/NewCondition"
                    }
                };

                return {
                    title,
                    desc,
                    img,
                    url,
                    script: [{ type: 'application/ld+json', children: JSON.stringify(jsonLd) }]
                };
            } else {
                // 列表模式
                return {
                    title: '周邊商品',
                    desc: 'Gencko Studio 精選爬蟲飼養器材、加熱墊、躲避屋與營養品。提供最適合守宮與爬蟲的專業周邊。',
                    img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
                    url: 'https://www.gencko.tw/merch',
                    script: []
                };
            }
        });

        useHead({
            title: computed(() => siteData.value.title),
            meta: [
                { name: 'description', content: computed(() => siteData.value.desc) },
                { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
                { property: 'og:description', content: computed(() => siteData.value.desc) },
                { property: 'og:image', content: computed(() => siteData.value.img) },
                { property: 'og:url', content: computed(() => siteData.value.url) },
                { property: 'og:type', content: 'product' }
            ],
            link: [
                { rel: 'canonical', href: computed(() => siteData.value.url) }
            ],
            script: computed(() => siteData.value.script)
        });
    },
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
                    <!-- 修正：open-detail 改為傳遞完整物件 m，而非 m.ItemID -->
                    <article class="card" v-for="m in merchList" :key="m.ItemID" @click="$emit('open-detail', m)" style="cursor:pointer;">
                        <img :src="convertLink(m.ImageURL)" :alt="m.Name" class="card-img">
                        <div class="card-body">
                            <h2 class="morph-title">{{m.Name}}</h2>
                            <div class="price">NT$ {{m.Price}}</div>
                        </div>
                    </article>
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
                            <img :src="convertLink(currentMerch.ImageURL)" :alt="currentMerch.Name" class="prod-main-img">
                        </div>
                        <div class="prod-info-box">
                            <h1 class="prod-title">{{currentMerch.Name}}</h1>
                            <div class="merch-desc">{{currentMerch.Description}}</div>
                            <div class="prod-price-area">
                                <div class="price">NT$ {{currentMerch.Price}}</div>
                            </div>
                            <div class="prod-actions">
                                <a v-if="currentMerch.Available!=='No'" :href="currentMerch.ExternalLink || lineLink" target="_blank" class="btn-buy-lg" rel="noopener noreferrer">🛒 前往購買</a>
                                <button class="btn-share" @click="shareCurrentPage">🔗 複製連結分享</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>