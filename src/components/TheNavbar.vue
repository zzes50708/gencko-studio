<script>
export default {
    name: 'TheNavbar',
    props: {
        navHidden: { type: Boolean, default: false },
        admin: { type: Boolean, default: false },
        isDayMode: { type: Boolean, default: true },
        mobileMenuOpen: { type: Boolean, default: false },
        logoUrl: { type: String, default: '' },
        // 用於判斷閱讀進度條顯示
        curTab: { type: String, default: '' },
        readingArticle: { type: Object, default: null },
        readingProgress: { type: Number, default: 0 }
    },
    emits: ['toggle-theme', 'update:mobileMenuOpen', 'logout', 'navigate', 'scroll-top'],
    methods: {
        // 統一處理導覽點擊
        handleNav(e, path) {
            e.preventDefault();
            this.$emit('navigate', path);
            this.$emit('update:mobileMenuOpen', false);
            // 關閉手機版選單的展開項目
            document.querySelectorAll('details.mm-details[open]').forEach(el => el.removeAttribute('open'));
        }
    }
}
</script>

<template>
    <div>
        <!-- Sticky Nav -->
        <div class="sticky-nav" :class="{'nav-hidden': navHidden}">
            <div class="nav-container">
                <a href="/" class="nav-left" @click.prevent="$emit('scroll-top')" style="cursor:pointer; display:flex; align-items:center; gap:10px; text-decoration:none;">
                    <img v-if="logoUrl" :src="logoUrl" style="height:40px; width:auto; display:block;">
                    <div style="font-weight:900; font-size:1.2rem; color:var(--pri); letter-spacing:1px; line-height:1;">GENCKO</div>
                </a>

                <div class="dt-nav" v-if="!admin">
                    <div class="nav-item-dt dropdown-hover">
                        探索選購 ▾
                        <div class="dt-dropdown">
                            <a href="/shop" @click="handleNav($event, '/shop')">選購守宮</a>
                            <a href="/breeders" @click="handleNav($event, '/breeders')">種群展示</a>
                            <a href="/merch" @click="handleNav($event, '/merch')">周邊商品</a>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover">
                        工具知識 ▾
                        <div class="dt-dropdown">
                            <a href="/calculator" @click="handleNav($event, '/calculator')">基因計算機</a>
                            <a href="/genes" @click="handleNav($event, '/genes')">基因圖鑑</a>
                            <a href="/health" @click="handleNav($event, '/health')">健康評估</a>
                            <a href="/qs" @click="handleNav($event, '/qs')">飼養評估</a>
                            <a href="/hospital" @click="handleNav($event, '/hospital')">特寵醫院</a>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover">
                        品牌服務 ▾
                        <div class="dt-dropdown">
                            <a href="/about" @click="handleNav($event, '/about')">關於我們</a>
                            <a href="/care" @click="handleNav($event, '/care')">飼養方式</a>
                            <a href="/articles" @click="handleNav($event, '/articles')">專欄文章</a>
                            <a href="/faq" @click="handleNav($event, '/faq')">常見問題</a>
                        </div>
                    </div>
                </div>

                <div class="nav-right">
                    <div class="theme-toggle" @click="$emit('toggle-theme')" style="cursor:pointer;font-size:1rem;font-weight:bold;margin-right:15px;color:var(--txt);display:flex;align-items:center;border:1px solid var(--bd);padding:4px 10px;border-radius:20px;">{{ isDayMode ? '夜間' : '日間' }}</div>
                    <div class="hamburger" v-if="!admin" @click="$emit('update:mobileMenuOpen', !mobileMenuOpen)">☰</div>
                    <button v-if="admin" @click="$emit('logout')" class="nav-btn-logout">登出</button>
                </div>
            </div>

            <!-- Mobile Menu -->
            <div class="mobile-menu-overlay" :class="{open: mobileMenuOpen}" v-if="!admin" style="position:absolute; top:100%; height:calc(100vh - 50px);">
                <a href="/" class="mm-item" @click="handleNav($event, '/')" style="text-decoration:none;display:block;">首頁</a>
                
                <details class="mm-details">
                    <summary class="mm-summary">探索選購 ▾</summary>
                    <div class="mm-dropdown-content">
                        <a href="/shop" class="mm-sub" @click="handleNav($event, '/shop')" style="display:block;text-decoration:none;">選購守宮</a>
                        <a href="/breeders" class="mm-sub" @click="handleNav($event, '/breeders')" style="display:block;text-decoration:none;">種群展示</a>
                        <a href="/merch" class="mm-sub" @click="handleNav($event, '/merch')" style="display:block;text-decoration:none;">周邊商品</a>
                    </div>
                </details>

                <details class="mm-details">
                    <summary class="mm-summary">工具知識 ▾</summary>
                    <div class="mm-dropdown-content">
                        <a href="/calculator" class="mm-sub" @click="handleNav($event, '/calculator')" style="display:block;text-decoration:none;">基因計算機</a>
                        <a href="/genes" class="mm-sub" @click="handleNav($event, '/genes')" style="display:block;text-decoration:none;">基因圖鑑</a>
                        <a href="/health" class="mm-sub" @click="handleNav($event, '/health')" style="display:block;text-decoration:none;">健康評估</a>
                        <a href="/qs" class="mm-sub" @click="handleNav($event, '/qs')" style="display:block;text-decoration:none;">飼養評估</a>
                        <a href="/hospital" class="mm-sub" @click="handleNav($event, '/hospital')" style="display:block;text-decoration:none;">特寵醫院</a>
                    </div>
                </details>

                <details class="mm-details">
                    <summary class="mm-summary">品牌服務 ▾</summary>
                    <div class="mm-dropdown-content">
                        <a href="/about" class="mm-sub" @click="handleNav($event, '/about')" style="display:block;text-decoration:none;">關於我們</a>
                        <a href="/care" class="mm-sub" @click="handleNav($event, '/care')" style="display:block;text-decoration:none;">飼養方式</a>
                        <a href="/articles" class="mm-sub" @click="handleNav($event, '/articles')" style="display:block;text-decoration:none;">專欄文章</a>
                        <a href="/faq" class="mm-sub" @click="handleNav($event, '/faq')" style="display:block;text-decoration:none;">常見問題</a>
                    </div>
                </details>
            </div>
            
            <div v-if="curTab==='articles' && readingArticle" class="reading-progress-bar">
                <div class="progress-fill" :style="{width: readingProgress + '%'}"></div>
            </div>
        </div>
    </div>
</template>