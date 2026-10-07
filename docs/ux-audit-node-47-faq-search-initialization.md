# 節點 47：FAQ 返回後搜尋無反應

## 根因與修正

初始懷疑是網址同步覆蓋輸入。四個不同時機的新輸入測試均通過，不能支持該假設，因此沒有改寫網址同步流程。

原始返回流程重複五次出現一次失敗。對相同步驟記錄輸入值、Vue 寫入與掛載狀態後，十次出現三次失敗；失敗時 HTML 搜尋值為 `ux-no-match-123`，網址仍保留舊搜尋「訂金」，`#__nuxt.__vue_app__` 尚不存在，沒有 Vue 寫入紀錄。表示 SSR 答案先可見，但頁面尚未初始化，已開放的輸入框收不到搜尋處理。

FAQ 搜尋與搜尋列的清除按鈕改為等待 `onMounted` 才啟用；搜尋框以 `aria-busy` 告知初始化狀態。保留 SSR 答案、原搜尋文字、網址同步與閱讀歷史，不增加版面高度。

## 證據與驗證

- `output/ux-node47-return-repeat.log`：原始流程 4 次通過、1 次失敗。
- `output/ux-node47-diagnostic-exact.log`：十次診斷 7 次通過、3 次失敗，含失敗掛載狀態。診斷用重複測試檔已移除，保留紀錄。
- `tests/e2e/faq-search-sync-ux.spec.ts`：新增延遲初始化測試與四種網址更新後輸入時機。延遲載入腳本、先檢查搜尋不可輸入，再釋放腳本確認搜尋可用。
- `output/ux-node47-hydration-red.log`：修正前延遲初始化測試失敗，確認輸入框過早啟用。
- `output/ux-node47-final.log`：修正後 FAQ、文章與新同步測試。
- `output/ux-node47-compile.log`：39 個目前修改的 Vue 檔 SFC 編譯通過；未執行完整 Nuxt build。

## 後續診斷

修正後整組 15 項測試通過，但原返回流程再次重複五次仍有兩次卡在未初始化。輸入保護有效，不能將底層初始化失敗視為已解決。

`output/ux-node47-client-errors-repeat.log` 捕捉到返回頁面時 Vite 程式模組 MIME 被判定為 `text/css`，瀏覽器拒絕載入；navigation timing 類型為 `back_forward`，Vue 尚未掛載。沒有證據支持修改 FAQ 的網址同步邏輯。

使用 `output/ux-node30-build.mjs` 的獨立 buildDir 與 Nitro 輸出建立正式版預覽，以隔離開發模組環境並驗證。正式 Nuxt build 成功，編譯紀錄：`output/ux-node47-production-build.log`。

正式版預覽 `127.0.0.1:3147` 使用 390px 觸控模式：FAQ、文章、延遲初始化及四種輸入時機共 15 項通過，紀錄 `output/ux-node47-production-final.log`。開發模式的 MIME 問題仍保留紀錄，不能宣稱其已修復；目前正式版測試未重現。

正式版原返回流程另外連續重跑十次全部通過：`output/ux-node47-production-repeat.log`。檢查完成後已停止本輪 3147 預覽伺服器，原開發伺服器保留。

尚未部署。這次修正避免初始化前接受無法處理的輸入，不代表縮短腳本下載時間。
