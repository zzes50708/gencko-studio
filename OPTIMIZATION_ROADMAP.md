# Gencko 待辦任務清單

> **使用方式**：對我說「**開始任務 #N**」或「**換特寵醫院**」→ 我讀本檔對應段落 → 確認依賴 → 列出這次要動的檔案與方案 → 等你確認後執行 → 完工後勾選並補 commit 註記。
>
> **狀態圖例**：`[ ]` 未開始｜`[~]` 進行中
>
> 已完成 / 擱置任務已從本清單移除（細節見 git 歷史與各 commit）。

---

## 🗺️ 待辦總覽

| 階段  | 主題         | 任務    | 預估 |
| ----- | ------------ | ------- | ---- |
| **D** | 架構與型別   | #10 #12 | 8h   |
| **E** | 安全與資料   | #21     | 1.5h |
| **F** | 後台         | #40     | 8h+  |
| **G** | 特寵醫院強化 | #A–#E   | 10h  |

> **建議順序**：#12（低風險、可分批）或 #21（安全、CP 高）先做 → #10 → #40 → G（觸發詞「換特寵醫院」）視需求。

---

# 🅓 Phase D — 架構與型別（總計 ~8h）

## #10 useMainStore 拆分

- **痛點/背景**：`stores/useMainStore.js` 一檔混合 inv/articles/genes/auctions/merch/UI/wishlist/LINE 等狀態，牽一髮動全身、hot reload 慢、tree-shake 不乾淨。
- **影響面與收益**：可維護性大幅提升、初始 store 變小、後續開發省時。
- **牽涉檔案**：`stores/useMainStore.js`（拆出）、新增 `stores/useInventoryStore.js`、`stores/useArticlesStore.js`、`stores/useGenesStore.js`、`stores/useAuctionsStore.js`、`stores/useUIStore.js`；所有引用 `store.xxx` 的頁面/元件（grep `useMainStore`，約 15+ 檔）。
- **詳細做法**：
  1. 先建新 store，逐塊搬移 state/getter/action（先搬最獨立的 auctions、merch）。
  2. 用 cross-store 呼叫處理相依（如 UI loading 旗標）。
  3. 逐檔把 `useMainStore().xxx` 改為對應新 store；每搬一塊就 `npm run build` + 跑 `tests/`。
  4. 全部搬完後移除舊 store 或保留為相容 re-export（過渡期）。
- **驗收標準**：各 store 單一職責；全站 build 通過；E2E（#33）critical path 綠燈；功能（在售清單/文章/競標/收藏/LINE 登入）皆正常。
- **預估**：3h　**依賴**：建議先有 #12 型別更安全
- **風險與緩解**：**中高風險**（引用面廣，store 無完整測試）。分小批 commit、每批驗證；先擴充 store 相關測試再動。
- **驗證方式**：`npm test` + `npm run test:e2e` + 手動走購買/收藏/競標流程。

## #12 TypeScript 漸進導入

