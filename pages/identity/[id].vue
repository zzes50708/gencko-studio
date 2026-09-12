<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useHead, useAsyncData, useSupabaseClient } from '#imports'
import { getCleanUrl } from '~/utils/image'

const route = useRoute()
const supabase = useSupabaseClient()
const identityId = route.params.id

//[SEO] 透過 SSR 抓取電子身分證資料，確保分享連結能直接預覽
const {
  data: item,
  pending,
  error
} = await useAsyncData(`identity-${identityId}`, async () => {
  const { data, error: fetchError } = await supabase
    .from('animals')
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

// 圖片來源先正規化，讓代理失敗時仍能直接載入原始來源
const getIdentityImageSource = (url) => {
  if (!url) return null

  let target = String(url).trim()
  const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//
  const match = target.match(driveRegex)
  if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1]

  if (target.includes('cdn.jsdelivr.net/gh/')) {
    target = target
      .replace('https://cdn.jsdelivr.net/gh/', 'https://raw.githubusercontent.com/')
      .replace('@main/', '/main/')
      .replace('@master/', '/master/')
  }

  return target
}

const imageState = ref('optimized')
const identityImageEl = ref(null)

const originalImg = computed(() => {
  if (!item.value || !item.value.ImageURL) return null
  return getIdentityImageSource(item.value.ImageURL)
})

const displayImg = computed(() => {
  if (!originalImg.value) return null
  return getCleanUrl(originalImg.value, 1200)
})

const identityImageSrc = computed(() => {
  if (imageState.value === 'failed') return null
  if (imageState.value === 'fallback') return originalImg.value
  return displayImg.value
})

const handleImageError = () => {
  if (
    imageState.value === 'optimized' &&
    originalImg.value &&
    originalImg.value !== displayImg.value
  ) {
    imageState.value = 'fallback'
    return
  }

  imageState.value = 'failed'
}

onMounted(() => {
  const image = identityImageEl.value
  if (image?.complete && image.naturalWidth === 0) handleImageError()
})

// 性別格式化
const fmtSex = computed(() => {
  if (!item.value) return ''
  const i = item.value
  if (i.GenderType === '溫控') {
    return `孵化溫度:${i.GenderValue || '?'}度`
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
    const img =
      displayImg.value ||
      'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    const url = `https://www.genckobreeding.com/identity/${i.ID}`
    return { title, desc, img, url }
  }
  return {
    title: '專屬電子身分證',
    desc: 'Gencko Studio 專屬電子身分證查詢系統',
    img: 'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85',
    url: `https://www.genckobreeding.com/identity/${identityId}`
  }
})

useHead({
  bodyAttrs: { class: 'identity-print-page' },
  title: computed(() => siteData.value.title),
  meta: [
    { name: 'description', content: computed(() => siteData.value.desc) },
    { name: 'robots', content: 'noindex, nofollow' },
    { property: 'og:title', content: computed(() => `${siteData.value.title} | Gencko Studio`) },
    { property: 'og:description', content: computed(() => siteData.value.desc) },
    { property: 'og:image', content: computed(() => siteData.value.img) },
    { property: 'og:url', content: computed(() => siteData.value.url) },
    { property: 'og:type', content: 'profile' },
    { name: 'twitter:card', content: 'summary_large_image' }
  ],
  link: [{ rel: 'canonical', href: computed(() => siteData.value.url) }]
})

const triggerPrint = () => {
  if (import.meta.client) {
    window.print()
  }
}
</script>

<template>
  <div class="id-page-container">
    <div class="common-document-meta identity-document-meta" aria-label="身份文件說明">
      <span>GENCKO IDENTITY RECORD</span>
      <span>VERIFY / REVIEW / KEEP</span>
    </div>
    <div v-if="pending" class="status-msg" aria-busy="true">
      <div class="loader" aria-hidden="true"></div>
      <p role="status">正在取得電子身分證</p>
    </div>
    <div v-else-if="error" class="status-msg err">
      <h1>無法顯示電子身分證</h1>
      <p role="alert">{{ error.message || '找不到此個體資料或已下架' }}</p>
      <TheBackButton
        fallback="/"
        text="返回上一頁"
        style="margin-top: 20px; justify-content: center"
      />
    </div>

    <div v-else-if="item" class="id-content-wrap">
      <div class="identity-navigation">
        <TheBackButton fallback="/" text="返回上一頁" />
        <span>Gencko verified record</span>
      </div>

      <article
        class="identity-certificate"
        data-phase3-surface="identity"
        aria-labelledby="identity-title"
      >
        <header class="identity-heading">
          <div>
            <p class="identity-eyebrow">繁育紀錄證明</p>
            <h1 id="identity-title">個體 {{ item.ID }} 電子身分證</h1>
          </div>
          <span class="verified-mark">紀錄已建檔</span>
        </header>

        <div class="id-card print-target">
          <div class="card-photo-box">
            <img
              v-if="identityImageSrc"
              ref="identityImageEl"
              :src="identityImageSrc"
              :alt="`${item.Morph} 個體 ${item.ID} 電子身分證照片`"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              @error="handleImageError"
            />
            <div v-else class="no-img">No Image</div>
          </div>

          <div class="card-info-box">
            <div class="card-header">
              <div class="brand-sub">Digital Identity</div>
              <div class="card-id">{{ item.ID }}</div>
              <div class="brand-logo">Gencko Studio</div>
            </div>

            <dl class="info-grid">
              <div class="ig-row">
                <dt>Morph</dt>
                <dd class="ig-val highlight">{{ item.Morph }}</dd>
              </div>
              <div class="ig-row">
                <dt>Gender</dt>
                <dd class="ig-val" :class="sexClass">{{ fmtSex }}</dd>
              </div>
              <div class="ig-row">
                <dt>Birthday</dt>
                <dd class="ig-val">{{ item.Birthday || 'Unknown' }}</dd>
              </div>
              <div v-if="item.Species" class="ig-row">
                <dt>Species</dt>
                <dd class="ig-val">{{ item.Species }}</dd>
              </div>
            </dl>

            <div class="card-footer">
              <div class="cf-line"></div>
              <div class="cf-txt">Verified & Bred by Gencko Studio</div>
            </div>
          </div>
        </div>

        <div class="identity-note">
          <strong>電子紀錄</strong>
          <span>此頁呈現目前建檔的個體資訊，可列印或另存為 PDF 留存。</span>
        </div>

        <div class="id-actions">
          <button
            type="button"
            class="act-btn primary"
            aria-label="儲存電子身分證為 PDF"
            @click="triggerPrint"
          >
            <span aria-hidden="true">↓</span>
            儲存電子身分證（PDF）
          </button>
        </div>
        <p class="id-hint">瀏覽器將開啟列印面板，請選擇「另存為 PDF」。</p>
      </article>
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
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

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
  flex: 1;
  max-width: 50%;
  background: #f8fafc;
  position: relative;
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.card-photo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.no-img {
  color: #94a3b8;
  font-weight: bold;
}

/* Info Section */
.card-info-box {
  flex: 1;
  min-width: 0;
  padding: 30px;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.card-header {
  margin-bottom: 25px;
  border-bottom: 2px solid #e2e8f0;
  padding-bottom: 15px;
}
.brand-sub {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #64748b;
  font-weight: bold;
}
.card-id {
  font-size: 2.2rem;
  font-weight: 900;
  margin: 5px 0;
  color: #0f172a;
  line-height: 1;
}
.brand-logo {
  font-size: 0.9rem;
  font-weight: bold;
  color: #d84315;
}
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 15px;
  flex: 1;
}
.ig-row {
  display: flex;
  flex-direction: column;
}
.ig-row label {
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: bold;
  margin-bottom: 2px;
}
.ig-val {
  font-size: 1.1rem;
  font-weight: 600;
  color: #334155;
}
.ig-val.highlight {
  font-size: 1.25rem;
  color: #0f172a;
  font-weight: 800;
  line-height: 1.2;
}
.t-male {
  color: #2563eb;
}
.t-female {
  color: #db2777;
}
.t-mix {
  color: #8b5cf6;
}
.card-footer {
  margin-top: 30px;
}
.cf-line {
  height: 4px;
  width: 40px;
  background: #d84315;
  margin-bottom: 10px;
}
.cf-txt {
  font-size: 0.7rem;
  color: #94a3b8;
  font-style: italic;
}

.id-actions {
  margin-top: 30px;
  display: flex;
  justify-content: center;
  width: 100%;
}
.act-btn {
  min-height: var(--control-min-height);
  padding: 12px 28px;
  border-radius: 30px;
  border: none;
  font-weight: bold;
  font-size: 1rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  background: #d84315;
  color: #fff;
  transition: 0.2s;
  max-width: 90%;
}
.act-btn:active {
  transform: scale(0.95);
}
.act-btn:focus-visible {
  outline: 3px solid var(--pri);
  outline-offset: 2px;
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
  .id-page-container {
    padding-top: 0;
    padding-bottom: 15px;
  }

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
  .card-header {
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom-width: 1px;
  }
  .brand-sub {
    font-size: 0.55rem;
  }
  .card-id {
    font-size: 1.25rem;
    margin: 2px 0;
  }
  .brand-logo {
    font-size: 0.7rem;
  }

  .info-grid {
    gap: 8px;
  }
  .ig-row label {
    font-size: 0.6rem;
  }
  .ig-val {
    font-size: 0.85rem;
  }
  .ig-val.highlight {
    font-size: 0.95rem;
  }

  .card-footer {
    margin-top: 15px;
  }
  .cf-line {
    margin-bottom: 6px;
  }
  .cf-txt {
    font-size: 0.6rem;
  }

  .id-actions {
    margin-top: 20px;
  }
  .act-btn {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
  .id-hint {
    font-size: 0.75rem;
    margin-top: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loader,
  .act-btn {
    animation: none !important;
    transition: none !important;
  }
  .act-btn:active {
    transform: none;
  }
}

/* Phase 3 focused redesign：以檔案館式證明卡補強頁面層級。 */
.id-page-container {
  justify-content: flex-start;
  padding: 1rem 1.25rem 5rem;
  font-family: inherit;
}

.id-content-wrap {
  max-width: 960px;
}

.identity-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.identity-navigation > span {
  color: var(--txt);
  font-size: 0.7rem;
  text-transform: uppercase;
  opacity: 0.48;
}

.identity-certificate {
  width: 100%;
}

.identity-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 2rem;
  padding: clamp(1.25rem, 4vw, 2.75rem) 0 1.5rem;
}

.identity-eyebrow {
  margin: 0 0 0.6rem;
  color: var(--pri);
  font-size: 0.75rem;
  font-weight: 800;
}

.identity-heading h1 {
  margin: 0;
  color: var(--txt);
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1.03;
  text-wrap: balance;
}

.verified-mark {
  flex: none;
  padding: 0.45rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--pri) 38%, var(--bd));
  border-radius: 0.5rem;
  color: var(--pri);
  font-size: 0.75rem;
  font-weight: 800;
}

