<script setup>
import { ref } from 'vue'

const certificateId = ref('')
const searchError = ref('')
const navigating = ref(false)
useHead({
  title: '個體證書',
  meta: [{ name: 'description', content: '以個體 ID 查詢 Gencko Studio 的個體血統紀錄證書。' }],
  link: [{ rel: 'canonical', href: 'https://www.genckobreeding.com/certificates' }]
})
const track = useAnalytics()
const openCertificate = async () => {
  if (navigating.value) return
  const id = certificateId.value.normalize('NFKC').trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(id)) {
    searchError.value = '請輸入完整個體 ID，例如 S-53518。'
    return
  }
  searchError.value = ''
  navigating.value = true
  track('certificate_search', { surface: 'certificates' })
  try {
    await navigateTo(`/identity/${encodeURIComponent(id)}`)
  } catch {
    searchError.value = '暫時無法開啟證書，請再試一次。'
  } finally {
    navigating.value = false
  }
}
</script>
<template>
  <section class="certificate-search-page" aria-labelledby="certificate-search-title">
    <p class="search-eyebrow">GENCKO · INDIVIDUAL ARCHIVE</p>
    <h1 id="certificate-search-title">個體證書</h1>
    <form :aria-busy="navigating" class="certificate-search-form" @submit.prevent="openCertificate">
      <label for="certificate-id">個體 ID</label>
      <div class="certificate-search-field">
        <input
          id="certificate-id"
          v-model="certificateId"
          type="search"
          maxlength="64"
          placeholder="輸入個體 ID"
          autocomplete="off"
          autocapitalize="characters"
          :spellcheck="false"
          :aria-invalid="Boolean(searchError)"
          :aria-describedby="searchError ? 'certificate-search-error' : undefined"
          :disabled="navigating"
          @input="searchError = ''"
        />
        <button type="submit" :disabled="navigating" aria-label="搜尋個體證書">
          <span>{{ navigating ? '開啟中' : '查詢' }}</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
      <p
        v-if="searchError"
        id="certificate-search-error"
        class="certificate-search-error"
        role="alert"
      >
        {{ searchError }}
      </p>
    </form>
  </section>
</template>
<style scoped>
.certificate-search-page {
  position: relative;
  isolation: isolate;
  max-width: 680px;
  margin: clamp(24px, 5vw, 56px) auto;
  padding: clamp(28px, 5vw, 48px);
  color: #292e32;
  border: 1px solid #bdc5cc;
  background:
    radial-gradient(ellipse at 28% 12%, rgb(255 255 255 / 82%), transparent 70%),
    linear-gradient(110deg, #cbd2d8, #e6ebee 42%, #c4cdd5);
  box-shadow:
    inset 0 1px 0 #fff,
    0 4px 14px rgb(32 41 50 / 9%);
}
.certificate-search-page::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid #a98a51;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 80%);
  pointer-events: none;
}
.certificate-search-page::after {
  content: '';
  position: absolute;
  inset: 0;
  background: url('/textures/certificate-paper.svg') repeat;
  opacity: 0.5;
  mix-blend-mode: soft-light;
  pointer-events: none;
  z-index: -1;
}
.search-eyebrow {
  margin: 0 0 12px;
  color: #515b63;
  font-size: 11px;
  letter-spacing: 0.14em;
}
.certificate-search-form {
  margin-top: 26px;
}
.certificate-search-form label {
  display: block;
  margin-bottom: 9px;
  color: #515b63;
  font-size: 13px;
}
.certificate-search-field {
  display: flex;
  border: 1px solid #929da5;
  background: rgb(255 255 255 / 70%);
  box-shadow: inset 0 1px 2px rgb(36 44 50 / 6%);
}
.certificate-search-field:focus-within {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
.certificate-search-field input {
  min-width: 0;
  flex: 1;
  height: 58px;
  padding: 12px 16px;
  color: #292e32;
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  font-size: 16px;
  border-radius: 0;
}
.certificate-search-field button {
  flex-shrink: 0;
  width: 94px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 44px;
  background: #433821;
  color: #faf6ed;
  border: 0;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.certificate-search-field button:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 3px;
}
.certificate-search-field button:disabled {
  opacity: 0.6;
  cursor: wait;
}
.certificate-search-error {
  color: var(--pri);
  font-size: 13px;
  line-height: 1.5;
  margin: 12px 0 0;
}
@media (max-width: 767px) {
  .certificate-search-page {
    margin: 12px 0 24px;
    padding: 28px 24px;
  }
  .certificate-search-form {
    margin-top: 20px;
  }
}
</style>

<style>
body #main-content .certificate-search-page #certificate-search-title {
  font-family: var(--font-heading-zh);
  font-weight: 600;
  font-size: clamp(28px, 4vw, 36px) !important;
  letter-spacing: 0.12em;
  line-height: 1.4;
  margin: 0 !important;
  color: #71552a;
  text-shadow:
    0 -0.5px 0.3px rgb(51 36 14 / 20%),
    0 1px 0.3px rgb(255 255 255 / 85%);
}
</style>
