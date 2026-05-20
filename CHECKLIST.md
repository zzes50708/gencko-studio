# Gencko Studio 全站驗收清單

> 上次更新：2026-05-20

## 資料串接

- [ ] 首頁熱門精選正常顯示
- [ ] 商城列表能撈到所有 ForSale / Auction 個體
- [ ] 個體詳頁 `/product/[id]` 正確顯示資料
- [ ] 文章列表只顯示 `status=published` 的文章
- [ ] 文章詳頁 `/articles/[id]` SSR 正常渲染
- [ ] 競標列表只顯示 `status=active` 且未過期的場次
- [ ] 競標詳頁 `/auction/[id]` 倒數計時正確
- [ ] 跑馬燈文字從 `config` 表正常讀取
- [ ] 種群展示只顯示 `SelfKeep` 個體
- [ ] 周邊商品 `merch` 正常顯示

## 競標功能

- [ ] 競標卡片 badge 僅在 `auctionList` 有對應場次時顯示「競標中」
- [ ] 個體詳頁若無有效競標場次，不顯示「競標中」badge（改為售價）
- [ ] 商城篩選「有庫存」包含有效競標個體，不包含已結標者
- [ ] Realtime 訂閱：其他用戶出價時頁面即時更新
- [ ] 結標前 3 分鐘倒數變紅色閃爍

## 使用者功能

- [ ] LINE 登入流程正常（LIFF 初始化 → 登入 → 導回）
- [ ] Google 登入流程正常（OAuth → 導回）
- [ ] 收藏清單（❤）能正常新增/移除，重整後保留
- [ ] 瀏覽記錄能正常記錄，🕒 篩選功能正常
- [ ] 我的專區顯示登入資訊與出標記錄

## PWA / 安裝

- [ ] Android Chrome 出現「安裝 App」提示
- [ ] iOS Safari 顯示「加到主畫面」引導
- [ ] 安裝後以 standalone 模式開啟
- [ ] 離線時能顯示快取頁面（Service Worker 正常）

## SEO

- [ ] 首頁 `<title>` 與 OG 標籤正確
- [ ] 個體詳頁有 Product JSON-LD structured data
- [ ] Sitemap `/sitemap.xml` 能正常訪問
- [ ] Robots.txt 正確禁止 `/profile`、`/identity/`
- [ ] Canonical link 在每個頁面正確設置

## UI / 主題

- [ ] 夜間模式：深色背景 + 橘紅蜂巢格紋 + 橘紅主色
- [ ] 日間模式：白色背景 + 極淡灰蜂巢格紋
- [ ] 導覽列：日間 = Logo 冷藍灰底，夜間 = 深色底
- [ ] 切換日/夜主題後無白閃（transition 順暢）
- [ ] 日間模式競標倒數、價格區塊對比度足夠
- [ ] 手機版底部導航欄高亮狀態正確（深層路由也亮）

## 效能

- [ ] 首頁 LCP 圖片（前 4 張熱門）eager loading
- [ ] 商城卡片圖片 400px wsrv.nl WebP 代理
- [ ] 個體詳頁圖片 800px
- [ ] 文章封面圖 600px
- [ ] animals 查詢不回傳 `cost_price`（後台專用欄位）

## 自動化（上線後）

- [ ] 部署 Supabase Edge Function `end-auction`
- [ ] 設定 Cron：`*/5 * * * *`（每 5 分鐘自動結標）
- [ ] 驗證：競標結束後 `auctions.status` 變 `ended`
- [ ] 驗證：對應 `animals.status` 從 `Auction` 改回 `ForSale`
