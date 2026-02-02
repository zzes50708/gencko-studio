<script>
import { _supabase } from './supabase.js';
import { store } from './store.js';

// 引入各功能模組 (Mixins)
import { shopLogic } from './modules/shop.js';
import { contentLogic } from './modules/content.js';
import { adminLogic } from './modules/admin.js';
import { toolsLogic } from './modules/tools.js';
// 注意：Calculator 邏輯已移至 CalculatorView 內部，此處不再引入

import { FAQ_DATA } from './data/faq.js';
import GENES_DB from './data/genes.json'; 

// 引入視圖 (Views)
import HomeView from './views/HomeView.vue';
import AboutView from './views/AboutView.vue';
import CareView from './views/CareView.vue';
import FaqView from './views/FaqView.vue';
import ArticlesView from './views/ArticlesView.vue';
import GenesView from './views/GenesView.vue';
import QsView from './views/QsView.vue';
import HealthView from './views/HealthView.vue';
import HospitalView from './views/HospitalView.vue';
import BreedersView from './views/BreedersView.vue';
import MerchView from './views/MerchView.vue';
import ShopView from './views/ShopView.vue';
import AdminView from './views/AdminView.vue';
import CalculatorView from './views/CalculatorView.vue';

// 引入全域組件 (Layout Components)
import TheLightbox from './components/TheLightbox.vue';
import TheMarquee from './components/TheMarquee.vue';
import TheToast from './components/TheToast.vue';
import TheFooter from './components/TheFooter.vue';
import TheNavbar from './components/TheNavbar.vue';

