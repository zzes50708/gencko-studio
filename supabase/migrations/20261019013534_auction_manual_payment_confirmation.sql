create or replace function private.report_auction_payment(p_auction_id text) returns void language plpgsql security definer set search_path='' as $$
declare o private.auction_outcomes%rowtype;
begin
 select * into o from private.auction_outcomes where auction_id=p_auction_id for update;
 if not found or o.winner_user_id is distinct from auth.uid() or auth.uid() is null
 then raise exception using errcode='42501',message='只能回報自己的得標付款'; end if;
 if o.notification_status='manual' then raise exception using errcode='22023',message='本場由工作室確認收款，請聯絡官方 LINE'; end if;
 if o.state='payment_review' then return; end if;
 if o.state<>'awaiting_payment' then raise exception using errcode='22023',message='此場次目前不能回報付款'; end if;
 update private.auction_outcomes set state='payment_review',payment_reported_at=clock_timestamp(),updated_at=clock_timestamp() where auction_id=p_auction_id;
 insert into private.auction_workflow_events(auction_id,actor_id,event) values(p_auction_id,auth.uid(),'payment_reported');
end $$;
