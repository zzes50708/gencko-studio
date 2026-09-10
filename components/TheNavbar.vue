<script setup>
import { computed, ref, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { useRoute } from 'vue-router'
import { getCleanUrl } from '~/utils/image'
import { DESKTOP_NAV_GROUPS, getNavigationGroup } from '~/utils/site-navigation'
import { useMainStore } from '~/stores/useMainStore' // ?? 撘 store

const props = defineProps({
  navHidden: { type: Boolean, default: false },
  isDayMode: { type: Boolean, default: true },
  curTab: { type: String, default: '' },
  readingArticle: { type: Object, default: null },
  readingProgress: { type: Number, default: 0 }
})

const emit = defineEmits(['toggle-theme', 'scroll-top'])

const store = useMainStore() // ?? ??摰?????寞?
const route = useRoute()
const openMenu = ref(null)
const clickedMenu = ref(null)
const canHover = useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')
const dismissedMenu = ref(null)
const activeGroup = computed(() => getNavigationGroup(route.path))

const toggleMenu = (key) => {
  if (clickedMenu.value === key && openMenu.value === key) {
    openMenu.value = null
    clickedMenu.value = null
    dismissedMenu.value = key
  } else {
    openMenu.value = key
    clickedMenu.value = key
    dismissedMenu.value = null
  }
}

const closeMenu = () => {
  openMenu.value = null
  clickedMenu.value = null
  dismissedMenu.value = null
}

const closeMenuForNavigation = () => {
  dismissedMenu.value = dismissedMenu.value || openMenu.value || activeGroup.value
  openMenu.value = null
}

const clearDismissedMenu = (key) => {
  if (dismissedMenu.value === key) dismissedMenu.value = null
}

const dismissMenu = (event) => {
  dismissedMenu.value = event.target.closest('.nav-item-dt')?.dataset.navKey || openMenu.value
  openMenu.value = null
  clickedMenu.value = null
}

const handleFocusOut = (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) openMenu.value = null
}

watch(() => route.path, closeMenuForNavigation)

// LCP 優化：logo 原圖 4.4MB（1856×1865），實際只顯示 36×36
// 透過 wsrv.nl 壓縮至 72px webp（≈ 3KB），縮減 99.9%
const navLogoUrl = computed(() => (store.logoUrl ? getCleanUrl(store.logoUrl, 72) : ''))
</script>

<template>
  <div>
    <!-- Sticky Nav -->
    <div class="sticky-nav" :class="{ 'nav-hidden': navHidden }">
      <div class="nav-container">
        <!-- Logo -->
        <NuxtLink
          no-prefetch
          to="/"
          class="nav-left"
          @click="$emit('scroll-top')"
          style="
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
          "
        >
          <img
            v-if="navLogoUrl"
            :src="navLogoUrl"
            class="nav-logo-img"
            alt="Gencko Studio Logo"
            width="36"
            height="36"
            loading="eager"
            fetchpriority="high"
          />
          <div
            class="nav-wordmark"
            style="
              font-weight: 800;
              font-size: 1.05rem;
              color: var(--pri);
              letter-spacing: 0.16em;
              line-height: 1;
            "
          >
            GENCKO
          </div>
        </NuxtLink>

        <!-- Desktop Menu -->
        <div class="dt-nav" @keydown.esc="dismissMenu">
          <div
            v-for="group in DESKTOP_NAV_GROUPS"
            :key="group.key"
            :data-nav-key="group.key"
            class="nav-item-dt"
            :class="{
              active: activeGroup === group.key,
              open: openMenu === group.key,
              dismissed: dismissedMenu === group.key
            }"
            @focusout="handleFocusOut"
            v-on="canHover ? {
              mouseenter: () => { openMenu = group.key; dismissedMenu = null },
              mouseleave: () => { closeMenu(); clearDismissedMenu(group.key) }
            } : {}"
          >
            <NuxtLink no-prefetch :to="group.to" class="nav-item-dt-link" @focus="openMenu = group.key" @click="dismissMenu">
              {{ group.label }}
            </NuxtLink>
            <button
              type="button"
              class="nav-disclosure"
              :aria-expanded="openMenu === group.key"
              :aria-controls="`nav-menu-${group.key}`"
              :aria-label="`${group.label}選單`"
              @click="toggleMenu(group.key)"
            >
              <span aria-hidden="true">▾</span>
            </button>
            <div
              :id="`nav-menu-${group.key}`"
              class="dt-dropdown"
              :class="{ visible: openMenu === group.key }"
            >
              <NuxtLink
                no-prefetch
                v-for="link in group.links"
                :key="link.to"
                :to="link.to"
                @click="dismissMenu"
              >
                {{ link.label }}
              </NuxtLink>
            </div>
          </div>
        </div>

        <!-- Right Controls -->
        <div class="nav-right">
          <NuxtLink
            no-prefetch
            to="/home"
            class="btn-app btn-app--ghost btn-app--sm btn-app--pill home-btn"
            :class="{ active: activeGroup === 'home' }"
            :aria-current="activeGroup === 'home' ? 'page' : undefined"
            style="text-decoration: none; display: flex; align-items: center"
            title="首頁"
          >
            首頁
          </NuxtLink>

          <button
            v-if="store.canInstall"
            @click="store.installApp"
            class="btn-app btn-app--secondary btn-app--sm btn-app--pill dt-install-btn"
            aria-label="下載 App"
          >
            <svg
              class="install-ico"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 3v12" />
              <path d="M7 10l5 5 5-5" />
              <path d="M5 20h14" />
            </svg>
            <span class="install-label">下載 App</span>
          </button>

          <NuxtLink
            no-prefetch
            to="/profile"
            class="btn-app btn-app--ghost btn-app--sm btn-app--pill member-btn"
            :class="{ active: activeGroup === 'profile' }"
            :aria-current="activeGroup === 'profile' ? 'page' : undefined"
            style="text-decoration: none; display: flex; align-items: center"
            title="會員"
          >
            會員
          </NuxtLink>

          <!-- ?? ? ClientOnly 閫?捱隡箸??刻??汗?冽?摮?銝?渡? Mismatch -->
          <button
            type="button"
            class="theme-toggle"
            role="switch"
            :aria-checked="isDayMode"
            :aria-label="isDayMode ? '切換為暗色模式' : '切換為亮色模式'"
            @click="$emit('toggle-theme')"
          >
            <ClientOnly>
              {{ isDayMode ? '亮色' : '暗色' }}
              <template #fallback>
                <span>載入中</span>
              </template>
            </ClientOnly>
          </button>
        </div>
      </div>
    </div>

    <!-- Reading Progress Bar -->
    <div
      v-if="curTab === 'articles' && readingArticle"
      class="reading-progress-bar"
      :class="{ 'reading-progress-bar--nav-hidden': navHidden }"
    >
      <div class="progress-fill" :style="{ width: readingProgress + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
