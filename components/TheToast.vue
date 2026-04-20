<script setup>
const props = defineProps({
    show: { type: Boolean, default: false }
})
</script>

<template>
    <div v-if="show" class="toast">已複製到剪貼簿</div>
</template>