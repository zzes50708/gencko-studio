# 節點 52：手機控制區共用樣式權重

瀏覽器 CSSOM 檢查發現，`#main-content .site-document-page > section` 的 10px important padding 權重高於控制區的 6px important 規則，導致基因與文章搜尋區的既有緊湊設定被覆蓋。

在這兩個控制區選擇器加入既有 `.site-document-page` 範圍，使預期的手機上下各 6px 留白真正生效。只調整手機樣式權重，不縮字體與按鈕，不修改桌面。

證據：`output/ux-node52-cascade.json` 與 `output/ux-node52-cascade-after.log`；九組醫院、基因與文章 320、390、1440px 版面取樣保存於 `output/ux-node52-layout.json`，均無橫向溢出。

相關基因及 FAQ／文章互動測試：`output/ux-node52-regression.log`。本輪僅修改 CSS，未執行完整 Nuxt build，尚未部署。
