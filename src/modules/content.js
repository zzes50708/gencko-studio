import { store } from '../store.js';
import { FAQ_DATA } from '../data/faq.js'; // 引入靜態資料

export const contentLogic = {
    data() {
        return {
            artCat: 'All', // 補回文章分類狀態
            faqList: JSON.parse(JSON.stringify(FAQ_DATA)) // 補回 FAQ 狀態並使其響應
        };
    },
    methods: {
        // --- 文章相關 ---
        openArticle(item) {
            store.readingArticle = item;
            this.navigateTo('/articles/' + item.ID);
        },
        closeArticle() {
            store.readingArticle = null;
            this.navigateTo('/articles');
        },
        fmtDate(d) { 
            try { return new Date(d).toISOString().split('T')[0]; } catch(e){ return ''; } 
        },

        // --- 基因圖鑑相關 ---
        openGenePage(name) {
            let target = name;
            // 處理直線基因在不同物種的名稱差異
            if (name === '直線') target = (store.geneSpecies === '豹紋守宮') ? '直線 (豹紋)' : '直線 (肥尾)';
            this.navigateTo('/genes/' + encodeURIComponent(target));
        },
        setViewingGene(name) {
            let found = store.genePages.find(g => g.Name === name);
            if(!found) found = { Name: name, Warning:'', Brief:'載入中或無資料', Detail:'', ImageURL:'', Source:'', Loading: true };
            store.viewingGene = { ...found, DisplayName: found.Name.replace(/ \((豹紋|肥尾)\)$/, '') };
        }
    },
    computed: {
        // --- 文章分類篩選 ---
        articleCats() {
            if(!store.articlesList.length) return [];
            return [...new Set(store.articlesList.map(i => i.Category).filter(c => c))];
        },
        filteredArticles() {
            if (!store.articlesList || store.articlesList.length === 0) return [];
            let list = store.articlesList;
            
            // 搜尋關鍵字 (kw 在 shopLogic 定義，但因為 mixin 混合，這裡可以用 this.kw)
            if (this.kw) {
                const k = this.kw.toLowerCase();
                return list.filter(i => i.Title.toLowerCase().includes(k) || i.Summary.toLowerCase().includes(k));
            }
            // 分類篩選
            if (this.artCat !== 'All') {
                list = list.filter(i => i.Category === this.artCat);
            }
            return list;
        }
    }
};