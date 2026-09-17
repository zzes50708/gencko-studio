-- 醫院 3D 地圖只顯示經來源核對的實際院所點位；欄位允許空值，避免用縣市中心假裝精確。
ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geocode_source TEXT,
  ADD COLUMN IF NOT EXISTS geocode_source_id TEXT,
  ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

ALTER TABLE public.hospitals
  DROP CONSTRAINT IF EXISTS hospitals_coordinates_pair_check,
  ADD CONSTRAINT hospitals_coordinates_pair_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR
    (latitude BETWEEN 18 AND 27 AND longitude BETWEEN 115 AND 125)
  );

COMMENT ON COLUMN public.hospitals.latitude IS 'WGS84 緯度；僅寫入已核對的實際院所位置';
COMMENT ON COLUMN public.hospitals.longitude IS 'WGS84 經度；僅寫入已核對的實際院所位置';
COMMENT ON COLUMN public.hospitals.geocode_source IS '座標資料來源與授權識別';
COMMENT ON COLUMN public.hospitals.geocode_source_id IS '來源端可稽核的圖徵 ID';
COMMENT ON COLUMN public.hospitals.geocoded_at IS '座標最後核對時間';

UPDATE public.hospitals AS hospital
SET
  latitude = source.latitude,
  longitude = source.longitude,
  geocode_source = 'OpenStreetMap ODbL 1.0',
  geocode_source_id = source.source_id,
  geocoded_at = NOW()
FROM (
  VALUES
    ('3', 25.0513425::DOUBLE PRECISION, 121.5403114::DOUBLE PRECISION, 'node/3034547600'),
    ('7', 25.0155407::DOUBLE PRECISION, 121.5431507::DOUBLE PRECISION, 'way/1324300959'),
    ('9', 25.0292503::DOUBLE PRECISION, 121.5570713::DOUBLE PRECISION, 'node/4524863906'),
    ('11', 25.0528316::DOUBLE PRECISION, 121.6160459::DOUBLE PRECISION, 'node/2086704512'),
    ('15', 24.9846408::DOUBLE PRECISION, 121.5423011::DOUBLE PRECISION, 'node/4384257973'),
    ('21', 25.0791978::DOUBLE PRECISION, 121.3860971::DOUBLE PRECISION, 'node/7047292764'),
    ('26', 25.0583404::DOUBLE PRECISION, 121.3602426::DOUBLE PRECISION, 'node/13976536450'),
    ('27', 25.0069206::DOUBLE PRECISION, 121.3208015::DOUBLE PRECISION, 'node/12651915372'),
    ('34', 24.1182872::DOUBLE PRECISION, 120.6788614::DOUBLE PRECISION, 'way/677304932'),
    ('51', 23.4625147::DOUBLE PRECISION, 120.4436879::DOUBLE PRECISION, 'way/409655023'),
    ('77', 22.6423906::DOUBLE PRECISION, 120.6020451::DOUBLE PRECISION, 'way/518990334')
) AS source(id, latitude, longitude, source_id)
WHERE hospital.id = source.id;
