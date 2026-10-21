# Android PWA 的 LINE 登入回程

## 現象與證據

- 使用者回報：原生 LINE 顯示登入成功，回到預設瀏覽器與原 PWA 都沒有網站登入。
- 本次 Auth 記錄的最近一次 `/callback` 已回傳 302，但沒有接續 `/token` 交換。此紀錄可定位至網站 session 建立之前，不能單獨證明手機使用哪個瀏覽器。
- 用實際 Supabase SDK 及兩份隔離儲存重現：發起端有 PKCE verifier，另一個瀏覽器交換時回傳 `pkce_code_verifier_not_found`。
- 正式 Supabase 允許 `https://www.genckobreeding.com/**` 回程；未更動現有 URL 白名單。

## 修正

1. 每次 LINE 登入先建立一組獨立、短效的流程識別及 256 位元秘密。秘密只保存在發起端 localStorage；伺服器保存其 SHA-256 摘要。
2. 保留原生 LINE 自動登入與 SDK 的 PKCE。原 verifier 維持由 SDK 在原裝置儲存，不傳入接續區。
3. 網站 callback API 接收 Supabase 短效授權碼，交由新 Edge Function 加密暫存；隨即 303 轉向乾淨的接續頁。access token、refresh token 與 verifier 都不放進網址或暫存表。
4. 回程 API 另外產生 256 位元持有證明，只將摘要保存在暫存表，原值放入接收回程瀏覽器的短效 HttpOnly / SameSite=Lax Cookie。取回授權碼必須同時具備發起秘密與回程證明；不可僅憑發起秘密自動交回，避免有人發起登入後誘導他人授權、接走對方身分。
5. 原 App 載入、恢復前景或連線時接續。共用 Cookie 的同瀏覽器回程自動完成並返回發起頁；不共用儲存時，接收回程頁提供複製接續碼，原 App 顯示貼上／完成登入。原 App 仍須使用原 SDK verifier 交換。接續碼不包含 OAuth code、verifier 或 session token。只有尚有待完成且未等待貼碼時才每 3 秒補查；背景不發送請求。Android 是否自動選回原 PWA 由系統處理，這版不宣稱可強制開啟任意瀏覽器安裝的 PWA。
6. Web Locks 防止同瀏覽器多分頁同時消耗一次性碼。登出、改用 Google、重新發起與過期會取消舊接續；登出等候已開始的交換結束後才清除 session。
7. 新表 `line_login_relays` 開啟 RLS，撤銷 anon / authenticated 存取，只允許 service_role。註冊 RPC 同樣只允許 service_role，並以資料庫鎖限制同來源待完成流程數量。
8. 尚未回程最多保留 10 分鐘；接收授權碼後保留 4 分鐘。cron 每分鐘清除過期紀錄，成功交換後立即刪除。這與永久出價驗證、聊天紀錄及棄標限制完全分開。
9. 會員端 API 限定同源 POST，不接受客戶端的完成／失敗動作；錯誤使用固定文案，不記錄授權碼、秘密或供應商原始錯誤。回程及 API 禁止快取與傳送 referrer，接續頁不進 sitemap。

## 驗證

- 26 項登入／會員單元測試通過，包含實際 SDK 缺少 verifier 的重現、儲存還原、取消競態、過期、雙重持有證明及 AES-GCM 金鑰與流程綁定。
- 27 項既有登入、LINE 永久驗證、領標及管理流程瀏覽器測試通過。
- 新增 2 項瀏覽器案例通過：共用儲存自動登入與隔離儲存貼碼回程；隔離瀏覽器若沒有貼碼，不得交換登入。授權／Token 端點為隔離測試資料，但使用網站實際 SDK 產生 verifier，並核對 token 交換所用 verifier 的 SHA-256 與發起 challenge 完全一致；重載後保留登入，且只交換一次。
- 已部署的新 Edge Function 經 13 項實際 API 檢查通過，包含只有發起秘密不可取碼、錯誤回程秘密不可取碼、雙重持有證明、重播不可覆寫、匿名表存取拒絕與清理。
- 本機 Nuxt → 正式 Edge Function → Supabase 暫存表，14 項 API 串接檢查通過，包含同源限制、動作限制、短效 HttpOnly Cookie、跨儲存須貼碼、303 清理網址及 no-store。
- 隔離正式建置成功；競標 SSR 6 項回歸通過。
- 資料庫權限確認：RLS 開啟、anon 不可讀表、authenticated 不可寫表、anon 不可執行註冊 RPC、service_role 可執行、清理排程啟用。新表沒有公開政策是預期的封閉設計。
- 本次沒有變動既有客人、出價、付款、出價限制或永久 LINE 驗證資料。

## 限制與後續複驗

尚未以使用者實體 Android 手機重跑原生 LINE → 系統瀏覽器 → PWA。上述瀏覽器模擬和後端驗證不能取代該項實機驗收。上線後需完全關閉並重開 PWA，重新發起一次新的登入；舊版本先前產生的 OAuth 流程沒有接續識別，無法回溯補接。

專案既有其他共用資料表仍有先前的 RLS／view 提醒，本次未改動那些表，以免影響另一個管理系統。參考 [Supabase 資料庫安全檢查](https://supabase.com/docs/guides/database/database-linter)。

參考 [Supabase PKCE 限制](https://supabase.com/docs/guides/auth/sessions/pkce-flow)及本機已安裝的 SDK 原始碼。
