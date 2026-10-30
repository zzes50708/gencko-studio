<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useMediaQuery, useOnline } from '@vueuse/core'
import type {
  Map as VectorMap,
  GeoJSONSource,
  MapMouseEvent,
  StyleSpecification,
  Marker,
  EaseToOptions,
  FitBoundsOptions,
  LngLatBoundsLike
} from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { hospitalPhone } from '~/utils/hospitalPhone'
import type { HospitalMapCameraSnapshot } from '~/composables/useHospitalMapSession'
import { preciseMapHospitals, type MapHospital } from '~/utils/hospitalMap'
import {
  HOSPITAL_MAP_STYLE,
  HOSPITAL_SOURCE,
  HOSPITAL_LAYERS,
  TAIWAN_BOUNDS,
  hospitalVectorStyle,
  hospitalFeatures,
  hospitalGeographicBounds,
  hospitalMapFeaturePlace,
  hospitalPlaceSearchResults,
  type HospitalMapPlace
} from '~/utils/hospitalVectorMap'

const props = defineProps<{
  hospitals: MapHospital[]
  wishlist: (string | number)[]
  selected: string
  visibleHospitals?: MapHospital[]
  focusedHospital?: MapHospital | null
  focusSequence?: number
  fitSequence?: number
  query?: string
  resetSequence?: number
  selectionScope?: string
  searchPerformed?: boolean
  regionLabel?: string
}>()
const emit = defineEmits<{
  select: [city: string]
  selectHospital: [hospital: MapHospital]
  showDetails: [hospital: MapHospital]
  clearHospital: []
  toggleFavorite: [id: string | number]
  updateQuery: [query: string]
  interact: []
  search: []
}>()
const compact = useMediaQuery('(max-width: 767px), (pointer: coarse)')
const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const online = useOnline()
const shell = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)
const searchInput = ref<HTMLInputElement | null>(null)
const hospitalDetails = ref<HTMLElement | null>(null)
const placeDetails = ref<HTMLElement | null>(null)
const sharedDetails = ref<HTMLElement | null>(null)
const resultsPanel = ref<HTMLElement | null>(null)
const retryButton = ref<HTMLButtonElement | null>(null)
const ready = ref(false),
  failed = ref(false),
  recovering = ref(false),
  loading = ref(true),
  tileError = ref(false)
const locationError = ref('')
const localHospital = shallowRef<MapHospital | null>(null)
const selectedPlace = shallowRef<HospitalMapPlace | null>(null)
const sharedHospitals = shallowRef<MapHospital[]>([])
const resultsVisible = computed(() => !!props.searchPerformed)
const places = shallowRef<HospitalMapPlace[]>([])
const placeLoading = ref(false),
  placeError = ref(false),
  placesSearched = ref(false)
const metrics = ref({
  zoom: 6,
  pitch: 35,
  longitude: 120.96,
  latitude: 23.75,
  paddingLeft: 0,
  paddingRight: 0,
  buildings: 0,
  roads: 0,
  loaded: false
})
const query = computed({ get: () => props.query || '', set: (value) => emit('updateQuery', value) })
const shown = computed(() => props.visibleHospitals || props.hospitals)
const precise = computed(() => preciseMapHospitals(shown.value))
const viewportHospitals = shallowRef<MapHospital[]>([])
const hasRegionFilter = computed(() => props.selected !== 'all')
const listedHospitals = computed(() =>
  failed.value || hasRegionFilter.value ? shown.value : viewportHospitals.value
)
let viewportRevision = 0
async function syncViewportHospitals() {
  const currentMap = map
  if (!currentMap || !ready.value) return
  const revision = ++viewportRevision
  const source = currentMap.getSource(HOSPITAL_SOURCE) as GeoJSONSource | undefined
  if (!source) return
  const features = currentMap.queryRenderedFeatures(undefined, {
    layers: ['gencko-points', 'gencko-clusters'].filter((id) => !!currentMap.getLayer(id))
  })
  const ids = new Set<string>()
  const clusters = new Set<number>()
  for (const feature of features) {
    if (feature.properties?.cluster_id !== undefined)
      clusters.add(Number(feature.properties.cluster_id))
    else if (feature.properties?.id !== undefined) ids.add(String(feature.properties.id))
  }
  try {
    const leaves = await Promise.all(
      [...clusters].map((id) => source.getClusterLeaves(id, shown.value.length, 0))
    )
    if (disposed || map !== currentMap || revision !== viewportRevision) return
    for (const group of leaves) for (const feature of group) ids.add(String(feature.properties?.id))
    const visible = shown.value.filter((h) => ids.has(String(h.id)))
    if (
      visible.length !== viewportHospitals.value.length ||
      visible.some((h, i) => h !== viewportHospitals.value[i])
    )
      viewportHospitals.value = visible
  } catch {
    // 圖資或資料更新後舊群聚已失效，等下一個 idle 重新核對，不寫入過期清單。
  }
}
const session = useHospitalMapSession()
const sessionSignature = computed(() =>
  JSON.stringify([
    props.selectionScope || props.selected,
    props.query || '',
    shown.value.map((h) => String(h.id)).sort()
  ])
)
const selectedPhone = computed(() => hospitalPhone(localHospital.value?.phone))
let map: VectorMap | undefined,
  library: typeof import('maplibre-gl') | undefined,
  marker: Marker | undefined
let disposed = false,
  styleController: AbortController | undefined,
  searchController: AbortController | undefined
let initializationRevision = 0,
  searchRevision = 0,
  fitRevision = 0,
  recoveryTimer: ReturnType<typeof setTimeout> | undefined
let resizeObserver: ResizeObserver | undefined,
  lastMetrics = 0
let style: StyleSpecification | undefined
let roadLayerCount = 0
let placeLayerIds: string[] = []
let retryCamera: HospitalMapCameraSnapshot | undefined
let restoreMapFocus = false
let navigationIntent = 0
let geolocationIntent: number | null = null
let cameraBeforeStaleGeolocation: HospitalMapCameraSnapshot | undefined
let navigationTarget: EaseToOptions | undefined
const duration = () => (reduceMotion.value ? 0 : 550)
// 絕對留白明確指定四邊，避免數值型設定未套用至目前相機。
const uniformPadding = (value: number) => ({ top: value, bottom: value, left: value, right: value })

