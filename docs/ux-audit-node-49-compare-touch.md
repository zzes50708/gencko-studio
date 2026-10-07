# 節點 49：比較頁手機移除操作

比較頁手機移除按鈕原為 32×32px，擴為 44×44px。保持原位置與表格結構，沒有增加說明區或改動比較資料邏輯。會員收藏頁同步檢查，四分類與取消收藏操作本輪未修改。

## 驗證

- `tests/e2e/compare-touch-target-ux.spec.ts`：320px、390px 原生觸控情境，檢查最小操作尺寸、實際點按移除、另一隻個體仍保留及無橫向溢出。
- `output/ux-node49-touch-red.log`：修正前兩項均失敗，實際尺寸 32px。
- `output/ux-node49-regression.log`：修正後觸控、個體比較及會員收藏十項測試通過。
- `output/ux-node49-visual.log` 與 `output/ux-node49-compare-320.png`、`output/ux-node49-compare-390.png`：觸控版面截圖。
- `output/ux-node49-compile.log`：39 個目前修改中的 Vue 檔 SFC 編譯通過；本輪未執行完整 Nuxt build。

使用攔截測試個體，不修改真實資料。尚未部署。
