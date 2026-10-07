# 節點 32：硬體加速量測

## 環境確認

Chromium、Chrome、Edge 以 D3D11 啟动，CDP SystemInfo 與 WebGL debug renderer 均確認 NVIDIA GeForce GT 1030，gpu_compositing／webgl enabled，不是 SwiftShader。

這是 Windows 桌面 GPU、手機尺寸與觸控模擬，並非 Android／iOS 實機。

## 正式預覽結果

使用節點 30 的正式建置，3040 本機预覽，獨立 context、停用 Service Worker；手機與桌面各三次。完成時間包含 canvas 截圖，以等待畫面實際提交。

| 視窗／樣本 | 初次頁面完成 | 4→8 層更新 |
| ---------- | -----------: | ---------: |
| 手機 1     |    12,310 ms |  24,207 ms |
| 手機 2     |     1,227 ms |     774 ms |
| 手機 3     |     1,222 ms |     762 ms |
| 桌面 1     |     1,334 ms |     495 ms |
| 桌面 2     |     1,214 ms |     498 ms |
| 桌面 3     |     1,242 ms |     495 ms |

第一個手機樣本有 10,728 ms 初始長任務、23,601 ms 更新長任務。其他樣本最大長任務约 211～267 ms。六個情境皆確認模型完成、摘要為 2 抽 × 8 層且沒有 pageerror。

## 判讀

硬體加速並未消除首次配置的等待；先前不能把所有等待都歸為 SwiftShader 的影響。後續樣本明顯較快，與首次圖形／著色器準備相關，但同一瀏覽器的 GPU／驅動快取未隔離，因此不能把所有 context 宣稱為冷啟動，也不能聲稱所有手機都會有相同耗時。

第一次量測僅等待 aria-busy=false，數字曾在畫面提交前就停止（833 ms 與 10,683 ms 初始長任務矛盾）。修正加上畫布截圖後重跑。早期資料另存 output/ux-node32-hardware-before-paint-check.json，不用於載入完成結論。這也表示節點 30 的 readyMs 不是嚴格首次畫面完成時間。

## 產物與後續

output/ux-node32-gpu-probe.mjs、output/ux-node32-gpu-probe.json；output/ux-node32-hardware-profile.mjs、output/ux-node32-hardware-profile.json、output/ux-node32-hardware-mobile.png。

本節點沒有修改產品。正式預覽已停止，開發服務保留，未部署。下一節點研究 Three.js compileAsync 的接入，驗證首次新配置編譯期間選項可操作、最新配置優先以及切頁清理；保留材質品質，不能只用更長測試時限當作效能修正。