function userInteraction() {
  viewportRevision++
  navigationIntent++
  navigationTarget = undefined
  retryCamera = undefined
  fitRevision++
  emit('interact')
}
function mapControlClick(event: MouseEvent) {
  if (!(event.target instanceof Element)) return
  if (!event.target.closest('.maplibregl-ctrl-geolocate')) {
    if (
      event.target.closest(
        '.maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out, .maplibregl-ctrl-compass'
      )
    )
      userInteraction()
    return
  }
  userInteraction()
  geolocationIntent = navigationIntent
  cameraBeforeStaleGeolocation = undefined
}
function manualMapInput(event: Event) {
  if (event.target instanceof HTMLCanvasElement) userInteraction()
}
function updateHospitals() {
  viewportRevision++
  fitRevision++
  const source = map?.getSource(HOSPITAL_SOURCE) as GeoJSONSource | undefined
  source?.setData(hospitalFeatures(shown.value, props.wishlist, localHospital.value?.id))
}
function cameraSnapshot() {
  return map
    ? {
        center: map.getCenter().toArray() as [number, number],
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        padding: map.getPadding()
      }
    : undefined
}
// 保存操作的最終視角；定位回傳時，動畫可能尚未抵達目的地。
function easeCamera(options: EaseToOptions) {
  navigationTarget = { ...cameraSnapshot(), ...options }
  map?.easeTo(options)
}
function fitCamera(bounds: LngLatBoundsLike, options: FitBoundsOptions) {
  if (!map) return
  const target = map.cameraForBounds(bounds, options)
  navigationTarget = target ? { ...cameraSnapshot(), ...target, ...options } : undefined
  map.fitBounds(bounds, options)
}
// 離開畫面時完成明確的定位操作，避免只保存動畫中途的視角。
// 手動拖曳已由 userInteraction 清除目標，因此仍保留使用者選定的位置。
function settleNavigation() {
  if (map?.isMoving() && navigationTarget) map.jumpTo(navigationTarget)
}
function adaptivePadding() {
  return {
    top: 30,
    bottom: 30,
    left: compact.value
      ? 30
      : localHospital.value || selectedPlace.value || sharedHospitals.value.length
        ? 320
        : 30,
    right: 30
  }
}
function syncPlaceMarker() {
  marker?.remove()
  marker = undefined
  const place = selectedPlace.value
  if (library && map && place) {
    marker = new library.Marker({ color: '#b83923' })
      .setLngLat([place.longitude, place.latitude])
      .addTo(map)
    marker.getElement().setAttribute('aria-label', place.name)
    marker.getElement().title = place.name
  }
}
function resetView() {
  userInteraction()
  closeDetails()
  fitCamera(TAIWAN_BOUNDS, {
    absolutePadding: true,
    padding: uniformPadding(compact.value ? 28 : 60),
    pitch: 35,
    bearing: 0,
    duration: duration(),
    maxZoom: 7.5
  })
}
function fitResults() {
  navigationIntent++
  navigationTarget = undefined
  retryCamera = undefined
  const bounds = hospitalGeographicBounds(shown.value)
  if (!bounds || !map) return
  map.stop()
  const points = precise.value
  if (points.length === 1) focusHospital(points[0]!)
  else
    fitCamera(bounds, {
      absolutePadding: true,
      padding: compact.value
        ? uniformPadding(40)
        : {
            top: 55,
            bottom: 55,
            left: localHospital.value ? 320 : 55,
            right: 55
          },
      maxZoom: 16.5,
      duration: duration()
    })
}
function focusHospital(hospital: MapHospital) {
  navigationIntent++
  retryCamera = undefined
  localHospital.value = hospital
  selectedPlace.value = null
  sharedHospitals.value = []
  marker?.remove()
  updateHospitals()
  if (map && preciseMapHospitals([hospital]).length)
    easeCamera({
      center: [hospital.longitude!, hospital.latitude!],
      zoom: Math.max(16.5, Math.min(map.getZoom(), 18)),
      pitch: 40,
      padding: { top: 30, bottom: 30, left: compact.value ? 30 : 320, right: 30 },
      duration: duration()
    })
}
async function chooseHospital(hospital: MapHospital, event?: MouseEvent) {
  userInteraction()
  focusHospital(hospital)
  emit('selectHospital', hospital)
  if (event?.detail === 0) {
    await nextTick()
    hospitalDetails.value
      ?.querySelector<HTMLButtonElement>('button')
      ?.focus({ preventScroll: true })
  }
}
function closeDetails() {
  const hadHospitalSelection = !!localHospital.value
  localHospital.value = null
  selectedPlace.value = null
  sharedHospitals.value = []
  marker?.remove()
  emit('clearHospital')
  if (hadHospitalSelection) updateHospitals()
  else {
    // 沒有院所選取樣式要移除時，僅取消舊查詢，不重建相同的群聚資料。
    viewportRevision++
    fitRevision++
  }
}
async function searchHospitalAddress() {
  const address = localHospital.value?.address || localHospital.value?.name || ''
  closeDetails()
  query.value = address
  await nextTick()
  await searchPlaces(address)
}
function mapKeydown(event: KeyboardEvent) {
  // 動畫銜接時不一定再次觸發 movestart，直接以使用者輸入確認最新意圖。
  if (
    event.target instanceof HTMLCanvasElement &&
    !event.isComposing &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_'].includes(event.key)
  )
    userInteraction()
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
  const target = event.target as Node | null
  const canvas = event.target instanceof HTMLCanvasElement
  if (event.key === 'Home' && canvas) {
    event.preventDefault()
    resetView()
  }
  if (
    event.key === 'Escape' &&
    (canvas ||
      hospitalDetails.value?.contains(target) ||
      placeDetails.value?.contains(target) ||
      sharedDetails.value?.contains(target) ||
      resultsPanel.value?.contains(target))
  ) {
    event.preventDefault()
    void dismissDetails()
  }
}
function canRestoreFocus() {
  const active = document.activeElement
  return (
    active === document.body ||
    active === retryButton.value ||
    viewport.value?.contains(active) ||
    hospitalDetails.value?.contains(active) ||
    placeDetails.value?.contains(active) ||
    sharedDetails.value?.contains(active) ||
    resultsPanel.value?.contains(active)
  )
}
async function restoreFocusWhenReady() {
  if (!restoreMapFocus) return
  await nextTick()
  if (!disposed && ready.value && canRestoreFocus()) map?.getCanvas().focus({ preventScroll: true })
  restoreMapFocus = false
}
async function dismissDetails() {
  closeDetails()
  await nextTick()
  map?.getCanvas().focus({ preventScroll: true })
}
async function clearSearch() {
  query.value = ''
  places.value = []
  placesSearched.value = false
  await nextTick()
  searchInput.value?.focus({ preventScroll: true })
}
async function searchPlaces(value = query.value) {
  emit('search')
  const q = value.trim()
  closeDetails()
  searchController?.abort()
  const revision = ++searchRevision
  placeError.value = false
  places.value = []
  if (q.length < 2 || !online.value) {
    placesSearched.value = false
    placeLoading.value = false
    return
  }
  searchController = new AbortController()
  placeLoading.value = true
  placesSearched.value = true
  try {
    const result = await $fetch<unknown>('/api/hospital-place-search', {
      query: { q },
      signal: searchController.signal,
      timeout: 9000,
      retry: 0
    })
    if (disposed || revision !== searchRevision) return
    const parsed = hospitalPlaceSearchResults(result)
    if (!parsed) throw new Error('Invalid place search response')
    places.value = parsed
  } catch {
    if (!disposed && revision === searchRevision && !searchController.signal.aborted)
      placeError.value = true
  } finally {
    if (revision === searchRevision) placeLoading.value = false
  }
}
async function showDirectoryDetails() {
  if (!localHospital.value) return
  await syncViewportHospitals()
  emit('showDetails', localHospital.value)
}
async function focusMap() {
  await nextTick()
  viewport.value?.scrollIntoView({
    behavior: reduceMotion.value ? 'auto' : 'smooth',
    block: 'center'
  })
  map?.getCanvas().focus({ preventScroll: true })
}
defineExpose({ focusMap })
async function choosePlace(place: HospitalMapPlace, event?: MouseEvent) {
  userInteraction()
  closeDetails()
  selectedPlace.value = place
  easeCamera({
    center: [place.longitude, place.latitude],
    zoom: 16.8,
    pitch: 40,
    padding: { top: 30, bottom: 30, left: compact.value ? 30 : 320, right: 30 },
    duration: duration()
  })
  syncPlaceMarker()
  if (event?.detail === 0) {
    await nextTick()
    placeDetails.value?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }
}
async function handleMapClick(event: MapMouseEvent) {
  if (!map || !ready.value) return
  map.stop()
  userInteraction()
  const revision = fitRevision
  const features = map.queryRenderedFeatures(event.point, {
    layers: HOSPITAL_LAYERS.filter((id) => !!map?.getLayer(id))
  })
  const cluster = features.find((feature) => feature.properties?.cluster_id !== undefined)
  if (cluster) {
    const source = map.getSource(HOSPITAL_SOURCE) as GeoJSONSource
    try {
      const zoom = await source.getClusterExpansionZoom(Number(cluster.properties.cluster_id))
      if (disposed || revision !== fitRevision) return
      const leaves = await source.getClusterLeaves(
        Number(cluster.properties.cluster_id),
        shown.value.length,
        0
      )
      if (disposed || revision !== fitRevision) return
      const ids = new Set(leaves.map((feature) => String(feature.properties?.id)))
      const members = shown.value.filter((hospital) => ids.has(String(hospital.id)))
      const first = members[0]
      if (
        first &&
        members.every((h) => h.latitude === first.latitude && h.longitude === first.longitude)
      )
        sharedHospitals.value = members
      else if (cluster.geometry.type === 'Point')
        easeCamera({
          center: cluster.geometry.coordinates as [number, number],
          zoom: Math.min(19, zoom + 0.2),
          duration: duration()
        })
    } catch {
      /* 圖層剛更新時忽略已失效的群聚。 */
    }
    return
  }
  const points = map.getLayer('gencko-points')
    ? map.queryRenderedFeatures(
        [
          [event.point.x - 8, event.point.y - 8],
          [event.point.x + 8, event.point.y + 8]
        ],
        { layers: ['gencko-points'] }
      )
    : []
  const ids = new Set(
    [...features, ...points]
      .filter(
        (feature) => feature.source === HOSPITAL_SOURCE && feature.properties?.id !== undefined
      )
      .map((feature) => String(feature.properties?.id))
  )
  const hospitals = shown.value.filter((hospital) => ids.has(String(hospital.id)))
  if (hospitals.length > 1) {
    sharedHospitals.value = hospitals
    return
  }
  if (hospitals[0]) {
    void chooseHospital(hospitals[0])
    return
  }
  const feature = map
    .queryRenderedFeatures(event.point, {
      layers: placeLayerIds.filter((id) => !!map?.getLayer(id))
    })
    .find(
      (feature) =>
        !String(feature.source).startsWith('gencko-') &&
        hospitalMapFeaturePlace(feature, [event.lngLat.lng, event.lngLat.lat]) &&
        feature.layer.type === 'symbol'
    )
  const place = feature && hospitalMapFeaturePlace(feature, [event.lngLat.lng, event.lngLat.lat])
  if (place) void choosePlace(place)
}
function addHospitalLayers() {
  if (!map || map.getSource(HOSPITAL_SOURCE)) return
  map.addSource(HOSPITAL_SOURCE, {
    type: 'geojson',
    data: hospitalFeatures(shown.value, props.wishlist, localHospital.value?.id),
    cluster: true,
    clusterMaxZoom: 16,
    clusterRadius: 48
  })
  map.addLayer({
    id: 'gencko-clusters',
    type: 'circle',
    source: HOSPITAL_SOURCE,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': '#b83923',
      'circle-radius': ['step', ['get', 'point_count'], 21, 20, 25],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 3
    }
  })
  map.addLayer({
    id: 'gencko-cluster-count',
    type: 'symbol',
    source: HOSPITAL_SOURCE,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['to-string', ['get', 'point_count_abbreviated']],
      'text-font': ['Noto Sans Bold'],
      'text-size': 14,
      'text-allow-overlap': true
    },
    paint: { 'text-color': '#ffffff' }
  })
  map.addLayer({
    id: 'gencko-points',
    type: 'circle',
    source: HOSPITAL_SOURCE,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': [
        'case',
        ['get', 'selected'],
        '#9a2514',
        ['get', 'saved'],
        '#9d783c',
        '#b83923'
      ],
      'circle-radius': ['case', ['get', 'selected'], 11, 8],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 3
    }
  })
  map.addLayer({
    id: 'gencko-hospital-names',
    type: 'symbol',
    source: HOSPITAL_SOURCE,
    filter: ['!', ['has', 'point_count']],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 13,
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-max-width': 12,
      'text-padding': 6
    },
    paint: { 'text-color': '#35483c', 'text-halo-color': '#ffffff', 'text-halo-width': 2 }
  })
}
function updateMetrics(force = false) {
  if (!map || disposed || (!force && performance.now() - lastMetrics < 200)) return
  lastMetrics = performance.now()
  let buildings = metrics.value.buildings
  try {
    if (force)
      buildings =
        map.getLayer('building-3d') && map.getZoom() >= 14
          ? map.queryRenderedFeatures(undefined, { layers: ['building-3d'] }).length
          : 0
  } catch {
    /* 樣式更新時暫不統計。 */
  }
  const padding = map.getPadding()
  metrics.value = {
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    longitude: map.getCenter().lng,
    latitude: map.getCenter().lat,
    paddingLeft: padding.left,
    paddingRight: padding.right,
    buildings,
    roads: roadLayerCount,
    loaded: map.areTilesLoaded()
  }
  void syncViewportHospitals()
}
function scheduleRecovery() {
  if (recoveryTimer) clearTimeout(recoveryTimer)
  if (!document.hidden && recovering.value)
    recoveryTimer = setTimeout(() => {
      failed.value = true
      ready.value = false
      recovering.value = false
    }, 5000)
}
function visibilityChanged() {
  if (document.hidden) {
    settleNavigation()
    map?.stop()
  } else map?.resize()
  if (recovering.value) scheduleRecovery()
}
async function initialize(event?: MouseEvent) {
  if (event?.detail === 0) restoreMapFocus = true
  const revision = ++initializationRevision
  fitRevision++
  retryCamera = cameraSnapshot() || retryCamera
  if (recoveryTimer) clearTimeout(recoveryTimer)
  recovering.value = false
  resizeObserver?.disconnect()
  styleController?.abort()
  marker?.remove()
  map?.remove()
  map = undefined
  marker = undefined
  ready.value = false
  failed.value = false
  tileError.value = false
  loading.value = true
  const controller = new AbortController()
  styleController = controller
  try {
    const [module, rawStyle] = await Promise.all([
      import('maplibre-gl'),
      $fetch<StyleSpecification>(HOSPITAL_MAP_STYLE, {
        signal: controller.signal,
        timeout: 10000,
        retry: 0
      })
    ])
    if (
      disposed ||
      revision !== initializationRevision ||
      controller.signal.aborted ||
      !viewport.value
    )
      return
    library = module
    module.setWorkerUrl(workerUrl)
    style = hospitalVectorStyle(rawStyle)
    // 地標只查文字圖層，避免把建築與地面圖徵納入點選及游標判斷。
    placeLayerIds = style.layers.filter((layer) => layer.type === 'symbol').map((layer) => layer.id)
    roadLayerCount = style.layers.filter(
      (layer) => layer.type === 'symbol' && /highway-name/.test(layer.id)
    ).length
    map = new module.Map({
      container: viewport.value,
      style,
      center: [120.96, 23.75],
      zoom: 6.2,
      pitch: 35,
      maxPitch: 65,
      minZoom: 5,
      maxZoom: 20,
      renderWorldCopies: false,
      maxTileCacheSize: compact.value ? 72 : 144,
      pixelRatio: Math.min(window.devicePixelRatio || 1, compact.value ? 1.25 : 1.75),
      localIdeographFontFamily: 'sans-serif',
      attributionControl: false,
      canvasContextAttributes: { antialias: !compact.value },
      locale: {
        'NavigationControl.ZoomIn': '放大地圖',
        'NavigationControl.ZoomOut': '縮小地圖',
        'NavigationControl.ResetBearing': '北方朝上',
        'FullscreenControl.Enter': '展開地圖',
        'FullscreenControl.Exit': '離開全螢幕',
        'GeolocateControl.FindMyLocation': '我的位置',
        'GeolocateControl.LocationNotAvailable': '無法取得位置',
        'AttributionControl.ToggleAttribution': '顯示圖資來源',
        'Map.Title': '特寵醫院地圖',
        'Marker.Title': '地圖標記'
      }
    })
    map.addControl(new module.NavigationControl({ visualizePitch: true }), 'top-right')
    map.addControl(
      new module.FullscreenControl({ container: shell.value || viewport.value }),
      'top-right'
    )
    const geolocate = new module.GeolocateControl({
      positionOptions: { enableHighAccuracy: false, timeout: 8000 },
      trackUserLocation: false
    })
    geolocate.on('geolocate', () => {
      // 原生控制先移動相機才回報成功；過期定位只更新位置標記，不蓋掉新操作。
      if (geolocationIntent !== navigationIntent) {
        if (cameraBeforeStaleGeolocation) {
          map?.stop()
          if (navigationTarget) map?.easeTo({ ...navigationTarget, duration: duration() })
          else map?.jumpTo(cameraBeforeStaleGeolocation)
        }
      } else userInteraction()
      cameraBeforeStaleGeolocation = undefined
      locationError.value = ''
    })
    geolocate.on('error', (event) => {
      locationError.value =
        event.code === 1
          ? '尚未允許位置權限，可繼續搜尋地址或拖曳地圖。'
          : '暫時無法取得位置，可繼續搜尋地址或拖曳地圖。'
    })
    map.addControl(geolocate, 'top-right')
    map.addControl(new module.ScaleControl({ unit: 'metric' }), 'bottom-left')
    map.addControl(new module.AttributionControl({ compact: true }))
    map
      .getCanvas()
      .setAttribute(
        'aria-label',
        '特寵醫院立體地圖，拖曳平移、雙指縮放或旋轉，滾輪與雙擊縮放，方向鍵操作'
      )
    map.on('style.load', () => {
      addHospitalLayers()
      failed.value = false
      ready.value = true
      loading.value = false
      if (retryCamera) {
        map?.jumpTo(retryCamera)
        retryCamera = undefined
      } else if (selectedPlace.value) void choosePlace(selectedPlace.value)
      else if (props.focusedHospital) focusHospital(props.focusedHospital)
      else if (props.fitSequence || props.selected !== 'all') fitResults()
      else
        map?.fitBounds(TAIWAN_BOUNDS, {
          absolutePadding: true,
          padding: uniformPadding(compact.value ? 25 : 45),
          pitch: 35,
          duration: 0
        })
      syncPlaceMarker()
      updateMetrics(true)
      void restoreFocusWhenReady()
    })
    map.on('click', handleMapClick)
    map.on('movestart', (event) => {
      viewportRevision++
      if (
        (event as { geolocateSource?: boolean }).geolocateSource &&
        geolocationIntent !== navigationIntent
      )
        cameraBeforeStaleGeolocation = cameraSnapshot()
      if (event.originalEvent) userInteraction()
    })
    map.on('render', () => updateMetrics())
    map.on('idle', () => {
      loading.value = false
      updateMetrics(true)
    })
    map.on('error', () => {
      tileError.value = true
      loading.value = false
      if (!ready.value && !recovering.value) failed.value = true
    })
    map.on('webglcontextlost', () => {
      restoreMapFocus = !!(
        viewport.value?.contains(document.activeElement) ||
        hospitalDetails.value?.contains(document.activeElement) ||
        placeDetails.value?.contains(document.activeElement) ||
        sharedDetails.value?.contains(document.activeElement) ||
        resultsPanel.value?.contains(document.activeElement)
      )
      recovering.value = true
      ready.value = false
      scheduleRecovery()
    })
    map.on('webglcontextrestored', () => {
      if (recoveryTimer) clearTimeout(recoveryTimer)
      recovering.value = false
      failed.value = false
      ready.value = true
      updateHospitals()
      void restoreFocusWhenReady()
    })
    if (!compact.value) map.on('mousemove', pointerHover)
    resizeObserver = new ResizeObserver(() => map?.resize())
    resizeObserver.observe(viewport.value)
  } catch {
    if (!disposed && revision === initializationRevision && !controller.signal.aborted) {
      failed.value = true
      loading.value = false
    }
  }
}
function retryTiles(event?: MouseEvent) {
  if (event?.detail === 0) restoreMapFocus = true
  if (!map || !style) {
    void initialize()
    return
  }
  retryCamera = cameraSnapshot()
  tileError.value = false
  map.setStyle(style, { diff: false })
}
function pointerHover(event: MapMouseEvent) {
  if (!map || compact.value || !ready.value) return
  const features = map.queryRenderedFeatures(event.point, {
    layers: [...HOSPITAL_LAYERS, ...placeLayerIds].filter((id) => !!map?.getLayer(id))
  })
  const interactive = features.some(
    (feature) =>
      feature.source === HOSPITAL_SOURCE ||
      hospitalMapFeaturePlace(feature, [event.lngLat.lng, event.lngLat.lat])
  )
  map.getCanvas().style.cursor = interactive ? 'pointer' : ''
}
watch(failed, async (value) => {
  if (!value || !restoreMapFocus) return
  await nextTick()
  if (!disposed && failed.value && canRestoreFocus())
    retryButton.value?.focus({ preventScroll: true })
  else restoreMapFocus = false
})
watch(
  () => props.searchPerformed,
  (value) => {
    if (value) void syncViewportHospitals()
  }
)
watch(
  () => [shown.value, props.wishlist],
  () => {
    if (localHospital.value)
      localHospital.value =
        shown.value.find((h) => String(h.id) === String(localHospital.value?.id)) || null
    const group = new Map(sharedHospitals.value.map((hospital) => [String(hospital.id), hospital]))
    const currentMembers = shown.value.filter((hospital) => {
      const previous = group.get(String(hospital.id))
      return (
        previous &&
        hospital.latitude === previous.latitude &&
        hospital.longitude === previous.longitude
      )
    })
    sharedHospitals.value = currentMembers.length > 1 ? currentMembers : []
    updateHospitals()
  },
  { deep: true }
)
watch(
  () => [props.focusedHospital, props.focusSequence],
  () => {
    if (props.focusedHospital) focusHospital(props.focusedHospital)
    else if (localHospital.value) closeDetails()
  }
)
watch(
  () => props.fitSequence,
  () => {
    if (ready.value) fitResults()
  }
)
watch(
  () => props.selected,
  () => {
    closeDetails()
    if (ready.value) fitResults()
  }
)
watch(
  () => props.resetSequence,
  async () => {
    session.value = null
    closeDetails()
    if (ready.value) fitResults()
    await nextTick()
    if (!disposed) searchInput.value?.focus({ preventScroll: true })
  }
)
watch(
  () => props.query,
  () => {
    navigationIntent++
    retryCamera = undefined
    searchController?.abort()
    searchRevision++
    closeDetails()
    places.value = []
    placesSearched.value = false
    placeLoading.value = false
    placeError.value = false
  }
)
watch(compact, () => {
  settleNavigation()
  const camera = cameraSnapshot()
  map?.off('mousemove', pointerHover)
  if (map) map.getCanvas().style.cursor = ''
  if (!compact.value) map?.on('mousemove', pointerHover)
  map?.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact.value ? 1.25 : 1.75))
  void nextTick(() => {
    map?.resize()
    if (camera) map?.jumpTo({ ...camera, padding: adaptivePadding() })
  })
})
onMounted(async () => {
  const saved = session.value
  if (
    saved?.signature === sessionSignature.value &&
    (!props.focusedHospital || String(props.focusedHospital.id) === saved.hospitalId)
  ) {
    localHospital.value = shown.value.find((h) => String(h.id) === saved.hospitalId) || null
    selectedPlace.value = saved.selectedPlace
    places.value = saved.places
    placesSearched.value = saved.placesSearched
    if (localHospital.value) emit('selectHospital', localHospital.value)
    await nextTick()
    if (disposed) return
    retryCamera = { ...saved.camera, padding: adaptivePadding() }
  }
  void initialize()
  document.addEventListener('visibilitychange', visibilityChanged)
})
onUnmounted(() => {
  viewportRevision++
  settleNavigation()
  const camera = cameraSnapshot() || retryCamera
  if (camera)
    session.value = {
      signature: sessionSignature.value,
      camera,
      hospitalId: localHospital.value ? String(localHospital.value.id) : null,
      selectedPlace: selectedPlace.value,
      places: places.value,
      placesSearched: placesSearched.value && !placeLoading.value && !placeError.value
    }
  disposed = true
  initializationRevision++
  fitRevision++
  searchRevision++
  styleController?.abort()
  searchController?.abort()
  if (recoveryTimer) clearTimeout(recoveryTimer)
  resizeObserver?.disconnect()
  marker?.remove()
  map?.remove()
  document.removeEventListener('visibilitychange', visibilityChanged)
})
</script>

