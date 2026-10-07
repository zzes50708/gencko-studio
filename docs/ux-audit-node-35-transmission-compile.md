# 節點 35：透射離屏預編譯與更新狀態競態

## 已修正

1. Three.js 的透射繪製先在離屏目標使用線性色彩與無色調映射，原預編譯只涵蓋畫面輸出。新增 1×1 離屏目標預編譯，完成後還原原目標、面與 mip 層級；離開時釋放目標。材質效果沒有降級。
2. 輪詢中的 gl.isProgram() 可能等待 GPU；Three.js 釋放 program 後會清除 program.program，改用該參照判斷，避免额外同步檢查。
3. 環境光載入完成時，舊模型編譯可能誤清除新配置的等待狀態；新增實際模型生成序號，僅匹配最新配置才清除提示。
4. 更新期間操作測試刻意延長 KHR 編譯等待，避免快速完成造成漏抓 busy 的測試競態。

## 證據

- 原正式版本追蹤 output/ux-node35-trace.log / gl-calls.json，13 次慢速 WebGL 呼叫合計約 14.08 秒，主要來自透射 render 的 getProgramInfoLog。
- 新增離屏預編譯的正式版本建置通過：output/ux-node35-build.log。正式六次量測均無 pageerror，但首次八層更新仍有約 5.46 秒阻塞。
- 該版追蹤 output/ux-node35-after-trace.log：透射路徑的慢速 getProgramInfoLog 消失，剩下兩筆 PMREM 呼叫；長事件落在預編譯輪詢，據此移除 isProgram。
- 開發版量測 output/ux-node35-dev-final-profile.json 發現完成狀態竞態，因此該檔不能作為最終版效能結論。
- 最新版強制等待與切頁測試 output/ux-node35-dev-final-async.log：兩項通過，無 pageerror，切頁後輪詢停止。
- 最終觸控測試 output/ux-node35-final-touch.log；Vue 編譯 output/ux-node35-final-compile.log。

## 下一節點

最後兩項修正尚未重新正式建置與量測。需用實際模型版本已一致的最新版重新正式驗證，不能宣稱首次卡頓已完全消除。仍未真手機驗證、未提交、未推送、未部署。正式預覽程序停止，原開發伺服器保留。
