-- 聯絡資料只供明確授權的管理員讀取，不加入公開競標資料。
create function private.get_auction_bidder_contacts(p_auction_id text default null)
returns table (
 id uuid, auction_id text, user_name text, amount integer, bid_time timestamptz,
 phone text, user_id uuid, contact_provider text, line_user_id text, line_name text, line_picture text
)
language plpgsql security definer set search_path = ''
as $$
begin
 if not exists (
   select 1 from auth.users u where u.id = auth.uid()
     and u.raw_app_meta_data -> 'auction_admin' = 'true'::jsonb
 ) then
   raise exception using errcode='42501', message='僅限競標管理員查詢';
 end if;
 return query
 select b.id,b.auction_id,b.user_name,b.amount,b.bid_time,b.phone,b.user_id,
   case when i.provider is not null then 'line' else 'google' end,
   i.provider_id,i.identity_data->>'name',i.identity_data->>'picture'
 from public.auction_bids b
 left join lateral (
   select ai.provider,ai.provider_id,ai.identity_data
   from auth.identities ai
   where ai.user_id=b.user_id and ai.provider in ('custom:line-oauth','custom:line')
   order by ai.created_at desc limit 1
 ) i on true
 where p_auction_id is null or b.auction_id=p_auction_id
 order by b.amount desc,b.bid_time asc;
end;
$$;
revoke all on function private.get_auction_bidder_contacts(text) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.get_auction_bidder_contacts(text) to authenticated;
create function public.get_auction_bidder_contacts(p_auction_id text default null)
returns table (
 id uuid, auction_id text, user_name text, amount integer, bid_time timestamptz,
 phone text, user_id uuid, contact_provider text, line_user_id text, line_name text, line_picture text
)
language sql security invoker set search_path = ''
as $$ select * from private.get_auction_bidder_contacts($1); $$;
revoke all on function public.get_auction_bidder_contacts(text) from public,anon;
grant execute on function public.get_auction_bidder_contacts(text) to authenticated;
