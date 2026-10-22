# 競標交易核心複驗（2026-10-22）

本輪先讀取正式庫函式、欄位、索引、限制、權限與排程，再將結構匯入本機 PostgreSQL 17.6。所有出價、結標、核帳與解封測試均使用虛構資料；正式庫只有 SELECT，沒有新增出價、變更交易或傳送 LINE 訊息。本輪修正尚未部署。

## 實際修正

出價 API 原本在身分查詢直接拋錯時回傳一般 500；損壞 JSON、錯誤場次編號及超長暱稱也未一致回傳 `not_submitted`。前端因此可能把根本未送入資料庫的出價留在待確認狀態。現在這些情況明確標示尚未送出。

RPC 已開始後若連線拋錯，不能據此判定交易回滾，仍回傳 `unknown`，必須沿用原請求編號查回結果。沒有增加自動送出或自動加價。

回歸工具改用專案實際安裝的 Supabase SDK，只替換網路回應。檢查時發現 SDK 的 RPC 是 thenable，並非完整 Promise；新增的錯誤處理已改成 `try/await/catch`，避免呼叫不支援的 `.catch()`。此差異曾在實際 SDK 測試重現失敗，修正後通過。

## PostgreSQL 並發實測

使用 16 個獨立的虛構 LINE 身分與連線；重送情境另以同一身分的多條連線驗證。下列 18 項資料庫交易與驗證測試通過：

1. 16 位同價搶標只有一筆成立，遭拒的交易不留下已完成回執。
2. 同帳號同請求 16 次並發重送，只產生一筆出價並回傳同一筆成交。
3. 不同價格並發，最高有效價格不被較低價格覆蓋。
4. 壓線出價延長三分鐘；同筆重送不重複延長，新出價依新截止判定。
5. 出價等待場次列鎖時已過截止，取得鎖後會拒絕。
6. 結標掃描面對尚未提交的延長交易，會跳過鎖定場次；提交後不依舊截止誤結標。
7. 兩個工作程序同時結標，只產生一份得標紀錄與一筆結標事件，金額及得標者正確；付款期限為結標時間加 24 小時。
8. 結標後仍能查回原出價回執；改金額、換帳號不能沿用它。
9. 逾期限制與人工核帳並發，最終已付款場次不殘留該場限制。
10. 同一管理延期請求並發重送，只延長 24 小時並記錄一次事件。
11. 已付款場次不能再次棄標，也不能拿來解除其他未付款場次限制。
12. Google 單一身分、尚未完成官方 LINE 驗證及非管理員越權操作遭拒。
13. 同帳號兩場未付款，第一場解封或核帳不會清除第二場限制；全部解除後才恢復出價。
14. 驗證碼拒絕其他 LINE 身分；正確傳送後記錄一次，重送事件不重複處理。
15. 重建前的舊碼與逾期碼不能完成驗證。
16. 兩場領標碼各自獨立，僅得標者能建立，回傳的金額與回寫場次一致。
17. 取消場次後，先前領標碼不能再回寫，也不能重新建立領標訊息。
18. 較舊的加好友事件不覆蓋較新的取消追蹤事件；曾完成的出價驗證另存於獨立資料表，未被一併清除。

測試使用正式函式、欄位、索引、檢查限制及觸發器；本機只簡化 Auth 身分表與 JWT 來源，省略外鍵、RLS 與 LINE／Supabase Auth 網路服務。因此這是資料庫交易競爭驗證，不等於正式流量壓力測試或 Android 實機驗收。

## 正式庫唯讀核對

- 競標資料表與私有流程表均啟用 RLS。
- 訪客與一般會員不能直接新增、更新或刪除出價／場次。
- 公開出價僅可讀取場次、公開名稱、金額、時間與出價編號；未開放 `phone`、`user_id`。
- 訪客不能執行私有出價與管理函式；一般會員不能執行結標工作程序。管理函式另外檢查伺服器保存的管理員資格。
- 現行領標模式為 `manual_claim`，客人自行到官方 LINE 領標，並非主動推播模式。
- 自動結標排程啟用，每分鐘執行；核對當時近 24 小時失敗次數為零。
- 核對當時「逾截止五分鐘仍未結標」與「已付款仍有該場有效限制」均為零。這是當時快照，不能保證往後永遠為零。

## 重現方式與證據

`scripts/export-auction-audit-schema.sql` 是純 SELECT 匯出。將查詢結果陣列另存 `output/transaction-snapshot-complete.json`，再於測試專用目錄準備執行環境：

```powershell
npm install --prefix output/auction-pg-runtime --ignore-scripts --no-audit --no-fund @embedded-postgres/windows-x64@17.6.0-beta.15 pg@8.23.1
node scripts/verify-auction-concurrency.mjs
node scripts/verify-auction-bid-api.mjs
```

獨立資料庫只監聽 `127.0.0.1` 的臨時埠，正常結束或測試失敗均執行停止；不接受正式庫連線字串。測試快照必須來自受信任的結構匯出，勿使用外來 SQL。此工具目前適用 Windows x64。

- 資料庫實測：`output/auction-transaction-concurrency-extended.log`、`output/auction-transaction-concurrency-results.json`。
- 實際 SDK 回歸：`output/auction-transaction-sdk-red.log`、`output/auction-transaction-sdk-green.log`，24 種情境。
- 單元測試：`output/auction-transaction-unit-final.log`，15 個檔案共 59 項通過（含整支 API 故障測試）。
- 最終正式建置：`output/auction-transaction-build-final.log`，完成。
- 瀏覽器第一輪曾因測試伺服器未啟動而失敗，不能視為產品問題或通過證據。啟動後第二輪 89 項通過、1 項 Android 模擬測試關閉 context 逾時；該檔案單獨重跑 4 項皆通過，保留 `output/auction-transaction-pwa-recheck.log`。
- 最終整套重跑 90 項全部通過：`output/auction-transaction-browser-confirmed.log`（3.8 分鐘）。
- 最終建置 SSR 六項通過：`output/auction-transaction-ssr-final.log`。
- Android 安裝版 LINE 登入往返仍需要實機確認；瀏覽器自動化不能取代它。
