-- 第一階段只新增安全讀取介面；原有管理端切換完成前不撤銷其權限。
create or replace function private.has_site_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = auth.uid()
      and u.raw_app_meta_data->'auction_admin' = 'true'::jsonb
      and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google')
  );
$$;
revoke all on function private.has_site_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.has_site_admin() to authenticated;

create or replace function public.site_admin_access()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.has_site_admin();
$$;
revoke all on function public.site_admin_access() from public, anon;
grant execute on function public.site_admin_access() to authenticated;

alter table public.articles add column if not exists updated_at timestamptz;
create or replace function private.touch_article_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := clock_timestamp();
  elsif (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    new.updated_at := clock_timestamp();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function private.touch_article_updated_at() from public, anon, authenticated;
create trigger site_article_updated_at before insert or update on public.articles
for each row execute function private.touch_article_updated_at();

-- 這些是刻意提供的唯讀公開投影，由擁有者讀取原表，再以欄位白名單及狀態限制輸出。
-- 不提供成本、成交價、親本、買家或物流欄位；不可改成 SELECT *。
create view public.site_public_animals with (security_barrier = true) as
select id, source, species, morph, genes, gender_type, gender_value, birthday,
 listing_price, status, is_breeder, is_hot, image_url, note, created_at, tags, photo_updated_at
from public.animals where status in ('ForSale','Sold','SelfKeep','Auction');
create view public.site_public_articles with (security_barrier = true) as
select id,title,category,summary,content,image_url,author,status,publish_date,keywords,faq,updated_at
from public.articles where status = 'Published';
create view public.site_public_genetic_pages with (security_barrier = true) as
select id,name,image_url,warning,brief,detail,source,english_name,inheritance_mode,discovery_year,original_breeder
from public.genetic_pages;
create view public.site_public_merchandise with (security_barrier = true) as
select item_id,name,description,price,image_url,category,available,external_link
from public.merchandise;
create view public.site_public_config with (security_barrier = true) as
select id,text,url from public.config;
revoke all on public.site_public_animals, public.site_public_articles,
 public.site_public_genetic_pages, public.site_public_merchandise, public.site_public_config
from public, anon, authenticated;
grant select on public.site_public_animals, public.site_public_articles,
 public.site_public_genetic_pages, public.site_public_merchandise, public.site_public_config
to anon, authenticated;
