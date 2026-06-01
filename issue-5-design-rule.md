title:	[Design Rule] 建立 Inspira UI 組件使用規範與 AI 提示準則
state:	OPEN
author:	zzes50708
labels:	
comments:	0
assignees:	
projects:	
milestone:	
number:	5
--
## 問題描述

AGENTS.md 目前只將 Inspira UI 列為「Vue 原生首選」，但缺乏具體執行細節，導致：

1. **AI 無法識別翻譯詞彙**：使用者透過網頁翻譯查找組件時，中文名稱（如「動畫模態」）無法穩定對應到正確的英文組件名（`AnimatedModal`）
2. **AI 自行捏造 CSS/JS**：沒有明確指引時，AI 傾向自行撰寫特效，直接違反 AGENTS.md「絕對禁止 AI 憑空亂捏醜陋的 CSS/JS」原則
3. **文件查詢路徑不明**：AI 不知道應到哪個具體 URL 確認組件存在及其正確 API 用法
4. **缺乏降級策略**：當組件確實不在 Inspira UI 中時，沒有明確後備方案
5. **Nuxt 3 引用方式不清**：auto-import 環境下是否需要手動 import 並未說明

---

## 目標

將「Inspira UI 優先」從口號升級為具體可執行的規範，讓 AI 在每次實作 UI 組件時都有明確依據，且能與 AGENTS.md 既有規則無縫整合。

---

## 驗收標準

- [ ] AGENTS.md 補充「Inspira UI 執行細則」專屬段落
- [ ] 包含 **文件 URL 結構規則**（讓 AI 自行推導查詢路徑）
- [ ] 包含 **常見中英組件翻譯對照表**（覆蓋至少 15 個常用組件）
- [ ] 包含 **三步驟查詢協議**（先查文件 → 確認存在 → 用官方邏輯實作）
- [ ] 包含 **降級優先順序**（Inspira UI 無此組件時的後備方案）
- [ ] 包含 **Nuxt 3 auto-import 說明**
- [ ] 補充 **全站現有 UI 元件完整清單**（作為改版範圍基準）

---

## 一、全站現有 UI 元件完整清單（改版範圍基準）

> 所有改版工作應以此清單為依據，每項元件對應一個可交付的設計任務。

### 全站通用佈局 (Global Layout)
1. **全站背景層** (Body Background)：目前為蜂巢與光暈
2. **全站主要容器** (Main Container)：限制最大寬度與內距的 `.cont`
3. **全局捲軸** (Custom Scrollbar)：客製化的滾動條
4. **全站載入遮罩** (Loader Overlay)：載入中全黑與旋轉動畫
5. **全站提示氣泡** (Toast Notification)：已複製到剪貼簿等短暫提示
6. **骨架屏載入狀態** (Skeleton Loading)：資料未載入前的閃爍灰塊
7. **返回上一頁按鈕** (Back Button)：帶箭頭的返回鍵

### 導航與選單 (Navigation & Menus)
1. **頂部跑馬燈公告列** (Top Marquee)：最上方循環捲動的文字列
2. **頂部導覽列** (Sticky Navbar)：吸頂的導航本體
3. **桌機導覽下拉選單** (Navbar Dropdown)：滑鼠懸停出現的子選單
4. **日夜模式切換按鈕** (Theme Toggle)
5. **桌機版下載 App 按鈕** (Desktop Install Button)
6. **閱讀進度條** (Reading Progress Bar)：看文章時 Navbar 底部的進度線
7. **手機版滿版側滑選單** (Mobile Menu Overlay)：漢堡選單點開的滿版區塊
8. **手機版手風琴展開選單** (Mobile Accordion Group)：手機選單內的折疊子項目
9. **手機版下載 App 橫幅** (Mobile Install Banner)：手機選單內的大型安裝提示
10. **手機底部導覽列** (Bottom Nav)：手機專屬的底部固定四大分頁
11. **頁尾區塊** (Footer)：版權宣告與工作室名稱

### 首頁專屬區塊 (Home Page)
1. **首屏主視覺區塊** (Hero Section)：有大字體的大張首圖區
2. **首屏主按鈕群** (Hero Buttons)：加入社群、IG、FB 等按鈕
3. **快速導覽情境卡列** (Scenario Grid)：新手入門、線上競標等四格捷徑卡
4. **首頁各大區塊容器** (Home Sections)：包覆熱門、知識、文章的大型底板
5. **區塊標題與查看更多** (Section Headers)：帶有左側粗線條的標題與右側連結
6. **熱門精選橫向滾動卡列** (Hot Picks Track)：兩排無限滾動的卡片列
7. **知識入口卡片列** (Knowledge Grid)：飼養指南、計算機等圖文橫卡

### 商品、文章與列表元件 (Lists & Cards)
1. **一般商品卡片** (Product Card)
2. **競標專屬卡片** (Auction Card)
3. **文章展示卡片** (Article Card)
4. **相簿縮圖卡片** (Photo Slim Card)：純展示基因與價格的小卡
5. **商品狀態標籤** (Status Badges)：SOLD、競標中、保留中等貼紙
6. **收藏愛心按鈕** (Favorite Button)：卡片右上角的愛心
7. **側邊篩選面板** (Filter Panel)：桌機側邊的分類勾選區塊
8. **手機版篩選展開按鈕** (Mobile Filter Toggle)
9. **搜尋輸入框** (Search Input)
10. **頁籤導航列** (Tabs)：例如選購頁面上方的分類切換
11. **標籤列** (Tags)：供點擊篩選的藥丸狀按鈕
12. **排序與功能控制列** (Controls Row)：包含下拉選單、收藏切換、歷史紀錄的工具列

