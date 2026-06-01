<script setup>
import { useRoute } from 'vue-router'
import { computed, ref, watch } from 'vue'

const route = useRoute()
const sheetOpen = ref(false)
const activeSheet = ref(null) // 'articles' | 'shop' | 'tools' | null

const isServiceActive = computed(() => route.path === '/' || route.path.startsWith('/about'))
const isArticlesActive = computed(() => route.path.startsWith('/articles') || route.path.startsWith('/care') || route.path.startsWith('/faq'))
const isShopActive = computed(() =>
  route.path.startsWith('/shop') ||
  route.path.startsWith('/product') ||
  route.path.startsWith('/identity') ||
  route.path.startsWith('/auction') ||
  route.path.startsWith('/breeders') ||
  route.path.startsWith('/merch')
)
const isToolsActive = computed(() =>
  route.path.startsWith('/genes') ||
  route.path.startsWith('/calculator') ||
  route.path.startsWith('/hospital') ||
  route.path.startsWith('/health') ||
  route.path.startsWith('/qs')
)

const openSheet = (key) => {
  activeSheet.value = key
  sheetOpen.value = true
}

const closeSheet = () => {
  sheetOpen.value = false
  activeSheet.value = null
}

watch(
  () => route.path,
  () => {
    if (sheetOpen.value) closeSheet()
  }
)
</script>

<template>
  <div>
    <nav class="bottom-nav" aria-label="底部導覽（上拉式選單）">
      <NuxtLink to="/" class="nav-item" :class="{ active: isServiceActive }" aria-label="品牌服務">
        <span class="label">品牌服務</span>
      </NuxtLink>

      <button type="button" class="nav-item nav-item-btn" :class="{ active: isArticlesActive }" @click="openSheet('articles')" aria-label="專欄文章">
        <span class="label">專欄文章 <span class="sheet-caret" aria-hidden="true">▴</span></span>
      </button>

      <button type="button" class="nav-item nav-item-btn" :class="{ active: isShopActive }" @click="openSheet('shop')" aria-label="探索選購">
        <span class="label">探索選購 <span class="sheet-caret" aria-hidden="true">▴</span></span>
      </button>

      <button type="button" class="nav-item nav-item-btn" :class="{ active: isToolsActive }" @click="openSheet('tools')" aria-label="工具知識">
        <span class="label">工具知識 <span class="sheet-caret" aria-hidden="true">▴</span></span>
      </button>
    </nav>

    <Transition name="sheet-fade">
      <div v-if="sheetOpen" class="sheet-overlay" @click="closeSheet" aria-hidden="true" />
    </Transition>

    <Transition name="sheet-slide">
      <div v-if="sheetOpen" class="sheet" role="dialog" aria-modal="true" aria-label="導覽選單">
        <div class="sheet-handle" />
        <div class="sheet-header">
          <div class="sheet-title">
            {{ activeSheet === 'articles' ? '專欄文章' : activeSheet === 'shop' ? '探索選購' : '工具知識' }}
          </div>
          <button type="button" class="sheet-close" @click="closeSheet" aria-label="關閉">關閉</button>
        </div>

        <div class="sheet-body">
          <div v-if="activeSheet === 'articles'" class="sheet-list">
            <NuxtLink to="/care" class="sheet-item">飼養指南</NuxtLink>
            <NuxtLink to="/articles" class="sheet-item">文章列表</NuxtLink>
            <NuxtLink to="/faq" class="sheet-item">常見問題</NuxtLink>
          </div>

          <div v-else-if="activeSheet === 'shop'" class="sheet-list">
            <NuxtLink to="/shop" class="sheet-item">選購守宮</NuxtLink>
            <NuxtLink to="/auction" class="sheet-item">線上競標</NuxtLink>
            <NuxtLink to="/breeders" class="sheet-item">種群展示</NuxtLink>
            <NuxtLink to="/merch" class="sheet-item">周邊商品</NuxtLink>
          </div>

          <div v-else class="sheet-list">
            <NuxtLink to="/genes" class="sheet-item">基因圖鑑</NuxtLink>
            <NuxtLink to="/calculator" class="sheet-item">基因計算機</NuxtLink>
            <NuxtLink to="/hospital" class="sheet-item">特寵醫院</NuxtLink>
            <NuxtLink to="/health" class="sheet-item">健康評估</NuxtLink>
            <NuxtLink to="/qs" class="sheet-item">飼養前評估</NuxtLink>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .bottom-nav {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    justify-content: space-around;
    align-items: center;
    height: calc(56px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--card-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: none;
    z-index: 9999;
    /* 移除向上陰影，避免在首頁熱門精選下方形成「灰色軌道」視覺 */
    box-shadow: none;
  }
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: var(--txt);
  opacity: 0.6;
  transition: 0.2s ease-in-out;
  gap: 0px;
  height: 100%;
  min-width: 60px;
}

.nav-item-btn {
  background: transparent;
  border: none;
  padding: 0;
}

.nav-item .label {
  font-size: 0.75rem;
  font-weight: 700;
}

.sheet-caret {
  font-size: 0.7rem;
  opacity: 0.45;
  display: inline-block;
  transform: translateY(-1px);
}

.nav-item.active {
  color: var(--pri);
  opacity: 1;
}

.nav-item:active {
  transform: scale(0.98);
}

.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 10000;
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10001;
  background: var(--card-bg);
  border-top: 1px solid var(--bd);
  border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.sheet-handle {
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  margin: 10px auto 8px;
}

.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px 6px;
}

.sheet-title {
  font-weight: 900;
  color: var(--txt);
  letter-spacing: 0.2px;
}

.sheet-close {
  background: transparent;
  border: 1px solid var(--bd);
  color: var(--txt);
  opacity: 0.9;
  padding: 6px 10px;
  border-radius: 999px;
  font-weight: 800;
}

.sheet-body {
  padding: 8px 10px 14px;
}

.sheet-list {
  display: grid;
  gap: 8px;
}

.sheet-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  text-decoration: none;
  color: var(--txt);
  font-weight: 900;
  padding: 14px 14px;
  border-radius: 12px;
  border: 1px solid var(--bd);
  background: rgba(128, 128, 128, 0.05);
}

.sheet-item:active {
  background: rgba(255, 69, 0, 0.10);
  border-color: rgba(232, 68, 10, 0.45);
  color: var(--pri);
}

.sheet-fade-enter-active,
.sheet-fade-leave-active {
  transition: opacity 220ms ease;
}
.sheet-fade-enter-from,
.sheet-fade-leave-to {
  opacity: 0;
}

.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 220ms ease;
}
.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(18px);
  opacity: 0;
}
</style>
