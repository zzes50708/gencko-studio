<script setup lang="ts">
import { computed, defineAsyncComponent, onErrorCaptured, onMounted, ref, watch } from 'vue'
import { useDocumentVisibility, useIntersectionObserver, useMediaQuery } from '@vueuse/core'
import { HABITAT_PARTS } from '~/utils/habitat-parts'
import type { HabitatCommand, HabitatPartId, HabitatView } from '~/utils/habitat-parts'

const HabitatViewport = defineAsyncComponent({ loader: () => import('./HabitatViewport.client.vue'), suspensible: false })
const host = ref<HTMLElement | null>(null)
const canUse3d = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const documentVisibility = useDocumentVisibility()
const inView = ref(false)
const mounted = ref(false)
const failed = ref(false)
const ready = ref(false)
const roof = ref(false)
const selected = ref<HabitatPartId>('water')
const view = ref<HabitatView>('perspective')
const command = ref<HabitatCommand>({ serial: 0, type: 'view', value: 'perspective' })
const current = computed(() => HABITAT_PARTS.find(part => part.id === selected.value)!)
const render3d = computed(() => mounted.value && canUse3d.value && !failed.value && inView.value && documentVisibility.value === 'visible')
const desktopMode = computed(() => mounted.value && canUse3d.value && !failed.value)
watch(render3d, value => { if (!value) ready.value = false })
useIntersectionObserver(host, ([entry]) => { inView.value = Boolean(entry?.isIntersecting) }, { rootMargin: '120px' })
onMounted(() => { mounted.value = true })
onErrorCaptured((error) => { console.warn('[habitat] 互動模型載入失敗，改用示意圖', error); failed.value = true; return false })

const select = (id: HabitatPartId) => { selected.value = id }
const runCommand = (type: HabitatCommand['type'], value: string | number) => {
  command.value = { serial: command.value.serial + 1, type, value }
}
const changeView = (value: HabitatView) => { view.value = value; runCommand('view', value) }
const onReady = () => { ready.value = true; if (view.value !== 'perspective') runCommand('view', view.value) }
const reset = () => { roof.value = false; changeView('perspective') }
const keyboard = (event: KeyboardEvent) => {
  if (!desktopMode.value || event.target !== event.currentTarget) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault(); runCommand('rotate', event.key === 'ArrowLeft' ? -.25 : .25)
  } else if (event.key === '+' || event.key === '=') { event.preventDefault(); runCommand('zoom', .86) }
  else if (event.key === '-') { event.preventDefault(); runCommand('zoom', 1.16) }
  else if (event.key === 'Home') { event.preventDefault(); reset() }
}
</script>

<template>
  <section ref="host" class="habitat-explorer" aria-labelledby="habitat-title">
    <header class="habitat-heading">
      <div><span class="habitat-eyebrow">ENVIRONMENT / EXPLORE</span><h3 id="habitat-title">看懂每一個配置的位置</h3></div>
      <p>{{ desktopMode ? '拖曳旋轉 · 點選設備' : '點選下方設備，查看配置位置與說明' }}</p>
    </header>
    <div class="habitat-layout">
      <div class="habitat-main">
        <div v-if="desktopMode" class="habitat-toolbar" role="group" aria-label="模型視角與顯示">
          <div class="habitat-view-buttons">
            <button :aria-pressed="view === 'perspective'" @click="changeView('perspective')">立體</button>
            <button :aria-pressed="view === 'front'" @click="changeView('front')">正面</button>
            <button :aria-pressed="view === 'top'" @click="changeView('top')">俯視</button>
          </div>
          <label class="habitat-roof"><input v-model="roof" type="checkbox" />顯示頂蓋</label>
          <button @click="reset">重設視角</button>
        </div>
        <div class="habitat-stage" :class="{ 'habitat-stage--interactive': desktopMode }"
          :tabindex="desktopMode ? 0 : undefined" :aria-label="desktopMode ? '3D 飼養環境：拖曳旋轉，左右方向鍵轉向，加減鍵縮放，Home 重設' : undefined"
          @keydown="keyboard">
          <img class="habitat-poster" :src="'/images/care/habitat-overview.webp'" alt="飼養箱配置：左前水盆、左後食盆、右側躲避屋、箱外底部加熱墊及溫度計"
            width="1200" height="800" loading="lazy" :class="{ 'habitat-poster--covered': render3d && ready }" />
          <div v-if="render3d" class="habitat-canvas-layer">
            <HabitatViewport :selected="selected" :roof="roof" :command="command" :reduced-motion="reducedMotion"
              @ready="onReady" @error="failed = true" @select="select" />
          </div>
          <div v-if="!desktopMode" class="habitat-points" aria-hidden="true">
            <span class="habitat-selected-point" :style="{ left: `${current.point[0]}%`, top: `${current.point[1]}%` }">{{ current.number }}</span>
          </div>
          <div v-if="desktopMode" class="habitat-zoom" role="group" aria-label="模型縮放">
            <button aria-label="放大模型" @click="runCommand('zoom', .86)">＋</button>
            <button aria-label="縮小模型" @click="runCommand('zoom', 1.16)">−</button>
          </div>
          <span v-if="desktopMode && !ready && render3d" class="habitat-loading" role="status">正在準備互動模型</span>
        </div>
        <p class="habitat-caption">依提供的環境示意圖重建，呈現設備位置與相對關係，非實測尺寸。預設開蓋檢視。</p>
      </div>
      <aside class="habitat-details" aria-label="設備配置說明">
        <div class="habitat-parts" role="group" aria-label="選擇設備">
          <button v-for="part in HABITAT_PARTS" :key="part.id" :aria-pressed="selected === part.id" @click="select(part.id)">
            <span>{{ part.number }}</span>{{ part.label }}<span class="habitat-part-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
        <div class="habitat-description" aria-live="polite" aria-atomic="true">
          <span class="habitat-position">{{ current.position }}</span>
          <h4>{{ current.label }}</h4>
          <p>{{ current.description }}</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.habitat-explorer { margin: 24px 0; border-block: 1px solid var(--bd); padding-block: 20px; }
