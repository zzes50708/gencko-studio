# Gencko 程式優化路線圖 v2

> **本版基準**：SEO/AEO/GEO 一階段 + 程式優化 v1（34 項）大量完成、且經一次全站 UI/UX 評分（80/100）後重訂。
>
> **使用方式**：開工時對我說「**開始任務 #N**」或「**開始第 X 階段**」即可。我會：讀本檔對應任務 → 確認依賴 → 列出這次要動的檔案與方案 → 等你確認後執行 → 完工後在本檔勾選並補上 commit 註記。
>
> **任務狀態圖例**：`[ ]` 未開始｜`[~]` 進行中/擱置｜`[x]` 完成
>
> **已決定跳過**（不在計畫內）：#19 OG 動態圖、#24 SRI、#25 Sentry、#37 帳號、#38 競標通知、#39 評星、#41 多語系。

---

## 📦 已完成歷史（v1，僅存查；細節見各 commit）

| #   | 任務                                                          | 狀態                                   |
| --- | ------------------------------------------------------------- | -------------------------------------- |
| #1  | GA4 延遲到 idle                                               | ✅                                     |
| #2  | LINE SDK 按鈕才載入                                           | ✅                                     |
| #3  | Cloudflare beacon 延遲                                        | ✅                                     |
| #4  | Inter 字型移除                                                | ✅                                     |
| #5  | Noto Sans TC 5→4 weight                                       | ✅                                     |
| #6  | calculator TresJS 動態 import                                 | ⏭️ 跳過（實測未用 Three.js，前提誤判） |
| #7  | 全站圖片 lazy 審查                                            | ✅                                     |
| #8  | utils/seo-schemas.js helper                                   | ✅                                     |
| #9  | utils/site-constants.js                                       | ✅                                     |
| #11 | UTF-8 亂碼批次修復                                            | ✅                                     |
| #13 | Supabase 型別自動產生（types/supabase.ts + db:types + useDB） | ✅                                     |
| #14 | 內部連結自動產生器（utils/auto-link.js）                      | ✅                                     |
| #15 | Sitemap image:image                                           | ✅                                     |
| #16 | RSS feed（server/routes/feed.xml.ts）                         | ✅                                     |
| #17 | 靜態預渲染 5 頁                                               | ✅                                     |
| #18 | articles.faq → FAQPage                                        | ✅                                     |
| #20 | BreadcrumbList helper                                         | ✅                                     |
| #22 | anon key 移至 env                                             | ✅                                     |
| #23 | CSP header                                                    | ✅                                     |
| #26 | Supabase 重試（utils/supabase-retry.js）                      | ✅                                     |
| #27 | WCAG AA 對比度（--pri-btn / --txt-muted / --ok-\* token）     | ✅                                     |
| #28 | Skip to content                                               | ✅                                     |
| #29 | 客製 404（error.vue）                                         | ✅                                     |
| #30 | PWA Offline（public/offline.html）                            | ✅                                     |
| #31 | 全站 Skeleton                                                 | ✅                                     |
| #32 | 單元測試（tests/calc-utils.spec.js）                          | ✅                                     |
| #33 | E2E（tests/e2e/critical-paths.spec.ts）                       | ✅                                     |
| #34 | Lighthouse CI                                                 | ✅                                     |
| #35 | husky + prettier pre-commit                                   | ✅                                     |

---

## 🗺️ 待辦任務總覽

| 階段  | 主題             | 任務        | 預估 | 來源                          |
| ----- | ---------------- | ----------- | ---- | ----------------------------- |
| **A** | 首頁與資訊架構   | #U1 #U2 #U3 | 11h  | UI/UX 評分                    |
| **B** | 轉換與信任       | #U4         | 3h   | UI/UX 評分                    |
| **C** | 無障礙與效能韌性 | #U5 #U6     | 7h   | UI/UX 評分                    |
| **D** | 架構與型別       | #10 #12     | 8h   | v1 沿用                       |
| **E** | 安全與資料       | #21 #36     | 2.5h | v1 沿用                       |
| **F** | 後台             | #40         | 8h+  | v1 沿用                       |
| **G** | 特寵醫院強化     | #A–#E       | 10h  | v1 沿用，觸發詞「換特寵醫院」 |

> **建議順序**：先 A（首頁/IA 是評分最弱項、影響最廣）→ C（效能/無障礙韌性）→ B（轉換）→ D（架構）→ E → F/G 視需求。

---

# 🅐 Phase A — 首頁與資訊架構（總計 ~11h）

