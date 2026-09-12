# Gencko 官網逐頁完整盤點、修改與驗收計畫

## 最新授權：全部建議優化並直接部署（2026-09-12）

使用者要求完成資料載入、共用樣式與手機效能建議後直接部署，包含上一輪 UI 工作樹。允許必要 commit／push／部署；不得還原、清理工作樹或提交本機附件與輸出。純文字及訂製爬櫃另案。實體手機尚未連接，瀏覽器觸控／CPU 降速驗證不得表述為真機驗收。

## 最新授權：全站桌機與手機跑版排查（2026-09-11）

使用者要求「全部 UI 修改好、文章列表跑版修正、全部電腦版手機版排查並修正」。現有所有頁面均在本次 UI 範圍，無須逐頁等待修改指示。純文字仍暫停，訂製爬櫃另案；保留 working tree 及已核准的手機根網址動畫、care 互動模型。最新結果以 docs/ui-redesign-progress.md 頂部為準。

## 歷史授權：剩餘頁面批次 UI 完成（2026-09-09）

- 使用者明確指示「剩餘頁面的 UI 可以參考前面已完成的部分，先把剩餘的做完」。此授權取代下方歷史流程中逐頁等待指示、驗收才繼續的限制。
- 本批範圍為 12 /care 收尾及 13–29 所有剩餘頁面。可依已確認風格直接實作與驗證；完成後統一等待使用者檢視，不自行標記已驗收。
- 保留目前 working tree；不部署、commit、push、reset、restore 或清理。資料、問卷計分、交易、登入、路由與 SEO 行為不因 UI 修改變更。
- 訂製爬櫃獨立頁仍留待另一次任務。/care 已依使用者提供的設備示意圖完成互動 3D 模型，等待檢視；純文字任務暫停，僅由使用者另行開啟。

Written against: `ea5e0d3`（以目前含未提交變更的 working tree 為實際基準）

## 新對話啟動指令

請在新對話直接輸入：

> 請完整閱讀 `design-plans/ui-page-by-page-acceptance-plan.md`、`docs/gencko-fullsite-ui-ux-redesign-brief.md` 與 `docs/ui-redesign-progress.md`。以目前 working tree 為準，不得還原既有變更。依最新授權與 checkpoint 的「下一個精確動作」續作；剩餘頁面批次 UI 已實作，等待我的整體檢視與修正指示。遵守風格統一、不過度留白、簡潔乾淨、高質感與頂級品牌感五項原則。不要部署、commit、push、reset、restore 或清理檔案。

## 歷史任務收斂（逐頁停止限制已由最新授權取代）

- 本計畫正式停止先前「由 Codex 自主批次重構剩餘頁面」的執行方式。
- 先前已修改或曾通過技術測試，不代表使用者已驗收；本計畫所有單位一律重新標記為「待盤點」。
- 從現在起，一次只能處理一個驗收單位。Codex 不得自行跨頁修改，也不得因共用元件方便而順手改其他頁。
- 每一頁都必須經過「完整盤點 → 使用者指定修改 → 實作 → 技術與操作驗證 → 使用者明確驗收」五個階段。
- 使用者只有在明確回覆「此頁沒問題」、「此頁通過」或「下一頁」後，Codex 才能將目前單位標記為已驗收並移至下一個單位。
- 若使用者要求回頭修改已驗收頁面，該頁立即恢復為「修改中」，再次驗收後才算完成。
- 不執行部署。除非使用者日後另行明確要求，亦不 commit、push、reset、restore 或清理 working tree。

## 不可變設計與行為契約

- 主視覺方向：簡潔、乾淨、高質感、精品官網。
- 主色維持白底與品牌橘；品牌文字顏色禁止擅自變更。
- 全站中文字型採「宋體建立標題層級、黑體維持閱讀與操作」：中文 H1、H2、主要內容 H3、商品／品系／文章名稱使用 `Noto Serif TC`；正文、說明、FAQ、導覽、按鈕、標籤、表單、表格、價格、日期與狀態使用 `Noto Sans TC`。英文文件識別、編號與技術 ID 可維持 sans-serif 或 monospace。
- 全站垂直節奏必須緊湊且可讀；不得用大面積無功能空白製造層級。每頁都要檢查 Hero、相鄰 section 與 Footer 前距離，並確認桌機與手機不因固定高度或過大 padding 產生斷層。
- 純文字說明、流程、知識與品牌內容預設使用連續欄位、細分隔線或編輯式章節，不包成帶背景、圓角、陰影或 hover 位移的卡片。只有商品、個體、文章、可選項目、比較資料、表單、狀態與錯誤等具有實際邊界的內容可使用卡片。
- 頁尾 CTA 若只重複正文或 Footer 已有入口，應移除；必要且唯一的下一步改用行內連結或單一低干擾操作。純文字區塊不得為裝飾增加 hover，重要資訊不得依賴 hover 顯示。
- 全站頂部跑馬燈移除；首頁「熱門精選」保留單一跑馬燈，但可在該頁驗收時重做為更簡潔的形式。
- 選購與種群卡片不使用圓角；商品／個體圖片維持 `1:1`。
- 選購卡片保留既有翻轉與背面內容，除非使用者在該頁明確要求改動。
- Footer 不使用黑底。
- 手機導覽跳轉後必須關閉選單。
- 觸控裝置不得依賴 hover 才能看見重要資訊；不得執行桌機游標追蹤、3D tilt 或高耗能背景。例外只能由使用者逐頁明確核准。
- 現有資料、登入、收藏、比較、出價、購買、列印、分享、SEO 與路由契約不得因純 UI 修改而變更。
- 動態資料頁以瀏覽器 hydration 後畫面為準；靜態 crawler 的空資料不能當作頁面實際內容證據。

## 完整頁面清單與順序

狀態只允許：`待盤點`、`等待修改指示`、`修改中`、`等待驗收`、`已驗收`、`受阻`。

