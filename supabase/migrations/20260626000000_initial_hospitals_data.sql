-- ============================================================
-- migrate_hospitals.sql
-- 目的：建立 hospitals 表，並從 utils/hospitals.js 移植 78 筆既有資料
-- 用法：在 Supabase Studio → SQL Editor 直接執行整段
-- 注意：可重複執行（IF NOT EXISTS / ON CONFLICT DO NOTHING）
-- ============================================================

-- 1. 建表
CREATE TABLE IF NOT EXISTS public.hospitals (
    id              TEXT        PRIMARY KEY,
    name            TEXT        NOT NULL,
    address         TEXT        NOT NULL,
    city            TEXT        NOT NULL,
    district        TEXT        NOT NULL,
    phone           TEXT,
    map_url         TEXT,
    region          TEXT,        -- 北部 / 中部 / 南部 / 東部區域
    hours           TEXT,        -- 自由格式營業時間（之後可填）
    has_emergency   BOOLEAN     DEFAULT FALSE,
    accept_species  TEXT[]      DEFAULT '{}',
    status          TEXT        DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    verified_at     DATE        DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 索引（依縣市篩選、活躍狀態最常用）
CREATE INDEX IF NOT EXISTS idx_hospitals_city ON public.hospitals (city);
CREATE INDEX IF NOT EXISTS idx_hospitals_status ON public.hospitals (status);
CREATE INDEX IF NOT EXISTS idx_hospitals_region ON public.hospitals (region);

-- 3. updated_at 自動觸發
CREATE OR REPLACE FUNCTION public.tg_hospitals_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS hospitals_set_updated_at ON public.hospitals;
CREATE TRIGGER hospitals_set_updated_at
    BEFORE UPDATE ON public.hospitals
    FOR EACH ROW EXECUTE FUNCTION public.tg_hospitals_set_updated_at();

-- 4. 啟用 RLS 並開放 anon SELECT（資料本來就是公開）
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon read hospitals" ON public.hospitals;
CREATE POLICY "anon read hospitals" ON public.hospitals
    FOR SELECT
    USING (true);

-- 5. 欄位註解（後台維護指引）
COMMENT ON TABLE  public.hospitals             IS '特寵醫院清單，/hospital 頁面資料來源';
COMMENT ON COLUMN public.hospitals.status      IS 'active=顯示在前台；closed=倒閉或停業，前台不顯示但保留歷史';
COMMENT ON COLUMN public.hospitals.verified_at IS '最後人工驗證該院資訊正確的日期，前台顯示「資料更新：YYYY-MM-DD」';
COMMENT ON COLUMN public.hospitals.has_emergency IS '是否提供夜間或急診服務';
COMMENT ON COLUMN public.hospitals.accept_species IS '收治物種陣列，例：{"爬蟲","兩棲","鳥類"}';
COMMENT ON COLUMN public.hospitals.hours       IS '自由格式營業時間，例：「週一至週六 10:00-21:00」';

-- ============================================================
-- 6. 種子資料：從 utils/hospitals.js 完整匯入
--    ON CONFLICT DO NOTHING：可重複執行不會覆蓋你之後手動編輯的內容
-- ============================================================

INSERT INTO public.hospitals (id, name, address, city, district, phone, map_url, region, status, verified_at) VALUES
  ('1', '不萊梅特殊寵物專科醫院', '台北市大同區民權西路227號', '台北市', '大同區', '02-2599-3907', 'https://maps.app.goo.gl/Z9rXNgUPA3tnHfer5', '北部區域', 'active', CURRENT_DATE),
  ('2', '牧光特殊寵物專科醫院', '台北市大同區民族西路65號', '台北市', '大同區', '02-2592-6590', NULL, '北部區域', 'active', CURRENT_DATE),
  ('3', '沐沐特殊寵物醫院', '台北市中山區龍江路78號', '台北市', '中山區', '02-7713-7707', NULL, '北部區域', 'active', CURRENT_DATE),
  ('4', '良醫動物醫院', '台北市松山區八德路四段188號', '台北市', '松山區', '02-2761-5091', NULL, '北部區域', 'active', CURRENT_DATE),
  ('5', '伊甸園動物醫院', '台北市中山區北安路554巷33號', '台北市', '中山區', '02-8509-2579', NULL, '北部區域', 'active', CURRENT_DATE),
  ('6', '國寶動物醫院', '台北市中山區八德路二段229-2號', '台北市', '中山區', '02-2721-1798', NULL, '北部區域', 'active', CURRENT_DATE),
  ('7', '國立台灣大學附設動物醫院', '台北市大安區基隆路三段153號', '台北市', '大安區', '02-2739-6828', NULL, '北部區域', 'active', CURRENT_DATE),
  ('8', '萊特特殊寵物醫院', '台北市大安區辛亥路一段50號', '台北市', '大安區', '02-2365-8628', NULL, '北部區域', 'active', CURRENT_DATE),
  ('9', '愛貓園動物醫院', '台北市大安區基隆路二段124號1樓', '台北市', '大安區', '02-2735-8758', NULL, '北部區域', 'active', CURRENT_DATE),
  ('10', '亞馬森特寵專科醫院', '台北市內湖區內湖路二段39之2號1樓', '台北市', '內湖區', '02-8792-3248', NULL, '北部區域', 'active', CURRENT_DATE),
  ('11', '中研動物醫院', '台北市南港區研究院路一段72號', '台北市', '南港區', '02-2651-2100', NULL, '北部區域', 'active', CURRENT_DATE),
  ('12', '亞各動物醫院', '台北市南港區研究院路一段101巷12號', '台北市', '南港區', '02-2653-3636', NULL, '北部區域', 'active', CURRENT_DATE),
  ('13', '馬達加斯加動物醫院', '新北市板橋區文化路二段500號1樓', '新北市', '板橋區', '02-8259-5001', NULL, '北部區域', 'active', CURRENT_DATE),
  ('14', '展翔動物醫院', '新北市板橋區南雅西路二段97號', '新北市', '板橋區', '02-8965-0318', NULL, '北部區域', 'active', CURRENT_DATE),
  ('15', '剛果非犬貓動物醫院', '新北市新店區中興路三段259號', '新北市', '新店區', '02-8665-5702', NULL, '北部區域', 'active', CURRENT_DATE),
  ('16', '金氏動物醫院', '新北市新店區中興路一段208號', '新北市', '新店區', '02-8914-6999', NULL, '北部區域', 'active', CURRENT_DATE),
  ('17', '綠野特殊寵物專科醫院', '新北市中和區景平路335-1號', '新北市', '中和區', '02-2946-8818', NULL, '北部區域', 'active', CURRENT_DATE),
  ('18', '獴獴加非犬貓專科動物醫院', '新北市三重區重新路四段20號1樓', '新北市', '三重區', '02-2979-2232', NULL, '北部區域', 'active', CURRENT_DATE),
  ('19', '小水豚特殊寵物醫院', '新北市新莊區幸福東路140號1樓', '新北市', '新莊區', '02-2990-6905', NULL, '北部區域', 'active', CURRENT_DATE),
  ('20', '嘉德動物醫院', '新北市汐止區福德一路206巷1號', '新北市', '汐止區', '02-2693-4809', NULL, '北部區域', 'active', CURRENT_DATE),
  ('21', '懷恩動物醫院', '新北市林口區中山路235號', '新北市', '林口區', '02-8601-8432', NULL, '北部區域', 'active', CURRENT_DATE),
  ('22', '頂點動物醫院', '新北市永和區仁愛路87號', '新北市', '永和區', '02-8921-1700', NULL, '北部區域', 'active', CURRENT_DATE),
  ('23', '普羅動物醫院', '桃園市桃園區泰成路15號', '桃園市', '桃園區', '03-378-9900', NULL, '北部區域', 'active', CURRENT_DATE),
  ('24', '原野動物專科醫院', '桃園市平鎮區廣德街12號', '桃園市', '平鎮區', '03-494-2020', NULL, '北部區域', 'active', CURRENT_DATE),
  ('25', '野森非犬貓專科醫院', '桃園市中壢區民權路332號', '桃園市', '中壢區', '03-491-0302', NULL, '北部區域', 'active', CURRENT_DATE),
  ('26', '琪欣動物醫院 龜山分院', '桃園市龜山區文化三路99號', '桃園市', '龜山區', '03-397-9825', NULL, '北部區域', 'active', CURRENT_DATE),
  ('27', '禾原動物醫院', '桃園市桃園區大有路159號', '桃園市', '桃園區', '03-332-1695', NULL, '北部區域', 'active', CURRENT_DATE),
  ('28', '新竺動物醫院', '新竹市北區竹光路98號', '新竹市', '北區', '03-542-9961', NULL, '北部區域', 'active', CURRENT_DATE),
  ('29', '大福小幸動物醫院', '新竹市香山區經國路三段92巷6號', '新竹市', '香山區', '03-530-0175', NULL, '北部區域', 'active', CURRENT_DATE),
  ('30', '度度鳥特殊寵物專科醫院', '新竹市東區西大路315巷7號1樓', '新竹市', '東區', '0965-109-093', NULL, '北部區域', 'active', CURRENT_DATE),
  ('31', '秘境野生動物專科醫院', '新竹縣竹北市自強六街15號', '新竹縣', '竹北市', '03-668-5559', NULL, '北部區域', 'active', CURRENT_DATE),
  ('32', '波比寵物專科醫院', '苗栗縣竹南鎮光復路436號', '苗栗縣', '竹南鎮', '03-7550450', NULL, '中部區域', 'active', CURRENT_DATE),
  ('33', '羽森林動物醫院', '台中市東區旱溪西路一段552號', '台中市', '東區', '04-2213-2373', NULL, '中部區域', 'active', CURRENT_DATE),
  ('34', '國立中興大學獸醫教學醫院', '台中市西區向上路一段21號', '台中市', '西區', '04-2287-0180', NULL, '中部區域', 'active', CURRENT_DATE),
  ('35', '侏儸紀野生動物專科醫院', '台中市西區英才路625號', '台中市', '西區', '04-2375-7808', NULL, '中部區域', 'active', CURRENT_DATE),
  ('36', '小島動物醫院', '台中市西區三民西路83號', '台中市', '西區', '04-2376-7158', NULL, '中部區域', 'active', CURRENT_DATE),
  ('37', '達爾文動物醫院', '台中市西區博館路157號', '台中市', '西區', '04-2326-2759', NULL, '中部區域', 'active', CURRENT_DATE),
  ('38', '感恩動物醫院', '台中市北區忠明路131號', '台中市', '北區', '04-2320-2590', NULL, '中部區域', 'active', CURRENT_DATE),
  ('39', '毛克利野生動物醫院', '台中市北屯區文心路四段690號', '台中市', '北屯區', '04-2238-6609', NULL, '中部區域', 'active', CURRENT_DATE),
  ('40', '台中亞東綜合動物醫院', '台中市北屯區昌平路一段27號', '台中市', '北屯區', '04-2233-6101', NULL, '中部區域', 'active', CURRENT_DATE),
  ('41', '伴心特殊寵物專科醫院', '台中市南屯區文心路一段430號', '台中市', '南屯區', '04-2323-1788', NULL, '中部區域', 'active', CURRENT_DATE),
  ('42', '亞洲大學附設獸醫教學醫院', '台中市霧峰區柳豐路500號', '台中市', '霧峰區', '04-2332-3456#6371', NULL, '中部區域', 'active', CURRENT_DATE),
  ('43', '台中凡賽爾賽鴿動物醫院', '台中市西屯區重慶路8號', '台中市', '西屯區', '04-23121880', NULL, '中部區域', 'active', CURRENT_DATE),
  ('44', '瑞瑞動物醫院', '台中市西屯區台灣大道四段828號1樓、2樓', '台中市', '西屯區', '04-24630052', NULL, '中部區域', 'active', CURRENT_DATE),
  ('45', '愛犬動物醫院', '彰化縣和美鎮道周路553號', '彰化縣', '和美鎮', '04-756-7481', NULL, '中部區域', 'active', CURRENT_DATE),
  ('46', '龍貓動物醫院', '彰化縣鹿港鎮彰鹿路七段639號', '彰化縣', '鹿港鎮', '04-7773488', NULL, '中部區域', 'active', CURRENT_DATE),
  ('47', '築愛動物醫院', '彰化縣彰化市民生南路51號', '彰化縣', '彰化市', '04-723-9939', NULL, '中部區域', 'active', CURRENT_DATE),
  ('48', '快樂寵物醫院', '彰化縣彰化市中山路三段155號', '彰化縣', '彰化市', '04-7384978', NULL, '中部區域', 'active', CURRENT_DATE),
  ('49', '叢林特殊寵物專科醫院', '彰化縣員林市條和街350號1樓', '彰化縣', '員林市', '04-833-3232', NULL, '中部區域', 'active', CURRENT_DATE),
  ('50', '嘉樂動物醫院', '嘉義市東區民族路67號', '嘉義市', '東區', '05-2773122', NULL, '南部區域', 'active', CURRENT_DATE),
  ('51', '國立嘉義大學獸醫學院附設動物醫院', '嘉義市西區新民路580號', '嘉義市', '西區', '05-2732988', NULL, '南部區域', 'active', CURRENT_DATE),
  ('52', '立安動物醫院', '台南市中西區永華路一段186號', '台南市', '中西區', '06-2286538', NULL, '南部區域', 'active', CURRENT_DATE),
  ('53', '酷比動物醫院', '台南市南區夏林路210號', '台南市', '南區', '06-2631058', NULL, '南部區域', 'active', CURRENT_DATE),
  ('54', '啄木鳥動物醫院', '台南市北區臨安路二段243號', '台南市', '北區', '06-3505902', NULL, '南部區域', 'active', CURRENT_DATE),
  ('55', '小鯢特殊寵物專科醫院', '台南市永康區永明街59號', '台南市', '永康區', '06-2022252', NULL, '南部區域', 'active', CURRENT_DATE),
  ('56', '毛毛動物醫院－歸仁分院', '台南市歸仁區民權三街32號', '台南市', '歸仁區', '06-2306353', NULL, '南部區域', 'active', CURRENT_DATE),
  ('57', '峽灣動物醫院', '台南市北區西門路四段442號', '台南市', '北區', '06-2517213', NULL, '南部區域', 'active', CURRENT_DATE),
  ('58', '窩窩兔動物醫院', '高雄市苓雅區建民路67號', '高雄市', '苓雅區', '07-713-0300', NULL, '南部區域', 'active', CURRENT_DATE),
  ('59', '中興梅西動物醫療中心（特別寵物科）', '高雄市左營區文府路498號5樓', '高雄市', '左營區', '07-350-3840', NULL, '南部區域', 'active', CURRENT_DATE),
  ('60', '中興農十六特別寵物科', '高雄市鼓山區大順一路935號2樓', '高雄市', '鼓山區', '07-550-3582', NULL, '南部區域', 'active', CURRENT_DATE),
  ('61', '亞幸動物醫院', '高雄市苓雅區光華一路12-1號', '高雄市', '苓雅區', '07-726-5577', NULL, '南部區域', 'active', CURRENT_DATE),
  ('62', '大毛小毛動物醫院', '高雄市三民區文濱路62號', '高雄市', '三民區', '07-7809102', NULL, '南部區域', 'active', CURRENT_DATE),
  ('63', '本丸特殊寵物與貓專科醫院', '高雄市前鎮區永豐路105號1樓', '高雄市', '前鎮區', '07-721-1089', NULL, '南部區域', 'active', CURRENT_DATE),
  ('64', '蓋亞野生動物專科醫院', '高雄市三民區建工路611號', '高雄市', '三民區', '07-392-9353', NULL, '南部區域', 'active', CURRENT_DATE),
  ('65', '全家福動物醫院', '高雄市三民區義華路51號', '高雄市', '三民區', '07-384-5936', NULL, '南部區域', 'active', CURRENT_DATE),
  ('66', '韓特動物醫院', '高雄市前金區自強三路211號', '高雄市', '前金區', '07-215-2577', NULL, '南部區域', 'active', CURRENT_DATE),
  ('67', '毛毛動物醫院（大社分院）', '高雄市大社區三民路270號', '高雄市', '大社區', '07-353-5316', NULL, '南部區域', 'active', CURRENT_DATE),
  ('68', '星羽動物醫院（三民院）', '高雄市三民區信國路20號', '高雄市', '三民區', '07-395-5131', NULL, '南部區域', 'active', CURRENT_DATE),
  ('69', '星羽動物醫院（大寮院）', '高雄市大寮區鳳林路四段790號之1', '高雄市', '大寮區', '07-641-3309', NULL, '南部區域', 'active', CURRENT_DATE),
  ('70', '培昱動物醫院', '高雄市鳳山區保泰路6號', '高雄市', '鳳山區', '07-841-8289', NULL, '南部區域', 'active', CURRENT_DATE),
  ('71', '小鳴動物醫院', '高雄市前鎮區廣西路288號', '高雄市', '前鎮區', '07-962-3055', NULL, '南部區域', 'active', CURRENT_DATE),
  ('72', '祈癒動物醫院', '高雄市仁武區京吉六路90號', '高雄市', '仁武區', '07-375-2082', NULL, '南部區域', 'active', CURRENT_DATE),
  ('73', '肯亞動物專業醫院－屏東院', '屏東市崇朝一路192號', '屏東縣', '屏東市', '08-765-6655', NULL, '南部區域', 'active', CURRENT_DATE),
  ('74', '肯亞野動倉庫動物醫院', '屏東縣萬丹鄉丹榮路975號', '屏東縣', '萬丹鄉', '08-777-6262', NULL, '南部區域', 'active', CURRENT_DATE),
  ('75', '大同動物醫院', '屏東縣屏東市民族路486號', '屏東縣', '屏東市', '08-733-9215', NULL, '南部區域', 'active', CURRENT_DATE),
  ('76', '福爾摩莎動物醫院', '屏東縣內埔鄉光明路525-1號', '屏東縣', '內埔鄉', '08-7782018', NULL, '南部區域', 'active', CURRENT_DATE),
  ('77', '國立屏東科技大學附設獸醫教學醫院', '屏東縣內埔鄉學府路1號', '屏東縣', '內埔鄉', '08-7740270', NULL, '南部區域', 'active', CURRENT_DATE),
  ('78', '谷米動物醫院', '台東縣關山鎮和平路128號', '台東縣', '關山鎮', '08-9810253', NULL, '東部區域', 'active', CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 完成：應寫入 78 筆
-- 驗證：SELECT COUNT(*) FROM public.hospitals;  -- 預期 78
-- ============================================================
