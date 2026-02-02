<script>
export default {
    name: 'AboutView',
    props: {
        aboutImg: { type: String, default: '' }
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
        openLineGroup() {
            window.open('https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg?utm_source=invitation&utm_medium=link_copy&utm_campaign=default');
        }
    }
}
</script>

<template>
    <div>
        <div class="page-text-box">
            <div class="page-title">BRAND STORY</div>
            <div class="about-layout">
                <img v-if="aboutImg" :src="convertLink(aboutImg)" alt="Gencko 豹紋守宮成體" class="about-img" title="點擊加入社群" @click="openLineGroup" style="cursor:pointer;">
                <div class="about-content">
                    <p>Gencko 致力於建立嚴謹的爬蟲繁殖標準。</p>
                    <p>我們重視每一個成長環節，從環境、營養到日常照護皆以最高標準執行，確保個體呈現穩定的狀態與良好的體質。</p>
                    <p>秉持資訊透明與誠信原則，我們提供實體影像紀錄、全天候專業諮詢及完整的售後支持。同時，我們重視飼主教育，致力推廣正確的飼養觀念，確保您在充分準備下開啟飼養旅程。</p>
                    <p>我們尊重每一個生命價值，期望透過專業知識與完善服務，成為您踏入爬寵領域最堅實的後盾。</p>
                </div>
            </div>
        </div>
        <div class="breeding-std-box">
            <div class="std-img-wrapper">
                <img src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/380074.jpg" class="std-img" alt="Gencko 餵食標準">
            </div>
            <div class="std-content">
                <div class="std-title">Gencko 繁育標準</div>
                <div class="std-desc">
                    <p>順應幼體高代謝需求，落實高頻率飼養標準。</p>
                    <p>守宮幼體處於發育關鍵期，代謝速度快，營養轉化效率是成體的數倍。坊間常見一週 2 至 3 次的飼養頻率，往往僅能維持基本生存，卻限制了成長幅度。</p>
                    <p>Gencko 堅持「每週至少 6 次」的餵食計畫。我們不惜投入人力與杜比亞及蟋蟀等高成本食材，並於每次餵食添加足夠的鈣粉與營養粉。透過高頻率的營養補給，確保個體在骨骼定型期獲得足量支撐，建立紮實且穩定的體質基礎。</p>
                </div>
            </div>
        </div>
    </div>
</template>