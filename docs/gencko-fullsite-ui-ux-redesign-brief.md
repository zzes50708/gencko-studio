# Gencko Studio 全站 UI/UX、資訊架構與導覽重構任務

## 最新指定：手機核心 3D 必須保留（2026-09-10）

- 使用者明確要求恢復根網址 `/` 的手機進站動畫；共用 `/hero-lab` 同步保留原生觸控時間軸、1100svh 手機旅程、DPR 1 與既有手機 Bloom 設定。不得再依 coarse pointer 或手機寬度整段替換為靜態文字。
- `/care` 環境模型手機須能單指旋轉、雙指縮放；模型外維持正常頁面捲動。維持按需渲染、離屏卸載、DPR 1 及 WebGL 失敗替代畫面。
- 上述兩項是使用者對一般手機 3D 降級規則的明確例外；不擴大到其他背景特效。純文字修訂暫停，訂製爬櫃維持另案。

你是直接負責修改目前專案的 Codex。請依本規格完成全站 UI/UX、視覺系統、資訊架構、導覽與必要功能重構。不要把本文件再次改寫成企劃書，也不要只停在分析；先完成 Phase 0 盤點與基準，提交 B2 級 IA/導航/路由提案等待使用者確認，同時可繼續不衝突的 A/B1 級改善。只有遇到本文件定義的高風險停止條件才暫停該項目。

## 1. 工作環境與目標

工作目錄：

    D:\Users\User\Desktop\gencko-vercel

專案為 Nuxt 3.15 + Vue，使用：

- Supabase
- Pinia
- VueUse
- Nuxt Image
- TresJS / Three.js
- GSAP
- Lenis
- Vitest
- Playwright

目標：

- 現代化全站視覺、排版、元件樣式與響應式。
- 重新整理資訊架構、導航分組與跨頁導流。
- 適度調整既有文案、頁面內容與本地 UI 功能。
- 必要時合併重複頁面或建立整合型入口，但保留舊網址相容性。
- 強化商品掃讀、品牌專業感、購買信任、知識探索與工具易用性。
- 保護 Supabase 資料、商業規則、基因計算正確性、登入與既有核心互動。

## 2. Skills 使用規則

開始前請先回報：

    🔧 系統判定調用：[ui-skills-root]、[ui-ux-pro-max]、[baseline-ui]

執行原則：

- 只載入當前 Phase 所需的最小技能集合，不要一次載入所有 skills。
- ui-skills-root 每次最多挑選 1 至 3 個真正相關的 UI skills。
- ui-ux-pro-max 先依 Nuxt/Vue stack 查詢；需要設計系統時使用 --design-system，需要實作規則時使用 --stack nuxtjs。
- Skill 搜尋結果是參考，不得覆蓋本規格、AGENTS.md 或 GitHub Issue #5。若結果誤推紫色 AI 風格、綠色交易色、Testimonials、React 元件或與 Gencko 品牌不符的模式，直接捨棄。
- baseline-ui 的 React、Tailwind、motion/react、Radix 等 stack-specific 規則不適用；只採用其跨框架的排版、可及性、動畫、safe-area、視覺節制與空狀態原則。
- 只有實際修改或深入檢查 3D 元件時，才載入 web3d-animation-core 或 threejs-interaction。
- 完成前使用 code-review 與 verification-before-completion 檢查差異與驗證證據。

## 3. 開始前必讀

開始修改前，完整閱讀：

- 根目錄 AGENTS.md
- package.json
- nuxt.config.ts
- app.vue
- assets/css/style.css
- components/TheNavbar.vue
- components/TheFooter.vue
- components/TheBottomNav.vue
- components/PageHero.vue
- components/NextCta.vue
- components/SkeletonCard.vue
- docs/competitive-benchmark-report-2026-08-28.md
- 當前 Phase 涉及的每個 page、component、store、composable 與 util

UI 設計前必須閱讀 GitHub Issue #5 Design Rule：

https://github.com/zzes50708/gencko-studio/issues/5

