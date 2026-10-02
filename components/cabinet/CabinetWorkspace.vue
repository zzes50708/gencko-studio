<script setup lang="ts">
import {
  computed,
  defineComponent,
  markRaw,
  nextTick,
  onBeforeUnmount,
  onErrorCaptured,
  onMounted,
  reactive,
  ref,
  shallowRef,
  watch
} from 'vue'
import { useEventListener, useMediaQuery } from '@vueuse/core'
import { TresCanvas, useLoop, useTres } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import {
  ACESFilmicToneMapping,
  PCFShadowMap,
  PMREMGenerator,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer
} from 'three'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { PerspectiveCamera } from 'three'
import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import {
  BOARD_THICKNESS,
  BOXES,
  FINISHES,
  HARDWARE,
  calculateCabinet,
  maxCabinetColumns,
  normalizeCabinet
} from '~/utils/cabinet/config'
import type {
  BoxVariant,
  CabinetConfiguration,
  CabinetInput,
  CabinetTemplate,
  CountKey,
  LedColor,
  Lighting
} from '~/utils/cabinet/config'
import { cabinetTextExport } from '~/utils/cabinet/export'
import { createCabinetModel } from '~/utils/cabinet/model'
import type { CabinetModel } from '~/utils/cabinet/model'
import CabinetSelect from './CabinetSelect.vue'
import {
  CABINET_MATERIAL_ASSETS,
  loadCabinetWoodTextures,
  disposeCabinetWoodTextures
} from '~/utils/cabinet/materials'
import type { CabinetWoodTextures } from '~/utils/cabinet/materials'

// 桌面場景內的滾輪只交給模型控制，選項欄自行處理原生捲動。
function isolateStageWheel(event: WheelEvent) {
  if (touchMode.value) return
  event.preventDefault()
  event.stopPropagation()
}

const props = withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: 'a4' })
const emit = defineEmits<{
  'update:modelValue': [value: CabinetTemplate]
  change: [value: CabinetConfiguration]
}>()
const defaultBox = (value: string): BoxVariant =>
  value === 'a6'
    ? 'a6'
    : value === 'tub'
      ? 'a4'
      : value === 'acrylic'
        ? 'acrylic-m'
        : value === 'custom'
          ? 'a3'
          : 'a4'
const customerBoxes = Object.fromEntries(
  Object.entries(BOXES).filter(([key]) => !key.startsWith('tub-'))
)
const input = reactive<CabinetInput>({
  template: BOXES[defaultBox(props.modelValue)].template,
  boxVariant: defaultBox(props.modelValue),
  rows: 4,
  columns: 2,
  finish: 'white',
  boxColor: 'clear',
  counts: { thermometer: 0, switch: 0, metalSwitch: 0, extraThermostat: 0 },
  ledLayers: 0,
  ledColor: 'warm',
  heatingMat: 'calorique',
  ledEnabled: true,
  ledRowEnabled: Array(8).fill(true),
  storageHeight: 0,
  storageStyle: 'drawer',
  wheels: false,
  lighting: 'center',
  lightLevel: 70,
  clearances: { horizontal: 0.6, vertical: 0.7, depth: 1, controlHeight: 8 }
})
const layout = computed(() => calculateCabinet(input))
const configuration = computed(() => layout.value.configuration)
const finishColor = computed(
  () => FINISHES.find((item) => item.id === configuration.value.finishId)!.color
)
const counts = HARDWARE.slice().sort(
  (a, b) =>
    ['thermometer', 'switch', 'metalSwitch', 'extraThermostat'].indexOf(a.id) -
    ['thermometer', 'switch', 'metalSwitch', 'extraThermostat'].indexOf(b.id)
)
const ledChoices: { id: LedColor; label: string; color: string }[] = [
  { id: 'warm', label: '暖白', color: '#ffe0a0' },
  { id: 'neutral', label: '自然', color: '#fff2d8' },
  { id: 'cool', label: '冷白', color: '#d9ebff' }
]
const lightChoices: { id: Lighting; label: string }[] = [
  { id: 'left', label: '左側' },
  { id: 'center', label: '中間' },
  { id: 'right', label: '右側' }
]
const cleanInput = () => Object.assign(input, normalizeCabinet(input))
const chooseBox = (value: string) => {
  input.boxVariant = Object.hasOwn(customerBoxes, value) ? (value as BoxVariant) : 'a4'
  input.template = BOXES[input.boxVariant].template
  if (!['a4', 'a6'].includes(input.boxVariant)) input.boxColor = 'clear'
  cleanInput()
}
const numberFrom = (event: Event) => (event.target as HTMLInputElement).value
const draftNumber = (key: 'rows' | 'columns' | 'storageHeight', event: Event) => {
  const value = numberFrom(event)
  input[key] = value === '' ? NaN : Number(value)
}
const updateNumber = (key: 'rows' | 'columns' | 'ledLayers' | 'storageHeight', event: Event) => {
  const value = numberFrom(event)
  input[key] = value === '' ? NaN : Number(value)
  cleanInput()
  ;(event.target as HTMLInputElement).value = String(input[key])
}
const updateCount = (key: CountKey, event: Event) => {
  input.counts[key] = Number(numberFrom(event))
  cleanInput()
}
const maxCount = (key: CountKey) =>
  key === 'metalSwitch'
    ? configuration.value.ledLayers
    : key === 'extraThermostat'
      ? 1
      : configuration.value.rows
const updateLightLevel = (event: Event) => {
  input.lightLevel = Number(numberFrom(event))
  cleanInput()
}
watch(
  () => props.modelValue,
  (value) => {
    if (value !== configuration.value.template) chooseBox(defaultBox(value))
  }
)
watch(
  configuration,
  (value) => {
    emit('update:modelValue', value.template)
    emit('change', value)
  },
  { immediate: true, deep: true }
)

const host = ref<HTMLElement | null>(null),
  stage = ref<HTMLElement | null>(null)
