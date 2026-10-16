# 3D 模擬器開燈偶發閃爍排查

## 可重現原因

- 開燈本身沒有隨機亮度或閃爍計時器；亮度與開關只在設定變更時更新。
- 慢幀操作會啟動自適應 DPR 降級。原本 applyQuality 只更新 renderDpr，TresCanvas 在 Vue 更新後才呼叫 setPixelRatio。
- 若降級發生於 onBeforeRender，目前幀先繪製完成，隨後的 Vue 更新又重設畫布尺寸，清空剛完成的畫面。
- 此現象不以 LED 為唯一條件；開燈時亮暗差異較大，可能更明顯。沒有把所有偶發閃爍都歸因於此。

## 修正

- applyQuality 先同步更新 renderer 像素比，再更新綁定值與重繪要求。
- Tres 隨後比對到相同像素比，不會再次清空畫布。
- 保留操作中動態畫質與待機高清，未更改燈光亮度、光暈、折射材質或陰影來掩蓋問題。

## 驗證

- 專用 E2E 以 WebGL 預設 framebuffer 的 draw 與畫布尺寸變更追蹤，同時模擬 35ms 慢幀以觸發操作中的降級。
- 正式模式修正前：6 次尺寸重設，2 次繪製後清空；測試失敗。
- 開發模式修正後：6 次尺寸重設，0 次繪製後清空；相同測試通過。
- 高像素手機觸控降低畫質、停止恢復高清、關閉視窗清理，以及 320/390px 先設定後生成、電腦即時更新，共 5 項 E2E 通過。
- 全部單元測試 29 個檔案、196 項通過。
- 最終正式模式建置成功；隔離預覽 3178 的 16 項瀏覽器回歸全數通過，包含慢幀閃爍、開關燈、觸控、畫質恢復及全站三個斷點。最終慢幀紀錄為 4 次尺寸重設、0 次繪製後清空。
- 實體手機 GPU 尚未驗證；尚未提交或部署。

## 證據

- output/led-flicker-before.log
- output/led-flicker-dev-after.log
- output/led-dev-workflow.log
- output/led-final-unit.log

- output/ux-cabinet-led-final-build.log
- output/led-final-browser.log
