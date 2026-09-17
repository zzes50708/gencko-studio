<script setup lang="ts">
import { computed, onErrorCaptured, onMounted, onUnmounted, ref, shallowRef, triggerRef } from 'vue'
import { TresCanvas } from '@tresjs/core'
import HospitalMapScene from './HospitalMapScene.vue'
import {
  MAP_COUNTIES,
  normalizeMapCity,
  preciseMapHospitals,
  summarizeMapHospitals,
  type MapHospital
} from '~/utils/hospitalMap'

const props = defineProps<{
  hospitals: MapHospital[]
  wishlist: (string | number)[]
  selected: string
}>()
const emit = defineEmits<{
  select: [city: string]
  selectHospital: [hospital: MapHospital]
}>()
const mountedOnce = ref(true)
const visible = ref(true)
const documentVisible = ref(true)
const compact = ref(false)
const reducedMotion = ref(false)
const ready = ref(false)
const failed = ref(false)
const generation = ref(0)
const command = ref({ action: '', sequence: 0 })
const metrics = ref({ frames: 0, calls: 0, triangles: 0, idle: true, buildings: 0 })
const labels = shallowRef<{ name: string; x: number; y: number; visible: boolean }[]>([])
const summaries = computed(() => summarizeMapHospitals(props.hospitals, props.wishlist))
const preciseHospitals = computed(() => preciseMapHospitals(props.hospitals))
const selectedHospital = ref<MapHospital | null>(null)
const selectedCity = computed(() => normalizeMapCity(props.selected))
const selectedSummary = computed(() =>
  selectedCity.value === 'all'
    ? {
        count: props.hospitals.length,
        saved: [...summaries.value.values()].reduce((sum, county) => sum + county.saved, 0)
      }
    : summaries.value.get(selectedCity.value) || { count: 0, saved: 0 }
)
const active = computed(() => visible.value && documentVisible.value && !failed.value)
const canvasDpr = computed(() => (compact.value ? 1.25 : 1.5))
let deviceQuery: MediaQueryList | undefined
let motionQuery: MediaQueryList | undefined