| #   | 驗收單位           | 主要來源                                           | 必須盤點的內容與功能摘要                                                                                                                                                                             | 初始狀態     |
| --- | ------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 00  | 全站共用介面與狀態 | `app.vue`、共用 components、全域 CSS               | 桌機／手機導覽、所有選單與關閉邏輯、Footer、Bottom Nav、返回鍵、Toast、Lightbox、Modal、按鈕、表單控制、Theme、Focus／Hover／Active、Loading／Skeleton／Empty／Error／Disabled、斷點與共用 Hero／CTA | 等待修改指示 |
| 01  | `/home`            | `pages/home.vue`                                   | 首頁 Hero、情境入口、熱門精選跑馬燈、內容導流、信任／品牌區、所有動態清單與 CTA                                                                                                                      | 已驗收       |
| 02  | `/shop`            | `pages/shop/index.vue`                             | 搜尋、物種／狀態／新手／價格／性別／年份／基因篩選、排序、標籤、歷史、收藏、比較、手機篩選、翻轉卡、載入與空狀態                                                                                     | 已驗收       |
| 03  | `/product/:id`     | `pages/product/[id].vue`                           | 個體圖片與 Lightbox、狀態、價格、資料、基因、收藏、比較、分享、購買／洽詢、載入／不存在與相關導流                                                                                                    | 已驗收       |
| 04  | `/compare`         | `pages/compare.vue`                                | 比較名單、欄位、移除／清空、返回選購、空狀態、桌機表格與手機呈現                                                                                                                                     | 已驗收       |
| 05  | `/auction`         | `pages/auction/index.vue`                          | 競標清單、狀態、倒數、起標／目前／直購價格、詳情入口、載入與空狀態                                                                                                                                   | 已驗收       |
| 06  | `/auction/:id`     | `pages/auction/[id].vue`                           | 圖片、倒數、價格、身份／登入、安全出價、出價歷程、直購、分享、宣傳 Modal、錯誤與結標狀態                                                                                                             | 已驗收       |
| 07  | `/breeders`        | `pages/breeders.vue`                               | 物種切換、純圖片種群目錄、圖片右下品系名、載入與空資料導流                                                                                                                                           | 已驗收       |
| 08  | `/merch`           | `pages/merch/index.vue`                            | 供應摘要、周邊目錄、商品卡、價格／狀態、詳情與購買導流、空狀態                                                                                                                                       | 已驗收       |
| 09  | `/merch/:id`       | `pages/merch/[id].vue`                             | 商品圖片、資訊、價格、保證／條款、購買／外連、分享、載入與不存在狀態                                                                                                                                 | 已驗收       |
| 10  | `/start-here`      | `pages/start-here.vue`                             | 新手課程抬頭、知識地圖、準備清單、三條路徑與頁內導覽                                                                                                                                                 | 已驗收       |
| 11  | `/guide`           | `pages/guide.vue`                                  | 守宮介紹、比較與選擇資訊、五段內容、新手步驟、FAQ 與所有延伸連結                                                                                                                                     | 已驗收       |
| 12  | `/care`            | `pages/care.vue`                                   | 閱讀進度、決策入口、目錄、環境／溫度／濕度／餵食／繁殖／風險／物種／FAQ／知識庫章節、展開表格與手機 anchor                                                                                           | 等待驗收     |
| 13  | `/health`          | `pages/health.vue`                                 | 分流模式、題目、進度、健康判讀、警示、結果、疾病／報告資訊與醫院導流                                                                                                                                 | 等待驗收     |
| 14  | `/qs`              | `pages/qs.vue`                                     | 18 題與 6 維度、題目輪播、選項、進度、計分、雷達／分級、建議、警示、修改答案與重測                                                                                                                   | 等待驗收     |
| 15  | `/faq`             | `pages/faq.vue`                                    | 分類切換、每一題與答案、Accordion 行為、頁內／跨頁延伸入口                                                                                                                                           | 等待驗收     |
| 16  | `/articles`        | `pages/articles/index.vue`                         | 期刊抬頭、搜尋、分類／標籤、文章卡、作者／日期／摘要、載入、空狀態與詳情入口                                                                                                                         | 等待驗收     |
| 17  | `/articles/:id`    | `pages/articles/[id].vue`                          | 返回與上下文導覽、標題、摘要、作者／日期、主圖、全文、相關內容、載入與不存在狀態                                                                                                                     | 等待驗收     |
| 18  | `/genes`           | `pages/genes/index.vue`                            | 工具入口、物種切換、搜尋、數量、分類、詞條目錄與詳情入口                                                                                                                                             | 等待驗收     |
| 19  | `/genes/:id`       | `pages/genes/[id].vue`                             | 詞條標題、遺傳模式／年份／來源、說明、警示、原始圖片、資料列、圖鑑／計算機導流、載入與不存在狀態                                                                                                     | 等待驗收     |
| 20  | `/calculator`      | `pages/calculator.vue`                             | 物種群與物種、雙親／子代角色、基因選擇、Het／Super、反向配對、計算結果、警示與說明 Modal                                                                                                             | 等待驗收     |
| 21  | `/hospital`        | `pages/hospital.vue`                               | 搜尋、縣市／行政區篩選、醫院名錄、展開明細、收藏、電話、地圖、驗證日期、空結果                                                                                                                       | 等待驗收     |
| 22  | `/why-gencko`      | `pages/why-gencko.vue`                             | 品牌理由、信任資訊、購買路徑、工具預覽、圖片、所有 CTA 與延伸入口                                                                                                                                    | 等待驗收     |
| 23  | `/buying-guide`    | `pages/buying-guide.vue`                           | 選購導引、決策入口、五步 Timeline、檢查點、風險提示與 CTA                                                                                                                                            | 等待驗收     |
| 24  | `/stories`         | `pages/stories.vue`                                | 現有預備頁文案、未來內容區、目前可操作連結與所有狀態                                                                                                                                                 | 等待驗收     |
| 25  | `/profile`         | `pages/profile.vue`                                | 訪客／登入／已登入狀態、LINE／Google、登出、Avatar、收藏／歷史／醫院／競標 tabs、空狀態與外部操作                                                                                                    | 等待驗收     |
| 26  | `/identity/:id`    | `pages/identity/[id].vue`                          | 證書導覽、證書內容、身份欄位、圖片 fallback、提示、列印、分享、載入與錯誤狀態                                                                                                                        | 等待驗收     |
| 27  | `/about`           | `pages/about.vue`                                  | 品牌故事、服務內容、圖片／粒子／滾動場景、聯絡與導流；桌機與手機特效分支                                                                                                                             | 等待驗收     |
| 28  | `/`                | `pages/index.vue`、`components/HeroLabPage.vue`    | 根路由 Hero Lab 全部場景、文案、動畫、滾動／觸控控制、CTA、降級與錯誤狀態                                                                                                                            | 等待驗收     |
| 29  | `/hero-lab`        | `pages/hero-lab.vue`、`components/HeroLabPage.vue` | Hero Lab 替代入口、與根路由的差異、SEO／noindex、所有場景與互動                                                                                                                                      | 等待驗收     |

`pages/repomix-output.xml` 是資料檔，不是 Nuxt 頁面，不列入頁面驗收；若其內容實際被某頁載入，必須在該頁的資料來源中揭露。

## 每個單位的固定盤點程序

Codex 在詢問使用者要修改什麼以前，必須完成以下來源盤點。不得只看截圖、只看 Vue template 或只列大標題。

1. 讀取該路由檔案的完整 `<template>`、`<script setup>`、頁面樣式、`useHead`／schema，以及它實際引用的子元件、composable、store、API 與資料常數。
2. 追蹤所有條件渲染、迴圈、動態插值、路由參數、query、登入分支、載入、成功、空資料、錯誤、disabled、選取與展開狀態。
3. 在可行時以瀏覽器檢查 hydration 後的桌機與手機畫面；動態路由至少使用一筆有效資料。若沒有有效資料，明確標示「待資料驗收」，不得假裝已看過。
4. 盤點滑鼠、鍵盤、觸控、scroll、hover、focus、click、submit、drag、modal、lightbox、tab、accordion、filter、sort、pagination、copy、share、print、tel、map 與外部連結等全部互動。
5. 盤點所有使用者可見文案，包括按鈕、欄位 label、placeholder、helper、badge、提示、錯誤、空狀態、Toast、Modal、圖片 alt 與動態文案模板。文案必須逐字列出，不得只寫「說明文字」。
6. 盤點桌機與手機的區塊順序、欄數、寬度、sticky／fixed、收合、溢出、圖片比例、動畫及觸控降級。
7. 盤點 page title、description、canonical、robots、structured data 與 URL 行為；這些不是視覺文案，但屬於頁面功能，必須列出。
8. 對照全站共用元件，指出本頁哪些元素由共用 owner 控制，避免把跨頁改動偽裝成單頁修改。

## 每次提供給使用者的固定格式

每個單位都必須用下列完整格式報告。任一節沒有內容時寫「無」，不可省略該節。

### A. 頁面身份

- 驗收編號、URL、實際來源檔案、頁面目的、主要使用者任務。
- 動態路由要列出本次使用的資料 ID／狀態，以及仍未覆蓋的資料狀態。

### B. 區塊與排版定義

依畫面由上至下編號為 `S01`、`S02`……，每區都列：

- 區塊名稱與用途。
- 上一區／下一區關係。
- 桌機結構、手機結構、欄數、內容順序、圖片比例、sticky／fixed／scroll 行為。
- 使用的共用元件與實際 owner。
- 區塊內全部元素，不得用「等等」或「其餘相同」省略。

### C. 完整文案

- 按 `S01`、`S02`……逐字列出標題、副標、內文、標籤、按鈕、欄位、placeholder、提示、錯誤、空狀態、Toast、Modal 與圖片替代文字。
- 動態文案列出模板與變數，例如：`目前 {{count}} 筆結果`，並附本次瀏覽器中的實際值。
- 重複資料列可用「資料欄位 + 當前每筆值」的表格列出，但不可漏欄位或只列第一筆。

### D. 所有功能與狀態

每個功能編號為 `F01`、`F02`……，逐項列：

- 觸發方式。
- 前置條件。
- 執行結果與畫面回饋。
- 寫入／讀取的 state、route、storage、store 或 API。
- 桌機、鍵盤與觸控差異。
- loading、success、empty、error、disabled、auth、expired 等可達狀態。

### E. 可修改項目總表

逐區列出可由使用者指定的項目：

- 文案與資訊層級。
- 區塊順序、合併／拆分、欄位與密度。
- 字體、字級、行高、色彩、背景、邊框、陰影、留白與圖片裁切。
- 按鈕、表單、卡片、表格、Modal、動效與響應式行為。
- 功能流程、資料顯示、預設值、驗證、錯誤處理、權限與外部連結。
- SEO、URL、分享、列印、無障礙與效能影響。
- 哪些修改會影響共用元件或其他頁面，及其完整影響清單。

### F. 本頁問題與待確認

- 只列有來源或實際畫面證據的矛盾、缺陷與未覆蓋狀態。
- 不替使用者猜審美決定；沒有證據就列為「待使用者決定」，不可自行修改。

### G. 唯一提問

報告末尾固定詢問：

> 請告訴我本驗收單位哪些 `S` 區塊、文案、排版或 `F` 功能要修改。你回覆前我不會修改，也不會進入下一個單位。

## 修改階段規則

