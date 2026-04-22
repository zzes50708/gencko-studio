<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'

const route = useRoute()
const supabase = useSupabaseClient()
const identityId = route.params.id

//[SEO] 透過 SSR 抓取電子身分證資料，確保分享連結能直接預覽
const { data: item, pending, error } = await useAsyncData(`identity-${identityId}`, async () => {
    const { data, error: fetchError } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', identityId)
        .single()

    if (fetchError || !data) {
        throw new Error('找不到此個體資料或已下架')
    }

    return {
        ID: data.id,
        Morph: data.morph,
        GenderType: data.gender_type,
        GenderValue: data.gender_value,
        Birthday: data.birthday,
        Species: data.species,
        ImageURL: data.image_url
    }
})

// 圖片解析處理
const displayImg = computed(() => {
    if (!item.value || !item.value.ImageURL) return null
    const url = item.value.ImageURL
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
    const match = url.match(driveRegex)
    let target = url
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1200&output=webp&q=90`
})

// 性別格式化
const fmtSex = computed(() => {
    if (!item.value) return ''
    const i = item.value
    if (i.GenderType === '溫度') {
        return `溫度 ${i.GenderValue || '?'}°C`
    }
    return i.GenderType || 'Unsexed'
})

// 性別顏色標籤
const sexClass = computed(() => {
    if (!item.value) return ''
    const g = item.value.GenderType
    if (g === '公') return 't-male'
    if (g === '母') return 't-female'
    return 't-mix'
})

// 動態生成 SEO 與社群分享卡片 (Open Graph)
const siteData = computed(() => {
    if (item.value) {
        const i = item.value
        const title = `${i.Morph} - 專屬電子身分證`
        const desc = `Gencko Studio 嚴選繁育個體。ID: ${i.ID}，性別: ${fmtSex.value}，出生日: ${i.Birthday || '未登錄'}。點擊查看完整身分證資訊。`
        const img = displayImg.value || 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png'
        const url = `https://www.genckobreeding.com/identity/${i.ID}`
        return { title, desc, img, url }
    }
    return {
        title: '專屬電子身分證',
        desc: 'Gencko Studio 專屬電子身分證查詢系統',
        img: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
        url: `https://www.genckobreeding.com/identity/${identityId}`
    }
})

