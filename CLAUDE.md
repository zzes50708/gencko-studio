# Gencko 官網（gencko-vercel）— Claude 交接文件

## 技術棧
- **Nuxt 3** + Vue 3 + Pinia
- `@nuxtjs/supabase`（useSupabaseClient）
- 部署：Vercel

## 對應後台
後台 repo：https://github.com/zzes50708/gencko-admin（Vue 3 + Vite）

---

## Supabase 連線

URL：`https://sfndneptcwhblvrxykcy.supabase.co`
RLS：**全部關閉**（所有表公開讀寫，依賴後台登入控制）

---

## 資料表完整說明

### `animals`（核心個體表，後台主要寫入）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | TEXT PK | 格式：`P-12345`（購入）/ `S-12345`（自繁） |
| source | TEXT | `'purchased'` \| `'self_bred'` |
| species | TEXT | `'豹紋守宮'` \| `'肥尾守宮'` |
| morph | TEXT | 品系名稱 |
| genes | JSONB | `string[]`，例：`["川普白化","日蝕"]`，**已是陣列，不需 JSON.parse** |
| gender_type | TEXT | `'公'` \| `'母'` \| `'溫控'` |
| gender_value | TEXT | 溫控時填溫度數值 |
| birthday | TEXT | `'YYYY-MM-DD'` |
| cost_price | NUMERIC | 成本（官網不顯示） |
| listing_price | NUMERIC | 售價 |
| sold_price | NUMERIC | 成交價（售出後填） |
| status | TEXT | `'ForSale'`\|`'Auction'`\|`'Sold'`\|`'SelfKeep'`\|`'Trash'` |
| is_breeder | BOOLEAN | 種源個體 |
| is_hot | BOOLEAN | 熱門標記（**boolean，不是字串 'Hot'**） |
| buyer_name | TEXT | 買家姓名（後台填，官網不需要） |
| buyer_contact | TEXT | 買家聯絡（後台填，官網不需要） |
| shipped_at | DATE | 出貨日期 |
| tracking_no | TEXT | 運單號 |
| ship_carrier | TEXT | 物流商 |
| tags | JSONB | 自訂標籤陣列，例：`["待繁殖","觀察中"]` |
| image_url | TEXT | jsDelivr CDN URL |
| note | TEXT | 備註 |
| created_at | TIMESTAMPTZ | 建立時間 |

**官網讀取方式（useMainStore.js）：**
```js
// genes 已是 JSONB array，容錯舊格式
Genes: Array.isArray(i.genes) ? i.genes : (i.genes ? JSON.parse(i.genes) : [])

// is_hot 是 boolean
IsHot: i.is_hot === true ? 'Hot' : ''

// 只查官網需要的欄位
.select('id,source,species,morph,genes,gender_type,gender_value,birthday,listing_price,sold_price,status,note,image_url,is_hot,created_at')
```

---

### `articles`（文章管理）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | TEXT PK | |
| title | TEXT | |
| category | TEXT | |
| summary | TEXT | |
| content | TEXT | |
| image_url | TEXT | |
| status | TEXT | **`'Published'`（大寫）\| `'Draft'`** |
| author | TEXT | |
| publish_date | DATE | |
| keywords | TEXT | SEO 關鍵字 |

⚠️ **status 用大寫**：後台存 `'Published'` / `'Draft'`（不是小寫）

**官網過濾方式：**
```js
.filter(a => (a.status || '').toLowerCase() === 'published')
// 容錯大小寫
```

---

### `auction_bids`（拍賣出價）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGINT PK | |
| auction_id | TEXT | 對應拍賣 ID |
| user_name | TEXT | 出價者名稱 |
| phone | TEXT | 實際存 email |
| amount | NUMERIC | 出價金額 |
| bid_time | TIMESTAMPTZ | |

---

### `animal_health_logs`（體重/健康紀錄，官網目前不用）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | BIGINT PK | |
| animal_id | TEXT | |
| date | DATE | |
| event_type | TEXT | `'weight'`\|`'shed'`\|`'note'` |
| weight_g | NUMERIC | 體重（g） |
| fed | BOOLEAN | 是否餵食 |
| note | TEXT | |

---

### `merchandise`（周邊商品）

| 欄位 | 型別 |
|------|------|
| item_id | TEXT PK |
| name | TEXT |
| price | NUMERIC |
| image_url | TEXT |
| category | TEXT |
| available | BOOLEAN |
| external_link | TEXT |

---

### `genetic_pages`（基因圖鑑）

| 欄位 | 型別 |
|------|------|
| name | TEXT PK |
| image_url | TEXT |
| warning | TEXT |
| brief | TEXT |
| detail | TEXT |
| source | TEXT |

---

### `config`（跑馬燈 / 公告）

| 欄位 | 型別 |
|------|------|
| text | TEXT |
| url | TEXT |

---

## 官網重要路由

| 路由 | 說明 | 主要資料來源 |
|------|------|------------|
| `/shop` | 選購頁 | `animals` |
| `/product/[id]` | 個體詳情 | `animals` |
| `/auction/[id]` | 拍賣頁 | `auction_bids` |
| `/articles/[id]` | 文章頁 | `articles` |
| `/genes/[id]` | 基因圖鑑 | `genetic_pages` |
| `/identity/[id]` | 身份識別頁 | `animals` |

---

## 圖片網址格式

```
https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/animals/{filename}
```
jsDelivr CDN，無限頻寬，不消耗 Supabase 額度。

---

## 官網狀態對應

後台 `animals.status` → 官網顯示邏輯：
- `ForSale` → 待售（在 /shop 顯示）
- `Auction` → 拍賣中（在 /shop 顯示）
- `Sold` → 已售出（在 /shop 隱藏）
- `SelfKeep` → 自留（在 /shop 隱藏）
- `Trash` → 垃圾桶（在 /shop 隱藏）

---

## ⚠️ 常見陷阱

1. **genes 不需要 JSON.parse**：animals 表的 genes 欄位是 JSONB，Supabase 回傳已是 JS array
2. **is_hot 是 boolean**：用 `=== true` 判斷，不是 `=== 'Hot'`
3. **status 大寫**：`'Published'` 不是 `'published'`
4. **cost_price 不查**：官網不應顯示成本，select 時排除此欄
