<script setup>
import { ref, computed, watch } from 'vue'
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
const isShopActive = computed(() => ['shop', 'auction', 'breeders', 'merch'].includes(props.curTab))
const isToolActive = computed(() => ['calculator', 'genes', 'health', 'qs', 'hospital'].includes(props.curTab))
const isArticlesActive = computed(() => ['articles', 'care', 'faq'].includes(props.curTab))

</script>

<template>
    <div>
        <!-- Sticky Nav -->
        <div class="sticky-nav" :class="{'nav-hidden': navHidden}">
            <div class="nav-container">
                <!-- Logo -->
                <NuxtLink to="/" class="nav-left" @click="$emit('scroll-top')" style="cursor:pointer; display:flex; align-items:center; gap:8px; text-decoration:none;">
                    <img v-if="store.logoUrl" :src="store.logoUrl" class="nav-logo-img" alt="Gencko Studio Logo" />
                    <div style="font-weight:900; font-size:1.2rem; color:var(--pri); letter-spacing:1px; line-height:1;">GENCKO</div>
                </NuxtLink>

                <!-- Desktop Menu -->
                <div class="dt-nav">
                    <div class="nav-item-dt dropdown-hover" :class="{active: isArticlesActive}">
                        <NuxtLink to="/articles" class="nav-item-dt-link" aria-label="專欄文章">專欄文章</NuxtLink> ▾
                        <div class="dt-dropdown">
                            <NuxtLink to="/care">飼養指南</NuxtLink>
                            <NuxtLink to="/articles">文章列表</NuxtLink>
                            <NuxtLink to="/faq">常見問題</NuxtLink>
                        </div>
                    </div>

                    <div class="nav-item-dt dropdown-hover" :class="{active: isShopActive}">
                        <NuxtLink to="/shop" class="nav-item-dt-link" aria-label="探索選購">探索選購</NuxtLink> ▾
                        <div class="dt-dropdown">
                            <NuxtLink to="/shop">選購守宮</NuxtLink>
                            <NuxtLink to="/auction">線上競標</NuxtLink>
                            <NuxtLink to="/breeders">種群展示</NuxtLink>
                            <NuxtLink to="/merch">周邊商品</NuxtLink>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover" :class="{active: isToolActive}">
                        <NuxtLink to="/genes" class="nav-item-dt-link" aria-label="工具知識">工具知識</NuxtLink> ▾
                        <div class="dt-dropdown">
                            <NuxtLink to="/genes">基因圖鑑</NuxtLink>
                            <NuxtLink to="/calculator">基因計算機</NuxtLink>
                            <NuxtLink to="/hospital">特寵醫院</NuxtLink>
                            <NuxtLink to="/health">健康評估</NuxtLink>
                            <NuxtLink to="/qs">飼養前評估</NuxtLink>
                        </div>
                    </div>
                </div>

                <!-- Right Controls -->
                <div class="nav-right">
                    <button v-if="store.canInstall" @click="store.installApp" class="btn-app btn-app--secondary btn-app--sm btn-app--pill dt-install-btn dt-only">
                        下載 App
                    </button>
                    
                    <NuxtLink
                        to="/profile"
                        class="btn-app btn-app--ghost btn-app--sm btn-app--pill member-btn"
                        style="text-decoration:none; display:flex; align-items:center;"
                        title="會員"
                    >會員</NuxtLink>
                    
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
        <div v-if="curTab==='articles' && readingArticle" class="reading-progress-bar">
            <div class="progress-fill" :style="{width: readingProgress + '%'}"></div>
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
    transition: transform 0.3s ease;
}
.sticky-nav.nav-hidden { transform: translateY(-100%); }

.nav-container { max-width: 1300px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; height: 50px; }
.nav-left { display: flex; align-items: center; gap: 10px; }
.nav-logo-img { width: 36px; height: 36px; border-radius: 999px; object-fit: cover; display: block; background: var(--card-bg-solid); border: 1px solid var(--bd); }

/* Desktop Navigation */
.dt-nav { display: flex; gap: 5px; height: 100%; align-items: center; }
.nav-item-dt { padding: 0 12px; height: 100%; display: flex; align-items: center; font-size: 0.95rem; font-weight: 700; color: var(--txt); opacity: 0.8; cursor: pointer; transition: 0.2s; position: relative; white-space: nowrap; text-decoration: none; }
.nav-item-dt:hover, .nav-item-dt.active { color: var(--pri); opacity: 1; background: rgba(128, 128, 128, 0.05); }
.nav-item-dt.active { border-bottom: 3px solid var(--pri); }
.nav-item-dt-link { color: inherit; text-decoration: none; display: inline-flex; align-items: center; height: 100%; }
.nav-item-dt-link:visited { color: inherit; }

/* Dropdown */
.dropdown-hover { position: relative; }
.dt-dropdown { position: absolute; top: 100%; left: 0; background: var(--card-bg); border: 1px solid var(--bd); min-width: 140px; flex-direction: column; border-radius: 0 0 8px 8px; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1); visibility: hidden; opacity: 0; transform: translateY(-5px); transition: all 0.2s ease; display: flex; z-index: 100; }
.dropdown-hover:hover .dt-dropdown { visibility: visible; opacity: 1; transform: translateY(0); }
.dt-dropdown a { display: block; padding: 15px; color: var(--txt); opacity: 0.8; cursor: pointer; transition: 0.2s; font-size: 0.95rem; font-weight: bold; border-bottom: 1px solid var(--bd); text-decoration: none; white-space: nowrap; }
.dt-dropdown a:last-child { border-bottom: none; }
.dt-dropdown a:hover { background: rgba(255, 69, 0, 0.05); color: var(--pri); opacity: 1; }

/* Right Controls */
.nav-right { display: flex; align-items: center; gap: 12px; }

.member-btn { margin-right: 4px; font-size: 1rem; font-weight: bold; }

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
    min-height: 32px;
    line-height: 1;
}

/* ?? 獢???鋆???*/
.dt-install-btn {
    margin-right: 10px;
}

.dt-only { display: block; }

/* Reading Progress Bar */
.reading-progress-bar { position: fixed; top: calc(40px + env(safe-area-inset-top, 0px) + 50px); left: 0; width: 100%; height: 2px; background: var(--bd); z-index: 999; }
.progress-fill { height: 100%; background: var(--pri); width: 0%; transition: width 0.1s linear; box-shadow: 0 0 10px var(--pri-glow); }

/* Mobile Menu Overlay & Responsive */
@media (max-width: 768px) {
    .dt-only { display: none !important; }
    .dt-nav { display: none; }

    /* 手機：會員按鈕放右上（原亮色按鈕位置），亮/暗切換放最右（原漢堡位置） */
    .member-btn { margin-right: 0; }
    .theme-toggle { margin-right: -10px; }
}
</style>

