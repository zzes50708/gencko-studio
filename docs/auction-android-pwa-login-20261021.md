# Android 安裝版 LINE 登入與暱稱提醒（2026-10-21）

## 原因與調整

- 使用者回報 Android 安裝版跳轉 LINE／預設瀏覽器後，原 App 仍未登入。原實作直接使用 Supabase signInWithOAuth 預設流程，沒有安裝模式分流，也沒有在返回 App 時重新讀取工作階段。
- 只在 Android standalone 安裝模式附加 LINE 官方 disable_auto_login=true，使用 LINE 網頁登入，避免原生 LINE App 把回程交給另一個預設瀏覽器。一般瀏覽器保留原流程；回程保留原頁，但去除舊 OAuth code、state、錯誤參數及憑證片段。
- 已對正式 Supabase authorize 入口做不跟隨的 302 查核，確認此參數實際轉送到 access.line.me；未完成任何真實登入。
- pageshow、focus、online 與 visibilitychange 時重讀同一瀏覽器工作階段；在途讀取合併、離頁清理。較舊 getSession 回應不覆蓋較新的登入／登出；暫時離線不清空已確認身分。沒有跨瀏覽器傳送 token 或複製登入憑證。
- 目前 Nuxt Supabase 使用 SSR cookies 與 PKCE，瀏覽器 SDK 本身處理登入回程，不重複 exchangeCodeForSession。

## 暱稱與文案

- 暱稱欄提示填寫內容完整公開，不會再遮蔽；aria-describedby 連到完整說明。
- 確認出價同時顯示實際公開暱稱與「完整顯示，不遮蔽」，空暱稱顯示系統匿名；取消仍不送出。
- 移除「未填則遮蔽本名」及王O明示範，避免暗示系統會加工使用者輸入的本名。
- LINE 聯絡改為可選聯絡提示，FAQ 說明競標只接受 LINE 新出價、Google 保留管理與歷史紀錄。
- 上次重置的是工作室官方 LINE 聯絡驗證，不是撤銷 LINE 登入授權。現行手動領標流程不要求出價前再傳綁定訊息，所以沒有額外綁定驗證是預期行為。

## 驗證

- 16 個單元／API 測試檔、63 項通過，包括登入／登出與並行讀取競態。憑證片段清理補例另重跑 5 項通過。
- 安裝模式 true／false 與返回恢復：3 個瀏覽器測試通過。
- LINE 生命週期、Google 出價隔離與公開暱稱確認：4 個瀏覽器測試通過。
- 照片與公開個體資訊：12 個瀏覽器測試通過。
- 競標、管理、上架與得標共 30 項回歸已驗證；其中會員背景更新測試補上真實介面形式的隔離 session 後，重跑該案例通過。原失敗是測試只設 currentUser、卻沒有對應 auth session，恢復連線查核自然把假登入移除。
- 隔離正式建置通過，記錄為 output/auction-pwa-login-build.log。
- 正式產物 SSR 六項價格、錯誤與安全呈現檢查通過。

## 實機驗收界線

瀏覽器模擬安裝模式不能取代 Android WebAPK、LINE App 與不同預設瀏覽器組合的真機驗收。須部署後從手機原安裝 App 點 LINE 登入，完成網頁授權並返回 App，確認 LINE 身分與出價入口可用；一般瀏覽器也應回歸。若系統仍跨到另一個瀏覽器，該瀏覽器和原 App 不會自動共用工作階段，需再依實機行為排查，不能宣稱已完成跨瀏覽器同步。

本輪未部署、未修改遠端帳號、資料庫或既有出價資料。

## 官方參考

- https://developers.line.biz/en/docs/line-login/integrate-line-login/
- https://web.dev/learn/pwa/windows
- https://supabase.com/docs/guides/auth/sessions/pkce-flow
