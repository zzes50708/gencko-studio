-- 展場模式設定（單列表）：控制商店/個體頁展場期間是否隱藏價格
-- 由後台（Supabase Studio）編輯這一列的欄位即可，無需重新部署。

create table if not exists public.site_settings (
  id int primary key default 1,
  exhibition_enabled boolean not null default false,     -- 是否啟用展場模式
  exhibition_start timestamptz,                           -- 展場開始（含）；留空＝不限開始
  exhibition_end timestamptz,                             -- 展場結束（含）；留空＝不限結束
  exhibition_note text default '展場期間價格請洽現場',    -- 隱藏價格時顯示的文字
  updated_at timestamptz default now(),
  constraint site_settings_single_row check (id = 1)      -- 僅允許單一列（id=1）
);

-- 確保存在一列可供編輯
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- RLS：僅開放公開讀取（寫入走後台/service role）
alter table public.site_settings enable row level security;
drop policy if exists "public read site_settings" on public.site_settings;
create policy "public read site_settings" on public.site_settings
  for select using (true);
