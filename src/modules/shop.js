import { store } from '../store.js';

export const shopLogic = {
    data() {
        return {
            // --- 搜尋與篩選 ---
            kw: '', 
            sp: '豹紋守宮', // 商城用的物種變數
            breeder_sp: '豹紋守宮', // [修正] 種群展示用的獨立物種變數
            // [新增] beginner: false
            fil: { stock:true, sold:false, minP:'', maxP:'', sexM:true, sexF:true, genes:[], beginner:false },
            showMobileFilter: false,
            openFCat: null,
            sortOrder: 'default',
            displayLimit: 20,
            
            // --- 標籤與分類 ---
            tags: {'豹紋守宮':['黑夜','蜜橘','紅鑽石','土匪'],'肥尾守宮':['幽靈','橘白','無紋','立可白']},
            
            // --- 基因篩選資料庫 ---
            db: {}, 

            // --- 詳細頁路由參數 ---
            targetProductId: null,
            targetMerchId: null,

            // --- 個人化開關 ---
            showOnlyFav: false,
            showOnlyHistory: false
        };
    },
    computed: {
        // --- 商城列表 (含篩選/排序) ---
        shopList() {
            let l = store.inv.filter(i => {
                if (i.Species !== this.sp || i.Status === 'Trash' || i.Status === 'NotForSale') return false;
                const isSold = i.Status === 'Sold';
                const isStock = i.Status === 'ForSale' || i.Status === 'Reserved';
                if (!this.fil.sold && isSold) return false;
                if (!this.fil.stock && isStock) return false;
                
                const p = Number(i.ListingPrice) || 0;
                if (this.fil.minP && p < this.fil.minP) return false;
                if (this.fil.maxP && p > this.fil.maxP) return false;

                const sex = i.GenderType;
                const isM = sex === '公' || (sex === '溫度' && Number(i.GenderValue) >= 30);
                const isF = sex === '母' || (sex === '溫度' && Number(i.GenderValue) <= 27);
                if (!this.fil.sexM && isM) return false;
                if (!this.fil.sexF && isF) return false;

                // [新增] 新手推薦篩選 (檢查備註欄位)
                if (this.fil.beginner && (!i.Note || !i.Note.includes('新手推薦'))) return false;

                if (this.fil.genes.length > 0) {
                    const iGenes = Array.isArray(i.Genes) ? i.Genes : [];
                    if (!this.fil.genes.every(g => iGenes.includes(g))) return false;
                }
                return true;
            });

            if(this.kw) l = l.filter(i => JSON.stringify(i).toLowerCase().includes(this.kw.toLowerCase()));
            if(this.showOnlyFav) l = l.filter(i => store.wishlist.includes(i.ID));
            if(this.showOnlyHistory) l = l.filter(i => store.history.includes(i.ID));
            
            return l.sort((a,b) => {
                const imgA = a.ImageURL ? 1 : 0;
                const imgB = b.ImageURL ? 1 : 0;
                if(imgA !== imgB) return imgB - imgA;

                const statA = a.Status === 'Sold' ? 1 : 0;
                const statB = b.Status === 'Sold' ? 1 : 0;
                if(statA !== statB) return statA - statB;
                
                const priceA = Number(a.ListingPrice)||0;
                const priceB = Number(b.ListingPrice)||0;
                if(this.sortOrder === 'price_asc') return priceA - priceB;
                if(this.sortOrder === 'price_desc') return priceB - priceA;
                
                return priceB - priceA;
            }).slice(0, this.displayLimit);
        },
        // --- 商品詳情頁 Computed ---
        currentProduct() {
            if (!this.targetProductId || !store.inv.length) return null;
            return store.inv.find(i => i.ID === this.targetProductId) || null;
        },
        productModules() {
            const p = this.currentProduct;
            if (!p) return null;
            let geneArray = Array.isArray(p.Genes) ? p.Genes : (typeof p.Genes === 'string' ? [p.Genes] : []);
            return {
                identity: { id: p.ID, morph: p.Morph, genes: geneArray, gender: p.GenderType, genderValue: p.GenderValue, birth: p.Birthday || '未登錄', note: p.Note || '' },
                visuals: { list: p.ImageURL ? [p.ImageURL] : [] },
                health: { statement: '本工作室嚴格把關，所有上架個體均確認進食與排泄正常，無健康隱憂始開放選購。' },
                expectations: { notice: '基因表現受環境與成長過程影響，圖片僅供當下參考。' },
                transaction: { price: p.ListingPrice, status: p.Status }
            };
        },
        // --- 周邊商品詳情 Computed ---
        currentMerch() {
            if (!this.targetMerchId || !store.merchList.length) return null;
            return store.merchList.find(i => i.ItemID == this.targetMerchId) || null;
        },
        // --- 種群展示列表 ---
        breedersList() {
            // [修正] 改用 breeder_sp 進行篩選
            let list = store.inv.filter(i => i.Species === this.breeder_sp && i.Status === 'NotForSale' && i.Status !== 'Trash');
            return list.sort((a,b) => {
                const imgA = a.ImageURL ? 1 : 0;
                const imgB = b.ImageURL ? 1 : 0;
                if(imgA !== imgB) return imgB - imgA; 
                return new Date(b.CreatedDate) - new Date(a.CreatedDate);
            });
        },
        // --- 篩選器相關 Computed ---
        maxPrice() {
            const prices = store.inv.filter(i => i.Species === this.sp && i.Status === 'ForSale').map(i => Number(i.ListingPrice) || 0);
            return prices.length ? Math.max(...prices) : 0;
        },
        availableGenes() {
            const s = new Set();
            const targetStatus = this.fil.sold ? ['ForSale', 'Sold', 'Reserved'] : ['ForSale', 'Reserved'];
            store.inv.filter(i => i.Species === this.sp && targetStatus.includes(i.Status)).forEach(i => {
                if (Array.isArray(i.Genes)) i.Genes.forEach(g => s.add(g === '白黃' ? 'WY' : g));
            });
            return Array.from(s);
        }
    },
    methods: {
        toShop() { this.sp = '豹紋守宮'; this.kw=''; this.navigateTo('/shop'); },
        openProduct(id) { this.navigateTo('/product/' + id); },
        openMerchDetail(id) { this.navigateTo('/merch/' + id); },
        changeSpecies(s) { this.sp = s; this.kw = ''; this.displayLimit = 20; },
        // [新增] 種群展示切換物種方法
        changeBreederSpecies(s) { this.breeder_sp = s; },
        toggleTag(t) { this.kw = (this.kw === t) ? '' : t; this.displayLimit = 20; },
        onSearchInput(e) {
            const val = e.target.value;
            if(this.searchTimer) clearTimeout(this.searchTimer);
            this.searchTimer = setTimeout(() => { this.kw = val; this.displayLimit = 20; }, 300);
        },
        resetFilters() { 
            // [修正] 重置時包含 beginner
            this.fil = { stock:true, sold:false, minP:'', maxP:'', sexM:true, sexF:true, genes:[], beginner:false }; 
            this.kw = ''; 
            this.displayLimit = 20; 
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        },
        // [新增] 啟用新手模式
        setBeginnerMode() {
            this.resetFilters();
            this.fil.beginner = true;
            this.sp = '豹紋守宮';
            this.navigateTo('/shop');
        },
        toggleFCat(c) { this.openFCat = (this.openFCat === c) ? null : c; },
        isGeneAvail(g) { return this.availableGenes.includes(g); },
        getSortedGenes(list) { 
            return [...list].sort((a, b) => (this.isGeneAvail(b)?1:0) - (this.isGeneAvail(a)?1:0)); 
        },
        toggleWishlist(id) {
            if(store.wishlist.includes(id)) store.wishlist = store.wishlist.filter(x => x !== id);
            else store.wishlist.push(id);
            localStorage.setItem('gencko_wishlist', JSON.stringify(store.wishlist));
        },
        toggleHistoryMode() { this.showOnlyHistory = !this.showOnlyHistory; },
        
        // --- 顯示格式 ---
        fmtSex(i){
            if(i.GenderType==='溫度'){
                let t=+i.GenderValue;
                if(t>=31)return t+'°C (90%公)'; if(t>=30)return t+'°C (75%公)';
                if(t>=28)return t+'°C (均)'; if(t>=27)return t+'°C (75%母)';
                return t+'°C (90%母)';
            }
            return i.GenderType;
        },
        getSexCls(i){
            if(!i) return '';
            if(i.GenderType==='公'||(i.GenderType==='溫度'&& +i.GenderValue>=30))return 'male';
            if(i.GenderType==='母'||(i.GenderType==='溫度'&& +i.GenderValue<=27))return 'female';
            return 'mix';
        }
    }
};