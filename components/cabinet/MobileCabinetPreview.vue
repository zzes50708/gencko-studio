<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CabinetConfiguration } from '~/utils/cabinet/config'
const props = defineProps<{ configuration: CabinetConfiguration; finish: string }>()
const opened = ref<number[]>([])
watch(
  () => [
    props.configuration.boxVariant,
    props.configuration.columns,
    props.configuration.rows,
    props.configuration.storageStyle
  ],
  () => {
    opened.value = []
  }
)
const scale = computed(() =>
  Math.min(230 / props.configuration.dimensions.height, 240 / props.configuration.dimensions.width)
)
const width = computed(() => props.configuration.dimensions.width * scale.value)
const height = computed(() => props.configuration.dimensions.height * scale.value)
const storageHeight = computed(() => props.configuration.storageHeight * scale.value)
const rowHeight = computed(
  () => (height.value - 22 - storageHeight.value) / props.configuration.rows
)
const cellWidth = computed(() => (width.value - 12) / props.configuration.columns)
function toggle(index: number) {
  opened.value = opened.value.includes(index)
    ? opened.value.filter((value) => value !== index)
    : [...opened.value, index]
}
const ledColor = computed(() =>
  props.configuration.ledColor === 'warm'
    ? '#ffda8b'
    : props.configuration.ledColor === 'cool'
      ? '#dcf1ff'
      : '#fff6d9'
)
</script>
<template>
  <svg
    class="mobile-cabinet-preview"
    viewBox="0 0 320 280"
    role="img"
    aria-label="爬櫃立體配置預覽，點擊盒子可開合"
  >
    <g :transform="`translate(${(280 - width) / 2},${(260 - height) / 2 + 18})`">
      <ellipse
        :cx="width / 2 + 14"
        :cy="height + 8"
        :rx="width / 2 + 20"
        ry="8"
        fill="#000"
        opacity=".09"
      />
      <path
        :d="`M 0 0 L 32 -18 L ${width + 32} -18 L ${width} 0 Z`"
        :fill="finish"
        stroke="#888"
        stroke-width=".6"
      />
      <path
        :d="`M ${width} 0 L ${width + 32} -18 L ${width + 32} ${height - 18} L ${width} ${height} Z`"
        :fill="finish"
        stroke="#888"
        stroke-width=".6"
      />
      <rect :width="width" :height="height" :fill="finish" stroke="#888" stroke-width=".6" />
      <g v-for="row in configuration.rows" :key="row">
        <rect
          x="6"
          :y="16 + (row - 1) * rowHeight"
          :width="width - 12"
          :height="rowHeight - 4"
          fill="#242628"
        />
        <path
          v-if="
            configuration.ledEnabled &&
            row <= configuration.ledLayers &&
            configuration.ledRowEnabled[row - 1] !== false
          "
          :d="`M 8 ${16 + row * rowHeight - 7} H ${width - 8}`"
          :stroke="ledColor"
          stroke-width="3"
        />
        <g
          v-for="column in configuration.columns"
          :key="column"
          role="button"
          tabindex="0"
          :aria-label="`第 ${row} 層第 ${column} 盒${opened.includes((row - 1) * configuration.columns + column) ? '收回' : '拉開'}`"
          :aria-pressed="opened.includes((row - 1) * configuration.columns + column)"
          :transform="
            opened.includes((row - 1) * configuration.columns + column) ? 'translate(-8,9)' : ''
          "
          @click="toggle((row - 1) * configuration.columns + column)"
          @keydown.enter.prevent="toggle((row - 1) * configuration.columns + column)"
          @keydown.space.prevent="toggle((row - 1) * configuration.columns + column)"
        >
          <rect
            :x="7 + (column - 1) * cellWidth"
            :y="17 + (row - 1) * rowHeight"
            :width="cellWidth - 2"
            :height="rowHeight - 6"
            :fill="configuration.boxColor === 'smoke' ? '#394448' : '#e3edf0'"
            :fill-opacity="configuration.boxVariant.startsWith('acrylic') ? 0.18 : 0.65"
            stroke="#b4c4ca"
            stroke-width="1"
          />
          <path
            :d="`M ${7 + (column - 0.7) * cellWidth} ${19 + (row - 1) * rowHeight} h ${cellWidth * 0.4}`"
            stroke="#f8f8f8"
            stroke-width="1.5"
          />
        </g>
      </g>
      <g
        v-if="configuration.storageHeight > 0"
        :role="configuration.storageStyle === 'open' ? 'img' : 'button'"
        :tabindex="configuration.storageStyle === 'open' ? undefined : 0"
        :aria-label="configuration.storageStyle === 'open' ? '無門底部收納' : '開合底部收納'"
        :aria-pressed="configuration.storageStyle === 'open' ? undefined : opened.includes(-1)"
        :transform="opened.includes(-1) ? 'translate(-8,9)' : ''"
        @click="configuration.storageStyle !== 'open' && toggle(-1)"
        @keydown.enter.prevent="configuration.storageStyle !== 'open' && toggle(-1)"
        @keydown.space.prevent="configuration.storageStyle !== 'open' && toggle(-1)"
      >
        <rect
          x="6"
          :y="height - storageHeight - 4"
          :width="width - 12"
          :height="storageHeight"
          :fill="configuration.storageStyle === 'open' ? '#242628' : finish"
          stroke="#888"
        />
        <path
          v-if="configuration.storageStyle === 'doors'"
          :d="`M ${width / 2} ${height - storageHeight - 4} V ${height - 4}`"
          stroke="#888"
        />
        <path
          v-if="configuration.storageStyle !== 'open'"
          :d="`M ${width / 2 - 8} ${height - storageHeight / 2} h 16`"
          stroke="#777"
          stroke-width="2"
        />
      </g>
    </g>
  </svg>
</template>
<style scoped>
.mobile-cabinet-preview {
  display: block;
  width: 100%;
  height: 260px;
  touch-action: pan-y;
}
g[role='button'] {
  cursor: pointer;
}
g[role='button']:focus-visible {
  outline: 2px solid var(--pri);
}
</style>
