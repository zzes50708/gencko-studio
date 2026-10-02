# 3D 立體斜視台灣特寵醫院地圖可行性

研究日期：2026-09-15

## 結論

以 GPT-6 Astra 在現有 Nuxt 3 / Vue 3 專案中製作此功能，**技術可行性高**。建議桌機版採「**MapLibre GL JS 底圖 + deck.gl 立體資料層**」，以斜視相機呈現台灣，並用 `ColumnLayer`、`IconLayer` 或 `GeoJsonLayer` 顯示醫院；手機版依專案規則不掛載複雜 WebGL，保留現有清單、篩選與 Google Maps 導航，另提供靜態 SVG／圖片版台灣位置概覽。

目前真正的前置阻礙不是程式生成能力，而是 `hospitals` 資料只有地址、縣市與 Google Maps 連結，**沒有可供地圖定位的經緯度**；見 [現有查詢欄位](../pages/hospital.vue) 與 [資料表定義](../supabase/migrations/20260626000000_initial_hospitals_data.sql)。在座標補齊前，只能做縣市級概略點位，不能可信地標示每家醫院。

## 技術比較

| 方案                       | 適合程度                     | 優點                                                                                                                                                                                      | 主要代價                                                                                                                                          | 授權                               |
| -------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| MapLibre GL JS             | 高，適合地理底圖與 2.5D 斜視 | 原生處理地圖投影、縮放、旋轉、`pitch`、向量圖磚、GeoJSON、terrain 與 polygon extrusion；Vue 可在 `onMounted` 動態載入                                                                     | Point 標記主要仍是圖示／圓點；要有真正立體醫院柱體，需 custom layer 或外加 deck.gl                                                                | BSD-3-Clause                       |
| MapLibre + deck.gl         | **最高，建議方案**           | `MapLibreOverlay` 官方支援純 JS 與 MapLibre；`interleaved: true` 可共享 WebGL2 context，讓立體物件與底圖標籤正確遮擋。`ColumnLayer` 直接接受 `[longitude, latitude]` 並產生可點選立體柱體 | 新增兩套相依、僅能 client-side 初始化；interleaved 要求 WebGL2；需明確控制高 DPI 與手機降級                                                       | MapLibre BSD-3-Clause；deck.gl MIT |
| TresJS / Three.js 單獨製作 | 中，適合品牌化立體台灣模型   | 本專案已安裝 `@tresjs/nuxt`、Cientos 與 post-processing；TresJS Nuxt module 提供 auto-import 與 `TresCanvas` client-only。可用台灣 Polygon 製成立體島體，以 `InstancedMesh` 放置醫院標記  | 它是 3D 引擎而非 GIS 地圖引擎；投影、圖磚、道路與地名、縮放層級、碰撞／群聚、座標轉換及相機同步都需自行實作。若目標是「查醫院」，維護風險明顯較高 | TresJS、Three.js 皆 MIT            |