> UI/UX 評分中「資訊架構 7.0」「效能 7.0」「首頁 intro gate 摩擦」是最大成長空間，集中於此處理。

## #U1 首頁 intro gate 轉換重構

- **狀態**：`[~]` 保守微調已完成（2026-06-30）。① 負面文案「不看介紹，直接進入官網」→ 正面「直接進入官網 →」（`pages/index.vue` fallback + `BrandServiceScrollScene.vue` 第一幕 skip）。② 查證：首頁 3D 場景之上**仍顯示全域導覽列（桌機頂部 + 手機底部 TheBottomNav）**，使用者隨時可導向任一區塊 → intro gate 為軟性，原評分對其扣分略高估。**B（首屏並陳 + 解除 scroll-lock）/ C（內容優先）結構改動經使用者決定先不做**（需視覺驗證，待預覽工具恢復再評估）。**2026-07-07 更新**：intro gate 由「黑底品牌卡（Gencko Studio / 品牌服務）」改為「深色底 Gencko logo 淡入遮罩」——遮罩 `z-index:2000` 蓋住跑馬燈/導覽，一進站即在遮罩下載入 3D，待畫布就緒 + 停留 ~1.2s 淡出，遮住 3D 進場卡頓。仍非完整 #U1 重構（未做首屏內容並陳），但去除品牌卡換場的「當機感」。（commit `c965605`）
- **痛點/背景**：`/`（`pages/index.vue` + `BrandServiceScrollScene.vue`）是一段 3D 介紹動畫，首屏主 CTA 是「不看介紹，直接進入官網」。等於把品牌動畫**擋在內容之前**，新訪客需多一個動作才到得了在售個體/知識，增加跳出風險（評分「轉換與信任」「IA」皆因此扣分）。
- **影響面與收益**：降低首屏跳出、縮短「到達在售個體」的路徑、行動版體感更快。直接影響轉換與 SEO 互動指標。
- **牽涉檔案**：`pages/index.vue`、`components/BrandServiceScrollScene.vue`、`app.vue`（curTab/路由判斷）、`utils/site-constants.js`（ROUTES）。
- **詳細做法**：
  1. **保留 3D 動畫但不擋路**：首屏在 3D 場景**之上或之下**同時露出「在售精選」橫向卷軸（沿用 `components/HomeHotPickTiltCard.vue`）與兩個主 CTA（「看在售個體」→ `/shop`、「玩基因計算機」→ `/calculator`）。
  2. 把「直接進入官網」從「跳過動畫」語意，改為「捲動即進入內容」的自然過場（動畫作為 hero，下方直接接內容區塊，不需點擊跳過）。
  3. 首屏新增一句價值主張（取自品牌故事：頂規選色＋全價位＋100% 健康保固）。
  4. 行動版：首屏高度限制在 ~90vh，確保「在售精選」露出一部分（露出下一屏暗示，引導捲動）。
- **驗收標準**：
  - 首屏（不捲動）即可看到 ≥1 個明確 CTA 與「在售精選」入口。
  - 從 `/` 到看見任一在售個體卡片 ≤1 次點擊或 1 次捲動。
  - 3D 動畫仍存在，且 `prefers-reduced-motion` 下有靜態 fallback（與 #U2 協作）。
- **預估**：4h　**依賴**：建議與 #U2 一起做　
- **風險與緩解**：動到首頁是高曝光頁，先用 `git` 分支或先截圖比對；改完跑 `render-verify` 視覺檢查與 Lighthouse。
- **驗證方式**：本機 `npm run dev` 截圖桌機＋手機首屏；確認 CTA 可點、捲動順暢；對比改前改後跳出動線。

## #U2 3D Hero：prefers-reduced-motion 與行動降載 fallback

