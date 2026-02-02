<script>
export default {
    name: 'TheFooter',
    emits: ['trigger-login']
}
</script>

<template>
    <footer @click="$emit('trigger-login')">
        <div style="margin-bottom:5px;font-weight:bold;color:var(--pri);">Gencko Studio｜專業豹紋守宮選育工作室</div>
        <div>© 2026 Gencko Studio. 版權所有</div>
    </footer>
</template>