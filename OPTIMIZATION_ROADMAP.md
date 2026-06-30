# Gencko 程式優化路線圖

> 本文件記錄 SEO/AEO/GEO 第一階段完成後的程式優化計畫，共 **34 項任務分 7 階段**。
>
> **使用方式**：每次要開工時，跟我說「**開始任務 #N**」或「**開始第 N 階段**」即可。
>
> **不在計畫內**（已決定跳過）：#19、#24、#25、#37、#38、#39、#41

---

## 📋 階段一覽（依優先級排序）

| 階段        | 主題               | 任務數 | 預估時數 | 主要收益                |
| ----------- | ------------------ | ------ | -------- | ----------------------- |
| **Phase 1** | PageSpeed 衝刺     | 7      | 4–5h     | 行動分 60 → 85+         |
| **Phase 2** | 架構重構           | 6      | 12h      | 維護成本 -50%           |
| **Phase 3** | SEO/GEO 深化       | 6      | 10h      | AI 引用率 +30%          |
| **Phase 4** | 安全強化           | 4      | 4h       | 防 XSS / 防外洩         |
| **Phase 5** | UX / Accessibility | 5      | 5h       | 無障礙 + 體感速度       |
| **Phase 6** | 開發品質           | 5      | 8h       | 防退步 / 防 bug         |
| **Phase 7** | 商業擴展           | 1      | 8h+      | 後台維護效率            |
| **Phase 8** | 特寵醫院強化       | 5      | 10h      | 對齊/超越「小獸所」競品 |
| **合計**    | —                  | **39** | **61h+** | —                       |

---

## 🔥 Phase 1：PageSpeed 衝刺（總計 4–5h）

> 目標：行動 PageSpeed 60 → 85+，**零功能風險**

### #1 GTM / GA 延遲到 idle 後載入

- **檔案**：`nuxt.config.ts`（移除 script 區的 GA 同步載入）+ 新增 `plugins/ga-deferred.client.ts`
- **做法**：移除 `useHead` 中的 `gtag.js` script，改用 `requestIdleCallback` 在 idle 時注入
- **效益**：行動 +5–8 分；省 156 KB 阻擋資源
- **預估**：0.5h
- **依賴**：無

### #2 LINE SDK 改為按按鈕時才載入

- **檔案**：`stores/useMainStore.js` 的 `initLiff()`
- **做法**：移除 `onMounted` 中自動 init；改為使用者點 LINE 按鈕時才動態 import + init
- **效益**：行動 +3 分；省 30 KB
- **預估**：1h
- **依賴**：無
- **注意**：要確認 LINE 登入功能仍正常

### #3 Cloudflare beacon 延遲到 load 事件後

- **檔案**：Cloudflare Insights 設定（Dashboard）或 `nuxt.config.ts`
- **做法**：把 beacon script 加 `defer` 或從 Cloudflare 設定關閉自動注入，改手動延遲
- **效益**：行動 +2 分；省 12 KB
- **預估**：0.5h
- **依賴**：無

### #4 Inter 字型 5 weight → 3

- **檔案**：`nuxt.config.ts` head.link 中的 Google Fonts URL
- **做法**：把 `Inter:wght@400;500;600;700;800` 改為 `Inter:wght@400;700;800`
- **效益**：省 30 KB CSS + 6 個 woff2 檔
- **預估**：0.5h
- **依賴**：無
- **風險**：grep `font-weight: 5` `font-weight: 6` 全站確認沒用到 500/600

### #5 Noto Sans TC 5 weight → 3

- **檔案**：同上
- **做法**：把 `Noto+Sans+TC:wght@300;400;500;700;900` 改為 `Noto+Sans+TC:wght@400;700;900`
- **效益**：省 70 KB CSS + 8 個 woff2 檔
- **預估**：0.5h
- **依賴**：無
- **風險**：同上

### #6 `/calculator` TresJS 動態 import

- **檔案**：`pages/calculator.vue`
- **做法**：把 TresJS 場景元件改為 `defineAsyncComponent`，模仿 `pages/index.vue` 的 lazy pattern
- **效益**：calculator 頁 LCP -3s，行動 +10 分
- **預估**：1h
- **依賴**：無