Issue #5 的現有元件清單、資源庫優先級、Inspira UI 查詢協議與移植規則優先於一般 skill 建議。React 範例若要使用，必須改寫成符合 Vue 3 / Nuxt 3 的 Composition API，並遵守現有 component contract。

若 Issue #5 因權限、登入或網路問題無法完整讀取，停止 UI 實作並回報；不可只依舊摘要或猜測繼續。

## 4. 已確認的正式站基準與 Shop 更正

不要把 Shop 判斷成沒有商品。

2026-08-28 已分別用 Playwright 與 Codex for Chrome 驗證正式站：

- 豹紋守宮分頁：20 個商品連結，最高價格 12000，空狀態不可見。
- 肥尾守宮分頁：7 個商品連結，最高價格 7000，空狀態不可見。
- `/home` 熱門精選在 hydration 後正常顯示，空狀態不可見；跑馬燈會產生重複商品連結，不能用連結總數當成唯一個體數。
- 商品圖片、價格、性別/孵化溫度、生日、照片日期、收藏與比較皆有渲染。
- 未發現 Shop 的 Vue/Supabase 載入錯誤；只有與商品無關的 LINE LIFF 語系 warning。

先前靜態文字爬蟲顯示空列表的原因：

- pages/shop/index.vue 的商品 UI 使用 store.inv。
- app.vue 在 onMounted 後呼叫 store.loadDataFromAPI()，再由 Supabase 將商品載入 Pinia。
- Shop 的 SSR useAsyncData 結果主要供 JSON-LD schema 使用，沒有直接作為商品卡首屏資料。
- 未執行或未等待 hydration 的爬蟲會先讀到空 store 的空狀態。

這是爬蟲/SSR 可見性差異，不是實際庫存或一般使用者 UI 故障。不要為了修正先前報告而任意改動商品資料流。若要改善 SSR/SEO 可見性，必須另列成獨立技術變更，先評估 hydration、schema、Supabase 與回歸風險。

## 5. 競品分析結論與採用方向

Gencko 的核心能力已經很強：基因警語、基因計算、電子身分證、商品比較、購買流程、科學文章與 78 間特寵醫院資料都具有差異化。主要落差不是商品不存在，而是資訊架構、視覺層級、商業信任呈現與跨頁導流尚未完全整合。

### 可採用的競品優勢

- Gray Matter：繁育理念、基因分類、sire/dam 計算機、個體證明卡與檔案館感。
- Pashou / Rex：商品圖片、規格、照護與購買判斷資訊的清楚分區。
- Snakelove / Guisu：價格、狀態、性別、個體編號與商品清單的快速掃讀。
- THEORCS / UU / Pacman：購買、運送、開箱、售後、客服與商業政策的可預期流程。
- Entobuzz / Feipien：品牌故事、場域、專業背景與內容區段的節奏。
- Yunung / Gray Matter / Guisu：物種、品系、基因、知識文章與商品間的內容架構。
- SPET：大型分類導航、用品/情境分組與商業入口的清楚層級。
- 爬爬食堂：更新資訊、團隊/專業內容與教學入口的透明感。

參考來源：

- https://www.theorcs-reptile.com/
- https://graymatterreptile.com/
- https://www.feipien.com/
- https://www.pashou-reptile.shop/
- https://www.reptile-feeder.com/
- https://guisu-reptile.com/
- https://www.spet.com.tw/
- https://www.entobuzz.com/
- https://www.pacmantaiwan.com/
- https://www.yununggecko.com/
- https://www.snakelove.net/
- https://www.rexrept.com/
- https://www.uureptile.com/

PPD187 本次無法穩定載入，不得作為設計依據。

### 採用限制

- 可以借鏡資訊分組、內容節奏、規格表、證明卡、流程視覺與導航層級。
- 不得直接複製競品文案、圖片、品牌樣式或商業承諾。
- 不得捏造評價、星等、團隊履歷、門市、健康保證、運送保固、餵食紀錄、血統或醫療資訊。
- 新增內容必須由現有資料、現有政策或可驗證來源支撐。

## 6. 變更授權分級

### A 級：可自主執行

