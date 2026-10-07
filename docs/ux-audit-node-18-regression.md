# 節點 18：全站集中回歸

2026-10-06 完成一般內容頁回歸，品牌動畫頁另列下一節點。

## 結果

- 63 項不同瀏覽器流程通過：初跑 61 項中 47 通過，14 項因測試寫死已關閉的 localhost:3001 連線失敗；修正 FAQ／文章與飼養指南使用執行設定的 baseURL 後，14 項補跑全部通過，同時重跑 3 項計算機流程；另 2 項舊周邊轉址與 Het 狀態通過。
- 96 項單元測試通過，35 個目前修改的 Vue 檔案編譯檢查通過。
- 保留手機熱門精選跑馬燈、既有計算機按鈕及原中文。
- Het／超級按鈕新增 aria-pressed，僅補選取語意，未更動版面。

## 舊原始碼測試清理

原先 shared-interaction 有 12 項失敗。11 項把舊 class、已移除卡片、手寫鍵盤事件、已取消商品詳情頁等視為必要條件，已移除這些失效字串測試；不以恢復舊 UI 換取通過。逐項名稱存於 output/ux-node18-retired-contracts.json。另保留 no-prefetch 驗證但允許零個直接連結的頁面（入口可能在子元件）。
對應功能由現行瀏覽器測試驗證：shared-ux-fixes（導覽與觸控）、home-ux（新手連結與手機跑馬燈）、product-compare／breeders-auction（商品及比較）、faq-articles（FAQ 與文章）、profile-ux（會員與醫院收藏）、identity-ux（缺圖及列印）、stories／brand-ux（入口）、calculator-experience（反向配對操作）。舊 merch 詳情已是轉址，新增 current-route-contracts 對轉址及 Het 進行實際验证。
新增 Het 測試首次在 hydration 前點擊導致未選取，加入元件掛載等待後成功；這是測試時序修正，未加產品延遲。

## 邊界與下一步

- 沒有停下現行開發伺服器執行完整 production build，編譯检查不等於 production build。
- 沒有部署，也沒有真實訊息、競標或外部資料写入。測試包含受控模擬資料，不代表實體裝置驗收。
- 下一節點為 /、/hero-lab、/about 的品牌動畫：原生觸控、入口、離頁清理及效能；保留使用者既有動畫方向，先重現再修改。