- **狀態**：`[x]` 完成（2026-06-30）。`pages/index.vue` 新增 `shouldAutoLoadScene()`：`prefers-reduced-motion: reduce` 或低階裝置（`hardwareConcurrency<=4` 或 `deviceMemory<=4`）時**不自動載入 3D**，維持靜態 fallback 並顯示「載入互動動畫」按鈕（使用者可自願載入）；一般手機/桌機維持原自動載入。預覽驗證：高階機自動載入無按鈕；模擬 reduced-motion → canvas 0 + 按鈕出現；點按鈕 → 場景載入。**保守取捨**：只擋 reduced-motion 與真正低階，不動一般行動體驗。（#U6 可在此基礎再壓 bundle/LCP。）**2026-07-07 行為變更**（隨 #U1 進場改版）：reduced-motion／低階裝置**不再顯示「載入互動動畫」按鈕**，改為**直接 `navigateTo('/home')`**（進場無按鈕，這些裝置直接進官網首頁、不載 3D）。`shouldAutoLoadScene()` 判斷邏輯不變。（commit `c965605`）
- **痛點/背景**：首頁 TresJS/WebGL 場景是行動版 LCP 風險與耗電來源；目前未尊重 `prefers-reduced-motion`，低階裝置體感慢（評分「效能 7.0」「無障礙 7.5」主因之一）。
- **影響面與收益**：行動 PageSpeed/LCP 改善、省電、無障礙合規、低階機可用性。
- **牽涉檔案**：`pages/index.vue`、`components/BrandServiceScrollScene.vue`、`components/GeckoScene3D.vue`、`nuxt.config.ts`（必要時調 lazy hydration）。
- **詳細做法**：
  1. CSS/JS 偵測 `window.matchMedia('(prefers-reduced-motion: reduce)')`；為 true 時**不掛載 3D 場景**，改顯示既有靜態 fallback（首頁已有 fallback→scene cross-fade，擴大其作用域）。
  2. 行動裝置或 `navigator.hardwareConcurrency <= 4` / `deviceMemory <= 4` 時，預設走靜態 fallback，提供「載入互動動畫」按鈕讓使用者自願啟用。
  3. 確保 3D 元件以 `defineAsyncComponent` + `IntersectionObserver` 僅在進入視窗時掛載（避免首屏阻塞）。
  4. 卸載時釋放 WebGL context（`renderer.dispose()`、移除 GSAP ticker），避免記憶體洩漏。
- **驗收標準**：
  - DevTools 開啟 reduce-motion 後，首頁**不建立 `<canvas>`**、顯示靜態 fallback、無 JS 動畫。
  - Lighthouse 行動版 LCP 較現況改善（記錄改前/改後分數）。
  - 低階模擬（CPU 4x throttle）首屏可互動時間下降。
- **預估**：4h　**依賴**：無（與 #U1 協作最佳）
- **風險與緩解**：3D 場景與 GSAP/Lenis 耦合，卸載時序易出錯；先在分支做，逐步驗證 cross-fade 不閃爍。
- **驗證方式**：`render-verify` skill 截圖三種情境（一般、reduce-motion、行動）；`preview_console_logs` 確認無 WebGL 錯誤。

## #U3 導航資訊架構收斂

- **狀態**：`[~]` 調查後不重構（2026-06-30）。實查 `TheNavbar.vue`（桌機）與 `TheBottomNav.vue`（手機）發現**導航其實已分成 3 個邏輯群組**：專欄文章（飼養指南/文章/常見問題）、探索選購（選購/競標/種群/周邊）、工具知識（基因圖鑑/計算機/醫院/健康評估/飼養前評估），桌機用下拉、手機用底部 sheet。並非評分假設的「扁平 12 項」——評分 IA 7.0 是以路由數而非實際分組判斷，略高估問題。**結論**：現有 3 群已整齊，強行改 4 群非明顯更優、且會破壞運作良好的導航（下拉/sheet/active 判斷）並需視覺驗證，故**不執行重構**。唯一可再議者為 care(飼養指南)/health(健康評估)/qs(飼養前評估) 的命名/歸類清晰度，屬內容微調、留待使用者決定。
- **痛點/背景**：頂層功能 12+（shop/articles/genes/calculator/care/health/qs/hospital/auction/merch/breeders/compare/faq…）。其中 **care（新手教學）/ health（健康評估）/ qs（飼養前評估）語意接近**，新訪客易混淆；頂層過寬不利導覽（評分「IA 7.0」主因）。
- **影響面與收益**：降低認知負荷、提升可發現性、SEO 內部連結更有層次。
- **牽涉檔案**：`components/TheNavbar.vue`（桌機下拉）、`components/TheBottomNav.vue`（手機底欄）、`utils/seo-schemas.js`（ROUTE_LABELS/breadcrumb）、`utils/site-constants.js`（ROUTES）、`app.vue`（curTab 對應）。
- **詳細做法**：
  1. 重新分群為四類：**選購**（shop / auction / merch）、**知識**（articles / genes / faq）、**工具**（calculator / compare / care / health / qs）、**關於**（about / hospital / breeders）。
  2. 桌機 `TheNavbar.vue` 用 4 個下拉群組；手機 `TheBottomNav.vue` 保留 5 格主要入口（首頁/選購/工具/知識/我的），次要項收進「更多」。
  3. care/health/qs 整併為一個「飼養指南」入口的子頁（或頁內分頁），URL 保留以免 SEO 斷鏈（用 301 或內部錨點）。
  4. 同步更新 `ROUTE_LABELS` 與 breadcrumb middleware，確保新階層 breadcrumb 正確。