- CSS、template、layout、tokens、圖片比例、字級、間距、色彩、邊框、陰影、動畫與響應式。
- 重整現有元件內的視覺順序與分組，只要不破壞語意與核心操作。
- 調整既有 CTA、卡片、Tabs、Drawer、Modal、Accordion、Bottom Sheet 的樣式與易用性。
- 新增純展示型 Vue components，重用現有資料與 props。
- 將現有內容拆成更易讀的區塊、規格表、流程卡、提示卡或摘要。

### B1 級：可執行，但必須說明理由並驗證

- 適度改寫、精簡、合併或補充使用者可見文案。
- 新增本地 UI state、computed、事件或小型互動，以改善既有資訊的呈現。
- 增加現有資料間的內部連結，例如基因頁到計算機、文章到飼養指南、商品到購買流程。

B1 級要求：

- 所有新文案必須基於既有事實，不可杜撰。
- 所有 script 變更必須有明確 UX 理由與回歸驗證。

### B2 級：Phase 0 提案後取得使用者確認才可執行

- 調整 Navbar、Footer、BottomNav、Dropdown 的項目、名稱、分組與順序。
- 新增或移除導覽入口。
- 合併內容重複的頁面，或建立整合型 Hub。
- 調整 useHead、canonical、JSON-LD、meta 或 sitemap，使其與新的內容和路由一致。
- 建立舊路由 redirect、alias 或 wrapper。

B2 級要求：

- Phase 0 必須先交付導航 before/after、頁面合併清單、URL 相容策略與 SEO 影響。
- 未取得使用者明確確認前，只能完成 A/B1 級改善，不得實作 B2 級 IA、路由或 SEO 變更。
- 合併頁面不能造成 404、內容遺失、SEO 重複、書籤或深連結失效。

### C 級：停止並先回報

- Supabase schema、RLS、資料遷移或新增資料欄位。
- Shop SSR 首屏、Pinia/Supabase 商品資料流或 hydration 策略調整；本任務只記錄原因，另開技術變更處理。
- 新外部 API、地圖服務、付款、訂單、第三方登入或新套件安裝。
- 修改基因計算核心、遺傳規則、機率演算法或健康/醫療判斷。
- 修改拍賣、付款、商品狀態、收藏、比較或會員資料的商業規則。
- 大幅修改 Hero Lab Canvas、ScrollTrigger、scene timeline、native touch 或 mobile fallback。
- 刪除公開路由而沒有 redirect/alias/保留方案。
- 需要無法驗證的商業承諾、醫療資訊、評價或繁育資料。

## 7. 路由與架構事實

不可誤判：

- / 是 Hero Lab，不是一般首頁。
- /home 才是一般網站首頁。
- /hero-lab 也是 Hero Lab 顯示入口。
- pages/index.vue 與 pages/hero-lab.vue 是 Hero Lab wrapper，主要實作在 components/HeroLabPage.vue。
- pages/about.vue 是全螢幕、深色、鎖定捲動的 BrandServiceScrollScene 特殊頁。
- pages/hospital.vue 目前是篩選加可展開清單，沒有地圖元件。
- pages/faq.vue 已有分類 Tab 與 FAQ Accordion。
- pages/shop/index.vue 已有手機 Drawer、搜尋、物種切換、排序、收藏與比較。
- components/TheBottomNav.vue 已有手機 BottomNav 與 Bottom Sheet。
- pages/articles/index.vue 使用 Supabase 文章資料、搜尋與分類。
- pages/articles/[id].vue 使用 Supabase 動態文章與 v-html。
- 目前沒有 pages/terms.vue 與 pages/contact.vue。

可以調整導覽與合併頁面，但 /、/home、/hero-lab 的語意必須保留；/about 的特殊場景也不得被一般內容頁版型取代。

### 建議的資訊架構假設

Phase 0 必須用實際程式碼驗證後再定案，可先評估：

- 首頁：/home。
- 探索選購：/shop、/breeders、/auction、/merch、/compare。
- 新手與知識：/start-here、/care、/guide、/health、/qs、/faq、/articles。
- 基因與工具：/calculator、/genes、/hospital。
- 品牌與購買：/why-gencko、/buying-guide、/about。
- 會員：/profile。

