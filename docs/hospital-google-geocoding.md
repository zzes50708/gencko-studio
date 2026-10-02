# 醫院座標批次定位

## 免費方案：OpenStreetMap Nominatim

不想啟用 Google 計費時，請使用免費的 Nominatim 腳本。它不需要 API 金鑰或帳單帳戶，會以公開服務規範的單執行緒、每秒最多一筆方式處理一次性資料，快取每一筆回應，並在網頁上保留 OpenStreetMap 點位來源標示。

```powershell
npm run geocode:hospitals:nominatim
```

先檢視 `output/hospital-geocoding-YYYYMMDD/nominatim-geocoding-audit.json`；只有城市、行政區、路名與門牌完全相符的候選結果，才使用：

```powershell
npm run geocode:hospitals:nominatim -- --write
```

此方式適合目前一次性補足少量院所，但並不適合作為網站訪客即時搜尋服務。請遵守 [Nominatim 使用規範](https://operations.osmfoundation.org/policies/nominatim/)。

本流程只處理 `public.hospitals` 中狀態為 `active` 且缺少經緯度的資料。它使用 Google Maps Geocoding API，以地址取得候選座標，再要求城市、行政區與路名門牌全部吻合。任何部分比對、跨區或門牌不同的結果都只會留在審核檔，不會寫入。

## 初次設定

1. 在 Google Cloud 建立或選擇專案，啟用 **Geocoding API** 與計費。
2. 建立僅允許 **Geocoding API** 的 API 金鑰。此金鑰只供本機管理腳本使用，請不要放入 Nuxt 的公開設定或 Git。
3. 在本機 `.env` 加入一行：

```env
GOOGLE_MAPS_GEOCODING_API_KEY=你的金鑰
```

此腳本寫入後資料會保存到 Supabase，因此不需要把金鑰放到 Vercel。

## 執行方式

先預演並檢查輸出：

```powershell
node scripts/geocode-hospitals-google.mjs
```

審核 `output/hospital-geocoding-YYYYMMDD/google-geocoding-audit.json` 的結果。通過地址檢核的候選結果才可寫入：

```powershell
node scripts/geocode-hospitals-google.mjs --write
```

可先測試少量資料：

```powershell
node scripts/geocode-hospitals-google.mjs --limit=5
```

寫入時每筆都以 `id`、原始地址及「經緯度仍為空」三個條件保護；若有人在執行期間改過資料，腳本會停止，避免覆蓋新資料。