- **驗收標準**：
  - 頂層可見入口 ≤6（其餘收納）。
  - care/health/qs 從同一「飼養指南」入口可達，且舊 URL 不 404。
  - 所有頁面 breadcrumb 反映新階層。
- **預估**：3h　**依賴**：#20（breadcrumb helper，已完成）
- **風險與緩解**：改動導航影響全站與 SEO；舊 URL 一律保留並加 canonical/301；改後跑 sitemap 與 `gh` Lighthouse CI。
- **驗證方式**：點擊每個入口確認可達；`curl` 舊 URL 確認非 404；截圖桌機下拉與手機底欄。

---

# 🅑 Phase B — 轉換與信任（總計 ~3h）

## #U4 商品/個體卡狀態與價格強化

- **狀態**：`[x]` 完成（2026-06-30）。查證現況已做：已售/競標/自留隱藏價格並顯示對比合格的 status badge（#27 已驗）、收藏即時回饋已有。本次補上**核心缺口**：已售/自留卡新增「找相似 →」按鈕（`ShopFlipCard.vue`，`@click.stop.prevent` + `router.push('/shop?kw=<Morph>')`，避免巢狀 a），解除死路。預覽驗證 `/shop?sold=true` 6 張已售卡各有按鈕、點擊正確導向同品系在售搜尋、色彩 AA。
- **痛點/背景**：評分「轉換與信任 8.0」指出在售/已售狀態與價格在卡片上不夠醒目；已售個體是死路（無後續引導）。
- **影響面與收益**：提高在售個體點擊率、已售個體導流到相似品系、減少跳出。
- **牽涉檔案**：`components/ShopFlipCard.vue`、`pages/shop/index.vue`、`assets/css/style.css`（status-badge / price）、`pages/product/[id].vue`。
- **詳細做法**：
  1. 狀態 badge：在售（綠/橘高對比）、已售（灰）、競標中（橘脈動）位置統一在卡片右上，字級/對比達 AA（沿用 #27 的 `--ok-fill` / `--pri-btn`）。
  2. 價格：在售顯眼（大字 + 幣別），已售改顯示「已售出」並隱藏價格。
  3. 已售卡片底部加「找相似品系」CTA → 連到 `/shop?morph=<品系>` 或 `/genes/<品系>`。
  4. 卡片加「♥ 收藏」即時回饋（沿用既有 wishlist），收藏數/熱門標示。
- **驗收標準**：
  - 三種狀態在桌機/手機都一眼可辨、對比 ≥4.5:1。
  - 已售卡片有可點的「找相似」出口。
  - 價格僅在售個體顯示。
- **預估**：3h　**依賴**：#27（色彩 token，已完成）
- **風險與緩解**：卡片是列表高頻元件，改 CSS 注意 `ShopFlipCard` 翻面動畫不破版；改後跑 `render-verify`。
- **驗證方式**：`/shop` 截圖含在售/已售/競標三態；點「找相似」確認導向正確。

---

# 🅒 Phase C — 無障礙與效能韌性（總計 ~7h）

## #U5 無障礙補完（alt / label / 鍵盤）

- **狀態**：`[x]` 完成（2026-06-30）。以渲染後 DOM 稽核（非 grep，避免多行標籤誤報）：① 圖片 alt 全站已具備（shop/hospital/首頁掃描 0 缺）。② 補 9 個表單控制項 aria-label：shop 搜尋框/排序/最低價/最高價、articles 搜尋、hospital 區域縣市/行政區 select、auction 暱稱/出價金額。③ 首頁 3D `.bg-layer`（TresCanvas）加 `aria-hidden="true"`，純裝飾對 AT 隱藏。掃描驗證 shop/hospital 表單缺名稱＝0、icon 按鈕缺名稱＝0。**未解（非 WCAG 硬失敗，另記）**：首頁 fallback h1 與場景 h1 並存（疑 hydration，屬 SEO 最佳實踐、不擋 a11y 分數）。
- **痛點/背景**：#27 已修對比、#28 已加 skip-link，但仍有缺口：圖片 alt 覆蓋率未稽核、表單 label 關聯未確認、3D 場景鍵盤可略過性未處理（評分「無障礙 7.5」）。
- **影響面與收益**：無障礙合規、SEO 圖片搜尋、Lighthouse a11y 衝 100。
- **牽涉檔案**：全站 `<img>`/`<NuxtImg>`、各 `<select>`/`<input>`（`pages/hospital.vue`、`pages/calculator.vue`、shop 篩選）、`pages/index.vue`（3D 區）、`app.vue`。
- **詳細做法**：
  1. **alt 稽核**：grep 全站 `<img`/`<NuxtImg`，補上語意 alt（個體圖用「品系名 + 編號」，裝飾圖用 `alt=""`）。
  2. **表單 label**：每個 `<select>`/`<input>` 加關聯 `<label for>` 或 `aria-label`（醫院篩選、計算機選擇器、shop 篩選）。
  3. **3D 區可略過**：3D 場景容器加 `aria-hidden="true"` 或 `role="img" + aria-label`，並確保 skip-link 能跳過它直達主內容。
  4. 跑 axe-core / Lighthouse a11y 補齊其餘自動偵測項。
