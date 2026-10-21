# Android 安裝版恢復 LINE App 自動登入（2026-10-21）

## 根因與修正

先前為避開 Android 安裝版的 OAuth 回程問題，lineLoginOptions 在 Android standalone 時傳 disable_auto_login=true。這會停用 LINE App 的自動登入，造成安裝版顯示網頁登入表單，而一般手機瀏覽器仍可喚起 LINE。

本次移除停用參數，LINE 登入不再依 Android／standalone 改寫認證方式。保留乾淨的 redirectTo、Supabase PKCE、登入互斥，以及既有 pageshow／focus／online／visibilitychange 工作階段重讀。

LINE 官方依據：https://developers.line.biz/en/docs/line-login/integrate-line-login/
Supabase PKCE 限制：https://supabase.com/docs/guides/auth/sessions/pkce-flow

不得以關閉原生自動登入宣稱已解決安裝版回程。若實際回程進入另一個隔離瀏覽器，重讀目前瀏覽器的 session 無法跨儲存空間還原；仍須真機確認，不能假裝已有安全跨瀏覽器工作階段交換，也不能把 token 附在網址硬轉交。

## 本人驗證重置

- 已重新核對本人 LINE 身分與指定 Google 管理員帳號的關聯。
- 只移除本人 LINE 的 1 筆永久出價驗證，將本人 2 筆聯絡驗證狀態重設；檢查並失效本人未使用的一般綁定碼（當下 0 筆）。
- 不刪除 auth.users、LINE 授權、出價、領標、付款或限制紀錄，不改其他客戶。
- 重置後正式資料庫確認：本人永久驗證 false、聯絡驗證均已重置、管理員權限仍 true。
- 後續測試只用隔離瀏覽器假回應，不重新授予本人正式驗證資格，留給使用者親自傳碼。

## 驗證

- 17 項登入／會員單元測試通過。
- 先更新原生自動登入斷言重現舊參數錯誤，再移除參數後通過。
- 5 個瀏覽器案例通過：兩種模式不帶 disable_auto_login／prompt=login，保留 code_challenge 與原頁回程、互斥及回前景還原。
- 正式建置與 SSR 六項驗證通過；準備部署供使用者真機測試。
- 真實 Android 安裝版 → LINE App → 網站／原 App 的往返仍待使用者真機驗收；不可列為已通過。
