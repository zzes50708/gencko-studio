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
@media (max-width: 768px) {
    /* 🌟 在手機版隱藏頂部的「我的專區」圖示 */
    .profile-link-dt {
        display: none !important;
    }
}
</style>