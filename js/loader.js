/**
 * Loader Control Script
 * 處理全域讀取遮罩的顯示與隱藏
 */

// 定義全域隱藏函式，供 app.js 在 mounted 後呼叫
window.hideLoader = function() {
    const loader = document.getElementById('loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            loader.classList.remove('active');
        }, 500);
    }
};

// 安全機制：若 Vue 發生錯誤未能掛載，3秒後強制隱藏遮罩，避免白畫面卡死
window.addEventListener('load', function() {
    setTimeout(() => {
        if (document.getElementById('loader').style.display !== 'none') {
            console.warn('Loader force hidden by failsafe timer.');
            window.hideLoader();
        }
    }, 3000);
});