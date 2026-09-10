<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import { ACESFilmicToneMapping, PCFShadowMap } from 'three'
import HabitatScene from './HabitatScene.vue'
import type { HabitatCommand, HabitatPartId } from '~/utils/habitat-parts'

defineProps<{ selected: HabitatPartId; roof: boolean; command: HabitatCommand; reducedMotion: boolean }>()
const emit = defineEmits<{ select: [id: HabitatPartId]; ready: []; error: []; change: [] }>()
</script>

<template>
  <TresCanvas clear-color="#f8f7f3" :alpha="false" :antialias="true" :dpr="[1, 1.5]"
    render-mode="on-demand" :shadows="true" :shadow-map-type="PCFShadowMap"
    :tone-mapping="ACESFilmicToneMapping" :tone-mapping-exposure="1.1"
    @error="emit('error')">
    <HabitatScene :selected="selected" :roof="roof" :command="command" :reduced-motion="reducedMotion"
      @select="emit('select', $event)" @ready="emit('ready')" @change="emit('change')" />
  </TresCanvas>
</template>
