<script>
export default {
    name: 'TheNavbar',
    props: {
        navHidden: { type: Boolean, default: false },
        admin: { type: Boolean, default: false },
        isDayMode: { type: Boolean, default: true },
        mobileMenuOpen: { type: Boolean, default: false },
        logoUrl: { type: String, default: '' },
        curTab: { type: String, default: '' },
        readingArticle: { type: Object, default: null },
        readingProgress: { type: Number, default: 0 }
    },
    emits: ['toggle-theme', 'update:mobileMenuOpen', 'logout', 'scroll-top'],
    computed: {
        // 定義各大類別包含的頁面 key (對應 App.vue 的 curTab)
        isShopActive() { return ['shop', 'breeders', 'merch'].includes(this.curTab); },
        isToolActive() { return ['calculator', 'genes', 'health', 'qs', 'hospital'].includes(this.curTab); },
        isServiceActive() { return ['about', 'care', 'articles', 'faq'].includes(this.curTab); }
    }
}
</script>

<template>
    <div>
        <!-- Sticky Nav -->
        <div class="sticky-nav" :class="{'nav-hidden': navHidden}">
            <div class="nav-container">
                <!-- Logo -->
                <router-link to="/" class="nav-left" @click="$emit('scroll-top')" style="cursor:pointer; display:flex; align-items:center; gap:10px; text-decoration:none;">
                    <img v-if="logoUrl" :src="logoUrl" style="height:40px; width:auto; display:block;">
                    <div style="font-weight:900; font-size:1.2rem; color:var(--pri); letter-spacing:1px; line-height:1;">GENCKO</div>
                </router-link>

                <!-- Desktop Menu -->
                <div class="dt-nav" v-if="!admin">
                    <div class="nav-item-dt dropdown-hover" :class="{active: isShopActive}">
                        探索選購 ▾
                        <div class="dt-dropdown">
                            <router-link to="/shop">選購守宮</router-link>
                            <router-link to="/breeders">種群展示</router-link>
                            <router-link to="/merch">周邊商品</router-link>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover" :class="{active: isToolActive}">
                        工具知識 ▾
                        <div class="dt-dropdown">
                            <router-link to="/calculator">基因計算機</router-link>
                            <router-link to="/genes">基因圖鑑</router-link>
                            <router-link to="/health">健康評估</router-link>
                            <router-link to="/qs">飼養評估</router-link>
                            <router-link to="/hospital">特寵醫院</router-link>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover" :class="{active: isServiceActive}">
                        品牌服務 ▾
                        <div class="dt-dropdown">
                            <router-link to="/about">關於我們</router-link>
                            <router-link to="/care">飼養方式</router-link>
                            <router-link to="/articles">專欄文章</router-link>
                            <router-link to="/faq">常見問題</router-link>
                        </div>
                    </div>
                </div>

                <!-- Right Controls -->
                <div class="nav-right">
                    <div class="theme-toggle" @click="$emit('toggle-theme')" style="cursor:pointer;font-size:1rem;font-weight:bold;margin-right:15px;color:var(--txt);display:flex;align-items:center;border:1px solid var(--bd);padding:4px 10px;border-radius:20px;">
                        {{ isDayMode ? '夜間' : '日間' }}
                    </div>
                    <div class="hamburger" v-if="!admin" @click="$emit('update:mobileMenuOpen', !mobileMenuOpen)">☰</div>
                    <button v-if="admin" @click="$emit('logout')" class="nav-btn-logout">登出</button>
                </div>
            </div>
        </div>

        <!-- Mobile Menu -->
        <!-- 改為 fixed 並設定 top:90px (40px跑馬燈 + 50px導覽列)，確保隨螢幕移動 -->
        <div class="mobile-menu-overlay" :class="{open: mobileMenuOpen}" v-if="!admin" style="position:fixed; top:90px; left:0; width:100%; height:calc(100vh - 90px); overflow-y:auto;">
            <router-link to="/" class="mm-item" style="text-decoration:none;display:block;" @click="$emit('update:mobileMenuOpen', false)">首頁</router-link>
            
            <details class="mm-details" :open="isShopActive">
                <summary class="mm-summary">探索選購 ▾</summary>
                <div class="mm-dropdown-content">
                    <router-link to="/shop" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">選購守宮</router-link>
                    <router-link to="/breeders" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">種群展示</router-link>
                    <router-link to="/merch" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">周邊商品</router-link>
                </div>
            </details>

            <details class="mm-details" :open="isToolActive">
                <summary class="mm-summary">工具知識 ▾</summary>
                <div class="mm-dropdown-content">
                    <router-link to="/calculator" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">基因計算機</router-link>
                    <router-link to="/genes" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">基因圖鑑</router-link>
                    <router-link to="/health" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">健康評估</router-link>
                    <router-link to="/qs" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">飼養評估</router-link>
                    <router-link to="/hospital" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">特寵醫院</router-link>
                </div>
            </details>

            <details class="mm-details" :open="isServiceActive">
                <summary class="mm-summary">品牌服務 ▾</summary>
                <div class="mm-dropdown-content">
                    <router-link to="/about" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">關於我們</router-link>
                    <router-link to="/care" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">飼養方式</router-link>
                    <router-link to="/articles" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">專欄文章</router-link>
                    <router-link to="/faq" class="mm-sub" style="display:block;text-decoration:none;" @click="$emit('update:mobileMenuOpen', false)">常見問題</router-link>
                </div>
            </details>
        </div>
        
        <!-- Reading Progress Bar -->
        <div v-if="curTab==='articles' && readingArticle" class="reading-progress-bar">
            <div class="progress-fill" :style="{width: readingProgress + '%'}"></div>
        </div>
    </div>
</template>