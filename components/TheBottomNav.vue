<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { MOBILE_NAV_ITEMS, getNavigationGroup } from '~/utils/site-navigation'

const route = useRoute()
const sheetOpen = ref(false)
const activeSheet = ref(null)
const closeButton = ref(null)
const sheet = ref(null)
const triggerRefs = new Map()
let previousBodyOverflow = ''
const activeGroup = computed(() => getNavigationGroup(route.path))
const currentItem = computed(() => MOBILE_NAV_ITEMS.find((item) => item.key === activeSheet.value))

const isActive = (key) =>
  activeGroup.value === key || (key === 'explore' && activeGroup.value === 'brand')

const setTriggerRef = (key, el) => {
  if (el) triggerRefs.set(key, el)
}

const openSheet = async (key) => {
  activeSheet.value = key
  sheetOpen.value = true
  await nextTick()
  closeButton.value?.focus()
}

const closeSheet = async ({ restoreFocus = true } = {}) => {
  const previousKey = activeSheet.value
  sheetOpen.value = false
  activeSheet.value = null
  if (restoreFocus) {
    await nextTick()
    triggerRefs.get(previousKey)?.focus()
  }
}

const handleKeydown = (event) => {
  if (event.key === 'Escape' && sheetOpen.value) closeSheet()
  if (event.key !== 'Tab' || !sheetOpen.value || !sheet.value) return

  const focusable = [...sheet.value.querySelectorAll('a[href], button:not([disabled])')]
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => route.path,
  () => {
    if (sheetOpen.value) closeSheet({ restoreFocus: false })
  }
)

watch(sheetOpen, (open) => {
  if (!import.meta.client) return
  if (open) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousBodyOverflow
  }
})

onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (import.meta.client) document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div>
    <nav class="bottom-nav" aria-label="手機底部導覽">
      <template v-for="item in MOBILE_NAV_ITEMS" :key="item.key">
        <NuxtLink
          no-prefetch
          v-if="item.key === 'home'"
          :to="item.to"
          class="nav-item"
          :class="{ active: isActive(item.key) }"
          :aria-current="isActive(item.key) ? 'page' : undefined"
        >
          <span class="label">{{ item.label }}</span>
        </NuxtLink>
        <button
          v-else
          :ref="(el) => setTriggerRef(item.key, el)"
          type="button"
          class="nav-item nav-item-btn"
          :class="{ active: isActive(item.key) }"
          :aria-expanded="sheetOpen && activeSheet === item.key"
          aria-controls="mobile-navigation-sheet"
          @click="openSheet(item.key)"
        >
          <span class="label">
            {{ item.label }}
            <span class="sheet-caret" aria-hidden="true">▾</span>
          </span>
        </button>
      </template>
    </nav>

    <Transition name="sheet-fade">
      <button
        v-if="sheetOpen"
        type="button"
        class="sheet-overlay"
        aria-label="關閉導覽選單"
        @click="closeSheet()"
      />
    </Transition>

    <Transition name="sheet-slide">
      <section
        v-if="sheetOpen && currentItem"
        ref="sheet"
        id="mobile-navigation-sheet"
        class="sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="`${currentItem.label}導覽選單`"
      >
        <div class="sheet-handle" aria-hidden="true" />
        <div class="sheet-header">
          <div class="sheet-title">{{ currentItem.label }}</div>
          <button ref="closeButton" type="button" class="sheet-close" @click="closeSheet()">
            關閉
          </button>
        </div>

        <div class="sheet-body">
          <section
            v-for="section in currentItem.sections"
            :key="section.label"
            class="sheet-section"
          >
            <h2 class="sheet-section-title">{{ section.label }}</h2>
            <div class="sheet-list">
              <NuxtLink
                no-prefetch
                v-for="link in section.links"
                :key="link.to"
                :to="link.to"
                class="sheet-item"
                @click="closeSheet({ restoreFocus: false })"
              >
                {{ link.label }}
                <span aria-hidden="true">→</span>
              </NuxtLink>
            </div>
          </section>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.bottom-nav,