useHead({
    title: computed(() => siteData.value.title),
    meta:[
        { name: 'description', content: computed(() => siteData.value.desc) },
        { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
        { property: 'og:description', content: computed(() => siteData.value.desc) },
        { property: 'og:image', content: computed(() => siteData.value.img) },
        { property: 'og:url', content: computed(() => siteData.value.url) },
        { property: 'og:type', content: 'profile' },
        { name: 'twitter:card', content: 'summary_large_image' }
    ]
})

const triggerPrint = () => {
    if (import.meta.client) {
        window.print()
    }
}
</script>

<template>
    <div class="id-page-container">
        
        <!-- Loading / Error -->
        <div v-if="pending" class="status-msg">
            <div class="loader"></div>
        </div>
        <div v-else-if="error" class="status-msg err">
            ⚠️ {{ error.message || '找不到此個體資料或已下架' }}
            <TheBackButton fallback="/" text="返回上一頁" style="margin-top: 20px; justify-content: center;" />
        </div>

        <!-- Identity Content -->
        <div v-else-if="item" class="id-content-wrap">
            
            <!-- 🌟 引入全域共用的 App-like 返回按鈕 -->
            <TheBackButton fallback="/" text="返回上一頁" />

            <!-- 卡片本體 -->
            <div class="id-card print-target">
                
                <!-- Left: Photo -->
                <div class="card-photo-box">
                    <img v-if="displayImg" :src="displayImg" alt="ID Photo">
                    <div v-else class="no-img">No Image</div>
                </div>

                <!-- Right: Info -->
                <div class="card-info-box">
                    <div class="card-header">
                        <div class="brand-sub">Digital Identity</div>
                        <h1 class="card-id">{{ item.ID }}</h1>
                        <div class="brand-logo">Gencko Studio</div>
                    </div>

                    <div class="info-grid">
                        <div class="ig-row">
                            <label>Morph</label>
                            <div class="ig-val highlight">{{ item.Morph }}</div>
                        </div>
                        <div class="ig-row">
                            <label>Gender</label>
                            <div class="ig-val" :class="sexClass">{{ fmtSex }}</div>
                        </div>
                        <div class="ig-row">
                            <label>Birthday</label>
                            <div class="ig-val">{{ item.Birthday || 'Unknown' }}</div>
                        </div>
                        <div class="ig-row" v-if="item.Species">
                            <label>Species</label>
                            <div class="ig-val">{{ item.Species }}</div>
                        </div>
                    </div>

                    <div class="card-footer">
                        <div class="cf-line"></div>
                        <div class="cf-txt">Verified & Bred by Gencko Studio</div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="id-actions">
                <button @click="triggerPrint" class="act-btn primary">
                    🖨️ 儲存電子身分證 (PDF)
                </button>
            </div>
            <p class="id-hint">* 點擊按鈕可將此卡片存為 PDF 收藏</p>

        </div>
    </div>
</template>

<style scoped>
/*
  [局部樣式修復] 
  已將外圍 UI（狀態文字、載入動畫）全面變數化。
  徹底移除所有 :global(body.day-mode) 的強制覆寫與重複的返回按鈕樣式。
  （註：.id-card 本體保留絕對色碼，以確保實體電子身分證的視覺與列印一致性）
*/

/* 基本頁面設定 */
.id-page-container {
    min-height: 50vh;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 5px;
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    width: 100%;
}

.id-content-wrap {
    width: 100%;
    max-width: 800px;
}

/* Status (已變數化) */
.status-msg { 
    text-align: center; 
    font-size: 1.2rem; 
    color: var(--txt); 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
}
.loader { 
    width: 40px; 
    height: 40px; 
    border: 4px solid var(--bd); 
    border-top-color: var(--pri); 
    border-radius: 50%; 
    animation: spin 1s linear infinite; 
    margin: 0 auto 10px; 
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Card Design (預設電腦版：橫向) - 保留實體卡片固定色彩設計 */
.id-card {
    background: #fff;
    color: #1e293b;
    width: 100%;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: row;
    position: relative;
    z-index: 10;
}

/* Photo Section */
.card-photo-box {
    flex: 1.2;
    background: #f8fafc;
    position: relative;
    min-height: 300px;
    display: flex; 
    align-items: center; 
    justify-content: center;
    overflow: hidden;
}
.card-photo-box img { width: 100%; height: 100%; object-fit: cover; display: block; }
.no-img { color: #94a3b8; font-weight: bold; }

/* Info Section */
.card-info-box { flex: 1; padding: 30px; display: flex; flex-direction: column; background: #fff; }
.card-header { margin-bottom: 25px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; }
.brand-sub { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 2px; color: #64748b; font-weight: bold; }
.card-id { font-size: 2.2rem; font-weight: 900; margin: 5px 0; color: #0f172a; line-height: 1; }
.brand-logo { font-size: 0.9rem; font-weight: bold; color: #d84315; }
.info-grid { display: flex; flex-direction: column; gap: 15px; flex: 1; }
.ig-row { display: flex; flex-direction: column; }
.ig-row label { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: bold; margin-bottom: 2px; }
.ig-val { font-size: 1.1rem; font-weight: 600; color: #334155; }
.ig-val.highlight { font-size: 1.25rem; color: #0f172a; font-weight: 800; line-height: 1.2; }
.t-male { color: #2563eb; }
.t-female { color: #db2777; }
.t-mix { color: #8b5cf6; }
.card-footer { margin-top: 30px; }
.cf-line { height: 4px; width: 40px; background: #d84315; margin-bottom: 10px; }
.cf-txt { font-size: 0.7rem; color: #94a3b8; font-style: italic; }

.id-actions { margin-top: 30px; display: flex; justify-content: center; width: 100%; }
.act-btn {
    padding: 12px 28px; border-radius: 30px; border: none;
    font-weight: bold; font-size: 1rem; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    background: #d84315; color: #fff;
    transition: 0.2s;
    max-width: 90%;
}
.act-btn:active {
    transform: scale(0.95);
}

/* 提示文字 (已變數化) */
.id-hint { 
    font-size: 0.8rem; 
    color: var(--txt); 
    opacity: 0.6; 
    margin-top: 15px; 
    text-align: center; 
}

/* 🌟 Mobile Responsive (強制並排，左圖右文) */
@media (max-width: 768px) {
    .id-page-container { padding-top: 0; padding-bottom: 15px; }

    .id-card {
        flex-direction: row; /* 強制左右排列 */
        max-width: 100%;
        width: 100%;
        border-radius: 12px;
        align-items: stretch;
    }

    .card-photo-box {
        width: 265px; /* 固定左側照片寬度 */
        flex: none;
        height: auto;
        min-height: 180px;
    }

    .card-info-box {
        padding: 12px;
        flex: 1;
        min-width: 0; /* 讓文字可以縮排截斷 */
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    /* 縮減字體適應雙欄 */
    .card-header { margin-bottom: 10px; padding-bottom: 8px; border-bottom-width: 1px; }
    .brand-sub { font-size: 0.55rem; }
    .card-id { font-size: 1.25rem; margin: 2px 0; }
    .brand-logo { font-size: 0.7rem; }

    .info-grid { gap: 8px; }
    .ig-row label { font-size: 0.6rem; }
    .ig-val { font-size: 0.85rem; }
    .ig-val.highlight { font-size: 0.95rem; }

    .card-footer { margin-top: 15px; }
    .cf-line { margin-bottom: 6px; }
    .cf-txt { font-size: 0.6rem; }

    .id-actions { margin-top: 20px; }
    .act-btn { padding: 10px 20px; font-size: 0.9rem; }
    .id-hint { font-size: 0.75rem; margin-top: 8px; }
}
</style>