create or replace function private.my_auction_outcomes() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('auction_id',o.auction_id,'morph',a.morph,'amount',o.amount,'state',o.state,
 'notification_status',o.notification_status,'payment_due_at',o.payment_due_at,'payment_reported_at',o.payment_reported_at,'claimed_at',o.claimed_at)
 order by o.settled_at desc,o.auction_id),'[]'::jsonb) from private.auction_outcomes o join public.auctions a on a.id=o.auction_id
 where o.winner_user_id=auth.uid()
$$;