1. 先把使用者指示轉成該頁的明確修改清單，保留其原話與驗收條件。
2. 僅修改目前單位與使用者明確核准的影響範圍；不能順便處理下一頁。
3. 如果修改共用元件會影響其他頁面，先列出所有消費者與預期差異。未取得明確同意時，改採頁面局部實作或停下詢問。
4. 不以全域 CSS override 假裝完成整頁重構；排版要求應落在真正擁有結構的 template／component。
5. 保留未被要求更改的文案、功能、資料與狀態。任何路由、SEO、登入、資料庫、API、價格、出價或購買契約變更都必須由使用者逐項核准。
6. 修正或新增足以保護本次行為的測試，不因改 UI 刪除既有功能測試。
7. 每次編輯後更新本文件的 checkpoint；不得把尚待使用者驗收寫成「已完成」。

## 單頁驗收程序

Codex 完成修改後，必須先自行驗證再請使用者驗收：

1. 執行受影響測試，並在適合時執行 `npm.cmd run test`、`npm.cmd run typecheck`、`git diff --check`。
2. production build 只在沒有 Nuxt dev／preview process 使用 `.nuxt` 或 `.output` 時執行；若存在競用風險，停止相關背景程序後才可執行。不得因 EBUSY 破壞目前開發環境。
3. 以瀏覽器驗證桌機與手機，覆蓋本次變更涉及的所有互動與狀態。商品、文章、競標等資料頁必須等待 hydration。
4. 向使用者提供「修改前／修改後」、「修改檔案」、「保留功能」、「技術驗證」、「網站操作驗收步驟」與「仍未覆蓋狀態」。
5. 固定詢問：`此驗收單位是否通過？若不通過，請指出 S/F 編號與要調整的內容。`
6. 使用者未明確通過時，停留在目前單位；不可自行開始下一頁。
7. 通過後將狀態改為 `已驗收`，記錄日期與使用者核准摘要，再把下一個單位改為 `待盤點` 並更新下一個精確動作。

## 100% 完成定義

- `00` 到 `29` 共 30 個驗收單位全部由使用者明確標記為 `已驗收`。
- 每頁所有可見文案、每個結構區塊、每個互動、所有主要狀態、桌機與手機分支都曾列出並交由使用者決定。
- 動態頁至少驗收一筆有效資料；適用時另驗收 loading、empty、error、not found、auth、expired／ended 狀態。缺資料時不得標記 100%。
- 共用元件的跨頁影響已在所有消費頁回歸驗證。
- 導覽可達性、舊 URL、SEO、分享、列印、登入、收藏、比較、競標與購買等契約未產生未核准的回歸。
- 最終再執行一次全站桌機／手機回歸、完整測試、typecheck、build（無背景程序競用時）與 diff check。
- 最終完成不包含部署；部署必須是另一個由使用者明確提出的任務。

## Checkpoint 格式

每次對話即將結束、用量接近上限或工作中斷前，必須更新下列欄位，讓下一次可直接接續：