### #7 全站圖片 lazy loading 審查

- **檔案**：全站 `<img>` 與 `<NuxtImg>`
- **做法**：grep 找出所有 `<img`，確認首屏外的都有 `loading="lazy"`；首屏內保持 `loading="eager"`
- **效益**：各頁省下載時間
- **預估**：1h
- **依賴**：無

---

## 🏗️ Phase 2：架構重構（總計 12h）

> 目標：可維護性大幅提升，後續開發省 50% 時間

### #8 抽 `utils/seo-schemas.js` 共用 helper

- **痛點**：publisher Organization 在 16 個頁面複製 200+ 行重複碼，改一處要改 16 處
- **做法**：建立 helper `getPublisher()`, `getBreadcrumb(items)`, `getWebPage(opts)`, `getOrgRef()`
- **效益**：以後改 publisher 一處全站生效；bundle 因共用而略減
- **預估**：2h
- **依賴**：無

### #9 抽 `utils/site-constants.js`

- **痛點**：`https://www.genckobreeding.com`、logo URL、預設 OG image 在 30+ 處 hardcoded
- **做法**：建立 `SITE_URL`, `SITE_NAME`, `BRAND_LOGO`, `DEFAULT_OG_IMAGE`, `SOCIAL_LINKS` 常數
- **效益**：搬網域、換 logo 都只改一處
- **預估**：1h
- **依賴**：#8（一起改）

### #10 useMainStore 拆分

- **痛點**：426 行混合 inv / articles / genes / auctions / merch / UI state，一動全動
- **做法**：拆成 `useInventoryStore`, `useArticlesStore`, `useGenesStore`, `useAuctionsStore`, `useUIStore`
- **效益**：初始 store 變小，tree-shake 更乾淨；hot reload 更快
- **預估**：3h
- **依賴**：無
- **風險**：所有引用 `store.xxx` 的地方都要改 import；測試覆蓋率不足會炸

### #11 UTF-8 亂碼批次修復

- **痛點**：`app.vue`, `components/TheNavbar.vue`, `pages/merch/[id].vue` 等多檔註解 UTF-8 損毀變問號（影響 Edit 工具效率）
- **做法**：Python 批次掃描 + 重新編碼 / 註解重寫
- **效益**：開發體驗大幅提升
- **預估**：1h
- **依賴**：無

### #12 TypeScript 漸進導入

- **痛點**：沒型別保護，欄位錯字會炸（你經歷過 `articles.created_at` 不存在的問題）
- **做法**：先把 `utils/*.js` 改 `.ts`；接著 `pages/*.vue` 的 `<script setup>` 加 `lang="ts"`
- **效益**：欄位錯誤編譯期就抓到
- **預估**：5h（漸進，可分多次）
- **依賴**：#13

### #13 Supabase 型別自動產生

- **檔案**：新增 `types/supabase.ts`
- **做法**：跑 `npx supabase gen types typescript --project-id sfndneptcwhblvrxykcy > types/supabase.ts`，搭配 `useSupabaseClient<Database>()`
- **效益**：所有 Supabase 查詢有完整型別提示
- **預估**：1h
- **依賴**：#12 開始

---

## 📈 Phase 3：SEO/GEO 深化（總計 10h）

### #14 內部連結自動產生器（build-time）

- **做法**：文章發布時，將內容裡出現的 morph 名（如「Tremper Albino」）自動連到 `/genes/Tremper%20Albino`
- **實作**：寫 `utils/auto-link.js`，在 SSR `useAsyncData` 取文章後處理，注入 `<a>`
- **效益**：GEO 大殺器，建立 topic cluster；LLM 識別實體關聯
- **預估**：3h
- **依賴**：無
- **注意**：避免 runtime 影響，用 server-side 處理

### #15 Sitemap 加 image:image

- **檔案**：`server/api/_sitemap-urls.ts`
- **做法**：每個 product/article URL 帶 `image.loc` + `image.title`
- **效益**：Google 圖片搜尋曝光
- **預估**：1.5h
- **依賴**：無

