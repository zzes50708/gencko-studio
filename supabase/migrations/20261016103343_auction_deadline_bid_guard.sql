-- 不等待每分鐘排程建立限制紀錄，付款到期後即於出價檢查拒絕。
create index if not exists auction_outcomes_winner_due_idx on private.auction_outcomes(winner_user_id,payment_due_at) where state='awaiting_payment';
create index if not exists auction_outcomes_line_due_idx on private.auction_outcomes(line_user_id,payment_due_at) where state='awaiting_payment';
create or replace function private.auction_is_restricted(p_user uuid,p_line text default null) returns boolean
language sql security definer set search_path='' as $$
 with own_lines as (
  select c.line_user_id from private.auction_line_contacts c where c.user_id=p_user
  union select i.provider_id from auth.identities i where i.user_id=p_user and i.provider in ('custom:line-oauth','custom:line')
 )
 select exists(select 1 from private.auction_bid_restrictions r where r.active
  and (r.user_id=p_user or r.line_user_id=p_line or r.line_user_id in (select line_user_id from own_lines)))
 or exists(select 1 from private.auction_outcomes o where o.state='awaiting_payment'
  and o.notification_status in ('manual','sent') and o.payment_due_at<=clock_timestamp()
  and (o.winner_user_id=p_user or o.line_user_id=p_line or o.line_user_id in(select line_user_id from own_lines)))
$$;
