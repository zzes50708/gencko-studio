# Gencko 官網（gencko-vercel）專案說明

## 技術棧
- Nuxt 3 + Vue 3
- @nuxtjs/supabase（useSupabaseClient）
- Pinia（stores/useMainStore.js）
- 部署：Vercel

## 對應後台
後台 repo：https://github.com/zzes50708/gencko-admin（Vue 3 + Vite）

## Supabase 資料庫
URL：sfndneptcwhblvrxykcy.supabase.co
RLS：**關閉**（全表公開讀取）

### 資料表對應關係
| 官網查詢        | 後台管理        | 說明 |
|---------------|---------------|------|
| `inventory`   | `animals`     | ⚠️ 兩張不同的表，需同步 |
| `articles`    | `articles`    | ✅ 相同 |
| `auction_bids`| `auction_bids`| ✅ 相同 |
| `merchandise` | —             | 官網獨有 |
| `genetic_pages`| —            | 官網獨有 |

### animals 表欄位（後台寫入）
```
id           TEXT PRIMARY KEY   (格式：P-12345 購入 / S-12345 自繁)
source       TEXT               ('purchased' | 'self_bred')
species      TEXT               ('豹紋守宮' | '肥尾守宮')
morph        TEXT               品系名稱
genes        JSONB              string[] 陣列，例：["川普白化","日蝕"]
gender_type  TEXT               ('公' | '母' | '溫控')
gender_value TEXT               溫控時填溫度
birthday     TEXT               'YYYY-MM-DD'
cost_price   NUMERIC            成本
listing_price NUMERIC           售價
sold_price   NUMERIC            成交價（售出後填入）
status       TEXT               ('ForSale'|'Auction'|'Sold'|'SelfKeep'|'Trash')
is_breeder   BOOLEAN            是否為種源個體
is_hot       BOOLEAN            是否熱門（官網用 === true 判斷）
buyer_name   TEXT               買家姓名（售出後填入）
buyer_contact TEXT              買家聯絡方式
image_url    TEXT               jsDelivr CDN URL
note         TEXT               備註
created_at   TIMESTAMPTZ
```

### articles 表欄位
```
id           TEXT PRIMARY KEY
title        TEXT
category     TEXT
summary      TEXT
content      TEXT
image_url    TEXT
status       TEXT   'Published' | 'Draft'（注意大寫）
author       TEXT
publish_date DATE
keywords     TEXT
```

## 重要注意事項

### genes 欄位
後台 animals 表：JSONB array → Supabase 回傳已是 JS array，**不需要 JSON.parse()**
舊 inventory 表：TEXT → 需要 JSON.parse()
useMainStore.js 已處理容錯：`Array.isArray(i.genes) ? i.genes : JSON.parse(i.genes)`

### is_hot 欄位
後台：boolean（true/false）
官網判斷：`i.is_hot === true || i.is_hot === 'Hot'`

### article status 大小寫
後台存入：'Published' / 'Draft'（大寫）
官網過濾：`a.status === 'Published' || a.status === 'published'`（兩者容錯）

## 圖片網址格式
jsDelivr CDN：`https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/animals/{filename}`

## 官網路由
- 選購頁：/shop（讀 inventory/animals 表）
- 個體頁：/product/[id]
- 拍賣：/auction/[id]
- 文章：/articles/[id]

## ⚠️ 待解決：inventory vs animals 表同步
目前官網讀 `inventory` 表，後台寫 `animals` 表，兩邊資料不通。
解法方案：
1. 在 Supabase 建 View：`CREATE VIEW inventory AS SELECT * FROM animals;`
2. 或更新官網 store 改查 `animals` 表
