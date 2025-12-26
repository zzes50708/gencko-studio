本專案由原本的 Google Apps Script (GAS) 遷移至 Node.js (Express) + Vue 3 架構，並部署於 Vercel。資料庫維持使用 Google Sheets。

1\. 專案架構 (Project Structure)

code

Text

/

├── api/

│   └── index.js          # \[關鍵] Vercel Serverless 入口，橋接 Express

├── server/

│   ├── server.js         # 後端核心：Express App 設定、CORS、靜態資源路由

│   ├── googleSheetClient.js # Google Sheets API 連線設定 (Auth)

│   └── routes/

│       └── api.js        # 商業邏輯 (原 code.gs 的所有功能)

├── public/

│   ├── index.html        # 前端入口 (Vue 掛載點)

│   ├── css/

│   │   └── style.css     # 網站樣式 (原樣保留)

│   └── js/

│       ├── app.js        # 前端核心：Vue 邏輯、Fetch API 呼叫

│       └── loader.js     # 載入動畫控制

├── vercel.json           # Vercel 路由設定 (Rewrites)

├── package.json          # 專案依賴 (Express, Googleapis)

└── .env                  # \[機密] 環境變數 (Google Credentials)

2\. 後端 API 說明 (Backend)

所有 API 路徑皆以 /api 開頭，由 server/routes/api.js 處理。

Method	Endpoint	描述	對應原 GAS 功能

GET	/api/inventory	讀取庫存列表 (Inventory Sheet)	getInventory

GET	/api/articles	讀取文章列表 (Articles Sheet)	getArticles

GET	/api/announcement	讀取公告 (Config Sheet)	getAnnouncement

POST	/api/product	新增商品 (自動生成 ID)	addProduct

PUT	/api/product	更新商品 (含售出邏輯)	updateProduct

POST	/api/search	記錄搜尋關鍵字	logSearch

POST	/api/blacklist	檢查黑名單 (電話)	checkBlacklist

3\. 資料庫與環境變數 (Database \& Env)

本專案依賴 Google Sheets 作為資料庫。

必要環境變數 (Environment Variables):

在 Vercel 後台 > Settings > Environment Variables 設定：

SPREADSHEET\_ID: 目標試算表的 ID。

GOOGLE\_CLIENT\_EMAIL: Google Service Account 電子郵件。

GOOGLE\_PRIVATE\_KEY: Service Account 私鑰 (包含 -----BEGIN PRIVATE KEY... 與換行)。

Google Sheet 權限設定:

必須將試算表的「共用」權限，開放給 GOOGLE\_CLIENT\_EMAIL (設為編輯者)，否則 API 會回傳 403 錯誤。

4\. 前端維護指南 (Frontend)

框架: Vue 3 (CDN 模式)，無須 Build Step。

樣式: 原生 CSS (public/css/style.css)。

邏輯: public/js/app.js。

修改文字/圖片: 若是靜態內容 (如關於我們)，直接改 index.html。

修改互動邏輯: 修改 app.js 內的 Vue methods。

修改樣式: 修改 style.css。

5\. 常見問題與除錯 (Troubleshooting)

Q: 部署後 API 回傳 500 Error？

A: 90% 是 .env 的 GOOGLE\_PRIVATE\_KEY 格式錯誤。Vercel 環境變數中的換行符號 \\n 有時會被視為純文字。程式碼中已包含 .replace(/\\\\n/g, '\\n') 處理，請確保貼上的是完整私鑰字串。

Q: 圖片無法顯示？

A: 確認 Google Drive 圖片權限是否為「知道連結者皆可檢視」。

Q: 後台登入密碼想修改？

A: 目前密碼寫死在前端 public/js/app.js 的 login() 函式中 (if(prompt(...)==='8888'))。修改該處即可。

Q: 如何回復舊版本？

A: 在 Vercel Dashboard > Deployments，找到過去正常的版本，點擊 "Redeploy" 或 "Rollback"。