```yaml
plan: design-plans/ui-page-by-page-acceptance-plan.md
current_unit: '全站優化與正式部署'
current_status: 優化實作、Typecheck、99 單元測試及 24 E2E 通過；124 組版面掃描通過，接續正式部署
last_user_accepted_unit: '11 /guide'
accepted_units:
  - '01 /home'
  - '02 /shop'
  - '03 /product/:id'
  - '04 /compare'
  - '05 /auction'
  - '06 /auction/:id'
  - '07 /breeders'
  - '08 /merch'
  - '09 /merch/:id'
  - '10 /start-here'
  - '11 /guide'
pending_user_decisions:
  - /care 已移除桌機固定側欄與平板／手機固定章節列，正文恢復單欄全寬，只保留一套頁內閱讀索引。
  - /care 已刪除豹紋 vs 肥尾區塊；環境、溫度、濕度合併為單一環境章，致命地雷分流至環境、溫度與餵食內容，重複相關文章入口已合併去重。
  - 依使用者截圖回饋，已移除 Hero 空白圖片佔位、環境大色塊示意、章節 Emoji 與彩色溫度卡；內容改為無底色資料列並進一步縮短上下留白。
  - 依第二次截圖回饋，已移除所有主要章節外層容器的白底、左右邊界、陰影與濾鏡；閱讀索引、決策入口、FAQ 與完整知識庫亦統一為透明背景及細分隔線，不再形成整張大卡片。
  - 環境章末已依使用者提供的 1-Photo-1.jpg 重建互動模型，含桌機旋轉、縮放、頂蓋與設備選取，以及手機輕量示意。單張示意圖僅提供相對配置，不代表實測尺寸。
  - 2026-09-09 最新授權允許直接完成剩餘 UI，本批完成後等待使用者統一檢視。
deferred_future_work:
  - 訂製爬櫃不屬於 Supabase 商品；待全站 UI 驗收全部結束後，於下一次獨立任務與廠商定案後製作獨立頁面。目前不建立入口、暫定文案、圖片或 LINE 導流。
changed_files_this_unit:
  - components/care/HabitatExplorer.vue、HabitatViewport.client.vue、HabitatScene.vue（互動模型及裝置降級）
  - utils/habitat-model.ts、utils/habitat-parts.ts、public/images/care/habitat-overview.webp（模型、設備資料及輕量示意）
  - tests/e2e/habitat.spec.ts、scripts/verify-habitat.mjs（3D 互動、卸載、降級及畫面驗證）
  - app.vue、assets/css/style.css、components/TheNavbar.vue、components/TheBottomNav.vue、components/TheFooter.vue（全域按鈕、短頁留白、導覽狀態、安裝提示、錯誤介面與浮動操作）
  - composables/useNativeModal.ts（原生彈窗開關、捲動及焦點還原）
  - tests/e2e/shared-modal-final.spec.ts、tests/e2e/ui-interactions-complete.spec.ts（原生彈窗、導覽、浮動操作與周邊補驗）
  - components/TheBackButton.vue、components/TheToast.vue、components/TheLightbox.vue、error.vue、public/offline.html（2026-09-10 共用狀態視覺統整）
  - scripts/verify-shared-ui-20260910.mjs（共用狀態本機檢查）
  - pages/health.vue、pages/qs.vue、pages/faq.vue（健康／飼養前問卷、結果與 FAQ 視覺統整）
  - pages/articles/index.vue、pages/articles/[id].vue、pages/genes/index.vue、pages/genes/[id].vue（列表與閱讀介面）
  - pages/calculator.vue、pages/hospital.vue（工具表單、搜尋及操作層級）
  - pages/why-gencko.vue、pages/buying-guide.vue、pages/stories.vue（品牌與流程排版、重複 CTA 移除）
  - pages/profile.vue、pages/identity/[id].vue（會員與螢幕證書介面）
  - components/BrandServiceScrollScene.vue、components/HeroLabPage.vue（動畫頁字型與按鈕）
  - scripts/verify-ui-continuation.mjs、scripts/verify-ui-actions.mjs（本機響應式與互動證據）
  - tests/e2e/phase4-tools.spec.ts、tests/e2e/phase5-content.spec.ts（更新名稱及等待 hydration 後互動）
  - pages/care.vue（移除浮動導覽、側欄、卡片牆與大色塊，合併環境內容並加入緊湊圖片插槽）
  - utils/care.ts（閱讀索引移除已刪除或已合併的獨立章節入口）
  - tests/shared-interaction.spec.js（同步移除已刪除物種比較展開功能的舊斷言）
  - pages/home.vue（Hero 圖片容器於桌機與手機統一為原圖 1:1 比例）
  - assets/css/style.css（全站中文字型角色 token 與標題預設）
  - docs/gencko-fullsite-ui-ux-redesign-brief.md（全站字型、緊湊留白、內容容器與 CTA 契約）
  - pages/guide.vue（本頁無卡片 UI、內容重整、圖片、響應式比較、FAQ 與同步 JSON-LD）
  - public/images/guide/hero-gecko.webp（使用者指定 Hero 實拍照的網站用版本）
  - public/images/guide/leopard-gecko.webp（使用者指定豹紋守宮實拍照的網站用版本）
  - public/images/guide/fat-tailed-gecko.webp（使用者指定肥尾守宮實拍照的網站用版本）
  - design-plans/ui-page-by-page-acceptance-plan.md（記錄 /start-here 通過及 /guide UI／文案盤點 checkpoint）
validation_completed:
  - 互動環境模型：Typecheck、99/99 單元測試及 5 項專用 E2E 通過。涵蓋拖曳、閒置停止渲染、離屏卸載重入、320／390／768px 觸控降級與 WebGL 失敗；直接設備點選、視角、頂蓋、鍵盤另外實測通過，無 pageerror。證據於 output/habitat-20260910。
  - 最新 UI 收尾：99/99 單元測試、Typecheck 通過；104 組路由／寬度檢查中 103 組直接通過，1 組 768px /merch 導頁中斷後個別重測通過，無排版溢位或 pageerror。
  - iOS／Lightbox 原生彈窗焦點與背景捲動、Navbar／Bottom Sheet、手機詢問鈕與比較列、About／Hero Lab 動畫降級補驗通過。證據見 output/ui-final-20260910-* 與進度文件最新章節。
  - 2026-09-10 共用狀態 Typecheck 與差異格式檢查通過；1440、390、320px 的離線／404／燈箱共 9 組無水平溢位或 pageerror，燈箱關閉、連線切換與返回鍵高度通過。
  - 最後 1440、390、320px 問卷結果／會員訪客分頁／重點頁面共 24 組補驗全數通過；結果記錄於 output/ui-continuation-actions-20260909/results-all.json。
  - 本批 15 個路由 × 4 種寬度共 60 組檢查無整頁水平溢位或 pageerror；99 項單元測試及 Typecheck 通過。
  - 本批 E2E 首輪 14 通過、2 裝置不適用跳過；修正測試名稱與 hydration 競速後，失敗的 5 項全部重測通過。動畫頁裝置降級檢查通過。
  - 全站五項視覺原則已寫入設計規格 10.1：風格統一、不過度留白、簡潔乾淨、高質感、頂級品牌感。實作完成仍待使用者視覺驗收。
  - 使用者於 2026-09-08 指示「競標頁僅確認所有UI(文字 CTA 其他元素)符合新風格就好，確定後直接下一頁」；依此完成 /auction UI 修正、驗證並標記通過。
  - /auction：頁首在 loading 期間仍保留 H1／說明；Skeleton 改為 1:1；價格改為 NT$ 千分位與 nullable fallback；倒數移除 emoji；狀態標籤移除圓角／發光；空狀態新增說明及「瀏覽在售個體」CTA，並縮短頁尾前空白。
  - /auction：`npm.cmd run test -- --run tests/shared-interaction.spec.js` 60/60 通過，`npm.cmd run typecheck` 通過，`git diff --check` 通過。
  - /auction：1280×720 真實空狀態與 390×844 手機畫面均無水平溢位；受控 active fixture 在 1440×900 為三欄、390×844 為兩欄，圖片 1:1、價格 NT$ 12,000／NT$ 16,800、badge 0px／無陰影，無 console 或 page error。
  - /auction/:id 已完整讀取頁面 script、template、scoped CSS、useHead、JSON-LD、Supabase auctions／auction_bids、出價 API、登入 store、Lightbox 與 Toast 依賴。
  - /auction/:id 真實資料 S-41201：測試（公）、已結標、最高出價 $100、最低增額 $100、直購價 $2980、1 筆出價，桌機雙欄、手機 110px 主圖加資訊欄，兩者均無 document overflow。
  - /auction/:id 以瀏覽器固定時間 2026-09-03 實測 active 未登入狀態：顯示 LINE／Google 登入 CTA、競標中、倒數與 1 筆出價，無 console 或 page error。
  - /auction/:id 不存在 ID 實測：先顯示 loading 後轉為「找不到此競標商品」與返回列表；HTTP 仍為 200、robots 為 index/follow，canonical 指向不存在 URL。
  - 使用者指定 /auction/:id 比照競標頁，只修正 UI 風格；未更動競標規則、登入、Supabase、API、分享流程或 SEO。
  - /auction/:id：統一白底、品牌橘、細線、直角與編輯式排版；移除可見 emoji、膠囊與發光；價格統一 NT$ 千分位；手機恢復最低增額與直購價摘要；整理 loading、找不到商品、出價紀錄及宣傳圖卡 dialog。
  - /auction/:id 已結標 S-41201：1280×720 雙欄與 390×844 手機均無水平溢位，主圖為 1:1、狀態無圓角與陰影，售價 NT$ 100，最低增額 NT$ 100，直購價 NT$ 2,980，頁尾間距約 38px。
  - /auction/:id 受控 active 未登入狀態：桌機與手機均顯示競標中、倒數、LINE／Google CTA；手機價格摘要為 grid；按鈕 3px 小圓角、操作區 0px，無 console 或 page error。
  - /auction/:id 修改後 `npm.cmd run test -- --run tests/shared-interaction.spec.js` 60/60 通過，`npm.cmd run typecheck` 通過，Nuxt 開發編譯正常，`git diff --check` 通過。
  - 使用者於 2026-09-08 明確回覆「通過 下一頁」，06 /auction/:id 已標記為已驗收。
  - /merch 已完整讀取 `pages/merch/index.vue` 的 script、template、全部 scoped CSS、useHead、CollectionPage／ItemList／Product／BreadcrumbList schema，以及 `useMainStore` 的 merchandise SSR／CSR 資料來源與 SkeletonCard、Navbar、Footer、Bottom Nav 共用 owner。
  - /merch hydration 實測目前 3 項且全為供應中：米杜（餌料，NT$ 299 起）、防逃食盆（食盆，NT$ 39 起）、美國R牌鈣維粉（鈣粉/維生素，NT$ 79 起）；三筆皆有圖片、說明與 `/merch/:id` 詳情連結。
  - /merch 桌機 1280×720 為三欄，卡片約 329.5px、圖片 1:1、無圓角／邊框／陰影；頁面無水平溢位，無 console 或 page error。
  - /merch 手機 390×844 觸控環境為兩欄，每欄 159px、圖片 1:1，隱藏卡片說明與「查看詳情 →」，保留編號、分類、供應狀態、名稱與價格；無水平溢位，無 console 或 page error。
  - 使用者指定 /merch 與 /merch/:id 都做同風格 UI 優化，並補充訂製爬櫃不是 Supabase 資料；依一次一單位規則先完成 /merch，/merch/:id 留待本頁驗收後處理。
  - /merch 新增固定置頂「訂製爬櫃」服務卡，不依賴 Supabase；顯示訂製服務、開放諮詢、價格請洽與 CUSTOM CABINET placeholder，直接以新分頁開啟既有 LINE，沒有建立無資料的 `/merch/ID`。
  - /merch 保留原有 3 筆 Supabase 商品並順延為 02–04；桌機改為四欄一列、手機維持兩欄且恢復可見 CTA，Skeleton 改為 1:1，原始商品價格加上千分位及缺值 fallback，頁首與 Footer 前留白縮短。
  - 固定訂製服務不混入既有 Product ItemList schema，避免將 LINE URL 宣告為資料庫商品詳情；頁面 SEO 其他內容未改。
  - /merch 修改後 `npm.cmd run test -- --run tests/shared-interaction.spec.js` 60/60 通過，最終 `npm.cmd run typecheck` 通過，`git diff --check` 通過。
  - /merch 最終只保留 3 筆 Supabase 商品；桌機恢復三欄、手機維持兩欄，圖片 1:1、手機 CTA 可見、無水平溢位；Footer 前間距約 38px。
  - 使用者澄清訂製爬櫃需於全站 UI 結束後另立大工程，且尚未與廠商定案；已從 /merch 完整移除固定商品、placeholder、暫定文案及 LINE 入口，恢復只呈現 3 筆 Supabase 商品。
  - 使用者指示訂製爬櫃部分處理後直接下一頁；08 /merch 依此標記通過並進入 09 /merch/:id。
  - /merch/:id 已完整讀取 route、Supabase `merchandise.item_id`、store fallback、動態 SEO／Product schema、Lightbox、Toast、外部購買、loading、缺圖、停供及不存在狀態。
  - /merch/:id 保留資料、購買、分享與 SEO 流程；統一頁面留白、直角圖片／資訊／購買區、細線狀態、襯線標題及 3px 返回／購買／複製按鈕，價格加入千分位與「價格請洽」fallback，移除購買 CTA 的裝飾箭頭。
  - /merch/:id 有效資料 `1`（米杜）：桌機 1280×720 為約 548px／467px 雙欄，手機 390×844 為 328px 單欄；圖片 1:1、價格 NT$ 299 起、無水平溢位。
  - /merch/:id 的 Lightbox 可由圖片按鈕開啟並以 Escape 關閉；不存在 ID 顯示 404、找不到該商品、說明及返回周邊列表，390px 無水平溢位或 console/page error。
  - /merch/:id 修改後最終 `npm.cmd run typecheck` 通過；共享互動測試更新 class 包含條件後 60/60 通過；`git diff --check` 通過。
  - 使用者於 2026-09-09 明確回覆「通過 下一頁」，09 /merch/:id 已標記為已驗收。
  - /start-here 已完整讀取 `pages/start-here.vue`、共用 `PageHero.vue`、`NextCta.vue`、Navbar、Footer、Bottom Nav 與導覽常數；頁面內容全部來自本地常數，沒有 Supabase、API、登入或表單狀態。
  - /start-here hydration 實測：桌機 1280×720 為 Hero 雙欄、知識地圖三欄、三條路徑三欄、準備清單兩欄；手機 390×844 為 Hero／知識地圖／路徑／清單單欄，下一步四個 CTA 為 2×2，兩者均無水平溢位。
  - /start-here 頁內導覽三個錨點皆存在；實測點擊「知識地圖」後目標 top 為 0，而固定 Navbar 高 64px，標題會被固定導覽列覆蓋。手機頁內導覽採兩欄，三個連結使末列右欄留空。
  - /start-here 實際 title 為「新手與知識｜第一次養守宮，該從哪開始 | Gencko Studio」；canonical／OG URL 為正式 `/start-here`；localhost 由全域設定得到 `noindex, nofollow`。頁面未宣告 keywords、OG image/type、Twitter、JSON-LD 或頁面專屬 robots。
  - 使用者指示先由 Codex 自主優化 /start-here UI，再檢視並指定內容；本次保留全部既有文案、路由、SEO 與功能，只修改本頁 template／scoped CSS，沒有修改共用 `PageHero.vue`、`NextCta.vue` 或全域樣式。
  - /start-here UI 已統一直角細線、品牌橘、襯線標題與緊湊課綱層級；Hero 流程、知識卡、三條路徑、準備清單與下一步 CTA 的欄位、間距、按鈕及手機密度均已重整。
  - /start-here 將三步流程恢復為 3 個語意正確的 list item；手機頁內導覽改為三個入口同列；三個錨點加入 84px scroll offset，實測目標 top 84px，高於 64px 固定 Navbar。
  - /start-here 修改後 1280×720、390×844、320×700 均無水平溢位；桌機欄數為 Hero 2、知識 3、路徑 3、準備 2，手機／320px 的內容卡為單欄，流程與頁內導覽各為三欄；所有本頁 CTA 實測高度至少 44px，Hero／Next CTA 圓角均為 0，無 console 或 page error。
  - /start-here 修改後 `npm.cmd run test -- --run tests/shared-interaction.spec.js` 60/60 通過，`npm.cmd run typecheck` 通過。
  - 使用者指定移除各內容框與 hover、縮減全頁留白、將 CHECK 排到三條路徑之前，並要求確認「下一步」是否重複；確認其四個目的地已由知識地圖／三條路徑涵蓋後，已刪除整個 NextCta 與 `nextActions`。
  - /start-here 已套用使用者提供的 S02–S06 與 S08 文案；S03 第二個英文入口依原意使用 `THREE PATHS`，OG description 不含清單編號 `1.`。
  - 知識地圖、準備清單與三條路徑改為無外框、無陰影、無背景、無 hover 的一般欄位；操作入口改為純文字連結，保留 44px 最小操作高度與 focus-visible。
  - 最終 hydration 實測 1280×720、390×844、320×700：區塊順序為 LEARNING MAP → CHECK → 三條路徑，NextCta 不存在；三種寬度均無水平溢位，卡／欄位與路徑連結的 border、box-shadow、background 均為無，錨點 top 84px，高於 64px Navbar，無 console 或 page error。
  - 最終 `npm.cmd run test -- --run tests/shared-interaction.spec.js` 60/60 通過，`npm.cmd run typecheck` 通過，`git diff --check` 通過。
  - 使用者回覆「下一頁」，10 /start-here 依此標記為已驗收並進入 11 /guide。
  - /guide 已完整讀取 `pages/guide.vue`、共用 PageHero／NextCta、SEO schema helper 與相關互動測試；內容全部來自本地靜態常數，沒有 Supabase、API、登入、表單或可變狀態。
  - 使用者指示 /guide UI 先比照 /start-here 修改，再提供文字；本頁五個內容章節、FAQ 與底部導流已移除卡片外框、圓角、陰影、背景與可見 hover，改為一般雙欄章節及純文字導流；豹紋／肥尾比較保留必要表格分隔線。
  - /guide hydration 實測 1280×720、390×844、320×700 均無水平溢位；五個章節、四個方向入口、四個步驟、六題 FAQ 與六個底部入口完整渲染，Footer 前距離為桌機 38px、手機 24px，無 console 或 page error。
  - /guide 內容已重整：Hero 改為左文右圖；基本介紹拆為四個定義欄位；新手適合度改為優點與帶回家前確認；物種比較改用客觀欄位；FAQ 精簡為三題。
  - /guide 使用三張指定照片並轉為網站用 WebP；桌機物種雙欄，手機照片雙欄、比較資料上下分組。
  - /guide 已移除重複的新手四步、HowTo JSON-LD 與底部 NextCta；保留單一 /start-here 導流，FAQPage 與三題可見內容同步，speakable selector 修正為 `.hero-lead`。
  - /guide 修改後 390×844、320×700 均無水平溢位；Hero 為 16:9，物種照為正方形，三張圖片載入成功且無 page error；桌機實際畫面照片與比較表對齊。
  - /guide 修改後 `npm.cmd run test -- --run tests/shared-interaction.spec.js` 60/60 通過，`npm.cmd run typecheck` 通過，`git diff --check` 通過。
  - /guide 已套用使用者提供的 S01–S08 文案；FAQPage 因共用 `faqs` 資料同步更新。1280×720、390×844、320×700 實測均無水平溢位，長版眼睛特徵在桌機表格與手機分組中完整呈現，無 page error。
  - 使用者確認 S02 說明開頭的「到」為誤植，已依指示刪除；目前文字為「兩種常見寵物守宮的差異，先正確認識，再決定是否適合開始飼養。」
validation_pending:
  - 使用者整體視覺驗收與後續文案修改；/care 完整環境配置圖片。
  - 未登入真實會員帳號，會員資料與競標紀錄的已登入分支尚未以真實帳號驗收。
  - 手機已做觸控模擬與動畫降級驗證，未使用實體手機驗收動畫手感。
uncovered_runtime_states:
  - 會員已登入資料分支；外部登入、電話撥號與系統列印面板未執行。
blockers: []
background_processes: 沿用既有 localhost:3000 開發服務，未停止使用者服務；模型驗證程序已結束。最新證據保留於 output/habitat-20260910，既有 output/ui-continuation-* 未清理。
next_exact_action: >-
  最新工作已完成：277313d 正式部署，新版影片與手機照片載入通過。等待使用者檢視根網址骨幹卡片，不自行續作純文字或暫停中的會員收尾。
  最新修復已完成：6fba18e 正式部署成功，/ 手機動畫與 /care 單指旋轉、雙指縮放實測通過。
  等待使用者檢視手機動畫修復；未獲恢復指示前，其他官網收尾保持暫停。
  不得再次以手機降級名義移除這兩處核心 3D。其他官網收尾先暫停，/profile 已登入 watcher 初始化問題留待接續。
  2026-09-10 部署已完成：802a4a3 對應 Production 6372532247 回報成功，正式 /care 桌機與手機重測通過。
  等待使用者檢視 /care 環境章末的互動模型，依其回饋調整模型或操作。
  模型依已提供的 1-Photo-1.jpg 示意圖手工重建，未取得實測尺寸；不自行宣稱使用者已驗收。
  保留桌機按需渲染及手機輕量替代。純文字任務暫停，等使用者下次明確自行開啟；
  訂製爬櫃仍另案；除本次已完成的授權發布外，不另行部署、commit、push 或還原工作樹。
```

