# 節點 51：圖卡對話框語意

實際頁面使用個體及競標的原生圖卡 dialog；共用 TheLightbox 元件目前未見頁面使用，本輪未修改它。

移除兩頁圖卡內層容器重複的 `role="dialog"`、`aria-modal` 及標題引用，保留原生外層 dialog 的標題與關閉操作，避免輔助工具辨識出巢狀對話框。不改版面與圖卡生成。

`output/ux-node51-product.log` 與 `output/ux-node51-auction.log` 為相關手機圖卡、返回關閉、分享替代及重試測試；`output/ux-node51-compile.log` 為 Vue SFC 編譯檢查。未執行完整 Nuxt build，尚未部署。
