# Supabase Migration Framework

DB schema 變更歷史用 Supabase CLI 管理，避免 Studio 改完即忘的問題。

## 一次性：連到雲端專案

```bash
# 用你的 Supabase 帳號登入（會開瀏覽器）
npx supabase login

# 把本地 repo 對應到雲端 project
npx supabase link --project-ref sfndneptcwhblvrxykcy
# 系統會問 DB password（在 Supabase Dashboard → Settings → Database 找）
```

## 日常流程

### 1. 拉取目前雲端 schema 為基準 migration（第一次或大改後）

```bash
npm run db:pull
```

會在 `supabase/migrations/<timestamp>_remote_schema.sql` 產生快照。

### 2. 開發新 migration

```bash
# 建立空 migration 檔
npx supabase migration new add_breeders_table

# 編輯產生的檔案，寫 SQL（CREATE TABLE / ALTER / ...）
# 路徑：supabase/migrations/<timestamp>_add_breeders_table.sql
```

### 3. 套用到本地 dev 環境測試

```bash
# 需先裝 Docker Desktop
npm run db:start    # 啟動本地 supabase stack
npm run db:reset    # 清庫 + 重跑所有 migration（含新加的）
```

### 4. 推送到雲端 production

```bash
npm run db:push     # 把未套用的 migration 推到雲端
```

### 5. Diff（偵測 Studio 改過但沒寫成 migration 的變更）

```bash
npm run db:diff -- -f auto_diff_$(date +%s)
```

會生出一份「雲端 vs migrations」的 diff，方便補回 history。

## 既有 migration

- `20260626000000_initial_hospitals_data.sql` — 原本散落在 `supabase/migrate_hospitals.sql`，搬進 migrations history 作為起點。

## 不要做

- ❌ 直接在 Supabase Dashboard 的 SQL Editor 改 schema 後不寫 migration
- ❌ 編輯歷史 migration 檔（會破壞已部署環境的一致性）
- ❌ 把 DB password 寫進 commit