const touchMode = useMediaQuery('(max-width: 767px), (pointer: coarse), (hover: none)')
const sheetHeight = ref(45)
let sheetDrag: { y: number; height: number } | null = null
function beginSheetDrag(event: PointerEvent) {
  sheetDrag = { y: event.clientY, height: sheetHeight.value }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function moveSheetDrag(event: PointerEvent) {
  if (!sheetDrag || !stage.value) return
  sheetHeight.value = Math.max(
    20,
    Math.min(
      80,
      sheetDrag.height + ((sheetDrag.y - event.clientY) / stage.value.clientHeight) * 100
    )
  )
}
function endSheetDrag() {
  if (!sheetDrag) return
  sheetHeight.value = [20, 45, 80].reduce((a, b) =>
    Math.abs(a - sheetHeight.value) < Math.abs(b - sheetHeight.value) ? a : b
  )
  sheetDrag = null
}
const modelUpdating = ref(false)
let modelPointerStart: [number, number] | null = null
let modelPointerDragged = false
function startModelPointer(event: PointerEvent) {
  modelPointerStart = [event.clientX, event.clientY]
  modelPointerDragged = false
}
function trackModelPointer(event: PointerEvent) {
  if (
    modelPointerStart &&
    Math.hypot(event.clientX - modelPointerStart[0], event.clientY - modelPointerStart[1]) > 8
  )
    modelPointerDragged = true
}
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const mounted = ref(false),
  ready = ref(false),
  failed = ref(false),
  expanded = ref(false),
  panelOpen = ref(true),
  dimensionsVisible = ref(true)
const render3d = computed(() => mounted.value && !failed.value)
onMounted(() => {
  mounted.value = true
  if (touchMode.value) {
    panelOpen.value = true
    lightPanelOpen.value = false
  }
})
onErrorCaptured((error) => {
  console.warn('[cabinet] 3D 模型無法顯示', error)
  failed.value = true
  return false
})
const model = shallowRef<CabinetModel | null>(null)
const woodTextures = shallowRef<CabinetWoodTextures | null>(null)
const stoneTextures = shallowRef<CabinetWoodTextures | null>(null)
let disposed = false,
  texturesRequested = false
watch(render3d, async (enabled) => {
  if (!enabled || texturesRequested) return
  texturesRequested = true
  const [textures, stone] = await Promise.all([
    loadCabinetWoodTextures(),
    loadCabinetWoodTextures('stone')
  ])
  if (disposed) {
    disposeCabinetWoodTextures(textures)
    disposeCabinetWoodTextures(stone)
  } else {
    if (textures) woodTextures.value = markRaw(textures)
    if (stone) stoneTextures.value = markRaw(stone)
  }
})
const modelKey = computed(() => {
  const {
    lighting: _lighting,
    lightLevel: _lightLevel,
    ledEnabled: _ledEnabled,
    ledRowEnabled: _ledRows,
    ledColor: _ledColor,
    ledLayers: _ledLayers,
    capabilities: _capabilities,
    counts: modelCounts,
    ...modelConfiguration
  } = configuration.value
  const { metalSwitch: _metalSwitch, ...counts } = modelCounts
  return JSON.stringify({ ...modelConfiguration, counts })
})
const rebuildModel = async () => {
  if (!render3d.value) return
  const serial = ++buildSerial
  modelUpdating.value = true
  // 先繪製更新提示，再進行同步幾何生成，讓等待狀態能確實出現在畫面。
  await nextTick()
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  )
  if (disposed || serial !== buildSerial || !render3d.value) return
  const previous = model.value
  try {
    model.value = markRaw(
      createCabinetModel(
        layout.value,
        configuration.value.finishId === 'stone' ? stoneTextures.value : woodTextures.value
      )
    )
    model.value.measurements.visible = touchMode.value || dimensionsVisible.value
    if (touchMode.value)
      model.value.measurements.children.forEach((object) => {
        if (object.type === 'Sprite') object.scale.multiplyScalar(1.15)
      })
  } catch (error) {
    console.warn('[cabinet] 模型建立失敗', error)
    failed.value = true
  }
  await nextTick()
  previous?.dispose()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  if (serial === buildSerial) modelUpdating.value = false
}
let buildSerial = 0
let buildTimer: ReturnType<typeof setTimeout> | null = null
function queueModelUpdate() {
  if (!render3d.value) return
  if (buildTimer) clearTimeout(buildTimer)
  ++buildSerial
  modelUpdating.value = true
  buildTimer = setTimeout(
    () => {
      buildTimer = null
      void rebuildModel()
    },
    touchMode.value ? 280 : 120
  )
}
// 更新中仍接受操作；連續修改合併，舊批次由序號取消。
watch(modelKey, queueModelUpdate)
watch([woodTextures, stoneTextures], queueModelUpdate)
watch(render3d, async () => {
  ready.value = false
  if (render3d.value) queueModelUpdate()
  else {
    ++buildSerial
    if (buildTimer) clearTimeout(buildTimer)
    modelUpdating.value = false
    if (touchMode.value) {
      const previous = model.value
      model.value = null
      await nextTick()
      previous?.dispose()
    }
  }
})
const controls = ref<{ instance: ThreeOrbitControls } | null>(null)
const lightPanelOpen = ref(true)
const toggleLedRow = (row: number) => {
  input.ledRowEnabled![row] = !input.ledRowEnabled![row]
}
const clickModel = (event: {
  object?: { userData?: { ledRow?: number; drawerId?: number; storagePart?: number } }
  stopPropagation?: () => void
}) => {
  if (modelPointerDragged) return
  const storage = event.object?.userData?.storagePart
  if (typeof storage === 'number') {
    event.stopPropagation?.()
    model.value?.toggleStorage(storage)
    run('drawer')
    return
  }
  const drawer = event.object?.userData?.drawerId
  if (typeof drawer === 'number') {
    event.stopPropagation?.()
    model.value?.toggleDrawer(drawer)
    run('drawer')
    return
  }
  const row = event.object?.userData?.ledRow
  if (typeof row !== 'number') return
  event.stopPropagation?.()
  toggleLedRow(row)
}
const command = ref({ serial: 0, type: 'front', value: 0 }),
  view = ref('front')