## Evidence chain

- Surface: `app.vue`、29 條 Nuxt 路由與其實際引用的共用元件。
- Problem: 先前採用批次 UI 重構與技術驗證，但使用者無法逐頁確認每一段文案、排版與功能，也無法保證沒有遺漏可修改元素。
- Design evidence: 使用者最新指示要求全站逐頁、逐元素、逐功能盤點，使用者指定修改，修改後驗收，通過才進下一頁。
- Owner: 本計畫；實作 owner 則由每一驗收單位的 runtime trace 決定。
- Scope and affected surfaces: 全站 29 條路由及所有實際渲染的共用介面與狀態。
- Uncertainty: 動態資料、登入權限、錯誤與結標等狀態可能需要有效帳號／資料才能驗收；必須在相應頁面列為待覆蓋，不能省略。

## Design decision

以「單一驗收單位鎖定」取代批次重構：先完整揭露內容、結構、文案、功能與所有狀態，由使用者決定修改，再實作及驗收。這能把審美與產品意圖留給使用者，同時以固定格式及 checkpoint 防止漏頁、漏文案、漏互動或中斷後跳步。

## Reuse

- 既有 design tokens、全域精品白底／品牌橘規則與實際共用元件。
- Exemplar: 目前 working tree；不得以 `HEAD` 覆蓋未提交變更。

