-- 限制以真正登入的 LINE 身分比對，不依賴本機聯絡列是否存在或仍追蹤。
create function private.auction_member_bid_restricted(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select private.auction_is_restricted(p_user,null) or exists (
 select 1 from auth.identities i where i.user_id=p_user and i.provider in ('custom:line','custom:line-oauth')
 and private.auction_is_restricted(p_user,i.provider_id))
$$;
revoke all on function private.auction_member_bid_restricted(uuid) from public,anon,authenticated;
do $$
declare definition text;
begin
 select pg_get_functiondef('private.place_auction_bid(text,integer,text)'::regprocedure) into definition;
 if position('private.auction_is_restricted(uid,contact.line_user_id)' in definition)=0 then raise exception 'Bid restriction definition changed'; end if;
 execute replace(definition,'private.auction_is_restricted(uid,contact.line_user_id)','private.auction_member_bid_restricted(uid)');
 select pg_get_functiondef('private.get_auction_contact_status(text)'::regprocedure) into definition;
 if position('private.auction_is_restricted(auth.uid(),c.line_user_id)' in definition)=0 then raise exception 'Contact restriction definition changed'; end if;
 execute replace(definition,'private.auction_is_restricted(auth.uid(),c.line_user_id)','private.auction_member_bid_restricted(auth.uid())');
end $$;