優先考慮建立 Hub 與導航整併，不要一開始就刪除實體路由。若確定合併頁面，舊 URL 必須 redirect、alias 或保留 wrapper。

## 8. 內容與功能原則

### 可調整內容

- 可重寫標題、摘要、CTA、導覽名稱、提示與流程說明，使語氣一致且更容易理解。
- 可把分散的既有內容合併成 FAQ、流程、規格、信任聲明或新手路徑。
- 可補充現有頁面之間的導引文字與內部連結。
- 可更新 SEO 文案與結構化資料，使其符合新的頁面內容。

### 內容底線

- 不得更改商品、價格、基因、生日、性別、健康狀況、醫院、文章來源等事實資料。
- 不得杜撰顧客評價、出貨數量、繁育年資、保固或醫療效果。
- 基因與健康警語只能依現有資料或高可信來源調整。
- 交易、退款、運輸與開箱條款若有語意變更，必須明確列為商業規則變更並先回報。

### 可調整功能

- 可改善現有搜尋、篩選、排序、Tabs、Accordion、Drawer、Modal、Sticky、比較列與導覽。
- 可新增只使用現有資料的本地 UI 功能，例如視圖切換、展開摘要、進度視覺、快捷導引或頁內目錄。
- 可調整 component props、emit 與本地 state，但必須維持既有核心行為並補足測試。
- 不得因視覺方便而改變商品排序、篩選結果、基因機率或資料寫入時機，除非另有明確需求與測試。

## 9. Git 與既有修改保護

開始前執行：

    git status --short --branch
    git diff --stat
    git diff --name-only

將開始時工作樹視為基準，不要只看 HEAD。記錄已修改與未追蹤檔案；要編輯其中任何檔案前，先理解並保留使用者既有變更。

另外把基準證據存到作業系統暫存目錄，不要寫入 repo：

- 保存完整 `git diff --binary` patch、`git status --short --branch` 與未追蹤檔案清單。
- 對所有「開始前已 dirty 且本任務預計修改」的檔案，保存一份暫存副本與 SHA-256；未追蹤檔也必須保存副本，不能只記檔名。
- 暫存副本只用來區分 pre-existing hunks，不得輸出或上傳其中可能包含的敏感內容。

不得執行：

- git reset --hard
- git checkout --
- git restore
- git clean
- git stash
- 任意覆蓋或刪除既有修改

只修改當前 Phase 必要檔案。不要格式化或提交 .tmp-dev.log、測試、圖片、報告或其他無關檔案。不要自行 commit。

## 10. 視覺方向

一般內容頁：

- 背景以 #FFFFFF、#FAFAFA、#F8F9FA 為主。
- 主文字使用深曜石黑，次文字使用中性灰。
- 橘色只作為 CTA、選中、重點標籤、細邊框與小型指示。
- 使用細邊框與清楚但緊湊的留白；不得以大面積空白取代內容層級。
- 避免大面積橘色、紫色 AI 風格與多色漸層。
- 避免每個區塊都用玻璃、Bento、發光或浮動動畫。
- 不得刪除亮色/暗色模式。
- /about、Hero Lab 與其他深色場景不強制改成白底。

### 10.1 全站字型、留白與內容容器契約（使用者定案）

- 2026-09-09 使用者補充的全站視覺標準：風格統一、不過度留白、簡潔乾淨、高質感、頂級品牌感。後續頁面與修訂一律沿用已完成頁面的視覺語言。
- 品牌質感以一致的字型角色、閱讀層級、基線對齊、圖片比例及克制的品牌橘建立；不得用巨大空白、裝飾卡片、堆疊特效或額外 CTA 區塊代替設計。
- 同層級區塊維持一致間距，縮短頁首、章節之間與 Footer 前的冗餘留白；保留正文行距和操作所需空間，不能為縮減留白而擠壓閱讀或觸控目標。
- 可點擊入口須有一致且可辨識的形式：主要操作用品牌色按鈕、次要操作用描邊按鈕、閱讀導流用有底線與方向提示的連結；純文字內容不模仿按鈕且不提供裝飾性 hover。

