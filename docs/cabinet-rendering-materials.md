# 木櫃材質與光照

材質函式在 `utils/cabinet/materials.ts`，模型組裝在 `utils/cabinet/model.ts`，HDR 與渲染器在 `components/cabinet/CabinetWorkspace.vue`。

純白貼皮使用偏暖白 `#eeece6`，roughness 0.36、clearcoat 0.22、clearcoatRoughness 0.3，沒有木紋法線，避免白色貼皮看起來像刷白木板。

清水模貼皮使用 Color（sRGB）、OpenGL Normal 與 Roughness（線性資料）；每個板面分別依實際長寬設定 `repeat = [寬 / 60, 高 / 60]`。60 公分為此示意貼皮的可調紋理週期，並非廠商實際花紋尺寸。板件幾何以公分直接建立，六面使用各自的長寬與材質，不對單位倒角盒做非等比縮放。半徑 0.15 公分等於 1.5 毫米，保留原板件外尺寸與位置，不增加接合空隙。

PP 使用 transmission 0.68、roughness 0.46、ior 1.49；物黑版本 transmission 0.48。以物理透光取代 opacity 淡灰透明，光學厚度會跟展示縮放一致。壓克力另用較低粗糙度，避免與 PP 混用。

棚拍 HDR 經 PMREM 建立 IBL，失敗時保留 RoomEnvironment。目前專案的 Three.js 已淘汰 RGBELoader 與 PCFSoftShadowMap，使用 HDRLoader 與 PCFShadowMap（radius 3）對應新版濾波；色彩輸出為 sRGB，色調映射為 ACESFilmicToneMapping。HDR、貼圖、板面材質與幾何在卸載時清理。

資源保存於 public/cabinet/materials，來源與 CC0 授權見該目錄 README。未使用廠商商品照片。