## Scope

- Inherit: 使用者明確核准的共用元件變更及其全部消費頁。
- Verify: 每個路由的桌機、手機、動態狀態及共用殼層。
- Exclude: 部署、未要求的後端／資料庫改動、未核准的路由合併、刪頁與 SEO 契約變更。

## Stop conditions

- 若目前頁面的有效資料、登入身分或特殊狀態無法取得，停在該頁並把缺口列為 `受阻`／`待資料驗收`，不得假裝完成或跳過。
- 若需求會改動其他尚未盤點頁面或共用 owner，先揭露完整影響範圍並取得使用者明確核准。
- 若發現來源檔被使用者或其他程序同時修改且與目前工作衝突，停止編輯並詢問處理方式。

## 下一個精確動作

完成本輪 124 組版面掃描，提交並部署目前官網 UI 與優化，等 Vercel 成功後驗證正式文章、根網址手機動畫及 care 模型。純文字與訂製爬櫃維持另案；不要重開逐頁盤點。

### 11 `/guide` 盤點索引與續作證據（2026-09-09）

- 區塊編號：S01 文件識別；S02 PageHero；S03 閱讀方向；S04 什麼是守宮；S05 新手適不適合；S06 豹紋／肥尾比較；S07 新手四步；S08 FAQ；S09 底部導流；S10 SEO／JSON-LD。
- 功能編號：F01 靜態內容；F02 PageHero；F03 四個方向入口；F04 內文連結；F05 比較表；F06 HowTo 四步與錨點 schema；F07 FAQ 與 FAQPage schema；F08 NextCta；F09 responsive／focus／reduced-motion；F10 SEO WebPage／Article／Taxon／HowTo／FAQPage／BreadcrumbList。
- UI 已先行修改：所有章節、FAQ 與 NextCta 改為無卡片、無背景、無陰影、無可見 hover 的一般欄位；桌機章節採標題左欄、內容右欄，手機改為單欄；比較表保留細線結構。
- Hydration 實測：1280、390、320px 均無 document overflow；五章、四方向入口、四步、六 FAQ、六底部連結完整顯示。頁面沒有 loading、empty、error、auth 或資料分支。
- 底部 NextCta 中 `/shop` 重複兩次，且 shop／care／calculator／qs 均已在前文出現；只有 `/hospital` 是本頁唯一入口，故未在未取得文案決定前整區刪除。
- 內容導向建議：Hero 可加入一張代表性守宮近照；物種比較應各加入一張同尺度照片；四步流程適合使用小型線性圖示而非情境大圖；FAQ 不加圖；底部 NextCta 建議刪除重複入口，將唯一的特寵醫院連結移到健康相關文句或 FAQ。
- 使用者採用內容重整建議後：Hero 已使用指定橘色豹紋守宮照；豹紋／肥尾比較使用指定正方形實拍照；基本介紹與適合度改為可掃讀欄位；比較移除概括個性的欄位。
- 手機比較不再壓縮三欄表格，改為兩張照片並排、豹紋與肥尾資料上下分組；390px 與 320px 實測無溢位，照片尺寸分別為 161×161 與 126×126。
- 重複的新手四步與底部 NextCta 已刪除，改留單一 `/start-here` 導流；HowTo schema 同步移除，FAQ 精簡為三題並同步 FAQPage schema，`.guide-lead` 修正為實際存在的 `.hero-lead`。

### 10 `/start-here` 盤點索引與續作證據（2026-09-09）

- 區塊編號：S01 文件識別；S02 PageHero 與三步流程；S03 頁內閱讀導覽；S04 知識地圖；S05 三條路徑；S06 帶回家前準備清單；S07 已依重複性確認刪除；S08 頁面 SEO 與共用殼層。
- 功能編號：F01 靜態內容來源；F02 Hero 流程呈現；F03 頁內錨點；F04 知識入口路由；F05 三條路徑導流；F06 準備清單；F07 已刪除的重複下一步導流；F08 鍵盤 focus 與 reduced-motion；F09 響應式；F10 共用 Navbar／Footer／Bottom Nav；F11 SEO；F12 狀態分支。
- Hydration 實測：桌機 1280×720 為 Hero 雙欄、知識地圖 3 欄、路徑 3 欄、準備清單 2 欄；手機 390×844 為單欄內容，下一步四個 CTA 為 2×2；兩者 document overflow 均為 0，手機 Bottom Nav 的「新手」為 active。
- 已確認待決定項目：三步流程的兩個裝飾箭頭也使用 `li`，有序清單實際含 5 個 list item；手機頁內導覽三連結排兩欄而留下末列空欄；錨點目標缺少固定 64px Navbar 的 scroll offset；文案含半形問號、`3~5`、`D3鈣粉` 與重複「先」；頁面存在未被模板使用的舊 CSS selector；頁面未宣告 keywords、OG image/type、Twitter、JSON-LD 或頁面專屬 robots。
- UI 修改紀錄：保留全部盤點文案、路由、功能與 SEO；重整本頁 scoped CSS，統一直角細線與內容層級，修正手機索引空欄、錨點遮擋與流程清單語意。共用元件只由本頁 `:deep()` 局部覆寫，未影響其餘消費頁。
- 使用者續改：內容欄位移除卡片外框、背景、陰影與 hover，操作改為一般文字連結；CHECK 移到三條路徑之前；全頁垂直留白縮減；重複 NextCta 整區刪除；S02–S06、S08 改用使用者提供文案。

### 09 `/merch/:id` 盤點索引與續作證據（2026-09-09）

- 區塊編號：S01 文件識別；S02 loading／不存在；S03 返回與商品編號；S04 商品圖片與 Lightbox；S05 分類／供應狀態／名稱；S06 商品說明；S07 價格／購買提示／停供／購買與複製；S08 動態 SEO／JSON-LD。
- 功能編號：F01 動態路由與 Supabase/store fallback；F02 loading／不存在；F03 返回；F04 圖片／缺圖／Lightbox；F05 分類與供應狀態；F06 價格 fallback；F07 外部購買；F08 複製連結／Toast；F09 桌機 hover／鍵盤 focus／reduced motion；F10 響應式；F11 SEO／Product／WebPage／Breadcrumb；F12 error 行為。
- 有效資料 `1`：米杜、餌料、供應中、NT$ 299 起，有圖片、完整說明、LINE 購買 fallback。桌機雙欄、手機單欄，圖片 1:1；返回、購買、複製按鈕均為 3px，小螢幕無水平溢位。
- 本次 UI 修正：保留 Supabase、外部連結、Lightbox、Clipboard／Toast 及 SEO；縮短上下留白，移除圓角面板與陰影，統一價格格式、狀態邊框、共享按鈕與手機單欄密度。不存在 ID 已實測；停供、缺圖、缺欄位及 Supabase error 待正式資料覆蓋。

### 08 `/merch` 盤點索引與續作證據（2026-09-08）

- 區塊編號：S01 文件識別；S02 頁首介紹；S03 供應摘要；S04 loading／空狀態／商品目錄；S05 動態 SEO／JSON-LD。
- 功能編號：F01 SSR merchandise；F02 CSR store fallback；F03 供應數量；F04 loading skeleton；F05 空狀態；F06 商品卡詳情連結；F07 圖片與缺圖；F08 分類／供應狀態／說明／價格 fallback；F09 桌機 hover 與鍵盤 focus；F10 響應式與觸控降級；F11 error 行為；F12 SEO／structured data。
- 正式 hydration 資料共 3 筆且全為供應中：米杜（餌料，NT$ 299 起）、防逃食盆（食盆，NT$ 39 起）、美國R牌鈣維粉（鈣粉/維生素，NT$ 79 起）。三筆皆有圖片、說明及詳情 URL。
- 桌機 1280×720：頁首介紹與供應摘要雙欄、商品三欄，卡片約 329.5px、圖片 1:1；手機 390×844：頁首單欄、摘要兩欄、商品兩欄各 159px，隱藏說明與文字 CTA；兩者均無 document overflow 或 console/page error。
- 已確認問題：SSR 與 CSR merchandise 查詢都沒有排序，商品順序未明訂；頁面 error 沒有專屬可見狀態或重試 CTA；`store.loading` 由 animals 載入控制，不能準確代表次要 merchandise 查詢；SkeletonCard 使用固定 260px 圖高而非方形；價格直接輸出原始字串，缺值沒有 fallback 或數字格式；供應狀態只把精確 `No` 視為停供，其他值含 null 都顯示供應中；手機同時隱藏商品說明及「查看詳情 →」；實際 title 被全域模板再追加 `| Gencko Studio`；本機 robots 為 `noindex, nofollow`，頁面沒有專屬 robots。
- 本次 UI 修正（2026-09-09）：固定訂製爬櫃不讀 Supabase 並永遠置頂，透過既有 LINE 開啟洽詢；Supabase 商品保留既有詳情路由。桌機四欄、手機兩欄，圖片／Skeleton 1:1，卡片直角無陰影，手機顯示 CTA，價格提供千分位與「價格請洽」fallback，縮短頁首及 Footer 前留白。商品查詢未指定排序、merchandise loading／error 非獨立狀態、Available 僅精確 `No` 視為停供、Title 重複品牌與本機 robots 問題仍保留，未超出本次 UI 範圍處理。

