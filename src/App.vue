<script>
import { _supabase } from './supabase.js';
import { store } from './store.js';

// 引入各功能模組 (Mixins)
import { shopLogic } from './modules/shop.js';
import { contentLogic } from './modules/content.js';
import { adminLogic } from './modules/admin.js';
import { toolsLogic } from './modules/tools.js';

import { FAQ_DATA } from './data/faq.js';
import GENES_DB from './data/genes.json'; 

// 引入全域組件 (Layout Components)
import TheLightbox from './components/TheLightbox.vue';
import TheMarquee from './components/TheMarquee.vue';
import TheToast from './components/TheToast.vue';
import TheFooter from './components/TheFooter.vue';
import TheNavbar from './components/TheNavbar.vue';

export default {
    name: 'App',
    components: {
        TheLightbox, TheMarquee, TheToast, TheFooter, TheNavbar
    },
    mixins: [shopLogic, contentLogic, adminLogic, toolsLogic],
    
    data() {
        return {
            db: GENES_DB || {},
            readingProgress: 0,
            searchTimer: null
        };
    },

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

    watch: {
        '$route'(to) { this.handleRouteChange(to); },
        'store.loading'(val) { if (!val) this.syncStateWithRoute(); }
    },

    mounted() {
        this.initTheme();
        this.loadDataFromAPI();
        
        window.addEventListener('popstate', () => {
            if (this.lightboxItem) this.lightboxItem = null;
        });

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

    methods: {
        handleRouteChange(to) {
            this.mobileMenuOpen = false;
            document.querySelectorAll('details.mm-details[open]').forEach(el => el.removeAttribute('open'));

            if (to.name === 'admin' && !this.admin) {
                this.$router.replace('/');
                return;
            }

            // 修正路由狀態判斷
            if (to.path.startsWith('/articles')) {
                this.curTab = 'articles';
            } else {
                this.curTab = to.name || 'home';
            }

            this.syncStateWithRoute(to);
            this.$nextTick(() => this.updateMeta());
            if (!to.hash) window.scrollTo(0, 0);
        },

        syncStateWithRoute(route = this.$route) {
            if (store.loading) return;

            if (route.name === 'product_detail') {
                this.targetProductId = route.params.id;
            }
            
            if (route.name === 'article_detail') {
                const artId = route.params.id;
                if (store.articlesList.length) {
                    store.readingArticle = store.articlesList.find(a => a.ID === artId) || null;
                }
            } else if (route.name === 'articles') {
                store.readingArticle = null;
            }

            if (route.name === 'gene_detail') {
                const geneName = route.params.id;
                let found = null;
                if (store.genePages.length) {
                    found = store.genePages.find(g => g.Name === geneName);
                }
                store.viewingGene = found || { Name: geneName, Brief: '資料載入中或無此基因...' };
            } else if (route.name === 'genes') {
                store.viewingGene = null;
            }

            if (route.name === 'merch_detail') {
                this.targetMerchId = route.params.id;
            }
        },

        navigateTo(path) {
            if (path.startsWith('http')) window.open(path, '_blank');
            else this.$router.push(path);
        },
        openProduct(id) { this.$router.push(`/product/${id}`); },
        openArticle(item) { this.$router.push(`/articles/${item.ID}`); },
        closeArticle() { this.$router.push('/articles'); },
        openGenePage(gName) { this.$router.push(`/genes/${encodeURIComponent(gName)}`); },
        openMerchDetail(item) { this.$router.push(`/merch/${item.ItemID}`); },
        toShop() { this.$router.push('/shop'); },
        
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
        scrollToTop() { window.scrollTo(0,0); },
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
        
        // --- 修正的新手模式 ---
        setBeginnerMode() {
            this.$router.push('/shop').then(() => {
                this.resetFilters();
                // 移除檢查，直接強制加入標籤
                this.toggleTag('新手推薦');
            });
        },
        
        updateMeta() {
            let title = '守宮選購與飼養｜Gencko Studio';
            if(this.curTab === 'calculator') title = '基因計算機｜Gencko Studio';
            if(this.curTab === 'shop' && this.currentProduct) title = `${this.currentProduct.Morph}｜Gencko Studio`;
            if(this.curTab === 'articles' && store.readingArticle) title = `${store.readingArticle.Title}｜Gencko Studio`;
            if(this.curTab === 'shop') title = '線上選購守宮｜Gencko Studio';
            if(this.curTab === 'genes') title = '守宮基因圖鑑｜Gencko Studio';
            if(this.curTab === 'hospital') title = '特寵醫院地圖｜Gencko Studio';
            document.title = title;
        }
    }
};
</script>

<template>
    <div class="cont">
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

       <!-- 設定 min-height 防止轉場時 footer 上跳 -->
        <div style="padding-top: 0; min-height: 80vh;">
            <!-- Router View (補上 cur-tab) -->
            <router-view v-slot="{ Component }">
                <transition name="fade" mode="out-in">
                    <component :is="Component"
                        :loading="loading"
                        :cur-tab="curTab" 
                        
                        :hot-list="hotList"
                        :articles-list="articlesList"
                        :wishlist="wishlist"
                        :merch-list="merchList"
                        :gene-pages="genePages"
                        
                        :about-img="aboutImg"
                        :care-img="careImg"
                        :line-link="lineLink"
                        
                        :filtered-articles="filteredArticles"
                        :article-cats="articleCats"
                        :reading-article="readingArticle"
                        v-model:art-cat="artCat"

                        :qs="qs"
                        :qs-progress="qs_progress"
                        :qs-current-q="qs_currentQ"
                        :qs-result="qs_result"
                        :qs-total-score="qs_totalScore"
                        
                        :health="health"
                        :health-result="health_result"
                        
                        :hosp-city="hosp_city"
                        v-model:hosp-district="hosp_district"
                        :hosp-regions="hosp_regions"
                        :hosp-available-cities="hosp_availableCities"
                        :hosp-districts="hosp_districts"
                        :hosp-filtered="hosp_filtered"
                        @change-city="(val) => { hosp_city = val; hosp_district = 'all'; }"

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
                        :product-modules="productModules"
                        :current-product="currentProduct"
                        
                        :breeders-list="breedersList"
                        v-model:breeder-sp="breeder_sp"
                        
                        :current-merch="currentMerch"
                        
                        v-model:gene-species="geneSpecies"
                        :viewing-gene="viewingGene"
                        
                        :faq-list="faqList"
                        
                        :dash="dash"
                        :admin-list="adminList"
                        :morph-his="morphHis"
                        :edit-mode="editMode"
                        :new-i="newI"
                        v-model:a-kw="aKw"
                        v-model:a-fil="aFil"
                        
                        @navigate="navigateTo"
                        @set-beginner="setBeginnerMode"
                        @open-product="openProduct"
                        @open-article="openArticle"
                        @close-article="closeArticle"
                        @open-gene="(g) => openGenePage(typeof g === 'string' ? g : g.Name)"
                        @open-detail="openMerchDetail"
                        
                        @select-option="qs_selectOption"
                        @prev-step="qs_prevStep"
                        @reset="qs_reset"
                        
                        @reset-filters="resetFilters"
                        @toggle-tag="toggleTag"
                        @search-input="onSearchInput"
                        @toggle-wishlist="toggleWishlist"
                        @copy="copy"
                        @open-lightbox="openLightbox"
                        
                        @submit="submit"
                        @cancel-edit="cancelEdit"
                        @check-status="chkStat"
                        @update-item="upd"
                        @duplicate-item="dup"
                        @delete-item="del"
                    />
                </transition>
            </router-view>
        </div>

        <!-- Floating Inquire Button -->
        <a v-if="wishlist.length > 0 && !admin" 
           :href="'https://line.me/R/ti/p/@219abdzn?text=' + encodeURIComponent('Hi Gencko, 我有興趣詢問收藏清單中的守宮 (' + wishlist.length + '隻) ID：\n' + wishlist.join(', '))" 
           target="_blank"
           class="floating-inquire-btn">
           <span>❤ 已選 {{wishlist.length}} 隻｜一次詢問</span>
           <span>➜</span>
        </a>
        
        <TheFooter @trigger-login="login" />
    </div>
</template>