### #16 RSS feed for /articles

- **檔案**：新增 `server/routes/feed.xml.ts`
- **做法**：產生 RSS 2.0 feed，列出最新 20 篇文章
- **效益**：訂閱、聚合器、Perplexity 容易吃
- **預估**：1.5h
- **依賴**：無

### #17 靜態預渲染穩定頁面

- **檔案**：`nuxt.config.ts` 加 `nitro.prerender.routes`
- **目標頁**：`/about`, `/faq`, `/care`, `/qs`, `/calculator`, `/compare`
- **效益**：TTFB 600ms → < 50ms；SEO 強化
- **預估**：1h
- **依賴**：無
- **風險**：預渲染後內容更新需 rebuild

### #18 開發 `articles.faq` 自動產生 FAQPage

- **檔案**：`pages/articles/[id].vue`
- **做法**：select 多撈 `faq` 欄位；有資料時注入 FAQPage JSON-LD（你之前已加 DB 欄位）
- **效益**：AEO，FAQ snippet 命中
- **預估**：1.5h
- **依賴**：無

### #20 BreadcrumbList middleware 統一注入

- **檔案**：新增 `middleware/breadcrumb.global.ts`
- **做法**：依 route path 自動生成 breadcrumb，避免每頁手寫
- **效益**：程式碼乾淨；新頁面自動有 breadcrumb
- **預估**：1.5h
- **依賴**：#8（共用 helper）

---

## 🔒 Phase 4：安全強化（總計 4h）

### #21 Supabase RLS 全表稽核

- **做法**：登入 Supabase Studio → Authentication → Policies，逐表確認 select 政策合理
- **重點查**：`articles`, `animals`, `auctions`, `hospitals`, `genetic_pages`, `merchandise`, `config`
- **效益**：防資料外洩
- **預估**：1h
- **依賴**：無

### #22 anon key 改 runtimeConfig

- **檔案**：`nuxt.config.ts`, `.env`
- **做法**：把 hardcoded anon key 移到 `runtimeConfig.public.supabaseKey`，env 注入
- **效益**：金鑰可在 Vercel env vars 換；遵守業界慣例
- **預估**：1h
- **依賴**：無

### #23 CSP (Content Security Policy) header

- **檔案**：`vercel.json` 或 `nuxt.config.ts` route rules
- **做法**：設定 `Content-Security-Policy` header，限制 script-src / img-src / style-src 來源白名單
- **效益**：防 XSS 攻擊
- **預估**：1.5h
- **依賴**：無
- **風險**：設太嚴會擋掉 GTM/wsrv.nl/jsDelivr，要仔細列白名單

### #26 Supabase 連線重試與離線快取

- **檔案**：`stores/useMainStore.js` 各 fetch 區塊
- **做法**：包 retry helper，失敗時讀 PWA cache 或 stale data
- **效益**：網路不穩時頁面不崩潰
- **預估**：1h
- **依賴**：無

---

## 🎨 Phase 5：UX / Accessibility（總計 5h）

### #27 WCAG 對比度修正

- **痛點**：Lighthouse 無障礙 96/100，扣分項是對比度
- **做法**：用 Chrome DevTools Lighthouse 報告找出對比度不足的元素，調整 CSS 變數
- **效益**：無障礙 96 → 100；SEO 微加分
- **預估**：1h
- **依賴**：無

### #28 Skip to content 連結

- **檔案**：`app.vue` 或 layout
- **做法**：在最頂端加 `<a class="sr-only sr-only-focusable" href="#main">跳至主要內容</a>`
- **效益**：鍵盤可達性
- **預估**：0.5h
- **依賴**：無

### #29 客製 404 頁

- **檔案**：新增 `error.vue`
- **做法**：設計守宮主題的 404，含「回首頁」「找在售個體」「閱讀文章」等 CTA
- **效益**：UX 提升；降低跳出率
- **預估**：1.5h
- **依賴**：無

### #30 PWA Offline 頁面

