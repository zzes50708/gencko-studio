<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
    navHidden: { type: Boolean, default: false },
    isDayMode: { type: Boolean, default: true },
    mobileMenuOpen: { type: Boolean, default: false },
    logoUrl: { type: String, default: '' },
    curTab: { type: String, default: '' },
    readingArticle: { type: Object, default: null },
    readingProgress: { type: Number, default: 0 }
})

const emit = defineEmits(['toggle-theme', 'update:mobileMenuOpen', 'scroll-top'])

const mobileExpanded = ref(null)

const isShopActive = computed(() =>['shop', 'auction', 'breeders', 'merch'].includes(props.curTab))
const isToolActive = computed(() =>['calculator', 'genes', 'health', 'qs', 'hospital'].includes(props.curTab))
const isServiceActive = computed(() =>['about', 'care', 'articles', 'faq'].includes(props.curTab))

watch(() => props.mobileMenuOpen, (val) => {
    if (!val) mobileExpanded.value = null
})

const toggleMobileGroup = (groupName) => {
    mobileExpanded.value = mobileExpanded.value === groupName ? null : groupName
}

const closeMobileMenu = () => {
    emit('update:mobileMenuOpen', false)
}
</script>

<template>
    <div>
        <!-- Sticky Nav -->
        <div class="sticky-nav" :class="{'nav-hidden': navHidden}">
            <div class="nav-container">
                <!-- Logo -->
                <NuxtLink to="/" class="nav-left" @click="$emit('scroll-top')" style="cursor:pointer; display:flex; align-items:center; gap:10px; text-decoration:none;">
                    <img v-if="logoUrl" :src="logoUrl" style="height:40px; width:auto; display:block;">
                    <div style="font-weight:900; font-size:1.2rem; color:var(--pri); letter-spacing:1px; line-height:1;">GENCKO</div>
                </NuxtLink>

                <!-- Desktop Menu -->
                <div class="dt-nav">
                    <div class="nav-item-dt dropdown-hover" :class="{active: isServiceActive}">
                        品牌服務 ▾
                        <div class="dt-dropdown">
                            <NuxtLink to="/about">關於我們</NuxtLink>
                            <NuxtLink to="/care">飼養方式</NuxtLink>
                            <NuxtLink to="/articles">專欄文章</NuxtLink>
                            <NuxtLink to="/faq">常見問題</NuxtLink>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover" :class="{active: isShopActive}">
                        探索選購 ▾
                        <div class="dt-dropdown">
                            <NuxtLink to="/shop">選購守宮</NuxtLink>
                            <NuxtLink to="/auction">線上競標</NuxtLink>
                            <NuxtLink to="/breeders">種群展示</NuxtLink>
                            <NuxtLink to="/merch">周邊商品</NuxtLink>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover" :class="{active: isToolActive}">
                        工具知識 ▾
                        <div class="dt-dropdown">
                            <NuxtLink to="/calculator">基因計算機</NuxtLink>
                            <NuxtLink to="/genes">基因圖鑑</NuxtLink>
                            <NuxtLink to="/health">健康評估</NuxtLink>
                            <NuxtLink to="/qs">飼養評估</NuxtLink>
                            <NuxtLink to="/hospital">特寵醫院</NuxtLink>
                        </div>
                    </div>                    
                </div>

                <!-- Right Controls -->
                <div class="nav-right">
                    <!-- 🌟 增加 profile-link-dt 類別，在手機版隱藏此圖示以交給底部導航列 -->
                    <NuxtLink to="/profile" class="profile-link-dt" style="text-decoration:none; margin-right:15px; font-size:1.2rem; display:flex; align-items:center;" title="我的專區">👤</NuxtLink>
                    <div class="theme-toggle" @click="$emit('toggle-theme')" style="cursor:pointer;font-size:1rem;font-weight:bold;margin-right:15px;color:var(--txt);display:flex;align-items:center;border:1px solid var(--bd);padding:4px 10px;border-radius:20px;">
                        {{ isDayMode ? '夜間' : '日間' }}
                    </div>
                    <div class="hamburger" @click="$emit('update:mobileMenuOpen', !mobileMenuOpen)">☰</div>
                </div>
            </div>
        </div>

        <!-- Mobile Menu -->
        <!-- 🌟 增加 padding-bottom: 100px 確保滑到底部時不會被底部導航列擋住 -->
        <div class="mobile-menu-overlay" :class="{open: mobileMenuOpen}" style="position:fixed; top:90px; left:0; width:100%; height:calc(100vh - 90px); overflow-y:auto; padding-bottom: 100px;">
            <!-- 🌟 已移除首頁與我的專區，簡化手機選單 -->

            <!-- Group 1: Shop -->
            <div class="mm-group" :class="{active: mobileExpanded === 'shop' || (mobileExpanded === null && isShopActive)}">
                <div class="mm-summary" @click="toggleMobileGroup('shop')">
                    探索選購
                    <span class="mm-arrow">▼</span>
                </div>
                <div class="mm-anim-wrapper">
                    <div class="mm-anim-inner">
                        <NuxtLink to="/shop" class="mm-sub" @click="closeMobileMenu">選購守宮</NuxtLink>
                        <NuxtLink to="/auction" class="mm-sub" @click="closeMobileMenu">線上競標</NuxtLink>
                        <NuxtLink to="/breeders" class="mm-sub" @click="closeMobileMenu">種群展示</NuxtLink>
                        <NuxtLink to="/merch" class="mm-sub" @click="closeMobileMenu">周邊商品</NuxtLink>
                    </div>
                </div>
            </div>

            <!-- Group 2: Tools -->
            <div class="mm-group" :class="{active: mobileExpanded === 'tool' || (mobileExpanded === null && isToolActive)}">
                <div class="mm-summary" @click="toggleMobileGroup('tool')">
                    工具知識
                    <span class="mm-arrow">▼</span>
                </div>
                <div class="mm-anim-wrapper">
                    <div class="mm-anim-inner">
                        <NuxtLink to="/calculator" class="mm-sub" @click="closeMobileMenu">基因計算機</NuxtLink>
                        <NuxtLink to="/genes" class="mm-sub" @click="closeMobileMenu">基因圖鑑</NuxtLink>
                        <NuxtLink to="/health" class="mm-sub" @click="closeMobileMenu">健康評估</NuxtLink>
                        <NuxtLink to="/qs" class="mm-sub" @click="closeMobileMenu">飼養評估</NuxtLink>
                        <NuxtLink to="/hospital" class="mm-sub" @click="closeMobileMenu">特寵醫院</NuxtLink>
                    </div>
                </div>
            </div>

            <!-- Group 3: Service -->
            <div class="mm-group" :class="{active: mobileExpanded === 'service' || (mobileExpanded === null && isServiceActive)}">
                <div class="mm-summary" @click="toggleMobileGroup('service')">
                    品牌服務
                    <span class="mm-arrow">▼</span>
                </div>
                <div class="mm-anim-wrapper">
                    <div class="mm-anim-inner">
                        <NuxtLink to="/about" class="mm-sub" @click="closeMobileMenu">關於我們</NuxtLink>
                        <NuxtLink to="/care" class="mm-sub" @click="closeMobileMenu">飼養方式</NuxtLink>
                        <NuxtLink to="/articles" class="mm-sub" @click="closeMobileMenu">專欄文章</NuxtLink>
                        <NuxtLink to="/faq" class="mm-sub" @click="closeMobileMenu">常見問題</NuxtLink>
                    </div>
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
/*
  [局部樣式與全域整合]
  已將原本散落於 style.css 的導覽列專屬樣式抽回 TheNavbar.vue。
  全面導入 CSS 變數，解決日夜模式強制切換的色碼衝突。
*/

