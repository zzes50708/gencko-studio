# 節點 37：拆分整櫃預編譯批次

## 根因證據

- 正式版本重查 output/ux-node37-trace.log：編譯完成查詢和 isContextLost 沒有超過 40 ms 的紀錄，不能把剩餘長任務直接歸因於輪詢。
- 不開 CPU 剖析器的全部 WebGL 呼叫量測 output/ux-node37-all-gl-hardware-profile.json：首次八層更新 14290 ms、最長長任務 8706 ms，createShader 單次約 995 ms、shaderSource 約 263 ms、完成查詢約 248 ms。長任務包含整櫃批次程式建立及 GPU 提交，不只最後 render。

## 修改

- 逐物件進行畫面及離屏預編譯，累積批次時間達 8 ms 後讓出一個 animation frame。
- 每批仍由完整場景取得光源與環境，保持 LED 與材質效果。
- 批次之間檢查切頁與編譯序號；新工作取代舊工作後停止舊批次。
- 每個離屏操作都有 finally 還原原本渲染目標，避免讓出控制權時污染其他渲染。

## 驗證

- output/ux-node37-tests.log：貼圖與兩項原生觸控案例 3 passed。
- output/ux-node37-compile.log：38 modified Vue files compile OK。
- output/ux-node37-batched-async.log：刻意延長編譯時最後配置生效、切頁後停止輪詢。
- output/ux-node37-batched-dev-hardware-profile.json：開發版首次八層更新 13087 ms、最長任務 1867 ms，無 pageerror。

## 限制與下一步

正式版原量測与新開發版僅各一個首次樣本，不能當成可靠改善百分比。8 ms 是交還控制權的門檻，單次 WebGL 呼叫仍可能超過門檻；尚未做到首次更新全程順暢。新批次版需要隔離正式建置與量測，確認材質、畫面、取消及更新狀態。本輪沒有部署。正式預覽停止，開發伺服器保留。