- **檔案**：新增 `public/offline.html`
- **做法**：PWA Workbox 已有 cache，補一個離線 fallback；含「重試」按鈕
- **效益**：App 體驗
- **預估**：1h
- **依賴**：無

### #31 全站 skeleton loader 補完

- **痛點**：目前只有 `/shop` 有 skeleton；其他頁面是 spinner
- **做法**：用 `components/SkeletonCard.vue`（已存在）的 pattern 補齊 articles/genes/merch/auction 列表
- **效益**：感知速度提升
- **預估**：1h
- **依賴**：無

---

## 🧪 Phase 6：開發品質（總計 8h）

### #32 單元測試（Vitest）：基因計算邏輯

- **檔案**：新增 `tests/calc-utils.spec.ts`
- **做法**：為 `utils/calcUtils.js`, `utils/genetics/*` 寫測試，涵蓋孟德爾、Het、共顯性、致死、反向匹配
- **效益**：改邏輯不擔心炸；regression 防護
- **預估**：3h
- **依賴**：#12（TypeScript 入門更好寫）

### #33 E2E 測試（Playwright）：購買流程

- **檔案**：新增 `tests/e2e/shop.spec.ts`, `tests/e2e/auction.spec.ts`
- **做法**：模擬「進首頁 → 看商品 → 加入收藏 → 進詳情 → 點分享」流程
- **效益**：重構不擔心炸 critical path
- **預估**：3h
- **依賴**：無

### #34 Lighthouse CI in PR

- **檔案**：`.github/workflows/lighthouse.yml`
- **做法**：每次 PR 跑 Lighthouse，分數退步發 PR 評論
- **效益**：防效能退步
- **預估**：1h
- **依賴**：無

### #35 pre-commit hooks

- **檔案**：`.husky/`, `package.json`
- **做法**：裝 `husky` + `lint-staged` + `prettier`，commit 前自動 format
- **效益**：統一 code style
- **預估**：0.5h
- **依賴**：無

### #36 Supabase migration framework

- **做法**：用 `supabase` CLI 或 `drizzle-kit` 管理 DB schema 變更歷史
- **效益**：DB 變更可追蹤、可 rollback
- **預估**：1.5h
- **依賴**：無

---

## 🏥 Phase 8：特寵醫院強化（總計 10h）

> **觸發指令**：使用者會說「**換特寵醫院**」（不在 Phase 1-7 既定順序內，獨立執行）
>
> **背景**：分析競品 `crittermap.snyr.tw`（小獸所）後的借鑑改進
> 對方優勢：146 間醫院 / Google 評分 / 收治物種 / 公告系統 / 多源驗證
> 對方劣勢：沒 VeterinaryCare schema / 沒詳情頁 / 資料改了要 redeploy
> 我方優勢：Supabase Studio 直接編輯（已完成）/ schema 已完整 / E.164 電話

### #A hospitals 加 `pets text[]` 收治物種陣列

- **檔案**：Supabase SQL（先給 ALTER TABLE）+ `pages/hospital.vue` schema 注入
- **做法**：
  1. SQL `ALTER TABLE hospitals ADD COLUMN pets TEXT[] DEFAULT '{}'`
  2. 後台填值範例：`{"犬","貓","兔","鼠","守宮","蛇"}` 等
  3. UI 加篩選器（已篩 city/district，再加 pet 篩選）
  4. JSON-LD VeterinaryCare 多 `medicalSpecialty.knowsAbout` 標
- **效益**：使用者「我要找會看守宮的醫院」一鍵搞定 → 比競品篩選更精準
- **預估**：2h
- **依賴**：無

### #B hospitals 加 `google_rating` + `google_review_count`

- **檔案**：Supabase + hospital.vue 與 schema 注入
- **做法**：
  1. SQL `ALTER TABLE hospitals ADD COLUMN google_rating NUMERIC(2,1), ADD COLUMN google_review_count INT`
  2. 後台手動填（從 Google Maps 抄）或之後接 Google Places API
  3. UI 顯示星等 + 評論數
  4. VeterinaryCare schema 加 `aggregateRating`（Google rich result 加分）
