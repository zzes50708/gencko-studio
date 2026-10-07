# 節點 50：手機導覽關閉操作

導覽選單關閉按鈕最低高度由 40px 調整至 44px；不改動選單內容、定位與導覽流程。

`tests/e2e/short-viewport-ux.spec.ts` 的 390×320px 原生觸控情境，檢查關閉按鈕完整可見、至少 44px、實際關閉與重新開啟，接著前往計算機並確認捲動鎖定解除。

證據：`output/ux-node50-navigation.log` 與 `output/ux-node50-compile.log`。本輪未執行完整 Nuxt build，尚未部署。