### 詳情頁與互動模態框 (Details & Modals)
1. **圖片燈箱模態框** (Lightbox Modal)：點擊圖片放大的滿版黑底層
2. **燈箱下滑關閉提示** (Swipe to Close Hint)：手機版燈箱上方的指示條
3. **燈箱內購買按鈕** (Lightbox Buy Button)
4. **右下角浮動詢問按鈕** (Floating Inquire Button)：顯示「❤已選X隻」的長條按鈕
5. **商品詳情主視覺區** (Product Image Box)：商品頁大圖展示
6. **商品詳情資訊區** (Product Info Box)：右側包含價格、基因、保障說明的區塊
7. **商品詳情大型購買按鈕** (Buy Large Button)
8. **手機版底部購買固定列** (Mobile Buy Bar)：手機看商品時固定在最底下的購買列
9. **文章閱讀器容器** (Article Reader Container)：包覆文章圖文的深色卡片
10. **常見問題摺疊面板** (FAQ Accordion)：點擊展開解答的問答條
11. **飼養表格與引言** (Care Table & Quote)：飼養頁面的資料對齊表格與引言區

### 系統與 App 功能 (System & App Prompts)
1. **PWA 更新提示氣泡** (PWA Update Toast)：發現新版本時的底部提示
2. **iOS 安裝教學彈窗** (iOS Install Guide Modal)：教蘋果用戶如何加入主畫面的底部抽屜
3. **全站錯誤捕捉除錯面板** (Runtime Error Overlay)：報錯時出現的頂部紅色/黑色文字板

---

## 二、專案指定 UI 與 3D 資源庫清單

> AI 在改版任何上述元件時，**必須優先從以下清單取材**，禁止憑空撰寫特效。  
> **允許使用 `browser-use` 工具直接查詢下列網站**，以確認組件是否存在、取得正確 API 與範例程式碼。

| 優先級 | 資源庫 | 網址 | 備註 |
|---|---|---|---|
| 1 | **Inspira UI** | https://inspira-ui.com/ | Vue 原生首選，直接使用 |
| 2 | **Aceternity UI** | https://ui.aceternity.com/ | React，需移植為 Vue 3 |
| 3 | **Magic UI** | https://magicui.design/ | React，需移植為 Vue 3 |
| 4 | **TresJS** | https://tresjs.org/ | Vue 專屬 3D（Three.js 封裝） |
| 5 | **Spline** | https://spline.design/ | 免費 3D 互動物件嵌入 |
| 6 | **Uiverse.io** | https://uiverse.io/ | 純 CSS 微互動輔助 |
| 7 | **UI Initiative** | https://uiinitiative.com/ | 純 CSS / Swiper 特效輔助 |

---

## 三、Inspira UI 執行細則

### 1. 文件 URL 結構規則

```
https://inspira-ui.com/docs/en/components/{category}/{kebab-case-component-name}
```

常見 category：`backgrounds` / `text-animations` / `miscellaneous` / `cards` / `buttons` / `effects`

AI 在實作前**必須先確認 URL 並讀取官方 API**，不得假設 props 或 slot 名稱。

### 2. 常見中英組件名對照表

| 翻譯後中文 | 英文組件名 | category | 路徑片段 |
|---|---|---|---|
| 動畫模態 | `AnimatedModal` | miscellaneous | `animated-modal` |
| 背景光束 / 光束背景 | `BeamsBackground` | backgrounds | `beams-background` |
| 背景漸層 | `BackgroundGradient` | backgrounds | `background-gradient` |
| 粒子背景 | `ParticlesBackground` | backgrounds | `particles-background` |
| 流星雨 | `Meteors` | backgrounds | `meteors` |
| 格線圖案 | `DotPattern` / `GridPattern` | backgrounds | `dot-pattern` |
| 閃爍文字 | `TextShimmer` | text-animations | `text-shimmer` |
| 打字機效果 | `Typewriter` | text-animations | `typewriter` |
| 文字漸變 | `GradientText` | text-animations | `gradient-text` |
| 聚光燈卡片 | `CardSpotlight` | cards | `card-spotlight` |
| 翻轉卡片 | `FlipCard` | cards | `flip-card` |
| 磁吸按鈕 | `MagneticButton` | buttons | `magnetic-button` |
| 聚光燈 | `Spotlight` | effects | `spotlight` |
| 視差滾動 | `Parallax` | effects | `parallax` |
| 數字計數 | `NumberTicker` | text-animations | `number-ticker` |

### 3. 三步驟查詢協議（強制）

1. **查文件**：推導 URL → 使用 `browser-use` 確認組件存在
2. **確認 API**：讀取官方 props / slots / emits，以官方 `<script setup>` 為基礎，**不得自行改寫動畫邏輯**
3. **移植實作**：適配本專案（如替換成 Nuxt UI `UButton`），保持動畫核心不變

### 4. 降級優先順序

```
Inspira UI → Aceternity UI（Vue 3 移植）→ Magic UI（Vue 3 移植）→ Uiverse.io 純 CSS → 最後才自行實作
```

### 5. Nuxt 3 Auto-Import 說明

本專案透過 Inspira UI Nuxt module 設定 auto-import，**組件可直接在 template 使用，無需 `import`**。  
若輸出程式碼含 `import { AnimatedModal } from '...'`，請自動移除。

---

## 相關參考

- Inspira UI 官網：https://inspira-ui.com/
- Inspira UI Nuxt 安裝指南：https://inspira-ui.com/docs/en/getting-started/installation/nuxt
- 本專案 AGENTS.md（現有規則）
