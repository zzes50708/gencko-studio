-- 網站內的分類管理沿用既有 Google 管理員；不更動帳號或原有後台權限。
create table public.shop_collection_settings (
  id text primary key check (id = 'default'),
  document jsonb,
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz
);
alter table public.shop_collection_settings enable row level security;
revoke all on public.shop_collection_settings from public, anon, authenticated;
grant select on public.shop_collection_settings to anon, authenticated;
create policy "Published shop collections are public" on public.shop_collection_settings
  for select to anon, authenticated using (true);
insert into public.shop_collection_settings(id) values ('default');

-- 歷次設定僅留在非公開結構，供日後復原，不把操作帳號送往前台。
create table private.shop_collection_history (
  revision integer primary key,
  document jsonb,
  saved_at timestamptz not null default clock_timestamp(),
  actor_id uuid
);
alter table private.shop_collection_history enable row level security;
revoke all on private.shop_collection_history from public, anon, authenticated;

create function private.shop_collection_access()
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.auction_require_admin();
  return exists (select 1 from auth.identities where user_id = auth.uid() and provider = 'google');
exception when insufficient_privilege then
  return false;
end;
$$;
revoke all on function private.shop_collection_access() from public, anon, authenticated;
grant execute on function private.shop_collection_access() to authenticated;
create function public.shop_collection_access()
returns boolean language sql stable security invoker set search_path = '' as $$
  select private.shop_collection_access();
$$;
revoke all on function public.shop_collection_access() from public, anon, authenticated;
grant execute on function public.shop_collection_access() to authenticated;

create function private.validate_shop_collection_document(p_document jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare g jsonb; entry jsonb; collection_key text; species_name text; cover_id text;
  seen text[] := '{}'; groups jsonb := '[]'; covers jsonb := '{}';
begin
  if jsonb_typeof(p_document) is distinct from 'object'
    or p_document->>'format' is distinct from 'gencko-shop-collections'
    or p_document->'version' is distinct from '1'::jsonb
    or octet_length(p_document::text) > 2097152
    or jsonb_typeof(p_document->'groups') is distinct from 'array'
    or jsonb_typeof(p_document->'covers') is distinct from 'object'
  then raise exception using errcode='22023', message='分類資料格式不正確'; end if;
  if jsonb_array_length(p_document->'groups') > 100 then
    raise exception using errcode='22023', message='分類數量不可超過 100 個';
  end if;
  for g in select value from jsonb_array_elements(p_document->'groups') loop
    collection_key := g->>'id'; species_name := g->>'species';
    if jsonb_typeof(g) is distinct from 'object'
      or jsonb_typeof(g->'id') is distinct from 'string'
      or collection_key !~ '^[a-z0-9-]{1,80}$' or collection_key = 'all' or collection_key = any(seen)
      or species_name is null or species_name not in ('豹紋守宮','肥尾守宮')
      or jsonb_typeof(g->'label') is distinct from 'string'
      or length(trim(g->>'label')) not between 1 and 60
      or g->>'matchMode' is null or g->>'matchMode' not in ('manual','genes')
      or jsonb_typeof(g->'animalIds') is distinct from 'array'
      or jsonb_typeof(g->'excludedAnimalIds') is distinct from 'array'
      or jsonb_typeof(g->'geneKeys') is distinct from 'array'
      or jsonb_typeof(g->'coverAnimalId') is distinct from 'string'
      or length(g->>'coverAnimalId') > 128
    then raise exception using errcode='22023',message='分類名稱、個體或規則資料不正確'; end if;
    if jsonb_array_length(g->'animalIds') > 3000 or jsonb_array_length(g->'excludedAnimalIds') > 3000
      or jsonb_array_length(g->'geneKeys') > 100
    then raise exception using errcode='22023',message='分類個體或規則數量過多'; end if;
    for entry in select value from jsonb_array_elements((g->'animalIds') || (g->'excludedAnimalIds')) loop
      if jsonb_typeof(entry) <> 'string' or length(entry#>>'{}') not between 1 and 128 then
        raise exception using errcode='22023',message='個體編號格式不正確';
      end if;
    end loop;
    for entry in select value from jsonb_array_elements(g->'geneKeys') loop
      if jsonb_typeof(entry) <> 'string' or length(trim(entry#>>'{}')) not between 1 and 80 then
        raise exception using errcode='22023',message='基因標籤格式不正確';
      end if;
    end loop;
    cover_id := g->>'coverAnimalId';
    if cover_id <> '' and not exists (
      select 1 from public.site_public_animals a where a.id = cover_id
        and a.species = species_name and length(trim(coalesce(a.image_url,''))) > 0
    ) then raise exception using errcode='22023',message='分類封面個體無可用照片，請重新選圖'; end if;
    seen := array_append(seen,collection_key);
    groups := groups || jsonb_build_array(jsonb_build_object(
      'id',collection_key,'species',species_name,'label',trim(g->>'label'),
      'matchMode',g->>'matchMode','animalIds',g->'animalIds','excludedAnimalIds',g->'excludedAnimalIds',
      'geneKeys',g->'geneKeys','coverAnimalId',cover_id));
  end loop;
  foreach species_name in array array['豹紋守宮','肥尾守宮'] loop
    if jsonb_typeof(p_document->'covers'->species_name) is distinct from 'string' then
      raise exception using errcode='22023',message='物種封面資料不正確';
    end if;
    cover_id := p_document->'covers'->>species_name;
    if length(cover_id) > 128 or (cover_id <> '' and not exists (
      select 1 from public.site_public_animals a where a.id = cover_id
        and a.species = species_name and length(trim(coalesce(a.image_url,''))) > 0
    )) then raise exception using errcode='22023',message='物種封面個體無可用照片，請重新選圖'; end if;
    covers := covers || jsonb_build_object(species_name,cover_id);
  end loop;
  return jsonb_build_object('format','gencko-shop-collections','version',1,'groups',groups,'covers',covers);
end;
$$;
revoke all on function private.validate_shop_collection_document(jsonb) from public, anon, authenticated;

create function private.save_shop_collections(p_document jsonb,p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare current_row public.shop_collection_settings%rowtype; cleaned jsonb; saved timestamptz;
begin
  if not private.shop_collection_access() then
    raise exception using errcode='42501',message='僅限 Google 管理員更新網站分類';
  end if;
  cleaned := private.validate_shop_collection_document(p_document);
  select * into current_row from public.shop_collection_settings where id='default' for update;
  if not found or p_expected_revision is distinct from current_row.revision then
    raise exception using errcode='40001',message='網站分類已有新版本，請重新載入後再修改';
  end if;
  saved := clock_timestamp();
  insert into private.shop_collection_history(revision,document,actor_id)
    values(current_row.revision,current_row.document,auth.uid());
  update public.shop_collection_settings set document=cleaned,revision=current_row.revision+1,updated_at=saved
    where id='default';
  return jsonb_build_object('revision',current_row.revision+1,'updated_at',saved);
end;
$$;
revoke all on function private.save_shop_collections(jsonb,integer) from public, anon, authenticated;
grant execute on function private.save_shop_collections(jsonb,integer) to authenticated;
create function public.save_shop_collections(p_document jsonb,p_expected_revision integer)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.save_shop_collections(p_document,p_expected_revision);
$$;
revoke all on function public.save_shop_collections(jsonb,integer) from public, anon, authenticated;
grant execute on function public.save_shop_collections(jsonb,integer) to authenticated;
