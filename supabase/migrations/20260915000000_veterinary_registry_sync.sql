-- 農業部「獸醫師(佐)開業執照」母表與特寵醫院配對狀態。
-- 官方名冊只證明合法開業狀態，不代表收治守宮或其他特寵。

CREATE TABLE IF NOT EXISTS public.veterinary_registry (
  license_no TEXT PRIMARY KEY,
  county TEXT NOT NULL,
  license_type TEXT,
  official_status TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  responsible_vet TEXT,
  phone TEXT,
  issued_on DATE,
  address TEXT NOT NULL,
  source_dataset TEXT NOT NULL DEFAULT '農業部獸醫師(佐)開業執照',
  source_url TEXT NOT NULL DEFAULT 'https://data.moa.gov.tw/open_detail.aspx?id=078',
  source_fetched_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS veterinary_registry_name_idx
  ON public.veterinary_registry (institution_name);
CREATE INDEX IF NOT EXISTS veterinary_registry_address_idx
  ON public.veterinary_registry (address);
CREATE INDEX IF NOT EXISTS veterinary_registry_status_idx
  ON public.veterinary_registry (official_status, is_current);

ALTER TABLE public.veterinary_registry ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hospital_sync_runs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  fetched_count INTEGER NOT NULL DEFAULT 0,
  upserted_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  ambiguous_count INTEGER NOT NULL DEFAULT 0,
  unmatched_count INTEGER NOT NULL DEFAULT 0,
  payload_hash TEXT,
  error_message TEXT
);

ALTER TABLE public.hospital_sync_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS official_license_no TEXT
    REFERENCES public.veterinary_registry (license_no) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS official_match_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (official_match_status IN ('matched', 'ambiguous', 'unmatched')),
  ADD COLUMN IF NOT EXISTS official_match_method TEXT,
  ADD COLUMN IF NOT EXISTS official_status TEXT,
  ADD COLUMN IF NOT EXISTS official_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS species_source_label TEXT,
  ADD COLUMN IF NOT EXISTS species_source_url TEXT,
  ADD COLUMN IF NOT EXISTS species_verified_at DATE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'needs_review'
    CHECK (verification_status IN ('verified', 'needs_review', 'expired'));

CREATE UNIQUE INDEX IF NOT EXISTS hospitals_official_license_no_uidx
  ON public.hospitals (official_license_no)
  WHERE official_license_no IS NOT NULL;

COMMENT ON TABLE public.veterinary_registry IS
  '農業部合法獸醫診療機構母表；不可據此推論收治特寵。';
COMMENT ON COLUMN public.hospitals.accept_species IS
  '經院方第一方資料或人工確認的收治物種，不由官方開業名冊覆寫。';
COMMENT ON COLUMN public.hospitals.official_status IS
  '農業部開業執照狀態，僅供查核；不自動覆寫網站上架狀態。';

