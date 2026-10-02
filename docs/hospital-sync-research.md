# 台灣特寵／爬蟲動物醫院同步研究

研究日期：2026-09-15。以下只採政府與 Google 官方來源。

本日直接介接中央 JSON 端點，取得 2,078 筆、且必要欄位完整的機構紀錄；數量會隨官方資料更新而變動。

## 結論

農業部提供全國性的[「獸醫師(佐)開業執照」開放資料](https://data.gov.tw/dataset/8705)，可由 JSON、CSV 或 XML 取得縣市、字號、執照類別、狀態、機構名稱、負責獸醫、電話、發照日期與地址。資料每半年更新，採政府資料開放授權條款第 1 版，適合作為合法診療機構的母名單。農業資料開放平臺另提供[直接介接端點與說明文件](https://data.moa.gov.tw/open_detail.aspx?id=078)。

農業部防檢署的[「全國獸醫師執業、診療機構開業查詢」](https://ahis9.aphia.gov.tw/Veter/OD/HLIndex.aspx)可供逐筆查核；監察院 2026-05-07 的[官方調查新聞](https://www.cy.gov.tw/News_Content.aspx?n=125&s=37315)指出該查詢頁仍有跨區資訊遺漏，因此不宜單獨視為即時且完整的唯一真相來源。法規上，獸醫診療機構仍由所在地直轄市或縣（市）主管機關受理登記，[獸醫師法第 17 條](https://law.moa.gov.tw/LawContent.aspx?id=FL014721)可供核對。

政府資料開放平臺可找到多個縣市名冊，但格式、欄位、更新頻率與供應方式不一致。例如：

- [臺北市動物醫院一覽表](https://data.gov.tw/dataset/128275)：CSV、不定期更新；欄位為縣市、名稱、地址、電話、負責人。
- [臺中市合法動物醫院名冊](https://data.gov.tw/dataset/83762)：CSV／JSON／XML、不定期更新；含開業證號、行政區、地址與電話，並提供地方 OAS 文件。
- [桃園市獸醫診療機構名冊](https://data.gov.tw/dataset/25953)：CSV、不定期更新；欄位為地區、名稱、地址、電話，另有地方 OAS 文件。
- [臺南市動物醫院及診所名單](https://data.gov.tw/dataset/53916)：JSON／CSV、不定期更新；含字號、狀態、名稱、電話、發照日期與地址欄位。
- [嘉義市動物醫院名單](https://data.gov.tw/dataset/52406)：CSV、每年更新；含名稱、電話、地址、營業時間與備註。

這些法定名冊的公開欄位通常不含「收治物種」「特寵」「爬蟲」「守宮」或特寵醫師班表。因此，它們適合當作合法機構母名單，無法單獨判定哪一家真正收治守宮。即使地方資料的「業務類別」存在，也不能推論為特寵物種清單。

## 小獸所目前看得出的資料流程

檢查 `https://crittermap.snyr.tw/` 的實際頁面後，可確認 136 筆醫院摘要由 Next.js 伺服器先整理，再以 `initialHospitals` 資料隨頁面送到瀏覽器；前端沒有在開頁時直接呼叫一個公開的醫院 API。公開欄位包含座標、支援物種、預約方式、急診標記、Google 評分與評論數，詳細資料另有營業時間、電話、地址、確認日期與備註。

「最新更新」資料逐筆保留 `sourceLabel`、`sourceUrl`、`verifiedAt`，畫面可見來源包含醫院官方網站、官方 Facebook、官方 Instagram 與 Google Maps。這表示營業時間、特寵物種、預約與急診等加值資訊，是以各院第一方公告和 Google 資訊整理、查證後寫入內部資料，再由伺服器輸出；沒有證據顯示它能從單一外部資料源全自動同步。網站可見頁面也沒有公開其資料庫 API、下載端點或允許第三方整批重用的資料授權。

政府名冊多採[政府資料開放授權條款第 1 版](https://data.gov.tw/license)：可免費重製、編輯、改作及用於產品或服務，也可再授權；使用時必須依條款顯名，標示資料提供機關與資料集等來源。各資料集仍須逐一確認其頁面所列授權與是否仍供應。

## Google Places 能不能當主要來源

不建議。Google Places 適合用來找候選、取得 `place_id`、補充近期營業狀態或讓使用者前往 Google Maps，但不適合作為網站永久醫院資料庫的唯一母資料：

- [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search) 每次文字查詢跨頁最多回傳 60 筆，而且結果依文字查詢及排序產生，不是全量名冊，也無法保證涵蓋全台所有機構。
- [Places 資源欄位](https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places)沒有結構化的「收治動物物種」欄位。以「特寵／爬蟲」關鍵字搜尋只能當候選訊號，不能視為院方承諾。
- [Places API 政策](https://developers.google.com/maps/documentation/places/web-service/policies)限制預先抓取、快取與儲存 Places 內容；`place_id` 是可長期儲存的明確例外。顯示 Google 內容時也有 Google Maps 標示及第三方資料來源標示要求。
- [Place ID 官方說明](https://developers.google.com/maps/documentation/places/web-service/place-id)建議超過 12 個月重新整理 ID，因為 ID 可能變更。

因此，不應把 Google 的名稱、地址、電話、評論等批次抓回 Supabase，當成可永久保存及再散布的自有全國名冊。可永久保存政府開放資料與自行查證資料，另存 Google `place_id`，需要顯示 Google 欄位時即時查詢並依政策標示。

## 最省人工的可行架構

1. 建立「來源登錄檔」，每個縣市一筆設定：資料集頁、實際 CSV／JSON URL、格式、欄位對應、授權、預期更新週期。優先串可機器讀取的地方 API／JSON／CSV；PDF 或網頁名冊才進人工例外清單。中央查詢頁作為抽樣核對與補漏入口，不直接爬取入庫。
2. 排程每週或每月以 HTTP `ETag`、`Last-Modified` 或檔案雜湊判斷是否改版；只有來源變更才下載、正規化與 upsert。保留來源資料集名稱、提供機關、來源 URL、開業證號與 `last_seen_at`，以便顯名及稽核。
3. 用開業證號作第一識別鍵；沒有證號時依「正規化電話＋地址」，再以名稱做模糊比對。來源消失先標成待確認，連續數次未出現或官方狀態為歇業才下架。
4. 特寵能力採「證據分級」：院方官網／院方官方社群／院方掛號頁明確列出爬蟲或守宮，才能自動標為已證實；Google 關鍵字與評論只建立候選，不能直接發布成已證實。
5. 對候選醫院發送一個很短的院方自填表，要求勾選收治物種、醫師、門診時段、證據網址及資料更新日期。院方定期點一次確認連結即可續期；逾期自動顯示「請先電話確認」，而不是讓管理員逐家電話重查。
6. Google Places 僅負責配對 `place_id`、即時顯示 Google 資訊或提供地圖連結；不負責判定合法登記或特寵能力。

最低人工量的核心是「地方政府名冊自動維護合法母集合＋院方自助認領與定期確認收治物種」。人工只處理無 API 的縣市、配對衝突與沒有第一方證據的候選資料。

## 已實作的同步流程

- `veterinary_registry` 保存農業部完整合法機構母表，保留開業證號、來源、抓取時間與最後出現時間。
- `hospitals` 仍是官網公開的特寵名單；同步只寫入官方配對及執照狀態，不覆寫收治物種、急診、營業時間或網站上架狀態。
- 配對依序使用已確認證號、正規化名稱、地址與電話；同分候選標記為 `ambiguous`，不猜測。
- `hospital_sync_runs` 保存每次同步的數量、結果、資料雜湊與錯誤，方便追查來源變動。
- Vercel 每月 1 日 03:00 UTC 呼叫受保護的 Nuxt API，再觸發 Supabase Edge Function。

上線前須依序套用 migration、部署 `sync-veterinary-registry` Edge Function，並在 Supabase 與 Vercel 都設定相同的 `HOSPITAL_SYNC_SECRET`；Vercel 另需設定 `CRON_SECRET`。首次同步後，應人工處理 `ambiguous` 與 `unmatched`，再逐院補上特寵收治的第一方證據網址與查證日期。