const run = (type: string, value = 0) => {
  command.value = { serial: command.value.serial + 1, type, value }
}
const setView = (value: string) => {
  view.value = value
  run(value)
}
const reset = () => setView('front')
const keydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && expanded.value) {
    expanded.value = false
    return
  }
  if (event.target !== event.currentTarget) return
  if (event.key === 'Home') {
    event.preventDefault()
    reset()
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault()
    run('rotate', event.key === 'ArrowLeft' ? -0.2 : 0.2)
  }
  if (event.key === '+' || event.key === '=') {
    event.preventDefault()
    run('zoom', 0.88)
  }
  if (event.key === '-') {
    event.preventDefault()
    run('zoom', 1.14)
  }
}
let oldOverflow: string | null = null
watch(expanded, async (value) => {
  if (value) {
    oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else if (oldOverflow !== null) {
    document.body.style.overflow = oldOverflow
    oldOverflow = null
  }
  await nextTick()
  stage.value?.focus({ preventScroll: true })
  run(view.value)
})
watch(touchMode, (value) => {
  if (value) expanded.value = false
})
onBeforeUnmount(() => {
  disposed = true
  ++buildSerial
  if (buildTimer) clearTimeout(buildTimer)
  model.value?.dispose()
  disposeCabinetWoodTextures(woodTextures.value)
  disposeCabinetWoodTextures(stoneTextures.value)
  if (oldOverflow !== null) document.body.style.overflow = oldOverflow
})
useEventListener('keydown', (event: KeyboardEvent) => {
  if (event.key === 'Escape') expanded.value = false
})
const lightPosition = computed<[number, number, number]>(() =>
  input.lighting === 'left' ? [-3, 10, 2] : input.lighting === 'right' ? [3, 10, 2] : [0, 10, 2]
)
const lightRatio = computed(() => input.lightLevel / 100)
const sceneBackdrop = computed(() => {
  // 背景與全場照明同步，LED 另由自己的開關控制。
  const brightness = Math.sqrt(lightRatio.value)
  const center = Math.round(18 + 229 * brightness)
  const edge = Math.round(12 + 217 * brightness)
  return `radial-gradient(ellipse at 52% 42%, rgb(${center},${center},${center}) 0%, rgb(${edge},${edge},${edge}) 100%)`
})
const Controller = defineComponent({
  setup() {
    const { camera, renderer, scene, invalidate, sizes } = useTres()
    const { onBeforeRender } = useLoop()
    const destination = new Vector3(),
      target = new Vector3(),
      offset = new Vector3(),
      up = new Vector3(0, 1, 0)
    let moving = false,
      environment: ReturnType<PMREMGenerator['fromScene']> | null = null
    let controllerDisposed = false
    const frame = (type = view.value) => {
      if (type === 'drawer') {
        invalidate()
        return
      }
      if (!camera.value || !model.value) return
      if (type === 'front') {
        const control = controls.value?.instance
        if (control) {
          const damping = control.enableDamping
          control.enableDamping = false
          control.update()
          control.enableDamping = damping
        }
      }
      target.fromArray(model.value.target)
      if (type === 'zoom')
        destination
          .copy(camera.value.position)
          .sub(target)
          .multiplyScalar(command.value.value)
          .clampLength(5.5, 25)
          .add(target)
      else if (type === 'rotate')
        destination
          .copy(
            offset.copy(camera.value.position).sub(target).applyAxisAngle(up, command.value.value)
          )
          .add(target)
      else if (type === 'perspective') destination.set(6.9, target.y + 4.3, 8.5)
      // 正面目標需落在 OrbitControls 的極角限制內，避免動畫與限制持續互相拉扯。
      else destination.set(0, target.y + 0.3, 11.3)
      controls.value?.instance?.target.copy(target)
      if (reducedMotion.value) {
        camera.value.position.copy(destination)
        controls.value?.instance?.update()
      } else moving = true
      invalidate()
    }
    const resize = () => {
      if (!camera.value) return
      const cam = camera.value as PerspectiveCamera,
        w = sizes.width.value,
        h = sizes.height.value
      if (w > 0 && h > 0) {
        // 依獨立渲染區的比例保留足夠視距，避免窄視窗裁切。
        cam.clearViewOffset()
        // 側欄覆蓋的寬度也納入置中：櫃體位於整個場景中央，而非右側畫布中央。
        const panelWidth = panelOpen.value && !touchMode.value ? 318 : 0
        if (panelWidth) cam.setViewOffset(w, h, panelWidth / 2, 0, w, h)
        const distance = camera.value.position.distanceTo(target)
        const fitDistance = Math.max(9, 3.4 / Math.tan((cam.fov * Math.PI) / 360) / (w / h))
        if (distance < fitDistance)
          camera.value.position.sub(target).setLength(fitDistance).add(target)
        cam.updateProjectionMatrix()
        invalidate()
      }
    }
    const stopMovement = () => {
      moving = false
    }
    onMounted(() => {
      camera.value?.layers.enableAll()
      controls.value?.instance?.addEventListener('start', stopMovement)
      if (renderer instanceof WebGLRenderer) {
        renderer.transmissionResolutionScale = touchMode.value ? 0.75 : 1
        renderer.shadowMap.type = PCFShadowMap
        renderer.outputColorSpace = SRGBColorSpace
        renderer.toneMapping = ACESFilmicToneMapping
        renderer.toneMappingExposure = 1
        renderer.setClearAlpha(0)
        const pmrem = new PMREMGenerator(renderer),
          room = new RoomEnvironment()
        environment = pmrem.fromScene(room, 0.02)
        scene.value.environment = environment.texture
        room.dispose()
        pmrem.dispose()
        new HDRLoader().load(
          CABINET_MATERIAL_ASSETS.environment,
          (hdr) => {
            if (controllerDisposed) {
              hdr.dispose()
              return
            }
            const generator = new PMREMGenerator(renderer)
            const nextEnvironment = generator.fromEquirectangular(hdr)
            hdr.dispose()
            generator.dispose()
            scene.value.environment = nextEnvironment.texture
            environment?.dispose()
            environment = nextEnvironment
            invalidate()
          },
          undefined,
          () => {
            /* HDR 載入失敗時保留室內環境光。 */
          }
        )
      }
      scene.value.environmentIntensity = lightRatio.value * 0.9
      frame('front')
      resize()
    })
    watch(command, () => frame(command.value.type))
    watch(model, () => {
      // 換材質、設備或尺寸時保留使用者視角，只平移觀察中心。
      if (camera.value && model.value) {
        const nextTarget = new Vector3(...model.value.target)
        const delta = nextTarget.clone().sub(target)
        camera.value.position.add(delta)
        destination.add(delta)
        target.copy(nextTarget)
        controls.value?.instance?.target.copy(target)
        controls.value?.instance?.update()
      }
      invalidate()
    })
    watch(
      [
        () => input.ledEnabled,
        () => input.ledColor,
        () => input.ledLayers,
        () => input.ledRowEnabled?.join(',')
      ],
      () => {
        model.value?.updateLed(
          input.ledEnabled !== false,
          input.ledRowEnabled || [],
          input.ledColor,
          configuration.value.ledLayers
        )
        invalidate()
      }
    )
    watch([() => sizes.width.value, () => sizes.height.value, panelOpen], resize)
    watch([() => input.lighting, () => input.lightLevel], () => {
      scene.value.environmentIntensity = lightRatio.value * 0.9
      invalidate()
    })
    watch(dimensionsVisible, (value) => {
      if (model.value) model.value.measurements.visible = value
      invalidate()
    })
    onBeforeRender(({ delta }) => {
      if (model.value?.animateDrawers(delta)) invalidate()
      const control = controls.value?.instance
      if (!moving || !camera.value) return
      camera.value.position.lerp(destination, 1 - Math.exp(-13 * Math.min(delta, 0.05)))
      control?.update()
      if (camera.value.position.distanceToSquared(destination) < 0.00005) moving = false
      else invalidate()
    })
    onBeforeUnmount(() => {
      controllerDisposed = true
      controls.value?.instance?.removeEventListener('start', stopMovement)
      scene.value.environment = null
      environment?.dispose()
    })
    return () => null
  }
})
const downloadStatus = ref('')
watch(configuration, () => {
  downloadStatus.value = ''
})
async function copyExport() {
  try {
    await navigator.clipboard.writeText(cabinetTextExport(configuration.value).text)
    downloadStatus.value = '已複製清單'
  } catch {
    downloadStatus.value = '瀏覽器未允許複製，請改用匯出清單'
  }
}
let statusTimer: ReturnType<typeof setTimeout> | undefined
const download = () => {
  const { text, filename } = cabinetTextExport(configuration.value)
  const url = URL.createObjectURL(
    new Blob([text], {
      type: 'text/plain;charset=utf-8'
    })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.hidden = true
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  downloadStatus.value = '已建立文字清單，若未下載可複製配置內容'
  if (statusTimer) clearTimeout(statusTimer)
  statusTimer = setTimeout(() => {
    downloadStatus.value = ''
  }, 2500)
}
onBeforeUnmount(() => {
  if (statusTimer) clearTimeout(statusTimer)
})
defineExpose({ reset, configuration, download })
</script>

<template>
  <div
    ref="host"
    class="cabinet-workspace"
    :class="{ 'is-expanded': expanded, 'mobile-3d-active': touchMode }"
    :aria-busy="modelUpdating"
  >
    <div class="workspace-toolbar">
      <div>
        <span>GENCKO / CONFIGURATOR</span>
        <strong>木製爬櫃配置</strong>
      </div>
      <div class="toolbar-actions">
        <button
          v-if="!touchMode"
          type="button"
          :aria-expanded="panelOpen"
          aria-controls="cabinet-options"
          @click="panelOpen = !panelOpen"
        >
          {{ panelOpen ? '收起選項' : '配置選項' }}
        </button>
        <button v-if="!touchMode" type="button" @click="expanded = !expanded">
          {{ expanded ? '退出滿版' : '展開工作區' }}
        </button>
        <button type="button" @click="copyExport">複製清單</button>
        <button type="button" @click="download()">匯出清單</button>
      </div>
    </div>
    <div
      ref="stage"
      class="workspace-stage"
      :style="{ background: sceneBackdrop, '--sheet-height': sheetHeight + '%' }"
      tabindex="0"
      :aria-label="touchMode ? '爬櫃配置示意' : '爬櫃3D場景，方向鍵旋轉、加減縮放、Home回正面'"
      :data-lenis-prevent-wheel="!touchMode ? '' : undefined"
      @wheel="isolateStageWheel"
      @keydown="keydown"
      @webglcontextlost.capture.prevent="failed = true"
      @pointerdown.capture="startModelPointer"
      @pointermove.capture="trackModelPointer"
    >
      <div
        v-if="render3d && model"
        class="workspace-render"
        :class="{ 'has-panel': panelOpen && !touchMode }"
      >
        <TresCanvas
          class="workspace-canvas"
          :alpha="true"
          :antialias="true"
          :dpr="touchMode ? 1 : [1, 1.5]"
          :shadows="true"
          :tone-mapping="ACESFilmicToneMapping"
          render-mode="on-demand"
          @ready="ready = true"
          @error="failed = true"
        >
          <TresPerspectiveCamera :position="[0, 2, 11.3]" :fov="38" :near="0.1" :far="100" />
          <OrbitControls
            ref="controls"
            :target="model.target"
            :enable-pan="true"
            :zoom-to-cursor="!touchMode"
            :enable-damping="!reducedMotion && !touchMode"
            :damping-factor="0.16"
            :min-distance="5.5"
            :max-distance="25"
            :max-polar-angle="1.55"
            :rotate-speed="0.65"
          />
          <TresAmbientLight :intensity="lightRatio * 1.15" />
          <TresDirectionalLight
            :position="lightPosition"
            :intensity="lightRatio * 2.2"
            :cast-shadow="true"
            :shadow-mapSize-width="touchMode ? 512 : 1024"
            :shadow-mapSize-height="touchMode ? 512 : 1024"
            :shadow-camera-left="-6"
            :shadow-camera-right="6"
            :shadow-camera-top="7"
            :shadow-camera-bottom="-4"
            :shadow-bias="-0.0003"
            :shadow-radius="4"
          />
          <TresDirectionalLight :position="[-6, 4, 6]" :intensity="lightRatio * 1.1" />
          <TresDirectionalLight :position="[4, 6, -4]" :intensity="lightRatio * 1.4" />
          <primitive :object="model.root" :dispose="null" @click="clickModel" />
          <Controller />
        </TresCanvas>
      </div>
      <div
        v-if="!render3d || !model || (!ready && !touchMode)"
        class="workspace-fallback"
        :class="{ 'with-panel': panelOpen && !touchMode }"
      >
        <div
          v-if="!touchMode"
          class="flat-cabinet"
          :style="{
            borderColor: finishColor,
            background: finishColor,
            gridTemplateColumns: `repeat(${configuration.columns}, 1fr)`,
            gridTemplateRows: `repeat(${configuration.rows}, 1fr)`
          }"
        >
          <span
            v-for="n in configuration.rows * configuration.columns"
            :key="n"
            :class="{ smoke: configuration.boxColor === 'smoke' }"
          ></span>
        </div>
        <p>
          {{
            failed
              ? '3D 暫時無法顯示，仍可調整與匯出配置'
              : touchMode
                ? '正在準備互動模型'
                : '正在準備互動模型'
          }}
        </p>
      </div>
      <div v-if="modelUpdating" class="workspace-updating" role="status" aria-live="polite">
        <span class="workspace-spinner" aria-hidden="true" />
        <span>正在更新模型</span>
      </div>
      <aside
        v-show="touchMode || panelOpen"
        id="cabinet-options"
        class="workspace-options"
        aria-label="爬櫃配置選項"
        data-lenis-prevent
        @wheel.stop
      >
        <button
          v-if="touchMode"
          class="sheet-handle"
          type="button"
          aria-label="上下拖曳調整選項面板高度"
          @pointerdown.stop="beginSheetDrag"
          @pointermove.stop="moveSheetDrag"
          @pointerup.stop="endSheetDrag"
          @pointercancel="endSheetDrag"
          @keydown.up.prevent="sheetHeight = Math.min(80, sheetHeight + 10)"
          @keydown.down.prevent="sheetHeight = Math.max(20, sheetHeight - 10)"
        >
          <span />
        </button>
        <fieldset>
          <legend>01 / 盒款與排列</legend>
          <label>
            盒款
            <CabinetSelect
              aria-label="盒款"
              :value="input.boxVariant"
              @change="chooseBox(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="(box, key) in customerBoxes" :key="key" :value="key">
                {{ box.label }}
              </option>
            </CabinetSelect>
          </label>
          <p class="field-note">
            長 {{ configuration.boxDimensions.length }} × 寬
            {{ configuration.boxDimensions.width }} × 高 {{ configuration.boxDimensions.height }} cm
          </p>
          <label v-if="['a4', 'a6'].includes(input.boxVariant)">
            盒色
            <CabinetSelect v-model="input.boxColor" aria-label="盒色">
              <option value="clear">透白</option>
              <option value="smoke">霧黑</option>
            </CabinetSelect>
          </label>
          <div class="field-pair">
            <label>
              層數
              <CabinetSelect
                v-if="touchMode"
                aria-label="層數"
                :value="configuration.rows"
                @change="updateNumber('rows', $event)"
              >
                <option v-for="n in Array.from({ length: 8 }, (_, i) => i + 1)" :key="n" :value="n">
                  {{ n }}
                </option>
              </CabinetSelect>
              <input
                v-else
                aria-label="層數"
                type="number"
                :value="configuration.rows"
                min="1"
                max="8"
                step="1"
                @input="draftNumber('rows', $event)"
                @change="updateNumber('rows', $event)"
              />
            </label>
            <label>
              每層抽數
              <CabinetSelect
                v-if="touchMode"
                aria-label="每層抽數"
                :value="configuration.columns"
                @change="updateNumber('columns', $event)"
              >
                <option
                  v-for="n in Array.from(
                    { length: maxCabinetColumns(configuration.boxVariant) },
                    (_, i) => i + 1
                  )"
                  :key="n"
                  :value="n"
                >
                  {{ n }}
                </option>
              </CabinetSelect>
              <input
                v-else
                aria-label="每層抽數"
                type="number"
                :value="configuration.columns"
                min="1"
                :max="maxCabinetColumns(configuration.boxVariant)"
                step="1"
                @input="draftNumber('columns', $event)"
                @change="updateNumber('columns', $event)"
              />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>02 / 貼皮與收納</legend>
          <div class="finish-options" role="group" aria-label="貼皮示意色">
            <button
              v-for="finish in FINISHES"
              :key="finish.id"
              type="button"
              :aria-pressed="input.finish === finish.id"
              :aria-label="finish.name"
              :title="finish.name"
              @click="input.finish = finish.id"
            >
              <i
                :style="{
                  background: finish.color,
                  backgroundImage:
                    finish.id === 'concrete'
                      ? 'url(/cabinet/materials/concrete-v2-color.jpg)'
                      : finish.id === 'stone'
                        ? 'url(/cabinet/materials/stone-v2-color.jpg)'
                        : 'none',
                  filter:
                    finish.id === 'stone'
                      ? 'grayscale(1) invert(1) brightness(0.65) contrast(0.7)'
                      : finish.id === 'concrete'
                        ? 'grayscale(1) brightness(1.5) contrast(0.4)'
                        : 'none'
                }"
              ></i>
            </button>
          </div>
          <label>
            底部收納內高（cm，最低 10，0 為不加裝）
            <CabinetSelect
              v-if="touchMode"
              aria-label="收納抽屜內高"
              :value="configuration.storageHeight"
              @change="updateNumber('storageHeight', $event)"
            >
              <option
                v-for="n in [0, ...Array.from({ length: 71 }, (_, i) => i + 10)]"
                :key="n"
                :value="n"
              >
                {{ n }} cm
              </option>
            </CabinetSelect>
            <input
              v-else
              aria-label="收納抽屜內高"
              type="number"
              :value="input.storageHeight"
              min="0"
              max="80"
              step="1"
              @change="updateNumber('storageHeight', $event)"
            />
          </label>
          <label>
            底部收納款式
            <CabinetSelect
              v-model="input.storageStyle"
              aria-label="底部收納款式"
              :disabled="configuration.storageHeight === 0"
            >
              <option value="drawer">抽屜</option>
              <option value="doors">雙開門</option>
              <option value="open">無門</option>
            </CabinetSelect>
          </label>
          <p v-if="configuration.storageHeight > 0" class="field-note">
            {{
              input.storageStyle === 'open'
                ? '開放式收納，不加裝門片。'
                : '點擊模型中的抽屜或門片，可開啟／關閉。'
            }}
          </p>
          <label class="check-field">
            <input v-model="input.wheels" type="checkbox" />
            萬向輪組
          </label>
          <p class="field-note">
            層板與櫃壁厚 {{ BOARD_THICKNESS }} cm。貼皮為示意，後續依實際樣本確認。
          </p>
        </fieldset>
        <fieldset>
          <legend>03 / 嵌入設備數量</legend>
          <label>
            加熱墊（每層底部後方，寬 10 cm）
            <CabinetSelect v-model="input.heatingMat" aria-label="加熱墊款式">
              <option value="calorique">美國凱勒瑞克 8W（標配）</option>
              <option value="korea">韓國超薄款 6W／110V</option>
            </CabinetSelect>
          </label>
          <p class="field-note">
            每層含加熱墊；一般開關控制加熱墊。LED 每層配一個金屬發光開關；溫控總數最多 2 顆。
          </p>
          <div class="field-pair">
            <label v-for="item in counts" :key="item.id">
              {{ item.label }}
              <CabinetSelect
                :aria-label="item.label + '數量'"
                :value="configuration.counts[item.id]"
                :disabled="item.id === 'metalSwitch'"
                @change="updateCount(item.id, $event)"
              >
                <option v-for="n in maxCount(item.id) + 1" :key="n" :value="n - 1">
                  {{ n - 1 }} 個
                </option>
              </CabinetSelect>
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>04 / 設備照明</legend>
          <button
            type="button"
            role="switch"
            :aria-checked="input.ledEnabled !== false"
            @click="input.ledEnabled = !input.ledEnabled"
          >
            LED {{ input.ledEnabled ? '開啟' : '關閉' }}
          </button>
          <label>
            LED 照明層數
            <CabinetSelect
              aria-label="LED照明層數"
              :value="configuration.ledLayers"
              @change="updateNumber('ledLayers', $event)"
            >
              <option v-for="n in configuration.rows + 1" :key="n" :value="n - 1">
                {{ n - 1 }} 層
              </option>
            </CabinetSelect>
          </label>
          <div role="group" aria-label="LED色溫" class="segmented">
            <button
              v-for="item in ledChoices"
              :key="item.id"
              type="button"
              :aria-pressed="input.ledColor === item.id"
              :disabled="!input.ledEnabled"
              @click="input.ledColor = item.id"
            >
              {{ item.label }}
            </button>
          </div>
          <p class="field-note">請點擊模型中的開關以控制LED燈</p>
        </fieldset>
      </aside>
      <div v-if="render3d && !failed && !touchMode" class="workspace-view-stack">
        <div class="workspace-view" role="group" aria-label="模型視角">
          <button type="button" :aria-pressed="view === 'front'" @click="setView('front')">
            正面
          </button>
          <button
            type="button"
            :aria-pressed="view === 'perspective'"
            @click="setView('perspective')"
          >
            立體
          </button>
          <button type="button" aria-label="放大模型" @click="run('zoom', 0.88)">＋</button>
          <button type="button" aria-label="縮小模型" @click="run('zoom', 1.14)">−</button>
          <button
            type="button"
            :aria-pressed="dimensionsVisible"
            @click="dimensionsVisible = !dimensionsVisible"
          >
            尺寸
          </button>
        </div>
        <div class="workspace-light-control">
          <div class="light-control-heading">
            <span>場景光源</span>
            <button
              type="button"
              :aria-label="lightPanelOpen ? '收合場景光源' : '展開場景光源'"
              :aria-expanded="lightPanelOpen"
              aria-controls="cabinet-light-settings"
              @click="lightPanelOpen = !lightPanelOpen"
            >
              {{ lightPanelOpen ? '−' : '＋' }}
            </button>
          </div>
          <div v-show="lightPanelOpen" id="cabinet-light-settings">
            <div role="group" aria-label="場景主燈" class="segmented">
              <button
                v-for="item in lightChoices"
                :key="item.id"
                type="button"
                :aria-pressed="input.lighting === item.id"
                @click="input.lighting = item.id"
              >
                {{ item.label }}
              </button>
            </div>
            <label>
              亮度 {{ configuration.lightLevel }}%
              <input
                aria-label="場景光源亮度"
                type="range"
                min="0"
                max="100"
                step="1"
                :value="configuration.lightLevel"
                @input="updateLightLevel"
              />
            </label>
          </div>
        </div>
      </div>
      <label v-if="touchMode" class="mobile-brightness">
        <span>亮度</span>
        <input
          type="range"
          aria-label="場景光源亮度"
          min="0"
          max="100"
          :value="configuration.lightLevel"
          @input="updateLightLevel"
        />
        <span>{{ configuration.lightLevel }}%</span>
      </label>
      <div v-if="touchMode" class="mobile-dimensions">
        <span>
          盒子:{{ configuration.boxDimensions.width }}X{{ configuration.boxDimensions.length }}X{{
            configuration.boxDimensions.height
          }}cm
        </span>
        <span>
          櫃子:{{ configuration.dimensions.width }}X{{ configuration.dimensions.height }}X{{
            configuration.dimensions.depth
          }}cm
        </span>
      </div>
      <div v-if="!touchMode" class="workspace-box-size" aria-live="polite">
        <span>單盒尺寸</span>
        <strong>
          {{ configuration.boxDimensions.width }} × {{ configuration.boxDimensions.length }} ×
          {{ configuration.boxDimensions.height }} cm
        </strong>
        <small>寬 × 深 × 高</small>
      </div>
      <div v-if="!touchMode" class="workspace-size" aria-live="polite">
        <strong>
          {{ configuration.dimensions.width }} × {{ configuration.dimensions.height }} ×
          {{ configuration.dimensions.depth }} cm
        </strong>
        <span>寬 × 高 × 深 · 規劃尺寸</span>
      </div>
    </div>
    <div v-if="!touchMode" class="workspace-footer">
      <span>
        {{
          touchMode ? '單指旋轉 · 雙指縮放 · 選項自動更新' : '拖曳旋轉 · 滾輪縮放 · Esc 退出滿版'
        }}
      </span>
      <span role="status">{{ downloadStatus || '硬體外型與材質為示意，非正式加工圖。' }}</span>
    </div>
  </div>