- **效益**：信任感大幅提升；Google AggregateRating rich snippet → SERP 顯示星等
- **預估**：1.5h
- **依賴**：無
- **注意**：手動填 78 筆約需 1.5h 額外人工

### #C 公告系統（停診/特診/活動）

- **檔案**：新增 `hospital_announcements` 表 + UI 顯示
- **做法**：
  1. SQL 新表：`hospital_announcements (id, hospital_id, type, title, summary, source_label, source_url, valid_from, valid_to, created_at)`
  2. type enum: `closed`, `special_clinic`, `event`, `other`
  3. UI：醫院卡片右上角加紅點，點開展開公告
  4. 列表頁加「最新公告」區
- **效益**：比競品還有更細的差異化點；資料新鮮度感受強
- **預估**：3h
- **依賴**：#A 完成更好（一起 review 結構）

### #D 多源驗證 `source_label` + `source_url`

- **檔案**：Supabase + UI
- **做法**：
  1. SQL `ALTER TABLE hospitals ADD COLUMN source_label TEXT, ADD COLUMN source_url TEXT`
  2. 例：`source_label = "Google Maps、官方 Facebook"`、`source_url = "https://www.facebook.com/xxxx"`
  3. UI 醫院詳情底部顯示「資料來源：X、Y、Z」
  4. JSON-LD VeterinaryCare 加 `citation`
- **效益**：E-E-A-T 信任分大幅提升；AI 引用時容易標來源
- **預估**：1.5h
- **依賴**：無

### #E 擴充醫院清單（78 → 150+ 但維持精選原則）

- **檔案**：Supabase Studio 直接編輯
- **做法**：
  1. 新增「分類」標籤 `category enum`：`exotic_specialty`（特寵專科）/ `general_with_exotic`（綜合含特寵）
  2. 主清單預設只顯示 `exotic_specialty`（保留現有 78 間品質）
  3. 篩選器加「也顯示綜合動物醫院」勾選
  4. 從小獸所、其他社群、Google Maps 補 70+ 間綜合動物醫院
- **效益**：覆蓋率追平/超越競品；同時保留「精選」可信度
- **預估**：2h（程式）+ 多次人工填入時間
- **依賴**：#A 完成（pets 欄位）+ #D 完成（source_url）

### 📝 為什麼小獸所有 146 而我們現在只有 78？

**不是 Gencko 少蒐，是定義不同**：

- **小獸所**：寬鬆 — 包含「兼診犬貓 + 偶爾看特寵」的綜合動物醫院
- **Gencko 現況**：嚴格 — 只列主打非犬貓（爬蟲 / 守宮 / 鳥 / 小哺乳）

#E 完成後可達 150+ 並保留 78 精選的可信度。

---

## 💼 Phase 7：商業擴展（總計 8h+）

### #40 後台管理介面

- **痛點**：目前用 Supabase Studio 維護，沒有給非工程人員的友善介面
- **做法**：新增 `/admin` 路由（需登入），用 Naive UI / Element Plus 做表單
- **管的東西**：articles 編輯、animals 上下架、auctions 開設、hospitals 維護
- **效益**：未來請助理也能維護內容
- **預估**：8h+（依需求而定）
- **依賴**：#22（auth）+ #21（RLS 完整）

---

## 🗂️ 任務追蹤模板

每次開工時請對我說：

```
開始任務 #N
```

或

```
開始第 N 階段
```

我會：

1. 讀本檔案對應任務的描述
2. 確認依賴是否已完成
3. 列出**這次具體要動的檔案**並提出修改方案
4. 等你確認後執行
5. 在本檔案勾選完成項

---

## ✅ 完成進度

### Phase 1

