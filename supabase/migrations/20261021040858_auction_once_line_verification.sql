-- 官方 LINE 一次性出價驗證，與通知模式及各場付款限制分開。
create table private.auction_line_bid_verifications (
 line_user_id text primary key check (line_user_id ~ '^U[0-9a-f]{32}$'),
 verified_at timestamptz not null default clock_timestamp()
);
alter table private.auction_line_bid_verifications enable row level security;
revoke all on private.auction_line_bid_verifications from public,anon,authenticated;

-- 只承認曾完成驗證碼流程的同一 LINE，不把登入或普通訊息當作驗證。
insert into private.auction_line_bid_verifications(line_user_id,verified_at)
select c.line_user_id,min(e.created_at)
from private.auction_line_contacts c
join auth.identities i on i.user_id=c.user_id and i.provider_id=c.line_user_id and i.provider in ('custom:line','custom:line-oauth')
join private.auction_workflow_events e on e.actor_id=c.user_id and e.event='line_contact_verified'
where c.conversation_verified is true
group by c.line_user_id on conflict do nothing;

create function private.auction_line_bid_verified(p_user uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.identities i join private.auction_line_bid_verifications v on v.line_user_id=i.provider_id
 where i.user_id=p_user and i.provider in ('custom:line','custom:line-oauth'))
$$;
revoke all on function private.auction_line_bid_verified(uuid) from public,anon,authenticated;

-- 保留最新的 Webhook 防重、時間與領標檢查；只在同身分驗證碼被接受後記錄永久資格。
do $$
declare definition text; old_text text := 'return jsonb_build_object(''linked'',true);';
begin
 select pg_get_functiondef('private.record_auction_line_event(text,text,text,timestamp with time zone,text,text)'::regprocedure) into definition;
 if position(old_text in definition)=0 then raise exception 'Webhook definition changed; review required'; end if;
 definition:=replace(definition,old_text,
 'if expected_line=p_line_id then insert into private.auction_line_bid_verifications(line_user_id) values(p_line_id) on conflict do nothing; end if; '||old_text);
 execute definition;
end $$;

create or replace function private.get_auction_contact_status(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.auction_line_contacts%rowtype;
begin
 if auth.uid() is null then raise exception using errcode='42501',message='請先登入'; end if;
 perform private.sync_verified_line_contact(auth.uid());
 select * into c from private.auction_line_contacts where user_id=auth.uid();
 return jsonb_build_object('required',true,'ready',private.auction_line_bid_verified(auth.uid()),
 'linked',c.user_id is not null,'display_name',c.display_name,'restricted',private.auction_is_restricted(auth.uid(),c.line_user_id));
end $$;

-- 所有場次皆強制驗證，不受 manual_claim、workflow_enabled 或通知模式影響。
do $$
declare definition text; old_text text;
begin
 select replace(pg_get_functiondef('private.place_auction_bid(text,integer,text)'::regprocedure),chr(13),'') into definition;
 old_text := 'if (select fulfillment_mode from private.auction_workflow_settings where id)<>''manual_claim'' and exists(select 1 from private.auction_enrollments where auction_id=a.id)';
 if position(old_text in definition)=0 then raise exception 'Bid definition changed; review required'; end if;
 definition:=replace(definition,old_text||E'\n  and (contact.followed is distinct from true or contact.conversation_verified is distinct from true)',
 'if not private.auction_line_bid_verified(uid)');
 if position(old_text in definition)>0 then raise exception 'Bid guard replacement failed'; end if;
 execute definition;
end $$;
