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
    data() {
        return {
            // 控制手機版哪個選單展開 ('shop', 'tool', 'service', 或 null)
            mobileExpanded: null
        };
    },
    computed: {
        isShopActive() { return ['shop', 'breeders', 'merch'].includes(this.curTab); },
        isToolActive() { return ['calculator', 'genes', 'health', 'qs', 'hospital'].includes(this.curTab); },
        isServiceActive() { return ['about', 'care', 'articles', 'faq'].includes(this.curTab); }
    },
    watch: {
        // 當手機選單關閉時，重置展開狀態
        mobileMenuOpen(val) {
            if (!val) this.mobileExpanded = null;
        }
    },
    methods: {
        toggleMobileGroup(groupName) {
            // 如果點擊已展開的則關閉，否則展開新的 (自動關閉其他的)
            this.mobileExpanded = this.mobileExpanded === groupName ? null : groupName;
        },
        closeMobileMenu() {
            this.$emit('update:mobileMenuOpen', false);
        }
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
        <div class="mobile-menu-overlay" :class="{open: mobileMenuOpen}" v-if="!admin" style="position:fixed; top:90px; left:0; width:100%; height:calc(100vh - 90px); overflow-y:auto;">
            <router-link to="/" class="mm-item" style="text-decoration:none;" @click="closeMobileMenu">
                首頁
            </router-link>
            
            <!-- Group 1: Shop -->
            <div class="mm-group" :class="{active: mobileExpanded === 'shop' || (mobileExpanded === null && isShopActive)}">
                <div class="mm-summary" @click="toggleMobileGroup('shop')">
                    探索選購
                    <span class="mm-arrow">▼</span>
                </div>
                <div class="mm-anim-wrapper">
                    <div class="mm-anim-inner">
                        <router-link to="/shop" class="mm-sub" @click="closeMobileMenu">選購守宮</router-link>
                        <router-link to="/breeders" class="mm-sub" @click="closeMobileMenu">種群展示</router-link>
                        <router-link to="/merch" class="mm-sub" @click="closeMobileMenu">周邊商品</router-link>
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
                        <router-link to="/calculator" class="mm-sub" @click="closeMobileMenu">基因計算機</router-link>
                        <router-link to="/genes" class="mm-sub" @click="closeMobileMenu">基因圖鑑</router-link>
                        <router-link to="/health" class="mm-sub" @click="closeMobileMenu">健康評估</router-link>
                        <router-link to="/qs" class="mm-sub" @click="closeMobileMenu">飼養評估</router-link>
                        <router-link to="/hospital" class="mm-sub" @click="closeMobileMenu">特寵醫院</router-link>
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
                        <router-link to="/about" class="mm-sub" @click="closeMobileMenu">關於我們</router-link>
                        <router-link to="/care" class="mm-sub" @click="closeMobileMenu">飼養方式</router-link>
                        <router-link to="/articles" class="mm-sub" @click="closeMobileMenu">專欄文章</router-link>
                        <router-link to="/faq" class="mm-sub" @click="closeMobileMenu">常見問題</router-link>
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