<template>
  <section
    ref="shell"
    class="hospital-unified-map"
    aria-label="特寵醫院立體地圖"
    @keydown="mapKeydown"
  >
    <aside class="unified-map-sidebar" aria-label="地圖搜尋與篩選" data-lenis-prevent-wheel>
      <form class="unified-map-search" @submit.prevent="searchPlaces()">
        <label for="hospital-unified-search">搜尋院所、路名或地標</label>
        <div>
          <input
            id="hospital-unified-search"
            ref="searchInput"
            v-model="query"
            type="search"
            maxlength="80"
            placeholder="搜尋醫院、地址或台北101"
            aria-label="在地圖搜尋醫院或地標"
          />
          <button
            type="submit"
            :disabled="placeLoading"
            :aria-describedby="!online ? 'hospital-map-offline-note' : undefined"
          >
            {{ placeLoading ? '搜尋中' : '搜尋' }}
          </button>
          <button v-if="query" type="button" @click="clearSearch">清除</button>
        </div>
      </form>
      <slot name="filters" />
      <strong class="unified-visible-count" data-testid="hospital-visible-count">
        {{
          failed
            ? `地圖無法顯示，符合條件 ${listedHospitals.length} 間`
            : hasRegionFilter
              ? `${regionLabel || selected} ${listedHospitals.length} 間院所`
              : !ready
                ? '正在確認畫面內院所…'
                : `畫面內 ${viewportHospitals.length} 間院所`
        }}
      </strong>
      <small v-if="hasRegionFilter && ready && !failed" class="unified-region-visible">
        地圖畫面內 {{ viewportHospitals.length }} 間
      </small>
      <p v-if="!searchPerformed" class="unified-search-prompt">
        輸入關鍵字或選擇條件，再搜尋院所與地標。
      </p>
      <div
        v-if="resultsVisible"
        id="hospital-unified-results"
        ref="resultsPanel"
        class="unified-map-results"
        :aria-busy="!ready && !failed"
        data-lenis-prevent-wheel
      >
        <p v-if="placeError" role="status">地點搜尋暫時無法使用，院所篩選仍可操作。</p>
        <p v-if="placesSearched && !placeLoading && !places.length && !placeError">
          沒有符合的開放地標資料。
        </p>
        <button
          v-for="place in places"
          :key="place.id"
          type="button"
          class="unified-place-result"
          @click="choosePlace(place, $event)"
        >
          <b>{{ place.name }}</b>
          <small>{{ place.address }}</small>
        </button>
        <slot name="results" :hospitals="listedHospitals">
          <button
            v-for="hospital in listedHospitals"
            :key="hospital.id"
            type="button"
            class="unified-hospital-result"
            @click="chooseHospital(hospital, $event)"
          >
            <b>{{ hospital.name }}</b>
            <small>{{ hospital.city }} {{ hospital.district }}</small>
          </button>
        </slot>
      </div>

      <details
        v-if="searchPerformed && !failed && !hasRegionFilter && shown.length > precise.length"
        class="unified-unlocated"
      >
        <summary>{{ shown.length - precise.length }} 間尚未定位，未計入地圖清單</summary>
        <button
          v-for="hospital in shown.filter((h) => !preciseMapHospitals([h]).length)"
          :key="hospital.id"
          type="button"
          @click="chooseHospital(hospital, $event)"
        >
          {{ hospital.name }}
        </button>
      </details>
      <div class="unified-map-guidance">
        <p class="unified-map-hint">
          拖曳平移 · 滾輪或雙指縮放 · 雙指旋轉／調整角度 · 放大到街區查看建築、路名與地標
        </p>
        <p v-if="locationError" class="unified-map-hint" role="status">{{ locationError }}</p>
        <p v-if="!online" id="hospital-map-offline-note" class="unified-map-hint" role="status">
          目前離線，已載入的圖資與院所篩選仍可使用；地標搜尋與新圖資需恢復網路後再試。
        </p>
      </div>
    </aside>
    <div class="unified-map-stage">
      <div
        class="unified-map-body"
        :data-map-ready="ready"
        :data-map-recovering="recovering"
        data-map-engine="vector-3d"
        :data-map-zoom="metrics.zoom"
        :data-map-pitch="metrics.pitch"
        :data-map-longitude="metrics.longitude"
        :data-map-latitude="metrics.latitude"
        :data-map-padding-left="metrics.paddingLeft"
        :data-map-padding-right="metrics.paddingRight"
        :data-map-buildings="metrics.buildings"
        :data-map-road-layers="metrics.roads"
        :data-map-loaded="metrics.loaded"
        :data-visible-hospital-count="viewportHospitals.length"
      >
        <div
          ref="viewport"
          class="unified-map-canvas"
          @click.capture="mapControlClick"
          @pointerdown.capture="manualMapInput"
          @wheel.capture.passive="manualMapInput"
          :inert="!ready || failed"
          :aria-hidden="!ready || failed"
          :aria-busy="!ready && !failed"
          data-lenis-prevent-wheel
        />
        <div v-if="!ready && !failed" class="unified-map-state" role="status">
          {{ recovering ? '正在恢復地圖…' : '正在載入立體地圖…' }}
        </div>
        <div v-if="failed" class="unified-map-state" role="alert">
          <strong>地圖暫時無法載入</strong>
          <span>院所清單仍可使用。</span>
          <button ref="retryButton" type="button" :disabled="!online" @click="initialize">
            重新載入地圖
          </button>
        </div>
        <div v-if="tileError && !failed" class="unified-map-network" role="status">
          部分圖資暫時未載入
          <button type="button" :disabled="!online" @click="retryTiles">重試圖資</button>
        </div>
        <aside
          v-if="sharedHospitals.length"
          ref="sharedDetails"
          class="unified-map-card"
          :inert="!ready || failed"
          :aria-hidden="!ready || failed"
          aria-label="同位置院所"
        >
          <button type="button" aria-label="關閉同位置院所" @click="dismissDetails">關閉</button>
          <strong>此處有多間院所</strong>
          <button
            v-for="hospital in sharedHospitals"
            :key="hospital.id"
            type="button"
            @click="chooseHospital(hospital, $event)"
          >
            {{ hospital.name }}
          </button>
        </aside>
        <aside
          v-else-if="localHospital"
          ref="hospitalDetails"
          class="unified-map-card"
          :inert="!ready || failed"
          :aria-hidden="!ready || failed"
          aria-label="院所資訊"
        >
          <button type="button" aria-label="關閉院所資訊" @click="dismissDetails">×</button>
          <strong>{{ localHospital.name }}</strong>
          <span>{{ localHospital.address }}</span>
          <span>
            {{ selectedPhone.number || '尚未提供電話'
            }}{{ selectedPhone.extension ? ` 分機 ${selectedPhone.extension}` : '' }}
          </span>
          <p v-if="!preciseMapHospitals([localHospital]).length">
            此院所尚無定位座標，可搜尋地址確認位置。
          </p>
          <div class="unified-card-actions">
            <a v-if="selectedPhone.href" :href="selectedPhone.href">撥打電話</a>
            <button
              type="button"
              :aria-pressed="wishlist.map(String).includes(String(localHospital.id))"
              @click="emit('toggleFavorite', localHospital.id)"
            >
              {{
                wishlist.map(String).includes(String(localHospital.id)) ? '取消收藏' : '收藏院所'
              }}
            </button>
            <button type="button" @click="showDirectoryDetails">院所資料</button>
            <button
              v-if="preciseMapHospitals([localHospital]).length"
              type="button"
              @click="focusHospital(localHospital)"
            >
              重新定位
            </button>
            <button v-else type="button" @click="searchHospitalAddress">搜尋此地址</button>
            <a
              :href="`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((localHospital.name || '') + ' ' + (localHospital.address || ''))}`"
              target="_blank"
              rel="noopener noreferrer"
            >
              導航 ↗
            </a>
          </div>
        </aside>
        <aside
          v-else-if="selectedPlace"
          ref="placeDetails"
          class="unified-map-card"
          :inert="!ready || failed"
          :aria-hidden="!ready || failed"
          aria-label="地點資訊"
        >
          <button type="button" aria-label="關閉地點資訊" @click="dismissDetails">×</button>
          <strong>{{ selectedPlace.name }}</strong>
          <span>{{ selectedPlace.address }}</span>
          <div class="unified-card-actions">
            <button type="button" @click="choosePlace(selectedPlace)">重新定位</button>
            <a
              :href="`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.latitude},${selectedPlace.longitude}`"
              target="_blank"
              rel="noopener noreferrer"
            >
              導航 ↗
            </a>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hospital-unified-map {
  min-width: 0;
  color: var(--txt);
}
.hospital-unified-map:fullscreen {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: var(--card-bg-solid, #fff);
}
.hospital-unified-map:fullscreen .unified-map-body {
  flex: 1;
  min-height: 0;
  height: auto;
  padding-top: 0;
}
.hospital-unified-map:fullscreen .unified-map-body .unified-map-canvas {
  height: 100%;
  bottom: 0;
}
.hospital-unified-map:fullscreen .unified-map-results,
.hospital-unified-map:fullscreen .unified-map-card {
  position: absolute;
  left: 10px;
  top: 10px;
  max-height: calc(100% - 80px);
  width: min(270px, calc(100% - 80px));
}
.unified-map-search {
  display: grid;
  gap: 5px;
  padding-block: 10px;
}
.unified-map-search > label {
  font-size: 13px;
  font-weight: 700;
}
.unified-map-search > div {
  display: flex;
  gap: 6px;
}
.unified-map-search input {
  flex: 1;
  min-width: 0;
  width: 100%;
  font-size: 16px;
  padding: 9px 12px;
  min-height: 44px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  color: var(--txt);
}
button,
.unified-card-actions a {
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  color: var(--txt);
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button:focus-visible,
input:focus-visible,
a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
.unified-map-body {
  position: relative;
  min-width: 0;
  height: 580px;
  border: 1px solid var(--bd);
  background: #edf1ec;
}
.unified-map-canvas {
  position: absolute;
  inset: 0;
}
.unified-map-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f6f7f3e8;
  z-index: 4;
}
.unified-map-network {
  position: absolute;
  bottom: 38px;
  left: 10px;
  padding: 6px 10px;
  background: #fff;
  color: #344b40;
  z-index: 2;
  font-size: 12px;
}
.unified-map-results,
.unified-map-card {
  position: absolute;
  left: 12px;
  top: 12px;
  width: 270px;
  max-height: calc(100% - 90px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 14px;
  background: #fffffff5;
  border: 1px solid #d7ddd4;
  color: #344b40;
  border-radius: 6px;
  display: grid;
  gap: 8px;
  z-index: 2;
  font-size: 14px;
}
.unified-map-results > button {
  display: grid;
  gap: 4px;
  text-align: left;
  border: 0;
  border-bottom: 1px solid #e5e9e1;
  background: transparent;
  color: inherit;
}
.unified-map-results small {
  color: #647262;
}
.unified-map-card > button:first-child {
  justify-self: end;
  min-width: 44px;
}
.unified-map-card strong {
  font-size: 17px;
}
.unified-card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.unified-card-actions > * {
  flex: 1 1 90px;
  text-align: center;
  font-size: 13px;
}
.unified-map-hint {
  margin: 8px 0;
  color: var(--txt-muted);
  font-size: 12px;
}
:deep(.maplibregl-ctrl-group button) {
  width: 44px;
  height: 44px;
}
@media (max-width: 767px), (pointer: coarse) {
  .hospital-unified-map {
    --hospital-map-height: clamp(240px, 68svh, 540px);
  }
  .unified-map-body {
    height: var(--hospital-map-height);
    min-height: 0;
  }
  .unified-map-results,
  .unified-map-card {
    position: relative;
    left: auto;
    top: auto;
    width: auto;
    max-height: 300px;
    margin: 0;
    border-radius: 0;
  }
  .unified-map-body:has(.unified-map-results),
  .unified-map-body:has(.unified-map-card) {
    height: auto;
    padding-top: calc(var(--hospital-map-height) - 2px);
  }
  .unified-map-body:has(.unified-map-results) .unified-map-canvas,
  .unified-map-body:has(.unified-map-card) .unified-map-canvas {
    height: calc(var(--hospital-map-height) - 2px);
    bottom: auto;
  }
}
</style>

<style scoped>
/* 搜尋側欄與地圖保持同一個工作區，避免重複的頁首搜尋與頁底清單。 */
.hospital-unified-map {
  display: grid;
  grid-template-columns: minmax(290px, 340px) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.unified-map-sidebar {
  min-width: 0;
  max-height: 780px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid var(--bd);
  background: var(--card-bg-solid);
  padding: 14px;
}
.unified-map-stage {
  min-width: 0;
}
.unified-map-search {
  padding-top: 0;
}
.unified-map-search > div {
  flex-wrap: wrap;
}
.unified-map-search input {
  flex-basis: 100%;
}
.unified-map-search button {
  flex: 1;
}
.unified-search-prompt {
  padding: 12px 0 0;
  border-top: 1px solid var(--bd);
  color: var(--txt-muted);
  font-size: 13px;
  line-height: 1.6;
}
.unified-visible-count {
  display: block;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--bd);
  font-size: 14px;
}
.unified-region-visible {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--txt-muted);
}
.unified-map-guidance {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid var(--bd);
}
@media (min-width: 768px) and (hover: hover) and (pointer: fine) {
  /* 左右使用同一個高度；清單在欄內捲動，不再推高整列。 */
  .hospital-unified-map {
    height: 700px;
    align-items: stretch;
  }
  .unified-map-sidebar {
    height: 100%;
    min-height: 0;
    max-height: none;
  }
  .unified-map-stage {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }
  .unified-map-stage .unified-map-body {
    flex: 1;
    height: auto;
    min-height: 0;
  }
  .hospital-unified-map:fullscreen {
    height: 100%;
  }
}
.unified-map-sidebar .unified-map-results {
  position: static;
  width: auto;
  max-height: none;
  padding: 12px 0 0;
  margin-top: 12px;
  border: 0;
  border-top: 1px solid var(--bd);
  border-radius: 0;
  background: transparent;
  color: var(--txt);
  overflow: visible;
}
.unified-unlocated {
  margin-top: 14px;
  font-size: 13px;
  color: var(--txt-muted);
}
.unified-unlocated summary {
  cursor: pointer;
  padding: 10px 0;
}
.unified-unlocated button {
  display: block;
  width: 100%;
  margin-top: 4px;
  text-align: left;
}
.unified-map-body {
  height: 700px;
  background: #e9e5df;
}
.hospital-unified-map:fullscreen {
  display: grid;
  grid-template-columns: minmax(290px, 340px) minmax(0, 1fr);
  align-items: stretch;
}
.hospital-unified-map:fullscreen .unified-map-sidebar {
  max-height: calc(100dvh - 24px);
}
.hospital-unified-map:fullscreen .unified-map-stage {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
@media (max-width: 767px), (pointer: coarse) {
  .hospital-unified-map,
  .hospital-unified-map:fullscreen {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .unified-map-sidebar {
    max-height: 50svh;
    padding: 10px;
  }
  .unified-map-search > div {
    flex-wrap: nowrap;
  }
  .unified-map-search input {
    flex: 1 1 0;
    width: 0;
  }
  .unified-map-search button {
    flex: 0 0 auto;
    padding-inline: 10px;
  }
  .unified-map-body {
    height: var(--hospital-map-height);
  }
  .hospital-unified-map:fullscreen {
    display: flex;
  }
  .hospital-unified-map:fullscreen .unified-map-sidebar {
    max-height: 38dvh;
    flex: 0 0 auto;
  }
  .hospital-unified-map:fullscreen .unified-map-stage {
    flex: 1;
    min-height: 0;
  }
}
</style>