MapLibre 官方說明它以 WebGL 在瀏覽器渲染互動式向量地圖，並提供相機、GeoJSON source 與 3D terrain；`setPitch` 支援 0–60 度視角。[MapLibre GL JS 文件](https://maplibre.org/maplibre-gl-js/docs/)｜[Map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/)｜[GeoJSONSource](https://maplibre.org/maplibre-gl-js/docs/API/classes/GeoJSONSource/)｜[BSD-3-Clause](https://github.com/maplibre/maplibre-gl-js#license)

deck.gl 官方文件明列 MapLibre 的純 JS、overlaid 與 interleaved 整合；interleaved 使用 MapLibre 建立的 WebGL2 context。`ColumnLayer` 可從每筆資料的座標與高度產生立體柱體，`GeoJsonLayer` 則可繪製並擠出台灣行政區 Polygon。[MapLibre 整合](https://deck.gl/docs/developer-guide/base-maps/using-with-maplibre)｜[ColumnLayer](https://deck.gl/docs/api-reference/layers/column-layer)｜[GeoJsonLayer](https://deck.gl/docs/api-reference/layers/geojson-layer)｜[MIT 授權](https://github.com/visgl/deck.gl)

TresJS 官方 Nuxt module 已處理 `TresCanvas` 的 client-only 與 auto-import；效能指南建議靜態場景使用 `render-mode="on-demand"` 或 `manual`、限制 FPS、避免深層 reactive 3D 物件並在卸載時釋放資源。Three.js 的 `InstancedMesh` 可用相同幾何與材質批次繪製多個標記，降低 draw calls。[TresJS Nuxt 安裝](https://docs.tresjs.org/getting-started/installation/)｜[TresJS 效能](https://docs.tresjs.org/api/advanced/performance)｜[TresJS MIT](https://github.com/Tresjs/tres#license)｜[Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)｜[Three.js MIT](https://github.com/mrdoob/three.js)

## 必要資料

每家醫院至少要補上以下穩定欄位：

- `latitude`、`longitude`：WGS 84 十進位座標；GeoJSON 與 deck.gl 的陣列順序是 **`[longitude, latitude]`**，不可顛倒。
- `geocoded_at`、`geocode_source`、`geocode_precision`：記錄座標何時取得、來源與可信層級，避免地址更新後仍使用舊點位。
- 原有 `id`、`name`、`address`、`city`、`district`、`accept_species`、`has_emergency`：作為 tooltip、篩選、色彩或柱體高度來源。
- 一份合法來源、適度簡化的台灣 `Polygon`／`MultiPolygon` GeoJSON；若需縣市互動，則要行政區邊界與穩定代碼。
- 可合法上線的 style JSON 與圖磚服務。地圖函式庫的開源授權不等於圖磚免費；來源的 attribution 與使用條款仍須遵守。

GeoJSON 標準規定座標使用 WGS 84、十進位，前兩個值依序為經度與緯度。[IETF RFC 7946](https://datatracker.ietf.org/doc/rfc7946/)

以現有約 78 筆醫院來看，兩個 numeric 欄位已足夠渲染全台地圖。若後續要做「離我最近」、視窗範圍查詢或規模擴充，可改用 Supabase PostGIS `geography(POINT)` 並建立空間索引；Supabase 官方文件也提醒 Point 建構時經度在前。[Supabase PostGIS 指南](https://supabase.com/docs/guides/database/extensions/postgis)

## 手機與效能界線

78 個點對桌機 GPU 很輕，效能主要成本反而來自底圖圖磚、兩個 WebGL 渲染層、高 DPI、陰影與持續動畫。deck.gl 官方指出手機對記憶體壓力與載入速度比桌機敏感，並建議不需要時關閉 Retina/高 DPI；開啟時像素量可達四倍。[deck.gl 效能指南](https://deck.gl/docs/developer-guide/performance)

依本專案 AGENTS.md 與 [Issue #5 Design Rule](https://github.com/zzes50708/gencko-studio/issues/5)，建議界線如下：

- 僅在 `min-width: 768px` 且 `(hover: hover) and (pointer: fine)` 時掛載 3D 地圖。
- 桌機預設 `pitch` 約 45–55 度、限制旋轉範圍；標記不做無限循環動畫，資料與 layer instance 保持穩定。
- deck.gl 使用較低 `diskResolution`、關閉不需要的 `pickable` layer，並限制 device pixel ratio。
- 手機不註冊滑鼠事件、不建立 3D Canvas；以靜態台灣 SVG／WebP 加可點擊清單取代，重要資訊不得依賴 hover。
- `prefers-reduced-motion` 下停用飛行轉場及柱體動畫。

## 建議實作順序

1. 先補齊並人工抽查醫院座標；不要在每次頁面載入時即時 geocode。
2. 做桌機概念驗證：MapLibre 斜視台灣底圖、deck.gl `ColumnLayer`、點選後連動既有醫院卡片。
3. 補手機靜態版與鍵盤／螢幕閱讀器可用的清單連動。
4. 驗證圖磚條款、attribution、弱 GPU／WebGL2 不支援的 fallback，再決定是否上線。

若視覺目標偏向「科技感台灣展示」而非可導航地圖，可改採 TresJS 單獨製作；若核心任務是找醫院，MapLibre + deck.gl 的工程風險最低。直接使用 `tile.openstreetmap.org` 也不是無條件的正式站方案：OSMF 明示資料免費不代表其 tile server 免費無限制，且要求顯示 attribution、遵守快取與流量政策。[OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