- **驗收標準**：Lighthouse 無障礙 = 100；axe-core 0 critical；所有互動圖片有 alt、所有表單控制項有可及名稱。
- **預估**：3h　**依賴**：#27 #28（已完成）
- **風險與緩解**：低風險（多為屬性新增）；注意別把有意義圖片誤標 `alt=""`。
- **驗證方式**：本機注入 axe-core 掃描各頁；Lighthouse a11y 報告存證。

## #U6 3D/首屏效能進階（LCP 與 bundle）

- **狀態**：`[x]` 完成（2026-06-30）。bundle 分析：① Three.js（867KB chunk）已 code-split、且確認**不在首頁初始載入**（defineAsyncComponent + #U2 gating，場景載入時才拉）→ 不阻擋 LCP。② 3D 場景為**程序化粒子（THREE.BufferGeometry）、無外部模型/貼圖** → 無壓縮空間。③ **主要新增優化**：`app.vue` 的 gsap/Lenis（原每頁初始 ~528KB）改為**動態 import**，移出每頁關鍵路徑、mount 後才載入（平滑捲動漸進增強）。驗證：build 通過、/shop 仍有 `html.lenis`（Lenis 正常初始化）、無 console 錯誤。**待補**：正式站 Lighthouse 行動分數改前/改後量測（需部署後）。
- **痛點/背景**：評分「效能 7.0」。即使做了 #U2 降載，首屏 3D 與相關 bundle 仍可再瘦身。
- **影響面與收益**：行動 LCP/TBT 再降、bundle 更小。
- **牽涉檔案**：`nuxt.config.ts`、`pages/index.vue`、`components/GeckoScene3D.vue`、TresJS 相關 import。
- **詳細做法**：
  1. 確認 TresJS/Three.js 只在首頁載入、且 code-split（檢查 `.output` bundle 分析）。
  2. 3D 模型/材質壓縮（draco / ktx2 如有用到）。
  3. 首屏關鍵 CSS inline、非關鍵 CSS 延後。
  4. 量測改前/改後 Lighthouse 行動分數並記錄。
- **驗收標準**：行動 PageSpeed 較 #U2 後再提升（記錄分數）；首頁 JS 初始載入量下降（記錄 KB）。
- **預估**：4h　**依賴**：#U2
- **風險與緩解**：3D 壓縮可能影響視覺，逐步比對；保留 fallback。
- **驗證方式**：`npm run build` 後看 bundle 大小；Lighthouse 行動報告。

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

# 🅔 Phase E — 安全與資料（總計 ~2.5h）

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

## #36 Migration baseline（擱置中）

- **狀態**：`[~]` 骨架已建（`supabase/config.toml`、`migrations/`、`db:*` scripts、README）。`db:pull` 需 Docker 跑 shadow DB，一人專案先擱置。
- **何時做**：要本機 dev DB 或多人協作時。屆時裝 Docker Desktop → `supabase db pull` 抓 baseline → 後續 schema 變更走 migration。
- **預估**：1h（裝 Docker 後）　**依賴**：Docker Desktop

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

## 📌 已決定跳過

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
- **2026-06-30 v2** 重訂：v1 完成項收進「已完成歷史」；依全站 UI/UX 評分（80/100）新增 Phase A–C（#U1–#U6）；保留 #10/#12/#21/#36/#40 與 Phase 8（#A–#E）並改寫為極度詳細格式。
- **2026-07-07** 三頁（新手入門／購買流程／信任保證）互動化 + 去 AI 味 + 元件化（`PageHero`/`NextCta`/`Timeline`）+ 全站返回捲動還原（`app/router.options.ts`）；進場改為 logo 淡入遮罩（更新 #U1）、#U2 fallback 改導向 `/home`；手機版補下載 App 按鈕。commit `37dc230`→`c965605`。
