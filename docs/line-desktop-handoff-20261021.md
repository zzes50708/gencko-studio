# 電腦版 LINE 傳送入口修正（2026-10-21）

## 根因

原按鈕使用 https://line.me/R/oaMessage/... 預填聊天訊息。LINE 官方明確說明此 URL scheme 支援 iOS／Android，不支援 macOS／Windows 版 LINE；不能宣稱修改一個網址就能可靠開啟桌機聊天。
官方來源：https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/

## 實作

- 新增共用 OfficialLineHandoff，綁定驗證與得標領標共用。
- 手機保持官方 oaMessage 連結，正確 percent encode 官方 ID 與完整訊息。
- 桌機移除誤導的直接聊天入口，改「用手機 LINE 掃碼傳送」，點擊才展開 QR Code。
- QR Code 內容仍為同官方帳號的預填訊息網址，供手機掃描；保留複製訊息與官方帳號／加好友 QR Code 備援入口。
- 本機以 qrcode 1.5.4（MIT，固定版本）產生 SVG data URI，不把驗證碼送到外部產碼服務；僅桌機展開後動態載入。
- 判斷依支援系統，Windows／macOS 縮窄視窗仍使用桌機流程，iPad 桌面 UA 以觸控數輔助辨識。
- 改碼／過期／完成領標／離頁時撤下對應 QR Code，非同步結果有 revision 防護；操作當下沿用既有到期檢查。
- 本輪已透過 GitHub connector 完整讀取 Issue #5。使用既有按鈕與區塊樣式，沒有新增動畫或 WebGL。

## 驗證

- 41 項單元／API、27 個瀏覽器回歸全部通過。
- 以明確的預期官方帳號 URL 與驗證碼產生 SVG，逐字比對畫面 QR Code，確認內容正確。
- 桌機不提供不支援的 oaMessage 超連結；手機仍提供正確連結。
- 驗證碼過期不複製、不開新分頁；桌機 QR Code 撤下；已領標也撤下 QR Code。
- 320／390／1440 寬度無水平溢出，已檢視 output/line-desktop-handoff.png。
- 正式建置及 SSR 六項隔離驗證通過。
- 首次瀏覽器測試因 Vite 新依賴預編譯而重載、使假登入失效；預編譯完成後完整重跑 27 項通過。
- 官方個人頁外部抓取受到工具／TLS 限制；未將它當成已實測成功。QR 內容與流程已在隔離瀏覽器驗證，實際手機掃碼啟動 LINE 仍需真機確認。
- 本輪未送出 LINE 訊息、未出價、未修改正式會員資料，尚未部署。