export default {
    name: 'App',
    components: {
        // Views
        HomeView, AboutView, CareView, FaqView, ArticlesView, GenesView,
        QsView, HealthView, HospitalView, BreedersView, MerchView, ShopView, AdminView, CalculatorView,
        // Layouts
        TheLightbox, TheMarquee, TheToast, TheFooter, TheNavbar
    },
    // CalculatorLogic 已移除
    mixins: [shopLogic, contentLogic, adminLogic, toolsLogic],
    
    // --- 1. Data ---
    data() {
        return {
            db: GENES_DB || {},
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
        
        geneSpecies: { get() { return store.geneSpecies || '豹紋守宮'; }, set(v) { store.geneSpecies = v; } }
    },

    // --- 3. Watch ---
    watch: {
        curTab() { this.$nextTick(() => this.updateMeta()); },
        'store.readingArticle'() { this.$nextTick(() => this.updateMeta()); },
        targetProductId() { this.$nextTick(() => this.updateMeta()); },
        'store.viewingGene'() { this.$nextTick(() => this.updateMeta()); }
    },

    // --- 4. Mounted ---
    mounted() {
        this.initTheme();
        this.loadDataFromAPI();
        this.resolveRoute(window.location.pathname);
        
        window.addEventListener('popstate', () => {
            if (this.lightboxItem) this.lightboxItem = null;
            else this.resolveRoute(window.location.pathname);
        });

        document.addEventListener('click', this.handleLinkClick);

        const savedWish = localStorage.getItem('gencko_wishlist');
        if(savedWish) store.wishlist = JSON.parse(savedWish);
        const savedHist = localStorage.getItem('gencko_history');
        if(savedHist) store.history = JSON.parse(savedHist);
        
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
        <!-- Global Layout Components -->
        <TheLightbox 
            :item="lightboxItem" 
            :line-link="lineLink"
            @close="closeLightbox" 
        />
        
        <TheToast :show="showToast" />
        
        <TheMarquee :list="marqueeList" />
        
        <TheNavbar
            :nav-hidden="navHidden"
            :admin="admin"
            :is-day-mode="isDayMode"
            v-model:mobile-menu-open="mobileMenuOpen"
            :logo-url="logoUrl"
            :cur-tab="curTab"
            :reading-article="readingArticle"
            :reading-progress="readingProgress"
            @toggle-theme="toggleTheme"
            @logout="admin = false"
            @navigate="navigateTo"
            @scroll-top="scrollToTop"
        />

        <div v-if="!admin" style="padding-top: 0;">
            <!-- Views -->
            <transition name="fade">
                <HomeView v-show="curTab==='home'"
                    :loading="loading"
                    :hot-list="hotList"
                    :articles-list="articlesList"
                    @navigate="navigateTo"
                    @set-beginner="setBeginnerMode"
                    @open-product="openProduct"
                    @open-article="openArticle"
                />
            </transition>

            <transition name="fade">
                <AboutView v-show="curTab==='about'" :about-img="aboutImg" />
            </transition>

            <transition name="fade">
                <CalculatorView v-show="curTab==='calculator'" />
            </transition>

            <transition name="fade">
                <CareView v-show="curTab==='care'" :care-img="careImg" />
            </transition>

            <transition name="fade">
                <ArticlesView v-show="curTab==='articles'" 
                    :filtered-articles="filteredArticles"
                    :article-cats="articleCats"
                    :reading-article="readingArticle"
                    v-model:art-cat="artCat"
                    @open-article="openArticle"
                    @close-article="closeArticle"
                />
            </transition>

            <!-- QS Questionnaire -->
            <transition name="fade">
                <QsView v-show="curTab==='qs'"
                    :qs="qs"
                    :qs-progress="qs_progress"
                    :qs-current-q="qs_currentQ"
                    :qs-result="qs_result"
                    :qs-total-score="qs_totalScore"
                    @select-option="qs_selectOption"
                    @prev-step="qs_prevStep"
                    @reset="qs_reset"
                />
            </transition>

            <!-- Health Assessment -->
            <transition name="fade">
                <HealthView v-show="curTab==='health'"
                    :health="health"
                    :health-result="health_result"
                />
            </transition>
            
            <!-- Hospital Map -->
            <transition name="fade">
                <HospitalView v-show="curTab==='hospital'"
                    :hosp-city="hosp_city"
                    v-model:hosp-district="hosp_district"
                    :hosp-regions="hosp_regions"
                    :hosp-available-cities="hosp_availableCities"
                    :hosp-districts="hosp_districts"
                    :hosp-filtered="hosp_filtered"
                    @change-city="(val) => { hosp_city = val; hosp_district = 'all'; }"
                />
            </transition>

            <!-- Shop & Product Detail -->
            <ShopView 
                :cur-tab="curTab"
                v-model:sp="sp"
                v-model:kw="kw"
                :fil="fil"
                :shop-list="shopList"
                :tags="tags"
                :db="db"
                :available-genes="availableGenes"
                :max-price="maxPrice"
                v-model:show-mobile-filter="showMobileFilter"
                v-model:open-f-cat="openFCat"
                v-model:sort-order="sortOrder"
                v-model:show-only-history="showOnlyHistory"
                v-model:show-only-fav="showOnlyFav"
                :wishlist="wishlist"
                :product-modules="productModules"
                :current-product="currentProduct"
                :line-link="lineLink"
                @reset-filters="resetFilters"
                @toggle-tag="toggleTag"
                @search-input="onSearchInput"
                @open-product="openProduct"
                @toggle-wishlist="toggleWishlist"
                @navigate="toShop"
                @copy="copy"
                @open-lightbox="openLightbox"
            />

            <!-- Breeders -->
            <transition name="fade">
                <BreedersView v-show="curTab==='breeders'"
                    :breeders-list="breedersList"
                    v-model:breeder-sp="breeder_sp"
                    @open-lightbox="openLightbox"
                />
            </transition>

            <!-- Merch -->
            <MerchView 
                :cur-tab="curTab"
                :merch-list="merchList"
                :current-merch="currentMerch"
                :line-link="lineLink"
                @open-detail="openMerchDetail"
                @navigate="navigateTo"
                @copy="copy"
            />

            <!-- Genes -->
            <GenesView 
                :cur-tab="curTab"
                :db="db"
                v-model:gene-species="geneSpecies"
                :viewing-gene="viewingGene"
                @open-gene="openGenePage"
                @navigate="navigateTo"
            />

            <!-- FAQ -->
            <transition name="fade">
                <FaqView v-show="curTab==='faq'" :faq-list="faqList" />
            </transition>
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
        <AdminView v-if="admin"
            :loading="loading"
            :dash="dash"
            :admin-list="adminList"
            :morph-his="morphHis"
            :db="db"
            :edit-mode="editMode"
            :new-i="newI"
            v-model:a-kw="aKw"
            v-model:a-fil="aFil"
            @submit="submit"
            @cancel-edit="cancelEdit"
            @check-status="chkStat"
            @update-item="upd"
            @duplicate-item="dup"
            @delete-item="del"
            @open-lightbox="openLightbox"
        />
        
        <TheFooter @trigger-login="login" />
    </div>
</template>