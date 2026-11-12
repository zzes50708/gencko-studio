-- Pet Only Geckos 僅此一分類共用豹紋與肥尾，其他分類維持原物種限制。
create or replace function private.shop_collection_sale_ids(p_ids jsonb,p_species text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(entry.value order by entry.ordinality),'[]'::jsonb)
  from jsonb_array_elements(p_ids) with ordinality as entry(value,ordinality)
  where exists(select 1 from public.site_public_animals a
    where a.id = entry.value #>> '{}' and (a.species = p_species or p_species is null and a.species in ('豹紋守宮','肥尾守宮')) and a.status = 'ForSale');
$$;
revoke all on function private.shop_collection_sale_ids(jsonb,text) from public, anon, authenticated;

create or replace function private.validate_shop_collection_document(p_document jsonb)
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
        and (a.species = species_name or collection_key='pet-only' and a.species in ('豹紋守宮','肥尾守宮')) and length(trim(coalesce(a.image_url,''))) > 0
    ) then raise exception using errcode='22023',message='分類封面個體無可用照片，請重新選圖'; end if;
    seen := array_append(seen,collection_key);
    groups := groups || jsonb_build_array(jsonb_build_object(
      'id',collection_key,'species',species_name,'label',trim(g->>'label'),
      'matchMode',g->>'matchMode','animalIds',private.shop_collection_sale_ids(g->'animalIds',case when collection_key='pet-only' then null else species_name end),'excludedAnimalIds',private.shop_collection_sale_ids(g->'excludedAnimalIds',case when collection_key='pet-only' then null else species_name end),
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