/* Sticky Navigation ????勗??CSS ?批嚗??楛??/ ?仿? Logo ?瑁??堆? */
.sticky-nav {
  position: fixed;
  top: calc(40px + env(safe-area-inset-top, 0px));
  left: 0;
  width: 100%;
  height: 50px;
  z-index: 1000;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 0 15px;
  transition: transform 0.2s ease-out;
}
.sticky-nav.nav-hidden {
  transform: translateY(-100%);
}

.nav-container {
  max-width: 1300px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 50px;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.nav-logo-img {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  object-fit: cover;
  display: block;
  background: var(--card-bg-solid);
  border: 1px solid var(--bd);
}

/* Desktop Navigation */
.dt-nav {
  display: flex;
  gap: 5px;
  height: 100%;
  align-items: center;
}
.nav-item-dt {
  padding: 0 12px;
  height: 100%;
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--txt);
  opacity: 0.8;
  cursor: pointer;
  transition: 0.2s;
  position: relative;
  white-space: nowrap;
  text-decoration: none;
}
.nav-item-dt:hover,
.nav-item-dt.active {
  color: var(--pri);
  opacity: 1;
  background: rgba(128, 128, 128, 0.05);
}
.nav-item-dt.active {
  border-bottom: 3px solid var(--pri);
}
.nav-item-dt-link {
  color: inherit;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  height: 100%;
}
.nav-item-dt-link:visited {
  color: inherit;
}

/* Dropdown */
.nav-disclosure {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: var(--control-min-height);
  min-height: var(--control-min-height);
  padding: 0;
  color: inherit;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.nav-disclosure span {
  transition: transform 0.2s ease;
}
.nav-item-dt.open .nav-disclosure span {
  transform: rotate(180deg);
}
.nav-disclosure:focus-visible,
.nav-item-dt-link:focus-visible,
.dt-dropdown a:focus-visible {
  outline: 2px solid var(--pri);
  outline-offset: 2px;
}
.dt-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--card-bg);
  border: 1px solid var(--bd);
  min-width: 140px;
  flex-direction: column;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.1);
  visibility: hidden;
  opacity: 0;
  transform: translateY(-5px);
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
  display: flex;
  z-index: 100;
}
.dt-dropdown.visible {
  visibility: visible;
  opacity: 1;
  transform: translateY(0);
}
.dt-dropdown a {
  display: block;
  padding: 15px;
  color: var(--txt);
  opacity: 0.8;
  cursor: pointer;
  transition: 0.2s;
  font-size: 0.95rem;
  font-weight: bold;
  border-bottom: 1px solid var(--bd);
  text-decoration: none;
  white-space: nowrap;
}
.dt-dropdown a:last-child {
  border-bottom: none;
}
.dt-dropdown a:hover {
  background: rgba(255, 69, 0, 0.05);
  color: var(--pri);
  opacity: 1;
}

/* Right Controls */
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-btn {
  margin-right: 4px;
  font-size: 1rem;
  font-weight: bold;
}

