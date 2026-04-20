<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useHead } from '#imports'
import { useMainStore } from '~/stores/useMainStore'
import { getCleanUrl } from '~/utils/image.js'

const store = useMainStore()
const router = useRouter()

// 取出全域狀態中的 careImg
const careImg = computed(() => store.careImg)

useHead({
    title: '飼養方式',
    meta:[
        { name: 'description', content: 'Gencko Studio 專業守宮飼養方式指南。提供環境佈置、溫度濕度控制與營養管理等全面教學。' },
        { property: 'og:title', content: '飼養方式 | Gencko Studio' },
        { property: 'og:description', content: 'Gencko Studio 專業守宮飼養方式指南。' },
        { property: 'og:url', content: 'https://www.genckobreeding.com/care' }
    ]
})

// 🌟 返回邏輯
const goBack = () => {
    if (window.history.state && window.history.state.back) {
        router.back()
    } else {
        router.push('/')
    }
}
</script>

<template>
    <div class="care-page-wrapper">
        
        <!-- 手機版顯示的 App-like 返回按鈕 -->
        <div class="nav-action-row m-only">
            <button class="app-back-btn" @click="goBack">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                返回
            </button>
        </div>

        <div class="content-card">
            <!-- 標題 -->
            <h1 class="page-title dt-only">守宮飼養方式指南</h1>
            <h1 class="m-page-title m-only">飼養方式指南</h1>
            
            <!-- 使用 NuxtImg 進行圖片最佳化 -->
            <NuxtImg 
                v-if="careImg" 
                :src="getCleanUrl(careImg)" 
                class="care-top-img" 
                alt="飼養環境示範"
                width="800"
                height="400"
                fit="cover"
                format="webp"
                loading="lazy"
            />
            
            <!-- App 風格的 List -->
            <div class="care-info-list">
                <div class="info-row">
                    <div class="info-label">飼養箱</div>
                    <div class="info-val">至少 40×30×20 公分起（視個體大小調整），可選玻璃或壓克力材質。若空間允許，提供較大空間效果更佳。</div>
                </div>
                <div class="info-row">
                    <div class="info-label">底材</div>
                    <div class="info-val">使用易清潔、無碎屑及誤食風險的底材，如廚房紙巾、椰纖土、大顆赤玉土等。避免使用沙粒或細碎底材，以防吞入造成腸胃阻塞。</div>
                </div>
                <div class="info-row">
                    <div class="info-label">躲避處</div>
                    <div class="info-val">至少準備一處：為避免守宮因環境造成緊迫，提供遮蔽物可以提升守宮的安全感，同時可幫助脫皮。</div>
                </div>
                <div class="info-row">
                    <div class="info-label">加熱與溫度</div>
                    <div class="info-val">提供底部加熱墊，創造熱區與冷區。建議熱區約 30–32°C，冷區約 24–26°C。守宮可依需求自行選擇合適區域。</div>
                </div>
                <div class="info-row">
                    <div class="info-label">濕度</div>
                    <div class="info-val">整體環境維持乾燥，但濕區濕度略高，以協助脫皮。濕度控制與乾燥底材與乾燥環境並存是地棲守宮的最佳選擇。</div>
                </div>
                <div class="info-row">
                    <div class="info-label">飲水</div>
                    <div class="info-val">每日提供乾淨水源，使用淺水碟即可，並每天更換水以確保衛生。</div>
                </div>
            </div>

            <div class="care-section">
                <div class="care-h">飲食與營養管理</div>
                <div class="care-p">地棲守宮為標準食蟲性動物，均衡的營養與定期補充對健康至關重要。</div>
                <div class="care-p">● 主要餌料：蟋蟀、杜比亞蟑螂為主。依個體需求搭配，避免單一餵食。</div>
                <div class="care-p">● 補充營養：建議定期為餌料裹鈣粉與維生素（含 D₃），防止鈣質缺乏、代謝性骨病與脫皮異常。</div>
                <div class="care-p">● 餵食頻率與份量：幼體建議每日或隔日餵食；成體則每隔 2–3 天餵食一次。餵食份量以不超過守宮頭部寬度為上限。</div>
            </div>
            
            <div class="care-section">
                <div class="care-h">常見飼養注意事項</div>
                <div class="care-p">● 脫皮期間：在脫皮期間，務必維持濕躲區濕潤，並提供可摩擦的粗糙表面（如木塊或岩石），可協助守宮順利脫皮。若腳趾或尾巴出現卡皮情形，請立即協助移除以免造成阻塞或傷害。</div>
                <div class="care-p">● 單獨飼養：地棲守宮具有領域性，不適合混養。建議一缸一隻，以避免爭鬥、壓力或健康問題。</div>
                <div class="care-p">● 避免過度干擾：過度頻繁把玩、搬動、抓取，或環境劇烈變動，都可能導致守宮緊張，甚至出現自我防衛（如斷尾）行為。</div>
            </div>
            
            <div class="care-section">
                <div class="care-h">為何選擇豹紋／肥尾守宮</div>
                <div class="care-p">● 容易飼養：對環境要求彈性，適合首次接觸爬蟲的飼主。</div>
                <div class="care-p">● 健康穩定：只要環境、飲食、溫濕度控制得宜，守宮能展現良好食慾、脫皮與活動狀態。</div>
                <div class="care-p">● 相對友善：地棲習性、安靜性格、體型適中，適合室內飼養，照顧相對簡便。</div>
            </div>
            
            <div class="care-quote">
                我們將守宮視為需被妥善照護的生命，而非一般商品。本指南旨在協助飼主以正確、全面的知識理解守宮的行為與需求，並依據其生理特性提供安全、穩定且適宜的環境。需要特別強調的是，守宮在個體性格、反應模式與適應能力上皆存在差異，環境配置與照護方式亦無絕對標準，應根據個體狀況進行調整。
            </div>
        </div>
    </div>