.id-card {
  min-height: 25rem;
  border: 1px solid #d9d4cf;
  border-radius: 1.25rem;
  box-shadow: 0 24px 60px rgba(43, 34, 28, 0.2);
}

.card-photo-box {
  min-height: 25rem;
}

.card-info-box {
  padding: clamp(1.5rem, 4vw, 3rem);
}

.card-id {
  margin: 0.3rem 0;
  color: #0f172a;
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.info-grid {
  margin: 0;
}

.ig-row dt {
  margin-bottom: 0.2rem;
  color: #7a8799;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
}

.ig-row dd {
  margin: 0;
}

.identity-note {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  margin-top: 1rem;
  padding: 1rem 1.25rem;
  border-left: 3px solid var(--pri);
  background: var(--card-bg);
  color: var(--txt);
}

.identity-note strong {
  font-size: 0.82rem;
}

.identity-note span {
  font-size: 0.82rem;
  line-height: 1.55;
  opacity: 0.65;
}

.id-actions {
  margin-top: 1.5rem;
}

.act-btn {
  gap: 0.5rem;
  box-shadow: 0 8px 20px rgba(216, 67, 21, 0.22);
  transition:
    transform 180ms ease-out,
    box-shadow 180ms ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .act-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(216, 67, 21, 0.3);
  }
}