- [x] #1 GTM/GA 延遲 ✅ 2026-06-22（commit 593dfd4）
- [x] #2 LINE SDK 延遲 ✅ 2026-06-22（commit 11fb11d）
- [x] #3 CF beacon 延遲 ✅ 2026-06-24（使用者於 Cloudflare Dashboard Web Analytics 關閉 RUM）
- [x] #4 Inter 字型 ✅ 2026-06-24（commit b0be313，完全移除，全站零使用 — 比預期更大幅省 50KB）
- [x] #5 Noto Sans TC 5→4（保守版） ✅ 2026-06-24（commit 7131229，省 ~30KB；激進的 5→3 視覺風險中等暫不執行）
- [~] #6 /calculator TresJS 動態 import ⏭️ 跳過（2026-06-24 確認 calculator 完全不用 TresJS/Three.js，原路線圖前提誤判；動態 import 物種 config 收益 < 12KB 且 async 介面風險大）
- [x] #7 圖片 lazy loading 審查 ✅ 2026-06-24（commit 4fba5f6，9 個 img 加 lazy + identity 主圖修為 eager）

### Phase 2

- [x] #8 抽 seo-schemas.js ✅ 2026-06-24（commit 0d25230，含 getPublisher / getBreadcrumb / getWebPage / GECKO_TAXONS / getSocialMeta）
- [x] #9 抽 site-constants.js ✅ 2026-06-24（commit 0d25230，含 SITE_URL / DEFAULT_OG_IMAGE / SOCIAL_LINKS / absUrl）
- 示範重構：pages/faq.vue（95→56 行 -41%，SSR 完全等價）
- 其餘 16 個頁面遷移工作量：每頁約 10 分鐘，建議自然遷移（修 SEO 時順手換）
- [ ] #10 useMainStore 拆分
- [x] #11 UTF-8 亂碼修復 ✅ 2026-06-24（commit e10004b，移除 338+ mojibake 標記，保留率閾值 18% 避免誤傷合法中文）
- [ ] #12 TypeScript 漸進導入
- [ ] #13 Supabase 型別自動產生

### Phase 3

- [x] #14 內部連結自動產生器 ✅ 2026-06-26（utils/auto-link.js + pages/articles/[id].vue SSR 注入；長名優先、每名最多 1 次、跳過 a/code/pre/h1-3、CJK ≥2 ASCII ≥3；當前文章內容未提及 morph 故實測 0 連，待後台文章涉及基因即自動生效）
- [x] #15 Sitemap image:image ✅ 2026-06-26（animals/articles/genes/merch/auctions 全部掛 image:image，本地驗證 114 URL 中 59 含圖）
- [x] #16 RSS feed ✅ 2026-06-26（server/routes/feed.xml.ts，RSS 2.0 + atom:self + dc:creator，最新 20 篇 published 文章；/articles 加 rel=alternate 自動發現）
- [x] #17 靜態預渲染 ✅ 2026-06-26（commit 8f67303，/about /faq /qs /compare /calculator 5 頁，TTFB ~600ms → <50ms）
- [x] #18 articles.faq FAQPage ✅ 2026-06-24（commit 6ec03da，後台填了 faq 立即自動生效）
- [x] #20 BreadcrumbList helper ✅ 2026-06-24（commit 39dce02，改為 helper-only 做法避免與既有 breadcrumb 衝突；ROUTE_LABELS + getBreadcrumbForPath()）

### Phase 4

- [ ] #21 RLS 稽核
- [x] #22 anon key runtimeConfig ✅ 2026-06-26（移除 nuxt.config.ts hardcoded url/key，改用 .env：SUPABASE_URL / SUPABASE_KEY；Vercel 部署時需在 dashboard 補設 env vars）
- [x] #23 CSP header ✅ 2026-06-26（nitro routeRules 套全站；白名單含 GTM / GA / Cloudflare Insights / LINE LIFF / Supabase / wsrv.nl；額外加 X-Content-Type-Options + Referrer-Policy）
- [x] #26 Supabase 重試 / 離線 ✅ 2026-06-26（utils/supabase-retry.js withRetry：指數退避 + 4xx 不重試 + 429/5xx/network 才重試；包進 animals/merchandise/articles/genetic_pages/config/auctions 6 個 fetch；PWA workbox 已有離線快取所以未再加 localStorage 層）

### Phase 5

