# Gencko 官網 — 會話交接文件

**日期**：2026-05-21  
**Repo**：`https://github.com/zzes50708/gencko-studio`  
**Branch**：`claude/eloquent-nightingale-5144b3` → 推送至 `main`  
**最新 commit**：`6a5bcb0` fix: 恢復 Navbar logo 圖片

---

## 技術基礎（速查）

| 項目 | 說明 |
|------|------|
| 框架 | Nuxt 3 + Vue 3 + Pinia |
| DB | Supabase（anon key 在 nuxt.config.ts；RLS 全關閉） |
| 部署 | Vercel（push to main 自動部署） |
| 圖片 CDN | jsDelivr → wsrv.nl（`utils/image.js` `getCleanUrl()`） |
| 詳細架構 | 見 `CLAUDE.md`（含完整 Supabase 表結構） |

---

## 本次會話完成的工作

### 一、文章撰寫（`C:\Users\User\Desktop\gencko-articles\`）

產出 5 篇守宮飼養文章 HTML，可直接貼入 Supabase `articles.content`：

| 檔案 | 主題 |
|------|------|
| `article-1-beginner-guide.html` | 豹紋守宮新手完整飼養指南 |
| `article-2-gene-guide.html` | 基因品系完整解說 |
| `article-3-hospital-guide.html` | 台灣特寵醫院就醫指南 |
| `article-4-breeding-guide.html` | 繁殖完整指南（本次新增） |
| `article-5-feeding-guide.html` | 餵食與補充品完整指南（本次新增） |

格式規範參見 Skill `gencko-gecko-article`（REFERENCE.md）。

---

### 二、Bug 修正（全數已 commit & push）

#### Commit `a0a4d3c` — 全站 5 項 bug 修正

| # | 檔案 | 問題 | 修正 |
|---|------|------|------|
| 36 | `pages/product/[id].vue` | fallback URL `${productId}` 缺 `.value`，og:url 輸出 `[object Object]` | 改為 `${productId.value}` |
| 37 | `app.vue` | 離開文章頁 `readingProgress` 未歸零，Navbar 進度條殘留 | route watcher 加 reset |
| 38 | `pages/auction/[id].vue` | 出價延長後本地 `end_time` 未同步，倒計時不更新 | 同步更新 `currentAuction.value.end_time` |
| 39 | `pages/compare.vue` | 「前往競標」連到 `/auction` 列表，不是詳頁 | 新增 `getAuctionLink()` 查出正確 auction.id |
| 40 | `components/TheNavbar.vue` | logo `<img>` 仍在（任務 #34 遺漏），改用 `store.logoUrl`，移除 `logoUrl` prop | 移除 img + prop |

#### Commit `69db07b` — shop TDZ + breeders 物種切換

- **`pages/shop/index.vue`**：`itemListSchema` 與 `useHead` 定義在 `sp`/`kw`/`fil` 等 ref **之前**，`@unhead/vue` 的 `watch({ immediate: true })` 在 setup 執行中立即求值，觸發 TDZ → `ReferenceError: Cannot access 'c' before initialization` + cascade `TypeError: dispose`。**修正**：所有狀態 ref 移到 `itemListSchema` 和 `useHead` 之前。
- **`pages/breeders.vue`**：`store.breeder_sp` 不存在於 store，物種 tab 永遠顯示「豹紋守宮」且無法切換。**修正**：改為本地 `ref('豹紋守宮')`。

#### Commit `9dde44c` — 動態路由空白頁（最重要）

**根本原因**：Nuxt 3 CSR navigation 預設複用同一個元件實例，setup 不重新執行。`product/[id].vue` 使用 function key 的 `useAsyncData` reactive refetch 不可靠 → `currentProduct = null` → 空白頁。

**修正**（共 4 個動態路由頁）：
```js
definePageMeta({ key: route => route.fullPath })
```
- `pages/product/[id].vue`：加 `definePageMeta` + 改靜態 key + 移除 store 快取路徑（避免 hydration mismatch）
- `pages/articles/[id].vue`：加 `definePageMeta`
- `pages/genes/[id].vue`：加 `definePageMeta`
- `pages/auction/[id].vue`：加 `definePageMeta`

#### Commit `6a5bcb0` — 恢復 Navbar logo

