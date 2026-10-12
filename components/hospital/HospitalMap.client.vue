<script setup lang="ts">
import {
  computed,
  onErrorCaptured,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  triggerRef,
  watch
} from 'vue'
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
  focusedHospital?: MapHospital | null
  focusSequence?: number
  visibleHospitals?: MapHospital[]
}>()
const emit = defineEmits<{
  select: [city: string]
  selectHospital: [hospital: MapHospital]
  showDetails: [hospital: MapHospital]
  clearHospital: []
}>()
const mountedOnce = ref(true)
const visible = ref(true)
const stage = ref<HTMLElement | null>(null)
let visibilityObserver: IntersectionObserver | undefined
const documentVisible = ref(true)
const compact = ref(false)
const reducedMotion = ref(false)
const ready = ref(false)
const failed = ref(false)
const generation = ref(0)
const command = ref<{ action: string; sequence: number; delta?: number; x?: number; y?: number }>({
  action: '',
  sequence: 0
})
const mapMode = ref<'3d' | 'google'>('3d')
const googleInteractive = ref(false)
const metrics = ref({
  frames: 0,
  calls: 0,
  triangles: 0,
  idle: true,
  buildings: 0,
  geometries: 0,
  cameraType: '',
  zoom: 1
})
const buildingLoading = ref(false)
const buildingError = ref(false)
const tilted = ref(false)
const streetView = ref(false)
const tileStatus = ref({ loading: false, failed: false, count: 0, enabled: false })
const selectedPlace = ref<{
  name: string
  longitude: number
  latitude: number
  category?: string
} | null>(null)
function updateTileStatus(status: typeof tileStatus.value) {
  tileStatus.value = status
}
function choosePlace(label: {
  name: string
  longitude?: number
  latitude?: number
  category?: string
}) {
  if (label.longitude === undefined || label.latitude === undefined) return
  selectedPlace.value = {
    name: label.name,
    longitude: label.longitude,
    latitude: label.latitude,
    category: label.category
  }
  selectedHospital.value = null
  emit('clearHospital')
  control(`place:${label.longitude},${label.latitude}`)
}
const placeNavigation = computed(() =>
  selectedPlace.value
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.value.latitude},${selectedPlace.value.longitude}`
    : ''
)
const hospitalClusters = shallowRef<{ x: number; y: number; ids: (string | number)[] }[]>([])
const sharedLocationHospitals = ref<MapHospital[]>([])
function openCluster(ids: (string | number)[]) {
  streetView.value = false
  sharedLocationHospitals.value = []
  if (ids.length === 1) {
    selectHospital(ids[0]!)
    return
  }
  selectedPlace.value = null
  closeHospital()
  const members = preciseHospitals.value.filter((hospital) =>
    ids.map(String).includes(String(hospital.id))
  )
  const first = members[0]
  if (
    first &&
    members.every(
      (hospital) =>
        Math.abs(hospital.latitude! - first.latitude!) < 0.00001 &&
        Math.abs(hospital.longitude! - first.longitude!) < 0.00001
    )
  ) {
    sharedLocationHospitals.value = members
    return
  }
  control(`cluster:${ids.join(',')}`)
}
function closeSharedLocation() {
  sharedLocationHospitals.value = []
}
function selectSharedHospital(id: string | number) {
  selectHospital(id)
  closeSharedLocation()
}
const buildingLabels = shallowRef<
  {
    name: string
    x: number
    y: number
    height: number
    heightSource: string
    longitude?: number
    latitude?: number
    category?: string
  }[]
>([])
function setMapView(tilt: boolean) {
  tilted.value = tilt
  control(tilt ? 'tilt' : 'top')
}
function previewBuildings() {
  selectedPlace.value = null
  streetView.value = true
  selectedHospital.value = null
  buildingError.value = false
  buildingLoading.value = true
  tilted.value = false
  control('buildings')
}
function updateMetrics(value: typeof metrics.value) {
  metrics.value = value
  if (value.buildings) buildingLoading.value = false
}
function buildingFailed() {
  streetView.value = false
  buildingLoading.value = false
  buildingError.value = true
}
const labels = shallowRef<{ name: string; x: number; y: number; visible: boolean }[]>([])
const summaries = computed(() => summarizeMapHospitals(props.hospitals, props.wishlist))
const displayedHospitals = computed(() => props.visibleHospitals || props.hospitals)
const preciseHospitals = computed(() => preciseMapHospitals(displayedHospitals.value))
const selectedHospital = ref<MapHospital | null>(null)
const localFocusSequence = ref(0)
const googleHospital = computed(() => selectedHospital.value || displayedHospitals.value[0] || null)
function selectGoogleHospital(event: Event) {
  selectHospital((event.target as HTMLSelectElement).value)
}
const selectedCity = computed(() => normalizeMapCity(props.selected))
const selectedSummary = computed(() => ({
  count: displayedHospitals.value.length,
  saved: displayedHospitals.value.filter((h) => props.wishlist.includes(h.id)).length
}))
const active = computed(
  () => visible.value && documentVisible.value && !failed.value && mapMode.value === '3d'
)
const googleQuery = computed(() =>
  googleHospital.value ? `${googleHospital.value.name} ${googleHospital.value.address}` : ''
)
const googleEmbedUrl = computed(
  () =>
    `https://maps.google.com/maps?q=${encodeURIComponent(googleQuery.value)}&z=16&output=embed&hl=zh-TW`
)
const googleNavigationUrl = computed(
  () =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(googleQuery.value)}`
)
watch(
  () => [props.focusedHospital, props.focusSequence],
  () => {
    selectedHospital.value =
      displayedHospitals.value.find(
        (hospital) => String(hospital.id) === String(props.focusedHospital?.id)
      ) || null
    localFocusSequence.value++
    if (selectedHospital.value) {
      selectedPlace.value = null
      sharedLocationHospitals.value = []
    }
    if (selectedHospital.value && !preciseMapHospitals([selectedHospital.value]).length)
      mapMode.value = 'google'
  },
  { immediate: true }
)
watch(displayedHospitals, (hospitals) => {
  sharedLocationHospitals.value = []
  selectedPlace.value = null
  if (
    selectedHospital.value &&
    !hospitals.some((h) => String(h.id) === String(selectedHospital.value?.id))
  )
    selectedHospital.value = null
})
watch(
  () => props.selected,
  () => {
    streetView.value = false
    selectedPlace.value = null
    sharedLocationHospitals.value = []
    if (props.selected === 'all') tilted.value = false
  }
)
watch([mapMode, googleEmbedUrl], () => {
  googleInteractive.value = false
  cancelWheel()
})
const canvasDpr = computed(() => (compact.value ? 1.25 : 1.5))
let deviceQuery: MediaQueryList | undefined
let motionQuery: MediaQueryList | undefined

function select(city: string) {
  selectedPlace.value = null
  streetView.value = false
  selectedHospital.value = null
  emit('select', city)
}
function selectMapRegion(event: Event) {
  select((event.target as HTMLSelectElement).value)
}
function selectHospital(id: string | number) {
  cancelWheel()
  selectedPlace.value = null
  streetView.value = false
  const hospital = props.hospitals.find((item) => String(item.id) === String(id))
  if (!hospital) return
  selectedHospital.value = hospital
  emit('selectHospital', hospital)
}
function control(action: string) {
  cancelWheel()
  if (action === 'reset') {
    tilted.value = false
    streetView.value = false
    sharedLocationHospitals.value = []
    selectedPlace.value = null
    closeHospital()
  }
  command.value = { action, sequence: command.value.sequence + 1 }
}
function closeHospital() {
  selectedHospital.value = null
  emit('clearHospital')
}
function fitResults() {
  if (!preciseHospitals.value.length) return
  selectedPlace.value = null
  sharedLocationHospitals.value = []
  closeHospital()
  if (preciseHospitals.value.length === 1) selectHospital(preciseHospitals.value[0]!.id)
  else control(`fit:${preciseHospitals.value.map((hospital) => hospital.id).join(',')}`)
}
function dismissDetails(event?: KeyboardEvent) {
  if (event && event.key !== 'Escape') return
  if (!selectedPlace.value && !selectedHospital.value && !sharedLocationHospitals.value.length)
    return
  event?.preventDefault()
  selectedPlace.value = null
  sharedLocationHospitals.value = []
  closeHospital()
  stage.value?.querySelector('canvas')?.focus({ preventScroll: true })
}
let wheelFrame = 0
let wheelDelta = 0
let wheelX = 0
let wheelY = 0
function cancelWheel() {
  if (wheelFrame) cancelAnimationFrame(wheelFrame)
  wheelFrame = 0
  wheelDelta = 0
}
watch(active, (value) => {
  if (!value) cancelWheel()
})
function wheelControl(event: WheelEvent) {
  if (mapMode.value !== '3d' || failed.value || !ready.value) return
  if (
    (event.target as Element)?.closest(
      '.map-place-detail,.map-hospital-detail,.map-result-preview,.map-shared-location,.map-tools,.map-tile-status'
    )
  )
    return
  // 預設讓使用者繼續閱讀頁面，按住修飾鍵才縮放地圖。
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  event.stopPropagation()
  const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1)
  if (!delta) return
  wheelDelta += delta
  wheelX = event.clientX
  wheelY = event.clientY
  if (wheelFrame) return
  wheelFrame = requestAnimationFrame(() => {
    if (!active.value || !ready.value) {
      cancelWheel()
      return
    }
    command.value = {
      action: 'wheel',
      sequence: command.value.sequence + 1,
      delta: Math.max(-400, Math.min(400, wheelDelta)),
      x: wheelX,
      y: wheelY
    }
    wheelDelta = 0
    wheelFrame = 0
  })
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
  visibilityObserver = new IntersectionObserver(
    ([entry]) => {
      visible.value = !!entry?.isIntersecting
    },
    { rootMargin: '100px' }
  )
  if (stage.value) visibilityObserver.observe(stage.value)
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
  if (wheelFrame) cancelAnimationFrame(wheelFrame)
  visibilityObserver?.disconnect()
  deviceQuery?.removeEventListener('change', deviceChanged)
  motionQuery?.removeEventListener('change', motionChanged)
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <section class="hospital-map" aria-label="全台特寵醫院分布概覽">
    <div class="map-heading">
      <div>
        <span class="map-eyebrow">EXPLORE TAIWAN</span>
        <h2>探索院所與周邊街區</h2>
      </div>
      <div class="map-view-switch" aria-label="地圖底圖">
        <button type="button" :aria-pressed="mapMode === '3d'" @click="mapMode = '3d'">
          3D 地圖
        </button>
        <button type="button" :aria-pressed="mapMode === 'google'" @click="mapMode = 'google'">
          Google 地圖
        </button>
      </div>
    </div>
    <div v-if="mapMode === '3d'" class="map-building-tools">
      <button
        type="button"
        :disabled="!ready || failed || !preciseHospitals.length"
        @click="fitResults"
      >
        顯示篩選結果
      </button>
      <button
        type="button"
        :disabled="!ready || failed || buildingLoading"
        @click="previewBuildings"
      >
        {{ buildingLoading ? '載入建築…' : '查看 101 街區量體' }}
      </button>
      <button
        type="button"
        :disabled="!ready || failed"
        :aria-pressed="!tilted"
        @click="setMapView(false)"
      >
        垂直俯視
      </button>
      <button
        type="button"
        :disabled="!ready || failed"
        :aria-pressed="tilted"
        @click="setMapView(true)"
      >
        傾斜看高度
      </button>
      <span role="status">
        {{
          buildingError
            ? '建築載入失敗，請重試'
            : metrics.buildings
              ? '透視俯視 · 街區建築圖層'
              : '放大至街區顯示建築與地標'
        }}
      </span>
    </div>
    <div v-if="mapMode === 'google' && googleHospital" class="map-region-bar">
      <label>
        <span>院所位置</span>
        <select
          :value="String(googleHospital.id)"
          aria-label="Google 預覽院所"
          @change="selectGoogleHospital"
        >
          <option
            v-for="hospital in displayedHospitals"
            :key="hospital.id"
            :value="String(hospital.id)"
          >
            {{ hospital.name }}
          </option>
        </select>
      </label>
      <button
        type="button"
        :aria-pressed="googleInteractive"
        @click="googleInteractive = !googleInteractive"
      >
        {{ googleInteractive ? '停止操作地圖' : '啟用地圖操作' }}
      </button>
      <span>
        {{
          googleInteractive ? '可拖曳與縮放；閱讀頁面前請停止操作' : '單院位置預覽，不攔截頁面捲動'
        }}
      </span>
    </div>
    <div
      ref="stage"
      class="map-stage"
      data-lenis-prevent-wheel
      @wheel="wheelControl"
      @keydown="dismissDetails"
      :data-map-ready="ready"
      :data-map-idle="metrics.idle"
      :data-map-frames="metrics.frames"
      :data-map-calls="metrics.calls"
      :data-map-triangles="metrics.triangles"
      :data-map-buildings="metrics.buildings"
      :data-map-geometries="metrics.geometries"
      :data-map-camera="metrics.cameraType"
      :data-map-zoom="metrics.zoom"
      :data-map-tile-count="tileStatus.count"
      :data-map-tile-loading="tileStatus.loading"
    >
      <TresCanvas
        v-if="mountedOnce && !failed"
        v-show="mapMode === '3d'"
        :key="generation"
        clear-color="#e5edef"
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
          :interaction-surface="stage"
          :focused-hospital="selectedHospital"
          :focus-sequence="localFocusSequence"
          @select="select"
          @select-hospital="selectHospital"
          @request-command="control"
          @labels="updateLabels"
          @ready="ready = true"
          @lost="failure"
          @metrics="updateMetrics"
          @building-error="buildingFailed"
          @building-labels="buildingLabels = $event"
          @hospital-clusters="hospitalClusters = $event"
          @tile-status="updateTileStatus"
        />
      </TresCanvas>
      <div v-if="mapMode === '3d' && ready" class="map-clusters">
        <button
          v-for="cluster in hospitalClusters"
          :key="cluster.ids.join(',')"
          type="button"
          class="map-cluster"
          :class="{
            single: cluster.ids.length === 1,
            saved: wishlist.some((id) => cluster.ids.map(String).includes(String(id))),
            chosen: cluster.ids.map(String).includes(String(selectedHospital?.id))
          }"
          :style="{ left: `${cluster.x}px`, top: `${cluster.y}px` }"
          :aria-label="
            cluster.ids.length > 1
              ? `放大查看 ${cluster.ids.length} 間院所`
              : `查看 ${hospitals.find((hospital) => String(hospital.id) === String(cluster.ids[0]))?.name || '院所'}`
          "
          @click="openCluster(cluster.ids)"
        >
          {{ cluster.ids.length > 1 ? cluster.ids.length : '＋' }}
        </button>
      </div>
      <div v-if="mapMode === '3d' && sharedLocationHospitals.length" class="map-shared-location">
        <strong>同位置院所</strong>
        <button type="button" aria-label="關閉同位置院所" @click="closeSharedLocation">×</button>
        <button
          v-for="hospital in sharedLocationHospitals"
          :key="hospital.id"
          type="button"
          @click="selectSharedHospital(hospital.id)"
        >
          {{ hospital.name }}
        </button>
      </div>
      <div v-if="mapMode === '3d'" class="map-building-labels">
        <button
          v-for="label in buildingLabels"
          :key="`${label.name}/${label.longitude}/${label.latitude}`"
          class="map-building-label"
          :class="{ poi: label.height === 0, road: label.category === 'road' }"
          type="button"
          :disabled="label.longitude === undefined"
          @click="choosePlace(label)"
          :style="{ left: `${label.x}px`, top: `${label.y}px` }"
        >
          <strong>{{ label.name }}</strong>
          <span v-if="label.height > 0">
            {{ label.height }} m{{ label.heightSource === 'height' ? '' : ' · 估值' }}
          </span>
        </button>
      </div>
      <aside v-if="mapMode === '3d' && selectedPlace" class="map-place-detail">
        <button type="button" aria-label="關閉地標資訊" @click="dismissDetails()">×</button>
        <strong>{{ selectedPlace.name }}</strong>
        <small>一般地標 · OpenStreetMap</small>
        <a :href="placeNavigation" target="_blank" rel="noopener noreferrer">Google 導航 ↗</a>
      </aside>
      <div v-if="mapMode === '3d'" class="map-tile-status" role="status">
        <span v-if="tileStatus.loading">載入周邊建築與地標…</span>
        <template v-else-if="tileStatus.failed">
          <span>圖資暫時無法載入</span>
          <button type="button" @click="control('retry-tiles')">重試</button>
        </template>
        <span v-else-if="tileStatus.count">已載入 {{ tileStatus.count }} 個建築量體</span>
        <span v-else>
          {{ tileStatus.enabled ? '此區域尚無建築圖資' : '放大至街區顯示建築與地標' }}
        </span>
      </div>
      <iframe
        v-if="mapMode === 'google' && googleHospital"
        class="map-google"
        :class="{ interactive: googleInteractive }"
        :tabindex="googleInteractive ? 0 : -1"
        :src="googleEmbedUrl"
        :title="`${googleQuery} Google 地圖`"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      />
      <div v-if="mapMode === 'google' && !googleHospital" class="map-fallback" role="status">
        沒有符合條件的院所，請調整篩選。
      </div>
      <div v-if="mapMode === '3d'" class="map-summary" aria-live="polite" aria-atomic="true">
        <span>
          {{ streetView ? '街區建築' : selectedCity === 'all' ? '全台資源' : selectedCity }}
        </span>
        <strong>
          {{ streetView ? metrics.buildings || '…' : selectedSummary.count }}
          <small>{{ streetView ? '個建築量體' : '間收錄院所' }}</small>
        </strong>
        <span v-if="selectedSummary.saved" class="map-saved">
          ● 已收藏 {{ selectedSummary.saved }} 間
        </span>
        <span v-if="!streetView" class="map-precise">
          定位點位 {{ preciseHospitals.length }} / {{ displayedHospitals.length }}
        </span>
      </div>
      <aside
        v-if="
          mapMode === '3d' &&
          ready &&
          !streetView &&
          !selectedHospital &&
          !selectedPlace &&
          displayedHospitals.length
        "
        class="map-result-preview"
        aria-label="地圖院所預覽"
      >
        <strong>院所預覽</strong>
        <span>{{ displayedHospitals.length }} 間符合條件</span>
        <button
          v-for="hospital in displayedHospitals.slice(0, 5)"
          :key="hospital.id"
          type="button"
          @click="selectHospital(hospital.id)"
        >
          <b>{{ hospital.name }}</b>
          <small>{{ hospital.city }} {{ hospital.district }}</small>
        </button>
        <small>完整名錄與聯絡方式見下方清單</small>
      </aside>
      <div
        v-if="selectedHospital && mapMode === '3d'"
        class="map-hospital-detail"
        aria-live="polite"
      >
        <span>特寵院所</span>
        <button
          type="button"
          class="map-detail-close"
          aria-label="關閉院所資訊"
          @click="dismissDetails()"
        >
          ×
        </button>
        <strong>{{ selectedHospital.name }}</strong>
        <small>{{ selectedHospital.address }}</small>
        <div class="map-detail-actions">
          <button type="button" @click="localFocusSequence++">重新定位</button>
          <button type="button" @click="emit('showDetails', selectedHospital)">院所資料</button>
          <button type="button" @click="mapMode = 'google'">Google 地圖</button>
          <a :href="googleNavigationUrl" target="_blank" rel="noopener noreferrer">導航 ↗</a>
        </div>
      </div>
      <div v-if="ready && !failed && mapMode === '3d'" class="map-labels">
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
      <div v-if="mapMode === '3d'" class="map-tools" aria-label="地圖視角控制">
        <span class="map-north" aria-hidden="true">
          N
          <span>↑</span>
        </span>
        <button
          type="button"
          aria-label="放大地圖"
          :disabled="!ready || failed || metrics.zoom >= 1999"
          @click="control('in')"
        >
          ＋
        </button>
        <button
          type="button"
          aria-label="縮小地圖"
          :disabled="!ready || failed || metrics.zoom <= 0.701"
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
      <div v-if="!ready && !failed && mapMode === '3d'" class="map-loading" role="status">
        正在展開立體地圖…
      </div>
      <div v-if="failed && mapMode === '3d'" class="map-fallback" role="status">
        <strong>暫時無法顯示立體地圖</strong>
        <p>仍可使用下方縣市按鈕查找醫院。</p>
        <button type="button" @click="retry">重新載入地圖</button>
      </div>
      <div v-if="mapMode === '3d'" class="map-instructions">
        <span>
          {{
            compact
              ? '點選縣市聚焦 · 單指平移 · 雙指縮放'
              : '北方朝上 · 拖曳平移 · Ctrl／⌘＋滾輪縮放'
          }}
        </span>
        <span class="map-legend">
          <i />
          院所定位
          <i class="saved" />
          有收藏
        </span>
      </div>
    </div>
    <div class="map-region-bar">
      <label>
        <span>地圖範圍</span>
        <select :value="selectedCity" aria-label="地圖範圍" @change="selectMapRegion">
          <option value="all">全台院所</option>
          <option v-for="county in MAP_COUNTIES" :key="county.name" :value="county.name">
            {{ county.name }} · {{ summaries.get(county.name)?.count || 0 }} 間
          </option>
        </select>
      </label>
      <span>點數量放大，點「＋」查看院所</span>
    </div>
    <div class="map-caption">
      <p>全台圖資隨視野載入，放大至街區顯示建築與地標；高度含估算值，未收錄的建物不會虛構補齊。</p>
      <p>院所可能搬遷，就診前請先致電確認；路線請使用 Google 地圖。</p>
      <span class="map-sources">
        <a
          href="https://github.com/dkaoster/taiwan-atlas"
          target="_blank"
          rel="noopener noreferrer"
        >
          圖形：內政部 / Taiwan Atlas
        </a>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          點位／建築：OpenStreetMap contributors
        </a>
        <a href="https://openfreemap.org/" target="_blank" rel="noopener noreferrer">
          圖磚：OpenFreeMap
        </a>
      </span>
    </div>
  </section>
</template>

<style scoped>
.map-tile-status {
  position: absolute;
  bottom: 35px;
  left: 20px;
  display: flex;
  gap: 8px;
  align-items: center;
  background: #ffffffec;
  color: #506258;
  border: 1px solid #d6d9d0;
  border-radius: 4px;
  padding: 5px 8px;
  font-size: 11px;
  pointer-events: none;
}
.map-tile-status button {
  pointer-events: auto;
  border: 0;
  background: transparent;
  color: var(--pri);
  min-height: 32px;
  cursor: pointer;
}
.map-place-detail {
  position: absolute;
  z-index: 5;
  right: 76px;
  top: 22px;
  display: grid;
  gap: 8px;
  width: 230px;
  padding: 14px;
  border: 1px solid #d6d9d0;
  background: #fff;
  color: #344b40;
  border-radius: 6px;
}
.map-place-detail button {
  justify-self: end;
  border: 0;
  background: transparent;
  cursor: pointer;
  min-width: 32px;
  min-height: 32px;
}
.map-place-detail small {
  font-size: 11px;
  color: #6b7a6f;
}
.map-place-detail a {
  color: var(--pri);
  font-size: 12px;
}
.map-building-label:not(:disabled) {
  pointer-events: auto;
  cursor: pointer;
}
.map-result-preview {
  position: absolute;
  z-index: 3;
  top: 22px;
  right: 76px;
  width: 250px;
  padding: 14px;
  background: #ffffffed;
  color: #344b40;
  border: 1px solid #d6d9d0;
  border-radius: 6px;
  display: grid;
  gap: 6px;
  text-align: left;
}
.map-result-preview > strong {
  font-size: 13px;
}
.map-result-preview > span,
.map-result-preview small {
  font-size: 11px;
  color: #6b7a6f;
}
.map-result-preview button {
  display: grid;
  gap: 3px;
  text-align: left;
  padding: 8px 0;
  border: 0;
  border-bottom: 1px solid #e8e9e2;
  background: transparent;
  color: #344b40;
  min-height: 46px;
  cursor: pointer;
}
.map-result-preview b {
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
}
@media (max-width: 1100px) {
  .map-result-preview {
    display: none;
  }
}
.map-region-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  color: var(--txt-muted);
  font-size: 12px;
}
.map-region-bar label {
  display: flex;
  align-items: center;
  gap: 8px;
}
.map-region-bar select {
  min-height: 40px;
  padding: 6px 12px;
  background: var(--card-bg-solid);
  color: var(--txt);
  border: 1px solid var(--bd);
  font: inherit;
}
.map-clusters {
  z-index: 2;
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.map-cluster {
  user-select: none;
  position: absolute;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 3px solid #fff;
  background: #b83923;
  color: #fff;
  box-shadow: 0 2px 6px #38483a30;
  font: 700 14px var(--font-body-zh);
  pointer-events: auto;
  cursor: pointer;
}
.map-cluster.single {
  width: 34px;
  height: 34px;
  font-size: 20px;
}
.map-cluster.chosen {
  background: #293f35;
  outline: 3px solid #b8392350;
}
.map-cluster.saved {
  border-color: #b29662;
}
.map-cluster:focus-visible {
  outline: 3px solid #22382f;
  outline-offset: 3px;
}
.map-shared-location {
  z-index: 5;
  position: absolute;
  right: 75px;
  top: 20px;
  padding: 12px;
  background: #fff;
  border: 1px solid #d6d9d0;
  border-radius: 6px;
  max-width: 280px;
  max-height: 70%;
  overflow: auto;
}
.map-shared-location button {
  min-height: 40px;
  padding: 6px;
  border: 0;
  background: transparent;
  color: #344b40;
  display: block;
  cursor: pointer;
}
.map-building-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.map-building-tools button {
  min-height: 40px;
  padding: 6px 10px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  color: var(--txt);
  cursor: pointer;
}
.map-building-tools button[aria-pressed='true'] {
  border-color: var(--pri);
  color: var(--pri);
}
.map-building-tools span {
  font-size: 12px;
  color: var(--txt-muted);
}
.map-view-switch,
.map-detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.map-view-switch button {
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid var(--bd);
  background: var(--bg);
  color: var(--txt);
  cursor: pointer;
  font: 600 0.75rem/1.4 var(--font-body-zh);
}
.map-view-switch button[aria-pressed='true'] {
  border-color: var(--pri);
  color: var(--pri);
}
.map-google {
  pointer-events: none;
  display: block;
  border: 0;
  width: 100%;
  height: 100%;
}
.map-google.interactive {
  pointer-events: auto;
}
.map-region-bar > button {
  min-height: 36px;
  padding: 6px 10px;
  border: 1px solid #d5d9d0;
  background: #fff;
  color: #344b40;
  font: 600 0.75rem/1.4 var(--font-body-zh);
  cursor: pointer;
}
.map-detail-actions button,
.map-detail-actions a {
  padding: 7px;
  min-height: 36px;
  border: 1px solid #d5d9d0;
  color: #344b40;
  background: #ffffff;
  font: 600 0.7rem/1.4 var(--font-body-zh);
  cursor: pointer;
  text-decoration: none;
}
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
  touch-action: none;
  position: relative;
  height: clamp(390px, 46vw, 520px);
  overflow: hidden;
  isolation: isolate;
  background: #f1f0e9;
  border: 1px solid #d4d4cb;
}
.map-building-labels {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.map-building-label {
  user-select: none;
  position: absolute;
  transform: translate(-50%, -100%);
  display: grid;
  gap: 2px;
  padding: 5px 8px;
  color: #283b3b;
  background: #fffffff0;
  border: 1px solid #d5d8cf;
  border-radius: 4px;
  box-shadow: 0 2px 8px #25353512;
  white-space: nowrap;
  font-size: 12px;
}
.map-building-label span {
  color: #6e7975;
  font-size: 10px;
}
.map-building-label.poi {
  padding: 3px 6px;
  background: #ffffffe0;
  box-shadow: none;
  border-color: #d9e1d5;
  font-size: 11px;
}
.map-building-label.poi strong::before {
  content: '•';
  color: #658b7e;
  margin-right: 4px;
}
.map-building-label.road {
  background: transparent;
  border: 0;
  color: #596d60;
  text-shadow: 0 1px 3px #fff;
}
.map-building-label.road strong::before {
  content: none;
}
.map-summary {
  z-index: 4;
  position: absolute;
  top: 22px;
  left: 24px;
  display: grid;
  gap: 5px;
  color: #53645f;
  pointer-events: none;
  padding: 12px 14px;
  background: #ffffffec;
  border: 1px solid #d6d9d0;
  border-radius: 6px;
}
.map-summary > span:first-child {
  font-size: 0.8rem;
  letter-spacing: 0.08em;
}
.map-summary strong {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #243932;
  font:
    400 clamp(1.8rem, 4vw, 2.6rem)/1.15 ui-monospace,
    monospace;
}
.map-summary small {
  color: #65766c;
  font: 400 0.68rem/1.5 var(--font-body-zh);
}
.map-saved {
  color: #86633c;
  font-size: 0.68rem;
}
.map-precise {
  color: #a9442d;
  font-size: 0.64rem;
  letter-spacing: 0.04em;
}
.map-hospital-detail {
  z-index: 4;
  position: absolute;
  top: 78px;
  right: 76px;
  display: grid;
  width: min(280px, calc(100% - 32px));
  gap: 5px;
  padding: 14px 15px;
  border: 1px solid #d5d9d0;
  border-left: 2px solid #a8432b;
  background: #ffffffef;
  color: #293e34;
  text-align: left;
}
.map-hospital-detail > span {
  color: #a8432b;
  font:
    700 0.56rem/1.2 ui-monospace,
    monospace;
  letter-spacing: 0.13em;
}
.map-detail-close {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.map-hospital-detail > strong {
  padding-right: 18px;
}
.map-hospital-detail strong {
  font: 700 0.88rem/1.45 var(--font-body-zh);
}
.map-hospital-detail small {
  color: #667369;
  font: 400 0.68rem/1.55 var(--font-body-zh);
}
.map-hospital-detail b {
  margin-top: 3px;
  color: #a8432b;
  font: 650 0.66rem/1.4 var(--font-body-zh);
}
.map-labels {
  z-index: 1;
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
  color: #415746;
  font: 600 0.7rem var(--font-body-zh);
  white-space: nowrap;
  transform: translate(-50%, -100%);
  text-shadow: 0 1px 3px #fff;
  pointer-events: auto;
  cursor: pointer;
}
.map-pin i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #a8432b;
}
.map-pin b {
  color: #6d796f;
  font:
    500 0.65rem ui-monospace,
    monospace;
}
.map-pin.saved i,
.map-legend .saved {
  background: #86633c;
}
.map-pin.selected {
  color: #a8432b;
}
.map-pin.selected i {
  background: #ba4a30;
}
.map-pin.selected b {
  color: #a8432b;
}
.map-tools {
  z-index: 4;
  position: absolute;
  right: 15px;
  top: 16px;
  display: grid;
  gap: 5px;
}
.map-tools button {
  width: 44px;
  height: 44px;
  border: 1px solid #d6d9d0;
  border-radius: 6px;
  background: #ffffffef;
  color: #344b40;
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
  color: #536c5e;
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
  color: #596d60;
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
  background: #b83923;
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
  color: #344b40;
  background: #f1f0e9;
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
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
  .map-view-switch {
    flex-wrap: nowrap;
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
    color: #a8432b;
  }
  .map-tools button:hover:not(:disabled) {
    border-color: #9db8cc;
  }
  .map-cities button:hover {
    border-color: var(--bd);
  }
}
</style>
