# 競標上架與資料一致性複驗（2026-10-22）

本輪延續交易核心排查，正式 Supabase 僅唯讀查詢結構與函式，沒有上架真實個體、變更客戶交易或傳送訊息。測試資料全部放在本機獨立 PostgreSQL 17.6；尚未部署。

## 修正與重現

### 上架寫入途中截止，表單被誤鎖為待確認

`admin_create_auction` 先驗證時間、建立場次，再呼叫 `enroll_auction_workflow`。如果時間在這段過程中到期，後者會回傳 `22023`／「只能啟用尚未截止的競標」，並整筆回滾。前端原本漏掉這個明確拒絕，保留舊請求且停用時間欄位，讓管理員無法修改已失效的時間。

已在隔離資料庫以測試用觸發器延遲上架寫入，重現相同錯誤並確認場次、回執、事件與個體狀態均回滾。瀏覽器回歸也先重現表單鎖住，證據：`output/auction-listing-expiry-red.log`。

修正只增加此明確資料庫錯誤的判斷，允許重新設定時間、建立新請求；網路斷線、不完整回執及未知錯誤仍保留原請求，不自動重送。

### 上架預覽與競標頁直接顯示舊性別欄位

上架預覽原本直接拼接 `gender_type` 與 `gender_value`；競標列表、詳情、分享圖與結構化資料也使用舊字串。現在預覽沿用既有個體格式工具，競標各處共用舊字串格式轉換。

舊資料標籤一律顯示「孵化溫度」，已確認的公／母保持原樣。缺少物種時不根據溫度猜公溫、母溫，也不顯示比例；保留「不保證性別」。既有格式不重複包裝。資料庫原始欄位及歷史紀錄沒有改寫。

## 本輪新增的 12 項資料庫驗證

1. 同一個體八筆不同請求並發，只成立一場，其他個體不變。
2. 同筆請求八次並發重送，只產生一場與一次上架事件；截止或個體改為已售後仍可查回原回執，不能改參數沿用。
3. 庫存搜尋不回傳成本及買家聯絡欄位。
4. 已售、已刪、競標中及種群個體不能搜尋上架，也不能繞過表單直接上架。
5. 缺品系或有效照片時整筆拒絕，不部分修改個體狀態。
6. 照片維持原順序、去重、過濾無效網址；起標 200、增額 100、餌料、頻率與運送資訊完整保存。
7. 預約時間完整保留，開標前拒絕不留回執，開標後可正常出價。
8. 等待個體鎖後已過開標／結標時間，均拒絕並回滾。
9. 個體即使被手動改回待售，有待聯絡、待通知、待付款或待核帳交易時仍不能重複上架。
10. 非管理員即使偽造個人資料，也不能搜尋庫存或上架。
11. 負價格、零增額、整數溢位與無限日期均拒絕且不部分寫入。
12. 上架寫入途中到期，流程明確拒絕，場次、請求、事件與個體變更一起回滾。

與前輪 18 項一起執行，30 項全部通過。輸出：`output/auction-listing-transactions-final.log`。這是資料庫函式的交易測試，未包含 Supabase Auth、LINE App、正式網路負載與完整 RLS 整合。

## 重現與驗證

`scripts/export-auction-audit-schema.sql` 已增加個體結構與上架函式，仍為純 SELECT。結果陣列存入 `output/auction-listing-snapshot.json` 後執行：

```powershell
node scripts/verify-auction-concurrency.mjs output/auction-listing-snapshot.json
```

工具只啟動本機臨時資料庫，不接受遠端連線字串；上架案例由 `scripts/verify-auction-listing-cases.mjs` 提供。保留前輪較小快照時仍可執行原 18 項測試。

- 孵化格式：先失敗後通過，`output/auction-listing-sex-red.log`、`output/auction-listing-sex-green.log`。
- 上架修正與預覽：8 項瀏覽器測試通過，`output/auction-listing-browser-green.log`。
- 客人列表與詳情文字：1 項瀏覽器測試通過，`output/auction-listing-public-sex.log`。
- 相關單元測試：17 個檔案、88 項通過，`output/auction-listing-unit-final.log`（包含 24 種 API 故障情境）。
- 正式建置完成：`output/auction-listing-build.log`。
- 正式建置 SSR 7 項通過，含孵化紀錄文字與結構化資料：`output/auction-listing-ssr.log`。
- 整套瀏覽器回歸 93 項通過（4.0 分鐘）：`output/auction-listing-full-browser.log`。
- Android 安裝版實際往返 LINE 仍須實機確認，不能以模擬測試取代。
