# UI Redesign Progress

## 最新修復：手機進站動畫及 /care 手勢（2026-09-10）

- 使用者暫停非文字收尾，指出根網址手機動畫消失；確認原因為上一輪加入裝置限制與零高度捲動區。已恢復 `/`、共用 `/hero-lab` 的手機核心動畫及 1100svh 原生捲動長度，保留 DPR 1 與原有 Bloom 設定。
- 使用者追加 `/care` 手機可滑動模型，兩頁改好直接部署。已開放手機 WebGL、单指旋轉、雙指縮放；DPR 1、按需渲染、離屏卸載、WebGL 失敗示意圖保留。操作提示明確區分模型內手勢與區塊外捲頁。
- 驗證：Typecheck、99/99 單元測試；手機根網址原生觸控推進及返回首頁通過。環境模型桌機休眠／卸載、320／390／768px 原生觸控旋轉／缩放／外部捲動、失敗替代通過；768px 外部捲動首輪起點已在頁底，校正起點後個別重測通過。證據位於 `output/hero-mobile-restored/`。
- 既有官網收尾仍保留：已發現 `/profile` 已登入進頁立即 watcher 可能在 fetchMyBids 初始化前呼叫（尚未修改），待動畫修復發布後再接續。未觸碰正式出價資料，未將模擬登入宣稱為真實登入驗收。
- 訂製爬櫃經使用者再次確認維持另案；純文字暫停。下一個精確動作：部署本次手機動畫與 care 手勢修復，確認正式站手機兩頁後回報。

## 部署授權與待辦：2026-09-10

- 使用者已明確要求「部署」，並追加「繼續部署並說明尚未完成的任務」；本次允許為部署提交並推送目前官網程式與必要資產至 main。先前禁止部署的限制對本次發布解除，仍不還原或清理既有工作樹。
- 部署前 Typecheck 與 99/99 單元測試通過。已提交並推送 `802a4a308ae4acd3d6ad389f15ae58e59a5608c6`；GitHub Production deployment `6372532247` 與 Vercel `BMiiy174Pfe7v8GENG74fLbAKL8e` 回報 success。正式站為 https://www.genckobreeding.com 。本機原始附件、日誌與驗證截圖未加入發布提交。
- 正式 /care 於 1440px 桌機及 390px 觸控檢查通過：HTTP 200、桌機 Canvas／俯視／設備選取、手機無 Canvas／示意圖／設備選取、無水平溢位及 pageerror。首輪因 hydration 前捲動位置變化而未見 Canvas；等待掛載並重新捲至模型後重測通過。證據：`output/habitat-20260910/production-desktop.png`、`production-mobile.png`。資料庫 migration 未在本次部署中執行；未登入驗收出價流程。
- 尚未完成：使用者純文字逐頁修訂（暫停至其自行開啟）；12–29 批次 UI 與環境模型的使用者視覺驗收；訂製爬櫃獨立頁待廠商定案後另案；真實會員及外部登入／電話／列印、實體手機動畫手感驗收。
- 下一個精確動作：等待使用者檢視正式網站與環境模型；只有使用者明確開啟純文字任務後，才逐頁列出可修改文案。部署後結果更新保留於本機 checkpoint，不為文件紀錄再次觸發部署。

## 最新任務：/care 環境照片轉互動 3D 模型

- 使用者要求將環境照片製作成可互動 3D 模型；純文字任務留待其下次自行開啟，不自動續作。
- 2026-09-10 已依使用者提供的 `1-Photo-1.jpg` 設備示意圖完成 TresJS 互動模型，置於 /care 環境章末。來源：`.codex-remote-attachments/01a079d0-39db-73a1-b100-bea9654168d7/3655f1c0-d1dd-4726-9c45-f994893b6e10/1-Photo-1.jpg`。
- 依相對位置重建透明飼養箱、開孔頂蓋、底材、水盆、鈣粉食盆、躲避屋、外置加熱墊、探針與溫度計；這是單張示意圖的手工建模，沒有實測尺寸，沒有重製原圖角色與其他工作室識別。32.0°C 為示意讀值。
- 桌機提供拖曳旋轉、按鈕縮放、立體／正面／俯視、頂蓋切換、直接點選設備、設備清單與鍵盤操作。採按需渲染、DPR 上限 1.5、離屏卸載及 GPU 資源清理；滾輪保留頁面捲動。
- 低於 768px、觸控／無 hover 裝置及 WebGL 失敗時使用同一模型輸出的輕量 WebP，搭配設備選取與說明，不載入 3D 畫布。海報只含模型，不嵌入假的操作按鈕。
- 主要檔案：`components/care/HabitatExplorer.vue`、`HabitatViewport.client.vue`、`HabitatScene.vue`、`utils/habitat-model.ts`、`utils/habitat-parts.ts`、`public/images/care/habitat-overview.webp`；`pages/care.vue` 僅替換原環境圖插槽。
- 驗證：Typecheck、99/99 單元測試通過；`tests/e2e/habitat.spec.ts` 5 項通過，涵蓋桌機拖曳／閒置停止／離屏重入、320／390／768px 觸控降級及 WebGL 失敗。`scripts/verify-habitat.mjs` 直接點選、視角、頂蓋與鍵盤操作通過，無 pageerror。證據位於 `output/habitat-20260910/`。未以實體手機驗收，未另跑 production build（保留既有開發服務）。
- 下一個精確動作：等待使用者檢視 /care 互動環境模型，依回饋調整模型或操作；不得自動開啟純文字修訂。沿用 localhost:3000，驗證程序已結束；未部署、commit、push 或還原工作樹。

## 最新進度：2026-09-10 UI 工程收尾，進入純文字修訂

- 最新授權：「繼續，直到剩下純文字需要修正」。本輪已完成可確認的共用 UI 缺口，不再以逐頁等待 UI 修改指示為停止點；使用者的視覺驗收仍獨立保留。
- 全域 btn-app 預設改為微圓角、黑體、不換行，移除主要按鈕掃光／浮動／發光及次要按鈕厚陰影；浮動收藏詢問鈕同步統一，與 Shop 比較列同時顯示時移至導覽列下方，避免互相遮擋。
- 取消 app main 的 80vh 最小高度，縮減短頁底部空白與 Footer 版權區前距離；移除頁面轉場模糊及縮放。
- iOS 安裝說明改為緊湊、無裝飾卡片的原生 dialog；Lightbox 也使用原生 dialog。共用 useNativeModal 管理背景捲動鎖定與觸發焦點還原，保留 Escape、背景點擊及原有操作。
- Navbar 僅在桌機 fine pointer 綁定滑鼠開關事件；hover／鍵盤／點擊共用同一展開狀態，aria-expanded 與實際選單同步。頂欄控制高度補足 44px，手機導覽抽屜移除厚陰影。
- 共用錯誤畫面統一按鈕、邊界與留白；正式環境不呈現除錯堆疊，開發環境仍保留診斷資訊。
- 驗證：99/99 單元測試、Typecheck、本批 git diff --check 通過。26 個路由 × 4 寬度共 104 組回歸，103 組直接通過；768px /merch 發生一次 ERR_ABORTED，單獨重測通過。成功畫面均無 document overflow 或 pageerror。
- 彈窗／404／離線頁 9 組檢查通過；iOS 安裝、Navbar、Bottom Sheet、收藏詢問與比較列、About 桌機與手機降級、Hero Lab 手機降級檢查通過。原生彈窗關閉後的焦點及背景捲動已實測；測試排除本機 Nuxt DevTools 浮層。
- 證據：output/ui-final-20260910/layout.json、output/shared-ui-20260910/results.json；導覽及最終補驗結果保留在 output/ui-final-20260910-*。最後補驗採個別重測，未宣稱全套一次零失敗。
- 尚需外部條件：/care 環境圖由使用者提供；訂製爬櫃待另案。真實會員帳號、實體手機動畫手感、外部登入／電話／列印仍未實測；未部署。
- 下一個精確動作：進入純文字修訂，預設從 /care 開始，依使用者要求一次提供一頁完整可改文案，再依其文字表修改；不要一次輸出全站文案。若使用者提出新 UI 問題，針對該問題修正，不擅自標記使用者已驗收。

## 最新進度：2026-09-10 共用狀態 UI 收尾

- 使用者指示繼續，接續尚未收尾的共用介面視覺統整；不代表先前頁面已由使用者驗收。
- TheBackButton 統一描邊、微圓角、44px 最小高度與黑體；保留已驗收頁面的局部設定。影響引用返回鍵的競標、健康、FAQ、基因詳情、證書、個體與周邊詳情頁。
- TheToast 移除膠囊與厚陰影，保留高對比與安全區定位；TheLightbox 移除模糊、旋轉發光關閉鍵、浮動提示與圖片圓角，統一標題與購買按鈕。消費頁包含競標、個體的複製提示，以及競標／周邊燈箱。
- error.vue 縮減留白、移除大型軍事字型與發光數字；offline.html 改為緊湊排版、宋體標題、微圓角操作與純文字連線狀態，離線不新增網路字型依賴。
- 保留文案、連結目的地、返回邏輯、剪貼簿、燈箱開關與 PWA 重試流程；不改 SEO、登入或資料來源。
- Typecheck 與本批 git diff --check 通過。1440、390、320px 共 9 組畫面檢查無水平溢位或 pageerror，燈箱兩種關閉方式、連線狀態切換與返回鍵操作高度通過。瀏覽器證據位於 output/shared-ui-20260910；驗證腳本 scripts/verify-shared-ui-20260910.mjs。Toast 本批僅樣式檢查，未實際覆寫使用者剪貼簿。
- 下一個精確動作：等待使用者檢視本批與前批 UI，按指定頁面修正文案及視覺；/care 環境圖等待提供，訂製爬櫃仍另案。保持未部署、未 commit／push、未清理或還原 working tree。

## 最新進度：2026-09-09 剩餘頁面 UI 統整

- 使用者已授權直接完成剩餘頁面 UI，不再逐頁暫停等修改指示；實作完成仍不等於使用者驗收。
- 完成本批 /care 收尾、/health、/qs、/faq、文章列表與詳情、基因列表與詳情、/calculator、/hospital、/why-gencko、/buying-guide、/stories、/profile、電子身分證的排版與操作層級統整。
- /about 與共用 HeroLabPage（/、/hero-lab）統一中文字型與操作形式，保留既有 3D、時間軸與裝置降級。
- 純文字內容移除卡片底色、圓角、陰影與大幅留白；表單、選項、狀態、證書保留有實際用途的邊界。宋體負責標題，黑體負責正文、操作與數值。品牌與購買頁移除重複 NextCta。
- /care 保留前一輪可辨識的操作入口與無卡片繁殖列表，將被誤放大的環境圖佔位縮回緊湊插槽，等待使用者提供完整環境圖。
- 15 個內容／工具／詳情路由 × 1440、768、390、320px，共 60 組本機 hydration 檢查，均無整頁水平溢位或 pageerror。使用有效 ART-007、黑夜、S-53518 詳情資料。
- 既有單元測試 99/99 通過；Typecheck 通過。既有 E2E 首輪 14 通過、2 裝置不適用跳過、5 失敗；已修正過時的區塊名稱與 SSR 未掛載互動前的測試競速，失敗 5 項重跑全部通過。
- 使用者追加「風格統一、不過度留白、簡潔乾淨、高質感、頂級品牌感」，已寫入設計規格 10.1；以字型層級、對齊、圖片比例與節制的品牌色作為後續修訂標準。
- /about 桌機 Canvas、手機 fallback、reduced-motion，以及 /hero-lab 手機無 Canvas／長距離空白驗證通過。問卷完成與結果、會員訪客分頁另以本機瀏覽器實測。
- 最後補驗：1440、390、320px 的健康問卷結果、飼養前問卷結果、會員訪客分頁與五個重點頁面，共 24 組全部通過，無整頁水平溢位或 pageerror。截圖已等待進場動畫結束。健康結果標題改為深色，保留狀態識別線。
- 證據：output/ui-continuation-20260909/layout.json、output/ui-continuation-actions-20260909/results-all.json 與對應截圖；先前 results.json 與測試輸出保留，未清理任何 working tree 檔案。
- 限制：未登入真實會員帳號、未啟動外部登入／電話／列印面板，未以實體手機驗收動畫手感。未部署、commit、push 或還原既有變更。
- 下一步：等待使用者整體檢視與指定文案／UI 修正；訂製爬櫃獨立頁仍為後續另案。

## 任務來源

- 規格檔：`D:\Users\User\Desktop\gencko-vercel\docs\gencko-fullsite-ui-ux-redesign-brief.md`
- 競品報告：`D:\Users\User\Desktop\gencko-vercel\docs\competitive-benchmark-report-2026-08-28.md`
- 本次續作時間：2026-08-28（Issue #5 blocker 解除後續作）

## 起始工作樹基準

- Branch：`main`
- HEAD：`ea5e0d33006fbed2f237e106eb8f7515fefff585`
- 起始 `git status --short --branch`：
  - `M .gitignore`
  - `M .tmp-dev.log`
  - `M app.vue`
  - `M pages/home.vue`
  - `M tests/calc-utils.spec.js`
  - `?? components/home/`
  - `?? docs/`
  - `?? hero-card-shop.png`
  - `?? utils/route-tab.ts`
- 起始基準暫存證據：
  - 目錄：`C:\Users\User\AppData\Local\Temp\gencko-ui-redesign-20260828-180252`
  - 內容：`git-status.txt`、`git-diff.patch`、`git-untracked.txt`、dirty/untracked 檔案副本、`sha256.txt`
- 注意：
  - `docs/` 在開始前就是 untracked，本任務新增的進度檔也位於此目錄。
  - 起始時尚未改動任何既有 UI 檔；Issue #5 解除後新增一項獨立 B1 手機效能修正，未碰觸原有 dirty 檔。

## Skills / 規則載入

- 已讀：
  - `AGENTS.md`
  - `C:\Users\User\.agents\skills\ui-skills-root\SKILL.md`
  - `C:\Users\User\.agents\skills\ui-ux-pro-max\SKILL.md`
  - `C:\Users\User\.agents\skills\baseline-ui\SKILL.md`
  - `C:\Users\User\.codex\plugins\cache\openai-bundled\chrome\26.818.41509\skills\control-chrome\SKILL.md`
  - `C:\Users\User\.agents\skills\verification-before-completion\SKILL.md`
- `ui-skills-root` 本次 Phase 0 選用：
  - `jakubkrehel/better-layout`：IA、閱讀順序、漸進揭露與跨尺寸結構。
  - `antfu/nuxt`：Nuxt file-based routing、SSR、auto-import 邊界。
  - `ibelick/fixing-metadata`：canonical、OG、robots、JSON-LD 一致性。
- 已讀專案基礎檔：
  - `package.json`
  - `nuxt.config.ts`
  - `app.vue`
  - `assets/css/style.css`
  - `components/TheNavbar.vue`
  - `components/TheFooter.vue`
  - `components/TheBottomNav.vue`
  - `components/PageHero.vue`
  - `components/NextCta.vue`
  - `components/SkeletonCard.vue`
  - `docs/competitive-benchmark-report-2026-08-28.md`
  - `docs/gencko-fullsite-ui-ux-redesign-brief.md`

## Phase 狀態

- 當前 Phase：`Boutique overhaul v0 review`
- 狀態：`原 Phase 0–6 功能與 IA 保留；極簡精品官網 v0 已依使用者補充規格調整。頂部公告跑馬已移除，熱門精選保留單列簡潔跑馬，主色維持白底橘色且 GENCKO 品牌文字恢復原品牌橘。等待使用者提供熱門精選細節或確認擴散至其餘頁面；部署持續排除。`
- Issue #5 blocker：`已解除`
- 完整讀取方式：Codex for Chrome 直接開啟 `https://github.com/zzes50708/gencko-studio/issues/5`。
- 讀取證據：頁面標題為 `[Design Rule] 建立 Inspira UI 組件使用規範與 AI 提示準則 · Issue #5 · zzes50708/gencko-studio · GitHub`；已讀到 Description、Activity 與 Metadata。
- 已確認規則：42 項概念 UI 元件清單、資源庫優先序、Inspira URL 規則、15 組中英元件名、三步驟查詢協議、降級順序、Nuxt 3 auto-import 說明。
- Checkout 落差：`package.json` 與 `nuxt.config.ts` 目前沒有 Inspira UI package/module。Issue 的「免 import」規則只在 module 已設定時成立；不得假設本 checkout 已具備，也不得未經 C 級核准安裝新套件。

## Route / Component Inventory

- 完成度：`已涵蓋 brief 指定的全域殼層與所有公開 / 動態路由`

