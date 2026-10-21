<script setup>
import { useMainStore } from '~/stores/useMainStore'
const store = useMainStore()
const route = useRoute()
const checking = ref(true)
const transfer = ref('')
const copyMessage = ref('')
const failed = computed(() => !['ready'].includes(String(route.query.status)))
useHead({
  title: 'LINE 登入接續',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' },
    { name: 'referrer', content: 'no-referrer' }
  ]
})
onMounted(async () => {
  const result = await store.resumeLineLogin()
  checking.value = false
  if (result) await navigateTo(result.returnTo, { replace: true })
  else if (!failed.value) {
    try {
      const result = await $fetch('/api/auth/line/transfer', {
        method: 'POST',
        body: { flow: String(route.query.flow || '') },
        retry: 0,
        timeout: 10000
      })
      transfer.value = result.transfer
    } catch {
      copyMessage.value = '接續碼已逾時或無法讀取，請回原 App 重新登入。'
    }
  }
})
async function copy() {
  try {
    await navigator.clipboard.writeText(transfer.value)
    copyMessage.value = '已複製。請開啟原本的 Gencko App，貼上接續碼並按「完成登入」。'
  } catch {
    copyMessage.value = '無法自動複製，請長按下方接續碼，選取全部後複製。'
  }
}
</script>

<template>
  <main class="line-return">
    <p class="line-return__brand">GENCKO STUDIO</p>
    <h1>
      {{
        checking ? '正在接續 LINE 登入' : failed ? 'LINE 登入尚未完成' : '請返回原本的 Gencko App'
      }}
    </h1>
    <p v-if="checking" role="status">請稍候，正在確認這次登入。</p>
    <p v-else-if="failed">請回到原本使用的 App 或瀏覽器，重新點選 LINE 登入。</p>
    <p v-else>
      LINE 授權已傳回。請複製登入接續碼，再從手機桌面開啟原本的 Gencko App，貼上並按「完成登入」。
    </p>
    <p v-if="!checking && !failed" class="line-return__note">
      請於 4 分鐘內完成。只接續你自己剛才發起的登入，不要把這組碼傳給任何人。
    </p>
    <template v-if="transfer && !checking">
      <button type="button" class="btn-app" @click="copy">複製登入接續碼</button>
      <input
        class="line-return__code"
        aria-label="可手動複製的登入接續碼"
        readonly
        :value="transfer"
      />
    </template>
    <p v-if="copyMessage" role="status">{{ copyMessage }}</p>
    <NuxtLink v-if="failed" to="/profile">前往我的專區重新登入</NuxtLink>
  </main>
</template>

<style scoped>
.line-return {
  max-width: 32rem;
  margin: 2rem auto;
  padding: 1.5rem;
  line-height: 1.7;
}
.line-return__brand {
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  color: var(--color-primary, #bd351e);
}
.line-return h1 {
  font-size: clamp(1.4rem, 4vw, 1.9rem);
  margin: 0.5rem 0 1rem;
}
.line-return__note {
  color: #68645e;
  font-size: 0.9rem;
}
.line-return a {
  color: inherit;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-top: 0.5rem;
  text-decoration: underline;
  text-underline-offset: 4px;
}
.line-return__code {
  display: block;
  width: 100%;
  box-sizing: border-box;
  margin: 0.75rem 0;
  padding: 0.65rem;
  border: 1px solid #ccc;
  background: #faf9f6;
  min-height: 44px;
  color: inherit;
}
</style>
