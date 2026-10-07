# 節點 19：品牌動畫頁

2026-10-06 完成集中排查與修正。

## 已修正

- /about 的全域方向鍵 handler 原先會在底部導覽取得焦點時切換背景場景；以瀏覽器測試重現（按 ArrowDown 後 currentSceneIndex 由 0 變 1）。現在只處理場景內非互動元素的鍵盤事件，場景容器可聚焦；不攔截連結、表單與 dialog 的鍵盤操作。
- 未顯示場景加上 inert 與 aria-hidden，避免不可見連結进入鍵盤焦點／讀屏順序。
- destroyObserver 僅移除本頁持有的 Observer，移除原先 Observer.getAll().forEach(kill) 對所有實例的全域清理。
- DNA 裝飾遵守 prefers-reduced-motion 與文件可見狀態，停止不必要的逐幀重畫；減少動態保留靜態畫面，恢復一般模式繼續既有動畫。resize 時重畫、卸載取消迴圈。

## 驗證

- 5 項 Playwright 測試通過（24.2s）：/about 手機原生觸控及導覽隔離／離頁原生捲動；桌面場景方向鍵及隱藏入口；/ 原生觸控推進、底部首頁入口與 debug 清理；/hero-lab 替代入口及樣式清理；DNA 靜態畫面像素保持與恢復動態。
- 原生手勢使用 Chromium CDP touchStart/touchMove/touchEnd；不是直接改 scrollY 代替手勢。未宣稱實體手機驗收。
- 兩個修改的 Vue 元件編譯通過。
- Hero Lab 保留原有 WebGL、手機模型與視覺方向；沒有測出需要更換動畫庫的證據。查核既有隱藏分頁停止 WebGL render／影片與卸載 dispose 邏輯，沒有宣稱 GPU／FPS 實機量測或完整 production build。
- 未部署。

下一步：補驗 3D 爬櫃的原生旋轉、雙指縮放與連續配置更新；前面節點僅驗證畫布存在，未把它當作手勢已驗收。
