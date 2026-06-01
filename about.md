\# Gencko Studio `/about` 頁面 3D 互動視覺升級指南



本文件基於 Gencko Studio 現有的前端架構（Nuxt 3 + Vue 3 + CSS Variables），規劃專屬的「3D 滾動視差互動（Scroll-driven 3D Experience）」實作方案。將媲美 Active Theory 的頂級網頁體驗，完美融入現有電商平台中，且不影響原有的載入效能。



\---



\## 一、 適合 Gencko Studio 的技術選型



因為你的網站是使用 \*\*Vue 3 / Nuxt 3\*\* 開發，我們不需要硬刻原生的 WebGL，也不適用 React 的生態系（如 R3F）。建議採用以下兩種方案之一：



\### 方案 A：極致客製化（程式碼驅動）

適合有一定 JavaScript 基礎，且希望深度控制每一個粒子特效的狀況。

1\. \*\*渲染核心：`TresJS` (`@tresjs/core`)\*\* 

&#x20;  - 這是專為 Vue 3 打造的 Three.js 包裝器，完美契合你的 Composition API 架構。

2\. \*\*滾動動畫引擎：`GSAP` + `ScrollTrigger`\*\* 

&#x20;  - 業界最強的動畫庫，用來將瀏覽器的原生滾動條綁定到 TresJS 攝影機的 Z 軸移動上。

3\. \*\*模型壓縮：`GLTFLoader` + `DRACOLoader`\*\* 

&#x20;  - 確保你的 3D 守宮模型（.glb 格式）能壓縮在 3MB 以內。



\### 方案 B：最快落地、維護成本最低（強烈推薦）

如果你沒有專職的 3D 繪圖工程師，這是最適合現在 Gencko Studio 的做法。

1\. \*\*3D 編輯器：`Spline` (spline.design)\*\* 

&#x20;  - 在網頁瀏覽器上就能完成 3D 建模、材質設定與「滾動觸發動畫（Scroll Event）」的無程式碼工具。

2\. \*\*Nuxt 整合：`<spline-viewer>` Web Component\*\* 

&#x20;  - Spline 匯出後會給一段標籤，你可以直接包裝在 Nuxt 的 `<ClientOnly>` 標籤中，零負擔渲染。



\---



\## 二、 具體網頁架構做法 (Nuxt 3 實作範例)



在 Nuxt 中，3D 渲染\*\*絕對不能\*\*在伺服器端（SSR）執行，否則會報錯（因為 Node.js 沒有 Canvas API）。我們需要利用 `<ClientOnly>`，並將 HTML 結構分為「背景 3D 層」與「前景 UI 層」。



\### `pages/about.vue` 核心結構規劃：