| 層級 / 路由                | 主要 owner、資料與互動                                                                                                                                                   | 特殊風險、SEO 與導覽現況                                                             | Phase 建議與授權                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 全域殼層                   | `app.vue` + Navbar/Footer/BottomNav/Marquee/Lightbox/Toast；Pinia 載入 animals、merchandise、articles、genetic_pages、config、auctions；全域 Lenis、PWA、登入、收藏/歷史 | `/`、`/about`、`/hero-lab` 排除 Lenis；導覽與 Footer 改動是 B2；`app.vue` 原本 dirty | A：tokens/focus/safe-area；B2：導覽；C：auth/資料流                    |
| `/`                        | `pages/index.vue` → `HeroLabPage` → `HeroDnaGecko` / TresJS / Canvas / timeline                                                                                          | Hero Lab 正式根路由；目前無 canonical；Logo 指向 `/`                                 | 保留；B2 補 self canonical；任何場景大改為 C                           |
| `/hero-lab`                | 與 `/` 共用 wrapper，關閉 transition                                                                                                                                     | 現有 `noindex,nofollow`；重複入口                                                    | 保留 wrapper；B2 改 canonical 指向 `/` 並評估 `noindex,follow`；場景 C |
| `/home`                    | `pages/home.vue`；`hotList`、`articlesList`、`auctionList`；首頁卡列與 CTA                                                                                               | 一般首頁，canonical 已是 `/home`；檔案原本 dirty                                     | A/B1 重排與導流；不可覆寫既有 hunks；加入 sitemap 為 B2                |
| `/shop`                    | Supabase SSR animals 只供 schema；UI 由 hydration 後 `store.inv`；`ShopFlipCard`、搜尋、物種/狀態/價格/基因/排序、收藏、比較、手機 Drawer                                | canonical/schema 完整；正式站商品已驗證存在                                          | A/B1 掃讀/篩選 UX；SSR/hydration/商業規則 C                            |
| `/breeders`                | SSR SelfKeep schema + `store.inv` UI；物種 tabs、`ShopFlipCard`                                                                                                          | canonical/CollectionPage；探索選購入口                                               | A/B1 檔案館視覺；資料/血統欄位 C                                       |
| `/auction`、`/auction/:id` | Supabase auctions / bids / blacklist；列表、倒數、即時更新、出價、分享、圖卡 Canvas                                                                                      | canonical/schema；動態頁有條件 robots；交易規則高風險                                | A/B1 視覺；出價/狀態/寫入 C                                            |
| `/product/:id`             | SSR animals + site_settings；個體資料、相關商品、收藏歷史、LINE CTA、分享、圖卡 Canvas                                                                                   | Product/Offer/return/shipping schema 與既有保證文案；canonical                       | A/B1 資訊層級；任何保證/退款/運送語意與商業規則 C                      |
| `/compare`                 | Pinia `store.inv` + query `ids` + localStorage；並排表、分享/購買導流                                                                                                    | static canonical `/compare`，目前在 sitemap；屬使用者狀態頁                          | A/B1 表格 UX；B2 建議 `noindex,follow` 並移出 sitemap                  |
| `/merch`、`/merch/:id`     | Supabase merchandise SSR / Pinia；列表與外部購買連結                                                                                                                     | canonical/schema；探索選購入口                                                       | A/B1 卡片/詳情；交易與外部連結規則 C                                   |
| `/identity/:id`            | SSR animals；電子身分證、列印/PDF                                                                                                                                        | robots 全域 disallow、未進 sitemap、目前沒有 canonical                               | 保留動態深連結；A 視覺；B2 補明確 noindex/canonical 策略               |
| `/calculator`              | 本地 genetics configs / calc utils + Pinia；物種、親代、Het、反向匹配、modal、結果                                                                                       | canonical + WebPage/Breadcrumb；預渲染                                               | A/B1 介面；演算法/機率 C                                               |
| `/genes`、`/genes/:id`     | 列表用 `store.genePages` + `genes-db`；詳情 SSR genetic_pages                                                                                                            | canonical、DefinedTerm/Article/schema；文章會 auto-link 到基因頁                     | `/genes` 保留工具 Hub；A/B1 視覺；基因事實 C                           |
| `/hospital`                | SSR Supabase hospitals，fallback 本地資料；區域/搜尋/收藏、展開、電話、Google Maps 外連                                                                                  | canonical/schema；沒有地圖元件                                                       | A/B1 split-list；真正地圖/定位/API C                                   |
| `/health`                  | 本地 `utils/health` + UI state；多步評估、結果/就醫 CTA                                                                                                                  | canonical/schema；現列工具知識                                                       | 保留專頁，改歸新手與知識需 B2；醫療判斷 C                              |
| `/qs`                      | 本地 `utils/quiz`；問卷、localStorage、結果圖卡 Canvas                                                                                                                   | canonical/schema；預渲染；現列工具知識                                               | 保留專頁，改歸新手與知識需 B2；判斷規則 C                              |
| `/articles`                | SSR articles + `store.articlesList`；搜尋、分類、列表                                                                                                                    | canonical/CollectionPage/schema；現為「專欄文章」主入口                              | 保留內容庫；A/B1 閱讀與篩選；分組名稱 B2                               |
| `/articles/:id`            | SSR articles + genetic_pages；`v-html`、基因 auto-link、作者卡、相關文章                                                                                                 | canonical、BlogPosting/FAQ/Breadcrumb；Navbar 閱讀進度                               | A/B1 閱讀版型與可及性；文章資料/來源不改                               |
| `/guide`                   | 本地守宮介紹、物種比較、四步、FAQ；`PageHero`/`NextCta`                                                                                                                  | canonical + WebPage/HowTo/FAQ/Breadcrumb；與 start/care 有部分入門重疊               | 保留 SEO 專頁；由 `/start-here` Hub 導流；內容合併屬 B2                |
| `/care`                    | `utils/care` + SSR FAQ article summaries + `store.articlesList`；長文 anchor、scroll progress、tabs/tables/FAQ                                                           | canonical + WebPage/Article/HowTo/FAQ；內容最完整                                    | 保留權威長頁；A/B1 閱讀節奏；健康/繁殖事實 C                           |
| `/faq`                     | `utils/faq`；分類 tabs、accordion、`v-html`                                                                                                                              | canonical + FAQ/Breadcrumb；現導覽入口                                               | 保留；A/B1 accordion；若併內容仍保留 URL                               |
| `/start-here`              | 本地三步路徑與 prep；`PageHero`/`NextCta`                                                                                                                                | canonical；現被放在「專欄文章」dropdown                                              | B2 升格「新手與知識」Hub，路由不變                                     |
| `/buying-guide`            | 本地購買時間線/checkpoints；`Timeline`/`NextCta`                                                                                                                         | canonical；與商品條款、FAQ、why-gencko 有重疊                                        | 保留流程專頁；由 trust Hub 導流；商業語意改動 C                        |
| `/why-gencko`              | 本地信任四項與真實頁面預覽；`PageHero`/`NextCta`                                                                                                                         | canonical；現置於探索選購                                                            | B2 升格「品牌與購買」Hub，路由不變                                     |
| `/about`                   | `BrandServiceScrollScene` + TresJS；深色全螢幕、scroll lock                                                                                                              | canonical + AboutPage/Organization；未在現行主導覽                                   | 保留特殊場景；B2 加品牌入口；3D/scroll C                               |
| `/stories`                 | 本地 placeholder，只有未來案例規劃與導流                                                                                                                                 | canonical；沒有真實案例資料，未在主選單                                              | 保留 URL；B2 建議暫時 noindex 且不升主導覽，待有實證內容再啟用         |
| `/profile`                 | Pinia/localStorage wishlist/history/hospital + Supabase bids/auth；四 tabs                                                                                               | sitemap 排除、robots disallow；未設 canonical/noindex meta                           | 保留會員入口；B2 明確 noindex；auth/競標 C                             |

### 共用元件與 Issue #5 對照

- 全域 42 項概念元件已有 source owner：背景/容器/scrollbar/loader/toast/skeleton/back、Navbar/Dropdown/Theme/PWA/reading progress/BottomNav/Footer、首頁 Hero/Scenario/HotPicks、各式 card/filter/search/tabs/tags/controls、Lightbox/Buy Bar/Article Reader/FAQ/Care tables、PWA/iOS/error overlay。
- 高重用 owner：`PageHero.vue`、`NextCta.vue`、`SkeletonCard.vue`、`ShopFlipCard.vue`、`TheBackButton.vue`、`Timeline.vue`。
- 高風險特效 owner：`HeroLabPage.vue`、`HeroDnaGecko.vue`、`DnaGeckoParticles.vue`、`BrandServiceScrollScene.vue`、`GeckoScene3D.vue`；只盤點，不在 B2 前後方案中改場景核心。
- B1 手機效能發現：`BackgroundInteractiveGrid.vue` 雖用 CSS 隱藏觸控版，仍全域註冊 `mousemove`；本次已改為精確游標才註冊並在能力變更/卸載時清理。

## B2 提案狀態

- 狀態：`使用者已於 2026-08-31 核准 B2 整體提案；導覽、Hub、舊 URL 相容與 SEO 已完成實作及瀏覽器驗證`

### Before IA / 導覽

- Desktop Logo：`/`（Hero Lab）。
- Desktop 直接入口：`首頁 /home`、`會員 /profile`、PWA、theme。
- `專欄文章`：`/guide`、`/start-here`、`/care`、`/articles`、`/faq`。
- `探索選購`：`/shop`、`/buying-guide`、`/why-gencko`、`/auction`、`/breeders`、`/merch`。
- `工具知識`：`/genes`、`/calculator`、`/hospital`、`/health`、`/qs`。
- Mobile BottomNav：三個 Bottom Sheet，分組同上；Home/Member 留在頂欄。
- Footer：只有品牌名稱與版權，沒有 IA、客服、社群或跨頁導流。

### After IA / 已實作導覽

| 群組       | 預設入口      | 內容                                                  | 理由                                                                             |
| ---------- | ------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| 首頁       | `/home`       | 直接入口                                              | 與 Hero Lab `/` 分工清楚，回到商業首頁不需先猜 Logo 語意                         |
| 探索選購   | `/shop`       | Shop、Auction、Breeders、Merch                        | 都是瀏覽個體/商品的交易前探索；Compare 與 detail routes 維持情境入口，不塞主選單 |
| 新手與知識 | `/start-here` | Start Here、Guide、Care、Health、QS、FAQ、Articles    | 以「先了解 → 評估 → 照護 → 深讀」取代現行混合的專欄/工具分類                     |
| 基因與工具 | `/genes`      | Genes、Calculator、Hospital                           | 保留 Gencko 差異化能力；Hospital 是實用工具，不與健康判讀規則混為一頁            |
| 品牌與購買 | `/why-gencko` | Why Gencko、Buying Guide、About；Stories 暫不升主選單 | 將現有信任、流程與品牌證據放在同一決策路徑；不把 placeholder 當真實案例宣傳      |
| 會員       | `/profile`    | 直接入口                                              | 收藏、瀏覽、醫院、競標屬個人狀態                                                 |

- Desktop：Logo 仍進 `/`；保留 Home、四個語意群組、Member 與 utility controls。Dropdown 必須支援 click/focus/keyboard，不可只靠 hover。
- Mobile：BottomNav 改四項 `首頁`、`探索`、`新手`、`工具`。探索 sheet 內分「選購」與「買前必讀」；品牌/About 放 Footer 與 Hub 內；Member 保留頂欄。
- Footer：四欄 `探索選購`、`新手與知識`、`基因與工具`、`品牌與服務`，只使用既有 route 與已驗證 LINE/Instagram/Facebook；不新增不存在的 `/terms` 或 `/contact`。

### Hub / 合併提案

- `/start-here`：升格為「新手與知識 Hub」，聚合 `/guide`、`/care`、`/health`、`/qs`、`/faq`、`/articles`；各專頁保留獨立內容與 URL，不先 redirect。
- `/why-gencko`：升格為「品牌與購買 Hub」，聚合 `/buying-guide`、`/about`、現有商品條款摘要與客服入口；不改寫商業承諾。
- `/genes`：保留「基因與工具」入口，強化 `/calculator` 與 `/genes/:id` 導流；不合併演算法或基因資料。
- `/shop`：維持探索選購預設入口；`/compare`、`/product/:id`、`/identity/:id` 為情境路由，不列第一層導覽。
- 本輪不刪除、不實體合併任何公開頁；真正合併只列未來選項，需另一次 B2 決策。

### 舊 URL 相容策略

- `/` 永遠保留 Hero Lab；`/home` 永遠保留一般首頁；不得互相 redirect。
- `/hero-lab` 保留共用 wrapper，不造成 404；canonical 建議指向 `/`。
- 所有現有 static 與 dynamic route 保留；`/shop?beginner=true`、`/compare?ids=...` query contract 不變。
- 首階段只改導覽分組與 Hub 內容，不新增 `/learn`、`/tools` 等重複實體路由，因此不需要 redirect。
- 未來若核准實體合併，先建立永久 redirect 或 wrapper，再改 sitemap/canonical；不得先刪 page 檔。

### SEO / canonical / JSON-LD 影響提案

- `/home` 加入 sitemap 並設主要商業首頁優先級；`/` 保留 Hero Lab self canonical；`/hero-lab` canonical 至 `/` 且不進 sitemap。
- 內容頁 Breadcrumb 的「首頁」從 `/` 改指 `/home`；Organization/WebSite 的品牌根 URL 可維持 domain root。
- sitemap 補入目前遺漏的 `/home`、`/start-here`、`/buying-guide`、`/why-gencko`；`/stories` 在有真實案例前 noindex 並不進 sitemap。
- `/compare` 建議 `noindex,follow` 並移出 sitemap；query variants 繼續 canonical 至 `/compare`。
- `/profile`、`/identity/:id` 維持非索引定位，補明確 page-level robots；是否保留 robots.txt disallow 需在實作時一起檢查，避免 crawler 看不到 noindex。
- 每頁 title、description、canonical、`og:url` 必須一致；現有 Product/Article/FAQ/HowTo/DefinedTerm JSON-LD 不因導航重組而重寫其事實內容。
- 更新 `server/api/_sitemap-urls.ts`、受影響 pages 的 `useHead`、`components/HeroLabPage.vue` 與 Breadcrumb schema 均屬 B2，只有明確核准後才動。

### 已核准並完成的 B2 項目

- Desktop 四群組 + Home/Member 已完成；dropdown 支援 hover、focus、click、Escape。
- Mobile 四項 BottomNav 與 sheet 分組已完成；包含 focus trap、焦點回復、scroll lock 與 safe-area。
- `/start-here`、`/why-gencko`、`/genes` Hub 定位與導流卡已完成；未刪頁、未 redirect、未更動核心資料。
- Footer 四欄與既有 LINE/Instagram/Facebook 已完成；沒有虛構 `/terms`、`/contact`。
- canonical、Breadcrumb、robots 與 sitemap 已完成；一般爬蟲可讀 page-level noindex，AI 訓練 bot 全站 disallow 維持。

### 仍需另案的 C 級項目

- Shop SSR/hydration、Supabase schema/RLS、商品/拍賣/收藏/會員商業規則。
- 基因演算法、健康/醫療判斷、真正地圖/API、商品保證與退款/運送條款語意。
- Hero Lab 與 About 3D/Canvas/ScrollTrigger/native touch 核心。
- 安裝 Inspira UI 或任何新 package/module。

## 已完成驗證