### 06 `/auction/:id` 盤點索引與續作證據（2026-09-08）

- 區塊編號：S01 文件識別與 SEO H1；S02 返回列表；S03 loading／不存在；S04 主圖與 Lightbox；S05 出價紀錄；S06 狀態、品系與分享；S07 價格；S08 倒數；S09 登入／出價／直購／結標；S10 個體資料與備註；S11 宣傳圖卡 dialog；S12 動態 SEO／JSON-LD。
- 功能編號：F01 路由與 SSR 競標資料；F02 出價讀取與 15 秒輪詢；F03 出價排序／最高價／最低下一標；F04 一秒倒數與狀態；F05 loading／not found／error；F06 返回；F07 主圖／Lightbox；F08 出價紀錄收合；F09 未登入／Google／LINE 身分；F10 安全出價 API；F11 三分鐘延長；F12 直購／LINE；F13 原生分享／剪貼簿 Toast；F14 Canvas 圖卡；F15 圖卡 dialog；F16 結標結果；F17 個體資料；F18 響應式／focus／hover／reduced motion；F19 SEO／structured data。
- 真實資料 S-41201：測試（公）、生日 2026-04-15、夾餵「是」、餌料「杜比亞、冷凍蟋蟀」、運費「運費180元、三重面交0元」；已結標，1 筆 zze*** 出價 $100，最低增額 $100，直購價 $2980，得標者 zze***。
- 桌機 1280×720：雙欄各約 553px、主圖 4:3、出價紀錄在主圖下方；手機 390×844：110px 方形主圖與右側名稱／分享按鈕並列，其後依序價格、倒數、結標結果、兩欄資料、出價紀錄；兩者均無 document overflow。
- 已確認問題：目前視覺仍混用圓角卡片、膠囊 badge、陰影／發光、emoji 與 inline style，未完全對齊已驗收選購鏈；手機隱藏最低增額與直購價摘要；未登入同時提供 LINE 與 Google，但 LINE 身分進入表單後仍被 placeBid 拒絕；`min_increment`／`buy_now_price` 型別允許 null，畫面仍直接運算及顯示並永遠呈現直購按鈕；狀態只依 end_time、不讀 status；出價讀取失敗只記 console，頁面錯誤與不存在合併；不存在 URL 回傳 HTTP 200、robots `index, follow` 且保留 canonical；出價紀錄每 15 秒輪詢而非 Realtime；直購以 confirm 後開啟 LINE，未驗證 nullable 價格；圖卡 Canvas 受 CORS 影響可能失敗，成功圖卡 alt 為英文 Promo Result；dialog 可 Escape／背景關閉並有 focus trap，但未鎖背景捲動；實際 title 被全域模板追加 `| Gencko Studio`。
- 本次 UI 修正：保留既有競標、登入、資料、API、分享及 SEO 邏輯，將畫面統一為白底、品牌橘、細線與直角語彙；主圖改為 1:1；價格統一 NT$ 千分位；手機恢復最低增額與直購價；整理按鈕、出價紀錄、loading、找不到商品及宣傳圖卡 dialog。桌機、手機、已結標、受控 active 未登入與不存在狀態均已實測。

### 05 `/auction` 盤點索引與續作證據（2026-09-08）

- 區塊編號：S01 文件識別；S02 手機返回；S03 頁首介紹；S04 競標目錄標題；S05 loading／競標卡目錄；S06 空狀態；S07 SEO／JSON-LD。
- 功能編號：F01 SSR schema 資料；F02 CSR 競標資料；F03 Realtime；F04 loading；F05 empty；F06 error；F07 卡片詳情入口；F08 圖片與 placeholder；F09 狀態；F10 倒數；F11 ending-soon；F12 價格；F13 響應式／hover／focus／reduced motion；F14 返回；F15 SEO／JSON-LD。
- 正式 hydration 實測：1440×1000 與 390×844 的 auctions 查詢皆為 200，目前 `status=active` 且 `end_time > now` 為 0；空狀態可見、無 console/page error、無 document overflow。
- 受控有資料實測：桌機三欄、手機兩欄、圖片 1:1；整卡連往 `/auction/{{id}}`，競標中 badge、起標／直購價、倒數與三分鐘內 ending-soon 均可見。正式 active 資料仍待覆蓋。
- 已確認問題：loading 使用個體資料的 `store.loading`，延遲 auctions 回應時會先誤顯示空狀態；競標讀取錯誤沒有頁面回饋或重試，且初次失敗後重進頁面不會再載入；卡片不顯示目前最高出價；nullable 直購價會顯示單獨 `$`；時間自然歸零只改文案為已結標，不主動移除卡片；Realtime INSERT／UPDATE 不重新依結標時間排序且沒有 DELETE handler；SSR schema 只以未到期過濾、未限制 status active；隱藏 FAQ schema 沒有對應頁面可見 FAQ；Speakable 的 `.page-title` 不存在；實際 title 重複品牌後綴；空狀態沒有說明或導流且上下留白很大；載入分支沒有 H1 與頁首說明。

### 04 `/compare` 盤點索引與續作證據（2026-09-08）

- 區塊編號：S01 文件識別；S02 頁首說明、已選數量、返回與清空；S03 空狀態；S04 基因圖例與滑動提示；S05 比較表頭與移除；S06 物種／性別／出生／基因／狀態／售價列；S07 下一步操作；S08 SEO／JSON-LD。
- 功能編號：F01 query／Pinia ID 來源；F02 inventory hydration 與缺 ID；F03 空狀態；F04 清空；F05 單筆移除；F06 詳頁；F07 基因共有／獨有；F08 性別；F09 狀態／價格；F10 LINE／競標；F11 橫向表格；F12 響應式／hover／reduced motion；F13 SEO／structured data。
- 實測三筆：S-50026 ForSale、P-46543 Sold、S-41201 Auction。表格七列依序為物種、性別、出生日期、基因、狀態、售價、下一步。
- 桌機 1440px 表格寬 1048px；手機 390px 外層寬 327px、表格寬 928px，sticky 欄名寬 92px，橫向捲動限制在比較區內且 document 無 overflow。
- 已確認問題：query 優先於 store，故分享 URL 的單筆移除不會更新畫面；compareList 沒有 localStorage 持久化但 FAQ／featureList 宣稱會儲存；首次 hydration 會先顯示 0 筆空狀態再切成表格；query 不去重；一筆比較時所有基因同時符合 shared 與 unique；兩人共有但非全員共有的基因沒有圖例；FAQ 宣稱依擁有者數量排序但每欄仍使用原始 Genes 順序；Auction 無有效場次仍顯示競標中文字但沒有競標按鈕；Reserved／SelfKeep 顯示英文原始狀態；頁面 main 巢狀於 app main；HowTo／FAQ structured data 沒有對應可見內容。

### 03 `/product/:id` 盤點索引與續作證據（2026-09-07）

