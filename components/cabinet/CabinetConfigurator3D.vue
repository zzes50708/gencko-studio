<script setup lang="ts">
import type { CabinetConfiguration, CabinetTemplate } from '~/utils/cabinet/config'
withDefaults(defineProps<{ modelValue?: string }>(), { modelValue: 'a4' })
const emit = defineEmits<{
  'update:modelValue': [value: CabinetTemplate]
  change: [value: CabinetConfiguration]
}>()
</script>
<template>
  <CabinetWorkspace
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    @change="emit('change', $event)"
  />
</template>