```html

<template>

&#x20; <div class="about-page-wrapper">

&#x20;   <!-- 背景層：3D 渲染區域，固定於視窗 -->

&#x20;   <ClientOnly>

&#x20;     <div id="canvas-container">

&#x20;       <!-- 如果用 Spline，直接放這裡 -->

&#x20;       <spline-viewer url="https://prod.spline.design/你的專屬模型碼/scene.splinecode"></spline-viewer>

&#x20;     </div>

&#x20;   </ClientOnly>



&#x20;   <!-- 前景層：觸發滾動的 UI 與文字 -->

&#x20;   <div class="scroll-ui-layer">

&#x20;     <!-- 每一段 section 佔據 100vh，利用滾動驅動背景的 3D 動畫 -->

&#x20;     <section class="step step-1">

&#x20;       <h1 class="page-title">Gencko Studio</h1>

&#x20;       <p>專注於豹紋守宮的科學化選育，追求基因的純粹與健康。</p>

&#x20;     </section>



&#x20;     <section class="step step-2">

&#x20;       <h2 class="sec-title">基因的奧秘</h2>

&#x20;       <p>不再盲目配對。我們提供業界最專業的基因計算機與圖鑑，揭開隱性與共顯性基因的面紗。</p>

&#x20;     </section>



&#x20;     <section class="step step-3">

&#x20;       <h2 class="sec-title">特寵醫療資源網</h2>

&#x20;       <p>我們與全台特寵獸醫院建立資訊連結，為您的愛寵提供最完善的後盾。</p>

&#x20;     </section>

&#x20;     

&#x20;     <!-- 底部接回你原本的 Footer -->

&#x20;     <Footer />

&#x20;   </div>

&#x20; </div>

</template>



<style scoped>

/\* 隱藏預設 nav 的影響，設定專屬佈局 \*/

.about-page-wrapper {

&#x20; position: relative;

&#x20; width: 100%;

&#x20; background: var(--bg-dark); /\* 延用你現有的 CSS 變數 \*/

}



/\* 3D 畫布永遠固定在螢幕後方 \*/

\#canvas-container {

&#x20; position: fixed;

&#x20; top: 0;

&#x20; left: 0;

&#x20; width: 100vw;

&#x20; height: 100vh;

&#x20; z-index: 0;

&#x20; pointer-events: none; /\* 讓滑鼠可以穿透畫布點到背後的按鈕 \*/

}



/\* UI 層疊加在最上方 \*/

.scroll-ui-layer {

&#x20; position: relative;

&#x20; z-index: 10;

}



.step {

&#x20; height: 100vh; /\* 每一個段落高度滿版，創造滾動深度 \*/

&#x20; display: flex;

&#x20; flex-direction: column;

&#x20; justify-content: center;

&#x20; padding: 0 15%;

&#x20; color: var(--txt);

&#x20; text-shadow: 0 2px 10px rgba(0,0,0,0.8);

}

</style>

三、 專屬 3D 視覺腳本建議

結合 Gencko Studio 現有的專業形象與服務內容（基因計算機、全台醫院），建議的 /about 頁面滾動視角腳本如下：

場景 0：進站 (0% 滾動) -【專業展現】

視覺： 畫面正中央是一隻極其逼真、帶有呼吸起伏動畫的 3D 豹紋守宮（推薦：經典的高黃或是極致的黑夜），趴在深色岩石質感上。光影採用你網站現有的 --pri (橘紅色 #e8440a) 作為邊緣光（Rim Light），營造高級感。

文字： 浮現「Gencko Studio 專業選育」。

場景 1：滾動第一段 (33%) -【微觀世界】

視覺： 隨著滾輪往下，攝影機（Camera）快速往前推進（Zoom in），直接「穿透」守宮的皮膚，進入微觀世界。場景轉暗，四周漂浮著發光的粒子。

文字： 「探索基因的無限可能」。

場景 2：滾動第二段 (66%) -【基因科學】

視覺： 發光粒子在畫面中央匯聚，旋轉重組成一條 3D 的 DNA 雙螺旋結構。模型緩慢旋轉，並帶有全像投影（Hologram）的發光材質。

文字： 介紹「基因計算機」與「科學化選育」理念，展現與傳統繁殖場的差異化。

場景 3：滾動到底部 (100%) -【全台佈局與責任】

視覺： DNA 雙螺旋再度散開，粒子飛向畫面後方，最終排列成一個具有科技感的 「台灣 3D 地圖」。地圖上有幾個發光的節點（Pins）。

文字： 介紹「特寵醫院地圖」與「48小時健康保固」的品牌承諾。

收尾： 出現「回到商城」與「加入社群」的立體按鈕。

四、 Nuxt 架構下的致命注意事項（開發必看）

由於你的網站是 Single Page Application (SPA)，在實作 3D 頁面時一定要注意以下幾點，否則會把使用者的手機效能榨乾：

記憶體洩漏 (Memory Leak) 預防

當使用者從 /about 點擊導覽列切換到 /shop 時，背景的 WebGL Canvas 不會自動消失。你必須在 Vue 的 onBeforeUnmount 生命週期中，呼叫 Three.js 的 renderer.dispose()、清空 Scene、並且 cancelAnimationFrame。

(如果使用 Spline，<spline-viewer> 元件通常會自動處理這部分，這也是推薦 Spline 的原因)

Pixel Ratio 控制

現代 iPhone 的螢幕像素比高達 3。在初始化 3D 渲染器時，一定要限制 renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))，最高只渲染到 2 倍，否則手機發熱會非常嚴重。

主題切換的連動 (Day Mode / Dark Mode)

你的網站目前有 .day-mode 切換機制。你可以透過 Vue 的 watch 監聽主題變化，並將訊號傳遞給 3D 場景。例如：

深色模式：打橘紅色的聚光燈。

淺色模式：將背景轉為米白色，打明亮的全局光

