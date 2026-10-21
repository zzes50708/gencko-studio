<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { getLineMessageLink } from '~/utils/animal-inquiry'
import { isMobileLineDevice } from '~/utils/line-handoff'
const props = defineProps({
  message: { type: String, required: true },
  mobileLabel: { type: String, default: '前往 LINE 傳送訊息' }
})
const emit = defineEmits(['open'])
const device = ref('pending')
const expanded = ref(false)
const qr = ref('')
const qrError = ref(false)
const officialProfile = 'https://line.me/R/ti/p/%40219abdzn'
const messageLink = computed(() => getLineMessageLink(officialProfile, props.message))
let revision = 0
function toggleQr(event) {
  emit('open', event)
  if (!event.defaultPrevented) expanded.value = !expanded.value
}
watch(
  () => [props.message, device.value, expanded.value],
  async () => {
    const request = ++revision
    qr.value = ''
    qrError.value = false
    if (device.value !== 'desktop' || !expanded.value || !props.message) return
    const target = messageLink.value
    try {
      // 驗證碼只在本機編碼，不傳給外部 QR Code 服務。
      const { default: QRCode } = await import('qrcode')
      const svg = await QRCode.toString(target, {
        type: 'svg',
        margin: 4,
        width: 240,
        errorCorrectionLevel: 'M'
      })
      if (request === revision)
        qr.value = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    } catch {
      if (request === revision) qrError.value = true
    }
  }
)
onMounted(() => {
  device.value = isMobileLineDevice(navigator.userAgent, navigator.maxTouchPoints)
    ? 'mobile'
    : 'desktop'
})
onBeforeUnmount(() => {
  revision++
})
</script>
<template>
  <div class="line-handoff" aria-label="LINE 傳送方式">
    <a
      v-if="device === 'mobile'"
      class="btn-app btn-app--secondary"
      :href="messageLink"
      target="_blank"
      rel="noopener noreferrer"
      @click="emit('open', $event)"
    >
      {{ mobileLabel }}
    </a>
    <template v-else-if="device === 'desktop'">
      <button
        type="button"
        class="btn-app btn-app--secondary"
        :aria-expanded="expanded"
        @click="toggleQr"
      >
        {{ expanded ? '收起傳送 QR Code' : '用手機 LINE 掃碼傳送' }}
      </button>
      <div v-if="expanded" class="line-handoff__qr">
        <p>用目前登入帳號的手機 LINE 掃描，確認預填訊息後按下傳送。</p>
        <img
          v-if="qr"
          :src="qr"
          alt="用手機 LINE 掃描以開啟官方帳號並預填訊息"
          width="240"
          height="240"
        />
        <p v-else role="status">
          {{ qrError ? 'QR Code 暫時無法產生，請複製上方訊息自行傳送。' : '正在產生 QR Code…' }}
        </p>
      </div>
      <p>
        電腦 LINE 無法由此連結直接開啟聊天；可複製上方訊息，自行開啟 Gencko 官方 LINE 對話並傳送。
      </p>
      <a
        class="btn-app btn-app--ghost"
        :href="officialProfile"
        target="_blank"
        rel="noopener noreferrer"
      >
        官方帳號／加好友 QR Code
      </a>
    </template>
  </div>
</template>
<style scoped>
.line-handoff {
  margin-block: 8px;
  overflow-wrap: anywhere;
}
.line-handoff p {
  margin-block: 8px;
  line-height: 1.6;
}
.line-handoff .btn-app {
  min-height: 44px;
  white-space: normal;
}
.line-handoff__qr img {
  display: block;
  max-width: 100%;
  height: auto;
  background: #fff;
}
</style>
