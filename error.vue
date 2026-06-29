<script setup>
import { computed } from 'vue'
import { useHead, clearError } from '#imports'

const props = defineProps({
  error: { type: Object, required: true }
})

const statusCode = computed(() => Number(props.error?.statusCode) || 500)
const is404 = computed(() => statusCode.value === 404)

const headline = computed(() => (is404.value ? '找不到這隻守宮' : '出了一點狀況'))
const subtitle = computed(() =>
  is404.value
    ? '這個頁面可能已下架、搬家了，或從來不存在。但 Gencko 還有很多地方值得逛。'
    : '伺服器短暫打結，請稍後再試，或從下方入口繼續探索。'
)

useHead({
  title: computed(() => `${statusCode.value} · ${headline.value}`),
  meta: [
    { name: 'robots', content: 'noindex' },
    { name: 'description', content: () => subtitle.value }
  ]
})

const goHome = () => clearError({ redirect: '/' })
const goShop = () => clearError({ redirect: '/shop' })
const goArticles = () => clearError({ redirect: '/articles' })
const goCalc = () => clearError({ redirect: '/calculator' })
</script>

<template>
  <div class="err-page">
    <div class="err-hero">
      <div class="err-code">{{ statusCode }}</div>
      <h1 class="err-title">{{ headline }}</h1>
      <p class="err-sub">{{ subtitle }}</p>
    </div>

    <div class="err-actions">
      <button class="btn-app btn-app--primary btn-app--md btn-app--pill" @click="goHome">
        回到首頁
      </button>
      <button class="btn-app btn-app--ghost btn-app--md btn-app--pill" @click="goShop">
        找在售個體
      </button>
      <button class="btn-app btn-app--ghost btn-app--md btn-app--pill" @click="goArticles">
        閱讀飼養文章
      </button>
      <button class="btn-app btn-app--ghost btn-app--md btn-app--pill" @click="goCalc">
        玩基因計算機
      </button>
    </div>

    <div class="err-tip" v-if="is404">
      <span>找不到想要的東西？</span>
      <a
        href="https://line.me/R/ti/p/@219abdzn"
        target="_blank"
        rel="noopener"
        class="err-line-link"
      >
        用 LINE 直接問捷客
      </a>
    </div>
  </div>
</template>

<style scoped>
.err-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 80px 20px 60px 20px;
  text-align: center;
  color: var(--txt);
}
.err-hero {
  margin-bottom: 32px;
}
.err-code {
  font-family: 'Black Ops One', sans-serif;
  font-size: clamp(5rem, 18vw, 8.5rem);
  line-height: 1;
  color: var(--pri);
  text-shadow: 0 6px 30px var(--pri-glow-soft);
  margin-bottom: 8px;
}
.err-title {
  font-size: clamp(1.4rem, 4.5vw, 2rem);
  font-weight: 900;
  margin: 0 0 12px 0;
}
.err-sub {
  font-size: 0.95rem;
  line-height: 1.7;
  opacity: 0.78;
  margin: 0;
}
.err-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
  margin-bottom: 28px;
}
.err-tip {
  font-size: 0.9rem;
  opacity: 0.8;
  border-top: 1px dashed var(--bd);
  padding-top: 18px;
  margin-top: 18px;
}
.err-line-link {
  color: var(--pri);
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 3px;
  margin-left: 6px;
}
@media (max-width: 480px) {
  .err-page {
    padding: 60px 16px 40px 16px;
  }
  .err-actions .btn-app {
    width: 100%;
    justify-content: center;
  }
}
</style>