改從 `store.logoUrl` 直接取值（navbar 已有 store 引用），不需要 prop。

---

## 已知問題（本次未修正）

### `POST /cdn-cgi/rum 404`
- **原因**：Cloudflare 自動注入 RUM script，Vercel 沒有此 endpoint
- **修正方式**：在 Cloudflare Dashboard → Analytics & Web → Web Analytics 關閉注入，**不要**改 DNS Proxy 設定（灰雲）

---

## 當前檔案樹（關鍵路徑）

```
├── CLAUDE.md              ← 技術文件（Supabase 表結構、ID 格式、注意事項）
├── HANDOFF.md             ← 本文件
├── app.vue                ← 根元件（store 初始化、scroll、PWA）
├── nuxt.config.ts         ← Supabase key、PWA manifest、GA4
├── stores/
│   └── useMainStore.js    ← 全域狀態（inv、articlesList、auctionList 等）
├── components/
│   ├── TheNavbar.vue      ← logo + menu（用 store.logoUrl，無 logoUrl prop）
│   ├── TheBottomNav.vue
│   ├── TheLightbox.vue
│   ├── TheMarquee.vue
│   └── TheToast.vue
├── pages/
│   ├── index.vue          ← 首頁
│   ├── shop/index.vue     ← 商城（篩選、比較）⚠️ 狀態 ref 必須在 useHead 之前
│   ├── product/[id].vue   ← 個體詳頁（definePageMeta key）
│   ├── auction/[id].vue   ← 競標詳頁（definePageMeta key）
│   ├── articles/[id].vue  ← 文章詳頁（definePageMeta key）
│   ├── genes/[id].vue     ← 基因詳頁（definePageMeta key）
│   ├── compare.vue        ← 並排比較
│   ├── breeders.vue       ← 種群展示（物種用本地 ref）
│   └── profile.vue        ← 我的專區
└── utils/
    ├── image.js           ← getCleanUrl(url, width)
    ├── genes-db.js        ← GENES_DB 篩選標籤
    ├── faq.js             ← FAQ_DATA, FAQ_CATEGORIES
    └── hospitals.js       ← 全台特寵醫院資料
```

---

## 重要開發規則（避免再踩同樣的坑）

1. **`<script setup>` 宣告順序**：所有 `ref`/`reactive` 狀態必須在引用它們的 `computed`、`useHead`、`watch` **之前**宣告，否則 `@unhead/vue` 的 immediate watch 會觸發 TDZ。

2. **動態路由頁必須加 `definePageMeta`**：
   ```js
   definePageMeta({ key: route => route.fullPath })
   ```
   否則 Nuxt CSR 複用元件實例，`useAsyncData` 不重新抓取。

3. **`useAsyncData` key 用靜態字串**：不要用 function key（`() => 'xxx-${id.value}'`），改用：
   ```js
   const id = route.params.id
   const { data } = await useAsyncData(`prefix-${id}`, ...)
   ```

4. **`store.inv` 資料形狀與 Supabase 直查不同**：store 多了 `IsHot`、`CreatedDate`、`Source`，不能混用當作 SSR payload，否則 hydration mismatch。

5. **圖片一律走 `getCleanUrl(url, width)`**：第二參數依場景選擇（卡片 400、文章 600、詳頁 800）。

6. **genes 是 JSONB array**：已由 Supabase 自動解析，不需 `JSON.parse`。

7. **`animals.is_hot` 是 boolean**：用 `=== true` 判斷，不是 `=== 'Hot'`。

8. **`articles.status` 用大寫**：`'Published'` / `'Draft'`，store filter 已容錯 `.toLowerCase()`。

---

## 下一步可能的工作

- 將 `C:\Users\User\Desktop\gencko-articles\` 的 5 篇文章上傳到 Supabase `articles` 表
- 繼續撰寫更多守宮知識文章（Skill：`gencko-gecko-article`）
- 測試 `/product/[id]` 修正後是否正常（Vercel 部署後驗證）
- Cloudflare RUM 設定關閉（DNS 設定，非程式碼）

---

## 推薦 Skill

| Skill | 用途 |
|-------|------|
| `gencko-gecko-article` | 撰寫符合格式的守宮知識文章 HTML |
