# 全站排查：2026-10-15

## 範圍與證據

- 正式站：https://www.genckobreeding.com；程式基準 c5c9e946b0e7d6789d70ec4a842c907a5dc386d9。
- 本輪僅讀取產品程式與操作公開介面，未修正、提交或部署。
- 24 個入口頁：/、/home、/shop、/breeders、/auction、/merch、/start-here、/guide、/care、/health、/qs、/faq、/articles、/genes、/calculator、/hospital、/why-gencko、/buying-guide、/certificates、/about、/stories、/profile、/compare、/hero-lab。
- 四類實際詳情：/product/S-66196、/articles/ART-007、/genes/WY、/identity/S-66196。
- 五類不存在資料：product、articles、genes、identity、auction 的 not-found 識別碼。
- 主要入口量測 320、390、768、1440px。全螢幕品牌場景不以一般內容頁高度標準判定；未將它們的動畫捲動長度列為留白缺陷。
- 設計證據：目前路由與元件、assets/css/page-headings.css、docs/page-heading-standard.md，以及本次對話的品牌、手機緊湊、保留原有基因選擇方式等明確要求。
- 數字來自正式站 DOM / computed styles / accessibility snapshots 與 HTTP HEAD，非靜態爬蟲直接推論。對動態內容等待可見資料後複驗，不把初次 0 隻當成空庫存。

## 確認項目

| 編號 | 優先 | 問題及證據                                                                                                                                                                                 | 建議修正                                                        | 影響範圍 / 來源                                                             | 信心                                        |
| ---- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- | --- |
| 1    | 高   | 守宮介紹三張圖 complete=true、naturalWidth=0。主圖轉換路徑 /\_ipx/s_384x216/images/guide/hero-gecko.webp 回傳 404，原圖 /images/guide/hero-gecko.webp 回傳 200。三張原始檔均已追蹤於 Git。 | 修復正式站圖片轉換路徑，並提供原圖失敗降級。                    | pages/guide.vue 的三個 NuxtImg；nuxt.config.ts 的 ipx 設定                  | 高                                          |
| 2    | 高   | 會員 LINE 登入圖示 naturalWidth=0；同一 CDN 圖示 HEAD 本次回傳 503，頁面無替代圖示。這是本次可重現的外部依賴失敗，不代表來源永久下架。                                                     | 使用專案內圖示，保留可讀的登入文字與失敗替代。                  | pages/profile.vue 的 LINE 按鈕                                              | 高                                          |
| 3    | 高   | 使用者先前否定的中文品牌別名仍存在於 /about 的 description 與 JSON-LD，且多頁各自硬編碼同一別名。正式站 DOM 已確認，不只是未使用的常數。                                                   | 清除錯誤別名並統一正確品牌資料。                                | pages/about.vue、pages/shop/index.vue 等；utils/site-constants.ts           | 高                                          |
| 4    | 高   | /product/not-found、/articles/not-found、/genes/not-found 顯示找不到資料，卻回傳 HTTP 200，robots 仍為 index, follow。                                                                     | 真正不存在資料回傳 404 並設定 noindex；連線失敗不得冒充不存在。 | 三類詳情頁的空狀態與 metadata                                               | 高                                          |
| 5    | 中   | 手機選購卡片收藏及比較各約 32×44px；基本資訊 summary 高約 32px。重要操作的可點寬度或高度不足 44px。                                                                                        | 擴大實際點擊區至至少 44px，保留緊湊圖示外觀。                   | components/ShopFlipCard.vue 的 card-action-btn、mobile-card-details summary | 高                                          |
| 6    | 中   | 手機展開基本資訊 computed font-size=11px，包含品系資料、孵化溫度、生日與備註。屬閱讀體驗改善，不是資料遺失。                                                                               | 只調整展開區內文為較易讀字級與行距，不增加收合卡片高度。        | components/ShopFlipCard.vue 的 mobile-card-details-body                     | 高                                          |
| 7    | 中   | 飼養前評估上方工具列約 88px，內含與下方主標重複的名稱；390px 初始主標約 y=138，其他一般內容頁多為 y=50。作答進度與題目沒有實測遮擋，問題是重複高度。                                       | 合併重複標題和進度區，保留返回、進度及必要說明。                | pages/qs.vue 的 qs-quiz-toolbar 與頁首                                      | 高                                          |
| 8    | 中   | /genes/WY 的資料來源顯示兩個完整網址，但 source-text 內 a 元素數為 0。使用者需複製網址才能查閱。                                                                                           | 將來源網址解析為可點擊連結，保留可讀來源名稱。                  | pages/genes/[id].vue 的 source-text                                         | 高                                          |
| 9    | 中   | 配置器預設 LED 照明層數為 0，卻顯示 LED 開啟；尚未生成模型時，也已提示點模型開關。狀態與提示易被理解為已有燈可操作。                                                                       | 依有無照明層及有無模型顯示對應提示，零層標示未加裝照明。        | components/cabinet/CabinetWorkspace.vue 的設備照明區                        | 高                                          |
| 10   | 中   | A4 盒設定顯示長34×寬24×高10.1cm；模型尺寸文字卻顯示盒子24X34X10.1cm，未標軸向。摘要則明確使用長×寬×高。                                                                                    | 各處明確標示並統一盒體長×寬×高；櫃體另標寬×高×深。              | components/cabinet/CabinetWorkspace.vue 的模型尺寸文字、設定說明與摘要      | 高                                          |
| 11   | 低   | /certificates 的 document.title 為「個體證書｜Gencko Studio                                                                                                                                | Gencko Studio」，品牌重複。                                     | 頁面 title 只提供頁名，品牌由全站模板統一附加一次。                         | pages/certificates.vue 與全站 titleTemplate | 高  |

