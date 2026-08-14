-- animals 新增「照片更新時間」欄位
-- 目的：商店卡片／個體頁顯示「照片上傳時間」，讓買家判斷線上照片新舊程度。
-- created_at 只反映建檔時間；換照片不會更新，故獨立一個 photo_updated_at。

-- 1) 新增欄位（可為 NULL；由觸發器維護）
alter table public.animals
  add column if not exists photo_updated_at timestamptz;

-- 2) 既有資料回填為建檔時間，避免顯示空白
update public.animals
  set photo_updated_at = created_at
  where photo_updated_at is null;

-- 3) 觸發器：新增時預設為 now()；日後只要 image_url 或 images 變動就自動更新
--    這樣無論從 Supabase Studio、後台工具或 API 改照片，時間都會正確
create or replace function public.set_animals_photo_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.photo_updated_at is null then
      new.photo_updated_at := coalesce(new.created_at, now());
    end if;
  elsif new.image_url is distinct from old.image_url
     or new.images is distinct from old.images then
    new.photo_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_animals_photo_updated_at on public.animals;
create trigger trg_animals_photo_updated_at
  before insert or update on public.animals
  for each row
  execute function public.set_animals_photo_updated_at();