- 中文頁面 H1、H2、主要內容型 H3、商品名、品系名與文章標題使用 `Noto Serif TC`；`Songti TC` 與通用 `serif` 作為後備字型。
- 中文正文、說明、FAQ 回答、導覽、按鈕、標籤、表單、表格、價格、日期與狀態使用 `Noto Sans TC`；技術 ID 可保留等寬字型。
- 英文 eyebrow、文件編號與技術識別可維持無襯線或等寬字型，不強制套用中文宋體。
- 全站採緊湊且可讀的垂直節奏：頁首、Hero、相鄰章節、內容與 Footer 之間不得保留沒有資訊或功能目的的大面積空白；手機與桌機都必須獨立檢查。
- 純文字介紹、說明、流程摘要與一般知識段落使用連續欄位、細分隔線或編輯式章節，不使用帶背景、圓角、陰影或 hover 位移的卡片外框。
- 卡片只保留給確實需要建立單一操作或資料邊界的內容，例如商品、個體、文章縮圖、可選項目、比較項目、表單群組、狀態與錯誤提示；不得只因排版方便將每段文字包成卡片。
- 頁尾不得保留與正文入口重複的獨立 CTA 區塊。若目的地已在正文或全站 Footer 出現，刪除重複 CTA；若頁面確有唯一且必要的下一步，改用一般文字連結或單一低干擾操作。
- Hover 只能輔助可操作項目的狀態辨識，不得為純文字區塊增加浮動、陰影或裝飾動畫，也不得成為手機查看重要內容的必要條件。

assets/css/style.css 已有 --pri、--pri-btn、--card-bg、--txt、--txt-muted、--bd、--shadow-card 與 html.day-mode。優先沿用並補足 semantic tokens，保持既有 class 與變數相容，避免元件散落大量 hard-coded 色碼。

## 11. 防禦性排版與可及性

- 動態文字容器不得使用固定死高度。
- Flex 文字區塊使用 min-width: 0。
- 長 ID、URL 與動態資料使用 overflow-wrap: anywhere；一般中文自然換行。
- 不得以 ellipsis 隱藏重要商品、基因、醫院或文章資訊。
- 圖片容器使用穩定比例；商品照片依需求 object-cover，Logo、SVG、證明卡與品牌圖依需求 object-contain。
- Grid 使用 minmax(0, 1fr) 或等效彈性欄位。
- Badge、標籤與按鈕列允許換行。
- 表格與比較列只在局部使用 overflow-x: auto。
- 不得用全域 overflow-x: hidden 掩蓋破版。
- 320px 至 2560px 不得有非預期橫向捲軸。
- 保留 heading hierarchy、ARIA、鍵盤操作與 visible focus。
- 互動目標原則上至少 44 × 44px；固定元件保留 safe-area。
- 動畫優先 transform 與 opacity，避免動畫 width、height、top、left、margin、padding 或大型 blur。
- 尊重 prefers-reduced-motion。

Mobile：低於 768px、pointer: coarse 或不支援 hover 時：

- 不新增 mousemove、mouseenter、mouseleave。
- 不新增游標追蹤、3D tilt、spotlight 或 hover-only 重要資訊。
- 不新增高耗能 Canvas、粒子、WebGL 或大型模糊背景。
- 使用 BottomNav、Bottom Sheet、Drawer、垂直堆疊與輕量 transition。
- 不修改現有 3D 元件的 mobile state 或 scroll 邏輯，除非列為 C 級變更。

Desktop：hover、游標互動或較高成本特效只在寬度至少 768px 且有精確游標時使用：

    @media (min-width: 768px) and (hover: hover) and (pointer: fine)

## 12. 執行計畫

### Phase 0：盤點、基準與 IA 提案

建立 route/component inventory，至少涵蓋：

- 全域殼層與導航
- /、/home、/hero-lab
- /shop
- /breeders
- /calculator
- /hospital
- /articles
- /articles/:id
- /care
- /guide
- /health
- /qs
- /faq
- /buying-guide
- /why-gencko
- /about
- /genes
- /auction
- /product/:id
- /compare
- /merch
- /profile
- /stories
- /start-here
- /identity/:id

