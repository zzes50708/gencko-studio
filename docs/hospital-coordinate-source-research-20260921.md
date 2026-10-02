# 醫院座標來源查核

查核日期：2026-09-22。範圍：`output/hospital-coordinate-review.json` 的 78 筆院所。此份研究未修改資料庫。

## 已確認地址異常

### 中研動物醫院（ID 11）

- 清單地址為「台北市南港區研究院路一段72號」。
- [臺北市獸醫師公會院所名錄](https://www.tpvma.org.tw/client/?p=9) 明列「台北市南港區研究院路1段36號」、電話 02-26512100；其 Google 連結也以36號為目的地。
- 臺北市動保處 1141029 寵物登記站名冊之 V09006 同樣列36號，可由[政府原始PDF](https://www-ws.gov.taipei/Download.ashx?icon=..pdf&n=5a%2B154mp55m76KiY56uZ5ZCN5YaKXzExNDEwMjkucGRm&u=LzAwMS9VcGxvYWQvNDExL3JlbGZpbGUvMTgzMTgvNzc5MS85ODZhYzE5Mi0xNDgzLTRjZWYtYTE5OC01ZDM4MGZmYWNlMzYucGRm)查核。
- 本輪確認的是地址，**沒有取得36號的一手精確經緯度**。目前25.0528316,121.6160459來源為OSM節點2086704512，不能因名稱相符就認定已對應36號。

### 國立中興大學獸醫教學醫院（ID 34）

- [醫院官方到院指南](https://www.vmth.nchu.edu.tw/map)確認「台中市西區向上路一段21號」，電話04-22870180。
- 官方說明位於向上民權路口附近，沿向上路約100公尺、品麵包對面。
- 實際下載官方HTML檢查，頁面使用路線示意圖片，沒有數字座標或Google iframe。不能由文字描述生成精確經緯度。
- 原24.1182872,120.6788614不可視為新址完成定位；本輪沒有產生替代值。

## 官方開放來源實測

| 來源                                                                         | 能取得什麼                 | 實測及限制                                                                                                                                   |
| ---------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| [新北市寵物登記站簽約醫院](https://data.gov.tw/dataset/124583)               | 電話、名稱、地址           | 政府資料開放授權第1版、免費。下載CSV實際只有tel,extension,mobile_phone,title,address，無座標。不可把第三方鏡像附加經緯度誤認為政府原始欄位。 |
| [臺中市合法動物醫院名冊](https://data.gov.tw/dataset/83762)                  | 名稱、執照、地址、電話     | 政府資料開放授權第1版。欄位說明未含經緯度。                                                                                                  |
| [NLSC查詢醫療設施](https://data.gov.tw/dataset/139250)                       | 具地址與經緯度的周邊設施   | 無金鑰讀取成功；台中中心120.67,24.145半徑2000公尺抽查未發現獸醫院，不能假定涵蓋動物醫院。                                                    |
| [NLSC工商設施文件](https://maps.nlsc.gov.tw/S09SOA/pro/MarkBufferAnlys3.jsp) | 工商地標名稱、地址、經緯度 | 無金鑰讀取成功；同區2000公尺得到301筆，僅有動物營養公司，無目標獸醫院。                                                                      |
| [NLSC API目錄](https://maps.nlsc.gov.tw/S09SOA/pro/Api_ajax_list.jsp)        | 門牌定位API                | TextQueryMap及TextQueryAddress標註需要申請，不能當作無金鑰可直接批次執行的服務。                                                             |

新北CSV原始下載網址：
https://data.ntpc.gov.tw/api/datasets/02f2e513-f2cb-4df9-aa84-2467eb3758fe/csv/file

本輪實測NLSC原始端點：

- https://api.nlsc.gov.tw/other/MarkBufferAnlys/med/120.67/24.145/2000
- https://api.nlsc.gov.tw/other/MarkBufferAnlys/bus/120.67/24.145/2000

## 可再查證候選

高雄梅西動物醫院大樓（清單ID59、文府路498號）在高雄市政府防空避難資料的搜尋索引有CG157，座標顯示22.691251,120.316767。原始[政府PDF](https://orgws.kcg.gov.tw/001/KcgOrgUploadFiles/422/relfile/74948/63816/06ed674f-95b5-43d3-b6b6-b6b3fd29fd31.pdf)本輪直接開啟為404，因此**只列候選，未當成可寫入的已核實資料**。應取得更新版官方資料或院所提供的位置後再採用。

## 結論與下一步

本輪沒有找到能直接提供全台所有動物醫院精確座標、且免金鑰的官方完整資料集。官方名冊仍很適合先核對名稱與地址；缺座標則須由可授權定位服務、可核對地址的OSM原始物件或院所直接公開的位置補充。務必保存院所匹配依據、座標来源URL及核實日期，地址有異動時重新查核，不能以縣市或道路中心補齊。