</template>

<style scoped>
.care-page-wrapper {
    max-width: 900px;
    margin: 0 auto;
    padding-top: 15px;
    padding-bottom: 20px;
}

/* Responsive Utilities */
.dt-only { display: block; }
.m-only { display: none !important; }

/* App-like 返回按鈕 */
.nav-action-row {
    width: 100%;
    display: flex;
    justify-content: flex-start;
    margin-bottom: 10px;
}

.app-back-btn {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: var(--txt);
    font-size: 0.95rem;
    font-weight: bold;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 30px;
    transition: 0.2s;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
}

.app-back-btn:active {
    transform: scale(0.95);
    background: rgba(255, 255, 255, 0.1);
}

/* 卡片化內容 */
.content-card {
    background: var(--card-bg);
    border: 1px solid var(--bd);
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
}

.page-title {
    font-size: 2.2rem;
    margin: 0 0 20px 0;
    color: #fff;
    line-height: 1.2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 15px;
}

.care-top-img {
    width: 100%;
    height: auto;
    max-height: 350px;
    object-fit: cover;
    background: #050505;
    border: 1px solid var(--bd);
    border-radius: 12px;
    margin-bottom: 25px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.3);
}

/* App-like List (取代 Table) */
.care-info-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 30px;
}

.info-row {
    display: flex;
    align-items: flex-start;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid var(--bd);
    border-radius: 10px;
    padding: 15px;
}

.info-label {
    width: 120px;
    font-weight: bold;
    color: var(--pri);
    flex-shrink: 0;
    font-size: 1.05rem;
}

/* 🌟 統一改為純白色以確保夜間模式清晰 */
.info-val {
    flex: 1;
    color: #fff;
    line-height: 1.6;
    font-size: 0.95rem;
    font-weight: 500;
}

.care-section {
    margin-bottom: 20px;
    background: rgba(255, 255, 255, 0.02);
    padding: 20px;
    border-radius: 12px;
    border: 1px solid var(--bd);
}

.care-h {
    color: var(--pri);
    font-weight: 900;
    font-size: 1.2rem;
    margin-bottom: 12px;
    display: block;
    border-bottom: 1px dashed rgba(255,255,255,0.1);
    padding-bottom: 8px;
}

/* 🌟 統一改為純白色以確保夜間模式清晰 */
.care-p {
    color: #fff;
    line-height: 1.7;
    margin-bottom: 10px;
    font-size: 1rem;
    font-weight: 500;
}

.care-quote {
    font-style: normal;
    color: #fff;
    background: linear-gradient(90deg, rgba(255, 69, 0, 0.1), transparent);
    padding: 20px;
    border-radius: 12px;
    border-left: 4px solid var(--pri);
    margin-top: 30px;
    line-height: 1.8;
    text-align: justify;
    font-size: 1.05rem;
    border: 1px solid var(--bd);
    border-left-width: 4px;
    font-weight: 500;
}

/* 🌟 Day Mode Overrides：強制套用純黑色 (#000) 確保白天戶外也能看清 */
:global(body.day-mode) .app-back-btn { background: #fff; border-color: #ddd; color: #333; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
:global(body.day-mode) .app-back-btn:active { background: #f0f0f0; }
:global(body.day-mode) .content-card { background: #fff; border-color: #ddd; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); }
:global(body.day-mode) .page-title { color: #111; border-bottom-color: #eee; }
:global(body.day-mode) .m-page-title { color: #111; border-bottom-color: #eee; }
:global(body.day-mode) .care-top-img { border-color: #ddd; box-shadow: 0 5px 20px rgba(0,0,0,0.05); }
:global(body.day-mode) .info-row { background: #f9f9f9; border-color: #eee; }
:global(body.day-mode) .info-val { color: #000; } /* 🌟 強制純黑 */
:global(body.day-mode) .care-section { background: #fff; border-color: #eee; box-shadow: 0 4px 15px rgba(0,0,0,0.02); }
:global(body.day-mode) .care-h { border-bottom-color: #ddd; }
:global(body.day-mode) .care-p { color: #000; } /* 🌟 強制純黑 */
:global(body.day-mode) .care-quote { background: #fff3e0; border-color: #ffb74d; color: #000; box-shadow: 0 4px 15px rgba(0,0,0,0.05); } /* 🌟 強制純黑 */

/* Mobile Optimizations */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .m-only { display: flex !important; }
    
    .care-page-wrapper {
        padding-top: 0;
    }
    
    .nav-action-row {
        margin-bottom: 5px;
    }
    
    .app-back-btn {
        padding: 6px 12px;
        font-size: 0.95rem;
    }
    
    .content-card {
        padding: 15px;
        border-radius: 12px;
    }
    
    .m-page-title {
        font-size: 1.8rem;
        margin: 0 0 15px 0;
        color: var(--txt);
        font-weight: 900;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 10px;
    }
    
    .care-top-img {
        max-height: 250px;
        margin-bottom: 15px;
    }
    
    .info-row {
        flex-direction: column;
        gap: 6px;
        padding: 12px;
    }
    
    .info-label {
        width: 100%;
        font-size: 1.1rem;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding-bottom: 4px;
    }
    
    :global(body.day-mode) .info-label { border-bottom-color: #ddd; }
    
    .info-val {
        font-size: 0.95rem;
    }
    
    .care-section {
        padding: 15px;
    }
    
    .care-h {
        font-size: 1.1rem;
    }
    
    .care-p {
        font-size: 0.95rem;
    }
    
    .care-quote {
        padding: 15px;
        font-size: 0.95rem;
    }
}
</style>