# 競標流程部署前複驗（2026-10-22）

本次部署包含前幾輪已完成的 LINE／PWA 登入接續、官方 LINE 聯絡驗證、出價防重送、管理與客人端逾時復原、上架時間及孵化紀錄用語修正，以及先前指定的首頁四個入口移位。測試輸出與本機資料庫不納入提交；沒有變更 Supabase 正式資料或發布新的資料庫結構。

## 本輪新增修正

出價回執為原成交的快照。客人第一筆出價成立但回應遺失，其他客人後續再出價並延長截止後，重查第一筆時原本會把畫面截止倒退至舊回執時間。資料庫成交仍正確，但補查失敗或緩慢時可能顯示錯誤倒數。

已先以隔離瀏覽器重現，修正後舊回執不能倒退已知較新的截止，完整場次資料仍由補查核對。原出價回執與目前最高價分開處理，不改動實際交易。

- 失敗證據：`output/auction-receipt-order-red.log`。
- 修正後出價故障測試通過：`output/auction-receipt-order-green.log`，內含 20 種情境。

## 正式庫唯讀檢查

檢查當時，逾截止五分鐘尚未結算、已付款仍有本場有效限制均為零。結標排程啟用，近 24 小時失敗次數為零；管理員只有指定的一個帳號。沒有出現同一會員綁定兩個不同 LINE 身分的現有資料。

以上是當時狀態，並非持續監控或永遠無錯誤的保證。測試出價、核帳、解封與上架全部使用本機獨立 PostgreSQL 的虛構資料，未拿客戶交易測試。

## 部署前證據

- 單元測試 17 個檔案、88 項通過：`output/auction-deploy-unit.log`（含 24 種出價 API 故障情境）。
- PostgreSQL 30 項交易、驗證與上架測試通過：`output/auction-deploy-postgres.log`。
- 完整瀏覽器回歸 93 項通過（內含 20 種出價故障情境）：`output/auction-deploy-browser.log`。
- 首頁 8 種寬度檢查通過：`output/auction-deploy-home.log`。
- 正式建置完成：`output/auction-deploy-build.log`。
- 最終建置 SSR 7 項通過：`output/auction-deploy-ssr.log`。
- 部署後檢查工具已在本機通過 10 項驗證：`output/auction-release-local.log`。
- Android LINE App 與已安裝網站 App 的實際往返仍須實機確認；瀏覽器模擬無法代替此項驗收。

提交只包含明確列出的來源碼、回歸測試與排查紀錄。Git 推送後須等待正式部署完成，再核對部署 commit 與正式網域入口。
