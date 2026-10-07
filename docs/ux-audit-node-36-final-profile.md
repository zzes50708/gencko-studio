# 節點 36：最終正式版本量測與合作區塊刪除

- 3D 最新修正正式建置通過（output/ux-node36-build.log，exit 0）。
- 正式硬體加速六次案例無 pageerror。已確認八層 shader 建立，再等待 busy false 與畫布截圖才記錄完成。
- 首次手機視窗載入 6127 ms，首次八層更新 14408 ms、最長阻塞 5174 ms。後續手機更新 761 / 707 ms，桌面更新 500 / 541 / 516 ms。
- 仍不能宣稱首次更新全程可操作；移除 isProgram 後仍有長阻塞，需要定位其餘 GL 輪詢與 GPU 提交。未清空驅動快取，並非真正手機量測。
- 正式版刻意延長编譯的最後配置、切頁取消兩項測試通過，無 pageerror（output/ux-node36-async.log）。
- 新追加要求：刪除 pages/merch/index.vue 的 Honeycomb 合作 aside、專用 CSS；標題改單欄避免留下空欄。390 / 1280 寬瀏覽器確認區塊不存在且 h1 可見（output/ux-node36-partner-check.log），38 個變更 Vue 檔編譯通過。
- 此次正式建置完成於追加刪除之前，合作區塊刪除在開發版驗證，尚未納入該正式執行檔。
- 未提交、未推送、未部署。正式預覽停止，原開發伺服器保留。
- 下個節點：首次更新剩餘 5 秒阻塞定位；若無法透過非同步輪詢改善，評估將渲染移至 OffscreenCanvas worker 的成本與功能風險，不直接降低材質。