每頁記錄：

- 使用的 component。
- 資料來源與載入方式。
- 互動狀態。
- 特殊捲動、Canvas、WebGL 或 scroll lock。
- 內容重複與可合併候選。
- 現有 SEO、canonical、內部連結與導覽入口。
- 預計修改的檔案與變更授權等級。

輸出一份 before/after IA 與導航提案，指出：

- 保留頁面。
- Hub 化頁面。
- 合併候選。
- 舊路由相容策略。
- 導覽 before/after。
- 需要使用者確認的 B2 級項目。
- 需要另外決策的 C 級項目。

B2 級提案送出後，等待使用者確認才實作 IA、導航、頁面合併、redirect 與對應 SEO；等待期間可繼續不衝突的 A/B1 級視覺與頁內 UX 工作。

建立基準：

    npm.cmd run typecheck
    npm.cmd run test
    git diff --check

記錄既有 failure 與 warning，避免誤判回歸。

### Phase 1：Design System 與全域殼層

處理：

- assets/css/style.css
- app.vue
- components/TheNavbar.vue
- components/TheFooter.vue
- components/TheBottomNav.vue
- components/PageHero.vue
- components/NextCta.vue
- components/SkeletonCard.vue

建立一致的 tokens、字級、行高、間距、圓角、邊框、陰影、CTA、Ghost、Secondary、focus-visible、safe-area、dark/light 與 reduced-motion。

依 IA 提案調整 Navbar、Dropdown、BottomNav 與 Footer。導航更動必須確認所有 route 存在、桌機與手機入口一致、active state 正確、BottomNav 不超載。

Footer 可整合既有客服、購買、FAQ、醫院、社群與品牌入口；若需要新增文字，必須從現有頁面與可驗證資料取得。

### Phase 2：首頁 /home 與品牌導流

處理：

- Hero。
- 快速導覽。
- 熱門精選。
- 最新文章。
- 跑馬燈卡片。
- 品牌與信任導流。
- 響應式圖片與卡片。

參考 Entobuzz/Feipien 的區段節奏，但維持 Gencko 的白/暖灰/橘方向。可以調整 CTA、標題、摘要與模組導流，使首頁更清楚地連到 Shop、新手、基因、醫院與品牌信任頁。

/ Hero Lab 保持獨立入口與現有場景，不與 /home 合併。

### Phase 3：選購、商品與種群

處理：

- /shop
- /breeders
- components/ShopFlipCard.vue
- /auction
- /product/:id
- /compare
- /merch
- /identity/:id

目標：

- 搜尋、物種、狀態、價格、性別、年份、基因、排序與收藏有清楚群組。
- 商品卡統一圖片比例、價格/狀態層級、欄位位置、Badge 與響應式。
- 桌機篩選可使用 sticky；手機保留或改善 Drawer。
- ShopFlipCard 正反面資訊層級一致。
- /breeders 與 /identity/:id 採檔案館/證明卡視覺。
- /product/:id 建立照片、個體資料、信任、購買行動與相關資訊的清楚流程。
- 比較、收藏、翻卡、拍賣與商品狀態的核心規則保持正確。

可以增加基於現有資料的決策提示或導流；若要新增餵食紀錄、血統、保固等資料欄位，列為 C 級。

### Phase 4：工具與專業內容

處理：

- /calculator
- /genes
- /hospital
- /health
- /qs

Calculator：

- 保留物種、親代/子代角色、基因、Het、共顯性、致死提示、反向匹配、結果與 Modal。
- 可重構為 sire/dam 雙控制台、結果機率視覺與更清楚的警示層級。
- 不得修改基因演算法與機率規則，除非另開 C 級變更。

Genes：

- 可依現有資料重整分類、卡片、基因警語、來源與計算機導流。
- 若修改基因內容，必須維持來源與不確定性警示。

Hospital：

