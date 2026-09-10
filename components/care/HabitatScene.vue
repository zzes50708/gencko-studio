<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLoop, useTres } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { DirectionalLight, Vector3 } from 'three'
import type { Object3D, PerspectiveCamera } from 'three'
import type { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createHabitatModel } from '~/utils/habitat-model'
import type { HabitatCommand, HabitatPartId } from '~/utils/habitat-parts'

const props = defineProps<{ selected: HabitatPartId; roof: boolean; command: HabitatCommand; reducedMotion: boolean }>()
const emit = defineEmits<{ select: [id: HabitatPartId]; ready: []; change: [] }>()
const model = createHabitatModel()
const sun = new DirectionalLight('#fff8eb', 3.2)
sun.position.set(-4, 9, 6)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 30 })
sun.shadow.normalBias = .035
sun.shadow.bias = -.0004
sun.shadow.camera.updateProjectionMatrix()
const controls = ref<{ instance: ThreeOrbitControls } | null>(null)
const { camera, invalidate } = useTres()
const { onBeforeRender } = useLoop()
const target = new Vector3(.45, .85, 0)
const destination = new Vector3(7.7, 6, 9.4)
const offset = new Vector3()
let moving = false
let dragStarted = 0
let dragDistance = 0
let isDragging = false
const startDrag = () => { dragStarted = performance.now(); dragDistance = 0; isDragging = true; moving = false }
const changed = () => { if (isDragging) dragDistance++; emit('change') }
const stopDrag = () => { isDragging = false }

watch(() => props.selected, value => { model.setSelected(value); invalidate() }, { immediate: true })
watch(() => props.roof, value => { model.lid.visible = value; invalidate() }, { immediate: true })

const setView = () => {
  const cam = camera.value as PerspectiveCamera | undefined
  const control = controls.value?.instance
  if (!cam || !control) return
  const { type, value } = props.command
  if (type === 'view') {
    if (value === 'top') destination.set(.45, 12.3, .15)
    else if (value === 'front') destination.set(.45, 3.15, 13.9)
    else destination.set(7.7, 6, 9.4)
  } else if (type === 'zoom') {
    offset.copy(cam.position).sub(target)
    offset.setLength(Math.min(20, Math.max(8.5, offset.length() * Number(value))))
    destination.copy(target).add(offset)
  } else {
    offset.copy(cam.position).sub(target).applyAxisAngle(new Vector3(0, 1, 0), Number(value))
    destination.copy(target).add(offset)
  }
  if (props.reducedMotion) {
    cam.position.copy(destination)
    control.target.copy(target)
    control.update()
  } else moving = true
  invalidate()
}
watch(() => props.command.serial, setView)

onBeforeRender(({ delta }) => {
  if (controls.value?.instance) controls.value.instance.dampingFactor = 1 - Math.exp(-9 * Math.min(delta, .05))
  if (!moving || !camera.value || !controls.value?.instance) return
  const control = controls.value.instance
  // 指數阻尼依時間計算，避免不同刷新率改變操作速度。
  const k = 1 - Math.exp(-9 * Math.min(delta, .05))
  camera.value.position.lerp(destination, k)
  control.target.lerp(target, k)
  control.update()
  if (camera.value.position.distanceToSquared(destination) < .00005) moving = false
  else invalidate()
})

const selectObject = (event: { object?: Object3D; stopPropagation?: () => void }) => {
  // 拖曳旋轉不誤觸設備選取。
  if (dragDistance > 3 && performance.now() - dragStarted < 1500) return
  let object = event.object
  while (object && !object.userData.partId) object = object.parent || undefined
  if (!object?.userData.partId) return
  event.stopPropagation?.()
  emit('select', object.userData.partId as HabitatPartId)
}
onMounted(() => { invalidate(); emit('ready') })
onBeforeUnmount(() => { model.dispose(); sun.dispose() })
</script>

<template>
  <TresPerspectiveCamera :position="[7.7, 6, 9.4]" :fov="38" :near=".1" :far="100" />
  <OrbitControls ref="controls" :target="[.45, .85, 0]" :enable-pan="false" :enable-zoom="false"
    :enable-damping="!reducedMotion" :damping-factor=".1" :rotate-speed=".55"
    :min-polar-angle=".08" :max-polar-angle="1.48" :min-distance="8.5" :max-distance="20"
    @start="startDrag" @end="stopDrag" @change="changed" />
  <TresAmbientLight :intensity="1.8" color="#f6f4ed" />
  <primitive :object="sun" :dispose="null" />
  <TresDirectionalLight :position="[5, 4, -5]" :intensity="1.6" color="#dae9ee" />
  <primitive :object="model.root" :dispose="null" @click="selectObject" />
</template>
