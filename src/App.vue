<script>
import { _supabase } from './supabase.js';
import { store } from './store.js';

// 引入各功能模組
import { shopLogic } from './modules/shop.js';
import { contentLogic } from './modules/content.js';
import { adminLogic } from './modules/admin.js';
import { toolsLogic } from './modules/tools.js';
import { calculatorLogic } from './features/calculator/index.js';
import { FAQ_DATA } from './data/faq.js';
import GENES_DB from './data/genes.json'; 

export default {
    mixins: [shopLogic, contentLogic, adminLogic, toolsLogic, calculatorLogic],
    
    // --- 1. Data (必須獨立存在) ---
    data() {
        return {
            // [修正] 直接從 import 載入資料
            db: GENES_DB || {},

            // 基因計算機狀態
            calc_sp: '豹紋守宮',
            calc_male: [],
            calc_female: [],
            calc_result: null,
            calc_modalOpen: false,
            calc_activeInfo: null,
            calc_activeSelector: null,
            calc_expandType: null,
            calc_expandGroup: null,

            // 其他狀態
            readingProgress: 0,
            searchTimer: null
        };
    },

    // --- 2. Computed ---
    computed: {
        loading: { get() { return store.loading; }, set(v) { store.loading = v; } },
        isDayMode: { get() { return store.isDayMode; }, set(v) { store.isDayMode = v; } },
        admin: { get() { return store.admin; }, set(v) { store.admin = v; } },
        curTab: { get() { return store.curTab; }, set(v) { store.curTab = v; } },
        navHidden: { get() { return store.navHidden; }, set(v) { store.navHidden = v; } },
        mobileMenuOpen: { get() { return store.mobileMenuOpen; }, set(v) { store.mobileMenuOpen = v; } },
        showToast: { get() { return store.showToast; }, set(v) { store.showToast = v; } },
        lightboxItem: { get() { return store.lightboxItem; }, set(v) { store.lightboxItem = v; } },
        
        viewingGene() { return store.viewingGene; },
        readingArticle() { return store.readingArticle; },

        inv() { return store.inv; },
        merchList() { return store.merchList; },
        articlesList() { return store.articlesList; },
        genePages() { return store.genePages; },
        marqueeList() { return store.marqueeList; },
        wishlist() { return store.wishlist; },
        history() { return store.history; },
        hotList: { get() { return store.hotList; }, set(v) { store.hotList = v; } },
        
        careImg() { return store.careImg; },
        aboutImg() { return store.aboutImg; },
        logoUrl() { return store.logoUrl; },
        lineLink() { return store.lineLink; },
        faqList() { return FAQ_DATA; },
        
        geneSpecies: { get() { return store.geneSpecies || '豹紋守宮'; }, set(v) { store.geneSpecies = v; } }
    },

    // --- 3. Watch ---
    watch: {
        curTab() { this.$nextTick(() => this.updateMeta()); },
        'store.readingArticle'() { this.$nextTick(() => this.updateMeta()); },
        targetProductId() { this.$nextTick(() => this.updateMeta()); },
        'store.viewingGene'() { this.$nextTick(() => this.updateMeta()); },
        calc_male: { deep: true, handler: 'calc_run' },
        calc_female: { deep: true, handler: 'calc_run' },
        calc_sp() { 
            this.calc_male = []; this.calc_female = []; this.calc_result = null; 
            this.calc_activeSelector = null;
        }
    },

    // --- 4. Mounted (必須獨立存在，不可以包含 data) ---
    mounted() {
        this.initTheme();

        // [注意] 這裡不需要再 fetch genes.json 了，因為上方已經 import 並且在 data() 設定了

        this.loadDataFromAPI();

        this.resolveRoute(window.location.pathname);
        window.addEventListener('popstate', () => {
            if (this.lightboxItem) this.lightboxItem = null;
            else this.resolveRoute(window.location.pathname);
        });

        document.addEventListener('click', (e) => {
            this.handleLinkClick(e);
            if (this.calc_activeSelector && !e.target.closest('.calc-dropdown-container')) {
                this.calc_activeSelector = null;
                this.calc_expandType = null;
                this.calc_expandGroup = null;
            }
        });

        const savedWish = localStorage.getItem('gencko_wishlist');
        if(savedWish) store.wishlist = JSON.parse(savedWish);
        const savedHist = localStorage.getItem('gencko_history');
        if(savedHist) store.history = JSON.parse(savedHist);
        
        // 移除 Loader
        setTimeout(() => { 
            const loader = document.getElementById('loader');
            if(loader) loader.classList.remove('active');
        }, 800);

        window.addEventListener('scroll', this.handleScroll);
    },

    // --- 5. Methods ---
    methods: {
        async loadDataFromAPI() {
            store.loading = true;
            try {
                let { data: invData, error: invErr } = await _supabase.from('inventory').select('*');
                if(invErr) throw invErr;
                
                store.inv = invData.map(i => ({
                    ID: String(i.id || '').trim(),
                    Source: i.source,
                    Species: i.species,
                    Morph: i.morph,
                    Genes: i.genes ? JSON.parse(i.genes) : [],
                    GenderType: i.gender_type,
                    GenderValue: i.gender_value,
                    Birthday: i.birthday,
                    CostPrice: i.cost_price,
                    ListingPrice: i.listing_price,
                    SoldPrice: i.sold_price,
                    Status: i.status,
                    Note: i.note,
                    ImageURL: i.image_url,
                    IsHot: String(i.is_hot || '').trim(),
                    CreatedDate: i.created_at || new Date().toISOString()
                }));

                this.initHotPicks();

                let { data: merchData } = await _supabase.from('merchandise').select('*');
                if(merchData) {
                    store.merchList = merchData.map(m => ({
                        ItemID: m.item_id,
                        Name: m.name,
                        Description: m.description,
                        Price: m.price,
                        ImageURL: m.image_url,
                        Category: m.category,
                        Available: m.available,
                        ExternalLink: m.external_link
                    }));
                }

                let { data: artData } = await _supabase.from('articles').select('*');
                if(artData) {
                    store.articlesList = artData
                        .filter(a => a.status === 'Published')
                        .map(a => ({
                            ID: a.id,
                            Title: a.title,
                            Category: a.category,
                            Summary: a.summary,
                            Content: a.content,
                            ImageURL: a.image_url,
                            Author: a.author,
                            PublishDate: a.publish_date
                        }))
                        .reverse();
                }

                let { data: geneData } = await _supabase.from('genetic_pages').select('*');
                if(geneData) {
                    store.genePages = geneData.map(g => ({
                        Name: g.name,
                        ImageURL: g.image_url,
                        Warning: g.warning,
                        Brief: g.brief,
                        Detail: g.detail,
                        Source: g.source
                    }));
                }

                let { data: configData } = await _supabase.from('config').select('*');
                if(configData) {
                    store.marqueeList = configData.map(c => ({ text: c.text, url: c.url }));
                }

            } catch (e) {
                console.error('Supabase 讀取失敗:', e);
            } finally {
                store.loading = false;
            }
        },
        initHotPicks() { store.hotList = store.inv.filter(i => i.IsHot === 'Hot'); },
        login(){ store.login(); },
        openLightbox(i) { 
            store.lightboxItem = i; 
            history.pushState({ lightbox: true }, ''); 
        },
        closeLightbox() { 
            if(history.state?.lightbox) history.back(); 
            else store.lightboxItem = null; 
        },
        initTheme() {
            const savedTheme = localStorage.getItem('gencko_theme');
            if(savedTheme === 'dark') { this.isDayMode = false; document.body.classList.remove('day-mode'); }
            else { this.isDayMode = true; document.body.classList.add('day-mode'); }
        },
        toggleTheme() {
            this.isDayMode = !this.isDayMode;
            if(this.isDayMode) document.body.classList.add('day-mode');
            else document.body.classList.remove('day-mode');
            localStorage.setItem('gencko_theme', this.isDayMode ? 'light' : 'dark');
        },
        resolveRoute(path) {
            const cleanPath = path.replace(/\/+$/, '') || '/';
            if (cleanPath === '/calculator') this.curTab = 'calculator';
            else if (cleanPath === '/') this.curTab = 'home';
            else if (cleanPath === '/shop') this.curTab = 'shop';
            else if (cleanPath.startsWith('/product/')) {
                this.targetProductId = cleanPath.split('/')[2];
                this.curTab = 'product_detail';
            } else if (cleanPath === '/articles') {
                this.curTab = 'articles';
                store.readingArticle = null;
            } else if (cleanPath.startsWith('/articles/')) {
                const id = cleanPath.split('/')[2];
                this.curTab = 'articles';
                if(store.articlesList.length) {
                    const art = store.articlesList.find(a => a.ID === id);
                    if(art) store.readingArticle = art;
                }
            } else if (cleanPath === '/genes') {
                this.curTab = 'genes';
                store.viewingGene = null;
            } else if (cleanPath.startsWith('/genes/')) {
                const name = decodeURIComponent(cleanPath.split('/')[2]);
                this.curTab = 'gene_detail';
                this.setViewingGene(name);
            } else if (cleanPath === '/merch') {
                this.curTab = 'merch';
            } else if (cleanPath.startsWith('/merch/')) {
                this.targetMerchId = cleanPath.split('/')[2];
                this.curTab = 'merch_detail';
            } else if (['/about', '/care', '/qs', '/health', '/hospital', '/breeders', '/faq'].includes(cleanPath)) {
                this.curTab = cleanPath.substring(1);
            } else {
                this.curTab = 'home';
            }
            window.scrollTo(0, 0);
        },
        handleLinkClick(e) {
            const link = e.target.closest('a');
            if (!link) return;
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !href.startsWith('//') && link.target !== '_blank') {
                e.preventDefault();
                history.pushState(null, '', href);
                this.resolveRoute(href);
                this.mobileMenuOpen = false;
                document.querySelectorAll('details.mm-details[open]').forEach(el => el.removeAttribute('open'));
            }
        },
        navigateTo(path) {
            history.pushState(null, '', path);
            this.resolveRoute(path);
        },
        scrollToTop() { this.navigateTo('/'); },
        handleScroll() {
            const st = Math.max(0, window.scrollY); 
            if (st > 100 && st > store.lastScrollY) this.navHidden = true;
            else this.navHidden = false;
            store.lastScrollY = st;
            
            if (st + window.innerHeight >= document.documentElement.scrollHeight - 300) {
                 if (this.displayLimit) this.displayLimit += 20;
            }
            
            if (this.curTab === 'articles' && store.readingArticle) {
                const docH = document.documentElement.scrollHeight;
                const winH = window.innerHeight;
                const progress = (st / (docH - winH)) * 100;
                this.readingProgress = Math.min(100, Math.max(0, progress));
            }
        },
        copy(t){ navigator.clipboard.writeText(t).then(() => { this.showToast = true; setTimeout(() => this.showToast = false, 2000); }); },
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        },
        updateMeta() {
            let title = '守宮選購與飼養｜Gencko Studio';
            if(this.curTab === 'calculator') title = '基因計算機｜Gencko Studio';
            if(this.curTab === 'product_detail' && this.currentProduct) title = `${this.currentProduct.Morph}｜Gencko Studio`;
            if(this.curTab === 'articles' && store.readingArticle) title = `${store.readingArticle.Title}｜Gencko Studio`;
            if(this.curTab === 'shop') title = '線上選購守宮｜Gencko Studio';
            if(this.curTab === 'genes') title = '守宮基因圖鑑｜Gencko Studio';
            document.title = title;
        }
    }
};
</script>

