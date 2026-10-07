# 節點 33：爬櫃材質平行預編譯

## 本輪修改

- 材質先呼叫 Three.js compile，再透過 KHR_parallel_shader_compile 非同步等待完成，避免首次 render 直接等待編譯。
- 編譯期間保留上一個畫面，更新提示維持顯示，配置選項仍可操作。
- 以編譯序號及配置序號防止舊工作清除新工作的等待狀態。
- 換模型後先等待預編譯，再釋放舊模型；切頁或 context lost 時停止輪詢，跳過已釋放的 WebGL 程式。
- 材質、LED、尺寸標註及旋轉縮放效果維持原設定。

## 驗證

- 使用 ANGLE D3D11 / enable-gpu 的 Chromium 執行模型資源、材質載入及手機觸控測試。
- 四項瀏覽器案例通過，最終防護修改後另重跑兩项觸控案例，結果見 output/ux-node33-final-touch.log。
- Vue 編譯结果見 output/ux-node33-compile.log。

## 限制及下一步

- 不支援 KHR_parallel_shader_compile 的設備仍可能同步等待編譯。
- 本輪沒有正式構建或重新量測冷啟動時間，不能宣稱首次 24 秒等待已消除。
- 尚未以真正手機驗證，尚未部署。
- 下一節點：正式构建及硬體冷啟動量測，檢查首次畫面、HDR 替換與編譯期间切頁。
