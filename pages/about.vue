<script setup>
import { computed } from 'vue'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'

const store = useMainStore()

// 取出全域狀態中的 aboutImg
const aboutImg = computed(() => store.aboutImg)

useHead({
    title: '關於我們',
    meta:[
        { name: 'description', content: 'Gencko Studio 致力於建立嚴謹的爬蟲繁殖標準，提供實體影像紀錄、全天候專業諮詢及完整的售後支持。' },
        { property: 'og:title', content: '關於我們 | Gencko Studio' },
        { property: 'og:description', content: 'Gencko Studio 致力於建立嚴謹的爬蟲繁殖標準，確保個體呈現穩定的狀態與良好的體質。' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/about' }
    ]
})

const convertLink = (url) => {
    if (!url) return ''
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    let target = url
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`
}

const openLineGroup = () => {
    window.open('https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg?utm_source=invitation&utm_medium=link_copy&utm_campaign=default')
}
</script>

<template>
    <div>
        <div class="page-text-box">
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

<style scoped>
/*[局部樣式修復] 
  About 頁面的樣式原本散落在全域的 style.css 中，並依賴 body.day-mode 與寫死色碼。
  現在將專屬樣式抽回頁面內，全面導入 CSS 變數，達成日夜模式自動適配。
  【行動端優化】已將手機版排版改為「左圖右文」的並排設計，節省垂直空間。
*/
.about-page-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding-top: 15px;
    padding-bottom: 20px;
}

/* 品牌故事區塊 */
.about-layout { 
    display: flex; 
    gap: 20px; 
    align-items: flex-start; 
}

.about-img { 
    width: 40%; 
    object-fit: cover; 
    border-radius: 12px; 
    border: 1px solid var(--bd); 
    box-shadow: 0 5px 20px rgba(0,0,0,0.1);
}

.about-content { 
    flex: 1; 
}

/* 將原先寫死 #ccc 的文字改用 var(--txt) 與 opacity */
.about-content p {
    color: var(--txt);
    opacity: 0.9;
    line-height: 1.7;
    font-size: 1.05rem;
    margin-bottom: 15px;
    text-align: justify;
}

/* Gencko 繁育標準區塊 (全面變數化) */
.breeding-std-box { 
    display: flex; 
    align-items: flex-start; 
    gap: 20px; 
    background: var(--card-bg); 
    border: 1px solid var(--bd); 
    padding: 25px; 
    border-radius: 12px; 
    margin-bottom: 25px; 
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

.std-img-wrapper { 
    width: 250px; 
    height: auto; 
    flex-shrink: 0; 
}

.std-img { 
    width: 100%; 
    height: auto; 
    object-fit: cover; 
    border-radius: 8px; 
    border: 1px solid var(--bd); 
}

.std-content { 
    flex: 1; 
}

.std-title { 
    color: var(--pri); 
    font-size: 1.25rem; 
    font-weight: 900; 
    margin-bottom: 12px; 
    border-bottom: 1px dashed var(--bd);
    padding-bottom: 8px;
}

.std-desc { 
    color: var(--txt); 
    opacity: 0.85;
    font-size: 1rem; 
    line-height: 1.6; 
    text-align: justify; 
}

.std-desc p {
    margin-bottom: 10px;
}

/* 🌟 Mobile Optimizations (左邊 Brand Story，右邊 繁育標準) */
@media (max-width: 768px) {
    /* 利用 :has 選擇器直接讓最外層容器變成雙欄網格 */
    div:has(> .page-text-box) {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 5px 10px 15px 10px;
        align-items: start;
    }

    .page-title {
        font-size: 1.1rem;
        margin-bottom: 10px;
        padding-bottom: 6px;
    }

    .page-text-box {
        margin-bottom: 0; /* 移除原本的底部間距，交由 grid gap 處理 */
        padding: 12px;
    }

    /* 左側 Brand Story 內部：上下堆疊 */
    .about-layout { 
        flex-direction: column; 
        gap: 10px; 
    }
    
    .about-img { 
        width: 100%; 
        height: 120px; /* 固定高度保持左右對齊 */
        object-fit: cover;
        border-radius: 8px;
    }
    
    .about-content p {
        font-size: 0.8rem; /* 縮小文字以適應較窄的雙欄 */
        line-height: 1.5;
        margin-bottom: 8px;
    }

    /* 右側繁育標準區塊：取消 margin 並調整內距 */
    .breeding-std-box { 
        margin-bottom: 0;
        padding: 12px;
        flex-direction: column; 
        gap: 10px;
    }
    
    /* 右側繁育標準內部：上下堆疊 */
    .std-img-wrapper { 
        width: 100%; 
        margin: 0;
    }
    
    .std-img {
        width: 100%;
        height: 120px; /* 固定高度保持左右對齊 */
        object-fit: cover;
        border-radius: 8px;
    }

    .std-title {
        font-size: 1.05rem;
        margin-bottom: 8px;
        padding-bottom: 6px;
        text-align: left;
    }

    .std-desc {
        font-size: 0.8rem;
        line-height: 1.5;
    }

    .std-desc p {
        margin-bottom: 8px;
    }
}
</style>