@media (max-width: 620px) {
  .id-page-container {
    padding: 0.5rem 0.75rem 4rem;
  }

  .identity-navigation > span {
    display: none;
  }

  .identity-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 1rem;
    padding-top: 0.75rem;
  }

  .identity-heading h1 {
    font-size: clamp(2rem, 10vw, 3rem);
  }

  .id-card {
    min-height: 0;
    flex-direction: column;
    border-radius: 1rem;
  }

  .card-photo-box {
    width: 100%;
    max-width: none;
    min-height: 0;
    aspect-ratio: 1 / 1;
  }

  .card-info-box {
    width: 100%;
    padding: 1.25rem;
  }

  .card-header {
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
  }

  .brand-sub,
  .brand-logo,
  .cf-txt {
    font-size: 0.7rem;
  }

  .card-id {
    margin: 0.3rem 0;
    font-size: 2rem;
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .ig-row dt {
    font-size: 0.65rem;
  }

  .ig-val,
  .ig-val.highlight {
    overflow-wrap: anywhere;
    font-size: 0.95rem;
  }

  .card-footer {
    margin-top: 1.5rem;
  }

  .identity-note {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .act-btn {
    width: 100%;
    max-width: none;
  }
}

.identity-heading h1 {
  font-family: 'Noto Serif TC', serif;
  letter-spacing: -0.04em;
}

.id-card {
  border-radius: 0;
  box-shadow: none;
}

.identity-note,
.act-btn {
  border-radius: 2px;
}

.identity-navigation,
.identity-certificate,
.identity-note {
  border-radius: 0;
  box-shadow: none;
}

.identity-navigation,
.identity-certificate {
  border-width: 1px 0;
  background-image: none;
}

.info-grid {
  gap: 0;
  border-top: 1px solid var(--bd);
  border-left: 1px solid var(--bd);
}

.info-grid > * {
  border-width: 0 1px 1px 0;
  border-radius: 0;
}

@media print {
  .common-document-meta,
  .identity-navigation,
  .identity-heading,
  .identity-note,
  .id-actions,
  .id-hint {
    display: none !important;
  }

  .id-page-container {
    padding: 0;
  }

  .id-card {
    box-shadow: none;
    break-inside: avoid;
  }
}
/* 電子證書保留文件邊界與列印版面，只統一螢幕閱讀介面。 */
@media screen {
  .id-page-container {
    padding-top: 8px;
    padding-bottom: 28px;
  }
  .identity-certificate {
    border-radius: 0;
    box-shadow: none;
    padding-top: 18px;
  }
  .identity-heading {
    gap: 16px;
    margin-bottom: 18px;
  }
  .identity-heading h1 {
    font-family: var(--font-heading-zh);
    font-size: clamp(1.7rem, 3.5vw, 2.6rem);
    line-height: 1.4;
  }
  .identity-note {
    border-radius: 0;
    background: transparent;
    border-inline: 0;
    padding-block: 14px;
  }
  .act-btn {
    min-height: 44px;
    border-radius: 2px;
    box-shadow: none;
  }
  .id-hint {
    margin-bottom: 0;
  }
}
/* 本頁返回與次要操作使用同一按鈕形式。 */
:deep(.app-back-btn),
.btn-app {
  border-radius: 2px;
  min-height: 44px;
  box-shadow: none;
  font-family: var(--font-body-zh);
}
:deep(.app-back-btn) {
  border: 1px solid var(--txt);
}
</style>

<style>
/* 證書列印僅保留文件，不包含全站導覽與浮動操作。 */
@media print {
  body.identity-print-page .cont > :not(main),
  body.identity-print-page .skip-to-content,
  body.identity-print-page #nuxt-devtools-container {
    display: none !important;
  }
  body.identity-print-page,
  body.identity-print-page .cont,
  body.identity-print-page #main-content {
    margin: 0;
    padding: 0;
    background: #fff;
    color: #111;
  }
}
</style>
