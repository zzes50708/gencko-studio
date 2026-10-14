<script setup>
import { computed, onMounted, ref, watch } from 'vue'
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
  error,
  refresh
} = await useAsyncData(`identity-${identityId}`, async () => {
  const { data, error: fetchError } = await supabase
    .from('animals')
    .select('*')
    .eq('id', identityId)
    .single()

  if (fetchError || !data) {
    throw new Error(
      fetchError?.code === 'PGRST116' || !fetchError
        ? '找不到此個體資料或已下架'
        : '資料暫時無法載入，請重新嘗試'
    )
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
watch(
  () => item.value?.ImageURL,
  () => {
    imageState.value = 'optimized'
  }
)
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
  return i.GenderType || '未確認'
})

// 動態生成 SEO 與社群分享卡片 (Open Graph)
const siteData = computed(() => {
  if (item.value) {
    const i = item.value
    const title = `${i.Morph}｜個體血統證書`
    const desc = `Gencko Studio 嚴選繁育個體。ID: ${i.ID}，性別: ${fmtSex.value}，出生日: ${i.Birthday || '未登錄'}。查看已建檔的個體資料。`
    const img =
      displayImg.value ||
      'https://wsrv.nl/?url=raw.githubusercontent.com%2Fzzes50708%2Fgencko-assets%2Fmain%2Fimg%2F11.png&w=1200&h=630&fit=contain&bg=e6e3e3&output=webp&q=85'
    const url = `https://www.genckobreeding.com/identity/${i.ID}`
    return { title, desc, img, url }
  }
  return {
    title: '個體證書',
    desc: 'Gencko Studio 個體證書查詢',
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
    <div v-if="pending" class="status-msg" aria-busy="true">
      <p role="status">正在取得個體證書</p>
    </div>
    <div v-else-if="error" class="status-msg err">
      <h1>無法顯示個體證書</h1>
      <p role="alert">{{ error.message || '找不到此個體資料或已下架' }}</p>
      <button type="button" class="act-btn" @click="refresh()">重新載入</button>
      <TheBackButton fallback="/certificates" text="返回搜尋" />
    </div>
    <div v-else-if="item" class="id-content-wrap">
      <nav class="identity-navigation" aria-label="證書操作">
        <NuxtLink to="/certificates" class="certificate-back">← 個體證書</NuxtLink>
        <button type="button" class="act-btn" aria-label="儲存個體證書為 PDF" @click="triggerPrint">
          儲存證書 PDF
          <span aria-hidden="true">↗</span>
        </button>
      </nav>
      <article
        class="identity-certificate id-card print-target"
        data-phase3-surface="identity"
        aria-labelledby="identity-title"
      >
        <header class="certificate-header">
          <div class="certificate-brand">
            <span>GENCKO</span>
            <small>STUDIO</small>
          </div>
          <div class="certificate-registration">
            <span>INDIVIDUAL NO.</span>
            <strong>{{ item.ID }}</strong>
          </div>
        </header>
        <div class="certificate-title">
          <p>GENCKO STUDIO · INDIVIDUAL CERTIFICATE</p>
          <h1 id="identity-title">血統證書</h1>
          <span>Certificate of Lineage</span>
        </div>
        <div class="certificate-record-body">
          <figure class="card-photo-box">
            <img
              v-if="identityImageSrc"
              ref="identityImageEl"
              :src="identityImageSrc"
              :alt="`${item.Morph} 個體 ${item.ID} 照片`"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              @error="handleImageError"
            />
            <div v-else class="no-img">暫無照片</div>
            <figcaption>
              <span>INDIVIDUAL PORTRAIT</span>
              <span>{{ item.ID }}</span>
            </figcaption>
          </figure>
          <section class="certificate-profile" aria-label="個體資料">
            <div class="certificate-morph-heading">
              <span>品系 / MORPH</span>
              <h2 class="certificate-morph">{{ item.Morph || '尚未登錄品系' }}</h2>
            </div>
            <dl class="info-grid">
              <div>
                <dt>
                  物種
                  <span>SPECIES</span>
                </dt>
                <dd>{{ item.Species || '未登錄' }}</dd>
              </div>
              <div>
                <dt>
                  性別紀錄
                  <span>SEX RECORD</span>
                </dt>
                <dd>{{ fmtSex }}</dd>
              </div>
              <div>
                <dt>
                  出生日
                  <span>DATE OF BIRTH</span>
                </dt>
                <dd>{{ item.Birthday || '未登錄' }}</dd>
              </div>
            </dl>
          </section>
        </div>
        <footer class="certificate-footer">
          <div class="certificate-issuer">
            <strong>GENCKO STUDIO</strong>
            <span>個體紀錄存檔</span>
          </div>
          <p>
            品系、性別與出生日
            <br />
            依目前建檔資料呈現。
          </p>
        </footer>
      </article>
      <div class="id-actions">
        <p class="id-hint">儲存時請在列印面板選擇「另存為 PDF」，使用 A4 直式。</p>
      </div>
    </div>
  </div>
</template>
<style scoped>
.id-page-container {
  width: 100%;
  padding: 12px 0 28px;
}
.id-content-wrap {
  max-width: 940px;
  margin: 0 auto;
}
.identity-navigation {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}
.certificate-back {
  color: var(--txt);
  font-size: 14px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}
.act-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 44px;
  padding: 10px 16px;
  border: 1px solid var(--bd);
  color: var(--txt);
  background: var(--card-bg-solid);
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.act-btn:focus-visible,
.certificate-back:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 4px;
}
.identity-certificate {
  --paper: #cbd1d6;
  --ink: #24282b;
  --muted: #424950;
  --metal: #584629;
  --rule: #b5aca0;
  --letter-foil: linear-gradient(
    178deg,
    #5c431d 0%,
    #987337 22%,
    #c3a466 39%,
    #e0c68f 43%,
    #987237 49%,
    #6e5027 70%,
    #a47f42 100%
  );
  --foil: linear-gradient(
    101deg,
    #94743d 0%,
    #b99654 16%,
    #d1b77c 21%,
    #a78545 27%,
    #af8d4e 58%,
    #e1ca94 63%,
    #b49355 70%,
    #94743d 100%
  );
  position: relative;
  isolation: isolate;
  color: var(--ink);
  background-color: var(--paper);
  background-image:
    radial-gradient(ellipse 72% 42% at 30% 12%, rgb(255 255 255 / 78%), transparent 76%),
    radial-gradient(ellipse 54% 38% at 92% 68%, rgb(255 255 255 / 48%), transparent 78%),
    radial-gradient(ellipse 78% 54% at 0% 83%, rgb(80 95 110 / 17%), transparent 80%),
    linear-gradient(110deg, #c8cfd5 0%, #e9edef 37%, #d1d8de 67%, #bcc5ce 100%);
  padding: 48px 50px 38px;
  border: 1px solid #c0c5ca;
  min-height: 1040px;
  display: flex;
  flex-direction: column;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 70%),
    0 1px 0 #b9bec3,
    0 3px 5px rgb(28 35 43 / 9%),
    0 9px 18px -10px rgb(28 35 43 / 22%);
  font-family: var(--font-body-zh);
}
/* 寬柔反光呈現銀色珠光紙的光澤，細顆粒保留紙面觸感，兩者皆為靜態。 */
.identity-certificate::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/textures/certificate-paper.svg') repeat;
  opacity: 0.52;
  mix-blend-mode: soft-light;
  pointer-events: none;
  z-index: -1;
}
/* 金箔框線以局部高光與壓痕呈現，不使用閃動或動態光暈。 */
.identity-certificate::before {
  content: '';
  position: absolute;
  inset: 14px;
  border: 1px solid transparent;
  border-image: var(--foil) 1;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 85%),
    0 1px 1px rgb(87 66 29 / 14%);
  pointer-events: none;
}
.certificate-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--rule);
  border-image: var(--foil) 1;
}
.certificate-brand {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: var(--metal);
}
.certificate-brand > span {
  font:
    600 27px Baskerville,
    Palatino,
    Georgia,
    serif;
  letter-spacing: 0.12em;
}
.certificate-brand small {
  font-size: 10px;
  letter-spacing: 0.26em;
}
/* 燙金字保留金箔反光，上緣暗痕與下緣紙面亮邊呈現淺壓印。 */
@supports ((background-clip: text) or (-webkit-background-clip: text)) {
  .certificate-brand > span,
  .certificate-title > span,
  .certificate-issuer strong {
    background: var(--letter-foil);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    text-shadow:
      0 -0.55px 0.35px rgb(63 42 14 / 24%),
      0 0.8px 0.35px rgb(255 255 255 / 74%);
  }
}
.certificate-registration {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  min-width: 0;
}
.certificate-registration > span {
  font-size: 9px;
  letter-spacing: 0.18em;
  color: var(--muted);
}
.certificate-registration strong {
  font:
    21px Georgia,
    serif;
  letter-spacing: 0.05em;
  color: var(--metal);
  overflow-wrap: anywhere;
}
.certificate-title {
  padding: 48px 0 38px;
  text-align: center;
}
.certificate-title p {
  margin: 0 0 17px;
  font-size: 9px;
  letter-spacing: 0.25em;
  color: var(--muted);
}
.certificate-title > span {
  display: block;
  margin-top: 16px;
  font:
    italic 23px Georgia,
    serif;
  color: var(--metal);
}
.certificate-record-body {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 36px;
  align-items: start;
  padding: 32px 0;
  border-block: 1px solid var(--rule);
  border-image: var(--foil) 1;
}
.card-photo-box {
  margin: 0;
  min-width: 0;
  background: rgb(255 255 255 / 40%);
  padding: 7px;
  border: 1px solid #ac9872;
  border-image: var(--foil) 1;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 90%),
    0 3px 8px rgb(42 47 53 / 8%);
}
.card-photo-box img,
.no-img {
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: contain;
  background: #d5d8dc;
}
.no-img {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 14px;
}
.card-photo-box figcaption {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 5px 5px;
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 0.16em;
}
.certificate-profile {
  padding: 3px 0 0;
  min-width: 0;
}
.certificate-morph-heading > span {
  color: var(--metal);
  font-size: 10px;
  letter-spacing: 0.18em;
}
.certificate-morph {
  margin: 15px 0 26px;
  font: 500 clamp(25px, 3vw, 34px)/1.5 var(--font-heading-zh);
  color: var(--ink);
  overflow-wrap: anywhere;
}
.info-grid {
  display: grid;
  gap: 20px;
  margin: 0;
}
.info-grid > div {
  min-width: 0;
  padding-top: 15px;
  border-top: 1px solid var(--rule);
}
.info-grid dt {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  color: var(--muted);
}
.info-grid dt span {
  font-size: 8px;
  letter-spacing: 0.12em;
}
.info-grid dd {
  margin: 10px 0 0;
  font-size: 16px;
  line-height: 1.5;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.certificate-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
  margin-top: auto;
  padding-top: 42px;
  text-align: left;
}
.certificate-issuer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.certificate-issuer strong {
  font:
    600 19px Baskerville,
    Palatino,
    Georgia,
    serif;
  color: var(--metal);
  letter-spacing: 0.1em;
}
.certificate-issuer > span {
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--muted);
}
.certificate-footer p {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.9;
  text-align: right;
}
.id-hint {
  margin: 14px 0 0;
  color: var(--txt-muted);
  font-size: 12px;
  line-height: 1.5;
}
.status-msg {
  padding: 28px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--txt);
  text-align: center;
}
.status-msg p {
  margin: 0;
}
@media screen and (max-width: 767px) {
  .id-page-container {
    padding-top: 0;
  }
  .identity-navigation {
    margin-bottom: 12px;
  }
  .identity-certificate {
    padding: 30px 24px 26px;
    min-height: 0;
    outline-offset: -8px;
  }
  .identity-certificate::before {
    inset: 9px;
  }
  .certificate-header {
    padding-bottom: 18px;
    gap: 12px;
  }
  .certificate-brand > span {
    font-size: 21px;
  }
  .certificate-brand small {
    font-size: 8px;
  }
  .certificate-registration > span {
    font-size: 7px;
    letter-spacing: 0.06em;
  }
  .certificate-registration strong {
    font-size: 17px;
  }
  .certificate-title {
    padding: 30px 0;
  }
  .certificate-title p {
    font-size: 8px;
    letter-spacing: 0.1em;
  }
  .certificate-title > span {
    font-size: 20px;
    margin-top: 12px;
  }
  .certificate-record-body {
    grid-template-columns: 1fr;
    gap: 26px;
    padding: 24px 0;
  }
  .certificate-profile {
    padding: 0;
  }
  .certificate-morph {
    font-size: 26px;
    margin: 12px 0 22px;
  }
  .info-grid {
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .info-grid > div:last-child {
    grid-column: 1/-1;
  }
  .info-grid dt {
    flex-direction: column;
    gap: 4px;
  }
  .info-grid dd {
    font-size: 15px;
    margin-top: 7px;
  }
  .certificate-footer {
    gap: 18px;
    padding-top: 26px;
    align-items: flex-start;
  }
  .certificate-issuer strong {
    font-size: 13px;
    letter-spacing: 0.05em;
  }
  .certificate-footer p {
    font-size: 10px;
  }
}
@media print {
  .identity-navigation,
  .id-actions,
  .status-msg {
    display: none !important;
  }
  .id-page-container {
    padding: 0;
    transform: none !important;
    animation: none !important;
  }
  .id-content-wrap {
    width: 100%;
    max-width: none;
  }
  .identity-certificate {
    min-height: 260mm;
    padding: 12mm;
    box-shadow: none;
    break-inside: avoid;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .certificate-header {
    padding-bottom: 6mm;
  }
  .certificate-title {
    padding: 10mm 0;
  }
  .certificate-record-body {
    gap: 7mm;
    padding: 8mm 0;
  }
  .certificate-morph {
    font-size: 26px;
  }
  .certificate-footer {
    padding-top: 8mm;
  }
}
</style>
<style>
body.identity-print-page #main-content #identity-title {
  font-family: var(--font-heading-zh) !important;
  font-size: clamp(36px, 4.5vw, 52px) !important;
  font-weight: 600 !important;
  line-height: 1.3 !important;
  letter-spacing: 0.2em !important;
  margin: 0 !important;
  color: #24282b;
  text-shadow: 0 0.8px 0.4px rgb(255 255 255 / 75%);
}
@supports ((background-clip: text) or (-webkit-background-clip: text)) {
  body.identity-print-page #main-content #identity-title {
    background: var(--letter-foil);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    text-shadow:
      0 -0.75px 0.45px rgb(55 36 12 / 28%),
      0 0.9px 0.45px rgb(255 255 255 / 82%);
  }
}
body.identity-print-page .floating-inquire-btn {
  display: none;
}
@page gencko-certificate {
  size: A4 portrait;
  margin: 12mm;
}
@media print {
  body.identity-print-page .cont > :not(main),
  body.identity-print-page .skip-to-content,
  body.identity-print-page #nuxt-devtools-container {
    display: none !important;
  }
  html:has(body.identity-print-page) {
    padding: 0 !important;
    min-height: 0 !important;
  }
  body.identity-print-page {
    page: gencko-certificate;
    min-height: 0 !important;
  }
  body.identity-print-page,
  body.identity-print-page .cont,
  body.identity-print-page #main-content {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    color: #111;
  }
  body.identity-print-page #main-content #identity-title {
    font-size: 38px !important;
  }
}
</style>
