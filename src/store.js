import { reactive } from 'vue';

export const store = reactive({
    // --- 核心狀態 ---
    loading: false,
    isDayMode: true,
    curTab: 'home',
    
    // --- 資料儲存 (從 Supabase 讀取) ---
    inv: [],           // 庫存列表
    merchList: [],     // 周邊商品
    articlesList: [],  // 文章列表
    genePages: [],     // 基因圖鑑
    marqueeList: [],   // 跑馬燈
    
    hotList: [], // 
    // --- 使用者狀態 (Local Storage) ---
    wishlist: [],      // 最愛清單
    history: [],       // 瀏覽紀錄

    // --- 全域 UI 狀態 ---
    showToast: false,
    lightboxItem: null,
    navHidden: false,
    mobileMenuOpen: false,
    lastScrollY: 0,
    
    // --- 資源連結 ---
    careImg: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E7%92%B0%E5%A2%83.png', 
    aboutImg: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/324500%20(1).png',
    logoUrl: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
    lineLink: 'https://line.me/R/ti/p/@219abdzn'
});