/* Sticky Navigation */
.sticky-nav { 
    position: fixed; 
    top: calc(40px + env(safe-area-inset-top, 0px)); 
    left: 0; 
    width: 100%; 
    height: 50px; 
    z-index: 1000; 
    background: var(--card-bg); 
    backdrop-filter: blur(10px); 
    -webkit-backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--bd); 
    padding: 0 15px; 
    box-shadow: 0 4px 10px rgba(0,0,0,0.05); 
    transition: transform 0.3s ease;
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
}

.nav-item-dt:hover, .nav-item-dt.active { 
    color: var(--pri); 
    opacity: 1;
    background: rgba(128, 128, 128, 0.05); 
}

.nav-item-dt.active { 
    border-bottom: 3px solid var(--pri); 
}

/* Dropdown */
.dropdown-hover { position: relative; }
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
    box-shadow: 0 5px 20px rgba(0,0,0,0.1); 
    visibility: hidden; 
    opacity: 0; 
    transform: translateY(-5px); 
    transition: all 0.2s ease; 
    display: flex; 
    z-index: 100; 
}
.dropdown-hover:hover .dt-dropdown { 
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
.dt-dropdown a:last-child { border-bottom: none; }
.dt-dropdown a:hover { 
    background: rgba(255, 69, 0, 0.05); 
    color: var(--pri); 
    opacity: 1;
}

/* Right Controls */
.nav-right { display: flex; align-items: center; gap: 12px; }
.hamburger { display: none; }

/* Reading Progress Bar */
.reading-progress-bar { 
    position: absolute; 
    bottom: 0; left: 0; 
    width: 100%; 
    height: 2px; 
    background: var(--bd); 
}
.progress-fill { 
    height: 100%; 
    background: var(--pri); 
    width: 0%; 
    transition: width 0.1s linear; 
    box-shadow: 0 0 10px var(--pri-glow);
}

/* 🌟 Mobile Menu Overlay & Responsive */
@media (max-width: 768px) {
    /* 在手機版隱藏頂部的「我的專區」圖示，交給底部導航列 */
    .profile-link-dt {
        display: none !important;
    }

    .dt-nav { display: none; }
    
    .hamburger { 
        display: block; 
        font-size: 1.6rem; 
        cursor: pointer; 
        color: var(--txt); 
        padding: 10px; 
        margin-right: -10px; 
    }

    .mobile-menu-overlay { 
        display: flex; 
        position: fixed; 
        top: calc(90px + env(safe-area-inset-top, 0px)); 
        left: 0; 
        width: 100%; 
        height: calc(100vh - 90px - env(safe-area-inset-top, 0px)); 
        background: var(--card-bg); 
        backdrop-filter: blur(15px); 
        -webkit-backdrop-filter: blur(15px);
        z-index: 2000; 
        transform: translateX(100%); 
        transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        padding: 5px 15px 100px 15px; 
        overflow-y: auto; 
        flex-direction: column; 
        gap: 0; 
        border-top: 1px solid var(--bd); 
        box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
    }
    .mobile-menu-overlay.open { transform: translateX(0); }

    .mm-summary { 
        font-size: 1.1rem; 
        font-weight: bold; 
        padding: 15px 10px; 
        border-bottom: 1px solid var(--bd); 
        color: var(--txt); 
        cursor: pointer; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
    }
    .mm-group.active .mm-summary { 
        color: var(--pri); 
        border-bottom: none; 
    }
    
    .mm-arrow { 
        transition: transform 0.3s ease; 
        font-size: 0.8rem; 
        opacity: 0.6; 
    }
    .mm-group.active .mm-arrow { 
        transform: rotate(180deg); 
        opacity: 1; 
        color: var(--pri); 
    }

    .mm-anim-wrapper { 
        display: grid; 
        grid-template-rows: 0fr; 
        transition: grid-template-rows 0.3s ease-out; 
    }
    .mm-group.active .mm-anim-wrapper { 
        grid-template-rows: 1fr; 
    }
    .mm-anim-inner { 
        overflow: hidden; 
        background: rgba(128, 128, 128, 0.05); 
        border-radius: 8px; 
    }

    .mm-sub { 
        display: block; 
        padding: 15px 20px; 
        color: var(--txt); 
        opacity: 0.8;
        font-size: 1rem; 
        border-bottom: 1px dashed var(--bd); 
        cursor: pointer; 
        font-weight: bold; 
        text-decoration: none; 
        transition: 0.2s; 
    }
    .mm-sub:last-child { border-bottom: none; }
    .mm-sub:active, .mm-summary:active { 
        background: rgba(255, 69, 0, 0.1); 
        color: var(--pri); 
        opacity: 1;
    }
}
</style>