- 改善篩選、78 筆清單、展開、收藏、電話、地圖連結與手機堆疊。
- 可使用現有資料做「篩選/清單」split view，但不得做看似可操作的假地圖。
- 任何真正地圖面板、定位、營業狀態或專長篩選，只要需要外部 API、金鑰、新套件或新資料，一律列為 C 級。

Health / QS：

- 可與新手 Hub 整合導流或合併內容，但保留舊 route 相容與現有專業資訊。

### Phase 5：文章、新手、FAQ 與購買信任

處理：

- /articles
- /articles/:id
- /care
- /guide
- /faq
- /buying-guide
- /why-gencko
- /start-here
- /stories
- /profile

目標：

- 文章列表採雜誌式視覺，改善搜尋、分類、卡片與響應式。
- v-html 文章改善閱讀寬度、標題、段落、列表、引用、圖片、作者與相關內容。
- FAQ 改善分類與 Accordion，可合併重複問答但不得遺失重要政策。
- /start-here 作為新手 Hub，評估整合 /care、/guide、/health、/qs、/faq 的導流或內容。
- /buying-guide 與 /why-gencko 可重整成更清楚的購買流程與信任入口；若合併，保留舊 route。
- 可以建立文章、基因、照護、醫院、商品與購買流程之間的內部連結網。
- /profile 只改善既有會員、登入狀態、收藏或個人資料介面；不得變更 LINE 登入、session、權限或資料寫入契約，除非列為 C 級。

### Phase 6：特殊頁保護

特殊頁：

- /
- /hero-lab
- /about

/ 與 /hero-lab 不套用一般內容頁版型。/about 維持全螢幕深色 BrandServiceScrollScene。先檢查 Canvas、scroll lock、transition、scene reveal 與 mobile fallback，再決定安全的外層與文案調整。

任何涉及 Hero Lab Canvas、ScrollTrigger、scene timeline、native touch 或 mobile fallback 的重大更動都列為 C 級。

## 13. 可中斷續作與用量保護

本任務可能跨多次 Codex 用量週期，不能依賴單一聊天內容。Phase 0 開始時建立並持續更新：

    docs/ui-redesign-progress.md

若檔案已存在，先完整閱讀再續作，不得覆蓋既有進度。進度檔至少記錄：

- 任務規格檔與競品報告路徑。
- 開始時 branch、HEAD、dirty/untracked 清單，以及暫存基準 patch/副本所在路徑。
- Route/component inventory 完成度。
- 當前 Phase、已完成項目、進行中項目與下一個精確動作。
- B2 級 IA/導航/合併提案、使用者已確認決策與尚待確認項目。
- 每個已修改檔案、本次修改目的及是否原本就 dirty。
- 最近一次 typecheck、test、build、e2e、git diff --check 與瀏覽器驗證的時間和結果。
- 已知 warning、blocker、未驗證路由/viewport 與殘留風險。
- Dev server、Playwright、Chrome 或其他背景程序是否已停止。

Checkpoint 規則：

- 每完成一個 Phase、每完成一組跨檔案修改，以及準備等待使用者確認時，都更新進度檔。
- 若預估剩餘用量不足以安全完成下一組「修改 + 驗證」，不要開新範圍；先完成當前最小一致單元、停止 dev server、保存進度並回報續作點。
- 不得因用量不足而跳過測試、假稱 Phase 完成或留下未記錄的半成品。
- 新一輪 Codex 開始時，先讀本規格、競品報告與進度檔，再執行 `git status --short --branch` 與 `git diff --stat`，確認工作樹符合 checkpoint 後直接從「下一個精確動作」接續。
- 若發現 checkpoint 後出現非本任務的新修改，先判斷是否衝突；不衝突則保留並繼續，衝突才向使用者詢問。

## 14. 驗證要求

每個 Phase 完成後：

    npm.cmd run typecheck
    npm.cmd run test
    git diff --check

全部完成後：

    npm.cmd run build

若 Playwright 設定可用：

    npm.cmd run test:e2e

不可同時執行 Nuxt dev server 與 production build。視覺檢查時先啟動 dev server；完成瀏覽器檢查後停止，再執行 build。