</template>

<style scoped>
.cabinet-workspace {
  position: relative;
  width: 100%;
  height: min(850px, calc(100dvh - 100px));
  min-height: 560px;
  display: flex;
  flex-direction: column;
  background: #ddd9d0;
  color: #292822;
  border: 1px solid var(--bd);
  isolation: isolate;
}
.cabinet-workspace.is-expanded {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  min-height: 0;
  z-index: 10000;
  border: 0;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
.workspace-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 1rem;
  background: #f8f7f3;
  border-bottom: 1px solid #ccc8bf;
  z-index: 3;
}
.workspace-toolbar > div:first-child {
  display: grid;
  gap: 0.2rem;
}
.workspace-toolbar span {
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  color: #7b6651;
}
.workspace-toolbar strong {
  font-size: 1rem;
}
.toolbar-actions {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
button,
select,
input {
  font: inherit;
  scroll-margin-block: 72px;
}
button {
  border: 1px solid #b9b5ad;
  background: #faf9f6;
  color: #35332d;
  padding: 0.4rem 0.65rem;
  min-height: 44px;
  cursor: pointer;
  font-size: 0.8rem;
  border-radius: 3px;
  position: relative;
  z-index: 1;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
button[aria-pressed='true'] {
  border-color: #855c3b;
  background: #ece2d5;
  color: #49321f;
}
button:focus-visible,
select:focus-visible,
input:focus-visible,
summary:focus-visible {
  outline: 2px solid #b04423;
  outline-offset: 2px;
}
.workspace-stage {
  background: radial-gradient(ellipse at 52% 42%, #f7f7f7 0%, #eeeeee 60%, #e5e5e5 100%);
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  outline: none;
  isolation: isolate;
}
.workspace-updating {
  position: absolute;
  inset: 8px 8px auto auto;
  padding: 8px 12px;
  border-radius: 4px;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  background: #0005;
  pointer-events: none;
}
.workspace-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #ffffff55;
  border-top-color: white;
  border-radius: 50%;
  animation: cabinet-spin 0.8s linear infinite;
}
@keyframes cabinet-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .workspace-spinner {
    animation: none;
  }
}
.workspace-pending {
  padding: 8px;
  background: #f8f2e6;
  color: #59402c;
  font-size: 0.75rem;
}
.workspace-canvas {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  touch-action: none;
}
.workspace-render {
  position: absolute;
  inset: 0;
  min-width: 0;
  z-index: 0;
}
.workspace-render.has-panel {
  left: 318px;
}
.workspace-options {
  scrollbar-width: thin;
  scrollbar-color: #b8afa0 #efede7;
  position: absolute;
  top: 1rem;
  left: 1rem;
  bottom: 1rem;
  width: 286px;
  overflow: auto;
  overscroll-behavior: contain;
  background: rgba(250, 249, 246, 0.97);
  border: 1px solid #c5c0b5;
  border-radius: 5px;
  padding: 1rem;
  z-index: 4;
  pointer-events: auto;
  scroll-padding-block: 1rem;
  box-shadow: 0 6px 24px #3a312017;
}
fieldset {
  padding: 0 0 1rem;
  margin: 0 0 1rem;
  border: 0;
  border-bottom: 1px solid #d5d0c6;
  min-width: 0;
  scroll-margin-block: 1rem;
}
legend {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 0.7rem;
  color: #765435;
}
label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.8rem;
  margin-bottom: 0.6rem;
  min-width: 0;
}
select,
input[type='number'] {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  border: 1px solid #c3beb4;
  background: #fff;
  color: #292822;
  padding: 0.35rem 0.45rem;
  border-radius: 3px;
  touch-action: manipulation;
}
.field-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}
.field-note {
  font-size: 0.72rem;
  line-height: 1.6;
  color: #726b60;
  margin: 0.35rem 0 0.65rem;
}
.finish-options {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.35rem;
  margin-bottom: 0.8rem;
}
.finish-options button {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 5px;
  justify-content: center;
}
.finish-options i {
  display: block;
  width: 100%;
  height: 46px;
  background-size: cover;
  border: 1px solid #0002;
  border-radius: 2px;
}
.check-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 44px;
  cursor: pointer;
  touch-action: manipulation;
}
.check-field input {
  accent-color: #80593b;
  width: 20px;
  height: 20px;
  margin: 0;
}
.segmented {
  display: flex;
  gap: 0.3rem;
}
.segmented button {
  flex: 1;
  padding: 0.4rem 0.2rem;
}
.clearance-settings summary {
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
}
.clearance-settings .field-pair {
  margin-top: 0.6rem;
}
.workspace-view-stack {
  position: absolute;
  right: 1rem;
  top: 1rem;
  width: min(310px, calc(100% - 2rem));
  z-index: 4;
  pointer-events: auto;
  display: grid;
  gap: 0.45rem;
}
.workspace-view {
  display: flex;
  justify-content: flex-end;
  gap: 0.3rem;
}
.workspace-light-control {
  display: grid;
  gap: 0.4rem;
  padding: 0.55rem;
  border: 1px solid #c5c0b5;
  border-radius: 4px;
  background: rgba(250, 249, 246, 0.94);
}
.light-control-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.light-control-heading > span {
  color: #765435;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.light-control-heading button {
  min-width: 44px;
  font-size: 1.1rem;
  padding: 0.1rem 0.4rem;
}
.workspace-light-control label {
  margin: 0;
  grid-template-columns: auto 1fr;
  align-items: center;
}
.workspace-light-control input[type='range'] {
  width: 100%;
  min-height: 44px;
  accent-color: #9c5c3b;
  touch-action: manipulation;
}
.workspace-box-size {
  position: absolute;
  right: 1rem;
  bottom: 6.5rem;
  display: grid;
  gap: 0.2rem;
  min-width: 170px;
  padding: 0.55rem 0.75rem;
  border: 1px solid #c6beb0;
  border-radius: 4px;
  background: #f9f7f0e8;
  text-align: right;
  pointer-events: none;
}
.workspace-box-size span,
.workspace-box-size small {
  color: #766b5d;
  font-size: 0.68rem;
}
.workspace-box-size strong {
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
}
.workspace-size {
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  background: #f9f7f0e8;
  padding: 0.7rem 0.9rem;
  border: 1px solid #c6beb0;
  border-radius: 4px;
  display: grid;
  gap: 0.3rem;
  text-align: right;
  pointer-events: none;
}
.workspace-size strong {
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}
.workspace-size span {
  font-size: 0.7rem;
  color: #766b5d;
}
.workspace-footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  background: #f8f7f3;
  border-top: 1px solid #ccc8bf;
  padding: 0.55rem 1rem;
  font-size: 0.7rem;
  color: #756d61;
}
.workspace-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  z-index: 1;
  pointer-events: none;
}
.workspace-fallback.with-panel {
  padding-left: 320px;
}
.workspace-fallback p {
  font-size: 0.8rem;
  color: #756d61;
}
.flat-cabinet {
  display: grid;
  width: 210px;
  height: 260px;
  border: 10px solid;
  padding: 20px 0 0;
  gap: 6px;
}
.flat-cabinet span {
  border: 1px solid #b8c6c8;
  background: #eff6f1b0;
  min-width: 0;
}
.flat-cabinet span.smoke {
  background: #293735aa;
}
.mobile-brightness {
  position: absolute;
  left: 6px;
  top: 42px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 11px;
}
.mobile-brightness input {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 32px;
  height: clamp(170px, 26svh, 240px);
  accent-color: #9c5c3b;
  touch-action: none;
}
.mobile-dimensions {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 4;
  display: grid;
  gap: 3px;
  font-size: 12px;
  color: #29251f;
  pointer-events: none;
  text-shadow: 0 0 3px white;
}
@media (max-width: 767px), (pointer: coarse), (hover: none) {
  .cabinet-workspace {
    height: calc(100svh - 160px);
    min-height: 500px;
  }
  .workspace-toolbar {
    padding: 6px 8px;
    gap: 6px;
  }
  .workspace-toolbar > div:first-child {
    display: none;
  }
  .toolbar-actions {
    width: 100%;
  }
  .toolbar-actions button {
    flex: 1;
    min-height: 40px;
    font-size: 0.75rem;
    padding: 6px;
  }
  .workspace-stage {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: minmax(190px, 34svh) minmax(0, 1fr);
    overflow: hidden;
    min-height: 0;
  }
  .mobile-3d-active .workspace-render,
  .workspace-fallback {
    position: relative;
    inset: auto;
    grid-column: 1 / -1;
    grid-row: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
  }
  .mobile-3d-active .workspace-render {
    touch-action: none;
  }
  .workspace-fallback {
    padding: 0;
  }
  .workspace-fallback p {
    font-size: 0.75rem;
  }
  .workspace-view-stack {
    position: static;
    grid-column: 1 / -1;
    grid-row: 2;
    width: auto;
    margin: 4px 8px;
  }
  .workspace-view button {
    min-height: 40px;
    padding: 6px;
  }
  .workspace-light-control {
    padding: 6px 8px;
  }
  .workspace-size,
  .workspace-box-size {
    position: static;
    grid-row: 3;
    min-width: 0;
    margin: 2px 4px 6px;
    text-align: left;
    padding: 4px 6px;
  }
  .workspace-box-size {
    grid-column: 1;
  }
  .workspace-size {
    grid-column: 2;
  }
  .workspace-size strong,
  .workspace-box-size strong {
    font-size: 0.72rem;
  }
  .workspace-size span,
  .workspace-box-size span {
    font-size: 0.6rem;
  }
  .workspace-box-size small {
    display: none;
  }
  .workspace-options .field-note {
    order: 2;
    margin: 0;
    font-size: 0.65rem;
  }
  .workspace-options .field-pair {
    order: 1;
  }
  .workspace-options {
    position: relative;
    inset: auto;
    grid-column: 1 / -1;
    grid-row: 2;
    width: auto;
    min-height: 0;
    max-height: none;
    overflow: auto;
    margin: 0 6px 4px;
    padding: 8px;
    box-shadow: none;
    touch-action: pan-y;
  }
  .workspace-options fieldset {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 4px 8px;
    padding-bottom: 6px;
    margin-bottom: 6px;
  }
  .workspace-options legend {
    margin-bottom: 6px;
  }
  .workspace-options label {
    margin: 0;
    font-size: 0.65rem;
    align-content: end;
  }
  .workspace-options .field-pair,
  .workspace-options .finish-options,
  .workspace-options .field-note,
  .workspace-options .led-row-controls {
    grid-column: 1 / -1;
  }
  .workspace-options select,
  .workspace-options input[type='number'] {
    min-height: 36px;
    height: 36px;
    font-size: 16px;
    padding: 2px 4px;
  }
  .workspace-options button {
    min-height: 36px;
  }
  .workspace-footer {
    padding: 4px 8px;
    font-size: 0.65rem;
    gap: 4px;
  }
}
@media (max-width: 767px), (pointer: coarse), (hover: none) {
  .workspace-stage {
    display: block;
  }
  .mobile-3d-active .workspace-render,
  .workspace-fallback {
    height: calc(100% - var(--sheet-height));
  }
  .workspace-options {
    position: absolute;
    inset: auto 0 0;
    height: var(--sheet-height);
    margin: 0;
    padding: 0 10px 8px;
    border-radius: 14px 14px 0 0;
  }
  .workspace-options .sheet-handle {
    position: sticky;
    top: 0;
    z-index: 5;
    width: 100%;
    height: 26px;
    min-height: 26px;
    padding: 0;
    border: 0;
    background: #faf9f6;
    display: flex;
    justify-content: center;
    align-items: center;
    touch-action: none;
  }
  .sheet-handle span {
    width: 38px;
    height: 4px;
    background: #a79d91;
    border-radius: 4px;
  }
  .workspace-options fieldset > button {
    align-self: end;
    height: 36px;
    padding: 4px 8px;
  }
  .workspace-options .segmented {
    grid-column: 1 / -1;
  }
  .workspace-options button {
    font-size: 12px;
  }
  .workspace-options legend {
    font-size: 11px;
  }
  .mobile-brightness {
    top: 46px;
    height: min(280px, calc(100% - var(--sheet-height) - 60px));
  }
  .mobile-brightness input {
    flex: 1;
    height: auto;
    min-height: 0;
  }
}
@media (max-height: 650px) and (min-width: 768px) {
  .cabinet-workspace {
    min-height: 450px;
  }
  .cabinet-workspace.is-expanded {
    min-height: 0;
  }
  .workspace-toolbar {
    padding: 0.5rem 0.8rem;
  }
  .workspace-footer {
    padding: 0.35rem 0.8rem;
  }
}
</style>