function select(city: string) {
  selectedHospital.value = null
  emit('select', city)
}
function selectHospital(id: string | number) {
  const hospital = props.hospitals.find((item) => String(item.id) === String(id))
  if (!hospital) return
  selectedHospital.value = hospital
  emit('selectHospital', hospital)
}
function control(action: string) {
  command.value = { action, sequence: command.value.sequence + 1 }
}
function updateLabels(value: typeof labels.value) {
  labels.value = value
  triggerRef(labels)
}
function failure() {
  failed.value = true
  ready.value = false
  labels.value = []
}
function retry() {
  generation.value++
  failed.value = false
  ready.value = false
}
function visibilityChanged() {
  documentVisible.value = !document.hidden
}
function deviceChanged() {
  compact.value = !!deviceQuery?.matches
}
function motionChanged() {
  reducedMotion.value = !!motionQuery?.matches
}
onErrorCaptured(() => {
  failure()
  return false
})
onMounted(() => {
  deviceQuery = window.matchMedia('(max-width: 767px), (pointer: coarse)')
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  deviceChanged()
  motionChanged()
  visibilityChanged()
  deviceQuery.addEventListener('change', deviceChanged)
  motionQuery.addEventListener('change', motionChanged)
  document.addEventListener('visibilitychange', visibilityChanged)
})
onUnmounted(() => {
  deviceQuery?.removeEventListener('change', deviceChanged)
  motionQuery?.removeEventListener('change', motionChanged)
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <section class="hospital-map" aria-label="立體縣市醫院概覽">
    <div class="map-heading">
      <div>
        <span class="map-eyebrow">EXPLORE TAIWAN</span>
        <h2>從所在縣市，找到照護</h2>
      </div>
      <span class="map-mode">
        <i />
        3D 縣市概覽
      </span>
    </div>
    <div
      class="map-stage"
      :data-map-ready="ready"
      :data-map-idle="metrics.idle"
      :data-map-frames="metrics.frames"
      :data-map-calls="metrics.calls"
      :data-map-triangles="metrics.triangles"
      :data-map-buildings="metrics.buildings"
    >
      <TresCanvas
        v-if="mountedOnce && !failed"
        :key="generation"
        clear-color="#080f1b"
        :alpha="false"
        :antialias="true"
        :shadows="false"
        :dpr="canvasDpr"
        :fps-limit="compact ? 30 : 60"
        render-mode="on-demand"
        @error="failure"
      >
        <HospitalMapScene
          :selected="selectedCity"
          :summaries="summaries"
          :hospitals="preciseHospitals"
          :wishlist="wishlist"
          :active="active"
          :compact="compact"
          :reduced-motion="reducedMotion"
          :command="command"
          @select="select"
          @select-hospital="selectHospital"
          @labels="updateLabels"
          @ready="ready = true"
          @lost="failure"
          @metrics="metrics = $event"
        />
      </TresCanvas>
      <div class="map-summary" aria-live="polite" aria-atomic="true">
        <span>{{ selectedCity === 'all' ? '全台資源' : selectedCity }}</span>
        <strong>
          {{ selectedSummary.count }}
          <small>間收錄院所</small>
        </strong>
        <span v-if="selectedSummary.saved" class="map-saved">
          ● 已收藏 {{ selectedSummary.saved }} 間
        </span>
        <span class="map-precise">
          精確點位 {{ preciseHospitals.length }} / {{ hospitals.length }}
        </span>
      </div>
      <button
        v-if="selectedHospital"
        type="button"
        class="map-hospital-detail"
        @click="emit('selectHospital', selectedHospital)"
      >
        <span>SELECTED LOCATION</span>
        <strong>{{ selectedHospital.name }}</strong>
        <small>{{ selectedHospital.address }}</small>
        <b>查看院所資料 →</b>
      </button>
      <div v-if="ready && !failed" class="map-labels">
        <template v-for="label in labels" :key="label.name">
          <button
            v-if="label.visible"
            class="map-pin"
            :class="{
              selected: selectedCity === label.name,
              saved: summaries.get(label.name)?.saved
            }"
            :style="{ left: `${label.x}px`, top: `${label.y}px` }"
            :aria-pressed="selectedCity === label.name"
            :aria-label="`${label.name}，收錄 ${summaries.get(label.name)?.count || 0} 間，點選篩選`"
            @click="select(label.name)"
          >
            <i />
            <span>{{ label.name }}</span>
            <b>{{ summaries.get(label.name)?.count || 0 }}</b>
          </button>
        </template>
      </div>
      <div class="map-tools" aria-label="地圖視角控制">
        <span class="map-north" aria-hidden="true">
          N
          <span>↑</span>
        </span>
        <button
          type="button"
          aria-label="放大地圖"
          :disabled="!ready || failed"
          @click="control('in')"
        >
          ＋
        </button>
        <button
          type="button"
          aria-label="縮小地圖"
          :disabled="!ready || failed"
          @click="control('out')"
        >
          −
        </button>
        <button
          type="button"
          class="map-reset"
          aria-label="重設地圖視角"
          :disabled="!ready || failed"
          @click="control('reset')"
        >
          ↺
        </button>
      </div>
      <div v-if="!ready && !failed" class="map-loading" role="status">正在展開立體地圖…</div>
      <div v-if="failed" class="map-fallback" role="status">
        <strong>暫時無法顯示立體地圖</strong>
        <p>仍可使用下方縣市按鈕查找醫院。</p>
        <button type="button" @click="retry">重新載入地圖</button>
      </div>
      <div class="map-instructions">
        <span>拖曳旋轉 · 雙指縮放</span>
        <span class="map-legend">
          <i />
          已核對院所
          <i class="saved" />
          有收藏
        </span>
      </div>
    </div>
    <div class="map-cities" aria-label="選擇地圖縣市">
      <button type="button" :aria-pressed="selectedCity === 'all'" @click="select('all')">
        全台
        <span>{{ hospitals.length }}</span>
      </button>
      <button
        v-for="county in MAP_COUNTIES"
        :key="county.name"
        type="button"
        :aria-pressed="selectedCity === county.name"
        :class="{ empty: !summaries.get(county.name)?.count }"
        @click="select(county.name)"
      >
        {{ county.name }}
        <span>{{ summaries.get(county.name)?.count || 0 }}</span>
      </button>
    </div>
    <div class="map-caption">
      <p>
        地圖只顯示已核對的院所經緯度；沒有可靠座標的資料保留在下方清單，不以縣市中心代替。點選光點可查看院所。
      </p>
      <span class="map-sources">
        <a
          href="https://github.com/dkaoster/taiwan-atlas"
          target="_blank"
          rel="noopener noreferrer"
        >
          圖形：內政部 / Taiwan Atlas
        </a>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          點位：OpenStreetMap contributors
        </a>
      </span>
    </div>
  </section>
</template>

<style scoped>
.hospital-map {
  min-width: 0;
  margin: 14px 0 20px;
}
.map-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.map-eyebrow {
  color: var(--pri);
  font-size: 0.64rem;
  font-weight: 850;
  letter-spacing: 0.16em;
}
.map-heading h2 {
  margin: 4px 0 0;
  font-family: var(--font-heading-zh);
  color: var(--txt);
  font-size: clamp(1.15rem, 2.3vw, 1.6rem);
  line-height: 1.4;
}
.map-mode {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--txt-muted);
  white-space: nowrap;
  font-size: 0.68rem;
}
.map-mode i {
  width: 5px;
  height: 5px;
  background: var(--pri);
  border-radius: 50%;
}
.map-stage {
  position: relative;
  height: clamp(390px, 46vw, 520px);
  overflow: hidden;
  isolation: isolate;
  background: #080f1b;
  border: 1px solid #263747;
}
.map-summary {
  position: absolute;
  top: 22px;
  left: 24px;
  display: grid;
  gap: 5px;
  color: #b1c4d5;
  pointer-events: none;
  text-shadow: 0 2px 8px #080f1b;
}
.map-summary > span:first-child {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}
.map-summary strong {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #f0f6fb;
  font:
    400 clamp(1.8rem, 4vw, 2.6rem)/1.15 ui-monospace,
    monospace;
}
.map-summary small {
  color: #a5b8ca;
  font: 400 0.68rem/1.5 var(--font-body-zh);
}
.map-saved {
  color: #f07baa;
  font-size: 0.68rem;
}
.map-precise {
  color: #78cfff;
  font-size: 0.64rem;
  letter-spacing: 0.04em;
}
.map-hospital-detail {
  position: absolute;
  top: 78px;
  right: 16px;
  display: grid;
  width: min(280px, calc(100% - 32px));
  gap: 5px;
  padding: 14px 15px;
  border: 1px solid #36526d;
  border-left: 2px solid #78cfff;
  background: #0a1624e8;
  color: #e8f2f8;
  text-align: left;
  cursor: pointer;
}
.map-hospital-detail > span {
  color: #78cfff;
  font:
    700 0.56rem/1.2 ui-monospace,
    monospace;
  letter-spacing: 0.13em;
}
.map-hospital-detail strong {
  font: 700 0.88rem/1.45 var(--font-body-zh);
}
.map-hospital-detail small {
  color: #9eb1c2;
  font: 400 0.68rem/1.55 var(--font-body-zh);
}
.map-hospital-detail b {
  margin-top: 3px;
  color: #ffc496;
  font: 650 0.66rem/1.4 var(--font-body-zh);
}
.map-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.map-pin {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 44px;
  padding: 4px 7px;
  border: 0;
  background: transparent;
  color: #d9e9f4;
  font: 600 0.7rem var(--font-body-zh);
  white-space: nowrap;
  transform: translate(-50%, -100%);
  text-shadow:
    0 1px 5px #080f1b,
    0 0 8px #080f1b;
  pointer-events: auto;
  cursor: pointer;
}
.map-pin i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #78cfff;
}
.map-pin b {
  color: #91b4ce;
  font:
    500 0.65rem ui-monospace,
    monospace;
}
.map-pin.saved i,
.map-legend .saved {
  background: #f07baa;
}
.map-pin.selected {
  color: #ffc496;
}
.map-pin.selected i {
  background: #ff9d56;
}
.map-pin.selected b {
  color: #ffc496;
}
.map-tools {
  position: absolute;
  right: 15px;
  top: 16px;
  display: grid;
  gap: 5px;
}
.map-tools button {
  width: 44px;
  height: 44px;
  border: 1px solid #314359;
  border-radius: 2px;
  background: #0c1726e6;
  color: #c6d8e8;
  font-size: 1.2rem;
  cursor: pointer;
}
.map-tools button:disabled {
  opacity: 0.35;
  cursor: default;
}
.map-north {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 5px;
  color: #8cabc6;
  font:
    600 0.7rem ui-monospace,
    monospace;
  height: 26px;
}
.map-north span {
  font-size: 1.25rem;
}
.map-instructions {
  position: absolute;
  left: 20px;
  right: 20px;
  bottom: 15px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #91a9be;
  font-size: 0.64rem;
  pointer-events: none;
}
.map-legend {
  display: flex;
  align-items: center;
  gap: 5px;
}
.map-legend i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #78cfff;
}
.map-legend .saved {
  margin-left: 7px;
}
.map-loading,
.map-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 9px;
  padding: 24px;
  color: #c4d7e9;
  background: #080f1b;
  text-align: center;
  font-size: 0.85rem;
}
.map-fallback p {
  margin: 0;
  color: #91a9be;
}
.map-fallback button {
  min-height: 44px;
  padding: 8px 18px;
  margin-top: 8px;
  color: #f3c29b;
  border: 1px solid #a95529;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
.map-cities {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding: 10px 0 7px;
  scrollbar-width: thin;
  scrollbar-color: var(--bd) transparent;
}
.map-cities button {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: var(--txt);
  font: 600 0.78rem var(--font-body-zh);
  cursor: pointer;
}
.map-cities button span {
  color: var(--txt-muted);
  font:
    500 0.68rem ui-monospace,
    monospace;
}
.map-cities button[aria-pressed='true'] {
  border-color: var(--pri);
  color: var(--pri);
  background: color-mix(in srgb, var(--pri) 6%, transparent);
}
.map-cities button.empty {
  color: var(--txt-muted);
}
.map-caption {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--txt-muted);
  font-size: 0.65rem;
  line-height: 1.6;
}
.map-caption p {
  margin: 0;
}
.map-caption a {
  flex-shrink: 0;
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.map-sources {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}
button:focus-visible,
a:focus-visible,
.map-stage :deep(canvas:focus-visible) {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
@media (max-width: 767px) {
  .hospital-map {
    margin: 12px 0 14px;
  }
  .map-stage {
    height: 390px;
  }
  .map-heading {
    align-items: center;
  }
  .map-mode {
    font-size: 0.58rem;
  }
  .map-summary {
    left: 14px;
    top: 17px;
  }
  .map-tools {
    right: 10px;
    top: 12px;
  }
  .map-hospital-detail {
    top: auto;
    right: 12px;
    bottom: 46px;
    left: 12px;
    width: auto;
    padding: 11px 12px;
  }
  .map-instructions {
    left: 12px;
    right: 12px;
    bottom: 12px;
    font-size: 0.57rem;
  }
  .map-caption {
    display: block;
  }
  .map-caption a {
    display: inline-block;
    padding-top: 3px;
  }
  .map-sources {
    flex-wrap: wrap;
    gap: 2px 10px;
  }
}
@media (hover: hover) and (pointer: fine) {
  .map-pin:hover {
    color: #ffc496;
  }
  .map-tools button:hover:not(:disabled) {
    border-color: #9db8cc;
  }
  .map-cities button:hover {
    border-color: var(--bd);
  }
}
</style>