.sheet-overlay,
.sheet {
  display: none;
}

@media (max-width: 767px) {
  .bottom-nav {
    display: flex;
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 9999;
    height: calc(58px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--card-bg);
    border-top: 1px solid var(--bd);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .nav-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 48px;
    padding: 0 4px;
    color: var(--txt);
    opacity: 0.62;
    text-decoration: none;
    transition:
      color 180ms ease,
      opacity 180ms ease,
      background 180ms ease;
  }

  .nav-item-btn {
    border: 0;
    background: transparent;
  }

  .nav-item.active {
    color: var(--pri);
    opacity: 1;
    background: color-mix(in srgb, var(--pri) 8%, transparent);
  }

  .nav-item:focus-visible,
  .sheet-close:focus-visible,
  .sheet-item:focus-visible,
  .sheet-overlay:focus-visible {
    outline: 2px solid var(--pri);
    outline-offset: -3px;
  }

  .label {
    font-size: 0.78rem;
    font-weight: 800;
    white-space: nowrap;
  }

  .sheet-caret {
    display: inline-block;
    font-size: 0.68rem;
    opacity: 0.55;
    transform: translateY(-1px);
  }

  .sheet-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 10000;
    width: 100%;
    border: 0;
    background: rgba(10, 12, 12, 0.62);
  }

  .sheet {
    display: block;
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 10001;
    max-height: min(78dvh, 620px);
    overflow-y: auto;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    color: var(--txt);
    background: var(--card-bg-solid);
    border: 1px solid var(--bd);
    border-bottom: 0;
    border-radius: 20px 20px 0 0;
    box-shadow: 0 -24px 70px rgba(0, 0, 0, 0.28);
  }

  .sheet-handle {
    width: 44px;
    height: 4px;
    margin: 10px auto 4px;
    border-radius: 999px;
    background: var(--bd);
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px 10px;
  }

  .sheet-title {
    font-size: 1.1rem;
    font-weight: 900;
  }

  .sheet-close {
    min-height: 40px;
    padding: 7px 13px;
    color: var(--txt);
    font-weight: 800;
    border: 1px solid var(--bd);
    border-radius: 999px;
    background: transparent;
  }

  .sheet-body {
    display: grid;
    gap: 20px;
    padding: 4px 12px 10px;
  }

  .sheet-section-title {
    margin: 0 4px 8px;
    color: var(--txt-muted);
    font-size: 0.76rem;
    font-weight: 900;
    letter-spacing: 0.12em;
  }

  .sheet-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .sheet-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 11px 13px;
    color: var(--txt);
    font-weight: 850;
    text-decoration: none;
    border: 1px solid var(--bd);
    border-radius: 12px;
    background: rgba(128, 128, 128, 0.06);
  }

  .sheet-item:active {
    color: var(--pri);
    border-color: var(--pri);
  }
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
  transition:
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 220ms ease;
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(18px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .sheet-fade-enter-active,
  .sheet-fade-leave-active,
  .sheet-slide-enter-active,
  .sheet-slide-leave-active {
    transition: none;
  }
}

@media (max-width: 767px) {
  .bottom-nav {
    height: calc(62px + env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--card-bg-solid) 96%, transparent);
    border-top-color: var(--bd);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .nav-item {
    color: var(--txt-muted);
  }

  .nav-item.active {
    color: var(--txt);
    background: transparent;
  }

  .nav-item.active::before {
    content: '';
    position: absolute;
    top: 0;
    width: 24px;
    height: 1px;
    background: var(--pri);
  }

  .label {
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  .sheet {
    padding-inline: 8px;
    border-radius: 8px 8px 0 0;
    box-shadow: none;
    border-radius: 2px 2px 0 0;
  }

  .sheet-title {
    font-family: 'Noto Serif TC', 'Songti TC', serif;
    font-weight: 600;
  }

  .sheet-close,
  .sheet-item {
    border-radius: 2px;
  }

  .sheet-item {
    background: transparent;
    font-size: 0.82rem;
    font-weight: 600;
  }
}
</style>
