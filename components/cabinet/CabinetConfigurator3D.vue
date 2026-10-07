<script setup lang="ts">
import type { Component } from 'vue'
import type { CabinetConfiguration, CabinetTemplate } from '~/utils/cabinet/config'
const props = withDefaults(defineProps<{ modelValue?: string; active?: boolean }>(), {
  modelValue: 'a4',
  active: true
})
const Workspace = shallowRef<Component | null>(null)
const loading = ref(false)
const loadFailed = ref(false)
async function loadWorkspace() {
  if (Workspace.value || loading.value) return
  loading.value = true
  loadFailed.value = false
  try {
    Workspace.value = markRaw((await import('./CabinetWorkspace.vue')).default)
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}
onMounted(() => {
  watch(
    () => props.active,
    (active) => {
      if (active) void loadWorkspace()
    },
    { immediate: true }
  )
})
const emit = defineEmits<{
  'update:modelValue': [value: CabinetTemplate]
  change: [value: CabinetConfiguration]
}>()
</script>
<template>
  <Workspace
    v-if="Workspace"
    :model-value="modelValue"
    :active="active"
    @update:model-value="emit('update:modelValue', $event)"
    @change="emit('change', $event)"
  />
  <p v-else-if="loading" role="status">正在載入配置工具…</p>
  <button v-else-if="loadFailed" type="button" @click="loadWorkspace">載入失敗，點此重試</button>
</template>
