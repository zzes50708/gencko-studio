<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useHead } from '#imports'
import { SOCIAL_LINKS } from '~/utils/site-constants'

const selectedTemplateId = ref('a4')
const equipment = ref<string[]>([])
type Configuration = {
  rows: number
  columns: number
  finish: string
  boxLabel?: string
  boxDimensions?: { length: number; width: number; height: number }
  boxColor?: string
  counts?: Record<string, number>
  ledLayers?: number
  heatingMat?: string
  ledColor?: string
  lightLevel?: number
  storageHeight?: number
  storageStyle?: 'drawer' | 'doors' | 'open'
  dimensions?: { width: number; height: number; depth: number }
  clearances?: { horizontal: number; vertical: number; depth: number; controlHeight: number }
}
const configuration = ref<Configuration>({ rows: 4, columns: 2, finish: '待選擇' })
const needs = ref({ species: '', space: '', budget: '', note: '', boxSize: '', finish: '' })
const copyStatus = ref('')
const summaryField = ref<HTMLTextAreaElement | null>(null)
const accessoryPrices = [
  ['溫度計', '200／個'],
  ['一般開關', '100／個'],
  ['金屬發光開關', '250／個'],
  ['額外內嵌式溫控', '600／個'],
  ['萬向輪', '100／個'],
  ['LED 間接照明', '依訂製報價'],
  ['抽屜與收納櫃', '依訂製報價'],
  ['三色可調 LED', '依訂製報價']
]
const equipmentNames: Record<string, string> = {
  thermometer: '溫度計',
  switch: '一般開關',
  metalSwitch: '金屬發光開關',
  extraThermostat: '額外內嵌式溫控',
  led: 'LED 間接照明',
  storage: '抽屜與收納櫃',
  rgbLed: '三色可調 LED',
  wheels: '萬向輪'
}
function updateConfiguration(value: Configuration & { capabilities: string[] }) {
  equipment.value = value.capabilities
  configuration.value = { ...value }
}
const equipmentSummary = computed(() => {
  const c = configuration.value
  const items = Object.entries(c.counts || {})
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${equipmentNames[key] || key} × ${count}`)
  if (c.ledLayers)
    items.push(
      `LED ${c.ledLayers} 層／${({ warm: '暖白', neutral: '自然白', cool: '冷白' } as Record<string, string>)[c.ledColor || 'warm']}`
    )
  if (c.storageHeight)
    items.push(
      `底部收納：${c.storageStyle === 'doors' ? '雙開門' : c.storageStyle === 'open' ? '無門' : '抽屜'}，內高 ${c.storageHeight} cm`
    )
  if (equipment.value.includes('wheels')) items.push('萬向輪組')
  return items.join('、') || '無額外加購'
})
const inquiry = computed(() =>
  [
    '客製化爬蟲設備需求',
    `款式：${configuration.value.boxLabel || '待選擇'}木製爬櫃`,
    `盒款：${configuration.value.boxLabel || '待選擇'}；盒色：${configuration.value.boxColor === 'smoke' ? '霧黑' : '透白'}`,
    configuration.value.boxDimensions
      ? `盒體長×寬×高：${configuration.value.boxDimensions.length} × ${configuration.value.boxDimensions.width} × ${configuration.value.boxDimensions.height} cm`
      : '盒體尺寸：待確認',
    configuration.value.dimensions
      ? `櫃體寬×高×深（規劃值）：${configuration.value.dimensions.width} × ${configuration.value.dimensions.height} × ${configuration.value.dimensions.depth} cm`
      : '櫃體尺寸：待確認',
    '層板與櫃壁厚度：2 cm',
    configuration.value.clearances
      ? `預留間隙（cm）：水平 ${configuration.value.clearances.horizontal}／垂直 ${configuration.value.clearances.vertical}／深度 ${configuration.value.clearances.depth}；控制區高 ${configuration.value.clearances.controlHeight}`
      : '',
    `配置：每層 ${configuration.value.columns} 抽 × ${configuration.value.rows} 層，共 ${configuration.value.columns * configuration.value.rows} 抽`,
    `標配：貼皮木製櫃體、內嵌式溫控、${configuration.value.heatingMat === 'korea' ? '韓國加熱墊' : '美國加熱墊'}`,
    `貼皮：${needs.value.finish || configuration.value.finish}（以實際樣本確認）`,
    `選配：${equipmentSummary.value}`,
    `物種與數量：${needs.value.species || '待討論'}`,
    `可用空間（寬×深×高 cm）：${needs.value.space || '待確認'}`,
    `預算範圍：${needs.value.budget || '待討論'}`,
    `其他需求：${needs.value.note || '無'}`,
    '以上為初步需求，請協助確認實際尺寸、設備相容性與報價。'
  ].join('\n')
)
watch(inquiry, () => {
  copyStatus.value = ''
})
async function copyInquiry() {
  try {
    await navigator.clipboard.writeText(inquiry.value)
    copyStatus.value = '已複製，請開啟 Gencko LINE 並貼上需求。'
  } catch {
    summaryField.value?.focus({ preventScroll: true })
    summaryField.value?.select()
    try {
      if (!document.execCommand('copy')) throw new Error('複製失敗')
      copyStatus.value = '已複製，請開啟 Gencko LINE 並貼上需求。'
    } catch {
      copyStatus.value = '無法自動複製，已選取需求摘要，請手動複製。'
    }
  }
}

useHead({
  title: '客製化爬蟲設備｜Honeycomb 蜂巢工作室協作規劃',
  meta: [
    {
      name: 'description',
      content:
        'Gencko 與 Honeycomb 蜂巢工作室協作的客製化爬蟲設備規劃。依塑膠盒或壓克力盒規劃木製爬櫃，選擇抽數、層數、貼皮與加購設備。'
    },
    { name: 'keywords', content: '客製化爬蟲設備, 訂製爬櫃, 爬蟲櫃, 爬缸, A4爬櫃, A6爬櫃' },
    { property: 'og:title', content: '客製化爬蟲設備｜Honeycomb 蜂巢工作室協作規劃' },
    {
      property: 'og:description',
      content: '依盒款、抽數、層數與櫃體尺寸規劃貼皮木櫃，提供溫控、照明及收納選配。'
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://www.genckobreeding.com/merch' }
  ],
  link: [{ rel: 'canonical', href: 'https://www.genckobreeding.com/merch' }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: '客製化爬蟲設備規劃服務',
        url: 'https://www.genckobreeding.com/merch',
        provider: { '@type': 'Organization', name: 'Gencko Breeding Studio' },
        areaServed: { '@type': 'Country', name: 'Taiwan' },
        serviceType: '客製化爬蟲設備規劃'
      })
    }
  ]
})
</script>

<template>
  <div class="site-document-page cabinet-page">
    <div class="common-document-meta" aria-label="客製化爬蟲設備說明">
      <span>GENCKO CUSTOM HABITAT</span>
      <span>PLAN / BUILD / CARE</span>
    </div>

    <header class="cabinet-hero">
      <div class="cabinet-hero__copy">
        <p class="cabinet-kicker">CUSTOM HABITAT SYSTEM</p>
        <h1>客製化爬蟲設備</h1>
      </div>
    </header>

    <section id="cabinet-configurator" class="cabinet-3d-slot" aria-labelledby="cabinet-3d-title">
      <div class="cabinet-section-head">
        <span>01 / CONFIGURE IN 3D</span>
        <h2 id="cabinet-3d-title">3D 客製模擬系統</h2>
      </div>
      <ClientOnly>
        <CabinetConfigurator3D v-model="selectedTemplateId" @change="updateConfiguration" />
        <template #fallback>
          <p class="cabinet-note">正在準備配置預覽；也可以直接填寫下方訂製需求。</p>
        </template>
      </ClientOnly>
      <details class="cabinet-price-reference">
        <summary>加購配件參考</summary>
        <p>
          以下金額依合作夥伴提供的訂製說明整理，幣別與現行售價於報價時確認。溫控標配不重複計價，額外數量另議。
        </p>
        <dl>
          <div v-for="item in accessoryPrices" :key="item[0]">
            <dt>{{ item[0] }}</dt>
            <dd>{{ item[1] }}</dd>
          </div>
        </dl>
      </details>
    </section>

    <section id="cabinet-systems" class="cabinet-systems" aria-labelledby="cabinet-systems-title">
      <div class="cabinet-section-head">
        <span>02 / DEFINE THE SYSTEM</span>
        <h2 id="cabinet-systems-title">木製爬櫃標準配置</h2>
      </div>
      <div class="cabinet-system-grid">
        <article>
          <span>01</span>
          <h3>貼皮木製櫃體</h3>
          <p>爬櫃統一採木製貼皮櫃體，層板與櫃壁厚 2 公分，依盒體安排抽數與整體尺寸。</p>
        </article>
        <article>
          <span>02</span>
          <h3>內嵌式溫控</h3>
          <p>標準配置包含內嵌式溫控；需增加控制分區時，再確認額外溫控數量。</p>
        </article>
        <article>
          <span>03</span>
          <h3>美國加熱墊</h3>
          <p>標準配置包含美國加熱墊；配置位置與溫控方式依實際製作規格確認。</p>
        </article>
        <article>
          <span>04</span>
          <h3>貼皮樣本確認</h3>
          <p>可先選擇外觀方向，正式花色、材質與色號需依實際樣本確認。</p>
        </article>
      </div>
    </section>

    <section class="cabinet-cases" aria-labelledby="cabinet-cases-title">
      <div class="cabinet-section-head">
        <span>03 / BUILT EXAMPLES</span>
        <h2 id="cabinet-cases-title">實際案例</h2>
      </div>
      <p class="cabinet-cases__intro">成品照片、尺寸與設備清單將在取得授權後陸續更新。</p>
    </section>

    <section class="cabinet-process" aria-labelledby="cabinet-process-title">
      <div class="cabinet-section-head">
        <span>04 / HOW WE PLAN</span>
        <h2 id="cabinet-process-title">先規劃，再進入製作</h2>
      </div>
      <ol>
        <li>
          <b>01 選盒款</b>
          <span>選擇塑膠盒或壓克力盒，確認型號與盒體外尺寸。</span>
        </li>
        <li>
          <b>02 安排櫃體</b>
          <span>確認每層抽數、層數及櫃體寬、深、高，保留抽取與搬運空間。</span>
        </li>
        <li>
          <b>03 確認標配與貼皮</b>
          <span>確認貼皮木櫃、內嵌式溫控、美國加熱墊及貼皮樣本。</span>
        </li>
        <li>
          <b>04 選配與報價</b>
          <span>確認加購設備、數量、製作圖與報價，再安排製作及交付。</span>
        </li>
      </ol>
      <p class="cabinet-note">
        3D
        模擬系統與案例內容將以正式標準尺寸、模組與設備規格為資料依據；示意畫面不取代正式製作圖與報價。
      </p>
    </section>
    <section id="cabinet-inquiry" class="cabinet-inquiry" aria-labelledby="cabinet-inquiry-title">
      <div class="cabinet-section-head">
        <span>05 / YOUR PROJECT</span>
        <h2 id="cabinet-inquiry-title">把想法交給我們</h2>
      </div>
      <p>填寫你已經確定的需求，複製摘要後透過 Gencko LINE 討論；不確定的項目可以留白。</p>
      <div class="cabinet-inquiry-grid">
        <div class="cabinet-fields">
          <label>
            物種與數量
            <input v-model="needs.species" maxlength="120" placeholder="例如：豹紋守宮，共 12 隻" />
          </label>
          <label>
            可用空間（cm）
            <input
              v-model="needs.space"
              maxlength="120"
              placeholder="寬 × 深 × 高；尚未丈量可留白"
            />
          </label>
          <label>
            預算範圍
            <input
              v-model="needs.budget"
              maxlength="80"
              placeholder="例如：希望先了解不同配置的報價"
            />
          </label>
          <label>
            貼皮偏好
            <input
              v-model="needs.finish"
              maxlength="120"
              placeholder="花色方向或已確認的樣本色號"
            />
          </label>
          <label>
            其他需求
            <textarea
              v-model="needs.note"
              maxlength="1000"
              rows="3"
              placeholder="盒款、層數、材質偏好、交付地區或維護需求"
            />
          </label>
        </div>
        <div class="cabinet-inquiry-summary">
          <label for="cabinet-summary">需求摘要</label>
          <textarea
            id="cabinet-summary"
            ref="summaryField"
            :value="inquiry"
            readonly
            rows="11"
            aria-describedby="cabinet-inquiry-status"
          />
          <div class="cabinet-hero__actions">
            <button
              type="button"
              class="cabinet-button cabinet-button--primary"
              @click="copyInquiry"
            >
              複製需求摘要
            </button>
            <a
              :href="SOCIAL_LINKS.line"
              class="cabinet-button"
              target="_blank"
              rel="noopener noreferrer"
            >
              開啟 Gencko LINE ↗
            </a>
          </div>
          <p id="cabinet-inquiry-status" role="status">
            {{ copyStatus || '填寫內容不會自動送出；由你貼上需求後開始討論。' }}
          </p>
        </div>
      </div>
    </section>
    <aside class="cabinet-note">
      <strong>爬缸規劃｜後續開放</strong>
      <br />
      爬缸的材質、通風與灑水規格另行整理，目前模擬器與標配僅適用於木製爬櫃。
    </aside>
  </div>
</template>

<style scoped>
.cabinet-price-reference {
  margin-top: 1rem;
  border-block: 1px solid var(--bd);
  padding: 0.9rem 0;
}
.cabinet-price-reference summary {
  cursor: pointer;
  font-weight: 700;
  color: var(--txt);
}
.cabinet-price-reference p {
  color: var(--txt-muted);
  line-height: 1.7;
}
.cabinet-price-reference dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 1.5rem;
}
.cabinet-price-reference dl > div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid var(--bd);
  padding: 0.6rem 0;
}
.cabinet-price-reference dd {
  margin: 0;
  flex-shrink: 0;
}
@media (max-width: 600px) {
  .cabinet-price-reference dl {
    grid-template-columns: 1fr;
  }
}
.cabinet-box-fields {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 1rem;
  padding-top: 1rem;
}
.cabinet-box-fields label {
  display: grid;
  gap: 0.4rem;
  color: var(--txt);
}
.cabinet-box-fields input,
.cabinet-box-fields select {
  width: 100%;
  min-width: 0;
  padding: 0.65rem;
  color: var(--txt);
  background: var(--bg-dark);
  border: 1px solid var(--bd);
  font: inherit;
  font-size: 16px;
}
@media (max-width: 760px) {
  .cabinet-box-fields {
    grid-template-columns: 1fr 1fr;
  }
  .cabinet-box-fields label:last-child {
    grid-column: 1 / -1;
  }
}
.cabinet-page section {
  scroll-margin-top: 100px;
}
.cabinet-inquiry {
  padding-top: 2rem;
}
.cabinet-inquiry > p,
.cabinet-inquiry-summary p {
  color: var(--txt-muted);
  line-height: 1.7;
}
.cabinet-inquiry-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  border-top: 1px solid var(--bd);
  padding-top: 1rem;
}
.cabinet-fields {
  display: grid;
  gap: 1rem;
}
.cabinet-inquiry label {
  display: grid;
  gap: 0.4rem;
  color: var(--txt);
  font-weight: 700;
}
.cabinet-inquiry input,
.cabinet-inquiry textarea {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  border: 1px solid var(--bd);
  border-radius: 0;
  background: var(--bg-dark);
  color: var(--txt);
  padding: 0.7rem;
  font: 400 16px/1.65 var(--font-body-zh);
}
.cabinet-inquiry textarea {
  resize: vertical;
}
.cabinet-inquiry input:focus-visible,
.cabinet-inquiry textarea:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
.cabinet-inquiry-summary > textarea {
  margin-top: 0.4rem;
}
.cabinet-inquiry-summary p {
  font-size: 0.875rem;
}
.cabinet-button {
  cursor: pointer;
}
@media (max-width: 760px) {
  .cabinet-inquiry-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
.cabinet-page {
  width: min(100%, 1160px);
  margin: 0 auto;
  padding: 0.65rem 1.25rem 4rem;
}
.cabinet-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(1.5rem, 4vw, 3.5rem);
  align-items: end;
  padding: 1.5rem 0 1.75rem;
  border-bottom: 1px solid var(--bd);
}
.cabinet-kicker,
.cabinet-section-head > span,
.cabinet-preview > div > span {
  color: var(--pri);
  font: 800 0.68rem/1.4 var(--font-body-zh);
  letter-spacing: 0.12em;
}
.cabinet-hero h1,
.cabinet-section-head h2 {
  margin: 0.55rem 0 0;
  color: var(--txt);
  font-family: var(--font-heading-zh);
  text-wrap: balance;
}
.cabinet-hero h1 {
  max-width: 12ch;
  font-size: clamp(2rem, 5vw, 4.2rem);
  line-height: 1.04;
}
.cabinet-hero p {
  max-width: 39rem;
  margin: 0.85rem 0 0;
  color: var(--txt-muted);
  font-size: clamp(1rem, 1.35vw, 1.12rem);
  line-height: 1.75;
  text-wrap: pretty;
}
.cabinet-hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.25rem;
}
.cabinet-button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 1rem;
  border: 1px solid var(--bd);
  color: var(--txt);
  font: 700 0.82rem/1.4 var(--font-body-zh);
  text-decoration: none;
}
.cabinet-button--primary {
  border-color: var(--pri);
  background: var(--pri);
  color: #fff;
}
.cabinet-planning,
.cabinet-systems,
.cabinet-3d-slot,
.cabinet-cases,
.cabinet-process {
  padding-top: 2rem;
}
.cabinet-section-head h2 {
  font-size: clamp(1.5rem, 3vw, 2.3rem);
  line-height: 1.12;
}
.cabinet-template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: 1.6rem;
  border: 1px solid var(--bd);
  background: var(--bd);
}
.cabinet-template {
  display: grid;
  width: 100%;
  min-height: 172px;
  align-content: start;
  gap: 0.7rem;
  padding: 1.15rem;
  border: 0;
  background: var(--bg-dark);
  color: var(--txt);
  text-align: left;
  cursor: pointer;
}
.cabinet-template.is-selected {
  background: color-mix(in srgb, var(--pri) 8%, var(--bg-dark));
  box-shadow: inset 0 3px var(--pri);
}
.cabinet-template > span,
.cabinet-system-grid article > span {
  color: var(--pri);
  font:
    800 0.7rem/1 ui-monospace,
    monospace;
}
.cabinet-template strong {
  font: 700 1.05rem/1.35 var(--font-heading-zh);
}
.cabinet-template small {
  color: var(--txt-muted);
  font: 400 0.88rem/1.65 var(--font-body-zh);
}
.cabinet-preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: clamp(1.25rem, 4vw, 3rem);
  align-items: center;
  padding: clamp(1.3rem, 4vw, 2.2rem);
  border: 1px solid var(--bd);
  border-top: 0;
}
.cabinet-preview__drawing {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 7px;
  aspect-ratio: 1/1;
  padding: 10px;
  border: 1px solid var(--txt);
  background: color-mix(in srgb, var(--txt) 3%, transparent);
}
.cabinet-preview__drawing i {
  display: block;
  border: 1px solid var(--pri);
}
.cabinet-preview h3 {
  margin: 0.45rem 0 0;
  color: var(--txt);
  font: 700 clamp(1.45rem, 3vw, 2.2rem)/1.2 var(--font-heading-zh);
}
.cabinet-preview p {
  margin: 0.7rem 0;
  color: var(--txt-muted);
  line-height: 1.7;
}
.cabinet-preview ul {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0;
  margin: 0;
  list-style: none;
  color: var(--txt);
  font-size: 0.88rem;
}
.cabinet-preview li::before {
  content: '— ';
  color: var(--pri);
}
.cabinet-system-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  margin-top: 1.6rem;
  border: 1px solid var(--bd);
  background: var(--bd);
}
.cabinet-system-grid article {
  min-height: 165px;
  padding: 1.15rem;
  background: var(--bg-dark);
}
.cabinet-system-grid h3 {
  margin: 1.8rem 0 0.65rem;
  color: var(--txt);
  font: 700 1.05rem/1.35 var(--font-heading-zh);
}
.cabinet-system-grid p {
  margin: 0;
  color: var(--txt-muted);
  font-size: 0.92rem;
  line-height: 1.7;
}
.cabinet-process {
  padding-bottom: 1rem;
}
.cabinet-process ol {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  padding: 0;
  margin: 1.6rem 0 0;
  list-style: none;
  border: 1px solid var(--bd);
  background: var(--bd);
}
.cabinet-process li {
  display: grid;
  gap: 0.65rem;
  min-height: 125px;
  padding: 1.15rem;
  background: var(--bg-dark);
}
.cabinet-process b {
  color: var(--pri);
  font: 700 1rem/1.35 var(--font-heading-zh);
}
.cabinet-process span,
.cabinet-note {
  color: var(--txt-muted);
  font-size: 0.95rem;
  line-height: 1.75;
}
.cabinet-note {
  margin: 1rem 0 0;
  padding-left: 1rem;
  border-left: 2px solid var(--pri);
}
.cabinet-case-grid h3 {
  margin: 0.5rem 0 0;
  color: var(--txt);
  font: 700 clamp(1.35rem, 2.6vw, 2rem)/1.25 var(--font-heading-zh);
}
.cabinet-3d-slot__intro,
.cabinet-cases__intro,
.cabinet-case-grid p {
  color: var(--txt-muted);
  font-size: 0.95rem;
  line-height: 1.75;
}
.cabinet-3d-slot__intro {
  max-width: 42rem;
  margin: 0.75rem 0 1.25rem;
}
.cabinet-cases__intro {
  margin: 0.75rem 0 0;
}
.cabinet-case-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 1.35rem;
  border: 1px solid var(--bd);
  background: var(--bd);
}
.cabinet-case-grid article {
  padding: 0.85rem;
  background: var(--bg-dark);
}
.cabinet-case-placeholder {
  display: grid;
  min-height: 190px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--txt) 28%, var(--bd));
  background: color-mix(in srgb, var(--txt) 3%, transparent);
  color: var(--pri);
  font: 800 0.68rem/1 var(--font-body-zh);
  letter-spacing: 0.1em;
}
.cabinet-case-grid h3 {
  font-size: 1.1rem;
}
.cabinet-case-grid p {
  margin: 0.45rem 0 0;
}
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
@media (max-width: 760px) {
  .cabinet-page {
    padding-inline: 1rem;
  }
  .cabinet-hero {
    grid-template-columns: 1fr;
    gap: 1.4rem;
    padding-top: 1.75rem;
  }
  .cabinet-template-grid,
  .cabinet-system-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cabinet-template {
    min-height: 150px;
  }
  .cabinet-preview,
  .cabinet-process ol {
    grid-template-columns: 1fr;
  }
  .cabinet-preview__drawing {
    width: min(230px, 100%);
  }
  .cabinet-system-grid article {
    min-height: 150px;
  }
  .cabinet-case-grid {
    grid-template-columns: 1fr;
  }
  .cabinet-case-grid article {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    column-gap: 0.85rem;
    align-items: center;
  }
  .cabinet-case-placeholder {
    grid-row: span 2;
    min-height: 96px;
  }
}
</style>