.home-btn {
  font-size: 0.9rem;
  font-weight: 700;
}

.home-btn.active,
.member-btn.active {
  color: var(--pri);
  border-color: var(--pri);
  background: rgba(255, 88, 20, 0.08);
}

.theme-toggle {
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  color: var(--txt);
  display: flex;
  align-items: center;
  border: 1px solid var(--bd);
  padding: 4px 10px;
  border-radius: 20px;
  background: transparent;
  min-height: var(--control-min-height);
  line-height: 1;
}

/* ?? 獢???鋆???*/
.dt-install-btn {
  margin-right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.install-ico {
  flex: 0 0 auto;
}

.dt-only {
  display: block;
}

/* Reading Progress Bar */
.reading-progress-bar {
  position: fixed;
  top: calc(40px + env(safe-area-inset-top, 0px) + 50px);
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--bd);
  z-index: 999;
  transition: transform 0.2s ease-out;
}
.reading-progress-bar--nav-hidden {
  transform: translateY(-50px);
}
.progress-fill {
  height: 100%;
  background: var(--pri);
  width: 0%;
  transition: width 0.1s linear;
  box-shadow: 0 0 10px var(--pri-glow);
}

/* Mobile Menu Overlay & Responsive */
@media (max-width: 767px) {
  .dt-only {
    display: none !important;
  }
  .dt-nav {
    display: none;
  }

  /* 手機版：下載 App 鈕只留 icon（省頂欄空間） */
  .install-label {
    display: none;
  }
  .dt-install-btn {
    margin-right: 8px;
    padding-left: 10px;
    padding-right: 10px;
  }

  /* 手機：會員按鈕放右上（原亮色按鈕位置），亮/暗切換放最右（原漢堡位置） */
  .member-btn {
    margin-right: 0;
  }
  .home-btn {
    padding-left: 9px;
    padding-right: 9px;
    font-size: 0.82rem;
  }
  .theme-toggle {
    margin-right: -10px;
  }
}

@media (min-width: 768px) and (max-width: 1120px) {
  .nav-item-dt {
    padding-inline: 7px;
    font-size: 0.82rem;
  }
  .nav-right {
    gap: 6px;
  }
  .nav-wordmark,
  .install-label {
    display: none;
  }
  .dt-install-btn {
    margin-right: 0;
  }
}

/* Boutique shell v0 */
.sticky-nav {
  top: env(safe-area-inset-top, 0px);
  height: 64px;
  padding-inline: clamp(16px, 3vw, 44px);
  background: color-mix(in srgb, var(--card-bg-solid) 92%, transparent);
  border-bottom: 1px solid var(--bd);
  box-shadow: none;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.nav-container {
  max-width: 1380px;
  height: 64px;
}

.nav-left {
  gap: 12px;
}

.nav-logo-img {
  width: 34px;
  height: 34px;
  border: 0;
}

.dt-nav {
  gap: 2px;
}

.nav-item-dt {
  height: auto;
  padding: 10px 12px;
  color: var(--txt-muted);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.nav-item-dt:hover,
.nav-item-dt.active {
  color: var(--txt);
  background: transparent;
}

.nav-item-dt.active {
  border-bottom: 0;
}

.nav-item-dt.active::after {
  content: '';
  position: absolute;
  right: 12px;
  bottom: 4px;
  left: 12px;
  height: 1px;
  background: var(--pri);
}

.dt-dropdown {
  top: calc(100% + 17px);
  min-width: 176px;
  padding: 8px;
  background: var(--card-bg-solid);
  border-radius: 4px;
  box-shadow: 0 22px 55px rgba(18, 16, 12, 0.14);
}

.dt-dropdown a {
  padding: 11px 12px;
  color: var(--txt-muted);
  font-size: 0.78rem;
  font-weight: 600;
  border: 0;
}

.nav-right {
  gap: 2px;
}

.home-btn,
.member-btn {
  min-height: 44px;
  padding-inline: 11px;
  color: var(--txt-muted);
  background: transparent;
  border: 0;
  border-radius: 0;
  font-size: 0.76rem;
  font-weight: 600;
}

.home-btn.active,
.member-btn.active {
  color: var(--txt);
  background: transparent;
  border-color: transparent;
}

.theme-toggle {
  min-width: 46px;
  min-height: 44px;
  padding: 4px 8px;
  color: var(--txt-muted);
  border-radius: 2px;
  font-size: 0.72rem;
  font-weight: 600;
}

.reading-progress-bar {
  top: calc(env(safe-area-inset-top, 0px) + 64px);
  height: 1px;
}

.progress-fill {
  box-shadow: none;
}

@media (max-width: 767px) {
  .sticky-nav {
    padding-inline: 14px;
  }

  .nav-wordmark {
    display: block;
  }

  .home-btn {
    display: none !important;
  }

  .member-btn {
    padding-inline: 8px;
  }

  .theme-toggle {
    margin-right: 0;
  }
}
</style>