- **狀態**：`[~]` 進行中。**batch 1 完成（2026-07-07）**：裝 `typescript` + `vue-tsc`、加 root `tsconfig.json`（`checkJs:false` 漸進、排除 Deno 的 `supabase/functions`）、加 `npm run typecheck`（`nuxt typecheck`）；`utils/supabase-retry.js` → `.ts`（加型別，邏輯不動，匯入處零副檔名故無 import 需改）；修 `nuxt.config.ts` JSON-LD `children` → `innerHTML`（唯一既有型別錯）。驗證：`typecheck` 0 error、`test` 12 passed、`build` 完成。**batch 2 完成（2026-07-07）**：`image.js`→`.ts`（33 處帶副檔名 import 一併改為零副檔名）、`site-constants.js`→`.ts`（2 處）；共 18 檔更新 import。驗證：`typecheck` 0 error、`test` 12 passed、`build` 完成。**batch 3 完成（2026-07-07）**：`seo-schemas.js`→`.ts`（271 行；加 `JsonLd=Record<string,unknown>`、`ROUTE_LABELS: Record<string,string>`、`WebPageOptions`/`SocialMetaOptions`/`BreadcrumbItem` interface；`getWebPage` 動態塞屬性改用 `JsonLd`）；faq.vue import 改零副檔名。驗證：`typecheck` 0 error、`test` 12 passed、`build` 完成。**batch 4 完成（2026-07-07）**：`calcUtils.js`→`.ts`（362 行基因計算核心；**邏輯一字不動**，只在宣告加型別：動態 map 用 `Record<>`、外部 gene/config 用寬鬆 `any`、加 `CalcOutcome`/`CalcResult` interface）；calculator.vue + 2 測試檔 import 改零副檔名。驗證：`typecheck` 0 error、**`test` 12 passed（#32 護欄證明計算不變）**、`build` 完成。**已轉 5 核心 utils**：supabase-retry / image / site-constants / seo-schemas / calcUtils。**batch 5 完成（2026-07-08）**：`genes`/`genes-db`/`hospitals`（純資料，`git mv` 保留歷史）+ `auto-link`（加函式型別）→ `.ts`；13 處 import 改零副檔名。驗證：`typecheck` 0 error、`test` 12 passed、`build` 完成。**batch 6 完成（2026-07-08）**：`care`(200)/`faq`(151)/`quiz`(285) → `.ts`（純資料，`git mv`）；5 處 import 改零副檔名。typecheck 0 / test 12 / build 綠。**batch 7 完成（2026-07-08）**：`health.js`(801) → `.ts`（純資料 + `getSeasonContext` 單函式，`git mv`；`getSeasonContext` 參數靠 default 推斷 Date，無需標註）；health.vue import 改零副檔名。typecheck 0 / test 12 / build 綠。**batch 8 完成（2026-07-08）**：`utils/genetics/*`（5 檔：index/morphs/afttail/ballpython/leopardgecko）→ `.ts`；morphs 6 函式 + configs CHECKS + index `getSpeciesConfig` 加參數型別、內外部 import 改零副檔名。typecheck 0 / test 12 / build 綠。**✅ 全部 utils（含 genetics）皆 .ts，第一/二階段完成。** **剩餘（第三階段，量大、可日後漸進）**：頁面 `pages/*.vue` 逐頁上 `<script setup lang="ts">`；`components/*.vue`、`composables/`、`stores/`（與 #10 一起做更佳）。
- **痛點/背景**：缺型別保護，欄位錯字到 runtime 才炸（曾發生 `articles.created_at` 不存在）。#13 已備好 `types/supabase.ts` 與 `useDB()`，可開始導入。
- **影響面與收益**：欄位/型別錯誤編譯期攔截、IDE 補全、重構更安全。
- **牽涉檔案**：`utils/*.js`（13 檔，先轉）、`composables/`、各 `pages/*.vue` 的 `<script setup>`、`nuxt.config.ts`（typeCheck）、`package.json`（加 `typecheck` script + vue-tsc devDep）。
- **詳細做法**：
  1. 加 `vue-tsc` 與 `npm run typecheck`（nuxi typecheck），先讓它在現狀「可跑、容忍 JS」。
  2. **第一批**：`utils/*.js` → `.ts`，加參數/回傳型別（calcUtils、seo-schemas、site-constants、image、supabase-retry 優先）。
  3. **第二批**：各頁 Supabase 查詢從 `useSupabaseClient()` 換成 `useDB()`，享受 `types/supabase.ts` 的欄位型別。
  4. **第三批**：`pages/*.vue` `<script setup lang="ts">`，逐頁加型別；分多次 PR。
  5. 把 `typecheck` 納入 #34 Lighthouse CI 或 pre-commit（可選）。
- **驗收標準**：`npm run typecheck` 對已轉檔 0 error；已轉頁面的 Supabase 查詢有欄位補全；build 通過。
- **預估**：5h（漸進，分多批）　**依賴**：#13（已完成）
- **風險與緩解**：大範圍但可分批、低單批風險；每批獨立 commit。
- **驗證方式**：`npm run typecheck` + `npm run build`。

---

# 🅔 Phase E — 安全與資料（總計 ~1.5h）

## #21 Supabase RLS 全表稽核

- **痛點/背景**：對外查詢的資料表 RLS 政策未逐表確認，有資料外洩風險。
- **影響面與收益**：防止越權讀取（成本價、後台欄位、私密資料）。
- **牽涉**：Supabase Studio → Authentication → Policies（**需你操作**），對照 `types/supabase.ts` 的表清單。
- **詳細做法**：
  1. 列出對外讀取的表：`animals`（注意 cost_price 不可外洩）、`articles`、`auctions`、`hospitals`、`genetic_pages`、`merchandise`、`config`。
  2. 逐表確認 `SELECT` policy 只開放必要欄位/列；敏感欄位用 view 或 column 權限隔離。
  3. 寫入類表（auction_bids、blacklist…）確認只有授權角色可寫。
  4. 把稽核結果記錄成清單（哪表哪欄、現狀、調整）。
- **驗收標準**：每張對外表都有明確記載的 RLS 結論；anon key 無法讀到敏感欄位（用 anon key curl 驗證）。
- **預估**：1.5h　**依賴**：無
- **風險與緩解**：改 policy 可能擋掉正常查詢；先在 Studio 測試、逐表驗證官網功能不掛。
- **驗證方式**：用 `.env` 的 anon key `curl` REST API，確認敏感欄位查不到。

---

# 🅕 Phase F — 後台管理（~8h+）

## #40 後台管理介面 `/admin`