至少驗證：

- 320px
- 390px
- 768px
- 1024px
- 1440px
- 2560px

互動驗證：

- 桌機 Navbar dropdown 與新 IA。
- 手機 BottomNav、Bottom Sheet 與新 IA。
- 主題切換。
- Shop 商品正常載入，以及篩選、搜尋、排序、收藏、翻卡與比較。
- Breeders 物種切換。
- Calculator 物種、角色、基因、結果與 Modal。
- Hospital 篩選、展開、收藏、電話與地圖連結。
- FAQ 分類與 Accordion。
- Articles 搜尋、分類、文章內容與內部連結。
- 合併頁面與舊路由 redirect/alias。
- Hero Lab 捲動、Canvas 與 mobile fallback。

檢查：

- 沒有 404。
- 沒有新增 Vue runtime error。
- 沒有 hydration mismatch。
- 沒有非預期橫向捲軸。
- 沒有重要文字被截斷。
- 沒有圖片 CLS 或變形。
- 不支援 hover 的裝置不依賴 hover。
- Supabase 資料、基因結果、商品狀態與核心互動正確。

每個 Phase 必須留下驗證矩陣，至少包含：

- Route。
- 實測 viewport；一般頁至少涵蓋 320、390、768、1440，特殊寬度需求再補 1024、2560。
- Light/dark 與 desktop/mobile 狀態。
- 本 Phase 涉及的互動結果。
- Console error、hydration、404、橫向溢出與文字截斷檢查。
- 必要的 before/after 截圖或 Playwright 證據路徑。

Local dev/build 使用 Playwright 驗證；正式站的 Shop 與 `/home` 動態資料另用 Codex for Chrome 驗證，並等待 Supabase hydration 完成。不能只看靜態文字爬蟲。

## 15. Code Review

完成前使用 code-review 分兩軸：

- Standards：AGENTS.md、Issue #5、Vue/Nuxt 架構、Design Tokens、防禦性 CSS、可及性、mobile 限制與現有 component contract。
- Spec：逐條核對本文件，確認 A/B/C 分級、競品採用、IA、內容、功能、路由相容與驗證要求。

工作樹可能在開始前已 dirty。必須依 Phase 0 記錄排除 pre-existing hunks，不得把使用者既有修改當成本任務變更。若 skill 需要 fixed point，可用開始時 HEAD 做標準軸參考，但必須搭配起始 working tree diff。

特別檢查：

- 所有新文案有事實依據。
- 所有導航目標存在。
- 所有合併頁面有舊 route 相容策略。
- useHead、canonical、JSON-LD、sitemap 與實際 IA 一致。
- Script 變更只服務已說明的 UX，沒有偷改資料或商業規則。
- 基因計算、商品載入、收藏、比較、登入與拍賣沒有回歸。

## 16. 停止條件

遇到以下情況停止該項並回報：

- 需要 Supabase schema、RLS 或資料遷移。
- 需要新外部 API、地圖金鑰、付款、登入或新套件。
- 需要修改基因計算、醫療判斷或商業規則。
- 需要無法驗證的評價、保證、健康、血統或繁育資料。
- 需要刪除公開 route 且無法保留相容。
- 需要大幅修改 Hero Lab Canvas 或 mobile scroll 邏輯。
- 無法完整讀取 GitHub Issue #5 Design Rule。
- 使用者既有修改與本任務直接衝突且無法安全合併。

留下 blocker、原因、影響與建議方案，繼續執行其他安全範圍。

## 17. 最終交付

完成後回報：

- 實際修改檔案。
- 每個 Phase 的修改範圍與成果。
- 競品優勢如何被轉譯成 Gencko 設計。
- IA 與導航 before/after。
- 合併頁面、舊 route 相容與 SEO 調整。
- 內容與功能變更清單及理由。
- 已驗證的路由、寬度與互動。
- 執行命令與逐項結果。
- Code review 的 Standards 與 Spec 結果。
- 已知 warning、blocker 與殘留風險。

不要自行 commit、push、部署或建立 PR，除非使用者另外明確要求。
