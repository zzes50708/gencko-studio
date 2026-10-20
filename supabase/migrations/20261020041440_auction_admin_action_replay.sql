-- 解除限制僅處理本場棄標，保留其他場次與其他原因的限制。
create or replace function private.admin_auction_action(p_auction_id text,p_action text,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype;
begin
 perform private.auction_require_admin();
 if p_reason is null or length(trim(p_reason))<2 or length(p_reason)>500 then raise exception using errcode='22023',message='請填寫操作原因（2 至 500 字）'; end if;
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found then raise exception using errcode='22023',message='此場次尚未結算'; end if;
 if p_action='paid' and o.state in ('awaiting_payment','payment_review','abandoned') then
  update private.auction_outcomes set state='paid',updated_at=clock_timestamp() where auction_id=p_auction_id;
  -- 補付款只解除已核帳這一場的限制；其他棄標案件仍須個別處理。
  update private.auction_bid_restrictions set active=false,released_at=clock_timestamp(),released_by=auth.uid(),release_reason=p_reason
   where auction_id=p_auction_id and user_id=o.winner_user_id and active;
 elsif p_action='extend' and o.state in ('awaiting_payment','payment_review') then
  update private.auction_outcomes set state='awaiting_payment',payment_due_at=greatest(coalesce(o.payment_due_at,clock_timestamp()),clock_timestamp())+interval '24 hours',updated_at=clock_timestamp() where auction_id=p_auction_id;
 elsif p_action='abandon' then perform private.restrict_auction_winner(p_auction_id,p_reason);
 elsif p_action='unblock' and o.state='abandoned' then
  update private.auction_bid_restrictions set active=false,released_at=clock_timestamp(),released_by=auth.uid(),release_reason=p_reason
  where active and auction_id=p_auction_id and user_id=o.winner_user_id;
 else raise exception using errcode='22023',message='此狀態不能執行所選操作'; end if;
 insert into private.auction_workflow_events(auction_id,actor_id,event,note) values(p_auction_id,auth.uid(),p_action,p_reason);
end $$;

-- 管理操作與請求回執同一交易提交；回應遺失後重試不重複延期或核帳。
create table private.auction_admin_requests (
 request_id uuid primary key,
 actor_id uuid not null references auth.users(id),
 auction_id text not null references public.auctions(id),
 params jsonb not null,
 response jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
alter table private.auction_admin_requests enable row level security;
revoke all on private.auction_admin_requests from public,anon,authenticated;

create function private.admin_auction_action_once(p_request_id uuid,p_auction_id text,p_action text,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare previous private.auction_admin_requests%rowtype; params jsonb; receipt jsonb;
begin
 perform private.auction_require_admin();
 if p_request_id is null then raise exception using errcode='22023',message='缺少管理操作請求編號'; end if;
 params:=jsonb_build_array(p_auction_id,p_action,trim(p_reason));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('auction-admin:'||p_request_id::text,0));
 select * into previous from private.auction_admin_requests where request_id=p_request_id;
 if found then
  if previous.actor_id is distinct from auth.uid() or previous.params is distinct from params
  then raise exception using errcode='22023',message='管理操作請求內容不一致，請先核對原操作'; end if;
  return previous.response||jsonb_build_object('replayed',true);
 end if;
 perform private.admin_auction_action(p_auction_id,p_action,p_reason);
 receipt:=jsonb_build_object('request_id',p_request_id,'auction_id',p_auction_id,'action',p_action,'replayed',false);
 insert into private.auction_admin_requests(request_id,actor_id,auction_id,params,response)
 values(p_request_id,auth.uid(),p_auction_id,params,receipt);
 return receipt;
end $$;
create function public.admin_auction_action_once(p_request_id uuid,p_auction_id text,p_action text,p_reason text)
returns jsonb language sql security invoker set search_path='' as $$select private.admin_auction_action_once($1,$2,$3,$4)$$;
revoke all on function private.admin_auction_action_once(uuid,text,text,text),public.admin_auction_action_once(uuid,text,text,text) from public,anon;
grant execute on function private.admin_auction_action_once(uuid,text,text,text),public.admin_auction_action_once(uuid,text,text,text) to authenticated;