- 區塊編號：S01 文件識別；S02 loading／不存在／資料轉換等待；S03 返回列；S04 個體主圖與電子身分證入口；S05 個體識別、基因、照片提示、備註、性別、生日與照片日期；S06 價格／狀態與保證標記；S07 購買、收藏、分享與圖卡操作；S08 相似個體推薦；S09 取貨與購買須知；S10 宣傳圖卡 dialog；S11 動態 SEO／JSON-LD。
- 功能編號：F01 路由與 SSR 個體載入；F02 SSR 展場設定；F03 loading／not found／error；F04 返回；F05 主圖／電子身分證；F06 資料與溫控性別格式；F07 狀態／價格／展場；F08 競標場次匹配；F09 LINE 購買；F10 收藏；F11 歷史；F12 原生分享／剪貼簿 Toast；F13 Canvas 圖卡；F14 圖卡 dialog；F15 相似個體；F16 響應式／hover／reduced motion；F17 SEO／structured data。
- 實測在售 S-50026：雪花川白日蝕、WY／馬克雪花／川普白化／日蝕、孵化溫度 28 度、2026-07-23 出生、照片 2026-08-17、NT$1200；相關個體 8 筆。
- 狀態實測：P-46543 顯示 SOLD OUT／已售出且無購買 CTA；S-96483 顯示非賣（自留）且無購買 CTA；S-41201 的 animals 狀態為 Auction，但沒有匹配的有效場次，實際顯示 NT$0 與 LINE 購買。
- 已確認問題：主圖沒有 alt 且點擊連往 /identity 而非 Lightbox；頁面沒有比較控制；無圖片沒有 placeholder；API error 與不存在合併；溫控在畫面推算公母機率；Auction 無有效場次時顯示一般價格與 LINE；Reserved 相關卡會顯示「已售出」；圖卡關閉按鈕只有 ✕ 且 dialog 不鎖背景捲動；外部 LINE 新分頁未明列 rel；Speakable 的 .prod-guarantee 不存在；動態 Product return/shipping schema 與可見條款不完全一致；不存在 URL 仍有 canonical 且正式環境沒有頁面專屬 noindex。

### 02 `/shop` 盤點索引與續作證據（2026-09-07）

- 區塊編號：S01 文件識別與頁首；S02 照片時效告示；S03 型錄階段標題；S04 桌機／手機篩選；S05 結果標題與搜尋；S06 結果摘要、物種、排序、歷史與收藏；S07 商品網格與翻牌卡；S08 空／載入狀態；S09 固定比較列；S10 頁面 SEO 現況（依使用者順序延後修改）。
- 功能編號：F01 SSR 與 CSR 資料載入；F02 query 還原／同步；F03 關鍵字搜尋；F04 物種切換；F05 狀態篩選；F06 價格篩選；F07 性別篩選；F08 年份篩選；F09 新手篩選；F10 基因分類與交集篩選；F11 排序；F12 歷史；F13 收藏；F14 漸進載入；F15 商品詳情／翻牌／圖片；F16 找相似；F17 比較；F18 手機篩選 dialog；F19 reset；F20 loading／empty／error；F21 展場／競標／售出狀態；F22 reduced-motion 與響應式；F23 SEO／JSON-LD。
- Hydration 實際值：預設豹紋守宮、價格高至低、販售中與已售出皆勾選；初始顯示 20 筆，捲到底後共 59 筆；肥尾守宮共 7 筆。豹紋年份 2026／2025／2024／2023，最高價 12000；肥尾年份 2025／2024／2023，最高價 7000。
- 桌機為 220px 左側篩選加右側三欄方形商品網格；手機為兩欄方形網格及 92dvh 底部篩選 dialog。1440、900、769、390、320 寬度皆無 document overflow。
- 本次已修改：指定文案與頁面 SEO；S01–S03 間距；桌機水平滿版篩選；手機女性選項、清除不關閉與套用按鈕；搜尋欄位範圍；獨立載入錯誤狀態；預設啟用數量與 query；窄版 fine-pointer 翻牌；手機性別／生日；孵化溫度不保證性別；移除 Shop 卡片找相似與互動格線；按鈕視覺統一。
- 依使用者指示未修改：結果摘要仍顯示目前已渲染的 `shopList.length`；日期格式；真實裝置、展場、競標、Reserved、收藏／歷史與比較列等無現成 runtime 狀態者保留待覆蓋。

### 01 `/home` 盤點索引與續作證據（2026-09-07）

- 區塊編號：S01 Hero；S02 快速導覽；S03 熱門精選；S04 最新文章；S05 品牌與購買信任導流。
- 功能編號：F01 Hero 選購入口；F02 Hero 新手入口；F03 Hero 圖片入口；F04 快速導覽鍵盤／點擊；F05 LIVE 判定；F06 熱門資料載入；F07 跑馬燈與 reduced-motion；F08 熱門卡詳情／圖片 fallback／狀態 badge；F09 文章清單；F10 信任導流；F11 響應式與防換行；F12 SEO metadata。
- Hydration 實際值：熱門個體 22 筆分成兩列，每列元件各自建立接縫與 aria-hidden 複本；文章顯示 3 筆；active auction 為 0，故無 LIVE。熱門卡已依指示不渲染 SOLD／AUCTION 標籤。
- 桌機量測：1440/1280/1024/900/769 無頁面橫向溢位；Hero 維持雙欄且文字上移；快捷入口維持四欄、高度 78px；文章固定三張等寬，不再有首篇跨欄。
- 手機量測：390/320 無頁面橫向溢位；Hero 圖片位於標題後、說明前；Hero 兩個 CTA 同列；快速導覽兩欄；文章固定兩欄；信任卡單欄；熱門卡 128px。長品系名保持單行並以 ellipsis 表示截斷。
- 來源限制：首頁沒有獨立資料錯誤視圖；animals 查詢失敗後會落入熱門空狀態，articles 查詢失敗會留下空白文章 grid。Hero 圖為本地 assets/NDBE.jpg；熱門與文章來自 Supabase，於 app.vue onMounted 載入。

### 00 盤點索引與續作證據（2026-09-07）

- 區塊編號：S01 全域底層與跳至內容；S02 頂欄品牌與工具；S03 桌機四組導覽；S04 閱讀進度；S05 返回鍵；S06 PageHero；S07 共用文件抬頭；S08 按鈕與表單視覺；S09 載入與空狀態；S10 NextCta；S11 收藏詢問浮鈕；S12 Footer；S13 BottomNav；S14 Bottom Sheet；S15 Toast；S16 Lightbox；S17 iOS 安裝提示；S18 runtime overlay 與頁內錯誤；S19 全站 404/500；S20 離線頁。
- 功能編號：F01 跳至內容；F02 品牌/首頁/會員入口；F03 桌機導覽；F04 手機導覽；F05 選單焦點與鎖捲動；F06 導覽 active 分組；F07 主題；F08 捲動/閱讀進度/載入上限；F09 路由重用與捲動還原；F10 返回鍵；F11 Hero/CTA/文件抬頭；F12 按鈕/表單/focus；F13 資料載入與 Skeleton；F14 本機狀態還原/比較；F15 收藏詢問；F16 Toast；F17 Lightbox 開關/歷史；F18 Lightbox 觸控/圖片/購買；F19 PWA 安裝；F20 iOS 視窗；F21 登入共用狀態；F22 runtime/頁內錯誤；F23 404/500；F24 離線；F25 Footer/外連；F26 SEO/分享；F27 動畫/追蹤/效能。
- 有來源或畫面證據的待決定項目：手機 Footer 後段雙欄覆蓋前段單欄；日間 --pri 最終為 #c8340a 而非前段 #cc3b08；頂欄控制有 34px/38px 高度、disclosure 28px 寬；CSS focus/hover 展開與 aria-expanded 分離；Navbar mouseleave 未按觸控能力解除；閱讀進度仍用 -50px 對應現行 64px nav；全域 overflow-x hidden；Lightbox 提示向下但正負 100px 均關閉且缺 dialog/focus trap/body lock；iOS 提示缺 dialog/焦點管理；Toast 不合併計時器；NextCta 六 actions 在手機形成六欄且 /guide 有重複 /shop key；背景 SVG 桌機仍掛載；Logo 已是 wsrv URL，72px 參數不再套用；錯誤和離線「回到首頁」到 /，app 頁內錯誤到 /home；runtime 詳細錯誤未限 dev；PWA 拒絕後 canInstall 與 deferredPrompt 狀態分離。
- 全域共用 owner 影響全部 29 個路由模板；HeroLabPage 在 / 與 /hero-lab 以 body class 隱藏 Navbar/Footer/BottomNav，故不是每條路由均可見。來源仍掛載。
- PageHero/NextCta 消費頁完整清單：/start-here、/guide、/buying-guide、/why-gencko。其 slot 與 props 文字仍由呼叫頁所有；未獲授權修改。
- TheBackButton 消費頁完整清單：/auction、/auction/:id、/health、/faq、/genes/:id、/identity/:id、/product/:id、/merch/:id。
- SkeletonCard 消費頁完整清單：/home、/shop、/auction、/merch、/articles；/home 僅記依賴，不開啟或盤點頁面。
- Lightbox 正常開啟來源：/auction/:id、/merch/:id；Toast 來源：/auction/:id、/product/:id、/merch/:id。Timeline 只有 /buying-guide 消費，屬該頁 owner；GradientButton 的引用搜尋只命中 /home，本次僅記錄依賴，不提前盤點首頁。
- 全站共用樣式內仍有頁面專用舊 selector；已讀取以釐清 cascade，不將各頁內容或商業功能提前納入 00 修改。
