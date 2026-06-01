# \# 技能自動探索與調用原則 (Auto-Skill Discovery)

# \* 我已經在你的系統中安裝了近 90 個技能（Skills/Plugins）。

# \* 在我未來指派「任何新任務」給你時（例如：部署、除錯、測試、寫元件），請你先「自動掃描」你的技能庫。

# \* 評估並挑選出 1\~3 個最適合該任務的工具，主動搭配使用。

# \* 在開始執行任務前，請用一句話簡短向我報告：「🔧 系統判定調用：\[技能A]、\[技能B]」，然後再開始做事。

# 

# \---

# 

# \# 🎨 頂級開源 UI / 3D 特效資源庫與移植準則 (Top-Tier UI \& 3D Resources)

# 

# 為了確保專案視覺達到一線水準，且程式碼優美不混亂，當使用者要求「酷炫、現代、3D」效果時，\*\*絕對禁止 AI 憑空亂捏醜陋的 CSS/JS\*\*。

# 請優先從以下\*\*完全免費且可適應 Vue 3 / Nuxt 3\*\* 的神級 UI 庫中尋找靈感，並進行完美移植：

# 

# \## ⚠️ 執行前必讀

# 在實作任何 UI 元件前，請先閱讀 GitHub Issue \#5（Design Rule）：
# https://github.com/zzes50708/gencko-studio/issues/5
# 
# 該 Issue 包含：全站 42 個現有 UI 元件清單、資源庫優先級表、Inspira UI 三步驟查詢協議、中英組件名對照表。

# \## 1. 核心免費資源庫清單 (Approved Free Libraries)

# \*   \*\*\[Vue 原生首選] Inspira UI\*\*：Vue 版本的 Aceternity UI，請作為首選，直接使用其組件邏輯。

# \*   \*\*\[頂級視覺] Aceternity UI / Magic UI\*\*：這兩者極度適合現代科技感。雖然原生是 React，但請你展現強大的翻譯能力，將其「無縫移植」為 Vue 3 `<script setup>` 語法。

# \*   \*\*\[3D 開發王者] TresJS\*\*：Vue 專屬的 3D 庫（Three.js 的 Vue 封裝）。當使用者要求真正的 3D 場景（粒子、模型、流體）時，必須使用 TresJS 實作，保持 Vue 的宣告式寫法。

# \*   \*\*\[免寫 Code 3D] Spline (Free Tier)\*\*：當需要高質感且互動的 3D 物件，且不想寫複雜 WebGL 時，請指導使用者在 Spline 拉好模型，並使用 `@splinetool/vue-spline` 嵌入。

# \*   \*\*\[微互動與純 CSS] Uiverse.io / UI Initiative (僅限免費開源 Demo)\*\*：作為輔助，提取高品質的按鈕、純 CSS 3D 翻牌或 Swiper 炫酷特效。

# 

# \## 2. 完美移植鐵律 (Strict Porting Rules)

# 當你從 React (Aceternity) 或 Vanilla JS 移植特效到本 Vue 專案時，必須遵守：

# 1\.  \*\*Vue 3 最佳實踐\*\*：只使用 Composition API (`<script setup>`)，依賴 `ref`, `computed`, `watch`。

# 2\.  \*\*避免直接操作 DOM\*\*：使用 Vue 的 `Template Refs` (`const el = ref(null)`) 代替 `document.querySelector`。

# 3\.  \*\*動畫降級與清理\*\*：如果使用 JS 驅動動畫（如 GSAP 或 `requestAnimationFrame`），必須在 `onUnmounted` 中徹底清除，避免 Memory Leak。

# 

# \---

# 

# \# 📱 UI/UX 響應式與動畫開發鐵律 (Strict UI/UX \& Animation Rules)

# 

# 在實作任何 UI 元件、特效（特別是上述的 3D 特效與現代 UI）時，請你務必嚴格遵守「優雅降級（Graceful Degradation）」原則。你必須清楚區分「有滑鼠的設備（Desktop）」與「觸控設備（Mobile）」，並套用以下限制：

# 

# \## 🚫 手機端/觸控設備「絕對禁止」事項 (Mobile Restrictions)

# 當設備寬度低於 `md` (768px)，或是沒有精確游標 (`pointer: coarse` / no hover) 時：

# 1\. \*\*禁止綁定滑鼠事件\*\*：絕對不可在手機端註冊或執行 `@mousemove`, `@mouseenter`, `@mouseleave` 等監聽器，這會嚴重消耗手機效能。

# 2\. \*\*禁止 Hover 作為唯一觸發條件\*\*：手機沒有 Hover，任何需要 Hover 才能顯示的重要資訊必須「預設展開」或改為「點擊展開」。

# 3\. \*\*禁止 3D 視差與游標追蹤\*\*：禁止在手機端執行「3D 翻轉 (Tilt)」、「游標追蹤發光 (Spotlight/Glow)」等特效。

# 4\. \*\*禁止高耗能背景\*\*：禁止在手機端渲染大量的 Canvas 粒子、3D 模型、流星特效 (Meteors) 或複雜的 WebGL。請降級為靜態背景、CSS 漸層或單純的 SVG / 靜態 WebP。

# 

# \## ✨ 電腦端「允許」的特效 (Desktop Capabilities)

# 當設備寬度大於等於 `md` (768px)，且具備精確游標 (`pointer: fine` \& `hover: hover`) 時：

# 1\. 允許實作各種複雜的游標互動（如：卡片發光邊框、磁吸按鈕、真正的 3D 滑鼠連動翻轉）。

# 2\. 允許加載 TresJS / Spline 等 WebGL 畫布與高複雜度的進場動畫。

# 

# \## 🛠️ 技術實作規範 (Tech Implementation Guidelines)

# 為了達成上述限制，你在寫 Vue 3 / Nuxt 3 程式碼時，必須遵守以下寫法：

# 1\. \*\*CSS 判定\*\*：請善用 CSS Media Queries (`@media (hover: hover)`) 或 Tailwind 的 `md:` 來控制特效區塊的顯示與隱藏。

# 2\. \*\*JS/邏輯判定\*\*：當動畫依賴 JS 渲染 3D 時，請務必先使用 `@vueuse/core` 的 `useMediaQuery('(hover: hover) and (pointer: fine)')`。只有在支援滑鼠的設備上，才允許掛載 `<canvas>` 或執行 WebGL 渲染迴圈。

# 3\. \*\*手機端替代方案\*\*：對於手機端，請使用輕量級的「滾動進入 (Scroll Reveal)」或是單純的 CSS 過渡 (Transition) 作為動畫替代方案。