<template>
    <div class="cont">
        <!-- Lightbox -->
        <div v-if="lightboxItem" class="lightbox-overlay" @click="closeLightbox">
            <div class="lightbox-close" @click.stop="closeLightbox">✕</div>
            <img :src="convertLink(lightboxItem.ImageURL)" class="lightbox-img" @click.stop>
            <div class="lightbox-info" @click.stop>
                <h2 style="color:#fff;margin:10px 0;">{{lightboxItem.Morph}}</h2>
                <a v-if="lightboxItem.Status==='ForSale'" :href="lineLink" target="_blank" class="btn-buy" style="font-size:1.2rem;padding:12px 30px;display:inline-block;margin-top:10px;position:relative;z-index:100001;">立即私訊購買</a>
            </div>
        </div>

        <div v-if="showToast" class="toast">已複製到剪貼簿</div>

        <!-- Marquee -->
        <div class="marquee-container">
            <div class="marquee-content">
                <span v-for="(item, i) in marqueeList" :key="i" class="marquee-item">
                    <a v-if="item.url" :href="item.url" target="_blank" class="marquee-link">{{ item.text }}</a>
                    <span v-else>{{ item.text }}</span>
                    <span style="margin: 0 80px; opacity: 0.3;">◆</span>
                </span>
            </div>
        </div>

        <!-- Sticky Nav -->
        <div class="sticky-nav" :class="{'nav-hidden': navHidden}">
            <div class="nav-container">
                <a href="/" class="nav-left" @click.prevent="scrollToTop" style="cursor:pointer; display:flex; align-items:center; gap:10px; text-decoration:none;">
                    <img v-if="logoUrl" :src="logoUrl" style="height:40px; width:auto; display:block;">
                    <div style="font-weight:900; font-size:1.2rem; color:var(--pri); letter-spacing:1px; line-height:1;">GENCKO</div>
                </a>

                <div class="dt-nav" v-if="!admin">
                    <div class="nav-item-dt dropdown-hover">
                        探索選購 ▾
                        <div class="dt-dropdown">
                            <a href="/shop">選購守宮</a>
                            <a href="/breeders">種群展示</a>
                            <a href="/merch">周邊商品</a>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover">
                        工具知識 ▾
                        <div class="dt-dropdown">
                            <a href="/calculator">基因計算機</a>
                            <a href="/genes">基因圖鑑</a>
                            <a href="/health">健康評估</a>
                            <a href="/qs">飼養評估</a>
                            <a href="/hospital">特寵醫院</a>
                        </div>
                    </div>
                    <div class="nav-item-dt dropdown-hover">
                        品牌服務 ▾
                        <div class="dt-dropdown">
                            <a href="/about">關於我們</a>
                            <a href="/care">飼養方式</a>
                            <a href="/articles">專欄文章</a>
                            <a href="/faq">常見問題</a>
                        </div>
                    </div>
                </div>

                <div class="nav-right">
                    <div class="theme-toggle" @click="toggleTheme" style="cursor:pointer;font-size:1rem;font-weight:bold;margin-right:15px;color:var(--txt);display:flex;align-items:center;border:1px solid var(--bd);padding:4px 10px;border-radius:20px;">{{ isDayMode ? '夜間' : '日間' }}</div>
                    <div class="hamburger" v-if="!admin" @click="mobileMenuOpen=!mobileMenuOpen">☰</div>
                    <button v-if="admin" @click="admin=false" class="nav-btn-logout">登出</button>
                </div>
            </div>

            <!-- Mobile Menu -->
            <div class="mobile-menu-overlay" :class="{open: mobileMenuOpen}" v-if="!admin" style="position:absolute; top:100%; height:calc(100vh - 50px);">
                <a href="/" class="mm-item" @click="mobileMenuOpen=false" style="text-decoration:none;display:block;">首頁</a>
                
                <details class="mm-details">
                    <summary class="mm-summary">探索選購 ▾</summary>
                    <div class="mm-dropdown-content">
                        <a href="/shop" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">選購守宮</a>
                        <a href="/breeders" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">種群展示</a>
                        <a href="/merch" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">周邊商品</a>
                    </div>
                </details>

                <details class="mm-details">
                    <summary class="mm-summary">工具知識 ▾</summary>
                    <div class="mm-dropdown-content">
                        <a href="/calculator" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">基因計算機</a>
                        <a href="/genes" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">基因圖鑑</a>
                        <a href="/health" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">健康評估</a>
                        <a href="/qs" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">飼養評估</a>
                        <a href="/hospital" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">特寵醫院</a>
                    </div>
                </details>

                <details class="mm-details">
                    <summary class="mm-summary">品牌服務 ▾</summary>
                    <div class="mm-dropdown-content">
                        <a href="/about" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">關於我們</a>
                        <a href="/care" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">飼養方式</a>
                        <a href="/articles" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">專欄文章</a>
                        <a href="/faq" class="mm-sub" @click="mobileMenuOpen=false" style="display:block;text-decoration:none;">常見問題</a>
                    </div>
                </details>
            </div>
            <div v-if="curTab==='articles' && readingArticle" class="reading-progress-bar">
                <div class="progress-fill" :style="{width: readingProgress + '%'}"></div>
            </div>
        </div>

        <div v-if="!admin" style="padding-top: 0;">
            <!-- Home -->
            <transition name="fade">
            <div v-show="curTab==='home'">
                <div class="home-header-wrap">
                    <div class="hero-content hero-content-inner">
                        <h1 class="hero-main-title">GENCKO STUDIO</h1>
                        
                        <div class="hero-btn-group mobile-row-nowrap" style="margin-bottom:15px; justify-content:center;">
                            <a href="https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg" target="_blank" class="btn-hero btn-line-join">
                                🔥 點擊加入社群享優惠
                            </a>
                        </div>
                        <div class="hero-btn-group social-group" style="justify-content:center;">
                            <a href="https://www.instagram.com/gencko_breeding" target="_blank" class="btn-hero btn-soc">IG</a>
                            <a href="https://www.facebook.com/profile.php?id=61579393505049&locale=zh_TW" target="_blank" class="btn-hero btn-soc">FB</a>
                            <a href="https://myship.7-11.com.tw/general/detail/GM2509175195515" target="_blank" class="btn-hero btn-soc">賣貨便</a>
                        </div>
                    </div>
                </div>
                
                <!-- Scenarios -->
                <div class="home-scenario-grid">
                    <div class="scenario-card" @click="setBeginnerMode()">
                        <div class="scenario-icon">🌱</div>
                        <div class="scenario-title">新手入門</div>
                        <div class="scenario-desc">好養、強壯、預算友善</div>
                    </div>
                    <div class="scenario-card" @click="navigateTo('/breeders')">
                        <div class="scenario-icon">👑</div>
                        <div class="scenario-title">種群鑑賞</div>
                        <div class="scenario-desc">欣賞 Gencko 核心種公母</div>
                    </div>
                    <div class="scenario-card" @click="navigateTo('/calculator')">
                        <div class="scenario-icon">🧬</div>
                        <div class="scenario-title">基因計算</div>
                        <div class="scenario-desc">專業玩家的選育工具</div>
                    </div>
                </div>

                <div class="home-section">
                    <div class="section-head">
                        <div class="sec-title">熱門精選</div>
                        <a href="/shop" class="sec-more" style="text-decoration:none;">查看更多 &rarr;</a>
                    </div>
                    
                    <div v-if="loading && hotList.length===0" style="display:flex; gap:15px; overflow:hidden; padding:10px 0;">
                        <div class="sk-card" v-for="n in 5" :key="n" style="width:220px; flex-shrink:0;">
                            <div class="skeleton sk-img" style="height:180px;"></div>
                            <div class="sk-body"><div class="skeleton sk-title" style="width:60%; margin:0 auto;"></div></div>
                        </div>
                    </div>

                    <div v-else-if="hotList.length > 0" class="hot-marquee-mask">
                        <div class="hot-track">
                            <div class="hot-card-item" v-for="(i, idx) in [...hotList, ...hotList, ...hotList, ...hotList]" :key="idx">
                                <div style="position:relative; cursor:pointer;" @click="openProduct(i.ID)">
                                    <img v-if="i.ImageURL" :src="convertLink(i.ImageURL)" class="card-img" loading="lazy">
                                    <div v-else class="card-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:3rem;background:#000;">🦎</div>
                                    <div v-if="i.Status==='ForSale'" class="trust-badge">🛡️ 100% HEALTH</div>
                                </div>
                                <div class="card-body" style="padding:15px; text-align:center;">
                                    <div class="morph-title" style="margin:0; font-size:1.1rem;">{{i.Morph}}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else style="text-align:center; padding:20px; color:#666;">
                        暫無熱門精選商品
                    </div>
                </div>

                <div class="home-section" style="background:rgba(255,255,255,0.02);">
                    <div class="section-head">
                        <div class="sec-title">最新文章</div>
                        <a href="/articles" class="sec-more" style="text-decoration:none;">專欄文章 &rarr;</a>
                    </div>
                    <div class="grid">
                        <div class="card article-card" v-for="item in articlesList.slice(0, 3)" :key="item.ID" @click="openArticle(item)">
                            <div style="position:relative; overflow:hidden;">
                                <img v-if="item.ImageURL" :src="convertLink(item.ImageURL)" class="card-img" style="height:180px;" loading="lazy">
                                <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                                <div class="art-cat-tag">{{ item.Category }}</div>
                            </div>
                            <div class="card-body">
                                <div style="font-size:0.8rem;color:#888;margin-bottom:5px;">{{ fmtDate(item.PublishDate) }}</div>
                                <div class="morph-title" style="font-size:1.1rem;margin-bottom:8px;">{{ item.Title }}</div>
                                <div class="art-summary">{{ item.Summary }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </transition>

            <!-- About -->
            <transition name="fade">
            <div v-show="curTab==='about'">
                <div class="page-text-box">
                    <div class="page-title">BRAND STORY</div>
                    <div class="about-layout">
                        <img v-if="aboutImg" :src="convertLink(aboutImg)" alt="Gencko 豹紋守宮成體" class="about-img" title="點擊加入社群" onclick="window.open('https://line.me/ti/g2/x4QpkWPJTXYr87U_jHyxSrBLTeVYMdwwlPF9qg?utm_source=invitation&utm_medium=link_copy&utm_campaign=default')">
                        <div class="about-content">
                            <p>Gencko 致力於建立嚴謹的爬蟲繁殖標準。</p>
                            <p>我們重視每一個成長環節，從環境、營養到日常照護皆以最高標準執行，確保個體呈現穩定的狀態與良好的體質。</p>
                            <p>秉持資訊透明與誠信原則，我們提供實體影像紀錄、全天候專業諮詢及完整的售後支持。同時，我們重視飼主教育，致力推廣正確的飼養觀念，確保您在充分準備下開啟飼養旅程。</p>
                            <p>我們尊重每一個生命價值，期望透過專業知識與完善服務，成為您踏入爬寵領域最堅實的後盾。</p>
                        </div>
                    </div>
                </div>
                <div class="breeding-std-box">
                    <div class="std-img-wrapper">
                        <img src="https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/380074.jpg" class="std-img" alt="Gencko 餵食標準">
                    </div>
                    <div class="std-content">
                        <div class="std-title">Gencko 繁育標準</div>
                        <div class="std-desc">
                            <p>順應幼體高代謝需求，落實高頻率飼養標準。</p>
                            <p>守宮幼體處於發育關鍵期，代謝速度快，營養轉化效率是成體的數倍。坊間常見一週 2 至 3 次的飼養頻率，往往僅能維持基本生存，卻限制了成長幅度。</p>
                            <p>Gencko 堅持「每週至少 6 次」的餵食計畫。我們不惜投入人力與杜比亞及蟋蟀等高成本食材，並於每次餵食添加足夠的鈣粉與營養粉。透過高頻率的營養補給，確保個體在骨骼定型期獲得足量支撐，建立紮實且穩定的體質基礎。</p>
                        </div>
                    </div>
                </div>
            </div>
            </transition>

            <!-- Calculator (NATIVE VUE IMPL) -->
            <transition name="fade">
            <div v-show="curTab==='calculator'" class="calc-container">
                <div class="calc-header">
                    <div class="seo-hint">Gencko 整理製作，歡迎分享給你的爬友</div>
                    <div class="calc-sub-desc">專業的守宮基因計算機。非100%血系請統稱前綴(如橘化)。</div>
                    
                    <div class="tabs" style="margin: 20px 0;">
                        <div class="tab" :class="{active: calc_sp==='豹紋守宮'}" @click="calc_sp='豹紋守宮'">豹紋守宮</div>
                        <div class="tab" :class="{active: calc_sp==='肥尾守宮'}" @click="calc_sp='肥尾守宮'">肥尾守宮</div>
                    </div>

                    <div class="calc-helper-btns">
                        <div class="calc-help-btn" @click="calc_activeInfo='types';calc_modalOpen=true">🎓 基因觀念</div>
                        <div class="calc-help-btn" @click="calc_activeInfo='poly';calc_modalOpen=true">⚡ 選育介紹</div>
                    </div>
                </div>

                <div class="calc-parent-grid">
                    <!-- Male Card -->
                    <div class="calc-parent-card">
                        <div class="calc-p-header calc-sex-m">
                            <div class="calc-sex-icon">♂</div>
                            <div class="calc-p-title"><span>SELECTED PARENT</span><h3>MALE (公)</h3></div>
                        </div>
                        <div class="calc-p-body">
                            <!-- Dropdown Trigger -->
                            <div class="calc-dropdown-container" style="position:relative; z-index:20;">
                                <div class="calc-add-btn" :class="{open: calc_activeSelector==='Male'}" @click.stop="calc_toggleSelector('Male')">
                                    <span>+ ADD GENE (新增)</span><span>▼</span>
                                </div>
                                <!-- Dropdown Menu -->
                                <div v-if="calc_activeSelector==='Male'" class="calc-dropdown-menu">
                                    <div v-for="type in calc_typeOrder" :key="type">
                                        <div v-if="calc_groupedGenes[type]" class="calc-dd-group-btn" :class="{active: calc_expandType===type}" @click.stop="calc_toggleType(type)">
                                            {{type}} <span>></span>
                                        </div>
                                        <div v-if="calc_expandType===type" class="calc-dd-sub">
                                            <!-- Combo Sub-groups -->
                                            <template v-if="type === '品系'">
                                                <div v-for="group in calc_comboGroups" :key="group">
                                                    <div class="calc-dd-combo-group" @click.stop="calc_toggleComboGroup(group)">📁 {{group}}</div>
                                                    <div v-if="calc_expandGroup===group">
                                                        <div v-for="g in calc_groupedGenes[type].filter(x=>x.group===group)" 
                                                             class="calc-dd-item" 
                                                             :class="{disabled: calc_isGeneDisabled(g.id, 'Male')}"
                                                             @click.stop="!calc_isGeneDisabled(g.id, 'Male') && calc_addGene(g.id, 'Male')">
                                                            {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Male')">✓</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </template>
                                            <!-- Normal List -->
                                            <template v-else>
                                                <div v-for="g in calc_groupedGenes[type]" 
                                                     class="calc-dd-item"
                                                     :class="{disabled: calc_isGeneDisabled(g.id, 'Male')}"
                                                     @click.stop="!calc_isGeneDisabled(g.id, 'Male') && calc_addGene(g.id, 'Male')">
                                                    {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Male')">✓</span>
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Selected List -->
                            <div class="calc-selected-list">
                                <div v-if="calc_male.length === 0" class="calc-empty-msg">NO GENES SELECTED</div>
                                <div v-else class="calc-gene-item" v-for="(g, idx) in calc_male" :key="idx">
                                    <div class="calc-gene-row">
                                        <div>
                                            <div class="calc-gene-name">{{calc_currentDefs.find(d=>d.id===g.geneId)?.name}}</div>
                                            <div class="calc-gene-type">{{calc_currentDefs.find(d=>d.id===g.geneId)?.type}}</div>
                                        </div>
                                        <button class="calc-btn-remove" @click="calc_removeGene(idx, 'Male')">✕</button>
                                    </div>
                                    <!-- Recessive: Checkbox for Het -->
                                    <div v-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='隱性'">
                                        <label class="calc-het-label">
                                            <input type="checkbox" class="calc-het-check" :checked="g.zygosity==='Het'" @change="calc_toggleHet($event, idx, 'Male')">
                                            Het (隱性帶基因)
                                        </label>
                                    </div>
                                    <!-- Co-Dominant: Select -->
                                    <div v-else-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='共顯性'">
                                        <select class="calc-zyg-select" :value="g.zygosity" @change="calc_updateZygosity($event, idx, 'Male')">
                                            <option value="Single">單基因 (Single)</option>
                                            <option value="Super">超級 (Super)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Female Card -->
                    <div class="calc-parent-card">
                        <div class="calc-p-header calc-sex-f">
                            <div class="calc-sex-icon">♀</div>
                            <div class="calc-p-title"><span>SELECTED PARENT</span><h3>FEMALE (母)</h3></div>
                        </div>
                        <div class="calc-p-body">
                            <!-- Dropdown Trigger -->
                            <div class="calc-dropdown-container" style="position:relative; z-index:20;">
                                <div class="calc-add-btn" :class="{open: calc_activeSelector==='Female'}" @click.stop="calc_toggleSelector('Female')">
                                    <span>+ ADD GENE (新增)</span><span>▼</span>
                                </div>
                                <!-- Dropdown Menu -->
                                <div v-if="calc_activeSelector==='Female'" class="calc-dropdown-menu">
                                    <div v-for="type in calc_typeOrder" :key="type">
                                        <div v-if="calc_groupedGenes[type]" class="calc-dd-group-btn" :class="{active: calc_expandType===type}" @click.stop="calc_toggleType(type)">
                                            {{type}} <span>></span>
                                        </div>
                                        <div v-if="calc_expandType===type" class="calc-dd-sub">
                                            <template v-if="type === '品系'">
                                                <div v-for="group in calc_comboGroups" :key="group">
                                                    <div class="calc-dd-combo-group" @click.stop="calc_toggleComboGroup(group)">📁 {{group}}</div>
                                                    <div v-if="calc_expandGroup===group">
                                                        <div v-for="g in calc_groupedGenes[type].filter(x=>x.group===group)" 
                                                             class="calc-dd-item" 
                                                             :class="{disabled: calc_isGeneDisabled(g.id, 'Female')}"
                                                             @click.stop="!calc_isGeneDisabled(g.id, 'Female') && calc_addGene(g.id, 'Female')">
                                                            {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Female')">✓</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </template>
                                            <template v-else>
                                                <div v-for="g in calc_groupedGenes[type]" 
                                                     class="calc-dd-item"
                                                     :class="{disabled: calc_isGeneDisabled(g.id, 'Female')}"
                                                     @click.stop="!calc_isGeneDisabled(g.id, 'Female') && calc_addGene(g.id, 'Female')">
                                                    {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Female')">✓</span>
                                                </div>
                                            </template>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Selected List -->
                            <div class="calc-selected-list">
                                <div v-if="calc_female.length === 0" class="calc-empty-msg">NO GENES SELECTED</div>
                                <div v-else class="calc-gene-item" v-for="(g, idx) in calc_female" :key="idx">
                                    <div class="calc-gene-row">
                                        <div>
                                            <div class="calc-gene-name">{{calc_currentDefs.find(d=>d.id===g.geneId)?.name}}</div>
                                            <div class="calc-gene-type">{{calc_currentDefs.find(d=>d.id===g.geneId)?.type}}</div>
                                        </div>
                                        <button class="calc-btn-remove" @click="calc_removeGene(idx, 'Female')">✕</button>
                                    </div>
                                    <!-- Recessive: Checkbox for Het -->
                                    <div v-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='隱性'">
                                        <label class="calc-het-label">
                                            <input type="checkbox" class="calc-het-check" :checked="g.zygosity==='Het'" @change="calc_toggleHet($event, idx, 'Female')">
                                            Het (隱性帶基因)
                                        </label>
                                    </div>
                                    <!-- Co-Dominant: Select -->
                                    <div v-else-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='共顯性'">
                                        <select class="calc-zyg-select" :value="g.zygosity" @change="calc_updateZygosity($event, idx, 'Female')">
                                            <option value="Single">單基因 (Single)</option>
                                            <option value="Super">超級 (Super)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Results -->
                <div v-if="calc_result" class="calc-result-area">
                    <div class="calc-res-header">
                        <div class="calc-res-title">預測結果</div>
                        <div class="calc-res-count">組合數: {{calc_result.totalCombos}}</div>
                    </div>

                    <div v-if="calc_result.warning" class="calc-warn">
                        <div style="font-size:1.5rem">⚠️</div>
                        <div style="white-space:pre-line">{{calc_result.warning}}</div>
                    </div>

                    <div v-if="calc_result.notices && calc_result.notices.length" class="calc-notice">
                        <div style="font-size:1.5rem">ℹ️</div>
                        <div>
                            <div v-for="n in calc_result.notices">• {{n}}</div>
                        </div>
                    </div>

                    <div class="calc-res-card" v-for="(o, idx) in calc_result.outcomes" :key="idx" :class="{lethal: o.description.includes('致死')}">
                        <div class="calc-prob-box">
                            <div class="calc-prob-val">{{Math.round(o.prob*100)}}<small style="font-size:0.8rem">%</small></div>
                            <div class="calc-prob-sub" style="font-size:0.8rem;color:#888;font-family:monospace" v-if="o.prob < 0.99">
                                {{ calc_getProbFraction(o.prob) }}
                            </div>
                        </div>
                        <div class="calc-res-info" style="display:flex; align-items:center;">
                             <div class="calc-res-name" style="margin:0; line-height:1.4;" v-html="o.fullLabel"></div>
                        </div>
                    </div>
                </div>

                <!-- Info Modal Overlay -->
                <div v-if="calc_modalOpen" class="lightbox-overlay" @click="calc_modalOpen=false" style="justify-content:center; padding:20px;">
                    <div class="page-text-box" style="width:100%; max-width:600px; max-height:80vh; overflow-y:auto; position:relative;" @click.stop>
                        <div class="lightbox-close" @click="calc_modalOpen=false" style="top:10px; right:10px; width:40px; height:40px; font-size:1.5rem;">✕</div>
                        <h2 style="color:var(--pri); margin-top:0;">
                            {{ calc_activeInfo === 'types' ? '基因觀念' : '多遺傳 (選育)' }}
                        </h2>
                        
                        <div v-if="calc_activeInfo==='types'">
                            <p style="color:#ff5252; font-weight:bold; border-left:4px solid #ff5252; padding-left:10px;">三大白化 (川普/貝爾/雨水) 為獨立隱性基因，不可互配。</p>
                            <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">顯性 (Dominant)</h4>
                            <p style="font-size:0.95rem; color:#ccc;">單一基因即可表現。如：謎、白黃。</p>
                            <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">共顯性 (Co-Dominant)</h4>
                            <p style="font-size:0.95rem; color:#ccc;">單基因 (Single) 與 雙基因 (Super) 表現不同。如：馬克雪花 -> 超級雪花。</p>
                            <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">隱性 (Recessive)</h4>
                            <p style="font-size:0.95rem; color:#ccc;">需父母雙方都帶有 (Het 或 Visual) 才會表現。如：日蝕、暴風雪。</p>
                        </div>

                        <div v-if="calc_activeInfo==='poly'">
                            <p style="border-left:4px solid var(--pri); padding-left:10px;">多遺傳基因 (Polygenic) 不是由單一開關控制，而是透過代代選育堆疊特徵。</p>
                            <div style="margin-top:20px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                                <div style="color:var(--pri); font-weight:bold;">橘化 (Tangerine)</div>
                                <p style="font-size:0.9rem; margin:5px 0 0 0;">包含蜜橘、電橘、血橘等血系，本質皆為橘化選育。</p>
                            </div>
                            <div style="margin-top:10px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                                <div style="color:var(--pri); font-weight:bold;">土匪 (Bandit)</div>
                                <p style="font-size:0.9rem; margin:5px 0 0 0;">由粗直線選育而來，特徵為鼻吻部橫帶與背部粗紋。</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </transition>

            <!-- Other Tabs (Care/Articles/Shop/etc.) -->
            <transition name="fade"><div v-show="curTab==='care'" class="page-text-box">
                <!-- (Care Content) -->
                <h1 class="page-title">守宮飼養方式指南</h1>
                <img v-if="careImg" :src="convertLink(careImg)" class="care-top-img">
                <table class="care-table">
                    <tr><td class="care-label">飼養箱</td><td class="care-value">至少40×30×20公分起（視個體大小調整），可選玻璃或壓克力材質。若空間允許，提供較大空間效果更佳。</td></tr>
                    <tr><td class="care-label">底材</td><td class="care-value">使用易清潔、無碎屑及誤食風險的底材，如廚房紙巾、椰纖土、大顆赤玉土等。避免使用沙粒或細碎底材，以防吞入造成腸胃阻塞。</td></tr>
                    <tr><td class="care-label">躲避處</td><td class="care-value">至少準備一處：為避免守宮因環境造成緊迫，提供遮蔽物可以提升守宮的安全感，同時可幫助脫皮。</td></tr>
                    <tr><td class="care-label">加熱與溫度</td><td class="care-value">提供底部加熱墊，創造熱區與冷區。建議熱區約 30–32°C，冷區約 24–26°C。守宮可依需求自行選擇合適區域。</td></tr>
                    <tr><td class="care-label">濕度</td><td class="care-value">整體環境維持乾燥，但濕區濕度略高，以協助脫皮。濕度控制與乾燥底材與乾燥環境並存是地棲守宮的最佳選擇。</td></tr>
                    <tr><td class="care-label">飲水</td><td class="care-value">每日提供乾淨水源，使用淺水碟即可，並每天更換水以確保衛生。</td></tr>
                </table>
                <div class="care-section">
                    <div class="care-h">飲食與營養管理</div>
                    <div class="care-p">地棲守宮為標準食蟲性動物，均衡的營養與定期補充對健康至關重要。</div>
                    <div class="care-p">● 主要餌料：蟋蟀、杜比亞蟑螂為主。依個體需求搭配，避免單一餵食。</div>
                    <div class="care-p">● 補充營養：建議定期為餌料裹鈣粉與維生素（含 D₃），防止鈣質缺乏、代謝性骨病與脫皮異常。</div>
                    <div class="care-p">● 餵食頻率與份量：幼體建議每日或隔日餵食；成體則每隔 2–3 天餵食一次。餵食份量以不超過守宮頭部寬度為上限。</div>
                </div>
                <div class="care-section">
                    <div class="care-h">常見飼養注意事項</div>
                    <div class="care-p">● 脫皮期間：在脫皮期間，務必維持濕躲區濕潤，並提供可摩擦的粗糙表面（如木塊或岩石），可協助守宮順利脫皮。若腳趾或尾巴出現卡皮情形，請立即協助移除以免造成阻塞或傷害。</div>
                    <div class="care-p">● 單獨飼養：地棲守宮具有領域性，不適合混養。建議一缸一隻，以避免爭鬥、壓力或健康問題。</div>
                    <div class="care-p">● 避免過度干擾：過度頻繁把玩、搬動、抓取，或環境劇烈變動，都可能導致守宮緊張，甚至出現自我防衛（如斷尾）行為。</div>
                </div>
                <div class="care-section">
                    <div class="care-h">為何選擇豹紋／肥尾守宮</div>
                    <div class="care-p">● 容易飼養：對環境要求彈性，適合首次接觸爬蟲的飼主。</div>
                    <div class="care-p">● 健康穩定：只要環境、飲食、溫濕度控制得宜，守宮能展現良好食慾、脫皮與活動狀態。</div>
                    <div class="care-p">● 相對友善：地棲習性、安靜性格、體型適中，適合室內飼養，照顧相對簡便。</div>
                </div>
                <div class="care-quote">
                    我們將守宮視為需被妥善照護的生命，而非一般商品。本指南旨在協助飼主以正確、全面的知識理解守宮的行為與需求，並依據其生理特性提供安全、穩定且適宜的環境。需要特別強調的是，守宮在個體性格、反應模式與適應能力上皆存在差異，環境配置與照護方式亦無絕對標準，應根據個體狀況進行調整。
                </div>
            </div></transition>
            
            <transition name="fade"><div v-show="curTab==='articles'">
                <!-- (Articles Content) -->
                <div v-show="!readingArticle">
                    <h1 class="page-title">專欄文章</h1>
                    <div style="margin-bottom:20px; display:flex; gap:10px; align-items:center;">
                        <label style="color:#aaa;">分類：</label>
                        <select v-model="artCat" style="background:#111; color:#fff; padding:8px; border:1px solid #333; border-radius:4px;">
                            <option value="All">全部文章</option>
                            <option v-for="c in articleCats" :value="c">{{ c }}</option>
                        </select>
                    </div>
                    
                    <div v-if="filteredArticles.length===0" style="text-align:center;padding:50px;color:#666;font-size:1.2rem;">
                        此分類尚無文章
                    </div>
                    
                    <transition-group tag="div" name="list" class="grid" v-else>
                        <div class="card article-card" v-for="item in filteredArticles" :key="item.ID" @click="openArticle(item)">
                            <div style="position:relative; overflow:hidden;">
                                <img v-if="item.ImageURL" :src="convertLink(item.ImageURL)" class="card-img" style="height:180px;" loading="lazy">
                                <div v-else class="card-img" style="height:180px;display:flex;align-items:center;justify-content:center;font-size:3rem;background:#1a1a1a;">📝</div>
                                <div class="art-cat-tag">{{ item.Category }}</div>
                            </div>
                            <div class="card-body">
                                <div style="font-size:0.8rem;color:#888;margin-bottom:5px;">{{ fmtDate(item.PublishDate) }}</div>
                                <div class="morph-title" style="font-size:1.1rem;margin-bottom:8px;">{{ item.Title }}</div>
                                <div class="art-summary">{{ item.Summary }}</div>
                            </div>
                        </div>
                    </transition-group>
                </div>
                <div v-if="readingArticle">
                    <button @click="closeArticle" class="btn-back">← 返回列表</button>
                    <article class="reader-container">
                        <h1 style="color:#fff;font-size:2rem;margin-bottom:15px;">{{ readingArticle.Title }}</h1>
                        <div style="color:#666;font-size:0.9rem;margin-bottom:20px;">
                            <span>📅 {{ fmtDate(readingArticle.PublishDate) }}</span>
                            <span style="margin-left:15px;">👤 {{ readingArticle.Author }}</span>
                            <span style="margin-left:15px;">📂 {{ readingArticle.Category }}</span>
                        </div>
                        <hr style="border-color:rgba(255,255,255,0.1); margin: 20px 0;">
                        <div class="reader-content" v-html="readingArticle.Content"></div>
                    </article>
                    <button @click="closeArticle" class="btn-back" style="margin-top:30px;">← 返回列表</button>
                </div>
            </div></transition>

            <!-- QS Questionnaire (Native Vue) -->
            <transition name="fade">
            <div v-show="curTab==='qs'" class="qs-container">
                <div v-if="!qs.finished">
                    <div class="page-title">飼養前自我評估</div>
                    
                    <!-- Progress -->
                    <div class="qs-progress-area">
                        <div class="qs-progress-labels">
                            <span>Step {{ qs.step + 1 }} of {{ qs.questions.length }}</span>
                            <span>{{ Math.round(qs_progress) }}%</span>
                        </div>
                        <div class="qs-progress-track">
                            <div class="qs-progress-fill" :style="{width: qs_progress + '%'}"></div>
                        </div>
                    </div>

                    <!-- Question -->
                    <div class="qs-question-box" :key="qs.step">
                        <div class="qs-question-text">{{ qs_currentQ.text }}</div>
                        <div class="qs-options-grid">
                            <div v-for="opt in qs_currentQ.options" :key="opt.id" class="qs-option-btn" @click="qs_selectOption(qs_currentQ.id, opt.score)">
                                <span class="qs-option-label">{{ opt.label }}</span>
                                <div class="qs-check-circle"></div>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation -->
                    <button v-if="qs.step > 0" @click="qs_prevStep" class="qs-nav-btn">
                        <span>← 返回上一題</span>
                    </button>
                </div>

                <!-- Result -->
                <div v-else class="qs-result-box">
                    <span class="qs-badge">Evaluation Complete</span>
                    <div class="qs-res-title">{{ qs_result.title }}</div>
                    <div class="qs-score-display">{{ qs_totalScore }} <span style="font-size:1rem;font-weight:normal;opacity:0.5">/ 100</span></div>
                    <div class="qs-res-desc">{{ qs_result.desc }}</div>
                    
                    <div class="qs-hint-box">
                        💡 溫馨提示：新手飼養前建議多尋求專業玩家或專科醫師的建議，確保環境與設備完全就緒。
                    </div>

                    <button @click="qs_reset" class="qs-reset-btn">
                        🔄 重新評估
                    </button>
                </div>
            </div>
            </transition>

            <!-- Health Assessment (Native Vue) -->
            <transition name="fade">
            <div v-show="curTab==='health'" class="health-container">
                <div class="page-title">健康評估系統</div>
                <div class="page-text-box" style="margin-bottom:20px; text-align:center;">
                    <p>本工具僅供自我檢測參考，若有嚴重異常請務必尋求特寵獸醫協助。</p>
                </div>

                <div class="health-grid">
                    <!-- Form Side -->
                    <div class="health-form-box">
                        <div>
                            <div class="health-label">行為觀察：活躍程度</div>
                            <select v-model="health.activity" class="health-select">
                                <option value="HIGH">高 (活潑、對動向有反應)</option>
                                <option value="MEDIUM">中 (偶爾活動、狀態正常)</option>
                                <option value="LOW">低 (遲緩、大部分時間不動)</option>
                            </select>
                        </div>
                        <div>
                            <div class="health-label">爬行狀態</div>
                            <select v-model="health.movement" class="health-select">
                                <option value="NORMAL">正常 (支撐有力、步伐穩定)</option>
                                <option value="LETHARGIC">異常 (無力、拖行、震顫)</option>
                            </select>
                        </div>
                        <div>
                            <div class="health-label">尾巴粗細</div>
                            <select v-model="health.tail" class="health-select">
                                <option value="PLUMP">肥大 (豐滿、營養充足)</option>
                                <option value="NORMAL">正常 (比例協調)</option>
                                <option value="THIN">偏瘦 (明顯凹陷)</option>
                                <option value="SICKLY">枯瘦 (皮包骨、危險信號)</option>
                            </select>
                        </div>
                        <div>
                            <div class="health-label">糞便觀察</div>
                            <select v-model="health.droppings" class="health-select">
                                <option value="SOLID">健康 (固態、伴隨白色尿酸鹽)</option>
                                <option value="NONE">未排便 (近期無觀察到)</option>
                                <option value="RUNNY">拉稀 (不成型、水分過多)</option>
                                <option value="ABNORMAL">異常 (綠色、異味、膿血或奇色)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Result Side -->
                    <div class="health-res-box">
                        <div class="health-res-header">
                            <div>
                                <span class="health-sys-text">MEDICAL DIAGNOSIS ENGINE</span>
                                <h2 class="health-status-text" :class="health_result.colorClass">評估報告</h2>
                            </div>
                            <div class="health-score-val" :class="health_result.colorClass">{{ health_result.score }}%</div>
                        </div>

                        <div class="health-status-row">
                            <div class="health-dot" :class="health_result.bgClass"></div>
                            <div class="health-status-text" :class="health_result.colorClass">{{ health_result.status }}</div>
                        </div>

                        <div class="health-suggestion">
                            {{ health_result.suggestion }}
                        </div>

                        <div v-if="health_result.warning" class="health-warning">
                            {{ health_result.warning }}
                        </div>

                        <div class="health-footer">
                            <span>REPORT ID: GE-{{ Math.floor(Math.random() * 9000) + 1000 }}</span>
                            <span>SYSTEM CALIBRATED</span>
                        </div>
                    </div>
                </div>
            </div>
            </transition>
            
            <!-- Hospital Map (Native Vue Implementation) -->
            <transition name="fade">
            <div v-show="curTab==='hospital'" class="hosp-container">
                <!-- Filter Section -->
                <div class="hosp-filter-row">
                    <div class="hosp-select-group">
                        <label class="hosp-label">Region & City / 區域與縣市</label>
                        <select class="hosp-select" :value="hosp_city" @change="hosp_changeCity">
                            <option value="all">所有縣市 (ALL CITIES)</option>
                            <optgroup v-for="(cities, region) in hosp_regions" :key="region" :label="region">
                                <option v-for="city in cities" :key="city" :value="city" v-show="hosp_availableCities.has(city)">
                                    {{ city }}
                                </option>
                            </optgroup>
                        </select>
                        <div class="hosp-select-icon">➜</div>
                    </div>
                    <div class="hosp-select-group">
                        <label class="hosp-label">District / 行政區</label>
                        <select class="hosp-select" v-model="hosp_district" :disabled="hosp_city === 'all'">
                            <option value="all">所有區域 (ALL DISTRICTS)</option>
                            <option v-for="d in hosp_districts" :key="d" :value="d">{{ d }}</option>
                        </select>
                        <div class="hosp-select-icon">➜</div>
                    </div>
                </div>

                <!-- Results Info -->
                <div class="hosp-count-row">
                    <span class="hosp-count">RECORDS: {{ hosp_filtered.length }}</span>
                    <div class="hosp-divider"></div>
                </div>

                <!-- Hospital List -->
                <div class="hosp-list">
                    <div v-if="hosp_filtered.length === 0" class="hosp-empty">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block; margin:0 auto 10px auto;">
                            <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        NO RESULTS FOUND
                    </div>

                    <div v-for="h in hosp_filtered" :key="h.id" class="hosp-card">
                        <div class="hosp-content-row">
                            <div class="hosp-info">
                                <h3 class="hosp-name">{{ h.name }}</h3>
                                
                                <a :href="hosp_getMapLink(h)" target="_blank" class="hosp-detail-row hosp-link">
                                    <svg class="hosp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                    <span>{{ h.address }}</span>
                                </a>

                                <div class="hosp-detail-row">
                                    <svg class="hosp-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                    <span style="font-family:monospace">{{ h.phone }}</span>
                                </div>
                            </div>

                            <div class="hosp-actions">
                                <span class="hosp-tag">{{ h.city }} {{ h.district }}</span>
                                <a :href="'tel:' + h.phone.replace(/[^\d]/g, '')" class="hosp-call-btn">Call Now</a>
                            </div>
                        </div>
                    </div>
                </div>

                <footer class="hosp-footer">
                    <span>EXOTIC_VET_MAP_TW</span>
                    <div class="hosp-divider"></div>
                    <span>V4.0 (PORTED)</span>
                </footer>
            </div>
            </transition>
            
            <!-- Shop -->
            <transition name="fade"><div v-show="curTab==='shop'">
                <h1 class="page-title">線上選購守宮</h1>
                <div class="tabs">
                    <div class="tab" :class="{active:sp==='豹紋守宮'}" @click="changeSpecies('豹紋守宮')">豹紋守宮</div>
                    <div class="tab" :class="{active:sp==='肥尾守宮'}" @click="changeSpecies('肥尾守宮')">肥尾守宮</div>
                </div>

               <div class="shop-layout">
                    <!-- Mobile Filter Toggle -->
                    <div class="mobile-filter-toggle" @click="showMobileFilter = !showMobileFilter">
                        <span>🔍 進階篩選條件 {{ showMobileFilter ? '▲' : '▼' }}</span>
                    </div>

                    <!-- Left Filter Panel -->
                    <div class="filter-panel" :class="{show: showMobileFilter}">
                        <div class="f-group">
                            <div class="f-label">精選標籤</div>
                            <label class="f-check" style="color:var(--pri); font-weight:bold;">
                                <input type="checkbox" v-model="fil.beginner"> 🌱 新手推薦
                            </label>
                        </div>
                        <div class="f-group">
                            <div class="f-label">庫存狀態</div>
                            <label class="f-check"><input type="checkbox" v-model="fil.stock"> 有庫存</label>
                            <label class="f-check"><input type="checkbox" v-model="fil.sold"> 已售出</label>
                        </div>
                        <div class="f-group">
                            <div class="f-label">價格 (最高: {{maxPrice}})</div>
                            <div style="display:flex;gap:5px;">
                                <input type="number" v-model="fil.minP" class="f-inp" placeholder="Min">
                                <input type="number" v-model="fil.maxP" class="f-inp" placeholder="Max">
                            </div>
                        </div>
                        <div class="f-group">
                            <div class="f-label">性別</div>
                            <label class="f-check"><input type="checkbox" v-model="fil.sexM"> 公 (含公溫)</label>
                            <label class="f-check"><input type="checkbox" v-model="fil.sexF"> 母 (含母溫)</label>
                        </div>
                        <div class="f-group">
                            <div class="f-label">基因篩選</div>
                            <div v-for="(list, cat) in db[sp]" :key="cat">
                                <div class="f-cat" @click="toggleFCat(cat)">{{cat}} <small>{{openFCat===cat?'▲':'▼'}}</small></div>
                                <div v-show="openFCat===cat" style="padding-left:10px;">
                                    <div v-for="g in getSortedGenes(list)" :key="g" style="margin:2px 0;">
                                        <label class="f-check" :class="{disabled: !isGeneAvail(g)}">
                                            <input type="checkbox" :value="g" v-model="fil.genes" :disabled="!isGeneAvail(g)"> 
                                            {{g}}
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="btn-hero" style="width:100%;margin-top:20px;font-size:0.9rem;padding:10px;" @click="resetFilters">清除所有條件</button>
                    </div>

                    <!-- Right Content -->
                    <div style="flex:1; min-width:0;">
                        <div class="inp-wrap">
                            <span class="search-icon">🔍</span>
                            <input class="inp" :value="kw" @input="onSearchInput" placeholder="搜尋品系、基因、ID...">
                        </div>
                        
                        <div class="controls-row">
                            <select v-model="sortOrder" class="sort-select">
                                <option value="default">預設排序</option>
                                <option value="price_asc">價格由低到高</option>
                                <option value="price_desc">價格由高到低</option>
                            </select>
                            <div class="history-toggle" :class="{active: showOnlyHistory}" @click="toggleHistoryMode"><span>🕒 最近瀏覽</span></div>
                            <div class="fav-toggle" :class="{active: showOnlyFav}" @click="showOnlyFav=!showOnlyFav"><span>❤ 只看最愛</span></div>
                        </div>
                        <div class="tags">
                            <span v-for="t in tags[sp]" class="tag" :class="{sel:kw===t}" @click="toggleTag(t)">{{t}}</span>
                        </div>
                        <!-- Shop Grid (Photo Grid) -->
                        <transition-group tag="div" name="list" class="grid photo-grid">
                            <div v-if="shopList.length===0" key="empty-msg" class="shop-empty-state">
                                <div class="empty-icon">🦎💤</div>
                                <h3 style="color:var(--txt); margin-bottom:10px;">找不到符合的守宮</h3>
                                <p style="font-size:0.9rem;">牠們可能躲起來睡覺了，或是被買光囉！<br>試著調整篩選條件，或直接私訊我們許願吧。</p>
                                <button class="btn-hero" @click="resetFilters" style="margin-top:20px;">🔄 清除篩選條件</button>
                            </div>
                            <div class="card slim-card" v-for="i in shopList" :key="i.ID" @click="openProduct(i.ID)">
                                <div v-if="i.Status==='Sold'" class="sold-stamp">SOLD</div>
                                <div style="position:absolute;top:5px;right:5px;z-index:10;">
                                    <span class="fav-btn" :class="{active: wishlist.includes(i.ID)}" @click.stop="toggleWishlist(i.ID)">❤</span>
                                </div>
                                <div style="position:relative;">
                                    <img v-if="i.ImageURL" :src="convertLink(i.ImageURL)" class="card-img slim-img" loading="lazy">
                                    <div v-else class="card-img slim-img" style="display:flex;align-items:center;justify-content:center;color:#333;font-size:2rem;background:#000;">🦎</div>
                                    <div v-if="i.Status==='ForSale'" class="trust-badge">🛡️ 100% HEALTH</div>
                                </div>
                                <div class="card-body slim-body">
                                    <div class="slim-title">{{i.Morph}}</div>
                                    <div class="slim-price-row">
                                        <div v-if="i.Status!=='ForSale'">
                                            <span v-if="i.Status==='Sold'" class="status-badge s-sold">已售出</span>
                                            <span v-else-if="i.Status==='Reserved'" class="status-badge s-res">預訂</span>
                                            <span v-else-if="i.Status==='NotForSale'" class="status-badge s-nfs">非賣</span>
                                        </div>
                                        <div v-else class="price slim-price">${{i.ListingPrice}}</div>
                                    </div>
                                    <div style="font-size:0.8rem; color:#888; text-align:right; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05); padding-top:8px;">
                                        查看完整狀態 &rarr;
                                    </div>
                                </div>
                            </div>
                        </transition-group>
                    </div>
                </div>
            </div></transition>

            <!-- Product Detail -->
            <transition name="fade"><div v-show="curTab==='product_detail'"><div v-if="productModules" class="prod-container">
                <button class="btn-back" @click="toShop">← 返回列表</button>
                <div class="prod-layout">
                    <div class="prod-img-box">
                        <div v-if="productModules.transaction.status==='Sold'" class="sold-stamp" style="font-size:3rem;border-width:6px;">SOLD OUT</div>
                        <img v-for="(img, idx) in productModules.visuals.list" :key="idx" :src="convertLink(img)" class="prod-main-img" @click="openLightbox({ImageURL: img, Morph: productModules.identity.morph})">
                        <div class="prod-hint">點擊圖片可放大檢視</div>
                    </div>
                    <div class="prod-info-box">
                        <div class="prod-header">
                            <div class="prod-id">ID: {{productModules.identity.id}}</div>
                            <h1 class="prod-title">{{productModules.identity.morph}}</h1>
                            <div class="gene-tag-row">
                                <span v-for="g in productModules.identity.genes" class="gene-pill">{{g}}</span>
                            </div>
                            <div v-if="productModules.identity.note" style="margin-bottom:15px; color:#aaa; font-size:0.95rem; background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border:1px solid var(--bd); white-space: pre-wrap;">
                                📝 備註：{{ productModules.identity.note }}
                            </div>
                            <div class="spec-row" style="border:none; padding:5px 0 0 0;">
                                <span :class="getSexCls(currentProduct)" style="font-size:1.1rem; margin-right:15px;">{{fmtSex(currentProduct)}}</span>
                                <span style="color:#888;">{{productModules.identity.birth}} 出生</span>
                            </div>
                        </div>
                        <div class="prod-price-area">
                            <div v-if="productModules.transaction.status!=='ForSale'">
                                <span v-if="productModules.transaction.status==='Sold'" class="status-badge s-sold" style="font-size:1.2rem;padding:10px 20px;">已售出</span>
                                <span v-else class="status-badge s-nfs" style="font-size:1.2rem;padding:10px 20px;">非賣/預訂</span>
                            </div>
                            <div v-else class="price" style="font-size:2.5rem;">NT$ {{productModules.transaction.price}}</div>
                        </div>

                        <div class="guarantee-icons-row">
                            <div class="g-icon-pill g-pill-green"><span>🛡️</span> 100% 健康</div>
                            <div class="g-icon-pill g-pill-blue"><span>🧬</span> 基因正確</div>
                            <div class="g-icon-pill g-pill-orange"><span>🚚</span> 運輸賠償</div>
                        </div>

                        <div class="prod-guarantee">
                            <span style="font-size:1.2rem; margin-right:10px;">🛡️</span>
                            <span>{{productModules.health.statement}}</span>
                        </div>

                        <div class="prod-actions" style="margin-top:20px;">
                            <a v-if="productModules.transaction.status==='ForSale'" :href="lineLink" target="_blank" class="btn-buy-lg">💬 私訊購買 (Line)</a>
                            <button class="btn-share" @click="copy(window.location.href)">🔗 複製連結分享</button>
                        </div>
                        <div style="font-size:0.8rem; color:#666; margin-top:10px;">⚠️ {{productModules.expectations.notice}}</div>
                    </div>
                </div>
                <div class="prod-terms-box">
                    <div class="terms-title">⚠️ 取貨注意事項 & 購買須知 ⚠️</div>
                    <ul class="terms-list">
                        <li>Gencko工作室出貨前皆確認個體100%健康，所有個體皆為負責人親自餵食，確保進食穩定且無隱憂才會上架販售。</li>
                        <li>開箱請全程錄影，以利於後續爭議處理。</li>
                        <li>有任何問題請於48小時內提出，逾期不候。</li>
                        <li>請提前準備好守宮之飼養環境。</li>
                        <li>守宮會因飼主飼養方式不當而造成問題，本工作室將不予退換貨。</li>
                        <li>個體有缺陷且本工作室無事先告知，本方無條件退款 (需提供錄影確保個體無調包嫌疑)。</li>
                        <li>運送過程死亡，本工作室全額退款；運送過程斷尾，本工作室退還50%款項 (需提供錄影確保個體無調包嫌疑)。</li>
                        <li>購買前請做足功課，本社群、官方皆可無償教學，請做好準備再進行購買。</li>
                        <li style="color:var(--pri); font-weight:bold; margin-top:10px;">購買視同同意以上須知事項。</li>
                    </ul>
                </div>
            </div></div></transition>

            <!-- Breeders -->
            <transition name="fade">
            <div v-show="curTab==='breeders'">
                <h1 class="page-title">種群展示</h1>
                <div class="tabs">
                    <div class="tab" :class="{active:breeder_sp==='豹紋守宮'}" @click="changeBreederSpecies('豹紋守宮')">豹紋守宮</div>
                    <div class="tab" :class="{active:breeder_sp==='肥尾守宮'}" @click="changeBreederSpecies('肥尾守宮')">肥尾守宮</div>
                </div>
                <!-- Breeders Grid (Photo Grid) -->
                <div class="grid photo-grid">
                    <div class="card" v-for="i in breedersList" :key="i.ID" @click="openLightbox(i)">
                        <img :src="convertLink(i.ImageURL)" class="card-img">
                        <div class="card-body" style="padding:10px;">
                            <div class="morph-title" style="font-size:1rem;text-align:center;">{{i.Morph}}</div>
                        </div>
                    </div>
                </div>
            </div>
            </transition>

            <!-- Merch -->
            <transition name="fade">
            <div v-show="curTab==='merch'">
                <h1 class="page-title">周邊商品</h1>
                <div class="grid">
                    <div class="card" v-for="m in merchList" :key="m.ItemID" @click="openMerchDetail(m.ItemID)">
                        <img :src="convertLink(m.ImageURL)" class="card-img">
                        <div class="card-body">
                            <div class="morph-title">{{m.Name}}</div>
                            <div class="price">NT$ {{m.Price}}</div>
                        </div>
                    </div>
                </div>
            </div>
            </transition>
            
            <!-- Merch Detail -->
            <transition name="fade">
            <div v-show="curTab==='merch_detail'">
                <div v-if="currentMerch" class="prod-container">
                    <button class="btn-back" @click="navigateTo('/merch')">← 返回列表</button>
                    <div class="prod-layout">
                        <div class="prod-img-box">
                            <img :src="convertLink(currentMerch.ImageURL)" class="prod-main-img">
                        </div>
                        <div class="prod-info-box">
                            <h1 class="prod-title">{{currentMerch.Name}}</h1>
                            <div class="merch-desc">{{currentMerch.Description}}</div>
                            <div class="prod-price-area">
                                <div class="price">NT$ {{currentMerch.Price}}</div>
                            </div>
                            <div class="prod-actions">
                                <a v-if="currentMerch.Available!=='No'" :href="currentMerch.ExternalLink || lineLink" target="_blank" class="btn-buy-lg">🛒 前往購買</a>
                                <button class="btn-share" @click="copy(window.location.href)">🔗 複製連結分享</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </transition>

            <!-- Genes -->
            <transition name="fade">
            <div v-show="curTab==='genes'">
                <h1 class="page-title">守宮基因圖鑑</h1>
                <div class="tabs">
                    <div class="tab" :class="{active: geneSpecies==='豹紋守宮'}" @click="geneSpecies='豹紋守宮'">豹紋守宮</div>
                    <div class="tab" :class="{active: geneSpecies==='肥尾守宮'}" @click="geneSpecies='肥尾守宮'">肥尾守宮</div>
                </div>
                <div v-for="(list, cat) in db[geneSpecies]" class="gene-section">
                    <h2 class="gene-cat-title">{{cat}}</h2>
                    <div class="gene-btn-grid">
                        <div v-for="g in list" class="gene-btn-item" @click="openGenePage(g)">{{g}} <span>➜</span></div>
                    </div>
                </div>
            </div>
            </transition>
            <transition name="fade">
                <div v-show="curTab==='gene_detail'">
                    <div v-if="viewingGene" class="prod-container">
                        <button class="btn-back" @click="navigateTo('/genes')">← 返回</button>
                        <div class="page-text-box">
                            <h1 class="page-title">{{viewingGene.Name}}</h1>
                            <div v-if="viewingGene.Warning" class="warn-box">{{viewingGene.Warning}}</div>
                            <div class="about-layout">
                                <img v-if="viewingGene.ImageURL" :src="convertLink(viewingGene.ImageURL)" class="about-img">
                                <div class="about-content">
                                    <h3>基因簡介</h3>
                                    <p>{{viewingGene.Brief}}</p>
                                    <div v-if="viewingGene.Detail">
                                        <h3 style="margin-top:20px;color:var(--pri)">詳細敘述</h3>
                                        <p style="white-space:pre-wrap">{{viewingGene.Detail}}</p>
                                    </div>
                                    <div v-if="viewingGene.Source" style="margin-top:20px;font-size:0.9rem;color:#888;border-top:1px solid var(--bd);padding-top:10px">
                                        資料來源：{{viewingGene.Source}}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </transition>

            <!-- FAQ -->
            <transition name="fade"><div v-show="curTab==='faq'" class="page-text-box">
                <div class="page-title">FAQ</div>
                <div v-for="(q, idx) in faqList" :key="idx" class="faq-item" :class="{active: q.open}">
                    <div class="faq-q" @click="q.open = !q.open">{{q.title}} <span>{{q.open?'▲':'▼'}}</span></div>
                    <div class="faq-body-wrapper">
                        <div class="faq-body-inner">
                            <div class="faq-a" v-html="q.ans.replace(/\n/g, '<br>')"></div>
                        </div>
                    </div>
                </div>
            </div></transition>
        </div>

        <!-- Floating Inquire Button -->
        <a v-if="wishlist.length > 0" 
           :href="'https://line.me/R/ti/p/@219abdzn?text=' + encodeURIComponent('Hi Gencko, 我有興趣詢問收藏清單中的守宮 (' + wishlist.length + '隻) ID：\n' + wishlist.join(', '))" 
           target="_blank"
           class="floating-inquire-btn">
           <span>❤ 已選 {{wishlist.length}} 隻｜一次詢問</span>
           <span>➜</span>
        </a>

        <!-- Admin -->
        <div v-if="admin" class="admin-box">
            <h2 style="color:var(--pri);border-bottom:1px solid #333;padding-bottom:10px;margin-bottom:20px;">🛠️ 後台管理系統</h2>
            
            <!-- Dashboard Stats -->
            <div class="dash">
                <div class="d-item"><div style="font-size:0.8rem;color:#888">庫存總成本</div><div class="d-val">${{dash.cost}}</div></div>
                <div class="d-item"><div style="font-size:0.8rem;color:#888">營業額</div><div class="d-val" style="color:var(--pri)">${{dash.val}}</div></div>
                <div class="d-item"><div style="font-size:0.8rem;color:#888">在庫數</div><div class="d-val" style="color:#2196F3">{{dash.count}}</div></div>
            </div>

            <!-- Editor Form (3-Column Grid) -->
            <div class="admin-editor-panel">
                <div class="admin-panel-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <h3 style="color:#eee; margin:0;">{{ editMode ? '編輯模式: ' + newI.ID : '新增個體' }}</h3>
                    <button v-if="editMode" @click="cancelEdit" style="background:#444;border:none;color:#fff;padding:6px 12px;border-radius:4px;cursor:pointer;">取消編輯</button>
                </div>

                <div class="admin-form-grid">
                    <!-- Column 1: Basic Info -->
                    <div class="af-col">
                        <label class="af-lbl">物種 & 品系</label>
                        <div class="tabs" style="margin-bottom:10px;">
                            <div class="tab" :class="{active:newI.Species==='豹紋守宮'}" @click="newI.Species='豹紋守宮'">豹紋守宮</div>
                            <div class="tab" :class="{active:newI.Species==='肥尾守宮'}" @click="newI.Species='肥尾守宮'">肥尾守宮</div>
                        </div>
                        <input class="inp" v-model="newI.Morph" list="his" placeholder="品系名稱 (Morph)">
                        <datalist id="his"><option v-for="m in morphHis" :value="m"></option></datalist>

                        <label class="af-lbl" style="margin-top:15px;">性別 & 生日</label>
                        <div class="af-gender-group">
                            <label><input type="radio" value="公" v-model="newI.GenderType"> 公</label>
                            <label><input type="radio" value="母" v-model="newI.GenderType"> 母</label>
                            <label><input type="radio" value="溫度" v-model="newI.GenderType"> 溫</label>
                            <input v-if="newI.GenderType==='溫度'" type="number" class="inp" v-model="newI.GenderValue" placeholder="°C" style="width:70px;padding:5px;">
                        </div>
                        <input type="date" class="inp" v-model="newI.Birthday">
                    </div>

                    <!-- Column 2: Pricing & Details -->
                    <div class="af-col">
                        <label class="af-lbl">價格設定</label>
                        <div style="display:flex; gap:10px;">
                            <div style="flex:1">
                                <small style="color:#888">進貨成本</small>
                                <div class="symbol-wrap">
                                    <span>$</span>
                                    <input type="number" class="inp" v-model="newI.CostPrice">
                                </div>
                            </div>
                            <div style="flex:1">
                                <small style="color:#888">上架價格</small>
                                <div class="symbol-wrap">
                                    <span>$</span>
                                    <input type="number" class="inp" v-model="newI.ListingPrice">
                                </div>
                            </div>
                        </div>

                        <label class="af-lbl" style="margin-top:15px;">圖片 & 備註</label>
                        <input class="inp" v-model="newI.ImageURL" placeholder="圖片連結 (URL)" style="margin-bottom:10px;">
                        <textarea class="inp" v-model="newI.Note" placeholder="備註..." rows="2" style="font-family:inherit;"></textarea>

                        <div class="af-hot-box">
                            <label style="color:#FF5722; cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:bold;">
                                <input type="checkbox" v-model="newI.IsHot" true-value="Hot" false-value="">
                                🔥 設定為熱門精選 (Hot)
                            </label>
                        </div>
                    </div>

                    <!-- Column 3: Genes -->
                    <div class="af-col">
                        <label class="af-lbl">基因標籤選擇</label>
                        <div class="admin-gene-box">
                            <div v-for="(l,c) in db[newI.Species]" :key="c" style="margin-bottom:10px;">
                                <div style="color:#aaa;font-size:0.8rem;border-bottom:1px solid #ddd;margin-bottom:5px;font-weight:bold;">{{c}}</div>
                                <div style="display:flex;flex-wrap:wrap;gap:5px;">
                                    <label v-for="g in l" class="gene-chk-tag" style="display:inline-block;padding:2px 8px;border:1px solid #ccc;cursor:pointer;font-size:0.85rem;border-radius:4px;">
                                        <input type="checkbox" :value="g" v-model="newI.Genes" style="vertical-align:middle;"> {{g}}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <button class="tab active" style="width:100%;margin-top:20px;background:var(--pri);border:none;padding:15px;font-size:1.1rem;cursor:pointer;" @click="submit" :disabled="loading">
                    {{loading?'處理中...':(editMode?'💾 儲存修改':'🚀 確認上架')}}
                </button>
            </div>

            <!-- Inventory List (Compact Expandable Grid) -->
            <h3 style="margin-top:40px;border-bottom:1px solid #333;padding-bottom:10px;color:#eee">庫存列表 ({{adminList.length}})</h3>
            <div style="display:flex;gap:10px;margin-bottom:15px;flex-wrap:wrap;">
                <input class="inp" v-model="aKw" placeholder="🔍 搜尋 ID / 品系 / 備註..." style="flex:2;min-width:200px;">
                <select class="inp" v-model="aFil" style="flex:1;min-width:140px;"><option value="All">全部</option><option value="ForSale">販售中</option><option value="Sold">已售出</option><option value="Trash">垃圾桶</option></select>
            </div>

            <div class="admin-card-grid">
                <div v-for="i in adminList" :key="i.ID" class="admin-card" :class="{sold: i.Status==='Sold'}">
                    <!-- Top: Compact Row -->
                    <div class="ac-compact-row">
                        <div class="ac-img-thumb" @click="openLightbox(i)">
                            <img v-if="i.ImageURL" :src="convertLink(i.ImageURL)" loading="lazy">
                            <div v-else>🦎</div>
                            <div v-if="i.IsHot==='Hot'" class="ac-hot-dot">🔥</div>
                        </div>
                        
                        <div class="ac-main-info">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                                <span class="ac-id">{{i.ID}}</span>
                                <span :class="getSexCls(i)" style="font-size:0.8rem;font-weight:bold;">{{fmtSex(i)}}</span>
                            </div>
                            <!-- Direct Input for Morph -->
                            <input class="ac-morph-inp" v-model.lazy="i.Morph" @change="upd(i)" placeholder="品系名稱...">
                            
                            <div style="display:flex;gap:5px;margin-top:4px;align-items:center;">
                                <select v-model="i.Status" @change="chkStat(i)" class="ac-mini-select" :class="'st-'+i.Status">
                                    <option value="ForSale">販售</option>
                                    <option value="Sold">售出</option>
                                    <option value="NotForSale">自留</option>
                                </select>
                                <div class="symbol-wrap mini">
                                    <span>$</span>
                                    <input type="number" v-model.lazy="i.ListingPrice" @change="upd(i)" class="ac-mini-price">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom: Expandable Details -->
                    <details class="ac-details">
                        <summary class="ac-summary">
                            <span>詳細資料 / 編輯</span>
                            <span class="arrow">▼</span>
                        </summary>
                        <div class="ac-expand-box">
                            <div class="ac-grid-2">
                                <div>
                                    <label>進貨成本</label>
                                    <input type="number" v-model.lazy="i.CostPrice" @change="upd(i)" class="ac-edit-inp">
                                </div>
                                <div>
                                    <label>生日</label>
                                    <input type="date" v-model.lazy="i.Birthday" @change="upd(i)" class="ac-edit-inp">
                                </div>
                            </div>
                            
                            <div style="margin-top:8px;">
                                <label>備註 (Note)</label>
                                <textarea v-model.lazy="i.Note" @change="upd(i)" class="ac-edit-inp" rows="2"></textarea>
                            </div>

                            <div style="margin-top:8px; display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px;">
                                <label style="display:flex;align-items:center;gap:5px;cursor:pointer;flex:1;color:#eee;font-size:0.85rem;">
                                    <input type="checkbox" :checked="i.IsHot==='Hot'" @change="i.IsHot = $event.target.checked ? 'Hot' : ''; upd(i)">
                                    🔥 熱門精選 (HOT)
                                </label>
                            </div>

                            <div class="ac-action-row">
                                <div style="flex:1"></div>
                                <div style="display:flex;gap:5px;">
                                    <button class="btn-icon copy" @click="dup(i)" title="複製">⎘</button>
                                    <button class="btn-icon del" @click="del(i)" title="刪除">🗑</button>
                                </div>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>

        <!-- Admin (End) -->
        <!-- 確保這下面沒有其他多餘的 HTML -->
        
        <footer @click="login">
            <div style="margin-bottom:5px;font-weight:bold;color:var(--pri);">Gencko Studio｜專業豹紋守宮選育工作室</div>
            <div>© 2026 Gencko Studio. 版權所有</div>
        </footer>
    </div> <!-- 這是 .cont 的結束標籤 -->
</template> <!-- 這是 template 的結束標籤 -->