## 本輪確認可用

- 主要內容頁在四個斷點沒有量到整頁橫向溢出。
- 手機底部更多選單可開關，包含個體證書入口。
- 真實 ID 可由證書查詢頁開啟證書；錯誤 ID 有明確回復入口；證書未出現親本欄位。
- 計算機可連續選三個基因、切換公母、即時顯示結果，基因說明視窗可開關；不建議再次更換既有選取模式。
- FAQ 無結果有清除搜尋與提示。
- 飼養前評估答題後進度更新，返回上一題可操作。
- 醫院名稱搜尋同步到地圖搜尋欄；清單點選綠野醫院後可顯示院所資料與定位標記；當次街區狀態顯示已載入216個建築量體；放大縮小控制可操作。
- 手機設備設定為滿版，確認前未載入模型畫布；層數1至8選項可完整呈現，數字按鈕約58×36px，沒有選項清單內部捲動。全螢幕透明 dialog 本身不代表選單內容有大量留白，未據此列為缺陷。
- 不存在的商品、文章、基因及競標皆有可讀回復狀態；其 HTTP / 索引問題另列第4項。

## 尚未覆蓋及未列為故障

- 未登入會員，未實際下標、付款或送出外部訊息；當時競標列表無可用真實場次，因此有資料且登入後的競標詳情未完整驗證。
- 沒有實體手機，不能把桌面瀏覽器縮小視窗視為原生觸控、GPU幀率或低階手機效能驗收。
- 截圖工具當次無法擷取畫面，沒有把主觀材質質感或像素細節列為確認缺陷；版面結論依DOM量測。
- 首次快速跨頁曾記錄 hydration mismatch；五個新分頁的對照檢查未重現，尚未定位路由與觸發條件，列待追查而非確認問題。
- 外部 CDN 503 可能受區域或時間影響，但本次頁面確實缺圖且沒有失敗降級。
- 設備頁合作夥伴仍出現在搜尋標題：先前要求是刪除合作區塊，沒有證據表示必須刪除所有合作描述，因此未當成違規。

## 優先處理

先修第1項：介紹頁三張圖片已可重現失敗，且原始圖片可用，修復範圍清楚。其後處理第3、4項的品牌與不存在頁資料一致性，再做手機操作與可讀性改善。

## 11 項修正與複驗

- 已完成上表 11 項修正，另同步移除競標詳情同一個外部 LINE 破圖依賴。
- 單元測試：29 個檔案、196 項通過。
- 正式模式建置成功；隔離預覽 3174 驗證 25 項瀏覽器案例（22 項功能與既有流程 + 3 項全站斷點掃描）。
- 320、768、1440px 各掃描 22 個主要入口，沒有文件橫向溢出或錯誤品牌 JSON-LD。
- 圖片載入及失敗替代、404/noindex 與載入失敗重試恢復、手機操作尺寸、評估進度、證書及 LED 設定提示均已驗證。
- 全站測試等待條件已適配一般內容頁及獨立滿版品牌場景，不要求無自身高度的 main 必須有可見邊界。
- 證據：output/fullsite-audit-final-unit.log、output/ux-fullsite-audit-final-build.log、output/fullsite-audit-final-browser.log、output/fullsite-audit-final-breakpoints.log。
- 尚未提交或部署；接續處理使用者補充的開燈偶發閃爍。