.habitat-heading { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.habitat-eyebrow { color: var(--pri); font: 700 .65rem/1.5 var(--font-body-zh); letter-spacing: .12em; }
.habitat-heading h3 { margin: 5px 0 0; font: 700 clamp(1.35rem, 2.3vw, 1.8rem)/1.5 var(--font-heading-zh); }
.habitat-heading p, .habitat-caption { margin: 0; color: var(--txt-muted); font: 400 .78rem/1.7 var(--font-body-zh); }
.habitat-layout { display: grid; grid-template-columns: minmax(0, 1fr) 230px; gap: 24px; }
.habitat-main, .habitat-details { min-width: 0; }
.habitat-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 10px; }
.habitat-view-buttons { display: flex; gap: 4px; margin-right: auto; }
.habitat-explorer button { appearance: none; display: inline-flex; justify-content: center; align-items: center; min-height: 44px; border: 1px solid var(--bd); border-radius: 2px; padding: 8px 12px; background: transparent; color: var(--txt); font: 600 .8rem/1.4 var(--font-body-zh); white-space: nowrap; cursor: pointer; box-shadow: none; }
.habitat-explorer button[aria-pressed='true'] { color: var(--pri); border-color: var(--pri); }
.habitat-roof { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 6px; color: var(--txt); font: 500 .78rem/1.4 var(--font-body-zh); white-space: nowrap; cursor: pointer; }
.habitat-roof input { accent-color: var(--pri); width: 16px; height: 16px; }
.habitat-stage { position: relative; height: clamp(360px, 38vw, 540px); overflow: hidden; background: #f8f7f3; isolation: isolate; }
.habitat-stage--interactive { cursor: grab; }
.habitat-stage--interactive:active { cursor: grabbing; }
.habitat-stage :deep(canvas) { position: absolute !important; inset: 0; }
.habitat-canvas-layer { position: absolute; inset: 0; }
.habitat-poster { position: absolute; width: 100%; height: 100%; object-fit: contain; inset: 0; }
.habitat-poster--covered { visibility: hidden; }
.habitat-caption { padding-top: 10px; font-size: .72rem; }
.habitat-zoom { position: absolute; right: 12px; bottom: 12px; display: flex; gap: 5px; }
.habitat-zoom button { width: 44px; padding: 0; background: #fff; color: #292724; border-color: #cfcac0; font-size: 1.2rem; }
.habitat-parts { display: flex; flex-direction: column; }
.habitat-parts button { border: 0; border-bottom: 1px solid var(--bd); border-radius: 0; padding: 10px 0; justify-content: flex-start; gap: 12px; text-align: left; }
.habitat-parts button > span:first-child { font-size: .68rem; font-variant-numeric: tabular-nums; color: var(--txt-muted); }
.habitat-part-arrow { margin-left: auto; }
.habitat-description { padding-top: 20px; }
.habitat-position { color: var(--pri); font: 600 .7rem/1.6 var(--font-body-zh); }
.habitat-description h4 { margin: 8px 0; font: 700 1.25rem/1.5 var(--font-heading-zh); }
.habitat-description p { margin: 0; color: var(--txt-muted); font: 400 .85rem/1.85 var(--font-body-zh); }
.habitat-loading { position: absolute; bottom: 16px; left: 16px; color: #655f56; font: 400 .8rem var(--font-body-zh); }
.habitat-points { position: absolute; inset: 0; pointer-events: none; }
.habitat-selected-point { position: absolute; transform: translate(-50%, -50%); display: grid; place-items: center; background: var(--pri-btn); color: #fff; width: 28px; height: 28px; border: 1px solid #fff; border-radius: 2px; font: 600 .72rem var(--font-body-zh); }
@media (hover: hover) and (pointer: fine) { .habitat-explorer button:hover { color: var(--pri); border-color: var(--pri); } }
@media (max-width: 1000px) { .habitat-layout { grid-template-columns: minmax(0, 1fr) 200px; gap: 16px; } }
@media (max-width: 767px), (pointer: coarse), (hover: none) {
  .habitat-heading { display: block; }
  .habitat-heading p { margin-top: 6px; }
  .habitat-layout { grid-template-columns: 1fr; gap: 12px; }
  .habitat-stage { height: auto; aspect-ratio: 3 / 2; overflow: visible; }
  .habitat-parts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; }
  .habitat-parts button { font-size: .75rem; gap: 8px; }
  .habitat-description { padding-top: 16px; }
  .habitat-explorer { margin-block: 18px; padding-block: 16px; }
}
</style>