- [x] #27 WCAG 對比度 ✅ 2026-06-30（以實際渲染頁面跑對比掃描＝Lighthouse 等效；新增主題感知 token：day-mode --pri #CC3B08、--pri-btn、--txt-muted、--ok-text/--ok-fill；修品牌橘文字/按鈕/灰字/綠 chip/跑馬燈 #FF4500/收藏愛心/頁尾深底隱形；/shop /articles /calculator /hospital / 首頁掃描 0 失敗，disabled select 屬 WCAG 豁免）
- [x] #28 Skip to content ✅ 2026-06-26（app.vue 加 .skip-to-content + main#main-content；Tab 首站可見、聚焦時下滑至 12px）
- [x] #29 客製 404 ✅ 2026-06-26（新增 error.vue，守宮主題、回首頁/找個體/讀文章/玩計算機四 CTA + LINE 直連；含 noindex meta）
- [x] #30 PWA Offline ✅ 2026-06-26（public/offline.html 守宮主題 + navigator.onLine 動態狀態 + 重試按鈕；workbox navigateFallback 指向，denylist 排除 api/sitemap/feed/robots） 頁
- [x] #31 全站 Skeleton ✅ 2026-06-26（merch/auction 從 spinner 換成 SkeletonCard；articles 早已使用；genes 是靜態 dict 無需）

### Phase 6

- [x] #32 單元測試 ✅ 2026-06-26（tests/calc-utils.spec.js 12 tests，涵蓋孟德爾隱性 VIS×VIS/Het×Het/Het×Wild、共顯性 SGL×SGL（1:2:1 + comboRule 超級雪花）、顯性 VIS×Wild、白化警告/腫瘤警告、raptor combo 展開 5 components；npm test 跑全部，npm run test:watch 開發用。2026-06-29 補 vitest.config.ts 把單元測試限定 tests/\*.spec、排除 tests/e2e，修掉 vitest 誤掃 Playwright 檔的衝突）
- [x] #33 E2E 測試 ✅ 2026-06-26（tests/e2e/critical-paths.spec.ts + playwright.config.ts，chromium-desktop project；npm run test:e2e 需先 npm run dev 起服）
- [x] #34 Lighthouse CI ✅ 2026-06-26（.github/workflows/lighthouse.yml 監聽 Vercel deployment_status；treosh/lighthouse-ci-action@v12 對首頁/articles/shop/calculator 跑；.github/lighthouse/lhci.json 設 a11y≥0.9 / seo≥0.95 為 error，performance/best-practices≥0.8/0.9 為 warn）
- [x] #35 pre-commit hooks ✅ 2026-06-26（husky v9 + lint-staged + prettier 3；.prettierrc.json + .prettierignore；commit 時 staged js/ts/vue/json/css/md 自動 prettier --write）
- [~] #36 Migration framework（骨架已提交：supabase/config.toml、migrations/、db:\* npm scripts、README.md；2026-06-26 嘗試 db:pull 失敗——需 Docker Desktop 跑 shadow DB。一人專案先擱置，未來協作或要本機 dev 環境再裝 docker 並 db:dump 抓 baseline）

### Phase 7

- [ ] #40 後台管理介面

### Phase 8（特寵醫院強化 — 觸發詞「換特寵醫院」）

- [ ] #A pets 收治物種陣列
- [ ] #B google_rating / review_count
- [ ] #C 公告系統
- [ ] #D 多源驗證 source_label / source_url
- [ ] #E 擴充醫院清單 78 → 150+

---

## 📌 已決定跳過的項目（不在計畫內）

| #   | 項目                  | 跳過原因 |
| --- | --------------------- | -------- |
| 19  | OG image 動態產生     | —        |
| 24  | Subresource Integrity | —        |
| 25  | Sentry 錯誤監控       | —        |
| 37  | 使用者帳號            | —        |
| 38  | 競標通知              | —        |
| 39  | 評論評星系統          | —        |
| 41  | 多語系（英文）        | —        |

> 若日後想做這幾項，再來討論。

---

## 變更歷史

- **2026-06-22 v1** 初版（34 項任務、7 階段、預估 51h）