- **痛點/背景**：目前靠 Supabase Studio 維護，非工程人員不友善。
- **牽涉檔案**：新增 `pages/admin/*`、auth middleware、`composables/useDB.ts`（型別化 CRUD）。
- **詳細做法**：
  1. `/admin` 路由 + 登入保護（Supabase Auth）；只有授權 email 可入。
  2. 管理模組：articles 編輯、animals 上下架、auctions 開設、hospitals 維護。
  3. 表單用型別化 `useDB()`（#13）做 CRUD；圖片上傳走既有 CDN 流程。
  4. RLS（#21）需先到位，確保前端寫入受控。
- **驗收標準**：授權者可在 `/admin` 完成 articles/animals/auctions/hospitals 基本 CRUD；未登入導向登入。
- **預估**：8h+　**依賴**：#21（RLS）、#22（auth，已完成）、#12（型別更佳）
- **風險與緩解**：大工程、牽涉寫入權限；先做唯讀清單再加寫入；嚴格依賴 RLS。
- **驗證方式**：E2E 模擬登入 → 編輯一篇 article → 確認 DB 更新。

---

# 🅖 Phase G — 特寵醫院強化（~10h，觸發詞「換特寵醫院」）

> 競品 `crittermap.snyr.tw`（小獸所）分析後的借鑑。我方優勢：Supabase Studio 直編、schema 完整、E.164 電話、VeterinaryCare schema。

## #A hospitals 加 `pets text[]` 收治物種

- **檔案**：Supabase SQL（`ALTER TABLE hospitals ADD COLUMN pets TEXT[] DEFAULT '{}'`）+ `pages/hospital.vue`（篩選器 + JSON-LD `knowsAbout`）。
- **做法**：後台填收治物種陣列 → UI 加「找會看守宮的醫院」篩選 → VeterinaryCare schema 多標。
- **驗收**：可依物種篩選；schema 含對應 medicalSpecialty。**預估**：2h。

## #B `google_rating` + `google_review_count`

- **檔案**：Supabase（`ALTER TABLE ... ADD COLUMN google_rating NUMERIC(2,1), google_review_count INT`）+ `pages/hospital.vue`。
- **做法**：後台填 Google 星等/評論數 → UI 顯示星等 → schema `aggregateRating`（SERP 星等 rich result）。
- **驗收**：卡片顯示星等；Rich Results Test 通過 aggregateRating。**預估**：1.5h（+ 人工填 78 筆 ~1.5h）。

## #C 公告系統（停診/特診/活動）

- **檔案**：新表 `hospital_announcements (id, hospital_id, type, title, summary, source_label, source_url, valid_from, valid_to, created_at)` + UI。
- **做法**：type enum（closed/special_clinic/event/other）→ 醫院卡右上紅點展開 → 列表頁「最新公告」區。
- **驗收**：可新增/顯示有效期內公告；過期自動隱藏。**預估**：3h。**依賴**：#A 一起 review 結構更佳。

## #D 多源驗證 `source_label` + `source_url`

- **檔案**：Supabase（兩欄）+ UI（醫院詳情「資料來源」）+ schema `citation`。
- **做法**：填來源標籤與連結 → UI 顯示 → schema 加 citation（E-E-A-T）。
- **驗收**：詳情顯示來源；schema 含 citation。**預估**：1.5h。

## #E 擴充清單 78 → 150+（維持精選）

- **檔案**：Supabase Studio（加 `category enum`：exotic_specialty / general_with_exotic）+ `pages/hospital.vue` 篩選。
- **做法**：主清單預設只顯示 exotic_specialty（保留 78 精選）；勾選才顯示綜合醫院；補 70+ 綜合醫院。
- **驗收**：可切換精選/全部；預設仍是 78 精選。**預估**：2h（程式）+ 人工填入。**依賴**：#A（pets）、#D（source）。

---

## 📌 已決定跳過（保留紀錄）

| #   | 項目                  | 原因   |
| --- | --------------------- | ------ |
| 19  | OG image 動態產生     | 暫不需 |
| 24  | Subresource Integrity | 暫不需 |
| 25  | Sentry 錯誤監控       | 暫不需 |
| 37  | 使用者帳號            | 暫不需 |
| 38  | 競標通知              | 暫不需 |
| 39  | 評論評星              | 暫不需 |
| 41  | 多語系（英文）        | 暫不需 |

> 日後想做再討論。

---

## 變更歷史

- **2026-06-22 v1** 初版（34 項、7 階段、估 51h）。
- **2026-06-30 v2** 重訂：依全站 UI/UX 評分（80/100）新增 Phase A–C（#U1–#U6）。
- **2026-07-07** 三頁互動化 + 去 AI 味 + 元件化 + 返回捲動；進場改 logo 遮罩（#U1）、#U2 fallback 改導向 `/home`；手機補下載 App 按鈕。commit `37dc230`→`a7809b4`。
- **2026-07-07** 清單整理：已完成（v1 34 項、#U2–#U6、#U3）與擱置（#U1 剩餘結構、#36 Migration）從本清單移除，只保留未開始任務（#10 #12 #21 #40 #A–#E）。細節見 git 歷史。
