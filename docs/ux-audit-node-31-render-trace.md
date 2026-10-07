# 節點 31：首次渲染長任務定位

## 證據

對節點 30 的正式預覽錄製 CDP CPU profile、瀏覽器 timeline，並在測試瀏覽器計時 WebGL 原生方法。最後一輪 timeline 顯示：

- 主執行緒 RunTask 約 7,975 ms。
- Commit 約 5,860 ms，對應 GPU 執行緒 GPUTask 約 5,857 ms。
- FireAnimationFrame／Three.js FunctionCall 約 2,110 ms。
- 慢速 getProgramInfoLog 約 15 次，各約 90～170 ms；前一輪合計約 1,723 ms。這些時間是嵌套事件，不重複相加。

CDP SystemInfo.getInfo 確認目前 headless Chromium 使用 ANGLE SwiftShader／SwANGLE，gpu_compositing 為 disabled_software。這是軟體渲染環境，不能等同實體手機 GPU。

## 結論

先前約 7.7 秒等待主要落在首次圖形渲染／提交與著色器準備，不是 4～8 層模型的 JS 建立運算。兩者不同：前一節點的備援貼圖 CPU 優化與按需下載仍有各自證據，但不能用它們宣稱已消除首次 GPU 等待。

本節點未修改產品材質、光線或幾何，也沒有關閉著色器錯誤檢查。為改善軟體 GPU 的量測而降低客戶端效果，缺少實機依據。

## 產物與限制

- output/ux-node31-trace.mjs
- output/ux-node31-cpu-profile.json、output/ux-node31-cpu-summary.json
- output/ux-node31-gl-calls.json、output/ux-node31-timeline.json、output/ux-node31-trace.log

原生方法位於共用 WebGL 基底 prototype；早期只檢查兩個具體 prototype 的版本未攔到呼叫，已修正沿 prototype 鏈尋找且去重。最初 getContext 計時並未顯示超過 40 ms 的呼叫。

已停止本機正式預覽，保留開發服務，未部署。實際首次載入與更新流暢度仍需要硬體加速瀏覽器／實機驗證；接續應先確認測試 renderer，再進行同配置的效能比較，不再將 SwiftShader 秒數當作手機速度。
