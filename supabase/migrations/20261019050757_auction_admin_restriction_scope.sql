-- 分別回傳本場棄標限制與會員整體出價狀態，避免重複解封。
create or replace function private.admin_auction_workflow(p_auction_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.auction_require_admin();
 select to_jsonb(o)||jsonb_build_object('restricted',private.auction_is_restricted(o.winner_user_id,o.line_user_id),
 'auction_restricted',exists(select 1 from private.auction_bid_restrictions r where r.auction_id=o.auction_id and r.user_id=o.winner_user_id and r.active),'notification_error',(select q.last_error from private.auction_notification_outbox q where q.auction_id=o.auction_id))
 into result from private.auction_outcomes o where o.auction_id=p_auction_id;
 return jsonb_build_object('outcome',result,'enabled',exists(select 1 from private.auction_enrollments where auction_id=p_auction_id),
 'events',(select coalesce(jsonb_agg(to_jsonb(e) order by e.created_at desc),'[]'::jsonb) from
 (select event,note,created_at from private.auction_workflow_events where auction_id=p_auction_id order by created_at desc limit 30) e));
end $$;
