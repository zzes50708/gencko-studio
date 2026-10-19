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
  update private.auction_outcomes set state='awaiting_payment',payment_due_at=clock_timestamp()+interval '24 hours',updated_at=clock_timestamp() where auction_id=p_auction_id;
 elsif p_action='abandon' then perform private.restrict_auction_winner(p_auction_id,p_reason);
 elsif p_action='unblock' then
  update private.auction_bid_restrictions set active=false,released_at=clock_timestamp(),released_by=auth.uid(),release_reason=p_reason
  where active and (user_id=o.winner_user_id or line_user_id=o.line_user_id);
 else raise exception using errcode='22023',message='此狀態不能執行所選操作'; end if;
 insert into private.auction_workflow_events(auction_id,actor_id,event,note) values(p_auction_id,auth.uid(),p_action,p_reason);
end $$;