- 起始 baseline（2026-08-28）：`npm.cmd run typecheck`、`npm.cmd run test`（21/21）、`git diff --check` 通過。
- Issue #5 解除後 fresh 驗證（2026-08-31）：
  - `npm.cmd run typecheck`：exit 0。
  - `npm.cmd run test`：1 個 test file、21/21 tests 通過。
  - `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `Build complete!`。
  - `git diff --check`：無 whitespace / conflict 錯誤；只有既有 LF → CRLF warning。
  - `npx.cmd prettier --check docs/ui-redesign-progress.md`：格式化後通過。
  - `code-review` Standards / Spec：本次 B1 diff 無 actionable finding；符合 mobile mouse listener gate、Vue cleanup 與不改桌機視覺的範圍。
- B2 實作後 fresh 驗證（2026-08-31）：
  - TDD：先建立 `tests/site-navigation.spec.js`，確認缺少共用契約與舊 Breadcrumb 規則會失敗，再實作至通過。
  - `npm.cmd run test`：2 個 test files、28/28 tests 通過。
  - `npm.cmd run typecheck`：exit 0。
  - `npm.cmd run build`：最終 client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `Build complete!`。
  - Headless Chrome production preview：1280px 與 900px Desktop 四群組無重疊；click disclosure `aria-expanded=true`、Escape 關閉且焦點保留。
  - Headless Chrome 390×844 touch context：BottomNav 四項、探索雙分區、三個 Hub、scroll lock、Escape、focus trap 與焦點回復通過；無 page error。
  - Metadata：`/` title/canonical/og:url 正確；`/hero-lab`、`/compare`、`/stories`、`/profile` robots/canonical 正確；內容 Breadcrumb 回 `/home`。
  - 實際 `/robots.txt` HTTP 200；實際 `/sitemap.xml` HTTP 200，包含 `/home`、`/start-here`、`/buying-guide`、`/why-gencko`，排除 `/hero-lab`、`/compare`、`/stories`、`/profile`、`/identity/*`。
- Phase 1 Design System 第一批 fresh 驗證（2026-08-31）：
  - TDD：先建立 `tests/design-system.spec.js`，確認 spacing/focus/control/safe-area/reduced-motion 與共用元件契約會失敗，再實作至 4/4 通過。
  - `npm.cmd run test`：3 個 test files、32/32 tests 通過。
  - `npm.cmd run typecheck`：exit 0。
  - `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `Build complete!`。
  - production preview 實測：desktop button `min-height=44px`、PageHero padding `24px`、focus ring `2px/3px`；reduced-motion 的 animation/transition 為 `0.01ms` 且 scroll behavior 為 `auto`。
  - production preview mobile 390 touch：`.bottom-nav .nav-item` 為 4 項、safe-area bottom 計算存在、focus ring 可見、無 page error；preview 已停止。
  - `git diff --check`：無 whitespace / conflict 錯誤；只有既有 LF → CRLF 與 git ignore permission warning。
- Phase 1 共用殼層第二批 fresh 驗證（2026-08-31）：
  - TDD：先建立 `tests/common-shell.spec.js`，確認 Marquee reduced-motion、Lightbox safe-area/will-change、Toast announcement/transition 契約會失敗，再實作至 3/3 通過。
  - `npm.cmd run test`：4 個 test files、35/35 tests 通過。
  - `npm.cmd run typecheck`：exit 0。
  - `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `Build complete!`。
  - production preview 1280 reduced-motion：Marquee animation 為 `none`、padding-left 為 `0px`、全域 button focus ring `2px/3px`、Lightbox safe-area CSS 與 Toast `opacity/transform 0.2s` 均存在。
  - production preview mobile 390 touch：BottomNav `.nav-item` 為 4 項、body bottom safe-area 計算為 `80px`、無 page error；preview 已停止。
  - Prettier check 通過；`git diff --check` 無 whitespace / conflict 錯誤，僅有既有 LF → CRLF 與 git ignore permission warning。
- Phase 1 共用殼層第三批與 payload incident fresh 驗證（2026-08-31）：
  - TDD：先讓 `tests/shared-interaction.spec.js` 的 NuxtLink 預取與首頁元件註冊 contract 失敗，再完成修正至 5/5 通過。
  - 修正：Navbar、BottomNav、Footer、首頁自身內部入口與熱門卡片的 `<NuxtLink>` 明確加 `no-prefetch`，避免 dev/瀏覽器初始同時預取全站 route payload；點擊導覽契約不變。NuxtLink 的 global defaults 在本 checkout 生成產物中不保留自訂預取設定，因此不依賴該 config escape hatch。
  - 修正：`pages/home.vue` 明確 import `components/home/HotPicksMarquee.vue`，消除 Nuxt `components/home` 前綴造成的 `Failed to resolve component` warning。
  - 根因證據：原 3000 dev process 與另一個 3400 dev process 同時共用 `.nuxt`；其中一個約 2.1 GB，既有 `.tmp-dev.err.log` 記錄 Node heap OOM。停止重複 dev process 後，以單一 3400 dev server 驗證 `/home` HTTP 200、初始 6 秒無 route payload preload、無 `HotPicksMarquee` warning、無 page/console error。
  - `npm.cmd run test`：5 個 test files、40/40 tests 通過；`npm.cmd run typecheck`：exit 0；`npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `Build complete!`。
  - Production smoke：`/`、`/home`、`/shop`、`/auction`、`/start-here`、`/why-gencko`、`/genes`、`/robots.txt`、`/sitemap.xml` 全部 HTTP 200；headless Chrome `/home` 無 payload error、無未註冊元件 warning、無 request failed。
- Phase 1 共用互動元件第四批 fresh 驗證（2026-08-31）：
  - TDD：先新增 `tests/shared-interaction.spec.js` 的 ShopFlipCard、Timeline、GradientButton contract，確認 3 項缺口失敗，再完成修正至 8/8 通過。
  - 修正：`ShopFlipCard` 的「找相似」按鈕補上 `var(--control-min-height)` 與可視焦點/觸控內距；翻牌在 `prefers-reduced-motion` 下停用 transform transition。
  - 修正：`Timeline` 內文連結補上共用 44px 控制高度與觸控內距；hover 位移仍只在 fine pointer 啟用。
  - 修正：`GradientButton` 在 hover-none、coarse pointer 或 768px 以下停用旋轉與 blur，保留靜態色帶；桌機動效不變。
  - `npm.cmd run test`：5 個 test files、43/43 tests 通過；`npm.cmd run typecheck`：exit 0；`npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `Build complete!`。
  - Production preview viewport：390px GradientButton pseudo-element 為 `animation=none/filter=none`，翻卡操作鈕實際高度 44px；900/1280px 翻卡 hover 產生 `matrix3d`、背面操作鈕可見；三個 viewport 的 payload failure、page error、console error 均為空。
  - Prettier check 通過；production preview 已停止。
- Phase 1 互動卡片與 payload 入口修正 fresh 驗證（2026-08-31）：
  - TDD：先新增 `tests/shared-interaction.spec.js` 的觸控事件、reduced-motion、首頁手機 3D 降級與共享入口預取 contract，確認缺口後完成至 13/13 通過；全套測試為 5 個 test files、48/48 通過。
  - 修正：`InteractiveGridPattern` 改用 `v-on="getHoverEvents(i)"`，只有 fine pointer 才註冊 mouseenter/mouseleave；`AtroposCard` 只在 fine pointer 延遲初始化 pointerenter，並補上 reduced-motion 與狀態切換清理。
  - 修正：首頁熱門卡片在手機固定為輕量 scale、flat transform、`will-change: auto`；3D rotateY 與 transform hint 僅在 fine pointer 啟用，reduced-motion 另行停用 transition。
  - 修正：`HomeHotPickTiltCard`、`HomeScenarioTiltCard`、`HeroLabPage`、`BrandServiceScrollScene` 的 NuxtLink 共享入口明確關閉自動預取，直接處理 `/home` payload preload 的缺口；DOM 不會顯示 `no-prefetch` 屬性，因為 NuxtLink 會消費該 prop。
  - `npm.cmd run typecheck`：exit 0；fresh `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `.output/server/index.mjs`。
  - Production preview 390px smoke：首頁熱門卡片為 `matrix(0.88, 0, 0, 0.88, 0, 0)`、`transform-style: flat`、`will-change: auto`，animation/filter 均為 none；無 payload failure、HTTP 500+ response、page error 或 console error。
  - Dev reproduction caveat：單一 3500 dev server 首次 warmup 未在測試 timeout 內回應，log 無 OOM/500 且 process 隨後停止監聽；不能將此記為 dev smoke 通過，需以單一 dev server 重啟後再做手動 reproduction。
- Phase 1 全站 NuxtLink payload 防護 fresh 驗證（2026-08-31）：
  - TDD：先新增 residual-link contract，確認 `NextCta`、`Timeline`、內容頁、比較/商品/會員/文章/基因入口仍有未關閉預取項目，再完成至 `15/15` targeted 通過；全套測試為 5 個 test files、`50/50` 通過。
  - 修正：全站 source scan 的所有 `<NuxtLink>` 均明確帶 `no-prefetch`，涵蓋共享 CTA、Timeline、start-here、guide、care、文章、compare、genes、profile、qs、why-gencko、stories、merch、product、shop 與 ShopFlipCard；不改 route、文案、資料查詢或外部 LINE 行為。
  - `npm.cmd run typecheck`：exit 0；fresh `npm.cmd run build`：client、SSR、Nitro、PWA、5 個 prerender routes 與 10 個 payload 完成，輸出 `.output/server/index.mjs`。
  - Production preview 390/1280px smoke：兩個 viewport 均無 payload failure、HTTP 500+ response、console error 或 page error；本次 dynamic inventory 未載入，故 hot card count 為 0，未以此宣稱視覺卡片驗證通過。
  - 驗證後已停止 3400 preview；目前沒有本次 task 建立的 dev/preview listener。
- Dev 啟動與 payload incident final reproduction（2026-08-31）：
  - 以單一 3000 dev process 重現：先建立 listener，但首次 Vite server build 約 54 秒；Nuxt 隨後編譯 devtools、router、Supabase types、plugins 與 Nitro，最高約 1.5 GB，完成後 `/` 首次約 7.5 秒、`/home` 約 245ms。
  - 發現並清理 7 組先前 Playwright smoke 殘留的 shell/node 子樹；它們與 dev 共享本機資源，會放大「Vite server built 後沒有反應」的表象。清理後同一 dev process 的 `/`、`/home`、`/shop` 均 HTTP 200。
- Browser smoke：3000 的 `/`、`/home`、`/shop` 均無 `_payload` request failure、HTTP 500+、`preloading payload` console message 或 page error。這確認目前不是 payload route failure，而是首次 dev warmup 與重複/殘留 process contention。
- 驗證後已停止本次 3000 dev process；TIME_WAIT 不代表仍有 listener。

## Phase 1 A/B1 FAQ、健康與醫院互動 audit（2026-09-01）

- TDD：先在 `tests/shared-interaction.spec.js` 補 FAQ、Health、Hospital contract，確認原始狀態有 3 個失敗，再完成至 `18/18` targeted 通過；全套測試為 5 個 test files、`53/53` 通過。
- FAQ：分類 tab 與問題按鈕補 `type="button"`、共用 `--control-min-height`；問題按鈕與回答區建立 `aria-controls` / `id` 關聯；分類 hover 僅限 fine pointer，並補 reduced-motion transition 降級。
- Health：入口卡片、返回、問卷導覽、重設、送出與複製按鈕補明確 button type 與 44px 最小控制高度；觸控端停用入口卡片、選項、結果 CTA 等 hover 位移/陰影，reduced-motion 清除主要 transition、animation 與 transform。
- Hospital：展開標題改為語意 button，補 `aria-expanded` / `aria-controls`；收藏改為有 aria-label 的 button，避免原本不可鍵盤操作的 div/span；地圖、電話、篩選與收藏控制補 44px 最小尺寸，hover 限 fine pointer，並補 reduced-motion。
- `npm.cmd run typecheck`：exit 0；fresh `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `.output/server/index.mjs`。
- Production bundle smoke：單一 preview process 的 `/faq`、`/health`、`/hospital` 均 HTTP `200`；驗證後已停止 process，3000/3100/3400/3500 均無 active listener。
- Build 僅保留既有 large chunk、Nitro cache-driver external、Node trailing-slash exports 與 sharp architecture warnings；本批沒有新增 blocker，也沒有啟動背景 dev/preview process。

## Phase 1 A/B1 Auction 與 Breeders 互動 audit（2026-09-01）

- TDD：在 `tests/shared-interaction.spec.js` 補 Auction index/detail 與 Breeders contract，確認原始狀態有 3 個失敗，再完成至 `21/21` targeted 通過；全套測試為 5 個 test files、`56/56` 通過。
- Auction 列表：將可點擊卡片由 router push 的 div 改為 `NuxtLink no-prefetch`，補 aria-label，保留既有 `/auction/:id` URL 與資料呈現；卡片 hover 僅在 fine pointer 啟用。
- Auction 詳情：所有分享、圖卡、出價、登入、收藏相關操作補 `type="button"`；主要操作控制補 `--control-min-height`，觸控端停用位移 hover，reduced-motion 停用主要 transition/animation。
- Breeders：物種 tab 與性別篩選補共用 44px 最小高度，性別 hover 限 fine pointer，並補 reduced-motion。
- `npm.cmd run typecheck`：exit 0；fresh `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `.output/server/index.mjs`。
- Production bundle smoke：單一 preview process 的 `/auction`、`/breeders`、`/auction/demo` 均 HTTP `200`；驗證後已停止 process，沒有留下 active listener。

## Phase 1 A/B1 Shop、Merch 與 Product 互動 audit（2026-09-01）

- TDD：先在 `tests/shared-interaction.spec.js` 補 Shop、Merch 詳情與 Product 詳情 contract，確認原始狀態有 3 個失敗；完成後 targeted 為 `24/24` 通過，全套測試為 5 個 test files、`59/59` 通過。
- Shop：物種分類、歷史/收藏快捷篩選、基因分類與標籤由不可聚焦的 `div/span` 改為原生 button，補 `aria-pressed` / `aria-expanded`；篩選返回、清除、套用、比較移除與清空控制補明確 `type="button"`、44px 觸控尺寸、focus-visible 與移除項目標籤。
- Merch 詳情：商品圖片改為可鍵盤聚焦的放大 button，保留既有 lightbox 行為；購買與複製連結控制補 44px 最小高度，hover 位移/色彩只在 fine pointer 啟用，reduced-motion 停用過渡。
- Product 詳情：商品圖片改為 `NuxtLink no-prefetch` 導向既有 `/identity/:id`，移除直接 router push；分享、圖卡產生與 modal 關閉按鈕補明確 `type="button"`、44px 尺寸、focus/hover 條件與 reduced-motion，相關商品卡 hover 同樣限 fine pointer。
- Demo/不存在 ID：Merch 與 Product 查詢由 `.single()` 改為 `.maybeSingle()`，避免預期的空結果產生 Supabase `406`；詳情頁 loading 分支加上 `isHydrated` 閘門，避免 SSR/CSR 初始分支不一致造成 hydration mismatch。
- `npm.cmd run typecheck`：exit 0；fresh `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `.output/server/index.mjs`。
- Production preview smoke：單一 preview process 的 `/shop`、`/merch`、`/merch/demo`、`/product/demo` 均 HTTP `200`；headless browser 在 390px/reduced-motion 下監測 payload preload、hydration、406、request failure、page error、console error 與 HTTP 5xx，`BROWSER_ISSUES_TOTAL=0`；驗證後已停止 process。
- Prettier check 與 `git diff --check` 通過；目前沒有本批建立的 dev/preview/background listener。

## Phase 1 A/B1 Compare、Profile 與 Identity 互動 audit（2026-09-01）

- TDD：在 `tests/shared-interaction.spec.js` 補 Compare、Profile 與 Identity contract，確認原始狀態有 3 個失敗；完成後 targeted 為 `27/27` 通過，全套測試為 5 個 test files、`62/62` 通過。
- Compare：清空與移除比較項目補明確 `type="button"`、aria-label 與 44px hit area；購買、競標、詳情 action link 補共用 44px 高度，hover 僅限 fine pointer，並加入 focus-visible/reduced-motion。
- Profile：登入、登出、導頁 CTA、分段 tab、商品/醫院收藏與電話控制補 button type、44px 尺寸與 focus；醫院收藏由不可鍵盤操作的 span 改為 button，卡片與登入 hover 限 fine pointer，reduced-motion 停用 transition/animation。
- Identity：PDF 列印控制補明確 `type="button"`、44px 高度與 focus-visible；loading spinner 與按壓狀態在 reduced-motion 下停用動畫/縮放。
- `npm.cmd run typecheck`：exit 0；fresh `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `.output/server/index.mjs`。
- Production preview smoke：單一 preview process 的 `/compare`、`/profile`、`/identity/demo` 均 HTTP `200`；headless browser 在 390px/reduced-motion 下監測 payload preload、hydration、406、request failure、page error、console error 與 HTTP 4xx/5xx，`BROWSER_ISSUES_TOTAL=0`；驗證後已停止 process。
- Prettier check 與 `git diff --check` 通過；目前沒有本批建立的 dev/preview/background listener。

## Phase 1 A/B1 Articles 與 Genes 互動 audit（2026-09-01）

- TDD：在 `tests/shared-interaction.spec.js` 補 Articles index/detail 與 Genes index/detail contract，確認原始狀態有 4 個失敗；完成後 targeted 為 `31/31` 通過，全套測試為 5 個 test files、`66/66` 通過。
- Articles 列表：分類與熱門主題由不可原生聚焦的 `div/span` 改為 button，補 `type="button"`、`aria-pressed`、共用 44px 高度與 focus-visible；搜尋清除與空結果清除也補明確 button type。
- Article 詳情：查詢由 `.single()` 改為 `.maybeSingle()`，不存在 ID 不再觸發 Supabase `406`；loading 分支加上 `isHydrated` 閘門，返回控制補 button type；作者、基因自動連結與延伸閱讀 hover 限 fine pointer，並補 focus/reduced-motion。
- Genes 列表：物種分段按鈕補 `aria-pressed`、44px 高度與 focus；基因卡片補 44px hit area，hover 僅限 fine pointer，觸控與 reduced-motion 不執行位移動畫。
- Gene 詳情：查詢由 `.single()` 改為 `.maybeSingle()`，不存在基因 ID 不再觸發 Supabase `406`；loading 分支加上 `isHydrated` 閘門，loader 在 reduced-motion 下停止動畫。
- `npm.cmd run typecheck`：exit 0；fresh `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `.output/server/index.mjs`。
- Production preview smoke：單一 preview process 的 `/articles`、`/articles/demo`、`/genes`、`/genes/demo` 均可載入；headless browser 在 390px/reduced-motion 下監測 payload preload、hydration、406、request failure、page error、console error 與 HTTP 4xx/5xx，`BROWSER_ISSUES_TOTAL=0`；驗證後已停止 process。
- Prettier check 與 `git diff --check` 通過；目前沒有本批建立的 dev/preview/background listener。

## Phase 1 A/B1 Content pages、Care 與 QS 互動 audit（2026-09-01）

- TDD：在 `tests/shared-interaction.spec.js` 補 Start Here、Stories、Why Gencko、Guide、Care 與 QS contract；先確認內容頁缺口，再完成 targeted `36/36` 通過；全套測試為 5 個 test files、`71/71` 通過。
- Start Here、Stories、Why Gencko：內容卡片、入口 chip、準備連結與 CTA 補共用 `--control-min-height`、focus-visible 與 reduced-motion；卡片 hover 僅限 fine pointer，保留既有文案、路由與桌機視覺。
- Guide：inline CTA 具備可見觸控內距與 focus-visible；hover 僅在 fine pointer 啟用，避免觸控端依賴 hover。
- Care：所有互動 button 補明確 `type="button"`；統計、錨點、側欄、chip、物種切換與 FAQ 補 44px 控制高度、focus-visible、fine-pointer hover 與 reduced-motion；物種比較與 FAQ 建立 `aria-expanded` / `aria-controls` / `id` 關聯。
- QS：所有 button 補明確 type；問卷選項補 `aria-pressed`；導覽、修改、重設與結果入口補 44px 控制高度、focus-visible、fine-pointer hover 與 reduced-motion 降級。
- `npm.cmd run typecheck`：exit 0；`npm.cmd run test`：5 個 test files、`71/71` 通過；Prettier check 與 `git diff --check` 通過。
- Fresh `npm.cmd run build`：client、SSR、5 個 prerender routes、PWA 與 Nitro server 完成，輸出 `.output/server/index.mjs`；先前的 `.output EBUSY` 已在關閉既有 dev tree 後解除。

## Phase 1 A/B1 About 場景手機降級 audit（2026-09-01）

- TDD：在 `tests/shared-interaction.spec.js` 補 About 場景 mobile fallback contract；原始狀態先失敗，再完成至 targeted `37/37` 通過；全套測試為 5 個 test files、`72/72` 通過。
- `BrandServiceScrollScene`：TresJS `TresCanvas` 只在 `(hover: hover) and (pointer: fine)` 裝置 mount；手機改用靜態 CSS 背景，不建立 WebGL renderer。
- `MatrixGeneRain`：只在桌機且基因場景 active 時 mount，避免手機以 disabled prop 掛載高耗能 canvas。
- GSAP Observer：桌機保留 `wheel,pointer`，觸控裝置只註冊 `touch`；既有場景切換、CTA、路由與桌機 3D 視覺不變。
- `npm.cmd run typecheck`：exit 0；`npm.cmd run test`：5 個 test files、`72/72` 通過；targeted、Prettier check 與 `git diff --check` 通過。
- Production preview smoke：390px 真 mobile/touch + reduced-motion 下 `/start-here`、`/stories`、`/why-gencko`、`/guide`、`/care`、`/qs`、`/about` 均 HTTP `200`，無 payload preload、hydration、406、request failure、page error、console error 或 HTTP 4xx/5xx；`/about` 確認 `canvasCount=0`、`mobileFallbackCount=1`、`pointer: coarse=true`。
- Production preview desktop smoke：1280px/no-preference 下七頁均 HTTP `200` 且無監測錯誤；`/about` 確認 `canvasCount=1`、mobile fallback `0`。touch swipe 實測由 scene `0` 推進至 scene `1`；preview 與 browser sessions 已停止。

## Phase 1 A/B1 Calculator 互動控制 audit（2026-09-01）

- TDD：在 `tests/shared-interaction.spec.js` 補 Calculator contract；先確認 nested interactive 與控制降級缺口，再完成至 targeted `38/38` 通過；全套測試為 5 個 test files、`73/73` 通過。
- 基因選項：移除外層 button 包住 zygosity button 的 invalid nested interactive 結構；改為非互動容器、可聚焦 gene trigger `role="button"`，支援 Enter/Space、`aria-pressed`，內層 Het/超級控制維持原生 button。
- 反向推薦：推薦卡補 `role="button"`、`tabindex`、aria-label 與 Enter/Space 操作。
- Calculator 控制：selector、menu、help、role、category、gene、mode、reverse close 等控制統一共用 `--control-min-height` 與 focus ring；所有 hover selector 限 fine pointer；補 reduced-motion transition/animation 降級。
- `npm.cmd run typecheck`：exit 0；`npm.cmd run test`：5 個 test files、`73/73` 通過；Prettier check 與 `git diff --check` 通過。
- Fresh `npm.cmd run build`：exit 0；client、SSR、10 個 prerender routes（含 `/calculator`）、PWA 與 Nitro server 均完成，輸出 `.output/server/index.mjs`；先前由 stale preview PID `29540` 造成的 `.output` cleanup `EBUSY` 已解除。
- Production preview smoke：新建置產物的短暫 node preview 回應 `/calculator` 與 `/calculator/_payload.json` 均 HTTP `200`，stderr 無錯誤；preview 驗證後已停止，3400 沒有 listener。先前 390px 真 mobile/touch + reduced-motion 與 1280px/no-preference desktop 的完整 browser smoke 證據仍有效：頁面有內容、互動結果更新、console 為 `0 errors / 0 warnings`，主要 request 均 HTTP `200`。

## Phase 1 A/B1 Buying flow 與 Hero Lab 入口 audit（2026-09-01）

- TDD：在 `tests/shared-interaction.spec.js` 補 buying-guide / Timeline / Hero Lab entrance contract；先確認缺少 focus ring 與入口明確 hit area，再完成至 targeted `39/39` 通過；全套測試為 5 個 test files、`74/74` 通過。
- Buying flow：保留既有 Timeline 五步流程、`/shop` 與 `/care` 內部導流及 `NextCta`，只補流程連結 focus-visible、圓角與共用觸控高度下的 transition；hover 維持 fine pointer 限制，reduced-motion 停用 link/card transition。
- Hero Lab：`/home` 入口補共用 `--control-min-height` 與 focus-visible；不改動 Canvas、scene timeline、ScrollTrigger 或 mobile native-touch 行為。
- `npm.cmd run typecheck`：exit 0；`npm.cmd run test`：5 個 test files、`74/74` 通過；Prettier check 與 `git diff --check` 通過。
- Fresh `npm.cmd run build`：exit 0；client、SSR、10 個 prerender routes、PWA 與 Nitro server 均完成，輸出最新 `.output/server/index.mjs`。
- Production preview smoke：最新 build 的短暫 node server 下，`/buying-guide`、`/hero-lab`、`/`、`/home` 均 HTTP `200` 且有 `<title>`；buying-guide 的 390px 真 mobile/touch 與 1280px desktop 均有內容、流程連結可見、console 無 error/warning，主要 request 均 HTTP `200`。Hero Lab 兩端均可載入入口與模型（desktop/mobile 模型 request 均 `200`），但各有 3 筆既有 Three.js WebGL warning、無 error；browser sessions 與 preview server 已停止。
- Final review：本批 diff 未發現新的功能回歸；修改限於流程/入口連結的 focus、hit area、fine-pointer hover 與 reduced-motion contract，未改動 Hero Lab Canvas、scene timeline、ScrollTrigger 或 native-touch 核心。

## Phase 1 A/B1 About mobile 粒子 fallback（2026-09-02）

- TDD：在 `tests/shared-interaction.spec.js` 補 mobile particle contract；先以缺少 `MobileParticleField.vue` 的 `ENOENT` 確認 red phase，再完成 targeted `43/43` 通過；全套測試為 5 個 test files、`78/78` 通過。
- 實作：新增 `components/MobileParticleField.vue`，以 20 個固定座標的 DOM 粒子搭配 CSS radial glow、float animation 與 `prefers-reduced-motion` 靜止降級；粒子層 `pointer-events: none`，不註冊滑鼠事件、不使用 `requestAnimationFrame`、Canvas 或 WebGL。
- About fallback：`BrandServiceScrollScene` 的 mobile `stage-mobile-fallback` mount `MobileParticleField`；桌機 `TresCanvas` 與 `MatrixGeneRain` gate 維持不變。手機驗證時的 `canvas=1` 是既有 `TheDnaDecor` 低成本 DNA 裝飾，並非本次新增粒子。
- Production browser：`/about` desktop 1280px 顯示 `canvas=2`、particle `0`、fallback `0`；390px touch 顯示 particle `20`、fallback `1`，新增粒子 animation 存在且 pointer events 為 `none`；390px touch + reduced-motion 顯示 particle `20` 且 animation 為 `none`。三種狀態均無 console error、page error 或 request failure。
- Touch revalidation：390px touch + no-preference 以 synthetic touch swipe 驗證 scene `0 -> 1`，等待完整 1.8 秒轉場後 active dot 為 `1`；390px touch + reduced-motion 在瞬切後 active dot 為 `1`。兩次 touch flow 均維持 particle `20`、fallback `1`，無 page error 或 request failure。
- Long touch simulation：390px touch + no-preference 連續 5 次 swipe 完成 scene `0 -> 1 -> 2 -> 3 -> 4 -> 5`；每段均維持 particle `20`、fallback `1` 與相同 CSS animation，整段無 page error、console error 或 request failure。此為 headless Chrome touch 模擬，不取代實體 iOS/Android 效能量測。
- Verification：`npm.cmd run test` 為 `78/78` 通過；`npm.cmd run typecheck` exit 0；重新清除已知 stale Node process 後 `npm.cmd run build` exit 0，client、SSR、10 個 prerender routes、PWA 與 Nitro server 完成。Build 僅保留既有 chunk、Nitro cache-driver、Node trailing-slash 與 sharp architecture warnings，無 EBUSY error。

## Phase 2 /home Hero 與品牌信任導流 focused slice（2026-09-02）

- TDD：在 `tests/shared-interaction.spec.js` 補首頁 Hero/信任入口與 Scenario 鍵盤 contract；先以 `45 tests / 2 failed / 43 passed` 確認缺口，再完成 targeted `45/45`、全套 `80/80` 通過。
- Hero：保留既有社群外鏈與 GradientButton，新增可掃讀的品牌 eyebrow、首頁承諾、既有功能摘要，以及 `/shop`、`/start-here` 兩個主要 CTA；手機不再隱藏 Hero 主訊息，桌機長標題允許換行。
- 快速導覽：桌機「新手入門」保留既有 `role="button"` 與 click route，補 Enter/Space 啟動；不改 `/auction`、`/calculator`、`/hospital` route 與資料規則。
- 品牌信任：新增三張既有路由導流卡，分別連到 `/why-gencko`、`/buying-guide`、`/about`；沒有新增評價、數字、保固或其他未驗證商業承諾。
- Responsive/motion：Hero 與信任卡在 1280px 為雙欄/三欄，390px 為單欄；hover 只在 fine pointer 啟用，focus-visible 與 reduced-motion contract 保留。
- Production browser：`/home`、`/shop`、`/start-here`、`/calculator`、`/hospital`、`/why-gencko`、`/buying-guide`、`/about` 均 HTTP `200`；desktop/mobile/reduced-motion 均有 Hero、信任卡 `3`、文章卡 `3`、hydrated hot cards `92`，無 console error、page error 或 request failure；desktop 鍵盤 Enter 成功進入 `/start-here`。
- Verification：fresh `npm.cmd run build` exit 0；本輪曾有舊 Node process 導致 `.output` `EBUSY`，停止 4 個可辨識的本專案 Node 殘留程序後重建成功。Prettier、typecheck 與既有全套測試維持綠燈。

## Phase 3 /shop 手機篩選 Drawer focused slice（2026-09-02）

- TDD：先在 `tests/shared-interaction.spec.js` 新增 Drawer contract，原始狀態為 `46 tests / 1 failed / 45 passed`；完成後 targeted `46/46`、全套 `81/81` 通過。
- Drawer 語意：手機篩選面板補 `role="dialog"`、`aria-modal`、標題關聯、觸發鈕 `aria-expanded` / `aria-controls` 與明確 button type；保留既有篩選演算法、資料查詢與商品卡路由。
- 鍵盤與頁面狀態：開啟後焦點進入 Drawer；Escape、返回、遮罩、套用與清除均走同一關閉流程；Tab 只在實際可見控制間循環；開啟時加 `body.shop-filter-open` 鎖定背景滾動，卸載時清理。
- 搜尋與觸控：搜尋欄改用 `type="search"`、`enterkeyhint="search"`；篩選 checkbox label 補 `--control-min-height` 與 18px 控制尺寸，維持 mobile 觸控可用性。
- Production browser：fresh `.output` 以單一 Nitro server 啟動於 3141；1280px desktop 與 390px 真 mobile/touch 的 `/shop` 均 HTTP `200`，hydrated 商品卡各 `20` 張，無 payload preload、console、page、request error；手機 Drawer 的首焦點、Tab wrap、Escape 後 trigger focus、body lock 全部通過。
- 視覺檢查：已檢視 `output/playwright/shop-phase3-desktop-fresh.png` 與 `output/playwright/shop-phase3-mobile-fresh.png`；desktop 篩選欄與四欄商品網格、mobile 雙欄商品網格與底部導覽均正常。
- Verification：`npm.cmd run typecheck` exit 0；fresh `npm.cmd run build` exit 0；Prettier 與 `git diff --check` 通過。Build 僅保留既有 large chunk、Nitro cache-driver、Node trailing-slash 與 sharp architecture warnings。

## Phase 3 /breeders 檔案館式卡片 focused slice（2026-09-02）

- TDD：先在 `tests/shared-interaction.spec.js` 新增 Breeders contract，原始狀態為 `47 tests / 1 failed / 46 passed`；完成後 targeted `47/47`、全套 `82/82` 通過。
- 物種 tabs：保留既有兩物種切換與資料流程，補 `aria-pressed`、`role="group"`、label 與 `focus-visible`，切換後狀態與 hydrated 卡片數會同步更新。
- Mobile 掃讀：`ShopFlipCard` 新增 opt-in `showMobileMeta`，只由 Breeders 啟用；手機正面顯示既有性別、生日與基因資料，desktop 仍維持 hover 翻卡，Shop 預設不受影響。
- Responsive layout：Breeders mobile grid 從三欄改為雙欄，卡寬由約 `116px` 提升至 `175px`；補 mobile「種群展示」視覺標題，避免 mobile 只剩 tabs 無頁面脈絡。
- Production browser：fresh `.output` 以單一 Nitro server 啟動於 3145；1280px desktop `/breeders` HTTP `200`、hydrated cards `53`、三欄與 desktop metadata 隱藏；390px touch HTTP `200`、雙欄、mobile heading visible、metadata visible；切換至肥尾守宮後 `aria-pressed` 更新且 cards `6`；無 console、page 或 request error。
- 視覺檢查：已檢視 `output/playwright/breeders-phase3-desktop-fresh.png` 與 `output/playwright/breeders-phase3-mobile-fresh.png`；首屏卡片比例、tabs 與 mobile metadata 正常。長頁 lazy image 未主動滾動載入屬既有策略，不是 layout error。
- Verification：`npm.cmd run typecheck` exit 0；fresh `npm.cmd run build` exit 0；Prettier 與 `git diff --check` 通過。Build 僅保留既有 large chunk、Nitro cache-driver、Node trailing-slash 與 sharp architecture warnings。

## Phase 3 /auction 狀態與 action responsive focused slice（2026-09-02）

- TDD：先在 `tests/shared-interaction.spec.js` 新增列表與詳情 contract，原始狀態為 `49 tests / 2 failed / 47 passed`；完成後 targeted `49/49`、全套 `84/84` 通過。
- Auction 列表：mobile 補「線上競標 / Live Auctions」與結標規則提示，避免空間不足時只剩資料卡；狀態補 `role="status"`，倒數補 `role="timer"`，卡片補 `:focus-visible`，reduced-motion 停用 ending-soon 脈衝。
- Auction 詳情：商品主圖由不可鍵盤操作的 clickable `div` 改為原生 `button`，保留既有 lightbox 行為；timer 補 `role="timer"`；宣傳圖卡 Modal 補 dialog 語意、Escape 關閉、Tab focus trap、開啟後 focus 移入與關閉後回到觸發鈕。
- 交易邊界：未改 Supabase auctions/bids 查詢、realtime subscription、倒數延長、登入、出價、直購或任何資料 schema/商業規則。
- Production browser：fresh `.output` 以單一 Nitro server 啟動於 3149；1280px desktop 與 390px 真 mobile/touch 的 `/auction` 均 HTTP `200`，無 console/page/request error；目前環境沒有 hydrated auction rows，故本輪無法在此環境實際點擊 `/auction/:id` 的出價資料流。mobile 空資料頁已確認 heading `display:flex`，desktop heading 維持隱藏。
- Verification：`npm.cmd run typecheck` exit 0；fresh `npm.cmd run build` exit 0；Prettier 與 `git diff --check` 通過。Build 僅保留既有 large chunk、Nitro cache-driver、Node trailing-slash 與 sharp architecture warnings；preview 3149 已停止。

## Phase 3 /product/:id 商品詳情 responsive focused slice（2026-09-02）

- TDD：先在 `tests/shared-interaction.spec.js` 新增收藏、mobile 相關卡片與宣傳 Modal contract，原始狀態為 `51 tests / 2 failed / 49 passed`；完成後 targeted `51/51`、全套 `86/86` 通過。
- 收藏與 CTA：商品詳情補原生收藏 button，使用 `aria-pressed` 呈現狀態，沿用既有 `store.wishlist` 與 `gencko_wishlist` localStorage；分享、產生圖卡與購買/競標 CTA 保留既有路由、外連與商業語意。
- Mobile order：相關個體由三欄改為雙欄 `minmax(0, 1fr)`，提升卡片與價格掃讀；購買、收藏、分享、圖卡按鈕維持共用 `--control-min-height`，related cards 補 keyboard focus ring。
- 宣傳圖卡：Modal 補 `role="dialog"`、`aria-modal`、標題關聯、Escape、Tab focus trap、開啟後 focus 移入與關閉後回到觸發鈕；Canvas 仍只在使用者明確點擊產生圖卡時執行。
- 商業邊界：未改商品查詢、商品狀態、價格、保證、退款、運送文案、LINE 外連、電子身分證 URL 或 schema/SEO 資料。
- Production browser：fresh `.output` 以單一 Nitro server 啟動於 3153；從 `/shop` 取得真實商品 `/product/S-53518`，1280px desktop 與 390px 真 mobile/touch 均 HTTP `200`、無 console/page/request error；desktop related cards 為 4 欄約 266px，mobile 為 2 欄約 176px；收藏 toggle 成功寫入 `["S-53518"]` 並可還原；mobile CTA 高度 46px，scroll-to-CTA 與 fixed BottomNav 無重疊。
- Verification：`npm.cmd run test` 為 `86/86` 通過；`npm.cmd run typecheck` exit 0；fresh `npm.cmd run build` exit 0；Prettier 與 `git diff --check` 通過。Build 僅保留既有 large chunk、Nitro cache-driver、Node trailing-slash 與 sharp architecture warnings；preview 3153 已停止。

## Phase 3 cross-route regression（2026-09-03）

- 驗證矩陣：以 fresh `.output` 單一 Nitro production server 3155，在 1280px desktop 與 390px 真 mobile/touch 執行 `/shop` → 真實 `/product/S-53518` → `/identity/S-53518` → `/auction`。
- Route continuity：商品連結、電子身分證連結與 auction fallback 均維持既有 URL；product title、identity card/actions 與 auction empty state 均正常渲染。
- Desktop navigation：4 組桌機導覽存在；dropdown click 後 `aria-expanded=true`，Escape 後回復 `false`。
- Mobile navigation：BottomNav 保留 `首頁 / 探索 / 新手 / 工具`；導覽 sheet 開啟後 focus 進入 close button、body overflow lock 為 `hidden`，Escape 後還原 body overflow 與 trigger focus。
- Error audit：payload preload error、本站 4xx/5xx、page error 與 browser console error 均為 0；mobile 無 request failure。desktop 另有 1 筆外部 `wsrv.nl` 圖片 request failure，PowerShell 直接檢查同一 URL 亦因 SSL connection 無法建立，列為外部圖片 proxy 風險，不是本站 route/hydration 錯誤。
- 既有 server log：preview stderr 出現 PWA/既有 `/offline` 無對應 route 的 Vue Router warning；browser console 未捕捉到該 warning，本輪不新增 `/offline` route，避免超出 B2 舊 URL/導覽核准範圍。
- Verification：cross-route browser screenshot 已產出於 `output/playwright/cross-route-desktop.png` 與 `output/playwright/cross-route-mobile.png`；一次性驗證腳本已移除，preview 3155 已停止。最新 `87/87` tests、typecheck、fresh build 與 `git diff --check` 均有效。

## Phase 3 authenticated auction success smoke（2026-09-03）

- 前置條件：使用者將既有 `S-41201` 截標時間延至明天；未建立新的正式測試競標資料。Chrome session 已由使用者完成 Google 登入，會員頁顯示 `zzes50708` / `Google 登入`。
- Browser evidence：`http://127.0.0.1:3500/auction/S-41201` 顯示 `競標中`、倒數約 1 天 9 小時與出價控制；以登入 session 送出最低有效價 `$100` 後，頁面顯示 `出價紀錄 (1)`、匿名名稱 `zze***`、最高出價 `$100`，並將下一次最低出價更新為 `$200`。
- Member sync：返回 `/profile` 後顯示 `競標 1`，確認 `get_my_auction_bids` 可用登入身份讀回剛建立的出價紀錄。
- 判定：authenticated success smoke 已完成；Google session、伺服器身份驗證、原子出價 RPC、安全欄位回傳、競標詳情更新與會員頁同步均通過。此驗證產生一筆真實 `S-41201` 出價，未執行刪除或 rollback。

## Deploy preflight（2026-09-03）

- 工作樹檢查：目前仍有多批既有修改與未追蹤驗證產物；沒有執行 `git add`、commit、push 或部署，避免部署腳本將不相關內容一併送出。
- Runtime checks：`npm.cmd run test` 為 `89/89`、`npm.cmd run typecheck` exit 0。
- Production build：首次因本輪殘留 Nitro preview 子程序持有 `.output` 而在 cleanup 報 `EBUSY`；確認 3 個本輪 11:08 啟動且無 listener 的 node 子程序後停止，第二次 `npm.cmd run build` exit 0，完成 client、SSR、10 個 prerender routes、PWA 與 Nitro server。
- Build warnings：保留既有 large chunk、Nitro `cache-driver.js` external 與 Node trailing-slash deprecation warnings；未新增編譯錯誤。
- Deployment gate：目前只完成 preflight，部署仍需使用者明確核准，且須先指定要納入的檔案/commit 範圍；不得直接使用會 `git add .` 的自動部署腳本。

## Phase 1 C Hero Lab mobile Canvas 降級（2026-09-01）

- Baseline：fresh browser smoke 曾確認 `/hero-lab` 在 390px/coarse pointer 仍 mount 3 個主場景 Canvas、載入 3 個 mobile GLB，另有 1 個 `HeroLogoDisc` canvas；desktop 為 3 個主場景 Canvas，三筆 Three.js warnings、無 errors。
- 修正：`HeroDnaGecko` 與 `HeroLabPage` 使用 `useMediaQuery('(min-width: 768px) and (hover: hover) and (pointer: fine)')`；mobile 不 mount `TresCanvas`、`DnaGeckoParticles` 或 `HeroLogoDisc`，scroll-space 保留但設為 `height: 0`，並改用靜態 fallback 與 `/logo.png`，desktop 保留完整 3D。
- TDD：`tests/shared-interaction.spec.js` 的 Hero Lab mobile gate contract targeted `40/40` 通過；連同後續 PMREM warning contracts，目前全套測試為 5 個 test files、`77/77` 通過。
- 靜態檢查：`npm.cmd run typecheck` exit 0；fresh `npm.cmd run build` exit 0，client、SSR、10 個 prerender routes、PWA 與 Nitro server 完成；Prettier check 通過，`git diff --check` 無 whitespace/conflict error。
- Production preview mobile：`/hero-lab` title 正常、入口存在、static fallback 存在且有 9 個導覽連結；`canvas=0`、`modelRequests=[]`、`finePointer=false`、`coarsePointer=true`，console 為 `0 errors / 0 warnings`，主要 Supabase 與 payload request 均 HTTP `200`。
- Production preview desktop（PMREM tuning 前）：`/hero-lab` title 正常、`canvas=3`、`fallback=false`、三個 desktop GLB request 均 HTTP `200`，`finePointer=true`；console 為 `0 errors / 3 warnings`，包含 shader precision 與兩筆 `sigmaRadians` clipping warning，沒有新增 error。
- 驗證後已關閉 mobile/desktop browser session 與 preview PID `29376`；`3400` 沒有 listener。

## Phase 1 C Hero Lab PMREM warning tuning（2026-09-01）

- Root cause：`DnaGeckoParticles.vue` 的 room environment 使用 `pmrem.fromScene(roomEnvScene, 0.12)` 與預設 `size=256`，Three.js 計算出 59 samples，超過內部上限 20，造成兩筆 `sigmaRadians` clipping warning。
- 修正：先將 room environment 限制為 `size: 64`，再在後續 focused iteration 移除該第二次 prefilter；基礎 `RoomEnvironment` 的額外 scene blur 從 `sigma=0.04` 改為 `0`，保留單一 PMREM 的 GGX prefilter。
- TDD：`tests/shared-interaction.spec.js` 新增 PMREM size/blur contracts；新增前 targeted 為 `40/42`，修正後 `42/42` 通過；全量為 5 個 test files、`77/77` 通過。
- 靜態檢查：`npm.cmd run typecheck` exit 0；fresh `npm.cmd run build` exit 0，client、SSR、10 個 prerender routes、PWA 與 Nitro server 完成；Prettier check 通過。
- Production preview desktop：`/hero-lab` title 正常、`canvas=3`、三個 desktop GLB request 均 HTTP `200`，`finePointer=true`；`sigmaRadians` clipping warning 已為 0，剩餘為兩筆相同的 GPU driver shader precision info log，console `0 errors / 2 warnings`。
- 診斷結論：載入前 WebGL trace 已將兩筆 warning 關聯到 Three.js PMREM 內建 GGX prefilter shader（`Transform back to ellipsoid configuration`），不是 Hero Lab 的 custom/physical material，也不是 app exception；本輪不改寫大量 shader，避免以消 warning 為由造成材質或場景回歸。
- 驗證後已關閉 shader trace browser session 與 preview PID `884`；`3400` 沒有 listener。

## Phase 1 C Hero Lab desktop shader/frame baseline（2026-09-01）

- 測試環境：production preview `/hero-lab`、Chromium 由本機 Chrome executable 啟動、1440x1000、deviceScaleFactor 1、NVIDIA `GeForce GT 1030` / ANGLE Direct3D11；`canvas=3`、`finePointer=true`。
- Console baseline：兩筆相同 PMREM precision info log 可穩定重現，`pageErrors=0`；`sigmaRadians` clipping warning 維持 0。
- Frame baseline：120 個 `requestAnimationFrame` sample 中去除前 5 個 warm-up，115 個有效 sample 平均 `50.6ms`、P50 `50ms`、P95 `83.5ms`、最大 `116.7ms`；此為 headless GPU 測量，不等同實體使用者螢幕 FPS。
- 渲染矩陣：SwiftShader (`--use-angle=swiftshader` 與 `--disable-gpu`) 在此環境無法穩定完成 Hero Lab 頁面初始化，不能作為可比較的效能基準；未因該環境限制修改應用程式。
- 判定：現有可重現 warning 屬 PMREM 內建 shader 的 GPU driver info log；若產品要求 desktop console 完全零 warning，下一個最小實驗應評估是否能安全合併/重用兩次 PMREM prefilter，並逐項做 visual regression 與 frame-time 對照，不應先改 material precision。

## Phase 1 C Hero Lab PMREM 單一 prefilter focused iteration（2026-09-01）

- TDD：新增「只保留一次 `pmrem.fromScene` 並讓 `eggShardMat` 重用 `envRT`」contract；先以 `43 tests / 1 failed / 42 passed` 確認現況有兩次呼叫，再修正為 targeted `42/42`。
- 實作：移除只供 egg shard 的 `roomEnvScene`、`roomEnvMat` 與 `roomEnvRT`，保留其他材質使用原有 `RoomEnvironment`，只改變碎片的反射來源。
- Build/runtime：清除本輪 preview process tree 後 `npm.cmd run build` 成功；全套測試 `5 files / 77 passed`、typecheck exit 0。Chrome/NVIDIA runtime 為 `canvas=3`、三個 GLB HTTP `200`、`pageErrors=0`、console `0 errors / 1 PMREM precision warning`，確認成功移除一筆重複 warning。
- Frame/visual：本次 115 個有效 frame sample 平均 `56.98ms`、P50 `50.1ms`、P95 `133.4ms`、最大 `150.2ms`；與前一輪單次 `50.6ms / 83.5ms / 116.7ms` 相比波動較大，不能宣稱效能改善或退化。初始 Hero screenshot 正常；此 headless route 的 `bodyHeight=1000`、`scrollY=80` 未進入終章，碎片反射仍需實際可滾動路徑或真機驗證。
- 判定：目前仍有一筆 PMREM 內建 GGX precision info log；本輪不再擴大修改，下一個若要追求零 warning 的實驗應改評估替代 prefiltered environment 或 Three.js/driver 層處理，並以終章 visual regression 為必要門檻。
- 替代方案回顧：曾以 `WebGLCubeRenderTarget + CubeCamera` 取代顯式 PMREM；runtime 顯示 raw cube envMap 交給 PBR material 後，Three.js 仍自動執行 `fromCubemap` PMREM，warning 未消失。因 headless route 未進入終章、碎片反射未完成 visual regression，已回退以保留已知的 PBR environment mapping 行為。

## Phase 1 C Hero Lab PMREM 回退後 final verification（2026-09-01）

- 回退確認：`DnaGeckoParticles.vue` 已回到單一 `pmrem.fromScene(new RoomEnvironment(), 0)`，`eggShardMat` 重用同一張 `envRT`；未保留 `CubeCamera` 實驗碼。
- 驗證：回退後 `npm.cmd run build` exit 0；全套 `npm.cmd run test` 為 5 個 test files、`77/77` 通過；`npm.cmd run typecheck` exit 0；指定檔案 Prettier check 通過。
- 工作樹安全：`git diff --check` 無 whitespace / conflict error；3000、3100、3400 均無 listener；未清理任何既有 dirty 或 untracked 檔案。
- 結論：目前正式保留已知且視覺行為較安全的單一 PMREM 版本；CubeCamera 不能消除 Three.js 自動 `fromCubemap` PMREM precision log，零 warning 仍不是本輪已解決事項。

## Phase 1 C Hero Lab desktop scroll-space regression fix（2026-09-01）

- TDD：先將 `tests/shared-interaction.spec.js` 的 Hero Lab contract 改為要求 scroll-space 不依賴 `HeroLabPage` 的 JS media class，原始狀態 `42 tests / 1 failed / 41 passed`；修正後 targeted `42/42`、全套 `77/77` 通過。
- 根因：desktop `matchMedia('(min-width: 768px) and (hover: hover) and (pointer: fine)')` 實際為 true 且子層已 mount `canvas=3`，但 `HeroLabPage` 的 VueUse `hero3dEnabled` class 在 hydration 後仍保留 `hero-lab-scroll-space--static-mobile`，使 computed height 為 `0px`、最大 scroll 僅 `80px`，終章不可由正常滾動抵達。
- 修正：移除 `HeroLabPage` scroll-space 的 JS `useMediaQuery` 與 static-mobile class；desktop 高度固定由 CSS `1500dvh` 控制，mobile/coarse media query 明確設為 `height: 0`。3D mount gate 仍由 `HeroDnaGecko` 保留，未改 Canvas、scene timeline 或 ScrollTrigger。
- Production browser regression：desktop `scrollSpaceHeight=15000px`、`scrollHeight=15270`、`maxScroll=14270`、`heroExit=1`、`logoNext=1`、`canvas=3`，三個 GLB HTTP `200`；mobile 390px touch 為 `scrollSpaceHeight=0px`、`canvas=0`、static fallback `1`、模型請求 `0`。兩端 `pageErrors=0`、request failures `0`；desktop 僅保留一筆已知 Three.js driver precision info log。
- 回歸截圖：desktop 終章與 mobile fallback 均已產出並人工檢視正常；preview 已停止。修正後 `npm.cmd run build` exit 0、typecheck exit 0、指定檔案 Prettier check 通過。

## Phase 1 C Hero Lab desktop zero-warning investigation（2026-09-02）

- 根因確認：目前唯一 warning 是 Three.js PMREM 內建 GGX shader 在 NVIDIA/ANGLE D3D11 上回傳的 program info log；不是 app custom shader compile error，也沒有 page error。
- API 評估：Three.js `WebGLProgram` 的 `renderer.debug.checkShaderErrors` 關閉後可避免讀取/輸出 `getProgramInfoLog`，但同時會隱藏真正的 shader compile/link error；不列為安全 production fix。
- 資產/依賴評估：checkout 沒有 HDR/EXR/KTX/環境貼圖資產，`three` 也不是直接 dependency；預烘焙環境貼圖、pin/upgrade Three.js 或改用非 PBR 反射都會引入新資產/依賴或改變既有終章視覺，需另行決策。
- 決定：不修改 renderer diagnostics、不改 material precision、不替換 PBR environment mapping；目前保留單一 PMREM 與已知 driver info log，既有 build/test/visual regression 維持綠燈。
- C 級決策待確認：產品可選擇接受 driver info log，或另提供預烘焙 environment asset / 指定 Three.js 版本與完整驗收矩陣；未取得其中一項明確決策前不再擴大實作。

## 已修改檔案

- `D:\Users\User\Desktop\gencko-vercel\docs\ui-redesign-progress.md`
  - 目的：建立 Phase 0 checkpoint、完整 inventory、B2 before/after IA、URL/SEO 提案與續作點
  - 是否原本 dirty：`docs/` 目錄原本即為 untracked
- `D:\Users\User\Desktop\gencko-vercel\components\BackgroundInteractiveGrid.vue`
  - 目的：B1 手機效能與規則修正；僅在精確游標裝置註冊 `mousemove` / `mouseleave`
  - 是否原本 dirty：否
- B2 導覽契約與殼層：`utils/site-navigation.ts`、`components/TheNavbar.vue`、`components/TheBottomNav.vue`、`components/TheFooter.vue`、`tests/site-navigation.spec.js`。
- B2 Hub：`pages/start-here.vue`、`pages/why-gencko.vue`、`pages/genes/index.vue`。
- B2 SEO：`utils/site-seo.ts`、`utils/seo-schemas.ts`、`server/api/_sitemap-urls.ts`、`nuxt.config.ts`、`components/HeroLabPage.vue`、`pages/profile.vue`、`pages/identity/[id].vue`、`pages/compare.vue`、`pages/stories.vue`。
- Breadcrumb 首頁 URL：`pages/about.vue`、`pages/articles/[id].vue`、`pages/articles/index.vue`、`pages/auction/[id].vue`、`pages/auction/index.vue`、`pages/breeders.vue`、`pages/calculator.vue`、`pages/care.vue`、`pages/genes/[id].vue`、`pages/health.vue`、`pages/hospital.vue`、`pages/merch/[id].vue`、`pages/merch/index.vue`、`pages/product/[id].vue`、`pages/qs.vue`、`pages/shop/index.vue`。
- Phase 1 Design System 第一批：`assets/css/style.css`、`components/PageHero.vue`、`components/NextCta.vue`、`components/SkeletonCard.vue`、`tests/design-system.spec.js`。
- Phase 1 共用殼層第二批：`components/TheMarquee.vue`、`components/TheLightbox.vue`、`components/TheToast.vue`、`tests/common-shell.spec.js`。
- Phase 1 共用殼層第三批：`components/TheBackButton.vue`、`components/AppMarquee.vue`、`components/TheNavbar.vue`、`tests/shared-interaction.spec.js`。
- Payload / 首頁穩定性：`pages/home.vue`、`components/home/HotPicksMarquee.vue`；共用連結的 `no-prefetch` 已包含於 Navbar、BottomNav、Footer 修正。
- Phase 1 共用互動元件第四批：`components/ShopFlipCard.vue`、`components/Timeline.vue`、`components/GradientButton.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 互動卡片與 payload 入口修正：`components/InteractiveGridPattern.vue`、`components/AtroposCard.vue`、`components/HomeHotPickTiltCard.vue`、`components/HomeScenarioTiltCard.vue`、`components/HeroLabPage.vue`、`components/BrandServiceScrollScene.vue`、`pages/home.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 全站 NuxtLink payload 防護：`components/NextCta.vue`、`components/Timeline.vue`、`components/ShopFlipCard.vue`、`pages/start-here.vue`、`pages/guide.vue`、`pages/care.vue`、`pages/articles/[id].vue`、`pages/articles/index.vue`、`pages/compare.vue`、`pages/genes/index.vue`、`pages/profile.vue`、`pages/qs.vue`、`pages/why-gencko.vue`、`pages/stories.vue`、`pages/merch/index.vue`、`pages/product/[id].vue`、`pages/shop/index.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 FAQ、健康與醫院互動 audit：`pages/faq.vue`、`pages/health.vue`、`pages/hospital.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 Auction 與 Breeders 互動 audit：`pages/auction/index.vue`、`pages/auction/[id].vue`、`pages/breeders.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 Shop、Merch 與 Product 互動 audit：`pages/shop/index.vue`、`pages/merch/[id].vue`、`pages/product/[id].vue`、`tests/shared-interaction.spec.js`。
- Demo 詳情空資料與 hydration 修正：`pages/merch/[id].vue`、`pages/product/[id].vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 Compare、Profile 與 Identity 互動 audit：`pages/compare.vue`、`pages/profile.vue`、`pages/identity/[id].vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 Articles 與 Genes 互動 audit：`pages/articles/index.vue`、`pages/articles/[id].vue`、`pages/genes/index.vue`、`pages/genes/[id].vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 Content pages、Care 與 QS 互動 audit：`pages/start-here.vue`、`pages/stories.vue`、`pages/why-gencko.vue`、`pages/guide.vue`、`pages/care.vue`、`pages/qs.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 About 場景手機降級 audit：`components/BrandServiceScrollScene.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 About mobile 粒子 fallback：`components/MobileParticleField.vue`、`components/BrandServiceScrollScene.vue`、`tests/shared-interaction.spec.js`。
- Phase 2 /home Hero 與品牌信任導流：`pages/home.vue`、`tests/shared-interaction.spec.js`。
- Phase 3 /shop 手機篩選 Drawer：`pages/shop/index.vue`、`tests/shared-interaction.spec.js`。
- Phase 3 /breeders 檔案館式卡片：`pages/breeders.vue`、`components/ShopFlipCard.vue`、`tests/shared-interaction.spec.js`。
- Phase 3 /auction 狀態與 action responsive：`pages/auction/index.vue`、`pages/auction/[id].vue`、`tests/shared-interaction.spec.js`。
- Phase 3 /product/:id 商品詳情 responsive：`pages/product/[id].vue`、`tests/shared-interaction.spec.js`。
- Phase 1 A/B1 Calculator 互動控制 audit：`pages/calculator.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 C Hero Lab mobile Canvas 降級：`components/HeroDnaGecko.vue`、`components/HeroLabPage.vue`、`tests/shared-interaction.spec.js`。
- Phase 1 C Hero Lab PMREM warning tuning：`components/DnaGeckoParticles.vue`、`tests/shared-interaction.spec.js`。

## 已知 warning / blocker / 風險

- Blocker：
  - Issue #5 blocker 已解除。
  - B2 approval gate 已解除且本輪內容完成；目前沒有阻擋 Phase 1 A/B1 的 blocker。
- 既有工作樹風險：
  - `app.vue`、`pages/home.vue`、`tests/calc-utils.spec.js`、`.gitignore` 已有使用者既有修改。
  - `components/home/`、`utils/route-tab.ts`、`hero-card-shop.png` 為既有未追蹤內容，若後續需接手必須先讀懂。
- 環境 warning：
  - git 多次顯示 `C:\Users\User/.config/git/ignore` permission denied warning。
  - Issue #5 規定的 Inspira UI auto-import 前提在目前 checkout 未成立；新 package/module 屬 C 級，未安裝。
  - Build 保留既有 warning：client chunk 超過 500 kB、Nitro cache-driver external、Node trailing-slash exports deprecation。
  - `BackgroundInteractiveGrid.vue` 全檔原本未符合 Prettier；未為此擴大格式化既有程式，只保留 scoped diff。
- 本次補充的 `Error preloading payload` 直接相關共享入口已關閉 NuxtLink 自動預取，且最新 production bundle 與單一 3000 dev browser smoke 均無 preload failure；先前重複 Nuxt dev process、7 組殘留 smoke 子樹共用資源並觸發 Node heap OOM 仍是開發流程風險。Nuxt dev 不得與另一個 dev 或 build 同時執行，修改後應重啟單一 dev server。
  - 本批 production preview 首次因 Nuxt CLI 將分開的 `--host 127.0.0.1` 誤解析為 positional path 而未啟動；改用 `--host=127.0.0.1` 後驗證成功，非應用程式 blocker。
- 本批 fresh build 前曾有使用者啟動的 Nuxt dev tree：PID `6636`（`npm run dev`）、`27116`（Nuxt dev）及其 worker `26676`、`27220`；已在 build 前釋放，3400 preview 驗證後也已停止。`.tmp-dev-3000.err.log` / `.tmp-dev-3100.err.log` 曾記錄 Node heap OOM，後續仍不得讓 Nuxt dev 與 build/preview 並行。
- Calculator build blocker 已解除；後續仍須維持 Nuxt dev、preview、build 不並行，避免再次由 `.output` 工作目錄持鎖。
- Hero Lab desktop `/`、`/hero-lab` 的 browser smoke 已不再出現 `sigmaRadians` clipping warning；PMREM 單一 prefilter 後仍有一筆 GPU driver shader precision info log，沒有 page error。這不是目前可由應用層安全判定為失敗的 exception，若要完全消除需另做替代 environment prefilter 與 GPU/browser matrix investigation。
- 未驗證：
  - 已完成 Playwright touch/coarse-pointer 模擬，但尚未在實體 iOS/Android 裝置量測 event listener 與效能。

## 下一個精確動作

- 本機可執行的 Phase 0–6 UI 工作、跨路由驗證、無障礙互動修正與 production build 均已完成；下一個精確動作是由使用者在目前工作樹進行整站視覺驗收。若發現具體畫面或操作問題，再建立 focused fix；部署不屬本次任務，也不是下一個 UI 步驟。
- `pages/about.vue` 與 `BrandServiceScrollScene.vue` 的桌機 3D、ScrollTrigger/native-touch 深度效能仍屬獨立高風險項目；本批未擴大修改 About 場景。
- `app.vue`、`tests/calc-utils.spec.js`、`.gitignore` 與 `utils/route-tab.ts` 仍視為使用者既有工作；`pages/home.vue` 本次只保留必要的 explicit import，不擴大修改其既有 hunks。
- C 級 Hero Lab mobile mount gate、PMREM sample tuning、單一 prefilter iteration 與 desktop shader/frame baseline 已在本次明確授權範圍內完成；若進行替代 environment prefilter 仍需獨立 focused scope。本輪 preview process 已停止，沒有 3000/3100/3400 listener。

## Checkpoint revalidation（2026-09-03）

- 本次續作已重新核對工作樹與 progress；既有 dirty / untracked 檔案均保留，沒有執行清理、reset 或 commit。
- 最近一次正式驗證仍有效：About mobile particle fallback 已完成；Phase 2 `/home` focused slice 與 Phase 3 `/shop`、`/breeders`、`/auction`、`/product/:id` focused slice 及 cross-route regression 已完成；full test `87/87`、typecheck exit 0、production build exit 0、Hero Lab desktop scroll-space 可到終章、Hero Lab mobile `canvas=0` 且 scroll-space `0px`；About mobile 的新增粒子為 DOM/CSS `20` 顆，既有 `TheDnaDecor` 另有 `canvas=1`；`/home`、`/shop`、`/breeders`、`/auction` 與真實 `/product/S-53518` desktop/mobile browser smoke 無 errors；final working-tree review 已確認一次性腳本與本輪 preview log 移除、指定 ports 無 active listener。
- 最近一次正式驗證補充：單一 Nitro production server 的 `/about` touch/coarse revalidation 在 no-preference 與 reduced-motion 均完成 scene `0 -> 1`；粒子與 fallback 數量正確，三種 browser state 無 page error、console error 或 request failure。
- 外部圖片 proxy 調查：desktop cross-route 唯一失敗 request 是 `/identity/:id` 自有 `wsrv.nl` optimizer 對一張 jsDelivr 圖片的請求；PowerShell 直接請求同一 URL 亦因 SSL connection 無法建立。此屬外部 CDN/proxy 風險，尚未擴大成全站 image strategy 變更。
- 本輪 fallback 修正：`pages/identity/[id].vue` 改用共用 `getCleanUrl()`，並在 `wsrv.nl` 代理失敗（含 hydration 前已完成但 `naturalWidth=0`）時降級到正規化後的 Raw/Drive 原始來源；原始來源也失敗才顯示 `No Image`。targeted contract `52/52`、完整 test `87/87`、typecheck 與 fresh production build 均通過，瀏覽器攔截代理的 runtime 驗證亦成功。
- 本輪 `/auction` 資料驗證：唯讀 Supabase query（2026-09-03）確認正式庫只有 1 筆 `auctions`，雖 `status='active'`，但 `end_time` 為 2026-07-04，已不符合前台 `end_time > now()` 條件；`auction_bids` 為 0。實際 `/auction/S-41201` browser smoke 能載入資料、顯示「已結標」、顯示空出價紀錄並隱藏 active 出價操作，無 page/console error。
- C 級競標資料與安全已獲使用者明確核准並完成：`public.auctions` 與 `public.auction_bids` 啟用 RLS、僅保留公開讀取 policy；`public.blacklist` 啟用 RLS 且不開放前台讀取。新增 `auction_bids.user_id`、column grants 與 private `security definer` RPC，出價由伺服器端 `auth.getUser()` 驗證後原子鎖定拍賣列、檢查狀態/時間/最低加價/黑名單、寫入及三分鐘延長；公開回傳不含 `phone/user_id`。
- 前端出價已改接 `/api/auctions/:id/bid`；LINE localStorage 身份暫不允許出價，需 Google/Supabase session。競標詳情與個人頁改用安全欄位查詢及身份 RPC，詳情以 15 秒輪詢取代可能暴露完整 INSERT payload 的公開 Realtime。
- 已套用 migration：`20260903021811_secure_auction_bidding` 與 `20260903030000_secure_auction_status_guard`。資料庫驗證確認三張表 policy、bid column grants、兩組 RPC execute privilege 及 NULL status guard 均符合預期；未建立 active 正式測試資料，正式庫現有競標仍是已過期的 `S-41201`。
- 已完成 rollback-only RPC integration test：transaction 內使用既有 auth user 模擬 authenticated claim，建立短效 active auction、成功出價 `110`、驗證三分鐘延長及安全 bid response 後 rollback；殘留檢查為 `leftover_test_auctions=0`、`persisted_bid_count=0`。
- 本輪程式驗證：targeted contract `54/54`、全量測試 `89/89`、`npm.cmd run typecheck` 通過、production `npm.cmd run build` 通過；preview smoke `/auction/S-41201` 為 `200` 且顯示已結標，未登入 bid API 為 `401`。Build 仍有既有 chunk/cache-driver/Node deprecation warnings。
- 下一個精確動作：authenticated auction success smoke 已完成；下一個工作為依使用者決策進行 deploy 前檢查或處理獨立的 About 真機驗證。部署不是本階段自動動作；desktop zero-warning 仍等待產品決策。
- Deploy preflight 已完成；下一個精確動作是由使用者決定是否整理/核准 commit 與部署範圍，或改做獨立的 About 真機驗證。未取得明確部署核准前不執行 `git add`、commit、push 或部署。

## Final non-deploy verification（2026-09-03）

- 本批針對 Nuxt payload / SSR 穩定性完成一次性修正：`scripts/patch-pinia.mjs` 同時修補 Pinia development 與 production bundle 的 null-prototype `hasOwnProperty` 呼叫；`playwright.config.ts` 改用獨立 `E2E_PORT`（預設 `3001`）並自動啟動單一 E2E dev server，避免誤接既有 `3000` preview 或多個 Nuxt process。
- E2E 補強：desktop Hero Lab 才等待 3D state，mobile 驗證 DOM/CSS fallback 且不掛載 canvas；Shop 等待 hydration 後的資料、empty state 或 skeleton；新增 Pinia patch contract。結果為 `14 passed / 5 skipped`，5 個 skip 是 mobile 專案刻意略過 desktop-only Hero 測試，mobile fallback 測試通過。
- 最終驗證：`npm.cmd run test` 為 `90/90`、`npm.cmd run typecheck` exit 0、`npm.cmd run build` exit 0、指定檔案 `git diff --check` 無 whitespace error。Build 未再出現 `.output` EBUSY；僅保留既有 chunk/cache-driver/Node deprecation warnings。
- Production preview smoke：`/home` `200`、`/shop` `200`、未知路由 `/totally-does-not-exist` `404`；preview stderr 無錯誤。所有本批啟動的 preview/E2E process 已停止，未留下 `3000`、`3001`、`3510` 等 listener。
- 本批未執行部署、`git add`、commit 或 push。工作樹既有 dirty / untracked 內容全部保留，未執行清理或 reset。

## 最終 Checkpoint（2026-09-03）

- 已完成：除部署以外，目前 brief、B2 核准範圍、Phase 1 A/B1/C、Phase 2 `/home`、Phase 3 `/shop`/`/breeders`/`/auction`/`/product/:id`、競標安全流程、payload/SSR 穩定性、runtime smoke、E2E、typecheck、production build 與文件 checkpoint 均已處理。
- 尚未完成且不是本機可代替的事項：實體 iOS/Android 裝置上的原生 touch listener 與效能量測；Hero Lab desktop 已知 GPU driver PMREM info log 的零 warning 決策；是否部署仍明確排除於本次範圍。
- 下一個精確動作：使用者一次檢查目前工作樹與網站驗證結果；若發現具體問題，再針對該問題開新 focused fix。未取得新的明確部署指示前，不執行部署流程。

## Final two-axis review and matrix closure（2026-09-03）

- 審查方式：依「工程標準／安全」與「redesign brief／已核准 B2 規格」兩條軸線平行檢查目前工作樹；沒有清理、reset、stash、commit、push 或部署。
- 響應式特效 gate：`BrandServiceScrollScene`、`AtroposCard`、`BackgroundInteractiveGrid`、`InteractiveGridPattern` 的 JS/CSS 條件補齊 `min-width: 768px`、`hover: hover`、`pointer: fine`，避免窄螢幕但具精確游標的裝置掛載 WebGL、tilt 或滑鼠追蹤。
- 路由與 SEO：`/hero-lab` 正確歸類為 Hero Lab，不再誤用首頁 active state；`/home` 補與 canonical 一致的 `og:url`；桌機 `/home`、`/profile` 導覽補 active class 與 `aria-current`。
- 可及性與語意：會員頁醫院收藏移除鈕由重複 `❤ > ❤` 修正為單一圖示並補明確 `aria-label`；Shop 只在手機篩選 Drawer 實際開啟時宣告 `role="dialog"` 與 `aria-modal="true"`，桌面固定側欄維持一般 region。
- 工具鏈韌性：`scripts/patch-pinia.mjs` 在必要 Pinia bundle 缺失或預期 patch 形狀不存在時改為 non-zero exit，避免 postinstall 靜默成功；Playwright web server 依平台選用 `npm.cmd` 或 `npm`，保留 Windows 並支援 Linux CI。
- TDD 與 unit：新增 Pinia 真實暫存 fixture、特效 768px gate、路由與語意 contracts；fresh `npm.cmd run test` 為 `6 files / 93 tests passed`。
- E2E：Shop 定向案例為 `1 passed`；完整 Playwright 為 `24 passed / 5 skipped / 0 failed`。五個 skip 是 mobile 專案刻意略過 desktop-only Hero 測試；mobile Hero fallback 另有獨立通過案例。
- 驗證矩陣：`320 / 390 / 768 / 1024 / 1440 / 2560px` 的 `/home`、`/shop`、`/hospital`、`/faq` 均無 404、runtime error 或橫向溢位；390px coarse-touch 已驗證主題切換、Shop 排序／比較、Hospital 篩選／展開／收藏／電話／地圖與 FAQ 分類／accordion，不依賴 hover。
- `S-41201` 證據校正：前文「2026-07-04 已過期／0 bid」是使用者延長截標前的時間點快照，已被後續狀態取代；最新有效證據為使用者將截標改至次日，並以登入 session 成功建立 `$100` 出價、詳情顯示 1 筆 bid 且會員頁同步。歷史段落保留作調查軌跡，不再代表目前狀態。
- Supabase 安全稽核：唯讀 advisor 發現 `public.merchandise`、`articles`、`config`、`genetic_pages`、`animals`、`breeding_records`、`clutches`、`hatchlings`、`expenses`、`breeding_events` 共 10 張 public tables 未啟用 RLS；另有 security-definer views、mutable search path functions 與 leaked-password protection 未開啟。這些是既有全站資料庫風險，不屬已核准的競標 scoped migration；依規範未自動修改，以免中斷現有前台讀寫。
- 剩餘人工項目：實體 iOS/Android 的 native-touch listener 與效能量測、Hero Lab desktop GPU driver PMREM info log 是否要求零 warning，以及全站 Supabase RLS／view／function 安全修復的獨立授權。部署仍排除於本次範圍。
- 最終靜態驗證：fresh `npm.cmd run typecheck` exit 0；fresh `npm.cmd run build` exit 0，完成 client、SSR、10 個 prerender routes、PWA 與 Nitro server，未再出現 `.output EBUSY`。僅保留既有 large chunk、Nitro cache-driver external、Node exports deprecation 與 sharp architecture 提示。
- 收尾檢查：本輪檔案 Prettier check 通過；全工作樹 `git diff --check` exit 0，只有 LF → CRLF 提示，無 whitespace／conflict error；`3000 / 3001 / 3100 / 3400 / 3500 / 3510` 均無 listener。
- 下一個精確動作：交由使用者檢查目前網站與工作樹。後續唯一可立即進入的新工程任務，是在取得明確資料表存取矩陣與 C 級授權後，分批處理全站 Supabase 安全 advisory；不得直接批次啟用 RLS。部署仍不執行。

## Phase 3–6 batch continuation checkpoint（2026-09-03，因用量中斷）

- 使用者本批要求：移除 `/home` 首屏「找到適合你的守宮，從理解開始」整句；直接完成 Phase 3 剩餘頁面與 Phase 4、5、6；不部署。
- `/home`：指定主標題的 `<h1>` 容器已移除，三段不再使用的 `.hero-main-title` CSS 亦已移除；eyebrow、說明與 CTA 保留。尚未跑本批 runtime screenshot。
- Phase 3 production 已寫入：`pages/merch/index.vue`、`pages/merch/[id].vue`、`pages/compare.vue`、`pages/identity/[id].vue`；新增 `tests/e2e/phase3-remaining.spec.ts`。負責代理在最終回報前因用量保護被停止，故此批必須先做 diff／語法／資料契約審查，不得直接標記完成。
- Phase 4 production 已寫入：`pages/calculator.vue`、`pages/genes/index.vue`、`pages/genes/[id].vue`、`pages/hospital.vue`、`pages/health.vue`、`pages/qs.vue`；新增 `tests/e2e/phase4-tools.spec.ts`。代理回報 SFC parse、Prettier、scoped diff check 通過；未跑 production 後的 Playwright、typecheck 或 build。
- Phase 5 production 已寫入：`pages/articles/index.vue`、`pages/articles/[id].vue`、`pages/care.vue`、`pages/guide.vue`、`pages/faq.vue`、`pages/buying-guide.vue`、`pages/why-gencko.vue`、`pages/start-here.vue`、`pages/stories.vue`、`pages/profile.vue`；新增 `tests/e2e/phase5-content.spec.ts`。代理回報 10 個 SFC template parse、Prettier、scoped diff check 通過；未跑 production 後的 Playwright、typecheck 或 build。
- Phase 6：既有 `/about` desktop TresJS／mobile CSS particles 與 `/hero-lab` mobile fallback 邏輯保持不變；新增 `tests/e2e/phase6-special.spec.ts`，驗證 desktop/mobile mount gate、reduced-motion 與 mobile scroll-space。此測試尚未執行。
- 保護邊界：未安裝套件，未修改 genetics 演算法、機率、QS 計分、Supabase schema/query、醫院資料、登入/session、收藏或購買契約；未執行 commit、push 或部署。既有 dirty/untracked 檔案未清理。
- 背景狀態：三個 subagents 均已關閉；`3000 / 3001 / 3100 / 3400 / 3500 / 3510` 均無 listener；可安全啟動單一驗證流程。
- 尚未完成：本批所有 production 修改的主代理 diff review；Phase 3 interrupted batch 完整性；Prettier；unit；typecheck；Phase 3/4/5/6 Playwright；六尺寸與 light/dark/reduced-motion 視覺巡檢；production build；更新最終完成狀態。
- 下一個精確動作：先逐一審查 `pages/merch/index.vue`、`pages/merch/[id].vue`、`pages/compare.vue`、`pages/identity/[id].vue` 與 `tests/e2e/phase3-remaining.spec.ts` 的本批新增區塊，確認 interrupted agent 沒有半成品；接著串行執行 `npx.cmd prettier --check`（本批檔案）→ `npm.cmd run test` → `npm.cmd run typecheck`。修正靜態錯誤後，再依序跑 `phase3-remaining`、`phase4-tools`、`phase5-content`、`phase6-special` E2E，最後才跑完整 E2E 與 `npm.cmd run build`。Nuxt dev／Playwright／build 不得並行。

## Phase 3–6 final UI closure（2026-09-03）

- 指定文案：`/home` 的「找到適合你的守宮，從理解開始」及不再使用的樣式已移除；全站矩陣另以負向斷言確認該句不會重新出現。
- Phase 3：`/merch`、`/merch/:id`、`/compare`、`/identity/:id` 已完成資訊層級、狀態、比較、外部購買提示與手機可讀性；連同既有 `/shop`、`/breeders`、`/auction`、`/product/:id` 完成整組驗證。
- Phase 4：`/calculator`、`/genes`、`/genes/:id`、`/hospital`、`/health`、`/qs` 已完成專業工具資訊架構與手機單欄。Calculator 說明視窗補齊 `dialog` 語意、焦點鎖定／還原、Escape 關閉與 body scroll lock。
- Phase 5：文章索引／內頁、care、guide、FAQ、buying-guide、why-gencko、start-here、stories、profile 已完成閱讀層級、任務導流、FAQ 狀態與購買信任鏈。
- Phase 6：About desktop 3D、mobile CSS 粒子、reduced-motion，以及 Hero Lab mobile 無 Canvas／短 scroll-space 降級均已驗證。手機粒子需求已涵蓋，不在手機掛載高耗能 WebGL。
- 最終盤點追加修正：768px 導覽 breakpoint 改為符合規格的 desktop navbar；`ShopFlipCard` 移除「互動按鈕巢狀於整卡連結」結構，桌機與行動控制改為獨立 overlay，並修正 coarse-touch 按鈕被整卡連結遮擋。
- 全站視覺矩陣：`/home`、shop/breeders/auction/merch/compare、calculator/genes/hospital/health/qs、articles/care/guide/faq/buying-guide/why-gencko/start-here/stories/profile 共 20 個入口，於 `320 light`、`390 dark`、`768 light`、`1440 dark` 共 80 組導航皆無 404、runtime page error 或橫向溢位。最新首頁／信任區截圖位於 `output/playwright/final-ui-home-*` 與 `output/playwright/final-ui-trust-*`。
- 關鍵互動 E2E：Navbar dropdown、Bottom Sheet focus／scroll lock、Breeders species tabs、Shop 搜尋／收藏／比較、Calculator 物種／角色／反轉／鍵盤 modal 均通過；390px coarse-touch 流程亦通過。
- 最終驗證：`npm.cmd run test` 為 `6 files / 93 tests passed`；`npm.cmd run typecheck` exit 0；完整 Playwright 為 `56 passed / 7 skipped / 0 failed`，skip 均為同一案例在不適用 project 的刻意分流，對應 desktop/mobile 案例已通過；Prettier check 通過；全工作樹 `git diff --check` exit 0，只有 LF → CRLF 提示。
- Production build：exit 0，client、SSR、10 個 prerender routes、PWA 與 Nitro server 完成，未出現 `.output EBUSY`。保留既有 large chunk、Nitro cache-driver external、Node exports deprecation 與 sharp architecture 提示。
- 雙軸審查結論：工程／無障礙軸與 brief／B2 規格軸均未發現尚可在本機直接修正的 UI 缺口。未執行清理、reset、`git add`、commit、push 或部署；既有 dirty／untracked 工作完整保留。
- 非本機 UI 待辦：實體 iOS/Android native-touch listener 與效能量測；Hero Lab desktop GPU driver PMREM precision info log 是否要求零 warning 的產品決策。這兩項都不能由 Chromium 模擬等價取代。
- 下一個精確動作：使用者依最新工作樹進行整站視覺與操作驗收；若回報具體問題，直接從該路由做 focused fix。除真機驗證與外部決策外，brief 內沒有剩餘 UI 實作任務；部署持續排除。

## Boutique overhaul v0（2026-09-04）

- 使用者否決既有蜂巢／橘框／卡片堆疊視覺，指定新方向為「簡潔、乾淨、好看、高質感、精品」。本輪採 `Redesign · Overhaul`，保留路由、真實資料、功能、亮暗模式、Hero Lab 與 About 特殊場景。
- 設計系統：暖白 `#f5f3ee`、紙白 `#fffefa`、墨黑 `#171714`、灰褐文字、低飽和品牌橘；新增 Noto Serif TC 作展示標題。圓角降為 3–10px、移除滿版蜂巢與強光暈，陰影改為極淡層級。
- 全域殼層：公告跑馬改為 32px 黑色資訊帶；Navbar 改為 64px 細線導覽；Footer 改為墨黑品牌資訊區；BottomNav／Bottom Sheet 移除橘色塊、厚圓角與卡片感。
- `/home`：Hero 改用本地真實守宮照片 `assets/NDBE.jpg`，採大字與非對稱留白；快捷入口移除 Emoji 並改編號導覽；熱門精選移除雙跑馬／斜卡，改為四件靜態商品型錄；文章與品牌信任區改為編輯式網格與細分隔線。
- 測試契約同步：首頁不再要求 `HotPicksMarquee`，改驗證 `featuredAnimals` 靜態四件型錄；全站矩陣等待 selector 改為 `.home-product-grid`。
- 驗證：`npm.cmd run test` 為 `93/93`；`npm.cmd run typecheck` exit 0；320px light 最新案例通過 20 個主要入口且無橫向溢位／runtime error；完整四尺寸矩陣在 Hero 圖片最終修正前曾為 `4/4` 通過。1440px dark 與 320px light 成品已人工檢視，真實圖片、Navbar、標題與留白正常。
- 視覺證據：`output/playwright/final-ui-home-1440-dark.png`、`output/playwright/final-ui-home-320-light.png`。
- 下一個精確動作：等待使用者確認此極簡精品 v0。核准後，依序將同一系統擴散到商品選購、工具、知識內容、品牌信任四套頁面骨架，再跑完整 4 尺寸／20 路由矩陣與 production build；未核准前不盲目批次修改其餘頁面。

## Boutique v0 補充規格（2026-09-04）

- 頂部公告：`app.vue` 已完全移除 `<TheMarquee>` 掛載，Navbar 改貼齊 safe-area top，body 上方預留由 96px 收為 64px；新增 unit contract 防止公告跑馬誤加回來。
- 熱門精選：依使用者要求恢復跑馬燈，採單列 `HotPicksMarquee`；移除雙列、反向列、3D 傾斜、重疊、背板與 Emoji placeholder，改為平面等距圖片卡。細節造型等待使用者後續指定。
- 品牌色：全域主橘恢復原 `#e8440a` 系列，日間可及文字橘維持 `#cc3b08`；Navbar 與 Footer 的 `GENCKO` 品牌文字恢復橘色，亮色背景改回純白，主要 CTA 改為橘底白字。
- 驗證：Vitest `94/94`、typecheck、diff check 通過；更新後四尺寸／20 路由矩陣 `4/4` 通過，320px 最終 CTA 與品牌色補丁後另跑 `1/1` 通過。無測試伺服器 listener，未部署。
- 下一個精確動作：等待使用者補充熱門精選跑馬燈的視覺細節；若先確認整體 v0，則從商品選購骨架開始擴散白底橘色極簡精品系統。

## Boutique 選購骨架 v1（2026-09-04，互動與比例已由 v2 取代）

- `/shop`：新增可見的編輯式 H1、英文 eyebrow、簡短選購說明與即時個體數摘要；搜尋、物種切換、排序與快捷篩選改為細線工具列，桌機篩選側欄移除卡片容器與厚重圓角，手機 Drawer 保留原焦點鎖定與操作流程。
- `ShopFlipCard`：取消桌機 3D 翻面、互動格線與重複背面按鈕；商品名稱、性別、生日、基因、更新日期及價格改為正面直接掃讀。整卡詳情連結、收藏、比較、找相似、狀態與展場模式契約均保留，鍵盤順序為詳情 → 收藏 → 比較。
- 視覺規格：白底、原品牌橘、4:5 圖片、細分隔線、小圓角、無卡片陰影；手機維持兩欄型錄，桌機改為三欄並增加垂直留白。
- 驗證：targeted Vitest `64/64`、typecheck、Prettier、scoped diff check 通過；Playwright Shop 載入、手機 Drawer、390px coarse-touch、搜尋／收藏／比較共 `4/4` 通過。390px 全頁截圖為 `output/playwright/boutique-shop-mobile.png`，無橫向溢位或按鈕遮擋。
- 本批未執行 build、commit、push 或部署；驗證用 3000/3100 listener 均已停止。
- 下一個精確動作：將同一選購骨架擴散至 `/breeders` 與 `/auction` 列表，統一頁首、狀態標籤、卡片比例與手機資訊密度；之後處理 `/merch`、`/product/:id`、`/compare`、`/identity/:id`。

## Boutique 選購骨架 v2（2026-09-04）

- 使用者校正規格：`ShopFlipCard` 必須保留桌機 hover／focus 翻面、互動格線、背面性別／生日／上傳日期／價格與背面收藏／比較操作；手機維持正面獨立按鈕及必要 metadata。v1 的平面卡片決策已撤回。
- 全站商品與個體圖片維持 `1:1`：`/shop`、`/breeders`、`/auction`、`/merch`、`/merch/:id`、`/product/:id`、`/compare` 與 `/identity/:id` 均已校正；不再裁切為 4:5、4:3 或 16:10。
- 導覽修正：桌機選單連結點擊後保留該群組 dismissed 狀態，直到游標離開，避免 route watcher 清空後被 `hover/focus-within` 重新顯示；手機 Bottom Sheet 連結點擊當下主動關閉並解除 body scroll lock，即使跳到相同路由也有效。
- 選購頁擴散：`/breeders`、`/auction` 改用正式可見 H1、serif 標題、細線 tabs 與低裝飾型錄；`/merch`、商品／周邊詳情、比較及身分證統一白底橘色、1:1 圖片、小圓角與低陰影。路由、資料、價格、競標倒數、收藏、比較、購買與列印契約不變。
- 驗證：Vitest `94/94`、typecheck、scoped diff check 通過；關鍵互動 Playwright `5/5`（含桌機／手機選單跳轉關閉、Shop 實際 1:1 與翻面、收藏比較）；Phase 3 remaining `4/4`；四尺寸／20 路由矩陣 `4/4`，共 80 次入口載入無 404、runtime error 或橫向溢位。
- Production build：`npm.cmd run build` exit 0，client、SSR、10 個 prerender routes、PWA 與 Nitro server 全數完成，未出現 `.output EBUSY`。
- 本批未執行 commit、push 或部署。下一個精確動作：使用者一次驗收 `/shop`、`/breeders`、`/auction`、`/merch`、商品詳情、比較與身分證；若回報具體頁面問題，從該路由進行 focused fix。

## Boutique 全站收斂 v3（2026-09-04）

- 範圍：在既有 Phase 4／5 路由上補齊同一套白底、原品牌橘、編輯式標題、細邊框與低裝飾系統；未變更 IA、路由、SEO、資料查詢、演算法、評分、登入或互動狀態。
- 工具與資料頁：`/calculator`、`/genes`、`/genes/:id`、`/health`、`/qs`、`/hospital` 降低非語意性陰影、大圓角與裝飾背景；健康風險、評估分級及溫度區段仍保留原本具意義的色彩與邏輯。
- 知識與信任頁：`/care`、`/guide`、`/faq`、`/articles`、`/articles/:id`、`/buying-guide`、`/why-gencko`、`/start-here`、`/profile` 改為小圓角、細分隔與 `Noto Serif TC` 展示標題。文章、基因、品牌信任頁的主要影像容器統一為 `1:1`、`object-fit: cover`；使用者上傳照片比例要求不再被舊 4:3 規則覆蓋。
- 保護邊界：保留 `/about`、`/hero-lab` 的特別場景與既有 mobile fallback；沒有重新引入頂部跑馬燈，首頁熱門精選單列跑馬燈也沒有改動。
- 驗證：本批檔案 Prettier 已執行；`npm.cmd run test` 為 `6 files / 94 tests passed`；`npm.cmd run typecheck` exit 0；`npm.cmd run build` exit 0。Build 僅保留既有 large chunk 警告。
- 本批未執行 commit、push、部署、清理或 reset，既有 working tree 保留。
- 下一個精確動作：使用者用桌機與手機實際檢查工具／知識頁的視覺節奏，優先檢視 `/calculator`、`/health`、`/care`、`/articles`、`/why-gencko`、`/profile`；如有具體頁面或元素不符合精品方向，從該路由進行 focused fix。若無具體回報，brief 內已核准的本機 UI 實作沒有新的待辦；部署仍明確排除。

## Boutique 首頁與 Stories 收斂 v4（2026-09-04）

- `/stories`：由漸層、大圓角的預備卡片改為紙本式內容入口。Hero 改用上下細線與兩欄資訊節奏，狀態提示以原品牌橘左側細線標記；內容與導覽入口使用連續分隔線而非卡片堆疊。既有 noindex、canonical、真實內容聲明及三個導流連結均未變。
- `/home` 熱門精選：保留使用者指定的單列自動跑馬燈、商品連結與 Sold／Auction 狀態標籤；只將商品媒體框由直式改為 `1:1`（桌機 `260px`、手機 `180px`），避免使用者上傳的方形照片被舊比例裁切。
- 驗證：Prettier、`npm.cmd run test`（`6 files / 94 tests passed`）、`npm.cmd run typecheck`、桌機 Playwright `phase5-content` 與 `full-ui-matrix`、production `npm.cmd run build` 均完成。E2E 僅有 Node 的 `NO_COLOR` 環境警告；Build 僅保留既有 large chunk 警告。
- 本批沒有改動頂部跑馬燈（仍不存在）、沒有刪除首頁熱門精選跑馬燈，也沒有執行 commit、push 或部署。
- 下一個精確動作：使用者檢查 `/home` 熱門精選與 `/stories` 的桌機／手機成品；若要調整熱門精選的跑馬燈細節，請直接指定卡片資訊密度、文字位置與自動播放速度。其餘已核准 UI 範圍目前沒有新的未完成實作。

## Boutique 直角型錄與 Footer v5（2026-09-04）

- 使用者明確決策：`/shop` 與 `/breeders` 的商品／種群卡不得有圓角；`ShopFlipCard` 的商品外框、圖片、正反面與內容區皆在兩個型錄頁強制為直角。桌機翻面、互動格線、收藏／比較操作與手機 metadata 保留，僅小型控制按鈕維持適合觸控的外形。
- 圖中底部區塊確認為全站 Footer：`TheFooter.vue` 改為純白底、深色本文、原品牌橘 `GENCKO` 與細灰線；日間／深色模式都不再顯示黑色 Footer 背景，原本的四組導覽、社群連結、版權與標語均保留。
- 防回歸：新增 Vitest contract，檢查 Shop／Breeders 直角型錄覆寫與 Footer `#fff` 背景／細頂線。
- 驗證：Prettier 通過；`npm.cmd run test` 為 `6 files / 95 tests passed`；`npm.cmd run typecheck` 通過；桌機 Playwright `ui-interactions-complete` 與 `phase3-remaining` exit 0；production build 完成。E2E 僅有 Node `NO_COLOR` 環境警告，build 只保留既有 large chunk、Nitro cache-driver external 與 Node deprecation 警告。
- 本批未執行 commit、push、部署、reset 或清理；測試伺服器已結束。
- 下一個精確動作：使用者在 `/shop`、`/breeders` 與任一頁底部確認直角卡片和白底 Footer；若仍有指定卡片、按鈕或 Footer 文字密度問題，直接回報該元素即可 focused fix。部署持續不屬下一步。

## Boutique 全選購鏈直角收斂 v6（2026-09-04）

- 後續確認：使用者要求的「卡片不要圓角」延伸到整條選購流程。`/auction`、`/merch`、`/merch/:id`、`/product/:id`、`/compare` 與 `/identity/:id` 的商品圖片、主要商品資訊容器、比較容器與身分證外框均改為 `border-radius: 0`；身分證外框的非必要陰影也移除。
- 範圍控制：狀態標籤、基因標籤、收藏／比較／購買等小型控制仍維持其既有可辨識外形；商品資料、倒數、翻面、價格、比較、列印與購買流程沒有改變。
- 防回歸：Vitest 新增選購鏈直角容器 contract；目前 `6 files / 96 tests passed`。
- 驗證：Prettier、`npm.cmd run test`、`npm.cmd run typecheck` 通過；桌機 Playwright `phase3-remaining` exit 0；production build 完成。僅保留既有 `NO_COLOR` 環境、large chunk、Nitro cache-driver external 與 Node deprecation 警告。
- 本批未執行 commit、push、部署、reset 或清理；測試伺服器已停止。
- 下一個精確動作：使用者檢視整條選購鏈的直角視覺是否符合預期。若希望連按鈕／狀態標籤也完全直角，需明確提出，因為那會影響觸控辨識與狀態層級；部署仍排除。

## Boutique 全站主容器直角收斂 v7（2026-09-04）

- 使用者指出仍有許多頁面尚未改完，故將直角規格擴展至工具、知識、信任與會員系統的主要內容容器：`/calculator`、`/genes`、`/genes/:id`、`/health`、`/qs`、`/care`、`/faq`、`/why-gencko`、`/start-here`、`/guide`、`/articles`、`/articles/:id`、`/buying-guide`、`/profile`、`/hospital`。
- 實作：上述頁面上一輪 boutique 覆寫層中原本保守保留的 `3px` 卡片／面板圓角已統一為 `0`；不改動進度條、圓形頭像、狀態標籤、輸入框或對話框等需要功能辨識的元素。首頁、Stories、全選購鏈與 Footer 的既有直角／白底規則保持。
- 驗證：Prettier 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過；桌機 Playwright `phase4-tools`、`phase5-content`、`full-ui-matrix` exit 0；production build 完成。僅保留既有 `NO_COLOR` 環境、large chunk、Nitro cache-driver external 與 Node deprecation 警告。
- 本批未執行 commit、push、部署、reset 或清理；測試伺服器已停止。
- 下一個精確動作：使用者檢查全站直角系統。若要進一步指定「連哪些按鈕／標籤也要方化」或「哪一個頁面仍不夠簡潔」，以路由與元素回報即可進入 focused fix；部署持續排除。

## Boutique 工具與手冊骨架 v8（2026-09-04）

- 使用者要求繼續擴大改版，而非停在全域圓角覆寫。本輪將 `/calculator`、`/genes`、`/health` 與 `/care` 改為頁面專屬的低裝飾骨架：不是只把舊元件方化，而是讓資訊以細線、留白、編號與必要的品牌橘狀態建立層級。
- `/calculator`：物種、親本、基因分類、計算結果與反向推導面板去除膠囊、陰影和浮動 hover；選取值仍以品牌橘底白字明確標示。既有基因演算法、角色切換、反轉、結果與 modal 行為不變。Chrome HMR 視覺檢視已確認主要工具列與父本卡改為直角檢查表語言。
- `/genes`：快速工具改為連續三欄資料列，篩選改為底線 tabs 與搜尋欄，基因庫項目改為直角目錄列；手機收為單欄，不依賴 hover。
- `/health`：入口卡改為連續三欄檢查項，問卷、判讀與報告區改為平面醫療檢查表。緊急／風險色及原有問卷、判讀、報告、醫院導流邏輯皆保留。
- `/care`：Hero、決策導引、統計、環境／餵食／警訊與相關文章卡改為紙本手冊格線，移除漸層、圓角、懸浮陰影與位移 hover；既有內容、章節 anchor、FAQ 與手機固定導覽保留。
- 驗證：`npx.cmd prettier --write pages/health.vue pages/care.vue pages/genes/index.vue pages/calculator.vue` 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅有既有 LF → CRLF 提示。
- 本輪未執行 build，因使用者目前有本機 Nuxt 開發伺服器，依規範避免與 production build 併用 `.nuxt`。未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：從 `/hospital` 開始做下一輪頁面專屬精品重構，優先移除舊式篩選面板與醫院卡堆疊，再處理 `/qs` 的表單視覺；完成後再逐一巡查文章／品牌頁是否仍有舊的漸層或懸浮卡片語言。

## Boutique 醫院與自評骨架 v9（2026-09-04）

- `/hospital`：保留地區／縣市篩選、搜尋、展開明細、收藏、撥號、地圖與手機觸控行為；篩選面板改為透明的上下細線工作區，結果改為連續醫院名單，展開後的聯絡資訊與動作維持同一列閱讀節奏。移除名單卡片的圓角、陰影與浮動 hover。
- `/qs`：保留題目輪播、答題狀態、分數、雷達圖、風險提示與推薦連結；工具導引、進度、題目、選項、結果、維度與風險改為直角表單／報告區。等級由發光圓形改為純色矩形等級標記，仍以品牌橘清楚區分選取與分數資訊。
- 驗證：`npx.cmd prettier --write pages/hospital.vue pages/qs.vue pages/health.vue pages/care.vue` 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅有既有 LF → CRLF 提示。
- 本輪沒有執行 build，避免使用者現有 Nuxt dev server 與 `.nuxt` 競用。未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：從 `/articles` 與 `/articles/:id` 開始做內容頁專屬巡查，清除殘留的漸層、膠囊篩選與懸浮卡片，並保留文章資料、分類、搜尋、目錄及所有連結行為；之後依序巡查 `/guide`、`/faq`、`/buying-guide`、`/why-gencko`、`/start-here`、`/profile`。

## Boutique 文章閱讀骨架 v10（2026-09-04）

- `/articles`：Masthead 與控制區改為上下細線；分類改為底線 tabs，快捷標籤改為透明文字控制；文章群組改為連續期刊目錄格線，保留分類、搜尋、卡片連結與 1:1 圖片。
- `/articles/:id`：保留文章、目錄、基因自動連結、作者、延伸閱讀、SEO 與資料載入；分類、引用、作者、延伸閱讀從膠囊／浮卡改為連續章節和細線格線，延伸閱讀圖片維持 1:1。
- 格式驗證：`npx.cmd prettier --write pages/articles/index.vue pages/articles/[id].vue` 通過。此前 v9 的 `96/96` Vitest、typecheck、diff check 仍為本工作樹最近一次完整靜態驗證；v10 尚未額外跑 production build，以避免與使用者 Nuxt dev server 共用 `.nuxt`。
- 未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：直接修改 `pages/guide.vue` 與 `pages/faq.vue`，將殘留的流程卡、FAQ 圓角／陰影與膠囊控制改為手冊章節與細線 accordion；保留所有 tab、anchor、accordion、搜尋與手機操作。完成後依序處理 `/buying-guide`、`/why-gencko`、`/start-here`、`/profile`。

## Boutique 導覽與品牌骨架 v11（2026-09-04）

- `/guide`：導覽地圖、比較表、新手四步與 FAQ 摘要改為連續手冊章節；步驟編號改為橘色直角方塊。原本的路由入口、頁內 anchor、比較資料與 CTA 完整保留。
- `/faq`：路由入口、分類 tabs 與答案改為細線索引式手風琴；active tab 與展開答案仍以品牌橘辨識。既有 `aria-expanded`、`aria-controls`、分類切換與手機操作不變。
- `/buying-guide`：Hero 流程 pill、決策路徑與三個檢查點改為直線式交易前檢查清單，保留 `Timeline`、所有連結與 NextCta。
- `/why-gencko`：品牌理由、選購入口、內容預覽改為連續編輯格線；原圖片、信任資料、連結與 CTA 保留，圖片仍為 1:1。
- 驗證：Prettier 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過。本輪不執行 production build，避免與使用者目前的 Nuxt dev server 競用 `.nuxt`。未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：直接修改 `pages/start-here.vue` 與 `pages/profile.vue`，把剩餘的新手路徑與會員面板改為連續章節／帳戶清單；保留登入、收藏、競標、表單、tab、dialog 與所有資料契約。完成後再做全站巡查，定位任何尚未收斂的舊式漸層、陰影與圓角容器。

## Boutique 新手與會員骨架 v12（2026-09-04）

- `/start-here`：知識入口、Hero 流程、三條新手路徑與準備清單均改為連續課綱式格線；編號和必要進度色維持品牌橘。原路由、CTA、知識內容與手機垂直流程完整保留。
- `/profile`：帳戶標題、使用者資訊、tabs、空狀態、登入提示、競標紀錄和醫院收藏改為帳戶清單；頭像、登入方式、收藏、撥號、競標連結與所有 tab／資料載入邏輯未變。
- 驗證：`npx.cmd prettier --write pages/start-here.vue pages/profile.vue` 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅有既有 LF → CRLF 提示。
- 本輪未執行 production build，避免與使用者目前的 Nuxt dev server 競用 `.nuxt`。未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：做最後一輪全站頁面專屬巡查，先檢查 `pages/genes/[id].vue`、`pages/auction/[id].vue`、`pages/product/[id].vue`、`pages/merch/[id].vue` 與 `pages/identity/[id].vue` 是否仍存在非必要的漸層、厚陰影或圓角容器；只修正呈現層，不改資料、出價、購買、列印、分享、SEO 或路由契約。

## Boutique 基因詞條閱讀版 v13（2026-09-04）

- `/genes/:id`：詞條工具列、主詞條容器、警示、影像與資料列改為單篇閱讀版；遺傳模式、年份、來源、原始圖片、警示語意、回到圖鑑與計算機導流均保留。圖片維持 1:1，警示維持紅色左側線而不再使用厚卡片。
- 格式驗證：`npx.cmd prettier --write pages/genes/[id].vue` 通過；v12 的 `96/96` Vitest、typecheck 與 diff check 是最新完整靜態驗證。本次尚未執行 build，以避免與使用者 Nuxt dev server 競用 `.nuxt`。
- 未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：先 focused audit `pages/auction/[id].vue`，將非必要的價格／計時／資訊／紀錄容器統一為直角、細線、低陰影，但不得改動已核准的安全出價、倒數、身份驗證、分享、購買或 modal 行為；接著依序審查 `pages/product/[id].vue`、`pages/merch/[id].vue`、`pages/identity/[id].vue`。

## Boutique 競標詳情收斂 v14（2026-09-04）

- `/auction/:id`：主圖、價格、倒數、出價、規格、備註、紀錄與宣傳 modal 的呈現容器改為直角細線交易單據；規格項目改為連續格線。安全出價 API、倒數、登入／身份驗證、分享、立即購買、競標歷程、modal 與 mobile 版面均未變。
- 格式驗證：`npx.cmd prettier --write pages/auction/[id].vue` 通過。v12 的 `96/96` Vitest、typecheck 與 diff check 是最新完整靜態驗證；本次未執行 build，以避免與使用者 Nuxt dev server 競用 `.nuxt`。
- 未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：focused audit `pages/product/[id].vue`，接著 `pages/merch/[id].vue`、`pages/identity/[id].vue`；移除非必要漸層、厚陰影和圓角容器，但保留商品資料、購買／外連、收藏、比較、列印、分享、SEO 和路由契約。

## Boutique 選購詳情收斂 v15（2026-09-04）

- `/product/:id`、`/merch/:id`：主資訊、價格、購買導引、條款與周邊保證容器改為直角細線交易資訊；圖片維持 1:1。購買、外連、收藏、比較、分享、宣傳 modal、SEO 與資料流程未變。
- `/identity/:id`：證書導覽、證書本體、提示與欄位資料格線改為正式文件版面；列印規則、分享、身份資訊與圖片 fallback 未變。
- 格式驗證：`npx.cmd prettier --write pages/product/[id].vue pages/merch/[id].vue pages/identity/[id].vue` 通過。v12 的 `96/96` Vitest、typecheck 與 diff check 是最新完整靜態驗證；本次未執行 build，避免與使用者 Nuxt dev server 競用 `.nuxt`。
- 未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：使用 Chromium 對 `/shop`、`/calculator`、`/health`、`/articles`、`/profile` 與一個實際詳情頁做桌機／手機視覺巡查，定位仍殘留的舊式漸層、陰影或圓角；確認後做 focused fix，再執行完整靜態驗證。不得把靜態 crawler 的空資料誤判為商品資料問題，商品頁需等待 hydration。

## Full-page redesign scope correction（2026-09-04）

- 使用者明確否決「只加 boutique 覆寫」的完成標準：除 `/about`、`/`、`/hero-lab` 外，所有路由都必須做完整頁面重構，而非僅將原有卡片方化。完成定義改為：實際模板的區塊節奏、資訊層級、導引、內容密度、圖片和互動入口均以白底／品牌橘／精品閱讀系統重新設計，並以 Chromium hydrated 畫面驗收。
- 實際 `/start-here` 檢查證實既有覆寫不足：頁面仍因共用 `PageHero`、`NextCta` 與原始區塊結構保留舊式卡片感。已先重構 `components/PageHero.vue` 與 `components/NextCta.vue` 為無圓角、無光暈、上下細線的編輯式通用骨架，讓所有非特殊內容頁同步脫離卡片 Hero／CTA。
- 下一個精確動作：以 `pages/care.vue` 作為全頁重構樣板，將現有多卡 section 模板重編為長文手冊：Hero／決策入口／目錄／章節／資料表／風險區／知識庫／CTA 的語意區塊重新排列。完成並驗證後，依相同標準逐頁處理 `/start-here`、`/guide`、`/faq`、`/health`、`/qs`、`/hospital`、`/genes`、`/calculator`、`/articles`、所有選購入口與詳情、`/why-gencko`、`/buying-guide`、`/stories`、`/profile`；只有 `/about`、`/`、`/hero-lab` 保持特殊場景。

## Full-page care manual v16（2026-09-04）

- `/care` 已從舊式 Hero 加多卡 section 模板開始改為完整手冊結構：新增文件抬頭、版本資訊、雙欄手冊開頁、可操作閱讀目錄；主章節改為連續閱讀節奏與全寬章節標題。既有溫溼度／餵食資料、展開對照表、FAQ、scroll progress、文章導流、側欄與手機 anchor 行為保留。
- 共用 `PageHero` 與 `NextCta` 已改為細線編輯式骨架，移除圓角、陰影與光暈，避免所有使用它們的非特殊頁面仍被舊卡片殼層主導；相應設計系統測試契約改驗證細線殼層與 tokens。
- 驗證：Prettier 與 `npm.cmd run typecheck` 通過；此前 `npm.cmd run test` 為 `96/96`，在共用 Hero 更新後已重新執行並維持 `96/96`。本輪未跑 build，避免與使用者 Nuxt dev server 競用 `.nuxt`。
- 下一個精確動作：完成 `/care` 其餘子區塊的模板重排（環境、溫度、濕度、餵食、風險、知識庫），再以相同全頁標準重構 `/start-here`；不得再以單純最末端 CSS 覆寫宣稱頁面完成。

## Full-page manual foundation v17（2026-09-07）

- `/care` 模板重構延續：章節改為有 `CHAPTER 01…` 文件編號的桌機雙欄閱讀網格；每個環境、溫度、餵食、繁殖、風險、FAQ、知識庫段落保留原始資料與互動，手機收為單欄。此改動不再是卡片外觀覆寫，而是改變章節閱讀結構。
- `/start-here` 模板重構延續：新增課綱文件抬頭與「知識地圖／三條路徑／準備清單」頁內目錄，將原本獨立卡片區塊串為課程閱讀順序。
- 共用 `PageHero` 與 `NextCta` 已是細線編輯式骨架，所有使用它們的非特殊頁面同步移除舊式圓角、陰影與光暈。
- 驗證：`npx.cmd prettier --write pages/care.vue pages/start-here.vue components/PageHero.vue components/NextCta.vue` 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過。本輪未啟動 build，避免與使用者目前的 Nuxt dev server 競用 `.nuxt`；未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：批次重構內容與工具入口 `/guide`、`/faq`、`/health`、`/qs`、`/hospital`、`/genes`、`/calculator`，每頁加入模板級的文件抬頭／目錄或工作區導覽並重排原區塊，之後處理 `/articles`、`/buying-guide`、`/why-gencko`、`/stories`、`/profile` 與所有選購入口／詳情。除 `/about`、`/`、`/hero-lab` 外不可排除任何路由。

## Full-page content and tools batch v18（2026-09-07）

- 已完成模板級重構的路由：`/guide`、`/faq`、`/health`、`/qs`、`/hospital`、`/genes`、`/calculator`。每頁已加入用途明確的文件／工作台抬頭，而非在既有卡片尾端追加通用覆寫。
- `/guide` 的五段內容已具可連結章節 id 與文件式章節編號；`/faq` 的分類答案改為可掃讀的連號索引；`/hospital` 的展開名單改為連號目錄。既有比較、tab、accordion、篩選、收藏、撥號、地圖和連結行為皆保留。
- `/health`、`/qs` 與 `/calculator` 分別標出健康判讀、自評與配對計算的工作台語境；保留既有評估、題目輪播、雷達、分數、基因演算法、親本角色及結果流程，不改資料契約。
- `/genes` 保留物種切換、搜尋、詞條、工具連結與 SEO，增加參考資料庫抬頭並維持平面目錄閱讀感。所有新增內容均為白底、細線與原有品牌橘；沒有新增頂部跑馬燈、圓角照片或桌機限定互動。
- 驗證：`npx.cmd prettier --write pages/guide.vue pages/faq.vue pages/health.vue pages/qs.vue pages/hospital.vue pages/genes/index.vue pages/calculator.vue` 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅有既有 LF → CRLF 提示。
- 本輪未執行 production build，因使用者的 Nuxt dev server 仍在使用 `.nuxt`，避免競用輸出資料夾。未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：依相同「模板重排而非單純覆寫」標準，批次處理 `/articles`、`/buying-guide`、`/why-gencko`、`/stories`、`/profile`，再巡查 `/home`、`/shop`、`/auction`、`/breeders`、`/merch`、`/compare` 與各詳情頁的殘留舊結構。`/about`、`/`、`/hero-lab` 依使用者指示排除；不部署。

## Full-page remaining routes batch v19（2026-09-07）

- 已完成內容與品牌路由的文件結構補齊：`/articles`、`/articles/:id`、`/buying-guide`、`/why-gencko`、`/stories`、`/profile`。文章搜尋、分類、文章內容、SEO、登入、收藏、瀏覽紀錄、競標紀錄與醫院收藏邏輯均保留。
- 已完成交易與目錄路由的工作單抬頭：`/shop`、`/auction`、`/breeders`、`/merch`、`/compare`、`/auction/:id`、`/product/:id`、`/merch/:id`、`/identity/:id`、`/genes/:id`。這些頁面不改動既有選購翻轉卡、1:1 圖片、篩選、比較、收藏、出價、倒數、列印、分享、購買及資料載入行為。
- 新增全域 `.common-document-meta` 作為交易與記錄頁的細線文件抬頭，手機會直式換行，不需要 hover 或額外 JS。品牌橘僅用於識別文字，未修改品牌文字色彩。
- `/home` 維持既有的獨立首頁骨架，以保留使用者指定的「熱門精選」單一跑馬燈與 1:1 圖片；不加入會打斷主視覺的文件抬頭。`/about`、`/`、`/hero-lab` 維持使用者指定的特殊頁排除範圍。
- 驗證：`npx.cmd prettier --write assets/css/style.css pages/shop/index.vue pages/auction/index.vue pages/breeders.vue pages/merch/index.vue pages/compare.vue pages/auction/[id].vue pages/product/[id].vue pages/merch/[id].vue pages/identity/[id].vue pages/genes/[id].vue` 通過；`npm.cmd run test` 為 `6 files / 96 tests passed`；`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅有既有 LF → CRLF 提示。
- 本輪未執行 production build，因使用者的 Nuxt dev server 仍在使用 `.nuxt`，避免競用輸出資料夾。未執行 commit、push、部署、reset 或清理。
- 下一個精確動作：使用 Chromium 以 hydration 後資料，實際巡查 `/home`、`/shop`、`/auction`、`/care`、`/guide`、`/profile` 的桌機與手機畫面；只修正使用者回報或實測仍不一致的區塊。熱門精選保持單一跑馬燈、商品照片保持 1:1、選購翻轉內容保持，且不得部署。

## Completion-gate correction and calculator v20（2026-09-07）

- 使用者回報 `/calculator` 視覺上仍像舊頁面；確認先前的文件抬頭與方形控制項不足以構成整頁重構。因此將完成門檻改為「Chromium hydrated 桌機與手機畫面已檢查、資訊階層確實不同、互動可用」，不能再因局部 CSS 或單一抬頭就標示整頁完成。
- `/calculator` 已做實際模板重排：物種控制與說明進入 `01 選擇物種` section，雙親設定進入 `02 設定雙親` section，結果標示為 `03`。原物種下拉、親代／子代角色、基因選擇、Het／超級設定、反向匹配、結果計算與提示均未改動。
- 驗證：`npx.cmd prettier --write pages/calculator.vue`、`npm.cmd run test`（`6 files / 96 tests passed`）、`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅既有 LF → CRLF 提示。未執行 build、部署、commit、push、reset 或清理。
- 下一個精確動作：逐頁以 Chromium hydration 後畫面驗收 `/calculator`、`/home`、`/shop`、`/auction`、`/care`、`/guide`、`/start-here`、`/health`、`/profile`，並直接重構每個仍像舊頁面的模板。接著以同一標準完成剩餘內容、工具、交易與詳情頁。僅 `/about`、`/`、`/hero-lab` 依使用者指示排除，且不得部署。

## Workflow reconstruction batch v21（2026-09-07）

- `/calculator`：已由單一控制面板改為模板級三階段工作台。`01` 物種選擇與說明、`02` 雙親基因輸入、`03` 結果判讀各自有獨立 section；所有下拉、基因、角色、反向匹配與結果邏輯不變。
- `/shop`：已將篩選與目錄從單一連續容器拆為 `01 設定你的選購條件` 和 `02 瀏覽可選個體`。篩選、手機 modal、搜尋、物種、排序、標籤、收藏、比較、翻轉卡及 1:1 圖片不變。
- `/auction`：已在載入骨架和資料完成兩種狀態加入 `01 目前可參與的競標` 目錄段落，保留倒數、安全狀態、起標／直購價格與詳情入口。
- 驗證：`npx.cmd prettier --write pages/calculator.vue pages/shop/index.vue pages/auction/index.vue` 通過；每次修改後均執行 `npm.cmd run test`（`6 files / 96 tests passed`）與 `npm.cmd run typecheck`；`git diff --check` 無 whitespace error，僅既有 LF → CRLF 提示。未執行 build、部署、commit、push、reset 或清理。
- 下一個精確動作：使用 Chromium 讀取 `/care`，先確認其實際 hydrated 桌機與手機畫面；若仍保有舊式卡片區塊，直接把環境、溫濕度、餵食、風險與 FAQ 逐段重排為同一份手冊章節。其後依序 `/guide`、`/start-here`、`/health`、`/profile`，未經瀏覽器驗收不得標示完成。

## Hydrated manual verification and breeders v22（2026-09-07）

- Chromium hydrated 實測通過：`/care` 已有文件抬頭、閱讀索引、九個連號章節與原互動內容；`/guide` 已有導覽、五段連號內容、比較表、新手四步和 FAQ；`/start-here` 已有課程流程、頁內目錄、知識地圖、三條路徑和準備清單；`/health` 已有三題組決策、警示、四步判讀和醫院導流；`/profile` 的訪客／登入入口、tabs 與空狀態未被新 UI 遮蔽。
- `/breeders` hydrated 資料目前為空，不能以實際個體卡驗收。已把舊式單行空訊息重排為 `01` 種群目錄的資料庫狀態，提供選購個體與基因圖鑑入口；資料存在時維持既有翻轉卡與 1:1 圖片。
- 驗證：`npx.cmd prettier --write pages/breeders.vue`、`npm.cmd run test`（`6 files / 96 tests passed`）、`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅既有 LF → CRLF 提示。未執行 build、部署、commit、push、reset 或清理。
- 下一個精確動作：使用 Chromium hydration 後檢查 `/merch` 和 `/compare`，先保留商品資料、圖片比例、比較和購買行為，再重構任何仍像舊式卡片格的目錄／空狀態區。僅 `/about`、`/`、`/hero-lab` 依使用者指示排除。

## Hydrated catalogue verification v23（2026-09-07）

- Chromium hydrated 實測通過：`/merch` 顯示供應摘要及 3 筆商品目錄，詳情連結正常；`/compare` 顯示決策工作台、已選數量、空狀態與返回選購入口，未有比較資料時不虛構卡片驗收；`/why-gencko` 顯示信任資料、四條購買入口、工具預覽與 CTA。
- `/articles` 的期刊式 masthead、閱讀入口、搜尋與分類控制均正常；當前 hydrated 文章資料為空，因此未把無文章卡誤判為 UI 缺陷。資料可用時仍需再驗收卡片與單篇閱讀頁。
- 本輪只做 Chromium hydration 後實測，未發現需要修改的呈現或行為，因此沒有修改原始碼、沒有執行 build、部署、commit、push、reset 或清理。
- 下一個精確動作：使用 Chromium 逐頁驗收 `/faq`、`/qs`、`/hospital`、`/genes`、`/buying-guide`、`/stories` 及有資料時的 `/articles/:id`；若實際畫面仍是舊式卡片堆疊，直接做模板級重排。`/about`、`/`、`/hero-lab` 持續排除。

## Hydrated interactive tools verification v24（2026-09-07）

- Chromium hydrated 實測通過：`/faq` 的分類連號手風琴與延伸入口正常；`/hospital` 的搜尋、縣市／行政區篩選、78 筆連號名錄、收藏與展開明細正常；`/genes` 的物種切換、搜尋、23 筆豹紋詞條與詳情入口正常；`/buying-guide` 的五步流程、檢查點與 CTA 正常；`/stories` 為真實內容預備頁，未加入假案例。
- `/qs` 修正：初次 hydrated snapshot 顯示四個未命名選項。題目已改為只在目前步驟呈現的 `h2`，每個答案補上「完整題目：答案」的 `aria-label`。fresh browser 實測確認題目與四個選項名稱均正確可讀，計分／輪播行為不變。
- 驗證：`npx.cmd prettier --write pages/qs.vue`、`npm.cmd run test`（`6 files / 96 tests passed`）、`npm.cmd run typecheck` 通過；`git diff --check` 無 whitespace error，僅既有 LF → CRLF 提示。未執行 build、部署、commit、push、reset 或清理。
- 下一個精確動作：以 hydration 後實際資料檢查 `/articles/:id` 與 `/auction/:id`、`/product/:id`、`/merch/:id`、`/identity/:id`、`/genes/:id`；若任何頁面仍使用舊式主容器或其資料／空狀態不足，直接做模板級修正。商品／文章資料缺失時只能記為待資料驗收，不得虛構結果。`/about`、`/`、`/hero-lab` 持續排除。

## 全站排版契約與 `/home` Hero 插入修正（2026-09-09）

- 使用者定案全站中文字型角色：中文 H1、H2、主要內容 H3 與內容名稱以 `Noto Serif TC` 建立層級；正文、說明、FAQ、導覽、按鈕、標籤、表單、表格、價格、日期與狀態維持 `Noto Sans TC`。已寫入全域 token、重設規則、設計 brief 與逐頁驗收計畫。
- 使用者確認「減少過大留白」與「純文字內容不包成不必要卡片／不保留重複 CTA」是跨頁要求。已正式寫入不可變契約；往後逐頁驗收都須檢查 Hero、相鄰 section、Footer 前距離，以及卡片是否具有實際項目或操作邊界。
- 使用者在 `/guide` 驗收期間插入 `/home` 小修正。首頁 Hero 使用的 `assets/NDBE.jpg` 原圖為 1024×1024；桌機、手機與窄手機的 Hero 圖片容器皆改為 `1:1`，不再由 4:5 或 5:4 造成左右高低差。
- 驗證：`npm.cmd run typecheck`、`npm.cmd run test -- --run tests/shared-interaction.spec.js`（60/60）通過；Chrome 1379×754 hydration 後實測圖片容器為 507×507、ratio 1、`object-fit: cover`、頁面水平溢位 0。
- 下一個精確動作：等待使用者驗收 `/home` Hero 1:1 修正；通過後回到 `/guide` 完成目前頁面驗收，未經 `/guide` 明確通過不得進入 `/care`。
